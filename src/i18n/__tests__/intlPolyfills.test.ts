/**
 * Reproduces Hermes on Android, where Intl.PluralRules is missing (D-012).
 * Node has full ICU, so without this test CI would never exercise the polyfill.
 */
type IntlPart = 'PluralRules' | 'Locale' | 'getCanonicalLocales';

const PARTS: IntlPart[] = ['PluralRules', 'Locale', 'getCanonicalLocales'];
const originals = new Map(PARTS.map((part) => [part, Intl[part]]));

function restoreIntl() {
  for (const [part, value] of originals) {
    Object.defineProperty(Intl, part, { value, configurable: true, writable: true });
  }
}

describe('Intl polyfills on an engine without Intl.PluralRules', () => {
  let t: (key: 'library.count', options: { count: number; lng: string }) => string;

  beforeAll(() => {
    for (const part of PARTS) Reflect.deleteProperty(Intl, part);
    expect(typeof Intl.PluralRules).toBe('undefined');

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module registry
      const { initI18n } = require('..') as typeof import('..');
      const i18n = initI18n();
      t = (key, options) => i18n.t(key, options);
    });
  });

  afterAll(restoreIntl);

  it('installs Intl.PluralRules', () => {
    expect(typeof Intl.PluralRules).toBe('function');
    expect(new Intl.PluralRules('ru').resolvedOptions().pluralCategories).toEqual(
      expect.arrayContaining(['one', 'few', 'many', 'other']),
    );
  });

  it.each([
    [1, '1 запись'],
    [2, '2 записи'],
    [5, '5 записей'],
    [11, '11 записей'],
    [21, '21 запись'],
  ])('Russian: %i → %s', (count, expected) => {
    expect(t('library.count', { count, lng: 'ru' })).toBe(expected);
  });

  it('Wolof uses its single CLDR form instead of falling back to English', () => {
    expect(t('library.count', { count: 1, lng: 'wo' })).toBe('1 baat yu ñu dénc');
    expect(t('library.count', { count: 5, lng: 'wo' })).toBe('5 baat yu ñu dénc');
  });

  it.each([
    [0, 'لا توجد تسجيلات'],
    [1, 'تسجيل واحد'],
    [2, 'تسجيلان'],
    [3, '3 تسجيلات'],
    [11, '11 تسجيلًا'],
    [100, '100 تسجيل'],
  ])('Arabic: %i → %s', (count, expected) => {
    expect(t('library.count', { count, lng: 'ar' })).toBe(expected);
  });

  it('covers the other UI languages', () => {
    expect(t('library.count', { count: 1, lng: 'fr' })).toBe('1 enregistrement');
    expect(t('library.count', { count: 2, lng: 'fr' })).toBe('2 enregistrements');
    expect(t('library.count', { count: 1, lng: 'de' })).toBe('1 Aufnahme');
    expect(t('library.count', { count: 2, lng: 'en' })).toBe('2 recordings');
    expect(t('library.count', { count: 1, lng: 'zh-Hans' })).toBe('1 条录音');
  });
});
