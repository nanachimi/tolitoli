import { assembleRecording, releaseRecordedFiles } from '../assembly';
import { wavContinuousProfile } from '../formatProfile';
import {
  appendSegments,
  createRecording,
  finalizeRecording,
  readManifest,
} from '../recordingStore';
import { recoverInterruptedRecordings } from '../recovery';
import { RecordingSession } from '../session';
import { FakeAudio, FakeEngine, MemoryFs } from './fakes';

const ROOT = 'doc/recordings';
const WAV = wavContinuousProfile();
const now = () => new Date(Date.UTC(2026, 9, 22, 12));

function recordingWith(fs: MemoryFs, segments: Record<string, string>) {
  const manifest = createRecording(fs, ROOT, 'rec-1', WAV.id, now());
  for (const [name, content] of Object.entries(segments)) {
    fs.writeText(`${ROOT}/rec-1/${name}`, content);
  }
  return appendSegments(fs, ROOT, manifest, Object.keys(segments), now());
}

describe('final file of a WAV recording (D-021)', () => {
  it('encodes every readable WAV, in order, into one checked .m4a', async () => {
    const fs = new MemoryFs();
    const manifest = recordingWith(fs, { 's000-0.wav': 'ab', 's001-0.wav': 'cd' });
    const result = await assembleRecording(fs, ROOT, manifest, WAV, new FakeAudio(fs));
    expect(result).toEqual({
      finalFile: 'rec-1.m4a',
      durationMs: 4000,
      unreadable: [],
      encoded: ['s000-0.wav', 's001-0.wav'],
    });
    expect(fs.files.get(`${ROOT}/rec-1.m4a`)).toBe('abcd');
    expect(fs.deleted).toEqual([]);
  });

  it('keeps a WAV final file and deletes nothing when the encoder fails', async () => {
    const fs = new MemoryFs();
    const audio = new FakeAudio(fs);
    audio.failEncode = true;
    const manifest = recordingWith(fs, { 's000-0.wav': 'ab' });
    const result = await assembleRecording(fs, ROOT, manifest, WAV, audio);
    expect(result).toMatchObject({ finalFile: 'rec-1.wav', encoded: [] });
    expect(fs.files.get(`${ROOT}/rec-1.wav`)).toBe('ab');
  });

  it('rejects an encoded file whose duration is off by more than 500 ms', async () => {
    const fs = new MemoryFs();
    const audio = new FakeAudio(fs);
    audio.encodeDrift = 'x'; // one more character = 1 s more
    const manifest = recordingWith(fs, { 's000-0.wav': 'ab' });
    const result = await assembleRecording(fs, ROOT, manifest, WAV, audio);
    expect(result).toMatchObject({ finalFile: 'rec-1.wav', encoded: [] });
    expect(fs.exists(`${ROOT}/rec-1.m4a`)).toBe(false);
  });

  it('releases encoded segments only once the manifest points to the final file', async () => {
    const fs = new MemoryFs();
    const manifest = recordingWith(fs, { 's000-0.wav': 'ab', 's001-0.wav': 'CORRUPT' });
    const { encoded, ...result } = await assembleRecording(
      fs,
      ROOT,
      manifest,
      WAV,
      new FakeAudio(fs),
    );
    releaseRecordedFiles(fs, ROOT, manifest, encoded);
    expect(fs.deleted).toEqual([]);

    const finalised = finalizeRecording(fs, ROOT, manifest, { ...result, recovered: false }, now());
    releaseRecordedFiles(fs, ROOT, finalised, encoded);
    expect(fs.deleted).toEqual([`${ROOT}/rec-1/s000-0.wav`]);
    expect(fs.exists(`${ROOT}/rec-1/s001-0.wav`)).toBe(true);
    expect(fs.files.get(`${ROOT}/rec-1.m4a`)).toBe('ab');
  });

  it('stops a session into an .m4a and frees the WAV', async () => {
    const fs = new MemoryFs();
    const engine = new FakeEngine(fs);
    engine.extension = 'wav';
    const session = new RecordingSession({
      fs,
      root: ROOT,
      engine,
      audio: new FakeAudio(fs),
      profile: WAV,
      now,
      newId: () => 'rec-1',
    });
    await session.start();
    const manifest = await session.stop();
    expect(manifest).toMatchObject({ status: 'local', finalFile: 'rec-1.m4a' });
    expect(fs.deleted).toEqual([`${ROOT}/rec-1/s000-0.wav`]);
  });

  it('re-encodes a recording killed during encoding at the next launch', async () => {
    const fs = new MemoryFs();
    recordingWith(fs, { 's000-0.wav': 'ab' });
    // The kill left a half-written temporary file and the manifest in `recording`.
    fs.writeText(`${ROOT}/rec-1/assembling.m4a`, 'a');
    const [recovered] = await recoverInterruptedRecordings(
      fs,
      ROOT,
      { 'm4a-segments': WAV, 'wav-continuous': WAV },
      new FakeAudio(fs),
      now,
      { wait: async () => {} },
    );
    expect(recovered).toMatchObject({ finalFile: 'rec-1.m4a', recovered: true, durationMs: 2000 });
    expect(readManifest(fs, ROOT, 'rec-1')?.status).toBe('local');
    expect(fs.files.get(`${ROOT}/rec-1.m4a`)).toBe('ab');
    expect(fs.deleted).toEqual([`${ROOT}/rec-1/s000-0.wav`]);
  });
});
