import { useEffect, useState } from 'react';

import { elapsedMs } from '@/services/audio/duration';

const TICK_MS = 250;

/** Elapsed recording time, ticking while a span is running. */
export function useElapsed(accumulatedMs: number, runningSince: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (runningSince === null) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [runningSince]);

  return elapsedMs(accumulatedMs, runningSince, now);
}
