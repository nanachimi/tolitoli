import type { LibraryItem } from '@/services/library';
import { formatShortDate, formatTime, type Translate } from '@/ui/format/display';

/** The item's own title, or "Enregistrement du 12 mars 14:05" when it has none. */
export function itemTitle(item: LibraryItem, now: Date, language: string, t: Translate): string {
  if (item.title) return item.title;
  const created = new Date(item.createdAt);
  const date = `${formatShortDate(created, now, language)} ${formatTime(created, language)}`;
  return t('library.cardTitle', { date });
}
