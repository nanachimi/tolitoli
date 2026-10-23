// In-memory stand-in for expo-sqlite's synchronous key-value store, one map per file.
jest.mock('expo-sqlite/kv-store', () => {
  const files = new Map<string, Map<string, string>>();
  class SQLiteStorage {
    private readonly store: Map<string, string>;
    constructor(name: string) {
      this.store = files.get(name) ?? new Map();
      files.set(name, this.store);
    }
    getItemSync(key: string) {
      return this.store.get(key) ?? null;
    }
    setItemSync(key: string, value: string) {
      this.store.set(key, value);
    }
    removeItemSync(key: string) {
      return this.store.delete(key);
    }
    getAllKeysSync() {
      return [...this.store.keys()];
    }
    clearSync() {
      this.store.clear();
      return true;
    }
  }
  const Storage = new SQLiteStorage('ExpoSQLiteStorage');
  return { __esModule: true, default: Storage, Storage, SQLiteStorage };
});

// The native player is not in Jest; screens only reach it for a recording with a file.
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => {
    throw new Error('expo-audio is not available in Jest: mock it in the test');
  }),
}));

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageTag: 'fr-FR', languageCode: 'fr' }]),
}));

jest.mock('expo-updates', () => ({
  reloadAsync: jest.fn(() => Promise.resolve()),
}));

// useFocusEffect needs a navigator; screens render alone in tests. Effects run on mount,
// and `globalThis.refocus()` runs them again, as when a screen comes back into view.
const mockFocusEffects = new Set<() => unknown>();
(globalThis as { refocus?: () => void }).refocus = () =>
  mockFocusEffects.forEach((effect) => effect());
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    ...jest.requireActual('expo-router'),
    useFocusEffect: (effect: () => unknown) =>
      useEffect(() => {
        mockFocusEffects.add(effect);
        const cleanup = effect();
        return () => {
          mockFocusEffects.delete(effect);
          if (typeof cleanup === 'function') cleanup();
        };
      }, [effect]),
  };
});

// Screens read the library: every test gets a fresh in-memory database, the real one or
// the demo one as the development switch says (src/features/library/library.ts).
/* eslint-disable import/first */
import { openTestLibrary } from './src/db/__tests__/testLibrary';
import { openLibrary, setLibraryOpener } from './src/features/library/library';

setLibraryOpener(async (choice) => openTestLibrary(choice));
beforeEach(async () => {
  await openLibrary();
});

// executorch's native runtime is not in Jest. Telemetry stays observable: tests check it is off.
jest.mock('react-native-executorch', () => ({
  setTelemetryEnabled: jest.fn(),
  // Never ends by itself; an abort ("Plus tard") rejects it, as the real one does.
  download: jest.fn(
    (_source: unknown, options?: { signal?: AbortSignal }) =>
      new Promise((_resolve, reject) =>
        options?.signal?.addEventListener('abort', () => reject(new Error('DOWNLOAD_ABORTED'))),
      ),
  ),
  createWhisperSpeechToText: jest.fn(),
  createFsmnVoiceActivityDetector: jest.fn(),
  WHISPER_LANGUAGES: ['en', 'fr', 'de', 'ru', 'zh', 'ar', 'sw', 'ha', 'yo', 'ln', 'mg'],
  models: {
    voiceActivityDetection: {
      FSMN_VAD: {
        XNNPACK_FP32: { modelPath: 'https://example.invalid/vad.pte', defaultOptions: {} },
      },
    },
  },
}));

// No network in Jest: Wi-Fi unless a test says otherwise.
jest.mock('expo-network', () => ({
  NetworkStateType: { WIFI: 'WIFI', ETHERNET: 'ETHERNET', CELLULAR: 'CELLULAR' },
  getNetworkStateAsync: jest.fn(async () => ({ type: 'WIFI', isConnected: true })),
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
}));
