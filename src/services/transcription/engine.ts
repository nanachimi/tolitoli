import type { TranscriptionLanguageCode } from './languages';

/** Sample rate of every PCM buffer handed to an engine: what Whisper expects. */
export const PCM_SAMPLE_RATE = 16_000;

/**
 * One engine behind the routing (CLAUDE.md): WhisperLocal now, DeepgramCloud and SaharaCloud
 * at step 8. It transcribes one segment of speech at a time, the queue cutting the audio.
 */
export interface TranscriptionEngine {
  /** Text of `pcm` (Float32, 16 kHz mono), in the language the user chose, never detected. */
  transcribe(pcm: Float32Array, language: TranscriptionLanguageCode): Promise<string>;
  /**
   * Ends the call under way as soon as possible. It may still resolve, with partial text:
   * the queue discards what a stopped call returns.
   */
  stop(): void;
}

/** A stretch of speech, in ms from the start of the recording. */
export type SpeechSpan = { startMs: number; endMs: number };

/** Voice activity detection on one window; spans in ms from the start of `pcm`. */
export interface SpeechDetector {
  detect(pcm: Float32Array): Promise<SpeechSpan[]>;
}

/** Decoded audio of a recording, one window at a time (modules/audio-encoder). */
export interface PcmSource {
  /** Float32 16 kHz mono of [startMs, startMs + durationMs); shorter at the end of the file. */
  read(path: string, startMs: number, durationMs: number): Promise<Float32Array>;
}

export function msToSamples(ms: number): number {
  return Math.round((ms * PCM_SAMPLE_RATE) / 1000);
}

export function samplesToMs(samples: number): number {
  return (samples * 1000) / PCM_SAMPLE_RATE;
}
