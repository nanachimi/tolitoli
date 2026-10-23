import type { SpeechSpan } from './engine';

/**
 * Cutting a recording for Whisper (step 3). executorch 0.10 returns plain text, without
 * timestamps: each stretch of speech found by the VAD becomes a segment of its own, with its
 * own bounds. The audio advances by windows; a window never ends inside a segment.
 */

/** Audio decoded at a time: 60 s of Float32 at 16 kHz is 3.8 MB. */
export const WINDOW_MS = 60_000;
/** Whisper takes 29 s at most and 128 tokens per call: 15 s keeps dense speech whole. */
export const MAX_SEGMENT_MS = 15_000;
/** Pauses shorter than this stay inside one segment. */
export const MERGE_GAP_MS = 500;
/** Context kept around speech: the VAD cuts close to the first and last sounds. */
export const PAD_MS = 150;
/** Speech this close to the end of a window may go on in the next one. */
const EDGE_MS = 300;

export type WindowPlan = {
  /** Segments to transcribe, in ms from the start of the recording, in order. */
  segments: SpeechSpan[];
  /** Where the next window starts: after the last segment of this one, or its end. */
  nextCursorMs: number;
};

/**
 * Segments of the window [startMs, endMs), from the VAD spans of that window (absolute ms).
 * `last` says the window reaches the end of the file: nothing can continue after it.
 */
export function planWindow(
  spans: readonly SpeechSpan[],
  startMs: number,
  endMs: number,
  last: boolean,
): WindowPlan {
  const merged = mergeSpans(
    spans
      .map((span) => ({
        startMs: Math.max(startMs, span.startMs - PAD_MS),
        endMs: Math.min(endMs, span.endMs + PAD_MS),
      }))
      .filter((span) => span.endMs > span.startMs)
      .sort((a, b) => a.startMs - b.startMs),
  );
  if (last) return { segments: merged.flatMap(split), nextCursorMs: endMs };

  // Speech running into the end of the window is left for the next one, which starts with it…
  const open = merged.length > 0 && merged[merged.length - 1]!.endMs >= endMs - EDGE_MS;
  if (!open) return { segments: merged.flatMap(split), nextCursorMs: endMs };
  const tail = merged[merged.length - 1]!;
  const closed = merged.slice(0, -1);
  if (closed.length > 0 || tail.startMs > startMs) {
    return { segments: closed.flatMap(split), nextCursorMs: tail.startMs };
  }
  // …unless it fills the whole window: then its full pieces are taken, and the rest waits.
  const pieces = split(tail);
  const full = pieces.length > 1 ? pieces.slice(0, -1) : pieces;
  return { segments: full, nextCursorMs: full[full.length - 1]!.endMs };
}

function mergeSpans(spans: SpeechSpan[]): SpeechSpan[] {
  const merged: SpeechSpan[] = [];
  for (const span of spans) {
    const previous = merged[merged.length - 1];
    if (previous && span.startMs - previous.endMs < MERGE_GAP_MS) {
      previous.endMs = Math.max(previous.endMs, span.endMs);
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}

/** Equal pieces of MAX_SEGMENT_MS at most. */
function split(span: SpeechSpan): SpeechSpan[] {
  const length = span.endMs - span.startMs;
  const count = Math.max(1, Math.ceil(length / MAX_SEGMENT_MS));
  const size = length / count;
  return Array.from({ length: count }, (_, i) => ({
    startMs: Math.round(span.startMs + i * size),
    endMs: i === count - 1 ? span.endMs : Math.round(span.startMs + (i + 1) * size),
  }));
}
