import { LOCAL_MODELS, modelFiles, type LocalModelId, type ModelFile } from './models';

export type ModelStatus =
  /** Not on the device; "Plus tard" leaves it here, its partial files kept for a resume. */
  | 'missing'
  /** Wanted, but the Wi-Fi-only policy holds it until a Wi-Fi network shows up. */
  | 'waiting-wifi'
  | 'downloading'
  /** Size and SHA-256 of each file, before any use. */
  | 'verifying'
  | 'ready'
  /** A file did not match its digest and was deleted, or the network failed. */
  | 'failed';

export type ModelPaths = { whisper: string; tokenizer: string; vad: string };

export type ModelState = {
  model: LocalModelId;
  status: ModelStatus;
  /** 0–1, across all the files of the model. */
  progress: number;
  paths?: ModelPaths;
  failure?: 'integrity' | 'network';
};

export type ModelDownloadDeps = {
  /**
   * Downloads the URLs, resuming partial files; local paths in the same order. Rejects when
   * `signal` aborts. react-native-executorch's `download()`, its telemetry turned off.
   */
  fetch(
    urls: string[],
    options: { onProgress: (progress: number) => void; signal: AbortSignal },
  ): Promise<string[]>;
  sha256(path: string): Promise<string>;
  size(path: string): number | null;
  remove(path: string): void;
  network: {
    isWifi(): Promise<boolean>;
    onChange(listener: () => void): () => void;
  };
  /** The verified model, kept across launches (kv-store). */
  saved: {
    load(): { model: LocalModelId; paths: ModelPaths } | null;
    save(value: { model: LocalModelId; paths: ModelPaths } | null): void;
  };
  onState(state: ModelState): void;
  log?(...args: unknown[]): void;
};

/**
 * The local model on the device (step 3): Wi-Fi only by default (our markets pay dearly for
 * mobile data), resumable, verified before use.
 */
export class ModelDownloader {
  private state: ModelState;
  private controller: AbortController | null = null;
  private stopWaiting: (() => void) | null = null;
  /** Bumped by `pause()`: a start still checking the network then gives up. */
  private generation = 0;

  constructor(
    private readonly deps: ModelDownloadDeps,
    private readonly model: LocalModelId,
  ) {
    this.state = { model, status: 'missing', progress: 0 };
  }

  get current(): ModelState {
    return this.state;
  }

  /** At launch: ready if the verified files of this model are still there, at their size. */
  restore(): ModelState {
    const saved = this.deps.saved.load();
    const files = modelFiles(LOCAL_MODELS[this.model]);
    if (saved?.model === this.model) {
      const paths = [saved.paths.whisper, saved.paths.tokenizer, saved.paths.vad];
      if (paths.every((path, i) => this.deps.size(path) === files[i]!.bytes)) {
        this.set({ status: 'ready', progress: 1, paths: saved.paths });
        return this.state;
      }
      this.deps.saved.save(null);
    }
    this.set({ status: 'missing', progress: 0 });
    return this.state;
  }

  /** Starts, or waits for Wi-Fi unless the user allowed mobile data for this download. */
  async start(options: { mobileData?: boolean } = {}): Promise<void> {
    if (['downloading', 'verifying', 'ready'].includes(this.state.status)) return;
    const generation = this.generation;
    const wifi = options.mobileData || (await this.deps.network.isWifi());
    if (generation !== this.generation) return; // put off while the network was checked
    if (!wifi) {
      this.set({ status: 'waiting-wifi' });
      this.stopWaiting ??= this.deps.network.onChange(() => {
        if (this.state.status === 'waiting-wifi') void this.start();
      });
      return;
    }
    this.stopWaiting?.();
    this.stopWaiting = null;
    await this.download();
  }

  /** "Plus tard": stops; the partial files stay for the next start. */
  pause(): void {
    this.generation += 1;
    this.stopWaiting?.();
    this.stopWaiting = null;
    this.controller?.abort();
    if (this.state.status === 'waiting-wifi' || this.state.status === 'downloading') {
      this.set({ status: 'missing' });
    }
  }

  private async download(): Promise<void> {
    const model = LOCAL_MODELS[this.model];
    const files = modelFiles(model);
    const controller = new AbortController();
    this.controller = controller;
    this.set({ status: 'downloading', failure: undefined });
    let paths: string[];
    try {
      paths = await this.deps.fetch(
        files.map((file) => file.url),
        {
          onProgress: (progress) => {
            if (this.controller === controller) this.set({ progress });
          },
          signal: controller.signal,
        },
      );
    } catch (error) {
      if (controller.signal.aborted) return; // paused: the state is already "missing"
      this.deps.log?.('download failed', error);
      this.set({ status: 'failed', failure: 'network' });
      return;
    } finally {
      if (this.controller === controller) this.controller = null;
    }

    this.set({ status: 'verifying', progress: 1 });
    const bad = await this.mismatches(paths, files);
    if (bad.length > 0) {
      // Never loaded, never kept: the next start downloads them again.
      bad.forEach((path) => this.deps.remove(path));
      this.deps.log?.('integrity check failed', bad);
      this.set({ status: 'failed', failure: 'integrity', progress: 0 });
      return;
    }
    const verified = { whisper: paths[0]!, tokenizer: paths[1]!, vad: paths[2]! };
    this.deps.saved.save({ model: this.model, paths: verified });
    this.set({ status: 'ready', paths: verified });
  }

  private async mismatches(paths: string[], files: ModelFile[]): Promise<string[]> {
    const bad: string[] = [];
    for (const [i, path] of paths.entries()) {
      const file = files[i]!;
      if (
        this.deps.size(path) !== file.bytes ||
        (await this.deps.sha256(path)).toLowerCase() !== file.sha256
      ) {
        bad.push(path);
      }
    }
    return bad;
  }

  private set(partial: Partial<ModelState>): void {
    this.state = { ...this.state, ...partial };
    this.deps.onState(this.state);
  }
}
