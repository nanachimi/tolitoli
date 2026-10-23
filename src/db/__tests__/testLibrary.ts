import { describeForSearch } from '../../features/library/display';
import { MemoryFs } from '../../services/audio/__tests__/fakes';
import { demoItems, demoSegments } from '../../services/library/demo';
import { SqliteLibraryRepository } from '../../services/library/sqlite';
import { testDatabase } from './testDatabase';

export const TEST_RECORDINGS_ROOT = 'doc/recordings';

/**
 * What openLibraryDatabase gives the app, on an in-memory database: empty for `real`,
 * seeded with the demo set for `demo`. Its files are in memory too.
 */
export function openTestLibrary(choice: 'real' | 'demo', fs = new MemoryFs()) {
  const { db } = testDatabase();
  const repository = new SqliteLibraryRepository({
    db,
    fs,
    root: TEST_RECORDINGS_ROOT,
    now: () => new Date(),
    demo: choice === 'demo',
    describeForSearch,
  });
  if (choice === 'demo') repository.seedDemo(demoItems(new Date()), demoSegments);
  return repository;
}
