import { useEffect, useState } from 'react';

/** Order of size of a Whisper model; step 3 picks the real one and downloads it. */
export const SIMULATED_MODEL_BYTES = 233 * 1024 * 1024;
export const SIMULATED_DOWNLOAD_MS = 8000;
const TICK_MS = 200;

/** Fraction downloaded, 0–1, moving on a timer: nothing is fetched in step 1c. */
export function useSimulatedDownload(): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const step = TICK_MS / SIMULATED_DOWNLOAD_MS;
    const timer = setInterval(() => {
      setValue((current) => {
        const next = Math.min(1, current + step);
        if (next >= 1) clearInterval(timer);
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return value;
}
