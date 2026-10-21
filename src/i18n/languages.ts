export type UiLanguageCode = 'fr' | 'en' | 'de' | 'ru' | 'ar' | 'wo' | 'zh-Hans';

export type UiLanguage = {
  code: UiLanguageCode;
  /** Name written in the language itself, shown as-is in the picker. */
  nativeName: string;
  dir: 'ltr' | 'rtl';
};

export const UI_LANGUAGES: readonly UiLanguage[] = [
  { code: 'fr', nativeName: 'Français', dir: 'ltr' },
  { code: 'en', nativeName: 'English', dir: 'ltr' },
  { code: 'de', nativeName: 'Deutsch', dir: 'ltr' },
  { code: 'ru', nativeName: 'Русский', dir: 'ltr' },
  { code: 'ar', nativeName: 'العربية', dir: 'rtl' },
  { code: 'wo', nativeName: 'Wolof', dir: 'ltr' },
  { code: 'zh-Hans', nativeName: '简体中文', dir: 'ltr' },
];

/** Development-only locale generated from fr.json to catch hard-coded strings. */
export const PSEUDO_LANGUAGE = 'pseudo';

export const FALLBACK_LANGUAGE: UiLanguageCode = 'en';

export function isUiLanguageCode(value: string | null | undefined): value is UiLanguageCode {
  return UI_LANGUAGES.some((language) => language.code === value);
}

export function isRtl(code: string): boolean {
  return UI_LANGUAGES.find((language) => language.code === code)?.dir === 'rtl';
}

/** Subset of expo-localization's Locale used for resolution. */
export type DeviceLocale = {
  languageTag: string;
  languageCode: string | null;
};

/**
 * Picks the UI language: stored choice first, then the first supported device
 * locale, then English. Any Chinese locale (Hans or Hant) maps to zh-Hans,
 * which Traditional readers understand better than English (D-008). Wolof is
 * never a system locale, so it is only reachable through the in-app picker.
 */
export function resolveInitialLanguage(
  stored: string | null,
  deviceLocales: readonly DeviceLocale[],
): UiLanguageCode {
  if (isUiLanguageCode(stored)) return stored;

  for (const locale of deviceLocales) {
    const code = (locale.languageCode ?? locale.languageTag.split('-')[0] ?? '').toLowerCase();
    if (code === 'zh') return 'zh-Hans';
    if (isUiLanguageCode(code)) return code;
  }

  return FALLBACK_LANGUAGE;
}
