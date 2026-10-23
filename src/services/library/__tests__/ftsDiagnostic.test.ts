import { testDatabase } from '../../../db/__tests__/testDatabase';
import { MemoryFs } from '../../audio/__tests__/fakes';
import { formatFtsDiagnostic, runFtsDiagnostic } from '../ftsDiagnostic';
import { SqliteLibraryRepository } from '../sqlite';

describe('FTS diagnostic', () => {
  it('finds every check, and shows why Chinese needs its fallback', () => {
    const { db } = testDatabase();
    const repository = new SqliteLibraryRepository({
      db,
      fs: new MemoryFs(),
      root: 'r',
      now: () => new Date(),
    });
    const result = runFtsDiagnostic(repository, db);
    expect(result.checks.every((check) => check.found)).toBe(true);
    expect(result.rawChineseMidSentence).toBe(false);
    expect(formatFtsDiagnostic(result)).toContain('ln « mbote » → OK');
  });
});
