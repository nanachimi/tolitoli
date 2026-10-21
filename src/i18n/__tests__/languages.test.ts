import { isRtl, resolveInitialLanguage, UI_LANGUAGES } from '../languages';

const locale = (languageTag: string) => ({
  languageTag,
  languageCode: languageTag.split('-')[0] ?? null,
});

describe('resolveInitialLanguage', () => {
  it('prefers the stored language', () => {
    expect(resolveInitialLanguage('wo', [locale('fr-FR')])).toBe('wo');
  });

  it('ignores an unknown stored value', () => {
    expect(resolveInitialLanguage('xx', [locale('de-DE')])).toBe('de');
  });

  it('uses the first supported device locale', () => {
    expect(resolveInitialLanguage(null, [locale('it-IT'), locale('ru-RU')])).toBe('ru');
  });

  it.each([
    ['zh-Hans-CN', 'zh-Hans'],
    ['zh-Hant-TW', 'zh-Hans'],
    ['zh-Hant-HK', 'zh-Hans'],
    ['zh-HK', 'zh-Hans'],
    ['de-AT', 'de'],
    ['ar-EG', 'ar'],
    ['en-NG', 'en'],
    ['fr-SN', 'fr'],
  ])('maps %s to %s', (tag, expected) => {
    expect(resolveInitialLanguage(null, [locale(tag)])).toBe(expected);
  });

  it('falls back to English', () => {
    expect(resolveInitialLanguage(null, [locale('ja-JP')])).toBe('en');
    expect(resolveInitialLanguage(null, [])).toBe('en');
  });

  it('works without languageCode', () => {
    expect(resolveInitialLanguage(null, [{ languageTag: 'ru-RU', languageCode: null }])).toBe('ru');
  });
});

describe('isRtl', () => {
  it('is true for Arabic only', () => {
    for (const { code } of UI_LANGUAGES) expect(isRtl(code)).toBe(code === 'ar');
    expect(isRtl('pseudo')).toBe(false);
  });
});
