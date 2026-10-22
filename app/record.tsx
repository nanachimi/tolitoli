import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { InterruptionBanner } from '@/features/recording/components/InterruptionBanner';
import { LevelMeter } from '@/features/recording/components/LevelMeter';
import { MicSilentBanner } from '@/features/recording/components/MicSilentBanner';
import { RecordingControls } from '@/features/recording/components/RecordingControls';
import { RecordingTimer } from '@/features/recording/components/RecordingTimer';
import {
  dismissRecording,
  pauseRecording,
  resumeRecording,
  startRecording,
  stopRecording,
} from '@/features/recording/recordingController';
import { useRecordingStore } from '@/features/recording/useRecordingStore';
import { AppText, Screen, radius, space, useTheme } from '@/ui';

const CAPTURING = new Set(['preparing', 'recording', 'paused', 'interrupted', 'stopping']);

export default function RecordScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const state = useRecordingStore();
  const capturing = CAPTURING.has(state.status);

  useEffect(() => {
    if (useRecordingStore.getState().status === 'idle') void startRecording();
  }, []);

  // The recording can only end with Stop: back does nothing while capturing.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => capturing);
    return () => sub.remove();
  }, [capturing]);

  const close = () => {
    dismissRecording();
    router.back();
  };

  if (state.notice === 'permission-denied' || state.notice === 'disk-insufficient') {
    return (
      <Screen>
        <View style={styles.centered}>
          <AppText variant="title" accessibilityRole="header">
            {state.notice === 'permission-denied'
              ? t('record.permission.title')
              : t('record.title')}
          </AppText>
          <AppText color="ink-muted">
            {state.notice === 'permission-denied'
              ? t('record.permission.body')
              : t('record.disk.insufficient')}
          </AppText>
          {state.notice === 'permission-denied' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('record.permission.openSettings')}
              onPress={() => void Linking.openSettings()}
              style={[styles.primary, { backgroundColor: theme.color['accent'] }]}
            >
              <AppText style={{ color: theme.color['on-accent'], fontWeight: '600' }}>
                {t('record.permission.openSettings')}
              </AppText>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('record.close')}
            onPress={close}
          >
            <AppText style={{ color: theme.color['accent'] }}>{t('record.close')}</AppText>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="title" accessibilityRole="header">
          {t('record.title')}
        </AppText>
        <View style={[styles.reminder, { borderColor: theme.color['hairline'] }]}>
          <AppText>{t('record.consentReminder')}</AppText>
        </View>
        <AppText color="ink-muted" accessibilityLiveRegion="polite">
          {t(`record.status.${state.status === 'idle' ? 'preparing' : state.status}`)}
        </AppText>
        <RecordingTimer accumulatedMs={state.accumulatedMs} runningSince={state.runningSince} />
        <LevelMeter level={state.status === 'recording' ? state.level : 0} />
        {state.status === 'interrupted' ? (
          <InterruptionBanner
            resumeOffered={state.resumeOffered}
            onResume={() => void resumeRecording()}
          />
        ) : null}
        {state.status === 'recording' && state.micSilent ? <MicSilentBanner /> : null}
        {state.notice === 'notifications-denied' ? (
          <AppText color="ink-muted">{t('record.permission.notificationsDenied')}</AppText>
        ) : null}
        {state.notice === 'disk-low' && state.diskMinutes !== null ? (
          <AppText color="ink-muted">
            {t('record.disk.low', { minutes: state.diskMinutes })}
          </AppText>
        ) : null}
        {state.notice === 'error' ? <AppText>{t('record.error')}</AppText> : null}
        {capturing ? (
          <RecordingControls
            status={state.status}
            canResume={!state.micBusy}
            onPause={pauseRecording}
            onResume={() => void resumeRecording()}
            onStop={() => void stopRecording()}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('record.close')}
            onPress={close}
            style={[styles.primary, { backgroundColor: theme.color['accent'] }]}
          >
            <AppText style={{ color: theme.color['on-accent'], fontWeight: '600' }}>
              {t('record.close')}
            </AppText>
          </Pressable>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space['space-6'], gap: space['space-6'] },
  centered: { flex: 1, justifyContent: 'center', padding: space['space-6'], gap: space['space-4'] },
  reminder: { borderWidth: 1, borderRadius: radius['radius-md'], padding: space['space-4'] },
  primary: {
    alignSelf: 'center',
    paddingVertical: space['space-4'],
    paddingHorizontal: space['space-8'],
    borderRadius: radius['radius-md'],
  },
});
