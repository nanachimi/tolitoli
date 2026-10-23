import { createAudioPlayer, type AudioPlayer, type AudioStatus } from 'expo-audio';

import type { PlaybackEngine, PlaybackStatus } from '@/services/playback';

/** Often enough for the active segment to follow the voice (guide TranscriptSegment). */
export const STATUS_INTERVAL_MS = 100;

/** expo-audio behind the PlaybackEngine of step 1c: only createEngine had to change. */
export class ExpoAudioPlaybackEngine implements PlaybackEngine {
  private readonly player: AudioPlayer;
  private readonly subscription: { remove: () => void };
  private readonly listeners = new Set<() => void>();
  private snapshot: PlaybackStatus;

  constructor(uri: string, durationMs: number, rate: number) {
    this.player = createAudioPlayer({ uri }, { updateInterval: STATUS_INTERVAL_MS });
    this.player.setPlaybackRate(rate);
    this.snapshot = { positionMs: 0, durationMs, playing: false, rate };
    this.subscription = this.player.addListener('playbackStatusUpdate', (status) =>
      this.onStatus(status),
    );
  }

  status(): PlaybackStatus {
    return this.snapshot;
  }

  play(): void {
    // Played to the end: start again from the beginning, as the simulated clock does.
    if (this.snapshot.positionMs >= this.snapshot.durationMs) this.seek(0);
    this.player.play();
    this.update({ playing: true });
  }

  pause(): void {
    this.player.pause();
    this.update({ playing: false });
  }

  seek(positionMs: number): void {
    const target = Math.min(this.snapshot.durationMs, Math.max(0, positionMs));
    void this.player.seekTo(target / 1000);
    this.update({ positionMs: target });
  }

  setRate(rate: number): void {
    this.player.setPlaybackRate(rate);
    this.update({ rate });
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  release(): void {
    this.subscription.remove();
    this.player.remove();
    this.listeners.clear();
  }

  private onStatus(status: AudioStatus): void {
    const durationMs =
      status.duration > 0 ? Math.round(status.duration * 1000) : this.snapshot.durationMs;
    if (status.didJustFinish) {
      this.update({ durationMs, positionMs: durationMs, playing: false });
      return;
    }
    this.update({
      durationMs,
      positionMs: Math.round(status.currentTime * 1000),
      playing: status.playing,
    });
  }

  private update(change: Partial<PlaybackStatus>): void {
    this.snapshot = { ...this.snapshot, ...change };
    this.listeners.forEach((listener) => listener());
  }
}
