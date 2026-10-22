import { i18next, initI18n } from '@/i18n';
import {
  dateLocale,
  dayKey,
  formatClock,
  formatDayGroup,
  formatDurationShort,
  formatShortDate,
  formatTime,
} from '@/ui/format/display';

initI18n();
const t = i18next.t.bind(i18next) as (key: string, options?: Record<string, unknown>) => string;

describe('display formats (brand book)', () => {
  afterEach(async () => {
    await i18next.changeLanguage('fr');
  });

  it.each([
    [0, '00:00:00'],
    [999, '00:00:00'],
    [65_000, '00:01:05'],
    [2 * 3600_000 + 42 * 60_000 + 17_000, '02:42:17'],
    [-5, '00:00:00'],
  ])('formats %d ms on the timer as %s', (ms, expected) => {
    expect(formatClock(ms)).toBe(expected);
  });

  it.each([
    [25_000, '25 s'],
    [42 * 60_000 + 59_000, '42 min'],
    [3600_000, '1 h'],
    [72 * 60_000, '1 h 12'],
    [125 * 60_000, '2 h 05'],
  ])('formats a %d ms duration as %s in French', async (ms, expected) => {
    await i18next.changeLanguage('fr');
    expect(formatDurationShort(ms, t)).toBe(expected);
  });

  it('translates duration units (Russian plurals)', async () => {
    await i18next.changeLanguage('ru');
    expect(formatDurationShort(5 * 60_000, t)).toBe('5 мин');
  });

  it('formats time and short date with the locale', () => {
    const date = new Date(2026, 9, 22, 9, 31);
    expect(formatTime(date, 'fr')).toBe('09:31');
    expect(formatShortDate(date, new Date(2026, 9, 23), 'fr')).toBe('22 oct.');
    expect(formatShortDate(date, new Date(2027, 0, 2), 'fr')).toBe('22 oct. 2026');
  });

  it('groups by calendar day: today, yesterday, then the date', async () => {
    const now = new Date(2026, 9, 22, 0, 5);
    expect(formatDayGroup(new Date(2026, 9, 22, 0, 1), now, 'fr', t)).toBe('Aujourd’hui');
    expect(formatDayGroup(new Date(2026, 9, 21, 23, 59), now, 'fr', t)).toBe('Hier');
    expect(formatDayGroup(new Date(2026, 9, 19, 12), now, 'fr', t)).toBe('lundi 19 octobre');
    expect(dayKey(new Date(2026, 9, 22, 8))).toBe(dayKey(new Date(2026, 9, 22, 23)));
  });

  it('falls back to French dates when the platform has no Wolof data', () => {
    const supported = jest
      .spyOn(Intl.DateTimeFormat, 'supportedLocalesOf')
      .mockImplementation((locales) =>
        ([locales ?? []].flat() as string[]).filter((l) => l !== 'wo'),
      );
    expect(dateLocale('wo')).toBe('fr');
    expect(dateLocale('ar')).toBe('ar');
    supported.mockRestore();
  });

  it('still prints a time without Intl.DateTimeFormat (Hermes without Intl)', () => {
    const original = Intl.DateTimeFormat;
    // @ts-expect-error simulating an engine without the API
    Intl.DateTimeFormat = undefined;
    try {
      expect(formatTime(new Date(2026, 9, 22, 9, 5), 'fr')).toBe('09:05');
    } finally {
      Intl.DateTimeFormat = original;
    }
  });
});
