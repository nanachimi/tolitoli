import { SIMULATED_TICK_MS, SimulatedPlaybackEngine } from '../simulated';

describe('SimulatedPlaybackEngine', () => {
  let clock = 0;
  const now = () => clock;

  beforeEach(() => {
    jest.useFakeTimers();
    clock = 0;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function advance(ms: number) {
    clock += ms;
    jest.advanceTimersByTime(ms);
  }

  it('starts paused at zero', () => {
    const engine = new SimulatedPlaybackEngine({ durationMs: 60_000, rate: 1, now });
    expect(engine.status()).toEqual({ positionMs: 0, durationMs: 60_000, playing: false, rate: 1 });
  });

  it('moves the position while playing and keeps it on pause', () => {
    const engine = new SimulatedPlaybackEngine({ durationMs: 60_000, rate: 1, now });
    engine.play();
    advance(4 * SIMULATED_TICK_MS);
    expect(engine.status().positionMs).toBe(1000);
    engine.pause();
    advance(5000);
    expect(engine.status()).toMatchObject({ positionMs: 1000, playing: false });
  });

  it('plays faster at 2× and counts the time before a rate change at the old rate', () => {
    const engine = new SimulatedPlaybackEngine({ durationMs: 60_000, rate: 1, now });
    engine.play();
    advance(1000);
    engine.setRate(2);
    advance(1000);
    expect(engine.status().positionMs).toBe(3000);
  });

  it('seeks within the recording, also while playing', () => {
    const engine = new SimulatedPlaybackEngine({ durationMs: 60_000, rate: 1, now });
    engine.seek(-5000);
    expect(engine.status().positionMs).toBe(0);
    engine.seek(90_000);
    expect(engine.status().positionMs).toBe(60_000);
    engine.seek(10_000);
    engine.play();
    advance(1000);
    expect(engine.status().positionMs).toBe(11_000);
  });

  it('stops at the end, and plays again from the start', () => {
    const engine = new SimulatedPlaybackEngine({ durationMs: 1000, rate: 1, now });
    engine.play();
    advance(2000);
    expect(engine.status()).toMatchObject({ positionMs: 1000, playing: false });
    engine.play();
    expect(engine.status().positionMs).toBe(0);
  });

  it('notifies listeners with a stable snapshot, and stops after release', () => {
    const engine = new SimulatedPlaybackEngine({ durationMs: 60_000, rate: 1, now });
    const listener = jest.fn();
    engine.subscribe(listener);
    expect(engine.status()).toBe(engine.status());
    engine.play();
    expect(listener).toHaveBeenCalledTimes(1);
    engine.release();
    advance(1000);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
