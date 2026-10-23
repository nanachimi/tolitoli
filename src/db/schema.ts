import { sql } from 'drizzle-orm';
import { check, index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Local database (step 2, docs/plans/step-2.md). Dates are integers in ms, booleans
 * integers. The full-text indexes live in the hand-written migration 0001.
 */

/** Recording lifecycle of CLAUDE.md: every transition is in src/services/library/states.ts. */
export const RECORDING_STATES = [
  'recording',
  'local',
  'queued',
  'uploading',
  'verifying',
  'synced',
  'error',
] as const;
export const TRANSCRIPTION_STATES = ['none', 'queued', 'transcribing', 'done', 'failed'] as const;
export const TRANSCRIPTION_ISSUES = [
  'failed',
  'model-missing',
  'offline',
  'quota-exhausted',
] as const;
/** Format of the final file: m4a, or the WAV kept when encoding failed (D-021). */
export const AUDIO_FORMATS = ['m4a', 'wav'] as const;
export const QUALITIES = ['good', 'medium', 'draft'] as const;
export const ENGINES = ['local', 'cloud'] as const;
export const OUTBOX_ENTITIES = ['recording', 'segment'] as const;
export const OUTBOX_OPS = ['create', 'update', 'trash', 'restore', 'purge', 'transcript'] as const;

function oneOf(column: unknown, values: readonly string[]) {
  return sql`${column} in (${sql.raw(values.map((value) => `'${value}'`).join(', '))})`;
}

export const recordings = sqliteTable(
  'recordings',
  {
    id: text('id').primaryKey(),
    /** Null means the default title ("Enregistrement du <date> <heure>"). */
    title: text('title'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    durationMs: integer('duration_ms'),
    /** Relative to the recordings root. */
    audioPath: text('audio_path'),
    /** Bytes, read from disk when the recording is finalised. */
    audioSize: integer('audio_size'),
    /** Null while recording. */
    audioFormat: text('audio_format', { enum: AUDIO_FORMATS }),
    sampleRate: integer('sample_rate').notNull().default(16000),
    recovered: integer('recovered', { mode: 'boolean' }).notNull().default(false),
    state: text('state', { enum: RECORDING_STATES }).notNull(),
    stateError: text('state_error'),
    transcriptionState: text('transcription_state', { enum: TRANSCRIPTION_STATES })
      .notNull()
      .default('none'),
    transcriptionProgress: real('transcription_progress'),
    transcriptionIssue: text('transcription_issue', { enum: TRANSCRIPTION_ISSUES }),
    language: text('language'),
    engine: text('engine', { enum: ENGINES }),
    model: text('model'),
    quality: text('quality', { enum: QUALITIES }),
    /** Computed with synchronisation (1.1); the column exists so that no migration is needed. */
    sha256: text('sha256'),
    /** In the trash since. */
    deletedAt: integer('deleted_at'),
    /** Purge started: hidden everywhere, resumed at the next launch until the row is gone. */
    purgedAt: integer('purged_at'),
  },
  (t) => [
    index('recordings_listing').on(t.deletedAt, t.createdAt),
    check('recordings_state', oneOf(t.state, RECORDING_STATES)),
    check('recordings_transcription_state', oneOf(t.transcriptionState, TRANSCRIPTION_STATES)),
    check(
      'recordings_transcription_issue',
      sql`${t.transcriptionIssue} is null or ${oneOf(t.transcriptionIssue, TRANSCRIPTION_ISSUES)}`,
    ),
    check(
      'recordings_audio_format',
      sql`${t.audioFormat} is null or ${oneOf(t.audioFormat, AUDIO_FORMATS)}`,
    ),
    check('recordings_quality', sql`${t.quality} is null or ${oneOf(t.quality, QUALITIES)}`),
    check('recordings_engine', sql`${t.engine} is null or ${oneOf(t.engine, ENGINES)}`),
    check(
      'recordings_progress',
      sql`${t.transcriptionProgress} is null or ${t.transcriptionProgress} between 0 and 1`,
    ),
  ],
);

export const segments = sqliteTable(
  'segments',
  {
    // The implicit rowid is kept: segments_fts uses it as its content rowid.
    id: text('id').primaryKey(),
    recordingId: text('recording_id')
      .notNull()
      .references(() => recordings.id, { onDelete: 'cascade' }),
    startMs: integer('start_ms').notNull(),
    endMs: integer('end_ms').notNull(),
    speaker: integer('speaker'),
    /** As the engine returned it, for display. */
    text: text('text').notNull(),
    /** foldForSearch(text), for the index only. */
    searchText: text('search_text').notNull(),
  },
  (t) => [index('segments_by_recording').on(t.recordingId, t.startMs)],
);

/** Every local change, written in the same transaction as the data (CLAUDE.md). */
export const outbox = sqliteTable(
  'outbox',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    entity: text('entity', { enum: OUTBOX_ENTITIES }).notNull(),
    entityId: text('entity_id').notNull(),
    op: text('op', { enum: OUTBOX_OPS }).notNull(),
    /** JSON of the changed fields. */
    payload: text('payload'),
    createdAt: integer('created_at').notNull(),
    attempts: integer('attempts').notNull().default(0),
    sentAt: integer('sent_at'),
  },
  (t) => [
    check('outbox_entity', oneOf(t.entity, OUTBOX_ENTITIES)),
    check('outbox_op', oneOf(t.op, OUTBOX_OPS)),
  ],
);

export type RecordingRow = typeof recordings.$inferSelect;
export type SegmentRow = typeof segments.$inferSelect;
export type OutboxRow = typeof outbox.$inferSelect;
