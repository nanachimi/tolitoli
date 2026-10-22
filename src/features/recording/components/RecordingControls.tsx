import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { RecorderStatus } from '@/services/audio/recorderMachine';
import { AppText, radius, space, useTheme } from '@/ui';

type Props = {
  status: RecorderStatus;
  /** False while a call holds the microphone: a paused recording cannot resume yet. */
  canResume: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

export function RecordingControls({ status, canResume, onPause, onResume, onStop }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const canStop = status === 'recording' || status === 'paused' || status === 'interrupted';
  const pauseLabel = status === 'paused' ? t('record.resume') : t('record.pause');

  return (
    <View style={styles.row}>
      {status === 'recording' || (status === 'paused' && canResume) ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pauseLabel}
          onPress={status === 'paused' ? onResume : onPause}
          style={[styles.button, { borderColor: theme.color['accent'] }]}
        >
          <AppText style={{ color: theme.color['accent'], fontWeight: '600' }}>
            {pauseLabel}
          </AppText>
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
          { backgroundColor: theme.color['accent'], borderColor: theme.color['accent'] },
          !canStop && styles.disabled,
        ]}
      >
        <AppText style={{ color: theme.color['on-accent'], fontWeight: '600' }}>
          {t('record.stop')}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space['space-4'], justifyContent: 'center' },
  button: {
    minWidth: 120,
    alignItems: 'center',
    paddingVertical: space['space-4'],
    paddingHorizontal: space['space-6'],
    borderRadius: radius['radius-md'],
    borderWidth: 2,
  },
  disabled: { opacity: 0.5 },
});
