import { settingsStorage as Storage } from '@/features/settings/storage';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { SimulatedPlaybackEngine, type PlaybackEngine } from '@/services/playback';
import { PLAYBACK_RATES } from '@/ui';

import { ExpoAudioPlaybackEngine } from './expoAudioEngine';

/** The chosen rate is kept between playbacks (guide Player). */
export const PLAYBACK_RATE_STORAGE_KEY = 'player.rate';

export function storedRate(): number {
  const rate = Number(Storage.getItemSync(PLAYBACK_RATE_STORAGE_KEY));
  return (PLAYBACK_RATES as readonly number[]).includes(rate) ? rate : 1;
}

/**
 * expo-audio for a recording with its file; the simulated clock only for the demo items
 * of a development build, which have no audio (docs/plans/step-2.md).
 */
export function createEngine(durationMs: number, audioUri: string | null): PlaybackEngine {
  if (audioUri) return new ExpoAudioPlaybackEngine(audioUri, durationMs, storedRate());
  return new SimulatedPlaybackEngine({ durationMs, rate: storedRate() });
}

/**
 * One engine per recording, stopped and released when the Detail goes (back gesture
 * included), paused when the app leaves the foreground: the 1.0 has no background playback.
 */
export function usePlayback(durationMs: number, audioUri: string | null) {
  const [engine] = useState(() => createEngine(durationMs, audioUri));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') engine.pause();
    });
    return () => {
      subscription.remove();
      engine.release();
    };
  }, [engine]);
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
