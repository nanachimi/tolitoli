import { randomUUID } from 'expo-crypto';
import { Platform } from 'react-native';
import { AudioManager, RecordingNotificationManager } from 'react-native-audio-api';

import { i18next } from '@/i18n';
import { ACTIVE_PROFILE, PROFILES } from '@/services/audio/activeProfile';
import { checkDiskSpace } from '@/services/audio/diskSpace';
import type { AudioFrame } from '@/services/audio/engine';
import { fromInterruptionEvent } from '@/services/audio/interruptions';
import { isMicSilent, nextSilentMs } from '@/services/audio/micSilence';
import type { RecorderStatus } from '@/services/audio/recorderMachine';
import { listRecordings } from '@/services/audio/recordingStore';
import { recoverInterruptedRecordings } from '@/services/audio/recovery';
import { RecordingSession, type SessionSnapshot } from '@/services/audio/session';

import { availableDiskSpace, expoFs, recordingsRoot } from './expoFs';
import { nativeAudioFiles } from './nativeAudioFiles';
import { RnAudioApiEngine } from './rnAudioApiEngine';
import { initialRecordingState, useRecordingStore } from './useRecordingStore';

type Subscription = { remove(): void };

let session: RecordingSession | null = null;
let subscriptions: Subscription[] = [];
/** Running length of digital silence while recording (micSilence.ts). */
let silentMs = 0;

function log(...args: unknown[]): void {
  console.log('[recording]', ...args);
}

function setState(partial: Partial<ReturnType<typeof useRecordingStore.getState>>): void {
  useRecordingStore.setState(partial);
}

/** Keeps the elapsed-time accounting in step with status changes. */
function onSnapshot(snapshot: SessionSnapshot): void {
  const state = useRecordingStore.getState();
  const now = Date.now();
  const wasRunning = state.runningSince !== null;
  const isRunning = snapshot.status === 'recording';
  if (!isRunning) silentMs = 0;
  setState({
    status: snapshot.status,
    resumeOffered: snapshot.resumeOffered,
    micBusy: snapshot.micBusy,
    micSilent: isRunning && state.micSilent,
    accumulatedMs:
      wasRunning && !isRunning
        ? state.accumulatedMs + (now - (state.runningSince ?? now))
        : state.accumulatedMs,
    runningSince: isRunning ? (state.runningSince ?? now) : null,
  });
  void updateNotification(snapshot.status);
}

function onFrame(frame: AudioFrame): void {
  const state = useRecordingStore.getState();
  if (state.status !== 'recording') {
    setState({ level: frame.level });
    return;
  }
  silentMs = nextSilentMs(silentMs, frame.peak, frame.durationMs);
  const micSilent = isMicSilent(silentMs);
  if (micSilent !== state.micSilent) log('mic silent', micSilent, Date.now());
  setState({ level: frame.level, micSilent });
}

/** `channelName` is read by our react-native-audio-api patch (D-023), not by its typings. */
type RecordingNotificationOptions = Parameters<typeof RecordingNotificationManager.show>[0] & {
  channelName: string;
};

async function updateNotification(status: RecorderStatus): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (status !== 'recording' && status !== 'paused' && status !== 'interrupted') return;
  const paused = status !== 'recording';
  const options: RecordingNotificationOptions = {
    channelName: i18next.t('record.notification.channelName'),
    title: i18next.t(paused ? 'record.notification.pausedTitle' : 'record.notification.title'),
    contentText: i18next.t('record.notification.text'),
    pauseActionTitle: i18next.t('record.notification.pause'),
    resumeActionTitle: i18next.t('record.notification.resume'),
    stopActionTitle: i18next.t('record.notification.stop'),
    paused,
    usesChronometer: !paused,
    showStopAction: true,
    dismissible: false,
    deepLinkUri: 'tolitoli://record',
  };
  try {
    await RecordingNotificationManager.show(options);
  } catch (error) {
    log('notification error', String(error));
  }
}

function listen(active: RecordingSession): void {
  subscriptions = [
    AudioManager.addSystemEventListener('interruption', (event) => {
      log('interruption', JSON.stringify(event), Date.now());
      // Only the Android patch reports whether a focus loss is transient (D-023).
      void active.handleSystemEvent(fromInterruptionEvent(event, Platform.OS === 'android'));
    }),
    AudioManager.addSystemEventListener('routeChange', (event) => {
      log('routeChange', JSON.stringify(event));
    }),
    RecordingNotificationManager.addEventListener('recordingNotificationPause', () => {
      if (active.snapshot().status === 'recording') active.pause();
    }),
    RecordingNotificationManager.addEventListener('recordingNotificationResume', () => {
      void resumeRecording();
    }),
    RecordingNotificationManager.addEventListener('recordingNotificationStop', () => {
      void stopRecording();
    }),
  ];
}

function unlisten(): void {
  subscriptions.forEach((subscription) => subscription.remove());
  subscriptions = [];
}

export function refreshRecordings(): void {
  setState({ recordings: listRecordings(expoFs, recordingsRoot()) });
}

export type StartResult = 'started' | 'permission-denied' | 'disk-insufficient' | 'error';

export async function startRecording(): Promise<StartResult> {
  if (session) return 'started';
  const t0 = Date.now();
  silentMs = 0;
  setState({ ...initialRecordingState, recordings: useRecordingStore.getState().recordings });

  let permission = await AudioManager.checkRecordingPermissions();
  if (permission !== 'Granted') permission = await AudioManager.requestRecordingPermissions();
  if (permission !== 'Granted') {
    setState({ notice: 'permission-denied' });
    return 'permission-denied';
  }
  if (Platform.OS === 'android') {
    const notifications = await AudioManager.requestNotificationPermissions();
    if (notifications !== 'Granted') setState({ notice: 'notifications-denied' });
  }

  const disk = checkDiskSpace(availableDiskSpace(), ACTIVE_PROFILE);
  setState({ diskMinutes: disk.remainingMinutes });
  if (disk.kind === 'insufficient') {
    setState({ notice: 'disk-insufficient' });
    return 'disk-insufficient';
  }
  if (disk.kind === 'low') setState({ notice: 'disk-low' });

  AudioManager.setAudioSessionOptions({
    iosCategory: 'playAndRecord',
    iosMode: 'default',
    iosOptions: ['allowBluetoothHFP', 'defaultToSpeaker'],
  });
  AudioManager.observeAudioInterruptions(true);

  const active = new RecordingSession({
    fs: expoFs,
    root: recordingsRoot(),
    engine: new RnAudioApiEngine(ACTIVE_PROFILE, onFrame),
    audio: nativeAudioFiles,
    profile: ACTIVE_PROFILE,
    now: () => new Date(),
    newId: randomUUID,
  });
  session = active;
  active.subscribe(onSnapshot);
  listen(active);
  try {
    const manifest = await active.start();
    log('started', manifest.id, `${Date.now() - t0}ms after tap`);
    return 'started';
  } catch (error) {
    log('start failed', String(error));
    await finish();
    setState({ status: 'error', notice: 'error' });
    return 'error';
  }
}

export function pauseRecording(): void {
  session?.pause();
}

export async function resumeRecording(): Promise<void> {
  if (!session) return;
  try {
    // Refused while a call holds the microphone (also from the notification button).
    if (!(await session.resume())) log('resume refused: microphone busy');
  } catch (error) {
    log('resume failed', String(error));
    setState({ notice: 'error' });
  }
}

export async function stopRecording(): Promise<void> {
  const active = session;
  if (!active) return;
  try {
    const manifest = await active.stop();
    log('stopped', manifest.id, manifest.durationMs, manifest.finalFile, manifest.unreadable);
  } catch (error) {
    log('stop failed', String(error));
    setState({ notice: 'error' });
  }
  await finish();
}

async function finish(): Promise<void> {
  unlisten();
  session = null;
  AudioManager.observeAudioInterruptions(false);
  if (Platform.OS === 'android') await RecordingNotificationManager.hide().catch(() => undefined);
  refreshRecordings();
}

/** Back to idle once the user leaves the finished recording screen. */
export function dismissRecording(): void {
  if (session) return;
  setState({ ...initialRecordingState, recordings: useRecordingStore.getState().recordings });
}

/** Launch-time recovery of recordings left by a killed app (never deletes anything). */
export async function recoverAtLaunch(): Promise<void> {
  const recovered = await recoverInterruptedRecordings(
    expoFs,
    recordingsRoot(),
    PROFILES,
    nativeAudioFiles,
    () => new Date(),
    (id) => session?.snapshot().manifest?.id === id,
  );
  if (recovered.length > 0) {
    log('recovered', JSON.stringify(recovered.map((m) => [m.id, m.durationMs, m.unreadable])));
  }
  refreshRecordings();
}
