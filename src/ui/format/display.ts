/**
 * Display formats of the brand book (docs/design/README.md, Contenu): the timer
 * reads `00:42:17`, durations `42 min` / `1 h 12`, dates follow the locale.
 * Pure TypeScript; the translation function is passed in.
 */

export type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * Locale data used for dates when the interface language has none in the
 * platform's Intl (Wolof is written alongside French in Senegal). The
 * formatjs polyfill, if one is added after the device check, sits in front of
 * this fallback; it does not replace it.
 */
const DATE_LOCALE_FALLBACKS: Record<string, string[]> = {
  wo: ['wo', 'fr'],
  pseudo: ['en'],
};

export function dateLocale(language: string): string | undefined {
  if (typeof Intl === 'undefined' || typeof Intl.DateTimeFormat === 'undefined') return undefined;
  const candidates = [...(DATE_LOCALE_FALLBACKS[language] ?? [language]), 'en'];
  return Intl.DateTimeFormat.supportedLocalesOf(candidates)[0];
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** `HH:MM:SS` from the first second, so the timer never changes width (guide Timer). */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

/** `25 s`, `42 min`, `1 h 12`, `2 h`: whole units, never rounded up. */
export function formatDurationShort(ms: number, t: Translate): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  if (totalSeconds < 60) return t('format.seconds', { count: totalSeconds });
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return t('format.minutes', { count: totalMinutes });
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0
    ? t('format.hours', { count: hours })
    : t('format.hoursMinutes', { hours, minutes: pad(minutes) });
}

function format(date: Date, language: string, options: Intl.DateTimeFormatOptions): string | null {
  const locale = dateLocale(language);
  return locale ? new Intl.DateTimeFormat(locale, options).format(date) : null;
}

/** `09:31`, or the locale's own clock. */
export function formatTime(date: Date, language: string): string {
  return (
    format(date, language, { hour: '2-digit', minute: '2-digit' }) ??
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** `22 oct.` in French; the year only when it is not the current one. */
export function formatShortDate(date: Date, now: Date, language: string): string {
  const sameYear = date.getFullYear() === now.getFullYear();
  return (
    format(date, language, {
      day: 'numeric',
      month: 'short',
      ...(sameYear ? {} : { year: 'numeric' }),
    }) ?? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  );
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Group header of the Library: today, yesterday, then the date (guide RecordingCard). */
export function formatDayGroup(date: Date, now: Date, language: string, t: Translate): string {
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return t('format.today');
  if (days === 1) return t('format.yesterday');
  const sameYear = date.getFullYear() === now.getFullYear();
  return (
    format(date, language, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      ...(sameYear ? {} : { year: 'numeric' }),
    }) ?? formatShortDate(date, now, language)
  );
}

/** Same key for every day: recordings are grouped by local calendar day. */
export function dayKey(date: Date): number {
  return startOfDay(date);
}
