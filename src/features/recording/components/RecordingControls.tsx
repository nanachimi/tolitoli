import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { RecorderStatus } from '@/services/audio/recorderMachine';
import { AppText, radius, spacing, useTheme } from '@/ui';

type Props = {
  status: RecorderStatus;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

export function RecordingControls({ status, onPause, onResume, onStop }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const canStop = status === 'recording' || status === 'paused' || status === 'interrupted';
  const pauseLabel = status === 'paused' ? t('record.resume') : t('record.pause');

  return (
    <View style={styles.row}>
      {status === 'recording' || status === 'paused' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pauseLabel}
          onPress={status === 'paused' ? onResume : onPause}
          style={[styles.button, { borderColor: theme.colors.primary }]}
        >
          <AppText style={{ color: theme.colors.primary, fontWeight: '600' }}>{pauseLabel}</AppText>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('record.stop')}
        accessibilityState={{ disabled: !canStop }}
        disabled={!canStop}
        onPress={onStop}
        style={[
          styles.button,
          { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
          !canStop && styles.disabled,
        ]}
      >
        <AppText style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>
          {t('record.stop')}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
  button: {
    minWidth: 120,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 2,
  },
  disabled: { opacity: 0.5 },
});
