import { settingsStorage as Storage } from '@/features/settings/storage';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { SimulatedPlaybackEngine, type PlaybackEngine } from '@/services/playback';
import { PLAYBACK_RATES } from '@/ui';

/** The chosen rate is kept between playbacks (guide Player). */
export const PLAYBACK_RATE_STORAGE_KEY = 'player.rate';

export function storedRate(): number {
  const rate = Number(Storage.getItemSync(PLAYBACK_RATE_STORAGE_KEY));
  return (PLAYBACK_RATES as readonly number[]).includes(rate) ? rate : 1;
}

/** Simulated until the next native build adds expo-audio (docs/plans/step-1c.md). */
function createEngine(durationMs: number): PlaybackEngine {
  return new SimulatedPlaybackEngine({ durationMs, rate: storedRate() });
}

/** One engine per recording, released when the screen goes. */
export function usePlayback(durationMs: number) {
  const [engine] = useState(() => createEngine(durationMs));
  useEffect(() => () => engine.release(), [engine]);
  const status = useSyncExternalStore(
    (listener) => engine.subscribe(listener),
    () => engine.status(),
  );
  return {
    status,
    togglePlay: () => (status.playing ? engine.pause() : engine.play()),
    seek: (positionMs: number) => engine.seek(positionMs),
    skip: (deltaMs: number) => engine.seek(engine.status().positionMs + deltaMs),
    setRate: (rate: number) => {
      Storage.setItemSync(PLAYBACK_RATE_STORAGE_KEY, String(rate));
      engine.setRate(rate);
    },
  };
}
