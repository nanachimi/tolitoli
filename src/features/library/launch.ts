import { settingsStorage as Storage } from '@/features/settings/storage';
import { i18next } from '@/i18n';

import { recoverAtLaunch } from '../recording/recordingController';
import { startTranscription } from '../transcription/transcription';
import { getLibrary, openLibrary } from './library';

/** Language the title index was built in: its date words depend on it. */
export const TITLES_LANGUAGE_STORAGE_KEY = 'search.titlesLanguage';

function reindexTitles(language: string): void {
  getLibrary().reindexTitles();
  Storage.setItemSync(TITLES_LANGUAGE_STORAGE_KEY, language);
}

/**
 * The index follows the interface language: at launch if it changed or if it lacks rows
 * (a launch cut short, or a development reload), and on every change of language.
 */
export function keepTitleIndexInLanguage(): void {
  if (
    Storage.getItemSync(TITLES_LANGUAGE_STORAGE_KEY) !== i18next.language ||
    !getLibrary().titleIndexIsComplete()
  ) {
    reindexTitles(i18next.language);
  }
  i18next.off('languageChanged', reindexTitles);
  i18next.on('languageChanged', reindexTitles);
}

/**
 * Launch order (docs/plans/step-2.md): database open and migrated, recordings recovered
 * and reconciled, then the trash purge — at launch and nowhere else — and the transcription
 * queue, which resumes what was queued or cut while running (step 3).
 */
export async function startLibrary(): Promise<void> {
  await openLibrary();
  keepTitleIndexInLanguage();
  await recoverAtLaunch();
  const purged = getLibrary().purgeExpiredTrash();
  if (purged.length > 0) console.log('[library] purged', purged.join(', '));
  startTranscription();
}
