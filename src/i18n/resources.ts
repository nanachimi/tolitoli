import ar from './ar.json';
import de from './de.json';
import en from './en.json';
import fr from './fr.json';
import type { UiLanguageCode } from './languages';
import { PSEUDO_LANGUAGE } from './languages';
import { pseudoLocalize } from './pseudo';
import ru from './ru.json';
import wo from './wo.json';
import zhHans from './zh-Hans.json';

export const translations: Record<UiLanguageCode, object> = {
  fr,
  en,
  de,
  ru,
  ar,
  wo,
  'zh-Hans': zhHans,
};

export const sourceTranslation = fr;

export const resources = {
  ...Object.fromEntries(
    Object.entries(translations).map(([code, translation]) => [code, { translation }]),
  ),
  [PSEUDO_LANGUAGE]: { translation: pseudoLocalize(fr) },
};
