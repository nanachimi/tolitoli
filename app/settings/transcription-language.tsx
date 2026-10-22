import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import {
  setTranscriptionLanguage,
  useTranscriptionLanguage,
} from '@/features/settings/transcriptionLanguage';
import { TRANSCRIPTION_LANGUAGES } from '@/services/transcription/languages';
import { AppText, OptionGroup, OptionRow, Screen, ScreenHeader, space } from '@/ui';

/** The spoken language of recordings; it picks the engine, never automatic detection. */
export default function TranscriptionLanguageScreen() {
  const { t } = useTranslation();
  const current = useTranscriptionLanguage((state) => state.code);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title={t('settings.transcription.language')} onBack={() => router.back()} />
        <AppText variant="caption" color="ink-muted" style={styles.hint}>
          {t('settings.transcription.hint')}
        </AppText>
        <OptionGroup title={t('settings.transcription.title')} exclusive>
          {TRANSCRIPTION_LANGUAGES.map((language) => (
            <OptionRow
              key={language.code}
              kind="radio"
              label={language.nativeName}
              labelIsData
              // Never a language without its quality, or the reason it has none (CLAUDE.md).
              description={
                language.localQuality
                  ? t('settings.transcription.qualityLocal', {
                      quality: t(`quality.${language.localQuality}`),
                    })
                  : t('settings.transcription.cloudRequiredLong')
              }
              checked={language.code === current}
              accessibilityLabel={t('settings.transcription.optionA11y', {
                language: language.nativeName,
              })}
              onPress={() => setTranscriptionLanguage(language.code)}
            />
          ))}
        </OptionGroup>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space['space-4'], gap: space['space-2'] },
  hint: { marginBottom: space['space-4'] },
});
