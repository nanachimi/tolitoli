import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { setUiLanguage, type SelectableLanguage } from '@/i18n';
import { isRtl, PSEUDO_LANGUAGE, UI_LANGUAGES } from '@/i18n/languages';
import { AppText, OptionGroup, OptionRow, Screen, ScreenHeader, space } from '@/ui';

/** Lets the restart notice show before a direction change reloads the app. */
const RESTART_NOTICE_MS = 1000;

type Option = { code: SelectableLanguage; nativeName: string };

/** The pseudo-locale exists in development only: `__DEV__` is false in every release bundle. */
export function interfaceLanguageOptions(dev: boolean = __DEV__): Option[] {
  return dev
    ? [...UI_LANGUAGES, { code: PSEUDO_LANGUAGE, nativeName: 'Pseudo' }]
    : [...UI_LANGUAGES];
}

/** Each language written in its own name, chosen at the first tap (guide OptionRow). */
export default function InterfaceLanguageScreen() {
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
        <ScreenHeader title={t('settings.language.title')} onBack={() => router.back()} />
        <AppText variant="caption" color="ink-muted" style={styles.hint}>
          {t('settings.language.hint')}
        </AppText>
        <OptionGroup title={t('settings.language.available')} exclusive>
          {interfaceLanguageOptions().map((option) => (
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
        {restarting ? (
          <AppText accessibilityLiveRegion="polite">{t('settings.language.restartRtl')}</AppText>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space['space-4'], gap: space['space-2'] },
  hint: { marginBottom: space['space-4'] },
});
