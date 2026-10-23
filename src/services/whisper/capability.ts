import type { LocalModelId } from './models';

/**
 * What a phone can run (step 3, owner): base is the quality floor; tiny is the default only on
 * a phone that cannot run base, and the interface then says what it costs; small stays on
 * offer, with a clear warning when it exceeds the phone. Nobody is forbidden a better text.
 */

/**
 * Peak memory of a transcription (PSS, MB), measured in release on the Galaxy A05 (4 GB),
 * screen off, on battery (D-037); null until measured.
 */
export const MEASURED_PEAK_MB: Record<LocalModelId, number | null> = {
  tiny: 785,
  base: null,
  small: null,
};

/**
 * Minutes of transcription per hour of audio, same conditions (D-037); null until measured.
 * Measured on speech read by a synthetic voice: a speed, never a quality.
 */
export const MEASURED_MINUTES_PER_HOUR: Record<LocalModelId, number | null> = {
  tiny: null,
  base: null,
  small: null,
};

/**
 * Share of the phone's memory a transcription may take and still be left alone by Android's
 * low-memory killer while in the background. An assumption to check on a 2 GB phone (or an
 * emulator set to 2 GB), recorded in D-037.
 */
export const MAX_MEMORY_SHARE = 0.35;

export type Fit = 'fits' | 'exceeds' | 'unknown';

/** Whether a model fits a phone with this much memory (bytes; null when unknown, e.g. iOS). */
export function modelFit(model: LocalModelId, totalMemoryBytes: number | null): Fit {
  const peak = MEASURED_PEAK_MB[model];
  if (totalMemoryBytes === null || peak === null) return 'unknown';
  return peak * 1024 * 1024 <= totalMemoryBytes * MAX_MEMORY_SHARE ? 'fits' : 'exceeds';
}

/**
 * The model a new install gets: base unless the phone is known not to run it; tiny then, even
 * when tiny itself is tight, since it is the lightest there is.
 */
export function defaultModel(totalMemoryBytes: number | null): LocalModelId {
  return modelFit('base', totalMemoryBytes) === 'exceeds' ? 'tiny' : 'base';
}

/** MemTotal of /proc/meminfo, in bytes; null when absent or unreadable. */
export function parseMemTotal(meminfo: string): number | null {
  const match = /^MemTotal:\s+(\d+)\s+kB/m.exec(meminfo);
  return match ? Number(match[1]) * 1024 : null;
}
