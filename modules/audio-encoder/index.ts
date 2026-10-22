import { requireNativeModule } from 'expo-modules-core';

type AudioEncoderNativeModule = {
  /** Encodes 16-bit PCM WAV files, in order, into one AAC `.m4a`; resolves to the duration in ms. */
  encodeToM4a(inputs: string[], output: string, bitRate: number): Promise<number>;
};

/** Local Expo module (D-021): MediaCodec + MediaMuxer on Android, AVAudioFile on iOS. */
export const AudioEncoder = requireNativeModule<AudioEncoderNativeModule>('AudioEncoder');
