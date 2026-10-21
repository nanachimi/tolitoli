import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { InterruptionBanner } from '@/features/recording/components/InterruptionBanner';
import { LevelMeter } from '@/features/recording/components/LevelMeter';
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
import { AppText, Screen, radius, spacing, useTheme } from '@/ui';

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
          <AppText muted>
            {state.notice === 'permission-denied'
              ? t('record.permission.body')
              : t('record.disk.insufficient')}
          </AppText>
          {state.notice === 'permission-denied' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('record.permission.openSettings')}
              onPress={() => void Linking.openSettings()}
              style={[styles.primary, { backgroundColor: theme.colors.primary }]}
            >
              <AppText style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>
                {t('record.permission.openSettings')}
              </AppText>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('record.close')}
            onPress={close}
          >
            <AppText style={{ color: theme.colors.primary }}>{t('record.close')}</AppText>
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
        <View style={[styles.reminder, { borderColor: theme.colors.border }]}>
          <AppText>{t('record.consentReminder')}</AppText>
        </View>
        <AppText muted accessibilityLiveRegion="polite">
          {t(`record.status.${state.status === 'idle' ? 'preparing' : state.status}`)}
        </AppText>
        <RecordingTimer accumulatedMs={state.accumulatedMs} runningSince={state.runningSince} />
        <LevelMeter level={state.status === 'recording' ? state.level : 0} />
        {state.status === 'interrupted' ? (
          <InterruptionBanner onResume={() => void resumeRecording()} />
        ) : null}
        {state.notice === 'notifications-denied' ? (
          <AppText muted>{t('record.permission.notificationsDenied')}</AppText>
        ) : null}
        {state.notice === 'disk-low' && state.diskMinutes !== null ? (
          <AppText muted>{t('record.disk.low', { minutes: state.diskMinutes })}</AppText>
        ) : null}
        {state.notice === 'error' ? <AppText>{t('record.error')}</AppText> : null}
        {capturing ? (
          <RecordingControls
            status={state.status}
            onPause={pauseRecording}
            onResume={() => void resumeRecording()}
            onStop={() => void stopRecording()}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('record.close')}
            onPress={close}
            style={[styles.primary, { backgroundColor: theme.colors.primary }]}
          >
            <AppText style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>
              {t('record.close')}
            </AppText>
          </Pressable>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  centered: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  reminder: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  primary: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
});
