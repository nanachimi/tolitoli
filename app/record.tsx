import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Linking, ScrollView, StyleSheet, View } from 'react-native';

import {
  dismissRecording,
  pauseRecording,
  resumeRecording,
  startRecording,
  stopRecording,
} from '@/features/recording/recordingController';
import { useElapsed } from '@/features/recording/useElapsed';
import { useRecordingStore, type RecordingState } from '@/features/recording/useRecordingStore';
import type { RecorderStatus } from '@/services/audio/recorderMachine';
import {
  AppText,
  Banner,
  Button,
  LevelMeter,
  RecordButton,
  Screen,
  space,
  Timer,
  type TimerState,
} from '@/ui';

const CAPTURING: ReadonlySet<RecorderStatus> = new Set([
  'preparing',
  'recording',
  'paused',
  'interrupted',
  'stopping',
]);

function timerState(status: RecorderStatus): TimerState {
  if (status === 'recording') return 'recording';
  return status === 'interrupted' ? 'interrupted' : 'paused';
}

/** The state banner under the timer: call in progress, call ended, or mic seemingly cut. */
function StateBanner({ state }: { state: RecordingState }) {
  const { t } = useTranslation();
  if (state.status === 'interrupted') {
    if (!state.resumeOffered) {
      // No button while a call holds the microphone (D-023).
      return (
        <Banner
          kind="interrupted"
          title={t('record.interruption.title')}
          body={t('record.interruption.waitBody')}
        />
      );
    }
    const afterCall = state.interruptionCause !== 'taken';
    return (
      <Banner
        kind="resumable"
        title={afterCall ? t('record.interruption.callEndedTitle') : t('record.interruption.title')}
        body={
          afterCall ? t('record.interruption.callEndedBody') : t('record.interruption.takenBody')
        }
        // The round button resumes, where the pause was (guide RecordButton): no second button.
      />
    );
  }
  if (state.status === 'recording' && state.micSilent) {
    return (
      <Banner kind="alert" title={t('record.micSilent.title')} body={t('record.micSilent.body')} />
    );
  }
  return null;
}

export default function RecordScreen() {
  const { t } = useTranslation();
  const state = useRecordingStore();
  const elapsed = useElapsed(state.accumulatedMs, state.runningSince);
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
    const denied = state.notice === 'permission-denied';
    return (
      <Screen>
        <View style={styles.centered}>
          <AppText variant="title" accessibilityRole="header">
            {denied ? t('record.permission.title') : t('record.title')}
          </AppText>
          <AppText color="ink-muted">
            {denied ? t('record.permission.body') : t('record.disk.insufficient')}
          </AppText>
          <View style={styles.actions}>
            {denied ? (
              <Button
                label={t('record.permission.openSettings')}
                onPress={() => void Linking.openSettings()}
              />
            ) : null}
            <Button
              label={t('record.close')}
              variant={denied ? 'ghost' : 'primary'}
              onPress={close}
            />
          </View>
        </View>
      </Screen>
    );
  }

  const busy = state.status === 'preparing' || state.status === 'stopping';
  // After a pause, or after an interruption once the microphone is free again (D-023).
  const canResume =
    !state.micBusy &&
    (state.status === 'paused' || (state.status === 'interrupted' && state.resumeOffered));
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <AppText variant="title" accessibilityRole="header">
            {t('record.title')}
          </AppText>
          {/* Legal reminder, always visible while on this screen (cahier, consentement). */}
          <AppText variant="caption" color="ink-muted">
            {t('record.consentReminder')}
          </AppText>
        </View>
        <AppText variant="caption" color="ink-muted" accessibilityLiveRegion="polite">
          {t(`record.status.${state.status === 'idle' ? 'preparing' : state.status}`)}
        </AppText>
        <Timer elapsedMs={elapsed} state={timerState(state.status)} />
        <LevelMeter level={state.status === 'recording' ? state.level : 0} />
        <StateBanner state={state} />
        {state.notice === 'notifications-denied' ? (
          <AppText variant="caption" color="ink-muted">
            {t('record.permission.notificationsDenied')}
          </AppText>
        ) : null}
        {state.notice === 'disk-low' && state.diskMinutes !== null ? (
          <AppText variant="caption" color="ink-muted">
            {t('record.disk.low', { minutes: state.diskMinutes })}
          </AppText>
        ) : null}
        {state.notice === 'error' ? <AppText color="danger">{t('record.error')}</AppText> : null}

        {capturing ? (
          <View style={styles.controls}>
            {/* One round button pauses and resumes, under the same thumb (guide RecordButton). */}
            <RecordButton
              size="xl"
              mode={state.status === 'recording' ? 'pause' : 'resume'}
              accessibilityLabel={t(
                state.status === 'recording' ? 'record.pauseA11y' : 'record.resumeA11y',
              )}
              // No resume while a call holds the microphone (D-023): the banner says why.
              disabled={busy || (state.status !== 'recording' && !canResume)}
              onPress={() =>
                state.status === 'recording' ? pauseRecording() : void resumeRecording()
              }
            />
            {/* Stop is the only irreversible action: a labelled button, away from the pause. */}
            <Button
              label={t('record.stop')}
              accessibilityLabel={t('record.stopA11y')}
              variant="secondary"
              disabled={busy}
              onPress={() => void stopRecording()}
            />
          </View>
        ) : (
          <View style={styles.actions}>
            <Button label={t('record.close')} onPress={close} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space['space-4'], gap: space['space-6'] },
  header: { gap: space['space-1'] },
  centered: { flex: 1, justifyContent: 'center', padding: space['space-6'], gap: space['space-4'] },
  actions: { alignItems: 'center', gap: space['space-2'] },
  controls: { alignItems: 'center', gap: space['space-4'] },
});
