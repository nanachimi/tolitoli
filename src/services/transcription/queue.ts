import type { TranscriptionCheckpoint } from '../library/sqlite';
import type { Quality, TranscriptionLanguageCode } from './languages';
import { isTranscriptionLanguageCode } from './languages';
import {
  msToSamples,
  samplesToMs,
  type PcmSource,
  type SpeechDetector,
  type TranscriptionEngine,
} from './engine';
import { planWindow, WINDOW_MS } from './segmenter';
import type { TranscriptionIssue } from '../library/types';

/** What the queue needs from the library (SqliteLibraryRepository). */
export interface TranscriptionStore {
  pendingTranscriptions(): { id: string; state: 'queued' | 'transcribing' }[];
  transcriptionJob(id: string): {
    language: string | null;
    model: string | null;
    audioPath: string | null;
    durationMs: number | null;
  };
  transcriptionCheckpoint(id: string): TranscriptionCheckpoint;
  startTranscription(id: string): void;
  suspendTranscription(id: string): void;
  saveDraft(
    id: string,
    segment: { startMs: number; endMs: number; text: string } | null,
    cursorMs: number,
  ): void;
  /** 0–1, or null when the length of the audio is unknown (indeterminate, never a frozen 0 %). */
  reportTranscriptionProgress(id: string, progress: number | null): void;
  /** The length the decoder produced, for a recording whose length was unknown. */
  recordDuration(id: string, durationMs: number): void;
  /** `model`: the one that actually transcribed it (the choice may change while queued). */
  completeTranscription(id: string, result: { quality: Quality | null; model: string }): void;
  failTranscription(id: string, issue: TranscriptionIssue): void;
}

/** The recorder, seen from the queue: busy from `preparing` to `stopping` (step 1 states). */
export interface RecorderWatch {
  isBusy(): boolean;
  subscribe(listener: (busy: boolean) => void): () => void;
}

export type QueueActivity = 'idle' | 'running';

export type TranscriptionQueueDeps = {
  store: TranscriptionStore;
  pcm: PcmSource;
  detector: SpeechDetector;
  engine: TranscriptionEngine;
  recorder: RecorderWatch;
  /** The local model ready on the device, or null while it is missing. */
  readyModel(): string | null;
  /** Absolute path of a recording's final file. */
  resolveAudio(audioPath: string): string;
  /** Length the file declares, in ms, when the library has none; null if it declares none. */
  probeDurationMs?(path: string): Promise<number | null>;
  /** Expected quality of the language with the model that transcribed it (languages.ts). */
  qualityFor(language: TranscriptionLanguageCode, model: string): Quality | null;
  /** Running or not: the foreground service follows it. */
  onActivity?(activity: QueueActivity): void;
  log?(...args: unknown[]): void;
};

class Suspended extends Error {}

/**
 * The local transcription queue (step 3). One recording at a time, oldest first, one segment
 * at a time. Recording always comes first, both ways:
 * - nothing starts while the recorder is busy;
 * - a transcription under way stops when a recording starts, is suspended with its drafts and
 *   cursor, and resumes there once the recorder is done.
 */
export class TranscriptionQueue {
  private running: Promise<void> | null = null;
  private suspendRequested = false;
  /** Kicked while still winding down: run again once idle. */
  private again = false;
  private stopped = false;
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly deps: TranscriptionQueueDeps) {}

  /** At launch: watches the recorder and resumes what was queued or cut while running. */
  start(): void {
    this.stopped = false;
    this.unsubscribe ??= this.deps.recorder.subscribe((busy) => {
      if (busy) this.suspend();
      else this.kick();
    });
    this.kick();
  }

  stop(): void {
    this.stopped = true;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.suspend();
  }

  /** Something new may be waiting (a recording finalised, a model ready): run if idle. */
  kick(): void {
    if (this.stopped || this.deps.recorder.isBusy()) return;
    if (this.running) {
      this.again = true;
      return;
    }
    this.suspendRequested = false;
    this.running = this.drain().finally(() => {
      this.running = null;
      this.deps.onActivity?.('idle');
      if (this.again) {
        this.again = false;
        this.kick();
      }
    });
  }

  /** Resolves when the queue is idle (tests, and the bench). */
  async idle(): Promise<void> {
    while (this.running) await this.running;
  }

  /** Stops the call under way; the job goes back to the queue with its drafts. */
  suspend(): void {
    this.again = false;
    if (!this.running) return;
    this.suspendRequested = true;
    this.deps.engine.stop();
  }

  private async drain(): Promise<void> {
    for (;;) {
      if (this.suspendRequested || this.deps.recorder.isBusy()) return;
      const next = this.deps.store.pendingTranscriptions()[0];
      if (!next) return;
      this.deps.onActivity?.('running');
      try {
        await this.transcribe(next.id, next.state);
      } catch (error) {
        if (error instanceof Suspended) {
          this.deps.store.suspendTranscription(next.id);
          this.deps.log?.('suspended', next.id);
          return;
        }
        this.deps.log?.('failed', next.id, error);
        this.deps.store.failTranscription(next.id, 'failed');
      }
    }
  }

  private async transcribe(id: string, state: 'queued' | 'transcribing'): Promise<void> {
    const { store } = this.deps;
    const job = store.transcriptionJob(id);
    const model = this.deps.readyModel();
    if (!model) {
      store.failTranscription(id, 'model-missing');
      return;
    }
    if (!job.audioPath || !isTranscriptionLanguageCode(job.language)) {
      throw new Error(`Nothing to transcribe for ${id}`);
    }
    const language = job.language;
    const path = this.deps.resolveAudio(job.audioPath);
    // Found "transcribing" at launch: the cut left it running; it goes on from its cursor.
    if (state === 'queued') store.startTranscription(id);
    let cursorMs = store.transcriptionCheckpoint(id).cursorMs;
    const startedAt = Date.now();
    this.deps.log?.('start', id, language, model, 'from', cursorMs, 'of', job.durationMs);
    // Without a known length, ask the file; failing that, no percentage, and the decoder tells
    // the real length at the end.
    let totalMs = job.durationMs && job.durationMs > 0 ? job.durationMs : null;
    if (!totalMs && this.deps.probeDurationMs) {
      const probed = await this.deps.probeDurationMs(path).catch(() => null);
      if (probed && probed > 0) {
        totalMs = Math.round(probed);
        store.recordDuration(id, totalMs);
      }
    }
    const progress = (ms: number) => {
      if (totalMs) store.reportTranscriptionProgress(id, ms / totalMs);
    };
    if (totalMs) progress(cursorMs);
    else store.reportTranscriptionProgress(id, null);
    let decodedMs = cursorMs;

    for (;;) {
      this.checkSuspended();
      const pcm = await this.deps.pcm.read(path, cursorMs, WINDOW_MS);
      this.checkSuspended();
      const endMs = cursorMs + samplesToMs(pcm.length);
      decodedMs = Math.max(decodedMs, endMs);
      const last = pcm.length < msToSamples(WINDOW_MS);
      const spans = (await this.deps.detector.detect(pcm)).map((span) => ({
        startMs: cursorMs + span.startMs,
        endMs: cursorMs + span.endMs,
      }));
      const plan = planWindow(spans, cursorMs, endMs, last);
      for (const segment of plan.segments) {
        this.checkSuspended();
        const slice = pcm.subarray(
          msToSamples(segment.startMs - cursorMs),
          msToSamples(segment.endMs - cursorMs),
        );
        const text = (await this.deps.engine.transcribe(slice, language)).trim();
        // A stopped call returns partial text: dropped, the segment is redone on resume.
        this.checkSuspended();
        store.saveDraft(id, text ? { ...segment, text } : null, segment.endMs);
        progress(segment.endMs);
      }
      store.saveDraft(id, null, plan.nextCursorMs);
      cursorMs = plan.nextCursorMs;
      progress(cursorMs);
      if (last) break;
    }
    if (!totalMs) store.recordDuration(id, Math.round(decodedMs));
    store.completeTranscription(id, { quality: this.deps.qualityFor(language, model), model });
    this.deps.log?.('done', id, 'in', Date.now() - startedAt, 'ms for', job.durationMs, 'ms');
  }

  private checkSuspended(): void {
    if (this.suspendRequested) throw new Suspended();
  }
}
