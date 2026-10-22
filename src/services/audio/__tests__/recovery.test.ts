import { m4aSegmentsProfile, wavContinuousProfile } from '../formatProfile';
import { appendSegments, createRecording, readManifest, listRecordings } from '../recordingStore';
import { recoverInterruptedRecordings } from '../recovery';
import { FakeAudio, MemoryFs } from './fakes';

const ROOT = 'doc/recordings';
const PROFILES = {
  'm4a-segments': m4aSegmentsProfile(2),
  'wav-continuous': wavContinuousProfile(),
};
const now = () => new Date(Date.UTC(2026, 9, 21, 13));
const NO_WAIT = { wait: async () => {} };

function interrupted(fs: MemoryFs, id: string, known: string[], onDisk: Record<string, string>) {
  const manifest = createRecording(
    fs,
    ROOT,
    id,
    'm4a-segments',
    new Date(Date.UTC(2026, 9, 21, 12)),
  );
  appendSegments(fs, ROOT, manifest, known, now());
  for (const [name, content] of Object.entries(onDisk))
    fs.writeText(`${ROOT}/${id}/${name}`, content);
}

describe('recovery of recordings left by a killed app', () => {
  it('assembles known and unlisted readable segments and marks the recording recovered', async () => {
    const fs = new MemoryFs();
    // s000-1 closed after the last manifest write; s000-2 was open when the app died.
    interrupted(fs, 'rec-1', ['s000-0.m4a'], {
      's000-0.m4a': 'ab',
      's000-1.m4a': 'cd',
      's000-2.m4a': 'CORRUPT',
    });
    const [recovered] = await recoverInterruptedRecordings(
      fs,
      ROOT,
      PROFILES,
      new FakeAudio(fs),
      now,
      NO_WAIT,
    );
    expect(recovered).toMatchObject({
      status: 'local',
      recovered: true,
      finalFile: 'rec-1.m4a',
      durationMs: 4000,
      unreadable: ['s000-2.m4a'],
    });
    expect(fs.files.get(`${ROOT}/rec-1.m4a`)).toBe('abcd');
  });

  it('never deletes anything, including unreadable segments', async () => {
    const fs = new MemoryFs();
    interrupted(fs, 'rec-1', [], { 's000-0.m4a': 'CORRUPT' });
    const [recovered] = await recoverInterruptedRecordings(
      fs,
      ROOT,
      PROFILES,
      new FakeAudio(fs),
      now,
      NO_WAIT,
    );
    expect(recovered).toMatchObject({
      status: 'local',
      finalFile: null,
      unreadable: ['s000-0.m4a'],
    });
    expect(fs.files.get(`${ROOT}/rec-1/s000-0.m4a`)).toBe('CORRUPT');
    expect(fs.deleted).toEqual([]);
  });

  it('is idempotent across launches', async () => {
    const fs = new MemoryFs();
    interrupted(fs, 'rec-1', ['s000-0.m4a'], { 's000-0.m4a': 'ab' });
    await recoverInterruptedRecordings(fs, ROOT, PROFILES, new FakeAudio(fs), now, NO_WAIT);
    const writes = fs.writes.length;
    expect(
      await recoverInterruptedRecordings(fs, ROOT, PROFILES, new FakeAudio(fs), now, NO_WAIT),
    ).toEqual([]);
    expect(fs.writes.length).toBe(writes);
  });

  it('skips the recording currently in progress', async () => {
    const fs = new MemoryFs();
    interrupted(fs, 'rec-1', [], { 's000-0.m4a': 'ab' });
    const result = await recoverInterruptedRecordings(fs, ROOT, PROFILES, new FakeAudio(fs), now, {
      ...NO_WAIT,
      isActive: (id) => id === 'rec-1',
    });
    expect(result).toEqual([]);
    expect(readManifest(fs, ROOT, 'rec-1')?.status).toBe('recording');
  });

  it('leaves alone a recording whose files still grow (recorder alive after a JS reload)', async () => {
    const fs = new MemoryFs();
    interrupted(fs, 'rec-1', [], { 's000-0.m4a': 'ab' });
    const wait = async () => {
      fs.writeText(`${ROOT}/rec-1/s000-0.m4a`, 'abc');
    };
    const result = await recoverInterruptedRecordings(fs, ROOT, PROFILES, new FakeAudio(fs), now, {
      wait,
    });
    expect(result).toEqual([]);
    expect(readManifest(fs, ROOT, 'rec-1')?.status).toBe('recording');
    expect(fs.deleted).toEqual([]);
  });

  it('repairs each segment before probing it (WAV header left stale by a kill)', async () => {
    const fs = new MemoryFs();
    interrupted(fs, 'rec-1', ['s000-0.m4a'], { 's000-0.m4a': 'ab' });
    const audio = new FakeAudio(fs);
    await recoverInterruptedRecordings(fs, ROOT, PROFILES, audio, now, NO_WAIT);
    expect(audio.repaired).toEqual([`${ROOT}/rec-1/s000-0.m4a`]);
  });

  it('leaves no partial manifest: writes go through a temporary file', async () => {
    const fs = new MemoryFs();
    interrupted(fs, 'rec-1', ['s000-0.m4a'], { 's000-0.m4a': 'ab' });
    await recoverInterruptedRecordings(fs, ROOT, PROFILES, new FakeAudio(fs), now, NO_WAIT);
    const manifestWrites = fs.writes.filter((path) => path.endsWith('manifest.json'));
    expect(manifestWrites).toEqual([]);
    expect([...fs.files.keys()].some((path) => path.endsWith('.tmp'))).toBe(false);
  });

  it('lists recordings newest first and ignores unreadable manifests', () => {
    const fs = new MemoryFs();
    createRecording(fs, ROOT, 'old', 'm4a-segments', new Date(Date.UTC(2026, 0, 1)));
    createRecording(fs, ROOT, 'new', 'm4a-segments', new Date(Date.UTC(2026, 5, 1)));
    fs.writeText(`${ROOT}/broken/manifest.json`, '{not json');
    expect(listRecordings(fs, ROOT).map((m) => m.id)).toEqual(['new', 'old']);
  });
});
