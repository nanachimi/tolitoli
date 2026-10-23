import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import journal from '../migrations/meta/_journal.json';
import { MIGRATIONS_FOLDER, testDatabase } from './testDatabase';

type Client = InstanceType<typeof Database>;

const NOW = 1_792_700_000_000;

function insertRecording(client: Client, id: string, extra: Record<string, unknown> = {}) {
  const row = { id, created_at: NOW, updated_at: NOW, state: 'local', ...extra };
  const columns = Object.keys(row);
  client
    .prepare(
      `insert into recordings (${columns.join(', ')}) values (${columns.map(() => '?').join(', ')})`,
    )
    .run(...Object.values(row));
}

function names(client: Client, type: 'table' | 'index' | 'trigger'): string[] {
  return (
    client.prepare(`select name from sqlite_master where type = ? order by name`).all(type) as {
      name: string;
    }[]
  ).map((row) => row.name);
}

/** One test per migration (CLAUDE.md); the guard below fails when a migration has none. */
const MIGRATION_TESTS: Record<string, () => void> = {
  '0000_init': () => {
    const { client } = testDatabase();
    expect(names(client, 'table')).toEqual(
      expect.arrayContaining(['outbox', 'recordings', 'segments']),
    );
    expect(names(client, 'index')).toEqual(
      expect.arrayContaining(['recordings_listing', 'segments_by_recording']),
    );
    insertRecording(client, 'a');
    // CHECK constraints refuse what the app never writes.
    expect(() => insertRecording(client, 'b', { state: 'done' })).toThrow(/CHECK/);
    expect(() => insertRecording(client, 'c', { audio_format: 'm4a-segments' })).toThrow(/CHECK/);
    expect(() => insertRecording(client, 'd', { transcription_progress: 1.5 })).toThrow(/CHECK/);
    expect(() =>
      client
        .prepare(`insert into outbox (entity, entity_id, op, created_at) values (?, ?, ?, ?)`)
        .run('folder', 'a', 'create', NOW),
    ).toThrow(/CHECK/);
    // Segments go with their recording.
    client
      .prepare(
        `insert into segments (id, recording_id, start_ms, end_ms, text, search_text) values (?, ?, ?, ?, ?, ?)`,
      )
      .run('s1', 'a', 0, 1000, 'Bonjour', 'bonjour');
    client.prepare(`delete from recordings where id = ?`).run('a');
    expect(client.prepare(`select count(*) as n from segments`).get()).toEqual({ n: 0 });
  },

  '0001_search': () => {
    const { client } = testDatabase();
    expect(names(client, 'table')).toEqual(
      expect.arrayContaining(['segments_fts', 'recordings_fts']),
    );
    expect(names(client, 'trigger')).toEqual([
      'segments_fts_delete',
      'segments_fts_insert',
      'segments_fts_update',
    ]);
    insertRecording(client, 'a');
    const match = (query: string) =>
      (
        client
          .prepare(
            `select s.id from segments_fts f join segments s on s.rowid = f.rowid where segments_fts match ?`,
          )
          .all(query) as { id: string }[]
      ).map((row) => row.id);
    client
      .prepare(
        `insert into segments (id, recording_id, start_ms, end_ms, text, search_text) values (?, ?, ?, ?, ?, ?)`,
      )
      .run('s1', 'a', 0, 1000, 'L’éléphant', 'l’elephant');
    expect(match('"elephant"*')).toEqual(['s1']);
    client.prepare(`update segments set search_text = ? where id = ?`).run('girafe', 's1');
    expect(match('"elephant"*')).toEqual([]);
    expect(match('"girafe"')).toEqual(['s1']);
    client.prepare(`delete from segments where id = ?`).run('s1');
    expect(match('"girafe"')).toEqual([]);
    // Titles: written and deleted by rowid, which contentless_delete allows.
    const rowid = (
      client.prepare(`select rowid from recordings where id = 'a'`).get() as {
        rowid: number;
      }
    ).rowid;
    client
      .prepare(`insert into recordings_fts (rowid, title_search) values (?, ?)`)
      .run(rowid, 'reunion');
    const titles = () =>
      client.prepare(`select rowid from recordings_fts where recordings_fts match 'reunion'`).all();
    expect(titles()).toHaveLength(1);
    client.prepare(`delete from recordings_fts where rowid = ?`).run(rowid);
    expect(titles()).toHaveLength(0);
  },
};

describe('migrations', () => {
  it('every migration of the journal has its test', () => {
    expect(journal.entries.map((entry) => entry.tag)).toEqual(Object.keys(MIGRATION_TESTS));
  });

  it.each(Object.keys(MIGRATION_TESTS))('%s', (tag) => {
    MIGRATION_TESTS[tag]!();
  });

  it('replaying the migrations changes nothing', () => {
    const client = new Database(':memory:');
    const db = drizzle(client);
    migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    const before = names(client, 'table');
    migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    expect(names(client, 'table')).toEqual(before);
    expect(client.prepare(`select count(*) as n from __drizzle_migrations`).get()).toEqual({
      n: journal.entries.length,
    });
  });
});
