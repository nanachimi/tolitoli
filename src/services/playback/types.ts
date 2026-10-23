export type PlaybackStatus = {
  positionMs: number;
  durationMs: number;
  playing: boolean;
  rate: number;
};

/**
 * What the Detail screen's player drives. Step 1c simulates it (no audio module in the
 * dev client); the next native build brings expo-audio behind this same interface.
 */
export interface PlaybackEngine {
  status(): PlaybackStatus;
  play(): void;
  pause(): void;
  seek(positionMs: number): void;
  setRate(rate: number): void;
  subscribe(listener: () => void): () => void;
  release(): void;
}
