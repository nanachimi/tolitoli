import type { PlaybackEngine, PlaybackStatus } from './types';

/** How often the simulated clock moves the position while playing. */
export const SIMULATED_TICK_MS = 250;

export type SimulatedPlaybackOptions = {
  durationMs: number;
  rate: number;
  now?: () => number;
};

/** A clock that plays nothing: position, pause, seek and rate, for the interface only. */
export class SimulatedPlaybackEngine implements PlaybackEngine {
  private positionMs = 0;
  private rate: number;
  /** Clock time at which the current play run started, null when paused. */
  private startedAt: number | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly listeners = new Set<() => void>();
  private readonly now: () => number;
  private snapshot: PlaybackStatus;

  constructor(private readonly options: SimulatedPlaybackOptions) {
    this.rate = options.rate;
    this.now = options.now ?? Date.now;
    this.snapshot = this.compute();
  }

  /** Same object until something changes, as useSyncExternalStore expects. */
  status(): PlaybackStatus {
    return this.snapshot;
  }

  play(): void {
    if (this.startedAt !== null) return;
    if (this.positionMs >= this.options.durationMs) this.positionMs = 0;
    this.startedAt = this.now();
    this.timer = setInterval(() => this.tick(), SIMULATED_TICK_MS);
    this.emit();
  }

  pause(): void {
    if (this.startedAt === null) return;
    this.positionMs = this.currentPosition();
    this.stopClock();
    this.emit();
  }

  seek(positionMs: number): void {
    this.positionMs = clamp(positionMs, 0, this.options.durationMs);
    if (this.startedAt !== null) this.startedAt = this.now();
    this.emit();
  }

  setRate(rate: number): void {
    // The position so far was played at the old rate.
    if (this.startedAt !== null) {
      this.positionMs = this.currentPosition();
      this.startedAt = this.now();
    }
    this.rate = rate;
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  release(): void {
    this.stopClock();
    this.listeners.clear();
  }

  private tick(): void {
    if (this.currentPosition() >= this.options.durationMs) {
      this.positionMs = this.options.durationMs;
      this.stopClock();
    }
    this.emit();
  }

  private currentPosition(): number {
    if (this.startedAt === null) return this.positionMs;
    const elapsed = (this.now() - this.startedAt) * this.rate;
    return clamp(this.positionMs + elapsed, 0, this.options.durationMs);
  }

  private stopClock(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.startedAt = null;
  }

  private compute(): PlaybackStatus {
    return {
      positionMs: Math.round(this.currentPosition()),
      durationMs: this.options.durationMs,
      playing: this.startedAt !== null,
      rate: this.rate,
    };
  }

  private emit(): void {
    this.snapshot = this.compute();
    this.listeners.forEach((listener) => listener());
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
