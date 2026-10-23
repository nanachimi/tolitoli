import { and, asc, desc, eq, inArray, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import * as schema from '@/db/schema';
import { outbox, recordings, segments, transcriptDrafts, type RecordingRow } from '@/db/schema';

import { joinPath, type Fs } from '../audio/fs';
import type { RecordingManifest } from '../audio/recordingStore';
import {
  isTranscriptionLanguageCode,
  type Quality,
  type TranscriptionLanguageCode,
} from '../transcription/languages';
import { foldForSearch, hasIdeographs } from '../transcription/searchFolding';
import {
  isTranscriptionInFlight,
  recordingTransition,
  TERMINAL_RECORDING_STATES,
  transcriptionTransition,
  type RecordingEvent,
  type TranscriptionEvent,
} from './states';
import type { DemoItem } from './demo';
import type {
  LibraryItem,
  LibraryItemState,
  LibraryRepository,
  Segment,
  TranscriptionIssue,
  TrashedItem,
} from './types';

/** A trashed recording is purged, audio included, after this many days (owner, step 2 plan). */
export const TRASH_RETENTION_DAYS = 30;
const DAY_MS = 86_400_000;

/** Both drizzle drivers the app uses run synchronously: expo-sqlite on the device, better-sqlite3 in Jest. */
export type LibraryDatabase = BaseSQLiteDatabase<'sync', unknown, typeof schema>;
type Tx = Parameters<Parameters<LibraryDatabase['transaction']>[0]>[0];

export type SqliteLibraryOptions = {
  db: LibraryDatabase;
  /** Files of a recording live under `<root>/<id>/`, its final file at `<root>/<audioPath>`. */
  fs: Fs;
  root: string;
  now: () => Date;
  /** The development demo database (docs/plans/step-2.md): items are marked as such. */
  demo?: boolean;
  /**
   * What the title index holds for a recording: the app gives the displayed title and the
   * date words in the interface language; by default, the typed title only.
   */
  describeForSearch?: (entry: TitleIndexEntry) => string;
};

export type TitleIndexEntry = { title: string | null; createdAt: number };

export type FinalizeInput = {
  audioPath: string | null;
  audioSize: number | null;
  audioFormat: 'm4a' | 'wav' | null;
  durationMs: number | null;
  recovered: boolean;
};

export type TranscriptSegment = Omit<Segment, 'id'>;

/** Where a transcription under way stands: audio done up to `cursorMs`, its segments so far. */
export type TranscriptionCheckpoint = {
  cursorMs: number;
  drafts: { startMs: number; endMs: number; text: string }[];
};

/** Library rows of SQLite (step 2), behind the interface the screens already use. */
export class SqliteLibraryRepository implements LibraryRepository {
  private readonly listeners = new Set<() => void>();

  constructor(private readonly options: SqliteLibraryOptions) {}

  private get db() {
    return this.options.db;
  }

  private nowMs(): number {
    return this.options.now().getTime();
  }

  // ---- reads -------------------------------------------------------------------------

  list(): LibraryItem[] {
    return this.db
      .select()
      .from(recordings)
      .where(and(isNull(recordings.deletedAt), isNull(recordings.purgedAt)))
      .orderBy(desc(recordings.createdAt))
      .all()
      .map((row) => this.toItem(row));
  }

  get(id: string): LibraryItem | undefined {
    const row = this.row(id);
    return row && row.purgedAt === null ? this.toItem(row) : undefined;
  }

  segments(id: string): Segment[] {
    return this.db
      .select()
      .from(segments)
      .where(eq(segments.recordingId, id))
      .orderBy(asc(segments.startMs))
      .all()
      .map((row) => ({
        id: row.id,
        startMs: row.startMs,
        endMs: row.endMs,
        speaker: row.speaker,
        text: row.text,
      }));
  }

  /** Titles and transcripts, folded the same way as the index (searchFolding.ts). */
  search(query: string): LibraryItem[] {
    const folded = foldForSearch(query.trim());
    if (folded === '') return this.list();
    const ids = hasIdeographs(folded) ? this.likeMatches(folded) : this.ftsMatches(folded);
    if (ids.length === 0) return [];
    return this.db
      .select()
      .from(recordings)
      .where(
        and(inArray(recordings.id, ids), isNull(recordings.deletedAt), isNull(recordings.purgedAt)),
      )
      .orderBy(desc(recordings.createdAt))
      .all()
      .map((row) => this.toItem(row));
  }

  listTrash(): TrashedItem[] {
    return this.db
      .select()
      .from(recordings)
      .where(and(isNotNull(recordings.deletedAt), isNull(recordings.purgedAt)))
      .orderBy(desc(recordings.deletedAt))
      .all()
      .map((row) => ({
        ...this.toItem(row),
        trashedAt: new Date(row.deletedAt ?? 0).toISOString(),
      }));
  }

  // ---- recording lifecycle (recording controller) --------------------------------------

  /** At the start of a capture: the manifest stays the truth while recording (D-021). */
  createRecording(manifest: Pick<RecordingManifest, 'id' | 'createdAt'>): void {
    const at = this.nowMs();
    this.write((tx) => {
      tx.insert(recordings)
        .values({
          id: manifest.id,
          createdAt: Date.parse(manifest.createdAt),
          updatedAt: at,
          state: 'recording',
        })
        .run();
      this.indexTitle(tx, manifest.id, { title: null, createdAt: Date.parse(manifest.createdAt) });
      this.log(tx, 'recording', manifest.id, 'create', { state: 'recording' });
    });
  }

  /** At a clean stop, or when the next launch finalises a cut recording. */
  finalizeRecording(id: string, input: FinalizeInput): void {
    const row = this.requireRow(id);
    const state = recordingTransition(row.state, 'finalized');
    this.write((tx) => {
      tx.update(recordings)
        .set({ ...input, state, updatedAt: this.nowMs() })
        .where(eq(recordings.id, id))
        .run();
      this.log(tx, 'recording', id, 'update', { state, ...input });
    });
  }

  /**
   * Finalised manifests that have no row yet (step 1 recordings, or a cut between two
   * writes). Any id the database already knows is left alone, whatever its state: a
   * recording being purged never comes back (owner, step 2 plan).
   */
  importManifests(
    manifests: RecordingManifest[],
    sizeOf: (manifest: RecordingManifest) => number | null,
  ): string[] {
    const known = new Set(
      this.db
        .select({ id: recordings.id })
        .from(recordings)
        .all()
        .map((row) => row.id),
    );
    const fresh = manifests.filter((m) => m.status === 'local' && !known.has(m.id));
    if (fresh.length === 0) return [];
    this.write((tx) => {
      for (const manifest of fresh) {
        const values = {
          id: manifest.id,
          createdAt: Date.parse(manifest.createdAt),
          updatedAt: this.nowMs(),
          state: 'local' as const,
          durationMs: manifest.durationMs,
          audioPath: manifest.finalFile,
          audioSize: sizeOf(manifest),
          audioFormat: audioFormatOf(manifest.finalFile),
          recovered: manifest.recovered,
        };
        tx.insert(recordings).values(values).run();
        this.indexTitle(tx, manifest.id, { title: null, createdAt: values.createdAt });
        this.log(tx, 'recording', manifest.id, 'create', values);
      }
    });
    return fresh.map((m) => m.id);
  }

  /** Rows left in `recording` whose manifest was finalised (the app died in between). */
  reconcileUnfinished(
    manifests: RecordingManifest[],
    sizeOf: (manifest: RecordingManifest) => number | null,
  ): string[] {
    const byId = new Map(manifests.map((m) => [m.id, m]));
    const stuck = this.db
      .select()
      .from(recordings)
      .where(and(eq(recordings.state, 'recording'), isNull(recordings.purgedAt)))
      .all();
    const finalized: string[] = [];
    for (const row of stuck) {
      const manifest = byId.get(row.id);
      if (manifest?.status !== 'local') continue;
      finalized.push(row.id);
      this.finalizeRecording(row.id, {
        audioPath: manifest.finalFile,
        audioSize: sizeOf(manifest),
        audioFormat: audioFormatOf(manifest.finalFile),
        durationMs: manifest.durationMs,
        recovered: manifest.recovered,
      });
    }
    return finalized;
  }

  /** Only the lifecycle of CLAUDE.md: synchronisation (1.1) drives the other arrows. */
  transition(id: string, event: RecordingEvent, error: string | null = null): void {
    const row = this.requireRow(id);
    const state = recordingTransition(row.state, event);
    this.write((tx) => {
      tx.update(recordings)
        .set({ state, stateError: state === 'error' ? error : null, updatedAt: this.nowMs() })
        .where(eq(recordings.id, id))
        .run();
      this.log(tx, 'recording', id, 'update', { state });
    });
  }

  // ---- user edits ------------------------------------------------------------------------

  rename(id: string, title: string): void {
    const trimmed = title.trim();
    const next = trimmed === '' ? null : trimmed;
    const row = this.requireRow(id);
    this.write((tx) => {
      tx.update(recordings)
        .set({ title: next, updatedAt: this.nowMs() })
        .where(eq(recordings.id, id))
        .run();
      this.indexTitle(tx, row.id, { title: next, createdAt: row.createdAt });
      this.log(tx, 'recording', id, 'update', { title: next });
    });
  }

  trash(id: string): void {
    this.requireRow(id);
    const at = this.nowMs();
    this.write((tx) => {
      tx.update(recordings)
        .set({ deletedAt: at, updatedAt: at })
        .where(eq(recordings.id, id))
        .run();
      this.log(tx, 'recording', id, 'trash', { deletedAt: at });
    });
  }

  restore(id: string): void {
    this.requireRow(id);
    this.write((tx) => {
      tx.update(recordings)
        .set({ deletedAt: null, updatedAt: this.nowMs() })
        .where(eq(recordings.id, id))
        .run();
      this.log(tx, 'recording', id, 'restore', null);
    });
  }

  /** The user's explicit gesture: every trashed recording that nothing is working on. */
  emptyTrash(): void {
    const rows = this.db
      .select()
      .from(recordings)
      .where(and(isNotNull(recordings.deletedAt), isNull(recordings.purgedAt)))
      .all()
      .filter(isPurgeable);
    this.purge(rows.map((row) => row.id));
  }

  // ---- transcription (step 3 calls these) --------------------------------------------

  retryTranscription(id: string): void {
    const row = this.requireRow(id);
    this.queueTranscription(id, {
      language: row.language,
      engine: row.engine,
      model: row.model,
    });
  }

  /** A new job (language, engine or model): the drafts of an earlier one are dropped. */
  queueTranscription(
    id: string,
    target: { language: string | null; engine: 'local' | 'cloud' | null; model: string | null },
  ): void {
    this.moveTranscription(
      id,
      'queue',
      {
        ...target,
        transcriptionIssue: null,
        transcriptionProgress: null,
        transcriptionCursorMs: null,
      },
      (tx) => tx.delete(transcriptDrafts).where(eq(transcriptDrafts.recordingId, id)).run(),
    );
  }

  startTranscription(id: string): void {
    this.moveTranscription(id, 'start', { transcriptionProgress: 0 });
  }

  /**
   * The language of a recording no engine can transcribe yet (cloud required, step 3): no
   * job, but the Detail knows what to say. A recording already transcribed keeps its own.
   */
  assignTranscriptionLanguage(id: string, language: string): void {
    const row = this.requireRow(id);
    if (row.transcriptionState !== 'none' || row.language === language) return;
    this.write((tx) => {
      tx.update(recordings)
        .set({ language, updatedAt: this.nowMs() })
        .where(eq(recordings.id, id))
        .run();
      this.log(tx, 'recording', id, 'update', { language });
    });
  }

  /** Failed for this reason, outside the trash: what a ready model sends back to the queue. */
  failedTranscriptions(issue: TranscriptionIssue): string[] {
    return this.db
      .select({ id: recordings.id })
      .from(recordings)
      .where(
        and(
          eq(recordings.transcriptionState, 'failed'),
          eq(recordings.transcriptionIssue, issue),
          isNull(recordings.deletedAt),
          isNull(recordings.purgedAt),
        ),
      )
      .orderBy(asc(recordings.createdAt))
      .all()
      .map((row) => row.id);
  }

  /** Back in the queue, drafts and cursor kept: it resumes where it stopped (step 3). */
  suspendTranscription(id: string): void {
    this.moveTranscription(id, 'suspend', {});
  }

  /**
   * Transcriptions to run, oldest recording first: queued or found running (after a cut),
   * outside the trash. What the queue picks up at launch.
   */
  pendingTranscriptions(): { id: string; state: 'queued' | 'transcribing' }[] {
    return this.db
      .select({ id: recordings.id, state: recordings.transcriptionState })
      .from(recordings)
      .where(
        and(
          inArray(recordings.transcriptionState, ['queued', 'transcribing']),
          isNull(recordings.deletedAt),
          isNull(recordings.purgedAt),
        ),
      )
      .orderBy(asc(recordings.createdAt))
      .all() as { id: string; state: 'queued' | 'transcribing' }[];
  }

  /** The job of a pending transcription, as queued. */
  transcriptionJob(id: string): {
    language: string | null;
    engine: 'local' | 'cloud' | null;
    model: string | null;
    audioPath: string | null;
    durationMs: number | null;
  } {
    const row = this.requireRow(id);
    return {
      language: row.language,
      engine: row.engine,
      model: row.model,
      audioPath: row.audioPath,
      durationMs: row.durationMs,
    };
  }

  /** Progress only: no transition, no outbox entry (nothing to synchronise). */
  reportTranscriptionProgress(id: string, progress: number): void {
    this.db
      .update(recordings)
      .set({ transcriptionProgress: Math.min(1, Math.max(0, progress)) })
      .where(eq(recordings.id, id))
      .run();
    this.emit();
  }

  /**
   * One step of a transcription under way: its new segment, if any, and the cursor, in one
   * transaction. Working state: no outbox entry, no listener (progress is reported apart).
   */
  saveDraft(
    id: string,
    segment: { startMs: number; endMs: number; text: string } | null,
    cursorMs: number,
  ): void {
    const row = this.requireRow(id);
    if (row.transcriptionState !== 'transcribing') {
      throw new Error(`No transcription under way for ${id}`);
    }
    this.db.transaction((tx) => {
      if (segment) {
        const [{ n }] = tx
          .select({ n: sql<number>`count(*)` })
          .from(transcriptDrafts)
          .where(eq(transcriptDrafts.recordingId, id))
          .all() as [{ n: number }];
        tx.insert(transcriptDrafts)
          .values({ recordingId: id, idx: n, ...segment })
          .run();
      }
      tx.update(recordings)
        .set({ transcriptionCursorMs: Math.max(0, Math.round(cursorMs)) })
        .where(eq(recordings.id, id))
        .run();
    });
  }

  /** What a transcription resumes from: nothing done yet is a cursor at 0 and no draft. */
  transcriptionCheckpoint(id: string): TranscriptionCheckpoint {
    const row = this.requireRow(id);
    const drafts = this.db
      .select({
        startMs: transcriptDrafts.startMs,
        endMs: transcriptDrafts.endMs,
        text: transcriptDrafts.text,
      })
      .from(transcriptDrafts)
      .where(eq(transcriptDrafts.recordingId, id))
      .orderBy(asc(transcriptDrafts.idx))
      .all();
    return { cursorMs: row.transcriptionCursorMs ?? 0, drafts };
  }

  /** The end of a transcription: its drafts become the transcript, in one transaction. */
  completeTranscription(id: string, result: { quality: Quality | null }): void {
    const { drafts } = this.transcriptionCheckpoint(id);
    this.saveTranscript(
      id,
      drafts.map((draft) => ({ ...draft, speaker: null })),
      result,
    );
  }

  /**
   * Replaces the whole transcript in one transaction; the FTS triggers follow. Until then the
   * previous transcript stays: a retranscription that fails never leaves a recording without
   * text (owner, step 3 plan).
   */
  saveTranscript(
    id: string,
    transcript: TranscriptSegment[],
    result: { quality: Quality | null },
  ): void {
    const row = this.requireRow(id);
    const transcriptionState = transcriptionTransition(row.transcriptionState, 'complete');
    this.write((tx) => {
      tx.delete(segments).where(eq(segments.recordingId, id)).run();
      tx.delete(transcriptDrafts).where(eq(transcriptDrafts.recordingId, id)).run();
      transcript.forEach((segment, index) => {
        tx.insert(segments)
          .values({
            id: `${id}:${index}`,
            recordingId: id,
            startMs: segment.startMs,
            endMs: segment.endMs,
            speaker: segment.speaker,
            text: segment.text,
            searchText: foldForSearch(segment.text),
          })
          .run();
      });
      tx.update(recordings)
        .set({
          transcriptionState,
          transcriptionProgress: 1,
          transcriptionIssue: null,
          transcriptionCursorMs: null,
          quality: result.quality,
          updatedAt: this.nowMs(),
        })
        .where(eq(recordings.id, id))
        .run();
      this.log(tx, 'recording', id, 'transcript', {
        segments: transcript.length,
        quality: result.quality,
      });
    });
  }

  failTranscription(id: string, issue: TranscriptionIssue): void {
    this.moveTranscription(id, 'fail', { transcriptionIssue: issue });
  }

  // ---- trash purge -----------------------------------------------------------------------

  /**
   * Launch only (app/_layout.tsx), never in migrations. Finishes purges an earlier launch
   * started, then purges what has been in the trash for 30 days.
   */
  purgeExpiredTrash(): string[] {
    this.resumePurges();
    const limit = this.nowMs() - TRASH_RETENTION_DAYS * DAY_MS;
    const expired = this.db
      .select()
      .from(recordings)
      .where(and(lte(recordings.deletedAt, limit), isNull(recordings.purgedAt)))
      .all()
      .filter(isPurgeable)
      .map((row) => row.id);
    this.purge(expired);
    return expired;
  }

  /**
   * Mark, then files, then row: if the app dies on the way, the row is still there and
   * marked, so the next launch finishes the purge and nothing is imported back.
   */
  private purge(ids: string[]): void {
    if (ids.length === 0) return;
    this.markForPurge(ids);
    this.resumePurges();
  }

  /** Step a. Exposed for the tests that kill the app between steps. */
  markForPurge(ids: string[]): void {
    const at = this.nowMs();
    this.write((tx) => {
      tx.update(recordings).set({ purgedAt: at }).where(inArray(recordings.id, ids)).run();
      for (const id of ids) this.log(tx, 'recording', id, 'purge', null);
    });
  }

  /** Steps b and c for every marked row. */
  resumePurges(): void {
    const marked = this.db.select().from(recordings).where(isNotNull(recordings.purgedAt)).all();
    for (const row of marked) {
      this.removeFiles(row);
      this.removeRow(row);
    }
    if (marked.length > 0) this.emit();
  }

  /** Step b. Exposed for the tests that kill the app between steps. */
  removeFiles(row: RecordingRow): void {
    const { fs, root } = this.options;
    fs.removeTree(joinPath(root, row.id));
    if (row.audioPath) fs.remove(joinPath(root, row.audioPath));
  }

  /** Step c: the row, its segments (cascade, FTS by trigger) and its title in recordings_fts. */
  private removeRow(row: RecordingRow): void {
    this.db.transaction((tx) => {
      this.indexTitle(tx, row.id, null);
      tx.delete(recordings).where(eq(recordings.id, row.id)).run();
    });
  }

  // ---- development demo database --------------------------------------------------------

  /**
   * Seeds an empty demo database (tolitoli-demo.db) with the demo set, states included.
   * The repository refuses it on any other database: the real one is never written to.
   */
  seedDemo(items: DemoItem[], segmentsOf: (id: string) => Segment[]): boolean {
    if (!this.options.demo) throw new Error('Demo data only goes to the demo database');
    if (this.db.select({ id: recordings.id }).from(recordings).limit(1).all().length > 0) {
      return false;
    }
    const at = this.nowMs();
    this.write((tx) => {
      for (const item of items) {
        tx.insert(recordings)
          .values({
            id: item.id,
            title: item.title,
            createdAt: Date.parse(item.createdAt),
            updatedAt: at,
            durationMs: item.durationMs,
            // What the file would weigh at 64 kbit/s (D-021): the Storage screen has sizes to show.
            audioSize:
              item.durationMs === null ? null : Math.round(item.durationMs * DEMO_BYTES_PER_MS),
            state: 'local',
            transcriptionState: DEMO_TRANSCRIPTION_STATE[item.state],
            transcriptionProgress: item.progress ?? null,
            transcriptionIssue: item.issue ?? null,
            language: item.language,
            quality: item.quality,
            recovered: item.recovered,
          })
          .run();
        this.indexTitle(tx, item.id, { title: item.title, createdAt: Date.parse(item.createdAt) });
        segmentsOf(item.id).forEach((segment) => {
          tx.insert(segments)
            .values({
              ...segment,
              recordingId: item.id,
              searchText: foldForSearch(segment.text),
            })
            .run();
        });
        this.log(tx, 'recording', item.id, 'create', { demo: true });
      }
    });
    return true;
  }

  // ---- subscription ------------------------------------------------------------------------

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(): void {
    this.listeners.forEach((listener) => listener());
  }

  // ---- internals ---------------------------------------------------------------------------

  private write(change: (tx: Tx) => void): void {
    this.db.transaction(change);
    this.emit();
  }

  private log(
    tx: Tx,
    entity: 'recording' | 'segment',
    entityId: string,
    op: (typeof schema.OUTBOX_OPS)[number],
    payload: unknown,
  ): void {
    tx.insert(outbox)
      .values({
        entity,
        entityId,
        op,
        payload: payload === null ? null : JSON.stringify(payload),
        createdAt: this.nowMs(),
      })
      .run();
  }

  private moveTranscription(
    id: string,
    event: TranscriptionEvent,
    fields: Partial<typeof recordings.$inferInsert>,
    also?: (tx: Tx) => void,
  ): void {
    const row = this.requireRow(id);
    const transcriptionState = transcriptionTransition(row.transcriptionState, event);
    this.write((tx) => {
      also?.(tx);
      tx.update(recordings)
        .set({ ...fields, transcriptionState, updatedAt: this.nowMs() })
        .where(eq(recordings.id, id))
        .run();
      this.log(tx, 'recording', id, 'update', { transcriptionState, ...fields });
    });
  }

  /**
   * recordings_fts has no external content: its row follows the recording by rowid. Null
   * removes it (the recording is going away).
   */
  private indexTitle(tx: Tx, id: string, entry: TitleIndexEntry | null): void {
    const rowid = sql`(select rowid from ${recordings} where ${recordings.id} = ${id})`;
    tx.run(sql`delete from recordings_fts where rowid = ${rowid}`);
    if (!entry) return;
    const text = foldForSearch(this.describe(entry)).trim();
    if (text) {
      tx.run(sql`insert into recordings_fts (rowid, title_search) values (${rowid}, ${text})`);
    }
  }

  private describe(entry: TitleIndexEntry): string {
    return this.options.describeForSearch?.(entry) ?? entry.title ?? '';
  }

  /** One title index row per recording still there: false asks for a rebuild. */
  titleIndexIsComplete(): boolean {
    const indexed = this.db.all<{ n: number }>(sql`select count(*) as n from recordings_fts`);
    const expected = this.db.all<{ n: number }>(
      sql`select count(*) as n from recordings where purged_at is null`,
    );
    return (indexed[0]?.n ?? 0) === (expected[0]?.n ?? 0);
  }

  /**
   * Rebuilds the title index, one row per recording, in one transaction: the date words
   * depend on the interface language (called when it changes, and at launch if needed).
   */
  reindexTitles(): void {
    const rows = this.db
      .select({ id: recordings.id, title: recordings.title, createdAt: recordings.createdAt })
      .from(recordings)
      .where(isNull(recordings.purgedAt))
      .all();
    this.db.transaction((tx) => {
      for (const row of rows) this.indexTitle(tx, row.id, row);
    });
    this.emit();
  }

  private ftsMatches(folded: string): string[] {
    const query = ftsQuery(folded);
    if (!query) return [];
    const fromSegments = this.db.all<{ id: string }>(
      sql`select distinct s.recording_id as id from segments_fts f join segments s on s.rowid = f.rowid where segments_fts match ${query}`,
    );
    const fromTitles = this.db.all<{ id: string }>(
      sql`select r.id as id from recordings_fts f join recordings r on r.rowid = f.rowid where recordings_fts match ${query}`,
    );
    return unique([...fromSegments, ...fromTitles].map((row) => row.id));
  }

  /** Chinese: a substring match on the folded text, every term required (D-036). */
  private likeMatches(folded: string): string[] {
    const terms = folded.split(/\s+/).filter(Boolean);
    const like = (column: string) =>
      sql.join(
        terms.map((term) => sql`${sql.raw(column)} like ${`%${escapeLike(term)}%`} escape '\\'`),
        sql` and `,
      );
    const fromSegments = this.db.all<{ id: string }>(
      sql`select distinct recording_id as id from segments where ${like('search_text')}`,
    );
    const titleTerms = this.db
      .select({ id: recordings.id, title: recordings.title })
      .from(recordings)
      .where(isNotNull(recordings.title))
      .all()
      .filter((row) => terms.every((term) => foldForSearch(row.title ?? '').includes(term)));
    return unique([...fromSegments, ...titleTerms].map((row) => row.id));
  }

  private row(id: string): RecordingRow | undefined {
    return this.db.select().from(recordings).where(eq(recordings.id, id)).get();
  }

  private requireRow(id: string): RecordingRow {
    const row = this.row(id);
    if (!row || row.purgedAt !== null) throw new Error(`Unknown recording ${id}`);
    return row;
  }

  private toItem(row: RecordingRow): LibraryItem {
    const language: TranscriptionLanguageCode | null = isTranscriptionLanguageCode(row.language)
      ? row.language
      : null;
    return {
      id: row.id,
      title: row.title,
      createdAt: new Date(row.createdAt).toISOString(),
      durationMs: row.durationMs,
      state: ITEM_STATE[row.transcriptionState],
      language,
      quality: row.quality,
      recovered: row.recovered,
      audioPath: row.audioPath,
      audioSize: row.audioSize,
      ...(row.transcriptionProgress !== null &&
      (row.transcriptionState === 'transcribing' || row.transcriptionState === 'queued')
        ? { progress: row.transcriptionProgress }
        : {}),
      ...(row.transcriptionState === 'queued' ? { waiting: true as const } : {}),
      ...(row.transcriptionIssue ? { issue: row.transcriptionIssue } : {}),
      demo: this.options.demo ?? false,
    };
  }
}

/** 64 kbit/s AAC (D-021), in bytes per millisecond. */
const DEMO_BYTES_PER_MS = 64_000 / 8 / 1000;

const DEMO_TRANSCRIPTION_STATE: Record<LibraryItemState, RecordingRow['transcriptionState']> = {
  audio: 'none',
  transcribing: 'transcribing',
  transcribed: 'done',
  failed: 'failed',
};

const ITEM_STATE: Record<RecordingRow['transcriptionState'], LibraryItemState> = {
  none: 'audio',
  queued: 'transcribing',
  transcribing: 'transcribing',
  done: 'transcribed',
  failed: 'failed',
};

/** Nothing in flight: neither a capture or an upload, nor a transcription (owner, step 2 plan). */
function isPurgeable(row: RecordingRow): boolean {
  return (
    TERMINAL_RECORDING_STATES.includes(row.state) &&
    !isTranscriptionInFlight(row.transcriptionState)
  );
}

function audioFormatOf(finalFile: string | null): 'm4a' | 'wav' | null {
  if (!finalFile) return null;
  return finalFile.toLowerCase().endsWith('.wav') ? 'wav' : 'm4a';
}

/** Every word as a prefix, all required: `"mbo"* "na"*`; a stray ":" or "/" at its ends goes. */
export function ftsQuery(folded: string): string {
  return (
    folded
      // Spaces and punctuation; no \p{L}, which Hermes may not support. ":" and "/" stay
      // inside a word: the title index keeps "10:23" and "23/10" whole (migration 0002),
      // and the transcript index reads such a word as a phrase of its parts.
      .split(/[\s.,;!?¡¿«»"“”„()[\]{}<>\-–—\\…·*]+/)
      .map((word) => word.replace(/^[:/]+|[:/]+$/g, ''))
      .filter(Boolean)
      .map((word) => `"${word.replace(/"/g, '""')}"*`)
      .join(' ')
  );
}

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
