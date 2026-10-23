import {
  defaultModel,
  MAX_MEMORY_SHARE,
  MEASURED_PEAK_MB,
  modelFit,
  parseMemTotal,
} from '../capability';

const GB = 1024 ** 3;

describe('device capability (step 3)', () => {
  it('reads the total memory from /proc/meminfo', () => {
    expect(parseMemTotal('MemTotal:        3826452 kB\nMemFree:  12 kB\n')).toBe(3826452 * 1024);
    expect(parseMemTotal('nothing here')).toBeNull();
  });

  it('says a model fits only when its measured peak is within the share of memory', () => {
    const peak = MEASURED_PEAK_MB.tiny!;
    const enough = (peak * 1024 * 1024) / MAX_MEMORY_SHARE;
    expect(modelFit('tiny', enough)).toBe('fits');
    expect(modelFit('tiny', enough - 1)).toBe('exceeds');
  });

  it('knows nothing without a measurement or a memory figure', () => {
    expect(modelFit('tiny', null)).toBe('unknown');
    expect(modelFit('small', 8 * GB)).toBe(MEASURED_PEAK_MB.small === null ? 'unknown' : 'fits');
  });

  it('gives base by default, tiny only where base is known not to fit', () => {
    expect(defaultModel(null)).toBe('base');
    expect(defaultModel(16 * GB)).toBe('base');
    if (MEASURED_PEAK_MB.base !== null) {
      expect(defaultModel(1 * GB)).toBe('tiny');
    }
  });
});
