// In-memory stand-in for expo-sqlite's synchronous key-value store.
jest.mock('expo-sqlite/kv-store', () => {
  const store = new Map<string, string>();
  const Storage = {
    getItemSync: (key: string) => store.get(key) ?? null,
    setItemSync: (key: string, value: string) => void store.set(key, value),
    clearSync: () => store.clear(),
  };
  return { __esModule: true, default: Storage, Storage };
});

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageTag: 'fr-FR', languageCode: 'fr' }]),
}));

jest.mock('expo-updates', () => ({
  reloadAsync: jest.fn(() => Promise.resolve()),
}));
