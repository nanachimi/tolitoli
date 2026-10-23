import { i18next } from '@/i18n';
import type { LibraryItem } from '@/services/library';
import type { TitleIndexEntry } from '@/services/library/sqlite';
import { dateSearchWords, formatShortDate, formatTime, type Translate } from '@/ui/format/display';

/** The item's own title, or "Enregistrement du 12 mars 14:05" when it has none. */
export function itemTitle(
  item: Pick<LibraryItem, 'title' | 'createdAt'>,
  now: Date,
  language: string,
  t: Translate,
): string {
  if (item.title) return item.title;
  const created = new Date(item.createdAt);
  const date = `${formatShortDate(created, now, language)} ${formatTime(created, language)}`;
  return t('library.cardTitle', { date });
}

/**
 * What the title index holds for a recording: the title as displayed (typed, or the
 * default one) and the words of its date, in the interface language (owner, step 2).
 */
export function describeForSearch(entry: TitleIndexEntry): string {
  const language = i18next.language;
  const created = new Date(entry.createdAt);
  const title = itemTitle(
    { title: entry.title, createdAt: created.toISOString() },
    new Date(),
    language,
    i18next.t,
  );
  return `${title} ${dateSearchWords(created, language)}`;
}
