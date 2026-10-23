import { openDatabase } from '@/db/client';
import { APP_DATABASE_NAME } from '@/features/settings/storage';
import { SqliteLibraryRepository } from '@/services/library';
import { demoItems, demoSegments } from '@/services/library/demo';

import { expoFs, recordingsRoot } from '../recording/expoFs';
import { describeForSearch } from './display';

/** The demo set's own file: switching to it never writes to tolitoli.db (owner, step 2). */
export const DEMO_DATABASE_NAME = 'tolitoli-demo.db';

export type LibraryDatabaseChoice = 'real' | 'demo';

/** Opens the real library, or the demo one (development only), migrated and ready. */
export async function openLibraryDatabase(
  choice: LibraryDatabaseChoice,
): Promise<SqliteLibraryRepository> {
  const demo = choice === 'demo';
  const db = await openDatabase(demo ? DEMO_DATABASE_NAME : APP_DATABASE_NAME);
  const repository = new SqliteLibraryRepository({
    db,
    fs: expoFs,
    root: recordingsRoot(),
    now: () => new Date(),
    demo,
    describeForSearch,
  });
  if (demo) repository.seedDemo(demoItems(new Date()), demoSegments);
  return repository;
}
