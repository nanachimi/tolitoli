import { getLocales } from 'expo-localization';
import Storage from 'expo-sqlite/kv-store';
import * as Updates from 'expo-updates';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DevSettings, I18nManager } from 'react-native';

import { isRtl, resolveInitialLanguage, UiLanguageCode, PSEUDO_LANGUAGE } from './languages';
import { resources } from './resources';

export const LANGUAGE_STORAGE_KEY = 'ui.language';

export const i18next = createInstance();

export type SelectableLanguage = UiLanguageCode | typeof PSEUDO_LANGUAGE;

async function reloadApp(): Promise<void> {
  if (__DEV__) {
    DevSettings.reload();
    return;
  }
  await Updates.reloadAsync();
}

/**
 * Aligns the native layout direction with the language. Direction changes only
 * apply after a reload (D-006); forceRTL persists, so this cannot loop.
 * Returns true when a reload was triggered.
 */
function applyDirection(language: string): boolean {
  const rtl = isRtl(language);
  if (I18nManager.isRTL === rtl) return false;
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  void reloadApp();
  return true;
}

/** Synchronous so the first frame is already translated. */
export function initI18n(): typeof i18next {
  if (i18next.isInitialized) return i18next;

  const stored = Storage.getItemSync(LANGUAGE_STORAGE_KEY);
  const language =
    __DEV__ && stored === PSEUDO_LANGUAGE ? stored : resolveInitialLanguage(stored, getLocales());

  void i18next.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: { 'zh-Hant': ['zh-Hans', 'en'], default: ['en'] },
    interpolation: { escapeValue: false },
    initAsync: false,
    returnNull: false,
  });

  applyDirection(language);
  return i18next;
}

export async function setUiLanguage(language: SelectableLanguage): Promise<void> {
  Storage.setItemSync(LANGUAGE_STORAGE_KEY, language);
  await i18next.changeLanguage(language);
  applyDirection(language);
}
