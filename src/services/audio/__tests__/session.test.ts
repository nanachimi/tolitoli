import { m4aSegmentsProfile } from '../formatProfile';
import { readManifest } from '../recordingStore';
import { InvalidSessionTransition, RecordingSession } from '../session';
import { FakeAudio, FakeEngine, MemoryFs } from './fakes';

const ROOT = 'doc/recordings';
/** Transient focus loss: ringtone or call. */
const CALL = { kind: 'interruption-began', transient: true } as const;
const CALL_ENDED = { kind: 'interruption-ended', shouldResume: true } as const;
/** Another app keeps the microphone for good: no "ended" will come. */
const TAKEN = { kind: 'interruption-began', transient: false } as const;

function setup() {
  const fs = new MemoryFs();
  const engine = new FakeEngine(fs);
  const audio = new FakeAudio(fs);
  let tick = 0;
  const session = new RecordingSession({
    fs,
    root: ROOT,
    engine,
    audio,
    profile: m4aSegmentsProfile(2),
    now: () => new Date(Date.UTC(2026, 9, 21, 12, 0, tick++)),
    newId: () => 'rec-1',
  });
  return { fs, engine, audio, session };
}

describe('RecordingSession', () => {
  it('records, stops and assembles one final file', async () => {
    const { fs, session } = setup();
    await session.start();
    expect(session.snapshot().status).toBe('recording');
    const manifest = await session.stop();
    expect(manifest.status).toBe('local');
    expect(manifest.recovered).toBe(false);
    expect(manifest.finalFile).toBe('rec-1.m4a');
    expect(manifest.durationMs).toBe(2000);
    expect(fs.files.get(`${ROOT}/rec-1.m4a`)).toBe('ab');
    expect(fs.deleted).toEqual([]);
  });

  it('writes the manifest before the first segment opens', async () => {
    const { fs, session } = setup();
    await session.start();
    expect(readManifest(fs, ROOT, 'rec-1')?.status).toBe('recording');
  });

  it('closes the segment and updates the manifest before changing status on interruption', async () => {
    const { fs, engine, session } = setup();
    await session.start();
    const seen: string[] = [];
    session.subscribe((s) =>
      seen.push(`${s.status}:${readManifest(fs, ROOT, 'rec-1')?.segments.length ?? 0}`),
    );
    await session.handleSystemEvent(CALL);
    expect(engine.calls).toEqual(['open s000-', 'close']);
    expect(seen).toEqual(['interrupted:1']);
  });

  it('offers to resume when the interruption ends but never resumes alone', async () => {
    const { engine, session } = setup();
    await session.start();
    await session.handleSystemEvent(CALL);
    expect(session.snapshot()).toMatchObject({ resumeOffered: false, micBusy: true });
    await session.handleSystemEvent(CALL_ENDED);
    expect(session.snapshot()).toMatchObject({
      status: 'interrupted',
      resumeOffered: true,
      micBusy: false,
    });
    expect(engine.calls).toEqual(['open s000-', 'close']);
  });

  it('resumes into a new segment with a fresh recorder', async () => {
    const { engine, session } = setup();
    await session.start();
    await session.handleSystemEvent(CALL);
    await session.handleSystemEvent(CALL_ENDED);
    await session.resume();
    expect(session.snapshot()).toMatchObject({ status: 'recording', resumeOffered: false });
    const manifest = await session.stop();
    expect(engine.calls).toEqual(['open s000-', 'close', 'open s001-', 'close']);
    expect(manifest.segments).toEqual(['s000-0.m4a', 's001-0.m4a']);
    expect(manifest.durationMs).toBe(4000);
  });

  it('falls back to another fresh recorder when resuming fails once (iOS #1220)', async () => {
    const { engine, session } = setup();
    await session.start();
    await session.handleSystemEvent(CALL);
    await session.handleSystemEvent(CALL_ENDED);
    engine.failNextOpens = 1;
    await session.resume();
    expect(session.snapshot().status).toBe('recording');
    const manifest = await session.stop();
    expect(manifest.segments).toEqual(['s000-0.m4a', 's002-0.m4a']);
  });

  it('keeps the earlier segment when the fresh recorder cannot start at all', async () => {
    const { fs, engine, session } = setup();
    await session.start();
    await session.handleSystemEvent(CALL);
    await session.handleSystemEvent(CALL_ENDED);
    engine.failNextOpens = 2;
    await expect(session.resume()).rejects.toThrow('recorder would not start');
    expect(session.snapshot().status).toBe('interrupted');
    expect(readManifest(fs, ROOT, 'rec-1')?.segments).toEqual(['s000-0.m4a']);
  });

  it('user pause keeps the native recorder; an interruption while paused closes it', async () => {
    const { engine, session } = setup();
    await session.start();
    session.pause();
    await session.handleSystemEvent(CALL);
    await session.handleSystemEvent(CALL_ENDED);
    expect(session.snapshot().status).toBe('paused');
    await session.resume();
    await session.stop();
    expect(engine.calls).toEqual(['open s000-', 'pause', 'close', 'open s001-', 'close']);
  });

  it('pause then resume without interruption reuses the recorder', async () => {
    const { engine, session } = setup();
    await session.start();
    session.pause();
    await session.resume();
    expect(engine.calls).toEqual(['open s000-', 'pause', 'resume']);
  });

  it('records every rotated file of a closed recorder', async () => {
    const { engine, session } = setup();
    engine.segmentsPerClose = 3;
    await session.start();
    const manifest = await session.stop();
    expect(manifest.segments).toEqual(['s000-0.m4a', 's000-1.m4a', 's000-2.m4a']);
    expect(manifest.durationMs).toBe(6000);
  });

  it('can be stopped while interrupted', async () => {
    const { session } = setup();
    await session.start();
    await session.handleSystemEvent(CALL);
    expect((await session.stop()).status).toBe('local');
  });

  it('rejects invalid commands', async () => {
    const { session } = setup();
    await expect(session.stop()).rejects.toBeInstanceOf(InvalidSessionTransition);
    expect(() => session.pause()).toThrow(InvalidSessionTransition);
  });

  it('ignores route loss and interruptions when idle', async () => {
    const { engine, session } = setup();
    await session.handleSystemEvent(CALL);
    await session.start();
    await session.handleSystemEvent({ kind: 'route-lost' });
    expect(session.snapshot()).toMatchObject({ status: 'recording', micBusy: false });
    expect(engine.calls).toEqual(['open s000-']);
  });

  it('refuses to resume while a call holds the microphone, even from the notification', async () => {
    const { engine, session } = setup();
    await session.start();
    await session.handleSystemEvent(CALL);
    expect(await session.resume()).toBe(false);
    expect(session.snapshot().status).toBe('interrupted');
    expect(engine.calls).toEqual(['open s000-', 'close']);
  });

  it('refuses to resume a user pause while a call holds the microphone', async () => {
    const { engine, session } = setup();
    await session.start();
    session.pause();
    await session.handleSystemEvent(CALL);
    expect(await session.resume()).toBe(false);
    expect(session.snapshot()).toMatchObject({ status: 'paused', micBusy: true });
    expect(engine.calls).toEqual(['open s000-', 'pause', 'close']);
  });

  it('offers to resume at once when another app keeps the microphone', async () => {
    const { session } = setup();
    await session.start();
    await session.handleSystemEvent(TAKEN);
    expect(session.snapshot()).toMatchObject({
      status: 'interrupted',
      resumeOffered: true,
      micBusy: false,
    });
    expect(await session.resume()).toBe(true);
    expect(session.snapshot().status).toBe('recording');
  });

  it('blocks resuming again when a second call rings before the user resumes', async () => {
    const { session } = setup();
    await session.start();
    await session.handleSystemEvent(CALL);
    await session.handleSystemEvent(CALL_ENDED);
    await session.handleSystemEvent(CALL);
    expect(session.snapshot()).toMatchObject({ resumeOffered: false, micBusy: true });
    expect(await session.resume()).toBe(false);
  });

  it('closes a recorder that was starting when a call rang (resume)', async () => {
    const { fs, engine, session } = setup();
    await session.start();
    await session.handleSystemEvent(CALL);
    await session.handleSystemEvent(CALL_ENDED);
    engine.duringOpen = () => session.handleSystemEvent(CALL);
    await session.resume();
    expect(session.snapshot()).toMatchObject({ status: 'interrupted', micBusy: true });
    expect(engine.calls).toEqual(['open s000-', 'close', 'open s001-', 'close']);
    expect(readManifest(fs, ROOT, 'rec-1')?.segments).toEqual(['s000-0.m4a', 's001-0.m4a']);
  });

  it('closes a recorder that was starting when a call rang (start)', async () => {
    const { engine, session } = setup();
    engine.duringOpen = () => session.handleSystemEvent(CALL);
    await session.start();
    expect(session.snapshot()).toMatchObject({ status: 'interrupted', micBusy: true });
    expect(engine.calls).toEqual(['open s000-', 'close']);
  });
});
