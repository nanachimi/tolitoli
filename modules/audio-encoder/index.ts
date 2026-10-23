import { requireNativeModule, type EventSubscription } from 'expo-modules-core';

type AudioEncoderNativeModule = {
  /** Encodes 16-bit PCM WAV files, in order, into one AAC `.m4a`; resolves to the duration in ms. */
  encodeToM4a(inputs: string[], output: string, bitRate: number): Promise<number>;
  /**
   * Little-endian Float32 PCM, 16 kHz mono, of [startMs, startMs + durationMs) of a `.m4a`
   * or WAV file (step 3); shorter at the end of the file.
   */
  decodePcm(path: string, startMs: number, durationMs: number): Promise<Uint8Array>;
  /** Android `dataSync` foreground service with a partial wake lock; rejects with
   * `ERR_BACKGROUND_START` when the app is in the background. No-op on iOS. */
  startTranscriptionService(
    title: string,
    body: string,
    channelName: string,
    color: number | null,
  ): Promise<void>;
  updateTranscriptionService(
    title: string,
    body: string,
    channelName: string,
    color: number | null,
  ): Promise<void>;
  stopTranscriptionService(): Promise<void>;
  /** Android 15: the `dataSync` budget (6 h per 24 h) is spent and the service stopped. */
  addListener(event: 'onTranscriptionServiceTimeout', listener: () => void): EventSubscription;
};

/**
 * Local Expo module: AAC encoding (D-021), PCM decoding and the transcription foreground
 * service (step 3). MediaCodec on Android, AVAudioFile on iOS.
 */
export const AudioEncoder = requireNativeModule<AudioEncoderNativeModule>('AudioEncoder');
