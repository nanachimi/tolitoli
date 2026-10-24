import { testDatabase } from '../../../db/__tests__/testDatabase';
import { MemoryFs } from '../../audio/__tests__/fakes';
import {
  createRecording as createManifest,
  finalizeRecording as finalizeManifest,
  listRecordings,
} from '../../audio/recordingStore';
import { demoItems, demoSegments } from '../demo';
import { SqliteLibraryRepository, TRASH_RETENTION_DAYS } from '../sqlite';
import { InvalidRecordingTransition } from '../states';

const ROOT = 'doc/recordings';
const DAY = 86_400_000;
const T0 = new Date(2026, 9, 23, 10, 0).getTime();

function setup() {
  const { client, db } = testDatabase();
  const fs = new MemoryFs();
  let now = T0;
  const make = () => new SqliteLibraryRepository({ db, fs, root: ROOT, now: () => new Date(now) });
  return {
    client,
    db,
    fs,
    repository: make(),
    /** A fresh repository on the same database: what the next launch sees. */
    relaunch: make,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

/** A finalised step-1 recording on disk: directory, manifest and final file. */
function recordedOnDisk(fs: MemoryFs, id: string, minutes = 1) {
  const manifest = createManifest(fs, ROOT, id, 'wav-continuous', new Date(T0 - minutes * 60_000));
  fs.writeText(`${ROOT}/${id}/s000.wav`, 'pcm');
  fs.writeText(`${ROOT}/${id}.m4a`, 'aac');
  return finalizeManifest(
    fs,
    ROOT,
    manifest,
    { finalFile: `${id}.m4a`, durationMs: minutes * 60_000, unreadable: [], recovered: false },
    new Date(T0),
  );
}

function outboxOps(client: ReturnType<typeof setup>['client'], id: string) {
  return (
    client.prepare(`select op from outbox where entity_id = ? order by id`).all(id) as {
      op: string;
    }[]
  ).map((row) => row.op);
}

const FINAL = {
  audioPath: 'rec.m4a',
  audioSize: 480_000,
  audioFormat: 'm4a' as const,
  durationMs: 60_000,
  recovered: false,
};

describe('SqliteLibraryRepository: recording lifecycle', () => {
  it('creates a row when recording starts and finalises it at the stop, with audio_size', () => {
    const { repository, client } = setup();
    repository.createRecording({ id: 'rec', createdAt: new Date(T0).toISOString() });
    expect(client.prepare(`select state from recordings`).get()).toEqual({ state: 'recording' });
    repository.finalizeRecording('rec', FINAL);
    expect(client.prepare(`select state, audio_size, audio_format from recordings`).get()).toEqual({
      state: 'local',
      audio_size: 480_000,
      audio_format: 'm4a',
    });
    expect(outboxOps(client, 'rec')).toEqual(['create', 'update']);
  });

  it('refuses to finalise twice', () => {
    const { repository } = setup();
    repository.createRecording({ id: 'rec', createdAt: new Date(T0).toISOString() });
    repository.finalizeRecording('rec', FINAL);
    expect(() => repository.finalizeRecording('rec', FINAL)).toThrow(InvalidRecordingTransition);
  });

  it('writes the outbox in the same transaction as the data: one fails, both are undone', () => {
    const { repository, client } = setup();
    repository.createRecording({ id: 'rec', createdAt: new Date(T0).toISOString() });
    // An outbox that refuses writes makes the rename fail as a whole.
    client.exec(
      `create trigger outbox_refuses before insert on outbox begin select raise(abort, 'no'); end;`,
    );
    expect(() => repository.rename('rec', 'Réunion')).toThrow(/no/);
    expect(client.prepare(`select title from recordings`).get()).toEqual({ title: null });
  });

  it('imports finalised manifests it does not know, and only those', () => {
    const { repository, fs } = setup();
    recordedOnDisk(fs, 'old');
    createManifest(fs, ROOT, 'still-recording', 'wav-continuous', new Date(T0));
    const imported = repository.importManifests(listRecordings(fs, ROOT), () => 1234);
    expect(imported).toEqual(['old']);
    expect(repository.get('old')).toMatchObject({ state: 'audio', durationMs: 60_000 });
    // A second launch imports nothing new.
    expect(repository.importManifests(listRecordings(fs, ROOT), () => 1234)).toEqual([]);
  });

  it('finalises a row left recording when its manifest was finalised before the app died', () => {
    const { repository, fs } = setup();
    repository.createRecording({ id: 'cut', createdAt: new Date(T0).toISOString() });
    recordedOnDisk(fs, 'cut');
    repository.reconcileUnfinished(listRecordings(fs, ROOT), () => 99);
    expect(repository.get('cut')).toBeTruthy();
    expect(repository.importManifests(listRecordings(fs, ROOT), () => 99)).toEqual([]);
  });

  it('never writes a file of its own', () => {
    const { repository, fs } = setup();
    recordedOnDisk(fs, 'old');
    const writes = fs.writes.length;
    repository.importManifests(listRecordings(fs, ROOT), () => 1);
    repository.rename('old', 'Titre');
    repository.trash('old');
    repository.restore('old');
    expect(fs.writes).toHaveLength(writes);
    expect(fs.deleted).toEqual([]);
  });
});

describe('SqliteLibraryRepository: edits and search', () => {
  function withTranscript() {
    const context = setup();
    const { repository } = context;
    const add = (id: string, title: string | null, lines: string[], minutesAgo: number) => {
      repository.createRecording({
        id,
        createdAt: new Date(T0 - minutesAgo * 60_000).toISOString(),
      });
      repository.finalizeRecording(id, FINAL);
      if (title) repository.rename(id, title);
      repository.queueTranscription(id, { language: 'fr', engine: 'local', model: 'whisper' });
      repository.startTranscription(id);
      repository.saveTranscript(
        id,
        lines.map((text, index) => ({
          startMs: index * 1000,
          endMs: index * 1000 + 900,
          speaker: 1,
          text,
        })),
        { quality: 'good' },
      );
    };
    add('fr', 'Réunion fournisseur', ['L’éléphant traverse la rue.'], 1);
    add('wo', null, ['Ñaata la ? Ŋangu na ci kanam.'], 2);
    add('ln', 'Entretien à Kinshasa', ['Mbɔ́tɛ na bino, tokobanda.'], 3);
    add('zh', null, ['今天我们开会讨论预算。'], 4);
    add('sw', null, ['Habari za asubuhi, the meeting starts now.'], 5);
    return context;
  }

  const ids = (items: { id: string }[]) => items.map((item) => item.id);

  it.each([
    ['reunion', ['fr']],
    ['ELEPHANT', ['fr']],
    ['l’éléph', ['fr']],
    ['naata', ['wo']],
    ['nangu', ['wo']],
    ['mbote', ['ln']],
    ['kinshasa', ['ln']],
    ['讨论', ['zh']],
    ['预算', ['zh']],
    ['habari meeting', ['sw']],
    ['habari zzz', []],
  ])('finds %s', (query, expected) => {
    const { repository } = withTranscript();
    expect(ids(repository.search(query))).toEqual(expected);
  });

  it('returns the whole list for an empty query, and leaves trashed items out', () => {
    const { repository } = withTranscript();
    expect(ids(repository.search('  '))).toEqual(['fr', 'wo', 'ln', 'zh', 'sw']);
    repository.trash('fr');
    expect(ids(repository.search('reunion'))).toEqual([]);
  });

  it('renames in the index too; an empty title goes back to the default one', () => {
    const { repository } = withTranscript();
    repository.rename('fr', 'Atelier');
    expect(ids(repository.search('reunion'))).toEqual([]);
    expect(ids(repository.search('atelier'))).toEqual(['fr']);
    repository.rename('fr', '  ');
    expect(repository.get('fr')?.title).toBeNull();
    expect(ids(repository.search('atelier'))).toEqual([]);
  });

  it('keeps the displayed text as the engine returned it', () => {
    const { repository } = withTranscript();
    expect(repository.segments('ln')[0]?.text).toBe('Mbɔ́tɛ na bino, tokobanda.');
  });

  it('moves to the trash and back', () => {
    const { repository, client } = withTranscript();
    repository.trash('wo');
    expect(ids(repository.list())).not.toContain('wo');
    expect(repository.listTrash().map((item) => [item.id, item.trashedAt])).toEqual([
      ['wo', new Date(T0).toISOString()],
    ]);
    repository.restore('wo');
    expect(ids(repository.list())).toContain('wo');
    expect(outboxOps(client, 'wo').slice(-2)).toEqual(['trash', 'restore']);
  });

  it('notifies subscribers of every change', () => {
    const { repository } = withTranscript();
    const listener = jest.fn();
    repository.subscribe(listener);
    repository.rename('fr', 'Autre');
    repository.trash('fr');
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('SqliteLibraryRepository: transcription API for step 3', () => {
  it('queues, starts, reports progress, saves, fails and retries', () => {
    const { repository } = setup();
    repository.createRecording({ id: 'rec', createdAt: new Date(T0).toISOString() });
    repository.finalizeRecording('rec', FINAL);
    repository.queueTranscription('rec', { language: 'sw', engine: 'local', model: 'whisper' });
    expect(repository.get('rec')).toMatchObject({ state: 'transcribing', language: 'sw' });
    repository.startTranscription('rec');
    repository.reportTranscriptionProgress('rec', 0.4);
    expect(repository.get('rec')?.progress).toBe(0.4);
    repository.failTranscription('rec', 'model-missing');
    expect(repository.get('rec')).toMatchObject({ state: 'failed', issue: 'model-missing' });
    repository.retryTranscription('rec');
    expect(repository.get('rec')?.issue).toBeUndefined();
    repository.startTranscription('rec');
    repository.saveTranscript('rec', [{ startMs: 0, endMs: 900, speaker: null, text: 'Habari' }], {
      quality: 'draft',
    });
    expect(repository.get('rec')).toMatchObject({ state: 'transcribed', quality: 'draft' });
    expect(repository.segments('rec')).toHaveLength(1);
  });

  it('refuses a transcript nobody started', () => {
    const { repository } = setup();
    repository.createRecording({ id: 'rec', createdAt: new Date(T0).toISOString() });
    repository.finalizeRecording('rec', FINAL);
    expect(() => repository.saveTranscript('rec', [], { quality: null })).toThrow(
      InvalidRecordingTransition,
    );
  });
});

describe('SqliteLibraryRepository: transcript drafts (step 3)', () => {
  function transcribing(context = setup()) {
    const { repository } = context;
    repository.createRecording({ id: 'rec', createdAt: new Date(T0).toISOString() });
    repository.finalizeRecording('rec', FINAL);
    repository.queueTranscription('rec', { language: 'fr', engine: 'local', model: 'tiny' });
    repository.startTranscription('rec');
    return context;
  }

  it('keeps each segment with the cursor, without outbox entries', () => {
    const { repository, client } = transcribing();
    const before = outboxOps(client, 'rec');
    repository.saveDraft('rec', { startMs: 1200, endMs: 4800, text: 'Bonjour' }, 4800);
    repository.saveDraft('rec', null, 60_000);
    repository.saveDraft('rec', { startMs: 61_000, endMs: 64_500, text: 'à tous' }, 64_500);
    expect(repository.transcriptionCheckpoint('rec')).toEqual({
      cursorMs: 64_500,
      drafts: [
        { startMs: 1200, endMs: 4800, text: 'Bonjour' },
        { startMs: 61_000, endMs: 64_500, text: 'à tous' },
      ],
    });
    expect(outboxOps(client, 'rec')).toEqual(before);
  });

  it('survives a relaunch', () => {
    const context = transcribing();
    context.repository.saveDraft('rec', { startMs: 0, endMs: 3000, text: 'Un' }, 3000);
    expect(context.relaunch().transcriptionCheckpoint('rec')).toEqual({
      cursorMs: 3000,
      drafts: [{ startMs: 0, endMs: 3000, text: 'Un' }],
    });
  });

  it('turns the drafts into the transcript in one go', () => {
    const { repository, client } = transcribing();
    repository.saveDraft('rec', { startMs: 0, endMs: 3000, text: 'Un' }, 3000);
    repository.saveDraft('rec', { startMs: 3500, endMs: 6000, text: 'Deux' }, 6000);
    repository.completeTranscription('rec', { quality: 'good' });
    expect(repository.segments('rec').map((segment) => segment.text)).toEqual(['Un', 'Deux']);
    expect(repository.get('rec')).toMatchObject({ state: 'transcribed', quality: 'good' });
    expect(repository.transcriptionCheckpoint('rec')).toEqual({ cursorMs: 0, drafts: [] });
    expect(client.prepare(`select count(*) as n from transcript_drafts`).get()).toEqual({ n: 0 });
    expect(repository.search('deux').map((item) => item.id)).toEqual(['rec']);
  });

  it('keeps the previous transcript through a retranscription that fails', () => {
    const { repository } = transcribing();
    repository.saveDraft('rec', { startMs: 0, endMs: 3000, text: 'Ancien' }, 3000);
    repository.completeTranscription('rec', { quality: 'good' });
    // Another language: a new job, which fails halfway.
    repository.queueTranscription('rec', { language: 'en', engine: 'local', model: 'tiny' });
    repository.startTranscription('rec');
    repository.saveDraft('rec', { startMs: 0, endMs: 3000, text: 'Old' }, 3000);
    expect(repository.segments('rec').map((segment) => segment.text)).toEqual(['Ancien']);
    repository.failTranscription('rec', 'failed');
    expect(repository.segments('rec').map((segment) => segment.text)).toEqual(['Ancien']);
    expect(repository.search('ancien').map((item) => item.id)).toEqual(['rec']);
  });

  it('drops the drafts of an earlier job when a new one is queued', () => {
    const { repository } = transcribing();
    repository.saveDraft('rec', { startMs: 0, endMs: 3000, text: 'Un' }, 3000);
    repository.failTranscription('rec', 'failed');
    repository.queueTranscription('rec', { language: 'de', engine: 'local', model: 'tiny' });
    expect(repository.transcriptionCheckpoint('rec')).toEqual({ cursorMs: 0, drafts: [] });
  });

  it('suspends a transcription with its drafts, and lists it to resume', () => {
    const context = transcribing();
    const { repository } = context;
    repository.saveDraft('rec', { startMs: 0, endMs: 3000, text: 'Un' }, 3000);
    repository.suspendTranscription('rec');
    expect(repository.pendingTranscriptions()).toEqual([{ id: 'rec', state: 'queued' }]);
    expect(repository.transcriptionCheckpoint('rec').cursorMs).toBe(3000);
    repository.startTranscription('rec');
    expect(repository.transcriptionCheckpoint('rec').drafts).toHaveLength(1);
    // A cut while running: the next launch finds it still "transcribing".
    expect(context.relaunch().pendingTranscriptions()).toEqual([
      { id: 'rec', state: 'transcribing' },
    ]);
  });

  it('leaves trashed recordings out of the pending transcriptions', () => {
    const { repository } = transcribing();
    repository.trash('rec');
    expect(repository.pendingTranscriptions()).toEqual([]);
  });

  it('resumes a transcription that waited for the model, with its drafts and cursor', () => {
    const { repository } = transcribing();
    repository.saveDraft('rec', { startMs: 0, endMs: 3000, text: 'Un' }, 3000);
    repository.failTranscription('rec', 'model-missing');
    repository.resumeTranscription('rec');
    expect(repository.pendingTranscriptions()).toEqual([{ id: 'rec', state: 'queued' }]);
    expect(repository.get('rec')?.issue).toBeUndefined();
    expect(repository.transcriptionCheckpoint('rec')).toEqual({
      cursorMs: 3000,
      drafts: [{ startMs: 0, endMs: 3000, text: 'Un' }],
    });
  });

  it('lists the transcriptions that waited for the model', () => {
    const { repository } = transcribing();
    repository.failTranscription('rec', 'model-missing');
    expect(repository.failedTranscriptions('model-missing')).toEqual(['rec']);
    expect(repository.failedTranscriptions('failed')).toEqual([]);
    repository.retryTranscription('rec');
    expect(repository.failedTranscriptions('model-missing')).toEqual([]);
  });

  it('gives a language to a recording that needs the cloud, never over a transcript', () => {
    const { repository } = setup();
    repository.createRecording({ id: 'rec', createdAt: new Date(T0).toISOString() });
    repository.finalizeRecording('rec', FINAL);
    repository.assignTranscriptionLanguage('rec', 'wo');
    expect(repository.get('rec')).toMatchObject({ state: 'audio', language: 'wo' });
    expect(repository.pendingTranscriptions()).toEqual([]);

    repository.queueTranscription('rec', { language: 'fr', engine: 'local', model: 'tiny' });
    repository.startTranscription('rec');
    repository.completeTranscription('rec', { quality: 'medium' });
    repository.assignTranscriptionLanguage('rec', 'zu');
    expect(repository.get('rec')).toMatchObject({ state: 'transcribed', language: 'fr' });
  });

  it('refuses a draft outside a transcription under way', () => {
    const { repository } = setup();
    repository.createRecording({ id: 'rec', createdAt: new Date(T0).toISOString() });
    repository.finalizeRecording('rec', FINAL);
    expect(() => repository.saveDraft('rec', null, 1000)).toThrow(/No transcription under way/);
  });
});

describe('SqliteLibraryRepository: trash purge', () => {
  function trashedOnDisk(id = 'old') {
    const context = setup();
    const { repository, fs } = context;
    recordedOnDisk(fs, id);
    repository.importManifests(listRecordings(fs, ROOT), () => 3);
    repository.rename(id, 'Réunion à purger');
    repository.trash(id);
    return context;
  }

  const filesOf = (fs: MemoryFs, id: string) =>
    [...fs.files.keys()].filter((path) => path.includes(id));

  it(`keeps a trashed recording ${TRASH_RETENTION_DAYS} days, then purges its audio and its row`, () => {
    const { repository, fs, advance } = trashedOnDisk();
    advance((TRASH_RETENTION_DAYS - 1) * DAY);
    expect(repository.purgeExpiredTrash()).toEqual([]);
    expect(filesOf(fs, 'old')).not.toEqual([]);
    advance(DAY);
    expect(repository.purgeExpiredTrash()).toEqual(['old']);
    expect(filesOf(fs, 'old')).toEqual([]);
    expect(repository.listTrash()).toEqual([]);
    expect(repository.get('old')).toBeUndefined();
  });

  it('leaves no trace of the title in the index after the purge', () => {
    const { repository, client, advance } = trashedOnDisk();
    repository.restore('old');
    expect(repository.search('purger').map((item) => item.id)).toEqual(['old']);
    repository.trash('old');
    advance(TRASH_RETENTION_DAYS * DAY);
    repository.purgeExpiredTrash();
    expect(client.prepare(`select count(*) as n from recordings_fts`).get()).toEqual({ n: 0 });
    expect(repository.search('purger')).toEqual([]);
  });

  it('never purges a recording something is still working on', () => {
    const { repository, advance } = setup();
    repository.createRecording({ id: 'capturing', createdAt: new Date(T0).toISOString() });
    repository.trash('capturing');
    repository.createRecording({ id: 'transcribing', createdAt: new Date(T0).toISOString() });
    repository.finalizeRecording('transcribing', FINAL);
    repository.queueTranscription('transcribing', { language: 'fr', engine: 'local', model: null });
    repository.trash('transcribing');
    advance(TRASH_RETENTION_DAYS * DAY * 2);
    expect(repository.purgeExpiredTrash()).toEqual([]);
    repository.emptyTrash();
    expect(
      repository
        .listTrash()
        .map((item) => item.id)
        .sort(),
    ).toEqual(['capturing', 'transcribing']);
  });

  it('empties the trash at once on the user’s gesture', () => {
    const { repository, fs } = trashedOnDisk();
    repository.emptyTrash();
    expect(repository.listTrash()).toEqual([]);
    expect(filesOf(fs, 'old')).toEqual([]);
  });

  it('death after the mark: the next launch finishes the purge and imports nothing back', () => {
    const { repository, fs, relaunch } = trashedOnDisk();
    repository.markForPurge(['old']);
    // The app dies here: files and row are still there.
    expect(filesOf(fs, 'old')).not.toEqual([]);
    const next = relaunch();
    expect(next.importManifests(listRecordings(fs, ROOT), () => 3)).toEqual([]);
    expect(next.list()).toEqual([]);
    expect(next.listTrash()).toEqual([]);
    next.purgeExpiredTrash();
    expect(filesOf(fs, 'old')).toEqual([]);
    expect(next.get('old')).toBeUndefined();
    expect(next.importManifests(listRecordings(fs, ROOT), () => 3)).toEqual([]);
  });

  it('death after the files: the next launch removes the row', () => {
    const { repository, fs, client, relaunch } = trashedOnDisk();
    repository.markForPurge(['old']);
    const row = client.prepare(`select * from recordings where id = 'old'`).get() as {
      id: string;
      audio_path: string;
    };
    repository.removeFiles({ id: row.id, audioPath: row.audio_path } as never);
    // The app dies here: no files, a marked row.
    expect(filesOf(fs, 'old')).toEqual([]);
    const next = relaunch();
    expect(next.list()).toEqual([]);
    next.purgeExpiredTrash();
    expect(client.prepare(`select count(*) as n from recordings`).get()).toEqual({ n: 0 });
    expect(next.importManifests(listRecordings(fs, ROOT), () => 3)).toEqual([]);
  });
});

describe('SqliteLibraryRepository: demo database', () => {
  it('refuses the demo set on the real database', () => {
    const { repository } = setup();
    expect(() => repository.seedDemo(demoItems(new Date(T0)), demoSegments)).toThrow(/demo/);
    expect(repository.list()).toEqual([]);
  });

  it('seeds an empty demo database once, states and transcripts included', () => {
    const { db, fs } = setup();
    const demo = new SqliteLibraryRepository({
      db,
      fs,
      root: ROOT,
      now: () => new Date(T0),
      demo: true,
    });
    expect(demo.seedDemo(demoItems(new Date(T0)), demoSegments)).toBe(true);
    expect(demo.seedDemo(demoItems(new Date(T0)), demoSegments)).toBe(false);
    expect(demo.list()).toHaveLength(demoItems(new Date(T0)).length);
    expect(demo.get('demo-failed')).toMatchObject({ state: 'failed', issue: 'failed', demo: true });
    expect(demo.search('mbote na bino').map((item) => item.id)).toEqual(['demo-kinshasa']);
  });
});
