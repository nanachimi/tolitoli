/**
 * Hermes on Android ships without Intl.PluralRules (seen on device, step 0),
 * so i18next would fall back to English-style one/other plurals. CI runs on
 * Node with full ICU and never sees this (D-012). Must be imported before
 * i18next is initialised. Order matters: PluralRules relies on
 * getCanonicalLocales and on Intl.Locale for non-exact locale matching.
 */
import { shouldPolyfill as shouldPolyfillCanonicalLocales } from '@formatjs/intl-getcanonicallocales/should-polyfill.js';
import { shouldPolyfill as shouldPolyfillLocale } from '@formatjs/intl-locale/should-polyfill.js';
import { shouldPolyfill as shouldPolyfillPluralRules } from '@formatjs/intl-pluralrules/should-polyfill.js';

/** CLDR data names for the UI languages (zh-Hans uses the zh data). */
const PLURAL_DATA_LOCALES = ['fr', 'en', 'de', 'ru', 'ar', 'wo', 'zh'] as const;

/* eslint-disable @typescript-eslint/no-require-imports -- conditional loading: devices with a
   native implementation must not pay for (or be overridden by) the polyfill. */
export function installIntlPolyfills(): void {
  if (shouldPolyfillCanonicalLocales()) {
    require('@formatjs/intl-getcanonicallocales/polyfill-force.js');
  }
  if (shouldPolyfillLocale()) {
    require('@formatjs/intl-locale/polyfill-force.js');
  }
  if (PLURAL_DATA_LOCALES.some((locale) => shouldPolyfillPluralRules(locale))) {
    // Replace the whole implementation so every UI language follows the same rules.
    require('@formatjs/intl-pluralrules/polyfill-force.js');
    require('@formatjs/intl-pluralrules/locale-data/fr.js');
    require('@formatjs/intl-pluralrules/locale-data/en.js');
    require('@formatjs/intl-pluralrules/locale-data/de.js');
    require('@formatjs/intl-pluralrules/locale-data/ru.js');
    require('@formatjs/intl-pluralrules/locale-data/ar.js');
    require('@formatjs/intl-pluralrules/locale-data/wo.js');
    require('@formatjs/intl-pluralrules/locale-data/zh.js');
  }
}
/* eslint-enable @typescript-eslint/no-require-imports */

installIntlPolyfills();
