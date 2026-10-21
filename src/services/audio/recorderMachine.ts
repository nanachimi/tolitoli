/**
 * Recorder lifecycle. `local` is the first state of the recording lifecycle
 * shared with sync (CLAUDE.md): written on the device and finalised.
 */
export type RecorderStatus =
  'idle' | 'preparing' | 'recording' | 'paused' | 'interrupted' | 'stopping' | 'local' | 'error';

export type RecorderEvent =
  | 'PREPARE'
  | 'STARTED'
  | 'PAUSE'
  | 'RESUME'
  | 'INTERRUPTION_BEGAN'
  | 'STOP'
  | 'STOPPED'
  | 'FAILED'
  | 'RESET';

const TRANSITIONS: Record<RecorderStatus, Partial<Record<RecorderEvent, RecorderStatus>>> = {
  idle: { PREPARE: 'preparing' },
  preparing: { STARTED: 'recording', FAILED: 'error' },
  recording: {
    PAUSE: 'paused',
    INTERRUPTION_BEGAN: 'interrupted',
    STOP: 'stopping',
    FAILED: 'error',
  },
  // An interruption while paused changes nothing: no segment is open.
  paused: { RESUME: 'recording', INTERRUPTION_BEGAN: 'paused', STOP: 'stopping', FAILED: 'error' },
  // Resuming after an interruption is always the user's choice (cahier: "reprise proposée").
  interrupted: { RESUME: 'recording', STOP: 'stopping', FAILED: 'error' },
  stopping: { STOPPED: 'local', FAILED: 'error' },
  local: { RESET: 'idle' },
  error: { RESET: 'idle' },
};

/** Next status, or null when the event is not allowed in this status. */
export function transition(status: RecorderStatus, event: RecorderEvent): RecorderStatus | null {
  return TRANSITIONS[status][event] ?? null;
}

export function canTransition(status: RecorderStatus, event: RecorderEvent): boolean {
  return transition(status, event) !== null;
}

/** Statuses in which an audio segment may be open on disk. */
export function isCapturing(status: RecorderStatus): boolean {
  return status === 'recording' || status === 'paused';
}
