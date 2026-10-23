import { openDatabase } from '@/db/client';
import { formatFtsDiagnostic, runFtsDiagnostic } from '@/services/library/ftsDiagnostic';
import { SqliteLibraryRepository } from '@/services/library';

import { expoFs, recordingsRoot } from '../recording/expoFs';

/** Development only: the FTS checks on an in-memory database, with the app's own SQLite. */
export async function deviceFtsDiagnostic(): Promise<string> {
  const db = await openDatabase(':memory:');
  const repository = new SqliteLibraryRepository({
    db,
    fs: expoFs,
    root: recordingsRoot(),
    now: () => new Date(),
  });
  return formatFtsDiagnostic(runFtsDiagnostic(repository, db));
}
