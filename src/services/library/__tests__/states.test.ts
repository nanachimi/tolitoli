import {
  InvalidRecordingTransition,
  isTranscriptionInFlight,
  RECORDING_TRANSITION_TABLE,
  recordingTransition,
  TERMINAL_RECORDING_STATES,
  TRANSCRIPTION_TRANSITION_TABLE,
  transcriptionTransition,
  type RecordingEvent,
  type RecordingState,
  type TranscriptionEvent,
  type TranscriptionState,
} from '../states';

const RECORDING_STATES = Object.keys(RECORDING_TRANSITION_TABLE) as RecordingState[];
const RECORDING_EVENTS: RecordingEvent[] = [
  'finalized',
  'queue',
  'upload',
  'uploaded',
  'verified',
  'fail',
  'retry',
];
const TRANSCRIPTION_STATES = Object.keys(TRANSCRIPTION_TRANSITION_TABLE) as TranscriptionState[];
const TRANSCRIPTION_EVENTS: TranscriptionEvent[] = ['queue', 'start', 'complete', 'fail'];

/** The lifecycle of CLAUDE.md, written out arrow by arrow. */
const EXPECTED_RECORDING: [RecordingState, RecordingEvent, RecordingState][] = [
  ['recording', 'finalized', 'local'],
  ['local', 'queue', 'queued'],
  ['queued', 'upload', 'uploading'],
  ['uploading', 'uploaded', 'verifying'],
  ['verifying', 'verified', 'synced'],
  ['queued', 'fail', 'error'],
  ['uploading', 'fail', 'error'],
  ['verifying', 'fail', 'error'],
  ['error', 'retry', 'local'],
];

const EXPECTED_TRANSCRIPTION: [TranscriptionState, TranscriptionEvent, TranscriptionState][] = [
  ['none', 'queue', 'queued'],
  ['queued', 'start', 'transcribing'],
  ['transcribing', 'complete', 'done'],
  ['queued', 'fail', 'failed'],
  ['transcribing', 'fail', 'failed'],
  ['failed', 'queue', 'queued'],
  ['done', 'queue', 'queued'],
];

describe('recording lifecycle', () => {
  it.each(EXPECTED_RECORDING)('%s --%s--> %s', (from, event, to) => {
    expect(recordingTransition(from, event)).toBe(to);
  });

  // Every other pair of the state × event grid is refused.
  const refused = RECORDING_STATES.flatMap((state) =>
    RECORDING_EVENTS.filter(
      (event) => !EXPECTED_RECORDING.some(([from, on]) => from === state && on === event),
    ).map((event) => [state, event] as const),
  );
  it.each(refused)('%s refuses %s', (state, event) => {
    expect(() => recordingTransition(state, event)).toThrow(InvalidRecordingTransition);
  });

  it('lets the purge touch only states with nothing in flight', () => {
    expect(TERMINAL_RECORDING_STATES).toEqual(['local', 'synced', 'error']);
  });
});

describe('transcription state', () => {
  it.each(EXPECTED_TRANSCRIPTION)('%s --%s--> %s', (from, event, to) => {
    expect(transcriptionTransition(from, event)).toBe(to);
  });

  const refused = TRANSCRIPTION_STATES.flatMap((state) =>
    TRANSCRIPTION_EVENTS.filter(
      (event) => !EXPECTED_TRANSCRIPTION.some(([from, on]) => from === state && on === event),
    ).map((event) => [state, event] as const),
  );
  it.each(refused)('%s refuses %s', (state, event) => {
    expect(() => transcriptionTransition(state, event)).toThrow(InvalidRecordingTransition);
  });

  it('counts queued and transcribing as in flight', () => {
    expect(TRANSCRIPTION_STATES.filter(isTranscriptionInFlight)).toEqual([
      'queued',
      'transcribing',
    ]);
  });
});
