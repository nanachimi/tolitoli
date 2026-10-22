import {
  DIGITAL_SILENCE_PEAK,
  MIC_SILENCE_ALERT_MS,
  isMicSilent,
  nextSilentMs,
  peak,
} from '../micSilence';

/** Quietest buffer measured in a real room on the Galaxy A05: about −73 dBFS RMS. */
const QUIET_ROOM_PEAK = 20 / 32768;

describe('microphone silence safety net', () => {
  it('takes the largest absolute sample as peak', () => {
    expect(peak([0.1, -0.4, 0.2])).toBeCloseTo(0.4);
    expect(peak([])).toBe(0);
  });

  it('warns after 500 ms of zeros or ±1 LSB, as Android feeds during a call', () => {
    let silent = 0;
    for (let i = 0; i < 4; i += 1) silent = nextSilentMs(silent, 1 / 32768, 100);
    expect(isMicSilent(silent)).toBe(false);
    silent = nextSilentMs(silent, 0, 100);
    expect(silent).toBe(MIC_SILENCE_ALERT_MS);
    expect(isMicSilent(silent)).toBe(true);
  });

  it('never fires on a quiet room, and clears as soon as sound comes back', () => {
    expect(QUIET_ROOM_PEAK).toBeGreaterThan(DIGITAL_SILENCE_PEAK);
    expect(nextSilentMs(10_000, QUIET_ROOM_PEAK, 100)).toBe(0);
  });
});
