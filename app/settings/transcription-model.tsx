import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { useTranscriptionLanguage } from '@/features/settings/transcriptionLanguage';
import {
  DEFAULT_MODEL,
  DEVICE_MEMORY_BYTES,
  selectModel,
  useSelectedModel,
} from '@/features/transcription/model';
import {
  findTranscriptionLanguage,
  isNotYetAvailable,
  localQualityFor,
  type TranscriptionLanguageCode,
} from '@/services/transcription/languages';
import {
  MEASURED_MINUTES_PER_HOUR,
  MEASURED_PEAK_MB,
  modelFit,
} from '@/services/whisper/capability';
import { LOCAL_MODEL_IDS, modelBytes, type LocalModelId } from '@/services/whisper/models';
import { AppText, Banner, OptionGroup, OptionRow, Screen, ScreenHeader, space } from '@/ui';
import { formatBytes, type Translate } from '@/ui/format/display';

/** "moyenne", or why the language has no local quality: never a language without it. */
function qualityWord(code: TranscriptionLanguageCode, model: LocalModelId, t: Translate): string {
  const quality = localQualityFor(code, model);
  if (quality) return t(`quality.${quality}`);
  return t(
    isNotYetAvailable(code)
      ? 'settings.transcription.notYetAvailable'
      : 'settings.transcription.cloudRequired',
  );
}

/**
 * The local model (owner, step 3): tiny, base or small, each with its download size, its time
 * per hour of audio measured on the A05, and its expected quality for the transcription
 * language. base is the floor; small stays on offer, with a warning when it exceeds the phone.
 */
export default function TranscriptionModelScreen() {
  const { t, i18n } = useTranslation();
  const selected = useSelectedModel((state) => state.model);
  const languageCode = useTranscriptionLanguage((state) => state.code);
  const language = findTranscriptionLanguage(languageCode);
  const size = (bytes: number) => formatBytes(bytes, i18n.language, t);
  const exceeds = modelFit(selected, DEVICE_MEMORY_BYTES) === 'exceeds';
  const peak = MEASURED_PEAK_MB[selected];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title={t('settings.model.title')} onBack={() => router.back()} />
        <AppText variant="caption" color="ink-muted" style={styles.hint}>
          {t('settings.model.hint')}
        </AppText>
        {/* tiny by default only where base does not fit: say what it costs. */}
        {selected === 'tiny' && DEFAULT_MODEL === 'tiny' && language ? (
          <Banner
            kind="alert"
            title={t('settings.model.defaultTinyTitle')}
            body={t('settings.model.defaultTinyBody', {
              language: language.nativeName,
              quality: qualityWord(language.code, 'tiny', t),
            })}
          />
        ) : null}
        {exceeds && DEVICE_MEMORY_BYTES !== null && peak !== null ? (
          <Banner
            kind="alert"
            title={t('settings.model.warningTitle')}
            body={t('settings.model.warningBody', {
              memory: size(DEVICE_MEMORY_BYTES),
              model: selected,
              peak: size(peak * 1024 * 1024),
            })}
          />
        ) : null}
        <OptionGroup title={t('settings.model.title')} exclusive>
          {LOCAL_MODEL_IDS.map((model) => {
            const minutes = MEASURED_MINUTES_PER_HOUR[model];
            return (
              <OptionRow
                key={model}
                kind="radio"
                label={t('settings.model.label', {
                  model,
                  name: t(`settings.model.name.${model}`),
                })}
                description={t('settings.model.description', {
                  size: size(modelBytes(model)),
                  time:
                    minutes === null
                      ? t('settings.model.timeUnknown')
                      : t('settings.model.time', { minutes }),
                  language: language?.nativeName ?? '',
                  quality: language ? qualityWord(language.code, model, t) : '',
                })}
                checked={model === selected}
                accessibilityLabel={t('settings.model.optionA11y', { model })}
                onPress={() => selectModel(model)}
              />
            );
          })}
        </OptionGroup>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space['space-4'], gap: space['space-2'] },
  hint: { marginBottom: space['space-4'] },
});
