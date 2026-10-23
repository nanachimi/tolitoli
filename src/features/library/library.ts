import { create } from 'zustand';

import { settingsStorage as Storage } from '@/features/settings/storage';
import type { SqliteLibraryRepository } from '@/services/library';

import type { LibraryDatabaseChoice } from './database';

/** Which library database is open; `demo` is honoured in development builds only. */
export const LIBRARY_DATABASE_STORAGE_KEY = 'dev.libraryDatabase';

export type LibraryOpener = (choice: LibraryDatabaseChoice) => Promise<SqliteLibraryRepository>;

// Loaded on first use, so that Jest (which installs its own opener) never loads expo-sqlite.
let opener: LibraryOpener = async (choice) =>
  (await import('./database')).openLibraryDatabase(choice);

let current: SqliteLibraryRepository | null = null;
let unsubscribe: (() => void) | null = null;

/** Bumped on every library change, so screens re-read the repository. */
export const useLibraryVersion = create<{ version: number; ready: boolean }>(() => ({
  version: 0,
  ready: false,
}));

function bump(): void {
  useLibraryVersion.setState((state) => ({ version: state.version + 1 }));
}

export function activeLibraryDatabase(): LibraryDatabaseChoice {
  return __DEV__ && Storage.getItemSync(LIBRARY_DATABASE_STORAGE_KEY) === 'demo' ? 'demo' : 'real';
}

/** Tests open in-memory databases instead of files (jest.setup.ts). */
export function setLibraryOpener(next: LibraryOpener): void {
  opener = next;
}

function install(repository: SqliteLibraryRepository): void {
  unsubscribe?.();
  current = repository;
  unsubscribe = repository.subscribe(bump);
  useLibraryVersion.setState((state) => ({ version: state.version + 1, ready: true }));
}

/** At launch, before any screen reads the library (app/_layout.tsx). */
export async function openLibrary(): Promise<SqliteLibraryRepository> {
  const repository = await opener(activeLibraryDatabase());
  install(repository);
  return repository;
}

export function getLibrary(): SqliteLibraryRepository {
  if (!current) throw new Error('The library is not open yet (openLibrary at launch)');
  return current;
}

/**
 * The open library, whichever database it is on; it follows a switch to the demo
 * database without the callers holding on to the old one.
 */
export const library = new Proxy({} as SqliteLibraryRepository, {
  get(_target, key) {
    const repository = getLibrary();
    const value: unknown = Reflect.get(repository, key, repository);
    return typeof value === 'function' ? value.bind(repository) : value;
  },
});

export function isDemoDataEnabled(): boolean {
  return activeLibraryDatabase() === 'demo';
}

/** A switch of database file, not a seeding: the real database is never written to. */
export async function setDemoDataEnabled(on: boolean): Promise<void> {
  if (!__DEV__) return;
  Storage.setItemSync(LIBRARY_DATABASE_STORAGE_KEY, on ? 'demo' : 'real');
  install(await opener(on ? 'demo' : 'real'));
}

/** Re-renders the caller whenever the library changes. */
export function useLibrary(): SqliteLibraryRepository {
  useLibraryVersion((state) => state.version);
  return getLibrary();
}
