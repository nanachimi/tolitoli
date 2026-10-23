import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

type Mocks = { setTelemetryEnabled: jest.Mock; download: jest.Mock };

/** The adapter and the executorch mock it sees, from one fresh module registry. */
function loadAdapter(): Mocks & typeof import('../executorch') {
  let loaded!: Mocks & typeof import('../executorch');
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module registry
    const mocks = require('react-native-executorch') as Mocks;
    mocks.setTelemetryEnabled.mockClear();
    mocks.download.mockReset();
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module registry
    const adapter = require('../executorch') as typeof import('../executorch');
    loaded = { ...adapter, ...mocks };
  });
  return loaded;
}

/**
 * react-native-executorch POSTs to ai.swmansion.com on every download unless told not to.
 * Tolitoli's first promise is no telemetry: this test matters as much as the fix (owner).
 */
describe('executorch download telemetry', () => {
  it('is turned off as soon as the adapter is loaded, before any download', () => {
    const { setTelemetryEnabled, download } = loadAdapter();
    expect(setTelemetryEnabled).toHaveBeenCalledWith(false);
    expect(setTelemetryEnabled).not.toHaveBeenCalledWith(true);
    expect(download).not.toHaveBeenCalled();
  });

  it('is off again right before every download', async () => {
    const { setTelemetryEnabled, download, fetchModelFiles } = loadAdapter();
    download.mockResolvedValue(['/a', '/b']);
    setTelemetryEnabled.mockClear();
    await fetchModelFiles(['https://huggingface.co/a', 'https://huggingface.co/b'], {
      onProgress: () => {},
      signal: new AbortController().signal,
    });
    expect(setTelemetryEnabled).toHaveBeenCalledWith(false);
    expect(setTelemetryEnabled.mock.invocationCallOrder[0]).toBeLessThan(
      download.mock.invocationCallOrder[0]!,
    );
  });
});

describe('no path to executorch legacy API (D-036)', () => {
  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (name === '__tests__' || name === 'node_modules') return [];
      if (statSync(path).isDirectory()) return sources(path);
      return /\.(ts|tsx|js)$/.test(name) ? [path] : [];
    });
  }

  it('imports neither the legacy API, nor device-info, nor the resource fetcher', () => {
    const root = join(__dirname, '../../../..');
    const offending = ['src', 'app', 'modules']
      .flatMap((dir) => sources(join(root, dir)))
      .filter((path) =>
        /(from|require\()\s*['"](react-native-executorch\/legacy|react-native-device-info|react-native-executorch-expo-resource-fetcher)/.test(
          readFileSync(path, 'utf8'),
        ),
      );
    expect(offending).toEqual([]);
  });
});
