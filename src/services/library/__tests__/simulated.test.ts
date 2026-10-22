import { createRecording, finalizeRecording, listRecordings } from '../../audio/recordingStore';
import { MemoryFs } from '../../audio/__tests__/fakes';
import { demoItems, demoSegments } from '../demo';
import { SimulatedLibraryRepository } from '../simulated';

const ROOT = 'doc/recordings';
const NOW = new Date(2026, 9, 22, 18, 0);

function setup(demo = true) {
  const fs = new MemoryFs();
  const manifest = createRecording(fs, ROOT, 'real-1', 'wav-continuous', new Date(2026, 9, 22, 12));
  finalizeRecording(
    fs,
    ROOT,
    manifest,
    { finalFile: 'real-1.m4a', durationMs: 65_000, unreadable: [], recovered: false },
    new Date(2026, 9, 22, 12, 2),
  );
  const writesBefore = fs.writes.length;
  let demoOn = demo;
  const repository = new SimulatedLibraryRepository({
    readManifests: () => listRecordings(fs, ROOT),
    demoEnabled: () => demoOn,
    now: () => NOW,
  });
  return {
    fs,
    repository,
    writesBefore,
    setDemo: (on: boolean) => {
      demoOn = on;
    },
  };
}

describe('SimulatedLibraryRepository', () => {
  it('lists real recordings as audio only, plus the demo set when enabled, newest first', () => {
    const { repository, setDemo } = setup();
    const items = repository.list();
    expect(items).toHaveLength(9);
    expect(items.map((i) => i.createdAt)).toEqual(
      [...items.map((i) => i.createdAt)].sort().reverse(),
    );
    expect(repository.get('real-1')).toMatchObject({
      state: 'audio',
      demo: false,
      durationMs: 65_000,
    });
    setDemo(false);
    expect(repository.list().map((i) => i.id)).toEqual(['real-1']);
  });

  it('covers every interface state in the demo set', () => {
    const states = new Set(demoItems(NOW).map((i) => i.state));
    expect(states).toEqual(new Set(['audio', 'transcribing', 'transcribed', 'failed']));
    const issues = new Set(
      demoItems(NOW)
        .map((i) => i.issue)
        .filter(Boolean),
    );
    expect(issues).toEqual(new Set(['failed', 'model-missing', 'quota-exhausted']));
    expect(demoItems(NOW).some((i) => i.recovered)).toBe(true);
    expect(demoItems(NOW).some((i) => i.language === 'wo' && i.quality === null)).toBe(true);
  });

  it('gives transcribed demo items their segments, others none', () => {
    const { repository } = setup();
    expect(repository.segments('demo-meeting').length).toBeGreaterThan(3);
    expect(repository.segments('real-1')).toEqual([]);
    const segments = demoSegments('demo-lecture');
    segments.slice(0, -1).forEach((segment, index) => {
      expect(segment.endMs).toBe(segments[index + 1]!.startMs);
    });
  });

  it('searches titles and transcripts without case or accents', () => {
    const { repository } = setup();
    expect(repository.search('reunion').map((i) => i.id)).toEqual(['demo-meeting']);
    expect(repository.search('DELIVERY').map((i) => i.id)).toEqual(['demo-meeting']);
    expect(repository.search('pluriels').map((i) => i.id)).toEqual(['demo-lecture']);
    expect(repository.search('introuvable')).toEqual([]);
    expect(repository.search('  ')).toHaveLength(9);
  });

  it('renames in memory; an empty title goes back to the default', () => {
    const { repository } = setup();
    repository.rename('real-1', '  Entretien  ');
    expect(repository.get('real-1')?.title).toBe('Entretien');
    expect(repository.search('entretien').map((i) => i.id)).toContain('real-1');
    repository.rename('real-1', ' ');
    expect(repository.get('real-1')?.title).toBeNull();
  });

  it('moves to the trash, restores and empties it, notifying subscribers', () => {
    const { repository } = setup();
    const listener = jest.fn();
    const unsubscribe = repository.subscribe(listener);
    repository.trash('real-1');
    expect(repository.list().map((i) => i.id)).not.toContain('real-1');
    expect(repository.listTrash()).toMatchObject([{ id: 'real-1', trashedAt: NOW.toISOString() }]);
    repository.restore('real-1');
    expect(repository.list().map((i) => i.id)).toContain('real-1');
    repository.trash('demo-failed');
    repository.emptyTrash();
    expect(repository.listTrash()).toEqual([]);
    expect(repository.get('demo-failed')).toBeUndefined();
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe();
  });

  it('shows a retried transcription as running, without its issue', () => {
    const { repository } = setup();
    expect(repository.get('demo-failed')).toMatchObject({ state: 'failed', issue: 'failed' });
    const listener = jest.fn();
    repository.subscribe(listener);
    repository.retryTranscription('demo-failed');
    const item = repository.get('demo-failed');
    expect(item?.state).toBe('transcribing');
    expect(item?.issue).toBeUndefined();
    expect(listener).toHaveBeenCalled();
  });

  it('never writes, moves or deletes a file, whatever the user does', () => {
    const { fs, repository, writesBefore } = setup();
    repository.rename('real-1', 'Nouveau titre');
    repository.retryTranscription('real-1');
    repository.trash('real-1');
    repository.emptyTrash();
    expect(fs.writes).toHaveLength(writesBefore);
    expect(fs.deleted).toEqual([]);
    expect(fs.exists(`${ROOT}/real-1/manifest.json`)).toBe(true);
  });
});
