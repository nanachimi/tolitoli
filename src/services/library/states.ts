/**
 * Recording lifecycle (CLAUDE.md, « Synchronisation ») and transcription state. Pure
 * functions: the repository asks them before every state write, so a row can only move
 * along an arrow of these tables.
 */

export type RecordingState =
  'recording' | 'local' | 'queued' | 'uploading' | 'verifying' | 'synced' | 'error';

export type RecordingEvent =
  'finalized' | 'queue' | 'upload' | 'uploaded' | 'verified' | 'fail' | 'retry';

/** States the trash purge may touch: nothing is in flight (owner, step 2 plan). */
export const TERMINAL_RECORDING_STATES: readonly RecordingState[] = ['local', 'synced', 'error'];

const RECORDING_TRANSITIONS: Record<
  RecordingState,
  Partial<Record<RecordingEvent, RecordingState>>
> = {
  recording: { finalized: 'local' },
  local: { queue: 'queued' },
  queued: { upload: 'uploading', fail: 'error' },
  uploading: { uploaded: 'verifying', fail: 'error' },
  verifying: { verified: 'synced', fail: 'error' },
  synced: {},
  error: { retry: 'local' },
};

export class InvalidRecordingTransition extends Error {
  constructor(state: string, event: string) {
    super(`No transition from ${state} on ${event}`);
    this.name = 'InvalidRecordingTransition';
  }
}

export function recordingTransition(state: RecordingState, event: RecordingEvent): RecordingState {
  const next = RECORDING_TRANSITIONS[state][event];
  if (!next) throw new InvalidRecordingTransition(state, event);
  return next;
}

export type TranscriptionState = 'none' | 'queued' | 'transcribing' | 'done' | 'failed';

export type TranscriptionEvent = 'queue' | 'start' | 'complete' | 'fail';

const TRANSCRIPTION_TRANSITIONS: Record<
  TranscriptionState,
  Partial<Record<TranscriptionEvent, TranscriptionState>>
> = {
  none: { queue: 'queued' },
  queued: { start: 'transcribing', fail: 'failed' },
  transcribing: { complete: 'done', fail: 'failed' },
  // A finished transcript may be redone (another language, the cloud engine later).
  done: { queue: 'queued' },
  failed: { queue: 'queued' },
};

export function transcriptionTransition(
  state: TranscriptionState,
  event: TranscriptionEvent,
): TranscriptionState {
  const next = TRANSCRIPTION_TRANSITIONS[state][event];
  if (!next) throw new InvalidRecordingTransition(state, event);
  return next;
}

/** A transcription still running must not lose its recording to the purge. */
export function isTranscriptionInFlight(state: TranscriptionState): boolean {
  return state === 'queued' || state === 'transcribing';
}

export const RECORDING_TRANSITION_TABLE = RECORDING_TRANSITIONS;
export const TRANSCRIPTION_TRANSITION_TABLE = TRANSCRIPTION_TRANSITIONS;
