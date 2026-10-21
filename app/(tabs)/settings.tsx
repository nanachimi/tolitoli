import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { setUiLanguage, type SelectableLanguage } from '@/i18n';
import { isRtl, PSEUDO_LANGUAGE, UI_LANGUAGES } from '@/i18n/languages';
import { AppText, Screen, spacing, radius, useTheme } from '@/ui';

/** Lets the restart notice show before a direction change reloads the app. */
const RESTART_NOTICE_MS = 1000;

const PLURAL_SAMPLES = [0, 1, 2, 5, 11, 21, 100];

type Option = { code: SelectableLanguage; nativeName: string };

const OPTIONS: Option[] = __DEV__
  ? [...UI_LANGUAGES, { code: PSEUDO_LANGUAGE, nativeName: 'Pseudo' }]
  : [...UI_LANGUAGES];

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
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
        <AppText variant="title" accessibilityRole="header">
          {t('settings.language.title')}
        </AppText>
        <AppText muted>{t('settings.language.hint')}</AppText>

        <View accessibilityRole="radiogroup" style={styles.group}>
          {OPTIONS.map((option) => {
            const selected = option.code === i18n.language;
            return (
              <Pressable
                key={option.code}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected, disabled: restarting }}
                accessibilityLabel={t('settings.language.optionA11y', {
                  language: option.nativeName,
                })}
                disabled={restarting}
                onPress={() => select(option.code)}
                style={[
                  styles.option,
                  {
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
              >
                {/* Language names are data, written in their own language. */}
                <AppText testID="i18n-data">{option.nativeName}</AppText>
              </Pressable>
            );
          })}
        </View>

        {restarting ? (
          <AppText accessibilityLiveRegion="polite">{t('settings.language.restartRtl')}</AppText>
        ) : null}

        {__DEV__ ? (
          <View style={styles.group}>
            <AppText variant="title" accessibilityRole="header">
              {t('dev.title')}
            </AppText>
            <AppText muted>{t('dev.pluralTitle')}</AppText>
            {PLURAL_SAMPLES.map((count) => (
              <AppText key={count}>{t('library.count', { count })}</AppText>
            ))}
            <AppText testID="i18n-data" muted>
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
    return `Intl.PluralRules(${language}) → ${options.locale}: ${options.pluralCategories.join(', ')}`;
  } catch (error) {
    return `Intl.PluralRules(${language}): ${String(error)}`;
  }
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  group: { gap: spacing.sm },
  option: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderRadius: radius.md,
  },
});
