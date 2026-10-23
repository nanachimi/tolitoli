import { File } from 'expo-file-system';
import { defaultDatabaseDirectory } from 'expo-sqlite';
import { SQLiteStorage } from 'expo-sqlite/kv-store';

/** One file for the library and the settings, so one backup covers everything (owner, step 2). */
export const APP_DATABASE_NAME = 'tolitoli.db';
/** expo-sqlite's default key-value file, used until step 1c; kept on disk, never deleted. */
export const LEGACY_SETTINGS_DATABASE_NAME = 'ExpoSQLiteStorage';
export const LEGACY_COPIED_KEY = 'settings.copiedFromLegacyAt';

type KeyValue = Pick<SQLiteStorage, 'getItemSync' | 'setItemSync' | 'getAllKeysSync'>;

/**
 * Copies the settings of the legacy file once (consent, interface language…). A key the
 * app database already has is never overwritten, so running it again changes nothing.
 */
export function copyLegacySettings(
  legacy: KeyValue | null,
  target: KeyValue,
  now = new Date(),
): string[] {
  if (target.getItemSync(LEGACY_COPIED_KEY) !== null) return [];
  const copied: string[] = [];
  for (const key of legacy?.getAllKeysSync() ?? []) {
    const value = legacy?.getItemSync(key) ?? null;
    if (value === null || target.getItemSync(key) !== null) continue;
    target.setItemSync(key, value);
    copied.push(key);
  }
  target.setItemSync(LEGACY_COPIED_KEY, now.toISOString());
  return copied;
}

/** Opening the legacy file would create it on a fresh install: look before. */
function legacyStorage(): SQLiteStorage | null {
  try {
    const directory = String(defaultDatabaseDirectory);
    const uri = directory.startsWith('file:') ? directory : `file://${directory}`;
    return new File(`${uri}/${LEGACY_SETTINGS_DATABASE_NAME}`).exists
      ? new SQLiteStorage(LEGACY_SETTINGS_DATABASE_NAME)
      : null;
  } catch {
    return null;
  }
}

/** The settings key-value store, in the app database (its own `storage` table). */
export const settingsStorage = new SQLiteStorage(APP_DATABASE_NAME);

// Before any module reads a setting: this module is what they import.
copyLegacySettings(legacyStorage(), settingsStorage);
