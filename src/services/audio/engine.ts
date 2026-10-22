/**
 * Native recorder behind an interface so the session logic stays testable
 * without a device. One `open` starts a fresh native recorder writing segment
 * files into `dir`; `close` stops it and returns the files it finished.
 */
export interface RecordingEngine {
  open(dir: string, segmentPrefix: string): Promise<void>;
  /** Stops the native recorder; returns finished segment file names, in order. */
  close(): Promise<string[]>;
  pause(): void;
  resume(): void;
}

export type SystemInterruption =
  /** `transient`: the microphone is expected back (ringtone, call), so an "ended" event will follow. */
  | { kind: 'interruption-began'; transient: boolean }
  | { kind: 'interruption-ended'; shouldResume: boolean }
  | { kind: 'route-lost' };

/** One buffer of the 16 kHz monitoring tap: meter level, peak and duration. */
export type AudioFrame = { level: number; peak: number; durationMs: number };
