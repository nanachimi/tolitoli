import { act, screen, userEvent } from '@testing-library/react-native';
import { I18nManager, StyleSheet } from 'react-native';

import LibraryScreen from '../../app/(tabs)/index';
import RecordScreen from '../../app/record';
import * as controller from '@/features/recording/recordingController';
import {
  initialRecordingState,
  useRecordingStore,
  type RecordingState,
} from '@/features/recording/useRecordingStore';
import { i18next } from '@/i18n';
import { PSEUDO_LANGUAGE } from '@/i18n/languages';
import { PSEUDO_OPEN } from '@/i18n/pseudo';
import { library } from '@/features/library/library';
import type { RecordingManifest } from '@/services/audio/recordingStore';
import { color } from '@/ui';

import { renderScreen } from './renderScreen';

jest.mock('@/features/library/storage', () => ({
  itemBytes: () => 0,
  totalBytes: () => 0,
  freeBytes: () => 8 * 1024 ** 3,
}));

jest.mock('@/features/recording/recordingController', () => ({
  startRecording: jest.fn(async () => 'started'),
  pauseRecording: jest.fn(),
  resumeRecording: jest.fn(async () => undefined),
  stopRecording: jest.fn(async () => undefined),
  dismissRecording: jest.fn(),
}));

function setRecording(partial: Partial<RecordingState>) {
  useRecordingStore.setState({ ...initialRecordingState, ...partial });
}

function manifest(partial: Partial<RecordingManifest>): RecordingManifest {
  return {
    version: 1,
    id: 'rec',
    createdAt: new Date(2026, 9, 21, 9, 5).toISOString(),
    updatedAt: new Date(2026, 9, 21, 10).toISOString(),
    status: 'local',
    recovered: false,
    format: 'm4a-segments',
    segments: [],
    unreadable: [],
    finalFile: 'rec.m4a',
    durationMs: 65_000,
    ...partial,
  };
}

type Node = { props: Record<string, unknown>; parent: Node | null; children: unknown[] };
const isData = (node: Node | null): boolean =>
  node !== null && (node.props.testID === 'i18n-data' || isData(node.parent));
const textOf = (node: Node) =>
  node.children.map((child) => (typeof child === 'string' ? child : '')).join('');

beforeEach(async () => {
  jest.clearAllMocks();
  await i18next.changeLanguage('fr');
});

describe('Record screen', () => {
  it('starts recording when opened idle', async () => {
    setRecording({ status: 'idle' });
    await renderScreen(<RecordScreen />);
    expect(controller.startRecording).toHaveBeenCalledTimes(1);
  });

  it('shows the consent reminder, timer, level and controls while recording', async () => {
    setRecording({ status: 'recording', accumulatedMs: 65_000, runningSince: null, level: 0.5 });
    await renderScreen(<RecordScreen />);
    expect(
      screen.getByText('Informez les personnes présentes que vous enregistrez.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Durée : 1 min')).toBeOnTheScreen();
    expect(screen.getByLabelText('Niveau sonore : 50 %')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Mettre en pause' })).toBeOnTheScreen();
    expect(controller.startRecording).not.toHaveBeenCalled();
  });

  it('pauses and resumes with the same round button, its icon only changing', async () => {
    const user = userEvent.setup();
    setRecording({ status: 'recording' });
    await renderScreen(<RecordScreen />);
    expect(screen.getByTestId('icon-pause', { includeHiddenElements: true })).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Mettre en pause' }));
    expect(controller.pauseRecording).toHaveBeenCalled();

    setRecording({ status: 'paused' });
    const resume = await screen.findByRole('button', { name: 'Reprendre l’enregistrement' });
    expect(screen.getByTestId('icon-mic', { includeHiddenElements: true })).toBeTruthy();
    await user.press(resume);
    expect(controller.resumeRecording).toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Arrêter l’enregistrement' }));
    expect(controller.stopRecording).toHaveBeenCalled();
  });

  it('offers to resume once a call has ended, keeping stop available', async () => {
    const user = userEvent.setup();
    setRecording({ status: 'interrupted', resumeOffered: true, interruptionCause: 'call' });
    await renderScreen(<RecordScreen />);
    expect(screen.getByText('Appel terminé')).toBeOnTheScreen();
    expect(screen.getByText('Ce qui précède l’appel est conservé.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Reprendre l’enregistrement' }));
    expect(controller.resumeRecording).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Arrêter l’enregistrement' })).toBeOnTheScreen();
  });

  it('says another app took the microphone when it kept it for good', async () => {
    setRecording({ status: 'interrupted', resumeOffered: true, interruptionCause: 'taken' });
    await renderScreen(<RecordScreen />);
    expect(screen.getByText('Enregistrement interrompu')).toBeOnTheScreen();
    expect(screen.getByText(/Une autre application a pris le micro/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Reprendre l’enregistrement' })).toBeOnTheScreen();
  });

  it('offers no resume while a call still holds the microphone', async () => {
    setRecording({ status: 'interrupted', resumeOffered: false, micBusy: true });
    await renderScreen(<RecordScreen />);
    expect(screen.getByText(/Vous pourrez reprendre à la fin de l’appel/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Reprendre l’enregistrement' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Arrêter l’enregistrement' })).toBeOnTheScreen();
  });

  it('refuses resume on a user pause while a call holds the microphone', async () => {
    setRecording({ status: 'paused', micBusy: true });
    await renderScreen(<RecordScreen />);
    expect(screen.getByRole('button', { name: 'Reprendre l’enregistrement' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Arrêter l’enregistrement' })).toBeOnTheScreen();
  });

  it('puts Stop under the round button as a labelled secondary button', async () => {
    setRecording({ status: 'paused' });
    await renderScreen(<RecordScreen />);
    const stop = screen.getByRole('button', { name: 'Arrêter l’enregistrement' });
    expect(screen.getByText('Arrêter', { includeHiddenElements: true })).toBeTruthy();
    expect(stop).toBeEnabled();
  });

  it('in pause, the dot stops pulsing and the timer freezes', async () => {
    jest.useFakeTimers();
    setRecording({ status: 'paused', accumulatedMs: 65_000, runningSince: null });
    await renderScreen(<RecordScreen />);
    const dot = screen.getByTestId('timer-dot', { includeHiddenElements: true });
    expect(StyleSheet.flatten(dot.props.style).backgroundColor).toBe(color.light['ink-muted']);
    expect(screen.getByText('00:01:05', { includeHiddenElements: true })).toBeTruthy();
    await act(() => jest.advanceTimersByTimeAsync(5_000));
    expect(screen.getByText('00:01:05', { includeHiddenElements: true })).toBeTruthy();
    expect(StyleSheet.flatten(dot.props.style).opacity).toBe(1);
    jest.useRealTimers();
  });

  it('warns when the microphone seems cut, without stopping anything', async () => {
    setRecording({ status: 'recording', micSilent: true });
    await renderScreen(<RecordScreen />);
    expect(screen.getByText('Le micro semble coupé')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Mettre en pause' })).toBeOnTheScreen();
  });

  it('explains a denied microphone and links to settings', async () => {
    setRecording({ status: 'idle', notice: 'permission-denied' });
    await renderScreen(<RecordScreen />);
    expect(screen.getByText('Accès au micro refusé')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ouvrir les réglages' })).toBeOnTheScreen();
  });

  it.each<[string, Partial<RecordingState>]>([
    ['recording', { status: 'recording' }],
    ['interrupted', { status: 'interrupted', notice: 'notifications-denied' }],
    ['interrupted by a call', { status: 'interrupted', micBusy: true }],
    ['interrupted, resume offered', { status: 'interrupted', resumeOffered: true }],
    ['mic silent', { status: 'recording', micSilent: true }],
    ['paused with low disk', { status: 'paused', notice: 'disk-low', diskMinutes: 42 }],
    ['saved', { status: 'local' }],
    ['permission denied', { status: 'idle', notice: 'permission-denied' }],
  ])('has no hard-coded string when %s (pseudo-locale)', async (_name, partial) => {
    await i18next.changeLanguage(PSEUDO_LANGUAGE);
    setRecording(partial);
    await renderScreen(<RecordScreen />);
    const texts = screen.getAllByText(/[\s\S]+/) as unknown as Node[];
    expect(texts.filter((n) => !isData(n) && !textOf(n).includes(PSEUDO_OPEN)).map(textOf)).toEqual(
      [],
    );
  });

  it('renders in Arabic RTL', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    await i18next.changeLanguage('ar');
    setRecording({ status: 'interrupted' });
    await renderScreen(<RecordScreen />);
    expect(screen.getByText('توقف التسجيل')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'إيقاف التسجيل' })).toBeOnTheScreen();
  });
});

describe('Library list of imported step-1 recordings', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 9, 22, 12), doNotFake: ['setImmediate', 'nextTick'] });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('lists recordings with an accessible summary and a recovered badge', async () => {
    // Manifests of step 1, imported into the database at launch.
    library.importManifests(
      [
        manifest({ id: 'a', recovered: true, status: 'local' }),
        manifest({ id: 'b', durationMs: null, status: 'local' }),
      ],
      () => null,
    );
    await renderScreen(<LibraryScreen />);
    expect(
      screen.getByLabelText(
        'Enregistrement du 21 oct. 09:05, durée 1 min, récupéré après une interruption',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Enregistrement du 21 oct. 09:05, durée inconnue'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Hier')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeOnTheScreen();
  });

  it('docks the Record button in a bar under the list, without a caption', async () => {
    setRecording({ recordings: [manifest({})] });
    await renderScreen(<LibraryScreen />);
    const bar = screen.getByTestId('record-bar');
    // The list ends where the bar starts: the bar is the list pane's last child, not an overlay.
    expect(StyleSheet.flatten(bar.props.style).position).toBeUndefined();
    expect(StyleSheet.flatten(bar.props.style).backgroundColor).toBe(color.light['surface-raised']);
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeOnTheScreen();
    expect(screen.queryByText('Enregistrer', { includeHiddenElements: true })).toBeNull();
    // The bar rests on the tab bar, which carries the bottom inset: no inset in between.
    // The native view receives the edges as a map, `off` for the ones left out.
    const edges = screen.getByTestId('screen').props.edges as Record<string, string>;
    expect(edges.bottom ?? 'off').toBe('off');
    expect(edges.top).not.toBe('off');
  });

  it('has no hard-coded string with recordings (pseudo-locale)', async () => {
    await i18next.changeLanguage(PSEUDO_LANGUAGE);
    setRecording({ recordings: [manifest({ recovered: true })] });
    await renderScreen(<LibraryScreen />);
    const texts = screen.getAllByText(/[\s\S]+/) as unknown as Node[];
    expect(texts.filter((n) => !isData(n) && !textOf(n).includes(PSEUDO_OPEN)).map(textOf)).toEqual(
      [],
    );
  });
});
