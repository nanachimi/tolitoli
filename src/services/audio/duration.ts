function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Elapsed time as m:ss, or h:mm:ss from one hour; digits only, so no locale data needed. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/**
 * Locale-neutral local date and time (YYYY-MM-DD HH:mm). Hermes may lack Intl
 * date formatting (D-012); proper localized dates come with the library (step 2).
 */
export function formatRecordingDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Recording time so far: closed spans plus the running one. */
export function elapsedMs(accumulatedMs: number, runningSince: number | null, now: number): number {
  return accumulatedMs + (runningSince === null ? 0 : Math.max(0, now - runningSince));
}
