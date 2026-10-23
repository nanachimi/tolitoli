/**
 * Release-build measurement of playback (owner, step 2): set EXPO_PUBLIC_PLAYBACK_TRACE=1
 * at build time (EAS profile `preview-trace`) and read `[playback-trace]` in logcat.
 * Inert otherwise: the constant is inlined as false and nothing is recorded.
 */
export const PLAYBACK_TRACE = process.env.EXPO_PUBLIC_PLAYBACK_TRACE === '1';

const EVERY = 20;

function summary(values: number[]): string {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
  return `mean ${mean.toFixed(0)} p95 ${p95.toFixed(0)} max ${(sorted.at(-1) ?? 0).toFixed(0)} ms`;
}

let lastEventAt: number | null = null;
let intervals: number[] = [];
let startWall: number | null = null;
let startPosition = 0;
let pendingTap: { kind: string; at: number } | null = null;
let renders: number[] = [];

/** One playbackStatusUpdate, as received by JS. */
export function traceStatus(positionMs: number, playing: boolean): void {
  if (!PLAYBACK_TRACE) return;
  const now = Date.now();
  if (lastEventAt !== null) intervals.push(now - lastEventAt);
  lastEventAt = now;
  if (playing && startWall === null) {
    startWall = now;
    startPosition = positionMs;
  }
  if (
    pendingTap &&
    ((pendingTap.kind === 'pause' && !playing) || (pendingTap.kind === 'play' && playing))
  ) {
    console.log(`[playback-trace] ${pendingTap.kind} took effect after ${now - pendingTap.at} ms`);
    pendingTap = null;
  }
  if (intervals.length >= EVERY) {
    const drift = startWall === null ? 0 : now - startWall - (positionMs - startPosition);
    console.log(
      `[playback-trace] events ${summary(intervals)}; wall − player ${drift} ms at ${positionMs} ms`,
    );
    intervals = [];
  }
  if (!playing) {
    startWall = null;
    lastEventAt = null;
  }
}

/** A tap on play or pause, to time when the player confirms it. */
export function traceTap(kind: 'play' | 'pause'): void {
  if (PLAYBACK_TRACE) pendingTap = { kind, at: Date.now() };
}

/** React Profiler callback of the Detail screen. */
export function traceRender(_id: string, _phase: string, actualDuration: number): void {
  if (!PLAYBACK_TRACE) return;
  renders.push(actualDuration);
  if (renders.length >= EVERY) {
    console.log(`[playback-trace] Detail renders ${summary(renders)}`);
    renders = [];
  }
}
