import {
  createFsmnVoiceActivityDetector,
  createWhisperSpeechToText,
  download,
  models,
  setTelemetryEnabled,
  WHISPER_LANGUAGES,
  type FsmnVoiceActivityDetector,
  type WhisperLanguage,
  type WhisperSpeechToText,
} from 'react-native-executorch';

import type {
  SpeechDetector,
  SpeechSpan,
  TranscriptionEngine,
} from '@/services/transcription/engine';
import type { TranscriptionLanguageCode } from '@/services/transcription/languages';
import type { ModelPaths } from '@/services/whisper/download';

/**
 * react-native-executorch, main API only: its legacy API pulls in react-native-device-info
 * (D-036). Its download telemetry is on by default: a POST to ai.swmansion.com for every
 * download. Off here, at import, before anything can download (owner, step 3).
 */
setTelemetryEnabled(false);

/** Downloads the URLs, resuming partial files (blob-util, HTTP Range); local paths, in order. */
export async function fetchModelFiles(
  urls: string[],
  options: { onProgress: (progress: number) => void; signal: AbortSignal },
): Promise<string[]> {
  setTelemetryEnabled(false);
  return download(urls, options);
}

function whisperLanguage(code: TranscriptionLanguageCode): WhisperLanguage {
  if (!(WHISPER_LANGUAGES as readonly string[]).includes(code)) {
    throw new Error(`Whisper does not know ${code}`);
  }
  return code as WhisperLanguage;
}

/** Whisper on the device (XNNPACK), the first TranscriptionEngine. */
export class WhisperLocal implements TranscriptionEngine {
  private constructor(private readonly whisper: WhisperSpeechToText) {}

  static async load(paths: ModelPaths): Promise<WhisperLocal> {
    const whisper = await createWhisperSpeechToText({
      modelPath: paths.whisper,
      tokenizerPath: paths.tokenizer,
      supportedLanguages: WHISPER_LANGUAGES,
      vadModel: { ...models.voiceActivityDetection.FSMN_VAD.XNNPACK_FP32, modelPath: paths.vad },
    });
    return new WhisperLocal(whisper);
  }

  transcribe(pcm: Float32Array, language: TranscriptionLanguageCode): Promise<string> {
    return this.whisper.transcribe(pcm, { language: whisperLanguage(language) });
  }

  stop(): void {
    this.whisper.transcribeStop();
  }

  dispose(): void {
    this.whisper.dispose();
  }
}

/** FSMN voice activity detection: where the speech is, to cut segments (segmenter.ts). */
export class FsmnDetector implements SpeechDetector {
  private constructor(private readonly vad: FsmnVoiceActivityDetector) {}

  static async load(paths: ModelPaths): Promise<FsmnDetector> {
    const vad = await createFsmnVoiceActivityDetector({
      ...models.voiceActivityDetection.FSMN_VAD.XNNPACK_FP32,
      modelPath: paths.vad,
    });
    return new FsmnDetector(vad);
  }

  async detect(pcm: Float32Array): Promise<SpeechSpan[]> {
    const found = await this.vad.detectVoice(pcm);
    return found.map((span) => ({ startMs: span.start * 1000, endMs: span.end * 1000 }));
  }

  dispose(): void {
    this.vad.dispose();
  }
}
