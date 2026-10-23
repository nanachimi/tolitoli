import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { useRef, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View, type HostInstance } from 'react-native';

import { isDemoDataEnabled, setDemoDataEnabled, useLibrary } from '@/features/library/library';
import { totalBytes } from '@/features/library/storage';
import { useTranscriptionLanguage } from '@/features/settings/transcriptionLanguage';
import { useReturnFocus } from '@/features/settings/useReturnFocus';
import { findTranscriptionLanguage } from '@/services/transcription/languages';
import { AppText, OptionGroup, OptionRow, Screen, space } from '@/ui';
import { formatBytes, type Translate } from '@/ui/format/display';

import { interfaceLanguageOptions } from '../settings/interface-language';

const PLURAL_SAMPLES = [0, 1, 2, 5, 11, 21, 100];

/** The interface language in its own name ("Français"), as the sub-screen lists it. */
function currentLanguageName(code: string): string {
  return interfaceLanguageOptions().find((option) => option.code === code)?.nativeName ?? code;
}

/** "Kiswahili · brouillon", or "Wolof · cloud requis" when there is no local engine. */
export function transcriptionLanguageSummary(code: string, t: Translate): string {
  const language = findTranscriptionLanguage(code);
  if (!language) return '';
  const quality = language.localQuality
    ? t(`quality.${language.localQuality}`)
    : t('settings.transcription.cloudRequired');
  return t('quality.withLanguage', { language: language.nativeName, quality });
}

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const openedFrom = useReturnFocus();
  const interfaceRow = useRef<HostInstance>(null);
  const transcriptionRow = useRef<HostInstance>(null);
  const storageRow = useRef<HostInstance>(null);
  const aboutRow = useRef<HostInstance>(null);
  const open = (row: RefObject<HostInstance | null>, path: Href) => {
    openedFrom(row.current);
    router.push(path);
  };
  const library = useLibrary();
  const transcriptionLanguage = useTranscriptionLanguage((state) => state.code);
  const usedBytes = totalBytes([...library.list(), ...library.listTrash()]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="title" accessibilityRole="header" style={styles.title}>
          {t('settings.title')}
        </AppText>

        <OptionGroup title={t('settings.language.title')}>
          <OptionRow
            ref={interfaceRow}
            kind="link"
            label={t('settings.language.title')}
            description={currentLanguageName(i18n.language)}
            onPress={() => open(interfaceRow, '/settings/interface-language')}
          />
        </OptionGroup>

        <OptionGroup title={t('settings.transcription.title')}>
          <OptionRow
            kind="link"
            ref={transcriptionRow}
            label={t('settings.transcription.language')}
            description={transcriptionLanguageSummary(transcriptionLanguage, t)}
            onPress={() => open(transcriptionRow, '/settings/transcription-language')}
          />
        </OptionGroup>

        <OptionGroup title={t('storage.title')}>
          <OptionRow
            ref={storageRow}
            kind="link"
            label={t('storage.title')}
            description={t('settings.storage.used', {
              size: formatBytes(usedBytes, i18n.language, t),
            })}
            onPress={() => open(storageRow, '/settings/storage')}
          />
        </OptionGroup>

        <OptionGroup title={t('settings.about.title')}>
          <OptionRow
            ref={aboutRow}
            kind="link"
            label={t('settings.about.title')}
            description={t('settings.about.version', {
              version: Constants.expoConfig?.version ?? '',
            })}
            onPress={() => open(aboutRow, '/settings/about')}
          />
        </OptionGroup>

        {__DEV__ ? (
          <View style={styles.dev}>
            <OptionGroup title={t('dev.title')}>
              <OptionRow
                kind="switch"
                label={t('settings.dev.demo')}
                description={t(
                  isDemoDataEnabled() ? 'settings.dev.demoOn' : 'settings.dev.demoOff',
                )}
                checked={isDemoDataEnabled()}
                onPress={() => setDemoDataEnabled(!isDemoDataEnabled())}
              />
            </OptionGroup>
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
  hint: { marginBottom: space['space-6'] },
  dev: { marginTop: space['space-2'], gap: space['space-2'] },
});
