/** Floor of the level meter; quieter input shows as an empty meter. */
export const METER_FLOOR_DBFS = -60;
export const SILENCE_DBFS = -160;

export function rms(samples: ArrayLike<number>): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const value = samples[i] ?? 0;
    sum += value * value;
  }
  return Math.sqrt(sum / samples.length);
}

export function toDbfs(value: number): number {
  if (value <= 0) return SILENCE_DBFS;
  return Math.max(SILENCE_DBFS, 20 * Math.log10(value));
}

/** Maps dBFS linearly onto 0..1 between the meter floor and full scale. */
export function meterLevel(dbfs: number): number {
  if (dbfs <= METER_FLOOR_DBFS) return 0;
  if (dbfs >= 0) return 1;
  return (dbfs - METER_FLOOR_DBFS) / -METER_FLOOR_DBFS;
}

export function levelFromSamples(samples: ArrayLike<number>): number {
  return meterLevel(toDbfs(rms(samples)));
}
