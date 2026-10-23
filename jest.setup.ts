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
