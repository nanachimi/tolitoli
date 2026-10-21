import type { FormatProfile } from './formatProfile';

const MB = 1_000_000;

/** Cahier des charges: warn below 500 MB free. */
export const LOW_SPACE_WARNING_BYTES = 500 * MB;
/** Refuse to start unless at least this much recording fits. */
export const MIN_RECORDING_MINUTES = 10;

export type DiskCheck =
  | { kind: 'ok'; remainingMinutes: number }
  | { kind: 'low'; remainingMinutes: number }
  | { kind: 'insufficient'; remainingMinutes: number };

export function estimateRecordingBytes(profile: FormatProfile, durationMinutes: number): number {
  return (profile.recordingBytesPerHour * durationMinutes) / 60;
}

export function remainingRecordingMinutes(freeBytes: number, profile: FormatProfile): number {
  return Math.max(0, Math.floor((freeBytes / profile.recordingBytesPerHour) * 60));
}

export function checkDiskSpace(freeBytes: number, profile: FormatProfile): DiskCheck {
  const remainingMinutes = remainingRecordingMinutes(freeBytes, profile);
  if (freeBytes < estimateRecordingBytes(profile, MIN_RECORDING_MINUTES)) {
    return { kind: 'insufficient', remainingMinutes };
  }
  if (freeBytes < LOW_SPACE_WARNING_BYTES) return { kind: 'low', remainingMinutes };
  return { kind: 'ok', remainingMinutes };
}
