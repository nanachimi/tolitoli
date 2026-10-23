import { sql } from 'drizzle-orm';

import type { LibraryDatabase, SqliteLibraryRepository } from './sqlite';

/** Searches the plan asks to verify on the device (docs/plans/step-2.md). */
export const FTS_CHECKS = [
  { language: 'fr', text: 'L’éléphant traverse la rue.', query: 'elephant' },
  { language: 'wo', text: 'Ñaata la ? Ŋangu na ci kanam.', query: 'naata' },
  { language: 'wo', text: 'Ñaata la ? Ŋangu na ci kanam.', query: 'nangu' },
  { language: 'ln', text: 'Mbɔ́tɛ na bino, tokobanda.', query: 'mbote' },
  { language: 'zh', text: '今天我们开会讨论预算。', query: '讨论' },
  { language: 'zh', text: '今天我们开会讨论预算。', query: '预算' },
] as const;

export type FtsCheckResult = { language: string; query: string; found: boolean };

export type FtsDiagnostic = {
  checks: FtsCheckResult[];
  /** unicode61 alone on Chinese, mid-sentence: expected false, hence the LIKE fallback. */
  rawChineseMidSentence: boolean;
};

/** Runs the checks on an empty database through the real repository API. */
export function runFtsDiagnostic(
  repository: SqliteLibraryRepository,
  db: LibraryDatabase,
): FtsDiagnostic {
  FTS_CHECKS.forEach((check, index) => {
    const id = `fts-check-${index}`;
    repository.createRecording({ id, createdAt: new Date(0).toISOString() });
    repository.finalizeRecording(id, {
      audioPath: null,
      audioSize: null,
      audioFormat: null,
      durationMs: 1000,
      recovered: false,
    });
    repository.queueTranscription(id, { language: check.language, engine: 'local', model: null });
    repository.startTranscription(id);
    repository.saveTranscript(id, [{ startMs: 0, endMs: 1000, speaker: null, text: check.text }], {
      quality: null,
    });
  });
  const checks = FTS_CHECKS.map((check, index) => ({
    language: check.language,
    query: check.query,
    found: repository.search(check.query).some((item) => item.id === `fts-check-${index}`),
  }));
  const raw = db.all<{ n: number }>(
    sql`select count(*) as n from segments_fts where segments_fts match ${'"讨论"*'}`,
  );
  return { checks, rawChineseMidSentence: (raw[0]?.n ?? 0) > 0 };
}

export function formatFtsDiagnostic(result: FtsDiagnostic): string {
  const lines = result.checks.map(
    (check) => `${check.language} « ${check.query} » → ${check.found ? 'OK' : 'NOT FOUND'}`,
  );
  lines.push(
    `zh unicode61 alone, mid-sentence → ${result.rawChineseMidSentence ? 'found' : 'not found (LIKE fallback)'}`,
  );
  return lines.join('\n');
}
