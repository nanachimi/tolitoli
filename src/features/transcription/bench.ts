import { File } from 'expo-file-system';
import * as Network from 'expo-network';

import { AudioEncoder } from '../../../modules/audio-encoder';
import { library } from '@/features/library/library';
import { recordingsRoot } from '@/features/recording/expoFs';
import { settingsStorage as Storage } from '@/features/settings/storage';
import { joinPath } from '@/services/audio/fs';
import { msToSamples, samplesToMs } from '@/services/transcription/engine';
import { isTranscriptionLanguageCode } from '@/services/transcription/languages';
import { planWindow, WINDOW_MS } from '@/services/transcription/segmenter';
import { ModelDownloader, type ModelPaths } from '@/services/whisper/download';
import { isLocalModelId, type LocalModelId } from '@/services/whisper/models';

import { randomUUID } from 'expo-crypto';

import { nativeAudioFiles } from '@/features/recording/nativeAudioFiles';

import { FsmnDetector, fetchModelFiles, WhisperLocal } from './executorch';
import { readyModel } from './model';
import { holdTranscriptionService, transcribeRecording, transcriptionQueue } from './transcription';

/**
 * Development and preview-trace only (docs/plans/step-3.md, « Banc »): the uncertain points of
 * step 3, measured on the device on the longest recording of the library. Nothing is written
 * to the library; transcripts are counted, never logged (they are someone's conversation).
 */

export type BenchKind =
  | 'decode'
  | 'vad'
  | 'tiny'
  | 'base'
  | 'import'
  // whisper.cpp (whisper.rn), quantised: the one-day experiment of 24 October (D-037, Reprise).
  | 'cpp-tiny-q5_1'
  | 'cpp-tiny-q8_0'
  | 'cpp-base-q5_1'
  | 'cpp-base-q8_0';

const log = (...args: unknown[]) => console.log('[bench]', ...args);

/** Title of the imported bench recording: speech read by a synthetic voice (speed only). */
const BENCH_TITLE = 'Banc : Les Misérables (synthèse vocale)';

function plainPath(uri: string): string {
  return decodeURI(uri.replace(/^file:\/\//, ''));
}

/** The imported bench recording when there is one (speech), else the longest recording. */
async function target() {
  const real = library.list().filter((entry) => entry.audioPath && !entry.demo);
  const item =
    real.find((entry) => entry.title === BENCH_TITLE) ??
    real.sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))[0];
  if (!item?.audioPath) throw new Error('No recording to measure');
  const path = plainPath(joinPath(recordingsRoot(), item.audioPath));
  // An imported file may have no length in the library: the container says it.
  const durationMs =
    item.durationMs ??
    (typeof AudioEncoder.probeDurationMs === 'function'
      ? await AudioEncoder.probeDurationMs(path)
      : null);
  if (!durationMs) throw new Error(`No length for ${item.id}`);
  return {
    id: item.id,
    isBench: item.title === BENCH_TITLE,
    path,
    durationMs,
    language: isTranscriptionLanguageCode(item.language) ? item.language : 'fr',
  };
}

async function read(path: string, startMs: number): Promise<Float32Array> {
  const bytes = await AudioEncoder.decodePcm(path, startMs, WINDOW_MS);
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
}

const minutes = (ms: number) => (ms / 60_000).toFixed(1);

/** The base model, for the bench only: the app downloads one model, the owner chooses it. */
function benchDownloader(model: LocalModelId): ModelDownloader {
  const key = `bench.model.${model}`;
  const fileOf = (path: string) => new File(path.startsWith('file://') ? path : `file://${path}`);
  return new ModelDownloader(
    {
      fetch: fetchModelFiles,
      sha256: (path) => fileOf(path).digest('SHA-256'),
      size: (path) => (fileOf(path).exists ? fileOf(path).size : null),
      remove: (path) => fileOf(path).delete(),
      network: {
        isWifi: async () =>
          (await Network.getNetworkStateAsync()).type === Network.NetworkStateType.WIFI,
        onChange: () => () => {},
      },
      saved: {
        load: () => {
          const value = JSON.parse(Storage.getItemSync(key) ?? 'null') as {
            model: string;
            paths: ModelPaths;
          } | null;
          return value && isLocalModelId(value.model)
            ? { model: value.model, paths: value.paths }
            : null;
        },
        save: (value) =>
          value ? Storage.setItemSync(key, JSON.stringify(value)) : Storage.removeItemSync(key),
      },
      onState: (state) => log('model', model, state.status, Math.round(state.progress * 100)),
      log,
    },
    model,
  );
}

async function modelPaths(model: LocalModelId): Promise<ModelPaths> {
  const ready = readyModel();
  if (ready?.id === model) return ready.paths;
  const downloader = benchDownloader(model);
  if (downloader.restore().status !== 'ready') await downloader.start();
  const { status, paths } = downloader.current;
  if (status !== 'ready' || !paths) throw new Error(`Model ${model}: ${status}`);
  return paths;
}

/**
 * The bench file pushed by adb next to the model files (`…/files/bench.m4a`, the app's external
 * files directory, writable by adb even for a release build), copied into the library as a
 * recording and queued in French: the real queue then transcribes it, foreground service and
 * screen off included. No microphone involved (D-036).
 */
async function importBenchRecording(): Promise<string> {
  const ready = readyModel();
  if (!ready) throw new Error('No model: the bench file sits next to it');
  const filesDir = ready.paths.whisper.replace(/\/react-native-executorch\/[^/]+$/, '');
  const source = new File(`file://${filesDir}/bench.m4a`);
  if (!source.exists) throw new Error(`No bench file at ${source.uri}`);
  const id = randomUUID();
  const audioPath = `${id}.m4a`;
  const target = new File(joinPath(recordingsRoot(), audioPath));
  source.copy(target);
  const durationMs =
    typeof AudioEncoder.probeDurationMs === 'function'
      ? await AudioEncoder.probeDurationMs(plainPath(target.uri))
      : await nativeAudioFiles.probeDurationMs(target.uri);
  library.createRecording({ id, createdAt: new Date().toISOString() });
  library.finalizeRecording(id, {
    audioPath,
    audioSize: target.size,
    audioFormat: 'm4a',
    durationMs,
    recovered: false,
  });
  library.rename(id, BENCH_TITLE);
  transcribeRecording(id, 'fr');
  const report = `imported ${id}, ${minutes(durationMs ?? 0)} min, queued in French`;
  log(report);
  return report;
}

/** The little of whisper.rn the experiment uses (its own sources fail our type check). */
type WhisperCpp = {
  initWhisper(options: { filePath: string; useGpu?: boolean }): Promise<{
    transcribeData(
      data: ArrayBuffer,
      options: { language?: string; maxThreads?: number },
    ): { promise: Promise<{ result: string; segments: { t0: number; t1: number }[] }> };
    release(): Promise<void>;
  }>;
};

function whisperCpp(): WhisperCpp {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded only by this bench; whisper.rn exports `./*` only, hence the index by name
  return require('whisper.rn/index') as WhisperCpp;
}

/** The app's external files directory, where adb puts the bench file and the ggml models. */
function externalFilesDir(): string {
  const ready = readyModel();
  if (!ready) throw new Error('No executorch model: the external files directory is found from it');
  return ready.paths.whisper.replace(/\/react-native-executorch\/[^/]+$/, '');
}

/**
 * whisper.cpp on the same audio as executorch: the first minutes of the bench recording,
 * decoded by the same decoder, in one buffer; whisper.cpp cuts it in 30 s windows itself.
 * The text excerpt is public-domain synthetic speech: an indication, never a quality figure.
 */
async function runWhisperCpp(model: string, limitMinutes: number): Promise<string> {
  const job = await target();
  const endMs = Math.min(job.durationMs, limitMinutes * 60_000);
  const modelPath = `${externalFilesDir()}/ggml-${model}.bin`;
  log('start', `cpp-${model}`, job.id, `${minutes(endMs)} min`, job.language);

  let t = Date.now();
  const parts: Float32Array[] = [];
  let samples = 0;
  for (let at = 0; at < endMs; at += WINDOW_MS) {
    const pcm = await read(job.path, at);
    const keep = pcm.subarray(0, Math.min(pcm.length, msToSamples(endMs - at)));
    parts.push(keep);
    samples += keep.length;
    if (pcm.length < msToSamples(WINDOW_MS)) break;
  }
  const audio = new Float32Array(samples);
  let offset = 0;
  for (const part of parts) {
    audio.set(part, offset);
    offset += part.length;
  }
  const decodeMs = Date.now() - t;

  t = Date.now();
  const context = await whisperCpp().initWhisper({ filePath: modelPath, useGpu: false });
  const loadMs = Date.now() - t;
  try {
    t = Date.now();
    const { promise } = context.transcribeData(audio.buffer, {
      language: job.language,
      maxThreads: 4,
    });
    const result = await promise;
    const sttMs = Date.now() - t;
    const total = decodeMs + sttMs;
    const excerpt = result.result.trim().replace(/\s+/g, ' ').slice(0, 300);
    const report =
      `cpp-${model} on ${minutes(endMs)} min (${job.language}): Whisper ${(sttMs / 1000).toFixed(0)} s, ` +
      `decode ${(decodeMs / 1000).toFixed(0)} s, load ${(loadMs / 1000).toFixed(1)} s; ` +
      `${result.segments.length} segments, ${result.result.length} characters; ` +
      `1 h would take about ${((total / endMs) * 60).toFixed(1)} min`;
    log(report);
    log('excerpt', `cpp-${model}`, excerpt);
    return `${report}\n${excerpt}`;
  } finally {
    await context.release();
  }
}

/**
 * Runs one measurement; the report is shown on screen and logged for logcat. The queue stops
 * meanwhile (a transcription under way is suspended with its cursor): two engines at once
 * would measure neither. The foreground service and its wake lock are held as the queue holds
 * them, so that a run screen off on battery is measured as the reference was.
 */
export async function runBench(kind: BenchKind, limitMinutes?: number): Promise<string> {
  if (kind === 'import') return importBenchRecording();
  transcriptionQueue.stop();
  await transcriptionQueue.idle();
  await holdTranscriptionService(true);
  try {
    return kind.startsWith('cpp-')
      ? await runWhisperCpp(kind.slice(4), limitMinutes ?? 10)
      : await measure(kind, limitMinutes);
  } finally {
    await holdTranscriptionService(false);
    transcriptionQueue.start();
  }
}

async function measure(kind: BenchKind, limitMinutes?: number): Promise<string> {
  const job = await target();
  const endMs = limitMinutes ? Math.min(job.durationMs, limitMinutes * 60_000) : job.durationMs;
  log('start', kind, job.id, `${minutes(endMs)} of ${minutes(job.durationMs)} min`, job.language);

  if (kind === 'decode') {
    const t0 = Date.now();
    let samples = 0;
    for (let at = 0; at < endMs; at += WINDOW_MS) samples += (await read(job.path, at)).length;
    const elapsed = Date.now() - t0;
    const report =
      `decode ${minutes(endMs)} min in ${(elapsed / 1000).toFixed(1)} s ` +
      `(${(endMs / elapsed).toFixed(0)}x real time); ${samples} samples = ` +
      `${(samplesToMs(samples) / 1000).toFixed(2)} s for ${(endMs / 1000).toFixed(2)} s expected`;
    log(report);
    return report;
  }

  const paths = await modelPaths(kind === 'base' ? 'base' : (readyModel()?.id ?? 'tiny'));
  const vad = await FsmnDetector.load(paths);
  const whisper = kind === 'vad' ? null : await WhisperLocal.load(paths);
  let decodeMs = 0;
  let vadMs = 0;
  let sttMs = 0;
  let speechMs = 0;
  let segments = 0;
  let empty = 0;
  let characters = 0;
  // Public-domain synthetic speech only: the bench recording, never someone's conversation.
  let excerpt = '';
  try {
    for (let cursor = 0; cursor < endMs;) {
      let t = Date.now();
      const pcm = await read(job.path, cursor);
      decodeMs += Date.now() - t;
      const windowEnd = cursor + samplesToMs(pcm.length);
      const last = pcm.length < msToSamples(WINDOW_MS) || windowEnd >= endMs;
      t = Date.now();
      const spans = (await vad.detect(pcm)).map((span) => ({
        startMs: cursor + span.startMs,
        endMs: cursor + span.endMs,
      }));
      vadMs += Date.now() - t;
      const plan = planWindow(spans, cursor, windowEnd, last);
      for (const segment of plan.segments) {
        speechMs += segment.endMs - segment.startMs;
        segments += 1;
        if (!whisper) continue;
        t = Date.now();
        const text = (
          await whisper.transcribe(
            pcm.subarray(
              msToSamples(segment.startMs - cursor),
              msToSamples(segment.endMs - cursor),
            ),
            job.language,
          )
        ).trim();
        sttMs += Date.now() - t;
        if (text) characters += text.length;
        else empty += 1;
        if (job.isBench && excerpt.length < 300)
          excerpt = `${excerpt} ${text}`.trim().slice(0, 300);
      }
      if (segments % 20 === 0) log('progress', minutes(plan.nextCursorMs), 'min');
      if (last) break;
      cursor = plan.nextCursorMs;
    }
  } finally {
    whisper?.dispose();
    vad.dispose();
  }
  const total = decodeMs + vadMs + sttMs;
  const report =
    `${kind} on ${minutes(endMs)} min (${job.language}): total ${(total / 60_000).toFixed(1)} min ` +
    `(${(endMs / total).toFixed(2)}x real time); decode ${(decodeMs / 1000).toFixed(0)} s, ` +
    `VAD ${(vadMs / 1000).toFixed(0)} s, Whisper ${(sttMs / 1000).toFixed(0)} s; ` +
    `speech ${minutes(speechMs)} min in ${segments} segments, ${empty} empty, ${characters} characters; ` +
    `1 h would take about ${((total / endMs) * 60).toFixed(0)} min`;
  log(report);
  if (excerpt) log('excerpt', kind, excerpt);
  return excerpt ? `${report}\n${excerpt}` : report;
}
