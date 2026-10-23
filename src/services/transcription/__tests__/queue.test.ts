import { testDatabase } from '../../../db/__tests__/testDatabase';
import { MemoryFs } from '../../audio/__tests__/fakes';
import { SqliteLibraryRepository } from '../../library/sqlite';
import { msToSamples, PCM_SAMPLE_RATE, type SpeechSpan } from '../engine';
import { TranscriptionQueue, type QueueActivity } from '../queue';

const T0 = new Date(2026, 9, 23, 10, 0).getTime();

/**
 * A recording as PCM: silence is 0, the k-th stretch of speech is filled with k. The fake
 * VAD finds the non-zero runs; the fake engine answers "w<k>" from the samples it gets.
 */
function speechAudio(durationMs: number, speech: SpeechSpan[]): Float32Array {
  const pcm = new Float32Array(msToSamples(durationMs));
  speech.forEach((span, k) => pcm.fill(k + 1, msToSamples(span.startMs), msToSamples(span.endMs)));
  return pcm;
}

class FakeEngine {
  calls: number[] = [];
  stops = 0;
  /** When set, the call waits until `release()` or `stop()`. */
  hold = false;
  private pending: { resolve: (text: string) => void; text: string } | null = null;

  transcribe = (pcm: Float32Array): Promise<string> => {
    const k = pcm.find((sample) => sample !== 0) ?? 0;
    this.calls.push(k);
    const text = k ? `w${k}` : '';
    if (!this.hold) return Promise.resolve(text);
    return new Promise((resolve) => {
      this.pending = { resolve, text };
    });
  };

  /** executorch resolves a stopped call with what it decoded so far. */
  stop = () => {
    this.stops += 1;
    this.pending?.resolve('partial');
    this.pending = null;
  };

  release(): void {
    this.pending?.resolve(this.pending.text);
    this.pending = null;
  }

  get waiting(): boolean {
    return this.pending !== null;
  }
}

class FakeRecorder {
  busy = false;
  private listeners = new Set<(busy: boolean) => void>();
  isBusy = () => this.busy;
  subscribe = (listener: (busy: boolean) => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  set(busy: boolean): void {
    this.busy = busy;
    this.listeners.forEach((listener) => listener(busy));
  }
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

async function until(condition: () => boolean): Promise<void> {
  for (let i = 0; i < 200 && !condition(); i++) await tick();
  expect(condition()).toBe(true);
}

function setup(options: { durationMs: number; speech: SpeechSpan[]; model?: string | null }) {
  const { db } = testDatabase();
  const make = () =>
    new SqliteLibraryRepository({
      db,
      fs: new MemoryFs(),
      root: 'doc/recordings',
      now: () => new Date(T0),
    });
  const store = make();
  const audio = speechAudio(options.durationMs, options.speech);
  const reads: number[] = [];
  const engine = new FakeEngine();
  const recorder = new FakeRecorder();
  const activity: QueueActivity[] = [];
  const queue = (repository = store) =>
    new TranscriptionQueue({
      store: repository,
      pcm: {
        read: async (_path, startMs, durationMs) => {
          reads.push(startMs);
          const from = msToSamples(startMs);
          return audio.slice(from, Math.min(audio.length, from + msToSamples(durationMs)));
        },
      },
      detector: {
        detect: async (pcm) => {
          const spans: SpeechSpan[] = [];
          let start = -1;
          for (let i = 0; i <= pcm.length; i++) {
            const speaking = i < pcm.length && pcm[i] !== 0;
            if (speaking && start < 0) start = i;
            if (!speaking && start >= 0) {
              spans.push({
                startMs: (start * 1000) / PCM_SAMPLE_RATE,
                endMs: (i * 1000) / PCM_SAMPLE_RATE,
              });
              start = -1;
            }
          }
          return spans;
        },
      },
      engine,
      recorder,
      readyModel: () => (options.model === undefined ? 'tiny' : options.model),
      resolveAudio: (path) => `/abs/${path}`,
      qualityFor: (language, model) => (language === 'fr' && model === 'tiny' ? 'draft' : 'good'),
      onActivity: (state) => activity.push(state),
    });

  const add = (id: string, createdAt = T0) => {
    store.createRecording({ id, createdAt: new Date(createdAt).toISOString() });
    store.finalizeRecording(id, {
      audioPath: `${id}.m4a`,
      audioSize: 1,
      audioFormat: 'm4a',
      durationMs: options.durationMs,
      recovered: false,
    });
    store.queueTranscription(id, { language: 'fr', engine: 'local', model: 'tiny' });
  };
  return { store, make, queue, engine, recorder, reads, activity, add };
}

const texts = (store: SqliteLibraryRepository, id: string) =>
  store.segments(id).map((segment) => segment.text);

describe('TranscriptionQueue', () => {
  it('transcribes each stretch of speech once, with its own bounds and the quality of its model', async () => {
    const { store, queue, add } = setup({
      durationMs: 150_000,
      speech: [
        { startMs: 2000, endMs: 6000 },
        { startMs: 58_000, endMs: 64_000 }, // across the first window's end
        { startMs: 130_000, endMs: 133_000 },
      ],
    });
    add('rec');
    const q = queue();
    q.start();
    await q.idle();
    expect(texts(store, 'rec')).toEqual(['w1', 'w2', 'w3']);
    const [first, second] = store.segments('rec');
    expect(first).toMatchObject({ startMs: 1850, endMs: 6150 });
    expect(second).toMatchObject({ startMs: 57_850, endMs: 64_150 });
    expect(store.get('rec')).toMatchObject({ state: 'transcribed', quality: 'draft' });
  });

  it('starts nothing while a recording is under way (recording comes first, way 1)', async () => {
    const { store, queue, engine, recorder, reads, add } = setup({
      durationMs: 30_000,
      speech: [{ startMs: 1000, endMs: 5000 }],
    });
    add('rec');
    recorder.set(true);
    const q = queue();
    q.start();
    q.kick();
    await tick();
    await q.idle();
    expect(reads).toEqual([]);
    expect(engine.calls).toEqual([]);
    expect(store.get('rec')?.state).toBe('transcribing'); // queued, shown as waiting
    expect(store.pendingTranscriptions()).toEqual([{ id: 'rec', state: 'queued' }]);

    recorder.set(false);
    await until(() => store.get('rec')?.state === 'transcribed');
    expect(texts(store, 'rec')).toEqual(['w1']);
  });

  it('stops for a recording that starts, then resumes where it was (recording comes first, way 2)', async () => {
    const { store, queue, engine, recorder, add } = setup({
      durationMs: 50_000,
      speech: [
        { startMs: 1000, endMs: 5000 },
        { startMs: 10_000, endMs: 14_000 },
        { startMs: 20_000, endMs: 24_000 },
      ],
    });
    add('rec');
    engine.hold = true;
    const q = queue();
    q.start();
    await until(() => engine.waiting && engine.calls.length === 1);
    engine.release();
    await until(() => engine.waiting && engine.calls.length === 2);

    // The user starts recording while segment 2 is being transcribed.
    recorder.set(true);
    await q.idle();
    expect(engine.stops).toBe(1);
    expect(store.pendingTranscriptions()).toEqual([{ id: 'rec', state: 'queued' }]);
    const checkpoint = store.transcriptionCheckpoint('rec');
    expect(checkpoint.drafts.map((draft) => draft.text)).toEqual(['w1']); // "partial" dropped
    expect(checkpoint.cursorMs).toBe(5150);

    engine.hold = false;
    recorder.set(false);
    await until(() => store.get('rec')?.state === 'transcribed');
    // Segment 1 is not redone; segment 2 is, from the start.
    expect(engine.calls).toEqual([1, 2, 2, 3]);
    expect(texts(store, 'rec')).toEqual(['w1', 'w2', 'w3']);
  });

  it('resumes at launch a transcription cut while running, from its cursor', async () => {
    const first = setup({
      durationMs: 50_000,
      speech: [
        { startMs: 1000, endMs: 5000 },
        { startMs: 20_000, endMs: 24_000 },
      ],
    });
    first.add('rec');
    first.store.startTranscription('rec');
    first.store.saveDraft('rec', { startMs: 850, endMs: 5150, text: 'w1' }, 5150);

    // The next launch: a fresh repository on the same database finds it "transcribing".
    const relaunched = first.make();
    expect(relaunched.pendingTranscriptions()).toEqual([{ id: 'rec', state: 'transcribing' }]);
    const q = first.queue(relaunched);
    q.start();
    await q.idle();
    expect(first.reads[0]).toBe(5150);
    expect(first.engine.calls).toEqual([2]);
    expect(texts(relaunched, 'rec')).toEqual(['w1', 'w2']);
  });

  it('fails with "model-missing" while there is no model', async () => {
    const { store, queue, engine, add } = setup({
      durationMs: 10_000,
      speech: [{ startMs: 1000, endMs: 2000 }],
      model: null,
    });
    add('rec');
    const q = queue();
    q.start();
    await q.idle();
    expect(store.get('rec')).toMatchObject({ state: 'failed', issue: 'model-missing' });
    expect(engine.calls).toEqual([]);
  });

  it('fails one recording without stopping the queue, and keeps no empty transcript', async () => {
    const { store, queue, engine, add } = setup({
      durationMs: 10_000,
      speech: [{ startMs: 1000, endMs: 2000 }],
    });
    add('broken', T0 - 1000);
    add('fine', T0);
    let calls = 0;
    const original = engine.transcribe;
    engine.transcribe = (pcm) =>
      calls++ === 0 ? Promise.reject(new Error('boom')) : original(pcm);
    const q = queue();
    q.start();
    await q.idle();
    expect(store.get('broken')).toMatchObject({ state: 'failed', issue: 'failed' });
    expect(store.segments('broken')).toEqual([]);
    expect(store.get('fine')?.state).toBe('transcribed');
  });

  it('reports its activity for the foreground service', async () => {
    const { queue, activity, add } = setup({
      durationMs: 10_000,
      speech: [{ startMs: 1000, endMs: 2000 }],
    });
    add('rec');
    const q = queue();
    q.start();
    await q.idle();
    expect(activity[0]).toBe('running');
    expect(activity[activity.length - 1]).toBe('idle');
  });
});
