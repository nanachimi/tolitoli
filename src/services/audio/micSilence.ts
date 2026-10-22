/**
 * Safety net for a microphone taken without any system event (D-023): Android
 * hands an app whose microphone is taken digital silence (zeros or ±1 LSB),
 * while even a quiet room stays well above it. It only raises an alert in the
 * interface; it never pauses the recording, so a false positive costs nothing.
 */

/** Peak at or below which a buffer counts as digital silence (4 LSB of 16-bit, about −78 dBFS). */
export const DIGITAL_SILENCE_PEAK = 4 / 32768;

/** Continuous digital silence before the interface warns that the mic seems cut. */
export const MIC_SILENCE_ALERT_MS = 500;

export function peak(samples: ArrayLike<number>): number {
  let max = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const value = Math.abs(samples[i] ?? 0);
    if (value > max) max = value;
  }
  return max;
}

/** Running length of digital silence after one more buffer of `durationMs`. */
export function nextSilentMs(silentMs: number, bufferPeak: number, durationMs: number): number {
  return bufferPeak <= DIGITAL_SILENCE_PEAK ? silentMs + durationMs : 0;
}

export function isMicSilent(silentMs: number): boolean {
  return silentMs >= MIC_SILENCE_ALERT_MS;
}
