import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import journal from '../migrations/meta/_journal.json';

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

/** The migrations a device had before `tag`, in a folder of their own (the caller removes it). */
export function migrationsBefore(tag: string): string {
  const folder = mkdtempSync(join(tmpdir(), 'tolitoli-migrations-'));
  mkdirSync(join(folder, 'meta'));
  const entries = journal.entries.slice(
    0,
    journal.entries.findIndex((entry) => entry.tag === tag),
  );
  writeFileSync(join(folder, 'meta', '_journal.json'), JSON.stringify({ ...journal, entries }));
  for (const entry of entries) {
    copyFileSync(join(MIGRATIONS_FOLDER, `${entry.tag}.sql`), join(folder, `${entry.tag}.sql`));
  }
  return folder;
}
