import { elapsedMs, formatDuration, formatRecordingDate } from '../duration';

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [999, '0:00'],
    [61_000, '1:01'],
    [3_599_000, '59:59'],
    [3_600_000, '1:00:00'],
    [3_723_000, '1:02:03'],
    [-5, '0:00'],
  ])('%i ms → %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });
});

describe('elapsedMs', () => {
  it('adds the running span to closed spans', () => {
    expect(elapsedMs(10_000, 1_000, 4_000)).toBe(13_000);
  });
  it('freezes while paused or interrupted', () => {
    expect(elapsedMs(10_000, null, 99_000)).toBe(10_000);
  });
  it('never goes negative on clock jumps', () => {
    expect(elapsedMs(0, 5_000, 1_000)).toBe(0);
  });
});

it('formats a recording date without locale data', () => {
  const local = new Date(2026, 9, 21, 9, 5);
  expect(formatRecordingDate(local.toISOString())).toBe('2026-10-21 09:05');
});
