import { MAX_SEGMENT_MS, PAD_MS, planWindow, WINDOW_MS } from '../segmenter';

const span = (startMs: number, endMs: number) => ({ startMs, endMs });

describe('planWindow', () => {
  it('pads each stretch of speech and keeps it whole', () => {
    expect(planWindow([span(1000, 4000), span(10_000, 12_000)], 0, WINDOW_MS, false)).toEqual({
      segments: [span(1000 - PAD_MS, 4000 + PAD_MS), span(10_000 - PAD_MS, 12_000 + PAD_MS)],
      nextCursorMs: WINDOW_MS,
    });
  });

  it('merges short pauses into one segment', () => {
    expect(planWindow([span(1000, 3000), span(3600, 5000)], 0, WINDOW_MS, false).segments).toEqual([
      span(1000 - PAD_MS, 5000 + PAD_MS),
    ]);
  });

  it('splits long speech into equal pieces of 15 s at most', () => {
    const { segments } = planWindow([span(0, 40_000)], 0, WINDOW_MS, false);
    expect(segments).toHaveLength(3);
    expect(segments[0]!.startMs).toBe(0);
    expect(segments[2]!.endMs).toBe(40_000 + PAD_MS);
    for (const segment of segments) {
      expect(segment.endMs - segment.startMs).toBeLessThanOrEqual(MAX_SEGMENT_MS);
    }
    segments.slice(1).forEach((segment, i) => expect(segment.startMs).toBe(segments[i]!.endMs));
  });

  it('leaves speech running into the end of the window for the next one', () => {
    expect(planWindow([span(2000, 5000), span(55_000, WINDOW_MS)], 0, WINDOW_MS, false)).toEqual({
      segments: [span(2000 - PAD_MS, 5000 + PAD_MS)],
      nextCursorMs: 55_000 - PAD_MS,
    });
  });

  it('keeps moving when speech fills the whole window', () => {
    const plan = planWindow([span(60_000, 120_000)], 60_000, 120_000, false);
    expect(plan.segments).toHaveLength(3);
    expect(plan.segments[0]!.startMs).toBe(60_000);
    expect(plan.nextCursorMs).toBe(plan.segments[2]!.endMs);
    expect(plan.nextCursorMs).toBeGreaterThan(60_000);
  });

  it('takes everything in the last window', () => {
    expect(planWindow([span(61_000, 62_500)], 60_000, 62_500, true)).toEqual({
      segments: [span(61_000 - PAD_MS, 62_500)],
      nextCursorMs: 62_500,
    });
  });

  it('moves on over silence', () => {
    expect(planWindow([], 120_000, 180_000, false)).toEqual({
      segments: [],
      nextCursorMs: 180_000,
    });
  });
});
