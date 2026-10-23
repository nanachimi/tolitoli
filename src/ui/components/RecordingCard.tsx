import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { QualityChip, type Quality } from './QualityChip';

export type RecordingCardState = 'audio' | 'transcribing' | 'transcribed' | 'synced' | 'failed';

const STATE_ICON: Record<RecordingCardState, IconName> = {
  audio: 'mic',
  transcribing: 'clock',
  transcribed: 'file-text',
  synced: 'cloud',
  failed: 'alert-triangle',
};

export type RecordingCardProps = {
  recording: {
    title: string;
    /** Already formatted for the locale: "09:31". */
    time: string;
    /** Already formatted: "42 min". */
    duration: string;
    state: RecordingCardState;
    language?: string;
    quality?: Quality;
    recovered: boolean;
  };
  /** Whole-card label for screen readers (title, date, duration, recovered). */
  accessibilityLabel: string;
  /** Opens the recording; the chevron only shows when there is somewhere to go. */
  onPress?: () => void;
  onLongPress?: () => void;
  /** Says what the long press opens, since nothing on screen shows it. */
  accessibilityHint?: string;
};

/** A Library row (guide RecordingCard). */
export function RecordingCard({
  recording,
  accessibilityLabel,
  onPress,
  onLongPress,
  accessibilityHint,
}: RecordingCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const interactive = onPress !== undefined;
  return (
    <Pressable
      accessible
      accessibilityRole={interactive ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      disabled={!interactive && !onLongPress}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.card,
        {
          gap: theme.space['space-3'],
          paddingVertical: theme.space['space-3'],
          paddingHorizontal: theme.space['space-4'],
          borderRadius: theme.radius['radius-md'],
          backgroundColor: theme.color['surface-raised'],
          borderColor: theme.color.hairline,
          minHeight: theme.size['control-md'],
        },
      ]}
    >
      <Icon
        name={STATE_ICON[recording.state]}
        color={recording.state === 'failed' ? 'danger' : 'ink-muted'}
      />
      <View style={[styles.text, { gap: theme.space['space-1'] }]}>
        <AppText variant="heading" numberOfLines={2}>
          {recording.title}
        </AppText>
        <View style={[styles.meta, { gap: theme.space['space-2'] }]}>
          <AppText testID="i18n-data" variant="caption" color="ink-muted">
            {`${recording.time} · ${recording.duration}`}
          </AppText>
          {recording.state === 'transcribing' ? <QualityChip quality="busy" /> : null}
          {/* A failure shows to the eye, not only to screen readers (guide RecordingCard). */}
          {recording.state === 'failed' ? (
            <QualityChip language={recording.language} quality="failed" />
          ) : null}
          {recording.quality &&
          recording.state !== 'transcribing' &&
          recording.state !== 'failed' ? (
            <QualityChip language={recording.language} quality={recording.quality} />
          ) : null}
          {recording.recovered ? (
            <View
              style={[
                styles.badge,
                {
                  paddingHorizontal: theme.space['space-2'],
                  borderRadius: theme.radius['radius-sm'],
                  backgroundColor: theme.color['accent-soft'],
                },
              ]}
            >
              <AppText variant="caption">{t('library.recovered')}</AppText>
            </View>
          ) : null}
        </View>
      </View>
      {interactive ? <Icon name="chevron-right" color="ink-muted" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  text: { flex: 1, minWidth: 0 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  badge: { paddingVertical: 2 },
});
