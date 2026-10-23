import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import * as schema from '../schema';

export const MIGRATIONS_FOLDER = `${__dirname}/../migrations`;

/**
 * A fresh in-memory database with the app's migrations applied: the same SQL files, run
 * by better-sqlite3 on SQLite 3.53 (the app bundles 3.53 too, via expo-sqlite).
 */
export function testDatabase() {
  const client = new Database(':memory:');
  client.pragma('foreign_keys = ON');
  const db = drizzle(client, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { client, db };
}
