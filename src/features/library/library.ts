import { settingsStorage as Storage } from '@/features/settings/storage';
import { create } from 'zustand';

import { SimulatedLibraryRepository } from '@/services/library';

import { useRecordingStore } from '../recording/useRecordingStore';

/** Development switch for the demo set; ignored (and hidden) in production builds. */
export const DEMO_DATA_STORAGE_KEY = 'dev.demoData';

function readDemoFlag(): boolean {
  return __DEV__ && Storage.getItemSync(DEMO_DATA_STORAGE_KEY) === 'on';
}

let demoEnabled = readDemoFlag();

/**
 * The app's library, simulated until step 2 brings SQLite: step 1 recordings from
 * the manifests (read only), plus the demo set in development.
 */
export const library = new SimulatedLibraryRepository({
  readManifests: () => useRecordingStore.getState().recordings,
  demoEnabled: () => demoEnabled,
  now: () => new Date(),
});

/** Bumped on every library change, so screens re-read the repository. */
export const useLibraryVersion = create<{ version: number }>(() => ({ version: 0 }));

library.subscribe(() => useLibraryVersion.setState((state) => ({ version: state.version + 1 })));
// New or recovered recordings come from the recording store's manifest list.
useRecordingStore.subscribe((state, previous) => {
  if (state.recordings !== previous.recordings) library.emit();
});

export function isDemoDataEnabled(): boolean {
  return demoEnabled;
}

export function setDemoDataEnabled(on: boolean): void {
  if (!__DEV__) return;
  demoEnabled = on;
  Storage.setItemSync(DEMO_DATA_STORAGE_KEY, on ? 'on' : 'off');
  library.emit();
}

/** Re-renders the caller whenever the library changes. */
export function useLibrary(): SimulatedLibraryRepository {
  useLibraryVersion((state) => state.version);
  return library;
}
