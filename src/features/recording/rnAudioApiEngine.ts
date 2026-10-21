import { Paths } from 'expo-file-system';
import {
  AudioRecorder,
  BitDepth,
  FileDirectory,
  FileFormat,
  FlacCompressionLevel,
  IOSAudioQuality,
} from 'react-native-audio-api';

import type { RecordingEngine } from '@/services/audio/engine';
import { aacSegmentBytes, type FormatProfile } from '@/services/audio/formatProfile';
import { levelFromSamples } from '@/services/audio/level';

/** Level updates every 100 ms from a 16 kHz mono tap. */
const LEVEL_TAP = { sampleRate: 16_000, bufferLength: 1600, channelCount: 1 };

function baseName(path: string): string {
  return path.split('/').pop() ?? path;
}

/** Directory relative to the documents root, as react-native-audio-api expects it. */
function documentsRelative(dirUri: string): string {
  const root = Paths.document.uri.replace(/\/+$/, '');
  return decodeURI(dirUri.replace(root, '').replace(/^\/+/, ''));
}

/**
 * react-native-audio-api recorder (D-020). Each `open` creates a fresh native
 * recorder, so resuming after an interruption never depends on the previous one.
 */
export class RnAudioApiEngine implements RecordingEngine {
  private recorder: AudioRecorder | null = null;

  constructor(
    private readonly profile: FormatProfile,
    private readonly onLevel: (level: number) => void,
  ) {}

  async open(dir: string, segmentPrefix: string): Promise<void> {
    const recorder = new AudioRecorder();
    const enabled = recorder.enableFileOutput({
      format: this.profile.extension === 'wav' ? FileFormat.Wav : FileFormat.M4A,
      channelCount: this.profile.channels,
      preset: {
        sampleRate: this.profile.sampleRate,
        bitRate: this.profile.bitRate ?? 0,
        bitDepth: BitDepth.Bit16,
        iosQuality: IOSAudioQuality.High,
        flacCompressionLevel: FlacCompressionLevel.L0,
      },
      rotateIntervalBytes:
        this.profile.segmentSeconds && this.profile.bitRate
          ? aacSegmentBytes(this.profile.segmentSeconds, this.profile.bitRate)
          : 0,
      directory: FileDirectory.Document,
      subDirectory: documentsRelative(dir),
      fileNamePrefix: segmentPrefix,
      androidFlushIntervalMs: 200,
    });
    if (enabled.status === 'error') throw new Error(enabled.message);

    recorder.onAudioReady(LEVEL_TAP, (event) => {
      this.onLevel(levelFromSamples(event.buffer.getChannelData(0)));
    });
    const started = await recorder.start();
    if (started.status === 'error') {
      recorder.clearOnAudioReady();
      throw new Error(started.message);
    }
    this.recorder = recorder;
  }

  async close(): Promise<string[]> {
    const recorder = this.recorder;
    this.recorder = null;
    if (!recorder) return [];
    recorder.clearOnAudioReady();
    this.onLevel(0);
    const result = await recorder.stop();
    if (result.status === 'success') return result.paths.map(baseName);
    // Already stopped natively (notification Stop button): use what it finalised.
    const finished = AudioRecorder.consumeLastRecordingResult();
    // Anything else on disk is picked up by assembly, which scans the directory.
    return finished ? finished.paths.map(baseName) : [];
  }

  pause(): void {
    this.recorder?.pause();
    this.onLevel(0);
  }

  resume(): void {
    this.recorder?.resume();
  }
}
