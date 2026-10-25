import { processColor } from 'react-native';

import { AudioEncoder } from '../../../modules/audio-encoder';
import { getLibrary, isDemoDataEnabled, library } from '@/features/library/library';
import { recordingsRoot } from '@/features/recording/expoFs';
import { useRecordingStore } from '@/features/recording/useRecordingStore';
import { useTranscriptionLanguage } from '@/features/settings/transcriptionLanguage';
import { i18next } from '@/i18n';
import { joinPath } from '@/services/audio/fs';
import type { RecorderStatus } from '@/services/audio/recorderMachine';
import type { PcmSource } from '@/services/transcription/engine';
import {
  localQualityFor,
  type TranscriptionLanguageCode,
} from '@/services/transcription/languages';
import { TranscriptionQueue, type TranscriptionStore } from '@/services/transcription/queue';
import { routeTranscription } from '@/services/transcription/routing';
import { isLocalModelId } from '@/services/whisper/models';
import { color } from '@/ui/theme/tokens';

import { FsmnDetector, WhisperLocal } from './executorch';
import { createServiceSwitch } from './serviceSwitch';
import { readyModel, selectedModel, useModel } from './model';

function log(...args: unknown[]): void {
  console.log('[transcription]', ...args);
}

/** The recorder holds the device from `preparing` to `stopping`: no transcription then. */
const RECORDER_BUSY: readonly RecorderStatus[] = [
  'preparing',
  'recording',
  'paused',
  'interrupted',
  'stopping',
];

/** What native decoders take: a path, not a `file://` URI (as nativeAudioFiles.ts does). */
function plainPath(uri: string): string {
  return decodeURI(uri.replace(/^file:\/\//, ''));
}

function recorderBusy(): boolean {
  return RECORDER_BUSY.includes(useRecordingStore.getState().status);
}

/** For the screens: a waiting transcription is paused while a recording runs. */
export function useRecorderBusy(): boolean {
  return useRecordingStore((state) => RECORDER_BUSY.includes(state.status));
}

/** Float32 16 kHz mono from the native decoder (modules/audio-encoder, step 3). */
const pcm: PcmSource = {
  async read(path, startMs, durationMs) {
    const bytes = await AudioEncoder.decodePcm(path, startMs, durationMs);
    const aligned = bytes.byteOffset % 4 === 0 ? bytes : bytes.slice();
    return new Float32Array(aligned.buffer, aligned.byteOffset, aligned.byteLength / 4);
  },
};

/** Whisper and the VAD, loaded on first use and kept while the app runs. */
class LocalModels {
  private loaded: { key: string; whisper: WhisperLocal; vad: FsmnDetector } | null = null;
  private loading: Promise<{ whisper: WhisperLocal; vad: FsmnDetector }> | null = null;

  async get(): Promise<{ whisper: WhisperLocal; vad: FsmnDetector }> {
    const ready = readyModel();
    if (!ready) throw new Error('No local model');
    const key = ready.paths.whisper;
    if (this.loaded?.key === key) return this.loaded;
    this.loading ??= (async () => {
      this.dispose();
      const [whisper, vad] = await Promise.all([
        WhisperLocal.load(ready.paths),
        FsmnDetector.load(ready.paths),
      ]);
      this.loaded = { key, whisper, vad };
      return this.loaded;
    })().finally(() => {
      this.loading = null;
    });
    return this.loading;
  }

  stop(): void {
    this.loaded?.whisper.stop();
  }

  dispose(): void {
    this.loaded?.whisper.dispose();
    this.loaded?.vad.dispose();
    this.loaded = null;
  }
}

const models = new LocalModels();

/** The bench measures each engine alone: the queue's models leave memory first. */
export function releaseLocalModels(): void {
  models.dispose();
}

/** The real library only: the development demo database is never transcribed. */
const store: TranscriptionStore = {
  pendingTranscriptions: () => (isDemoDataEnabled() ? [] : library.pendingTranscriptions()),
  transcriptionJob: (id) => library.transcriptionJob(id),
  transcriptionCheckpoint: (id) => library.transcriptionCheckpoint(id),
  startTranscription: (id) => library.startTranscription(id),
  suspendTranscription: (id) => library.suspendTranscription(id),
  saveDraft: (id, segment, cursorMs) => library.saveDraft(id, segment, cursorMs),
  reportTranscriptionProgress: (id, progress) => {
    library.reportTranscriptionProgress(id, progress);
    if (progress !== null) void updateNotification(progress);
  },
  recordDuration: (id, durationMs) => library.recordDuration(id, durationMs),
  completeTranscription: (id, result) => library.completeTranscription(id, result),
  failTranscription: (id, issue) => library.failTranscription(id, issue),
};

// ---- foreground service (Android, owner's answer A) -------------------------------------

const NOTIFICATION_COLOR = processColor(color.light.accent) as number | null;
let lastPercent = -1;

function notificationTexts(progress: number | null) {
  return {
    title: i18next.t('transcription.notification.title'),
    body:
      progress === null
        ? i18next.t('transcription.notification.running')
        : i18next.t('transcription.notification.progress', { percent: Math.floor(progress * 100) }),
    channel: i18next.t('transcription.notification.channel'),
  };
}

const service = createServiceSwitch({
  start: async () => {
    const { title, body, channel } = notificationTexts(null);
    await AudioEncoder.startTranscriptionService(title, body, channel, NOTIFICATION_COLOR);
    lastPercent = -1;
  },
  stop: () => AudioEncoder.stopTranscriptionService(),
  log,
});

/**
 * The bench holds the service and its wake lock while it measures with the queue stopped: the
 * reference figures were taken screen off under it (D-037), and a phone that sleeps mid-run
 * measures nothing.
 */
export function holdTranscriptionService(on: boolean): Promise<void> {
  return service.set(on);
}

async function updateNotification(progress: number): Promise<void> {
  const percent = Math.floor(progress * 100);
  if (!service.running || percent === lastPercent) return;
  lastPercent = percent;
  const { title, body, channel } = notificationTexts(progress);
  await AudioEncoder.updateTranscriptionService(title, body, channel, NOTIFICATION_COLOR).catch(
    () => undefined,
  );
}

// ---- the queue ------------------------------------------------------------------------------

export const transcriptionQueue = new TranscriptionQueue({
  store,
  pcm,
  detector: { detect: async (samples) => (await models.get()).vad.detect(samples) },
  engine: {
    transcribe: async (samples, language) =>
      (await models.get()).whisper.transcribe(samples, language),
    stop: () => models.stop(),
  },
  recorder: {
    isBusy: recorderBusy,
    subscribe: (listener) => {
      let busy = recorderBusy();
      return useRecordingStore.subscribe(() => {
        const now = recorderBusy();
        if (now !== busy) {
          busy = now;
          listener(now);
        }
      });
    },
  },
  readyModel: () => readyModel()?.id ?? null,
  resolveAudio: (audioPath) => plainPath(joinPath(recordingsRoot(), audioPath)),
  // Native since the second build of step 3: an older dev client lacks it.
  ...(typeof AudioEncoder.probeDurationMs === 'function'
    ? { probeDurationMs: (path: string) => AudioEncoder.probeDurationMs(path) }
    : {}),
  qualityFor: (language, model) =>
    isLocalModelId(model) ? localQualityFor(language, model) : null,
  onActivity: (activity) => {
    void service.set(activity === 'running');
    // Nothing left to transcribe: the model leaves memory (544 MB held at rest on the A05, D-037).
    if (activity === 'idle') models.dispose();
  },
  log,
});

/**
 * Transcription of a finished recording, in the chosen language (never a detected one).
 * A language with no engine on the device is not queued: the Detail says it needs the cloud,
 * or that it is not available yet.
 */
export function transcribeRecording(
  id: string,
  language: TranscriptionLanguageCode = useTranscriptionLanguage.getState().code,
): 'queued' | 'cloud-required' | 'not-yet-available' {
  const route = routeTranscription({ language, cloudEnabled: false, online: true });
  if (route.kind !== 'local') {
    library.assignTranscriptionLanguage(id, language);
    return route.kind;
  }
  library.queueTranscription(id, { language, engine: 'local', model: selectedModel() });
  transcriptionQueue.kick();
  return 'queued';
}

/** "Réessayer" after a failure: back in the queue, which runs it when its turn comes. */
export function retryRecordingTranscription(id: string): void {
  library.retryTranscription(id);
  transcriptionQueue.kick();
}

let modelWatch: (() => void) | null = null;

/** Recordings that waited for the model go back to the queue, with what was already done. */
function resumeWaitingForModel(): void {
  const waiting = getLibrary().failedTranscriptions('model-missing');
  waiting.forEach((id) => getLibrary().resumeTranscription(id));
  if (waiting.length > 0) log('model ready, resumed', waiting.join(', '));
}

/** At launch, after the recovery (launch.ts): resumes what was queued or cut while running. */
export function startTranscription(): void {
  // A model already there at launch counts as one that just arrived: nothing stays waiting.
  if (readyModel()) resumeWaitingForModel();
  transcriptionQueue.start();
  modelWatch ??= useModel.subscribe((state, previous) => {
    if (state.status === 'ready' && previous.status !== 'ready') {
      resumeWaitingForModel();
      transcriptionQueue.kick();
    }
  });
}
