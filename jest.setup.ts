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
