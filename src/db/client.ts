import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';

import migrations from './migrations/migrations';
import * as schema from './schema';

/**
 * Opens an app database file and applies its migrations (the same SQL files Jest runs on
 * better-sqlite3). WAL lets the key-value store share tolitoli.db with drizzle.
 */
export async function openDatabase(name: string) {
  const client = openDatabaseSync(name);
  client.execSync(
    'PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;',
  );
  const db = drizzle(client, { schema });
  await migrate(db, migrations);
  return db;
}
