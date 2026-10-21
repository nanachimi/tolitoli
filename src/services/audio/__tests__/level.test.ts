import {
  levelFromSamples,
  meterLevel,
  METER_FLOOR_DBFS,
  rms,
  SILENCE_DBFS,
  toDbfs,
} from '../level';

describe('level meter', () => {
  it('silence is an empty meter', () => {
    expect(rms(new Float32Array(1024))).toBe(0);
    expect(toDbfs(0)).toBe(SILENCE_DBFS);
    expect(levelFromSamples(new Float32Array(1024))).toBe(0);
  });

  it('full-scale square wave is a full meter', () => {
    const samples = Float32Array.from({ length: 1024 }, (_, i) => (i % 2 ? 1 : -1));
    expect(rms(samples)).toBeCloseTo(1);
    expect(levelFromSamples(samples)).toBe(1);
  });

  it('maps known dBFS values linearly above the floor', () => {
    expect(toDbfs(0.5)).toBeCloseTo(-6.02, 2);
    expect(meterLevel(METER_FLOOR_DBFS)).toBe(0);
    expect(meterLevel(-30)).toBeCloseTo(0.5);
    expect(meterLevel(3)).toBe(1);
  });

  it('handles an empty buffer', () => {
    expect(levelFromSamples([])).toBe(0);
  });
});
