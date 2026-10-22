import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { setUiLanguage, type SelectableLanguage } from '@/i18n';
import { isRtl, PSEUDO_LANGUAGE, UI_LANGUAGES } from '@/i18n/languages';
import { AppText, OptionGroup, OptionRow, Screen, space } from '@/ui';

/** Lets the restart notice show before a direction change reloads the app. */
const RESTART_NOTICE_MS = 1000;

const PLURAL_SAMPLES = [0, 1, 2, 5, 11, 21, 100];

type Option = { code: SelectableLanguage; nativeName: string };

const OPTIONS: Option[] = __DEV__
  ? [...UI_LANGUAGES, { code: PSEUDO_LANGUAGE, nativeName: 'Pseudo' }]
  : [...UI_LANGUAGES];

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const [restarting, setRestarting] = useState(false);

  const select = (code: SelectableLanguage) => {
    if (code === i18n.language) return;
    if (isRtl(code) !== isRtl(i18n.language)) {
      setRestarting(true);
      setTimeout(() => void setUiLanguage(code), RESTART_NOTICE_MS);
      return;
    }
    void setUiLanguage(code);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="title" accessibilityRole="header" style={styles.title}>
          {t('settings.title')}
        </AppText>

        <OptionGroup title={t('settings.language.title')} exclusive>
          {OPTIONS.map((option) => (
            <OptionRow
              key={option.code}
              kind="radio"
              label={option.nativeName}
              labelIsData
              // Says it before choosing: this language flips the writing direction and restarts.
              description={
                isRtl(option.code) !== isRtl(i18n.language)
                  ? t('settings.language.restartRtl')
                  : undefined
              }
              checked={option.code === i18n.language}
              disabled={restarting}
              accessibilityLabel={t('settings.language.optionA11y', {
                language: option.nativeName,
              })}
              onPress={() => select(option.code)}
            />
          ))}
        </OptionGroup>
        <AppText variant="caption" color="ink-muted">
          {t('settings.language.hint')}
        </AppText>

        {restarting ? (
          <AppText accessibilityLiveRegion="polite">{t('settings.language.restartRtl')}</AppText>
        ) : null}

        {__DEV__ ? (
          <View style={styles.dev}>
            <AppText variant="overline" color="ink-muted" accessibilityRole="header">
              {t('dev.title')}
            </AppText>
            <AppText color="ink-muted">{t('dev.pluralTitle')}</AppText>
            {PLURAL_SAMPLES.map((count) => (
              <AppText key={count}>{t('library.count', { count })}</AppText>
            ))}
            <AppText testID="i18n-data" variant="timestamp" color="ink-muted">
              {pluralDiagnostic(i18n.language)}
            </AppText>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/** Shows what Hermes' Intl reports, since CI (Node) always has full ICU. */
function pluralDiagnostic(language: string): string {
  if (typeof Intl === 'undefined' || typeof Intl.PluralRules === 'undefined') {
    return 'Intl.PluralRules: unavailable';
  }
  try {
    const options = new Intl.PluralRules(language).resolvedOptions();
    const source = 'polyfilled' in Intl.PluralRules ? 'polyfill' : 'native';
    return `Intl.PluralRules(${language}) [${source}] → ${options.locale}: ${options.pluralCategories.join(', ')}`;
  } catch (error) {
    return `Intl.PluralRules(${language}): ${String(error)}`;
  }
}

const styles = StyleSheet.create({
  content: { padding: space['space-4'], paddingTop: space['space-8'], gap: space['space-2'] },
  title: { marginBottom: space['space-4'] },
  dev: { marginTop: space['space-6'], gap: space['space-2'] },
});
