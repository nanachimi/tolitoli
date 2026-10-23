import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import journal from '../../../db/migrations/meta/_journal.json';
import * as schema from '../../../db/schema';
import { MIGRATIONS_FOLDER } from '../../../db/__tests__/testDatabase';
import { openTestLibrary } from '../../../db/__tests__/testLibrary';
import { settingsStorage as Storage } from '@/features/settings/storage';
import { i18next, initI18n } from '@/i18n';
import { MemoryFs } from '@/services/audio/__tests__/fakes';
import { SqliteLibraryRepository } from '@/services/library/sqlite';

import { describeForSearch } from '../display';
import { startLibrary, TITLES_LANGUAGE_STORAGE_KEY } from '../launch';
import { setLibraryOpener } from '../library';

jest.mock('../../recording/recordingController', () => ({ recoverAtLaunch: jest.fn() }));

initI18n();

/** The migrations a device had before 0002, in a folder of their own. */
function migrationsBefore(tag: string): string {
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

afterAll(() => {
  setLibraryOpener(async (choice) => openTestLibrary(choice));
});

describe('a device updated to migration 0002', () => {
  it('finds every recording by its date again after the next launch', async () => {
    await i18next.changeLanguage('fr');
    const before = migrationsBefore('0002_title_tokenchars');
    const client = new Database(':memory:');
    client.pragma('foreign_keys = ON');
    const db = drizzle(client, { schema });
    migrate(db, { migrationsFolder: before });
    rmSync(before, { recursive: true });

    // The library as the previous version left it: indexed, in French.
    const repository = new SqliteLibraryRepository({
      db,
      fs: new MemoryFs(),
      root: 'doc/recordings',
      now: () => new Date(),
      describeForSearch,
    });
    const add = (id: string, createdAt: Date) => {
      repository.createRecording({ id, createdAt: createdAt.toISOString() });
      repository.finalizeRecording(id, {
        audioPath: `${id}.m4a`,
        audioSize: 1,
        audioFormat: 'm4a',
        durationMs: 32_000,
        recovered: false,
      });
    };
    add('afternoon', new Date(2026, 9, 23, 15, 45));
    add('budget', new Date(2026, 9, 22, 10, 23));
    repository.rename('budget', 'Point budget');
    add('old', new Date(2025, 2, 4, 9, 5));
    repository.reindexTitles();
    Storage.setItemSync(TITLES_LANGUAGE_STORAGE_KEY, 'fr');
    expect(repository.titleIndexIsComplete()).toBe(true);

    // The update: 0002 rebuilds the table, empty.
    migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    expect(client.prepare(`select count(*) as n from recordings_fts`).get()).toEqual({ n: 0 });
    expect(repository.titleIndexIsComplete()).toBe(false);
    expect(repository.search('23 oct')).toEqual([]);

    // The next launch, in the same language: the guard alone rebuilds the index.
    setLibraryOpener(async () => repository);
    await startLibrary();

    const ids = (query: string) =>
      repository
        .search(query)
        .map((item) => item.id)
        .sort();
    expect(ids('23 oct')).toEqual(['afternoon']);
    expect(ids('15:45')).toEqual(['afternoon']);
    expect(ids('10:23')).toEqual(['budget']);
    expect(ids('22/10')).toEqual(['budget']);
    expect(ids('point budget')).toEqual(['budget']);
    expect(ids('mars 2025')).toEqual(['old']);
    expect(ids('04/03/2025')).toEqual(['old']);
  });
});
