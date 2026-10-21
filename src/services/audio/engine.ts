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
  | { kind: 'interruption-began' }
  | { kind: 'interruption-ended'; shouldResume: boolean }
  | { kind: 'route-lost' };
