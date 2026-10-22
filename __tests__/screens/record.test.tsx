import { screen, userEvent } from '@testing-library/react-native';
import { I18nManager } from 'react-native';

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
import type { RecordingManifest } from '@/services/audio/recordingStore';

import { renderScreen } from './renderScreen';

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
    expect(screen.getByLabelText('Durée : 1:05')).toBeOnTheScreen();
    expect(screen.getByLabelText('Niveau sonore : 50 %')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeOnTheScreen();
    expect(controller.startRecording).not.toHaveBeenCalled();
  });

  it('pauses, resumes and stops through the controller', async () => {
    const user = userEvent.setup();
    setRecording({ status: 'recording' });
    await renderScreen(<RecordScreen />);
    await user.press(screen.getByRole('button', { name: 'Pause' }));
    expect(controller.pauseRecording).toHaveBeenCalled();

    setRecording({ status: 'paused' });
    await user.press(await screen.findByRole('button', { name: 'Reprendre' }));
    expect(controller.resumeRecording).toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Arrêter' }));
    expect(controller.stopRecording).toHaveBeenCalled();
  });

  it('offers to resume after an interruption, keeping stop available', async () => {
    const user = userEvent.setup();
    setRecording({ status: 'interrupted', resumeOffered: true });
    await renderScreen(<RecordScreen />);
    expect(screen.getByText('Enregistrement interrompu')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Reprendre l’enregistrement' }));
    expect(controller.resumeRecording).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Arrêter' })).toBeOnTheScreen();
  });

  it('offers no resume while a call still holds the microphone', async () => {
    setRecording({ status: 'interrupted', resumeOffered: false, micBusy: true });
    await renderScreen(<RecordScreen />);
    expect(screen.getByText(/Vous pourrez reprendre à la fin de l’appel/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Reprendre l’enregistrement' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Arrêter' })).toBeOnTheScreen();
  });

  it('hides resume on a user pause while a call holds the microphone', async () => {
    setRecording({ status: 'paused', micBusy: true });
    await renderScreen(<RecordScreen />);
    expect(screen.queryByRole('button', { name: 'Reprendre' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Arrêter' })).toBeOnTheScreen();
  });

  it('warns when the microphone seems cut, without stopping anything', async () => {
    setRecording({ status: 'recording', micSilent: true });
    await renderScreen(<RecordScreen />);
    expect(screen.getByText('Le micro semble coupé')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeOnTheScreen();
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
    expect(screen.getByRole('button', { name: 'إيقاف' })).toBeOnTheScreen();
  });
});

describe('Library list (provisional)', () => {
  it('lists recordings with an accessible summary and a recovered badge', async () => {
    setRecording({
      recordings: [manifest({ id: 'a', recovered: true }), manifest({ id: 'b', durationMs: null })],
    });
    await renderScreen(<LibraryScreen />);
    expect(
      screen.getByLabelText(
        'Enregistrement du 2026-10-21 09:05, durée 1:05, récupéré après une interruption',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Enregistrement du 2026-10-21 09:05, durée inconnue'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Démarrer un enregistrement' })).toBeOnTheScreen();
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
