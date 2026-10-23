import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { library } from '@/features/library/library';
import {
  setTranscriptionLanguage,
  useTranscriptionLanguage,
} from '@/features/settings/transcriptionLanguage';
import { CloudRequiredDialog } from '@/features/transcription/CloudRequiredDialog';
import { LOCAL_MODEL } from '@/features/transcription/model';
import { transcribeRecording } from '@/features/transcription/transcription';
import {
  findTranscriptionLanguage,
  isNotYetAvailable,
  localQualityFor,
  requiresCloud,
  TRANSCRIPTION_LANGUAGES,
  type TranscriptionLanguageCode,
} from '@/services/transcription/languages';
import { AppText, Banner, OptionGroup, OptionRow, Screen, ScreenHeader, space } from '@/ui';

/**
 * The spoken language of recordings; it picks the engine, never automatic detection. With a
 * `recording` parameter, the language of that recording only: its transcript is redone
 * (step 3), the previous one staying until the new one is ready.
 */
export default function TranscriptionLanguageScreen() {
  const { t } = useTranslation();
  const { recording } = useLocalSearchParams<{ recording?: string }>();
  const setting = useTranscriptionLanguage((state) => state.code);
  const item = recording ? library.get(recording) : undefined;
  const [chosen, setChosen] = useState<TranscriptionLanguageCode>(
    (item?.language as TranscriptionLanguageCode | null | undefined) ?? setting,
  );
  const [dialog, setDialog] = useState(false);
  const current = recording ? chosen : setting;
  const cloudOnly = requiresCloud(current);
  const notYet = isNotYetAvailable(current);
  const currentName = findTranscriptionLanguage(current)?.nativeName ?? '';

  const choose = (code: TranscriptionLanguageCode) => {
    if (!recording) {
      setTranscriptionLanguage(code);
      return;
    }
    setChosen(code);
    // Same language as the transcript already there: nothing to redo.
    if (code === item?.language && item.state !== 'audio') return;
    // A language with no engine on the device stays here, with the banner that says why.
    if (transcribeRecording(recording, code) === 'queued') router.back();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title={t(
            recording
              ? 'settings.transcription.forRecording.title'
              : 'settings.transcription.language',
          )}
          onBack={() => router.back()}
        />
        <AppText variant="caption" color="ink-muted" style={styles.hint}>
          {t(
            recording ? 'settings.transcription.forRecording.hint' : 'settings.transcription.hint',
          )}
        </AppText>
        {notYet ? (
          <Banner
            kind="alert"
            title={t('settings.transcription.notYetBanner.title')}
            body={t('settings.transcription.notYetBanner.body', { language: currentName })}
          />
        ) : null}
        {cloudOnly ? (
          <Banner
            kind="alert"
            title={t('settings.transcription.cloudBanner.title')}
            body={t('settings.transcription.cloudBanner.body', { language: currentName })}
            action={{ label: t('detail.cloudRequired.action'), onPress: () => setDialog(true) }}
          />
        ) : null}
        <OptionGroup title={t('settings.transcription.title')} exclusive>
          {TRANSCRIPTION_LANGUAGES.map((language) => {
            const quality = localQualityFor(language.code, LOCAL_MODEL);
            return (
              <OptionRow
                key={language.code}
                kind="radio"
                label={language.nativeName}
                labelIsData
                // Never a language without its quality, or the reason it has none (CLAUDE.md).
                description={
                  quality
                    ? t('settings.transcription.qualityLocal', { quality: t(`quality.${quality}`) })
                    : isNotYetAvailable(language.code)
                      ? t('settings.transcription.notYetAvailableLong')
                      : t('settings.transcription.cloudRequiredLong')
                }
                checked={language.code === current}
                accessibilityLabel={t('settings.transcription.optionA11y', {
                  language: language.nativeName,
                })}
                onPress={() => choose(language.code)}
              />
            );
          })}
        </OptionGroup>
      </ScrollView>
      {/* "Choose another language" closes the dialog: the list is right here. */}
      <CloudRequiredDialog
        visible={dialog}
        language={currentName}
        onClose={() => setDialog(false)}
        onChooseLanguage={() => setDialog(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space['space-4'], gap: space['space-2'] },
  hint: { marginBottom: space['space-4'] },
});
