import { ModelDownloader, type ModelDownloadDeps, type ModelState } from '../download';
import { LOCAL_MODELS, modelBytes, modelFiles } from '../models';

const TINY = modelFiles(LOCAL_MODELS.tiny);

function setup(options: { wifi?: boolean; corrupt?: number } = {}) {
  let wifi = options.wifi ?? true;
  const networkListeners = new Set<() => void>();
  const files = new Map<string, { bytes: number; sha256: string }>();
  let saved: ReturnType<ModelDownloadDeps['saved']['load']> = null;
  const states: ModelState[] = [];
  const fetches: string[][] = [];
  let pendingFetch: { resolve: () => void; reject: (error: unknown) => void } | null = null;
  let holdFetch = false;

  const deps: ModelDownloadDeps = {
    fetch: (urls, { onProgress, signal }) => {
      fetches.push(urls);
      const done = () => {
        onProgress(1);
        return urls.map((url, i) => {
          const path = `/models/${i}-${url.split('/').pop()}`;
          const file = TINY[i]!;
          files.set(path, {
            bytes: file.bytes,
            sha256: i === options.corrupt ? 'f'.repeat(64) : file.sha256.toUpperCase(),
          });
          return path;
        });
      };
      onProgress(0.5);
      if (!holdFetch) return Promise.resolve(done());
      return new Promise((resolve, reject) => {
        pendingFetch = { resolve: () => resolve(done()), reject };
        signal.addEventListener('abort', () => reject(new Error('DOWNLOAD_ABORTED')));
      });
    },
    sha256: async (path) => files.get(path)!.sha256,
    size: (path) => files.get(path)?.bytes ?? null,
    remove: (path) => {
      files.delete(path);
    },
    network: {
      isWifi: async () => wifi,
      onChange: (listener) => {
        networkListeners.add(listener);
        return () => networkListeners.delete(listener);
      },
    },
    saved: {
      load: () => saved,
      save: (value) => {
        saved = value;
      },
    },
    onState: (state) => states.push(state),
  };
  return {
    deps,
    files,
    states,
    fetches,
    downloader: () => new ModelDownloader(deps, 'tiny'),
    setWifi: (value: boolean) => {
      wifi = value;
      networkListeners.forEach((listener) => listener());
    },
    hold: () => {
      holdFetch = true;
    },
    release: () => pendingFetch?.resolve(),
    saved: () => saved,
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('ModelDownloader', () => {
  it('downloads the files pinned to a commit, checks them, and keeps them for the next launch', async () => {
    const context = setup();
    const downloader = context.downloader();
    await downloader.start();
    expect(context.fetches).toEqual([TINY.map((file) => file.url)]);
    for (const url of context.fetches[0]!) expect(url).toMatch(/\/resolve\/[0-9a-f]{40}\//);
    expect(downloader.current).toMatchObject({ status: 'ready', progress: 1 });
    expect(context.states.map((state) => state.status)).toEqual([
      'downloading',
      'downloading',
      'downloading',
      'verifying',
      'ready',
    ]);
    expect(context.downloader().restore().status).toBe('ready');
  });

  it('waits for Wi-Fi by default, then starts by itself', async () => {
    const context = setup({ wifi: false });
    const downloader = context.downloader();
    await downloader.start();
    expect(downloader.current.status).toBe('waiting-wifi');
    expect(context.fetches).toEqual([]);
    context.setWifi(true);
    await flush();
    await flush();
    expect(downloader.current.status).toBe('ready');
  });

  it('uses mobile data only when the user asks for it', async () => {
    const context = setup({ wifi: false });
    await context.downloader().start({ mobileData: true });
    expect(context.fetches).toHaveLength(1);
  });

  it('deletes a file that does not match its digest, and never marks the model ready', async () => {
    const context = setup({ corrupt: 0 });
    const downloader = context.downloader();
    await downloader.start();
    expect(downloader.current).toMatchObject({ status: 'failed', failure: 'integrity' });
    expect([...context.files.keys()]).toHaveLength(2);
    expect(context.saved()).toBeNull();
    expect(context.downloader().restore().status).toBe('missing');
  });

  it('"Plus tard" stops the download; the next start resumes it', async () => {
    const context = setup();
    context.hold();
    const downloader = context.downloader();
    const started = downloader.start();
    await flush();
    expect(downloader.current).toMatchObject({ status: 'downloading', progress: 0.5 });
    downloader.pause();
    await started;
    expect(downloader.current.status).toBe('missing');
    context.release();
    expect(context.saved()).toBeNull();
  });

  it('"Plus tard" pressed while the network is checked: nothing is downloaded', async () => {
    const context = setup();
    const downloader = context.downloader();
    const started = downloader.start();
    downloader.pause();
    await started;
    expect(context.fetches).toEqual([]);
    expect(downloader.current.status).toBe('missing');
  });

  it('is not ready at launch when a file went missing', async () => {
    const context = setup();
    await context.downloader().start();
    context.files.delete([...context.files.keys()][0]!);
    expect(context.downloader().restore().status).toBe('missing');
    expect(context.saved()).toBeNull();
  });

  it('announces the size of the whole model', () => {
    expect(modelBytes('tiny')).toBe(232_609_280 + 2_480_466 + 1_827_808);
    expect(modelBytes('base')).toBe(398_650_240 + 2_480_466 + 1_827_808);
  });
});
