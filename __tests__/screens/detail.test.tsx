import { act, fireEvent, screen, userEvent } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { I18nManager, StyleSheet } from 'react-native';

import RecordingScreen from '../../app/recording/[id]';
import { library, setDemoDataEnabled } from '@/features/library/library';
import { MAX_TITLE_LENGTH } from '@/features/library/RecordingActions';
import { i18next } from '@/i18n';

import { hardCodedTexts, usePseudoLocale } from '../../src/ui/__tests__/support';
import { renderScreen } from './renderScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

function open(id: string) {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id });
  return renderScreen(<RecordingScreen />);
}

beforeEach(async () => {
  await i18next.changeLanguage('fr');
  setDemoDataEnabled(true);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  jest.mocked(router.back).mockClear();
  for (const item of library.listTrash()) library.restore(item.id);
  library.rename('demo-meeting', 'Réunion fournisseur');
  setDemoDataEnabled(false);
});

describe('Recording Detail', () => {
  it('shows the title, the language with its quality, the transcript and the player', async () => {
    await open('demo-meeting');
    expect(screen.getByRole('header', { name: 'Réunion fournisseur' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Kiswahili · brouillon')).toBeOnTheScreen();
    expect(
      screen.getAllByRole('button', { name: /Asante|transport|Habari/ }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole('adjustable', { name: 'Position de lecture' })).toBeOnTheScreen();
  });

  it('jumps the player to a segment and highlights it', async () => {
    await open('demo-meeting');
    const segment = screen.getByRole('button', { name: /transport price/ });
    expect(segment.props.accessibilityHint).toBe('Aller à 0:44');
    expect(segment).not.toBeSelected();
    await userEvent.setup().press(segment);
    expect(screen.getByRole('button', { name: /transport price/ })).toBeSelected();
    expect(
      screen.getByRole('adjustable', { name: 'Position de lecture' }).props.accessibilityValue.text,
    ).toMatch(/^44 s sur /);
  });

  it('follows the playback with the simulated clock', async () => {
    jest.useFakeTimers();
    await open('demo-meeting');
    // Start from 0:26 so that a few seconds of clock reach the next segments.
    await fireEvent.press(screen.getByRole('button', { name: /send the email/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Lire' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeOnTheScreen();
    await act(() => jest.advanceTimersByTimeAsync(10_000));
    expect(screen.getByRole('button', { name: /bei ya usafiri/ })).toBeSelected();
  });

  it('offers to retry a failed transcription', async () => {
    await open('demo-failed');
    expect(screen.getByText('La transcription a échoué')).toBeOnTheScreen();
    expect(screen.getByLabelText('Français · Échec')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Réessayer' }));
    expect(screen.queryByText('La transcription a échoué')).toBeNull();
    expect(screen.getByRole('progressbar', { name: 'Transcription en cours' })).toBeOnTheScreen();
  });

  it('says why a recording is not transcribed', async () => {
    await open('demo-market');
    expect(screen.getByText('Quota cloud épuisé')).toBeOnTheScreen();
  });

  it('shows no quality before there is a transcript', async () => {
    await open('demo-workshop');
    expect(screen.getByText('Modèle de transcription absent')).toBeOnTheScreen();
    expect(screen.queryByLabelText('English · bonne')).toBeNull();
  });

  it('marks the offline state with its own icon', async () => {
    await open('demo-offline');
    expect(screen.getByText('Hors ligne')).toBeOnTheScreen();
    expect(screen.getByTestId('icon-wifi-off', { includeHiddenElements: true })).toBeTruthy();
  });

  it('welcomes an audio-only recording without inventing a transcript', async () => {
    await open('demo-recovered');
    expect(screen.getByLabelText(/Pas encore de transcription/)).toBeOnTheScreen();
  });

  it('says when the recording is gone', async () => {
    await open('nowhere');
    expect(screen.getByLabelText(/Enregistrement introuvable/)).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Retour' }));
    expect(router.back).toHaveBeenCalled();
  });
});

describe('Recording actions', () => {
  it('renames from the more menu, and refuses a title that is too long', async () => {
    await open('demo-meeting');
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Autres actions' }));
    expect(screen.getByText('L’export arrivera dans une prochaine version.')).toBeOnTheScreen();
    await user.press(screen.getByRole('menuitem', { name: 'Renommer' }));
    const field = screen.getByLabelText('Titre');
    await user.clear(field);
    await user.type(field, 'x'.repeat(MAX_TITLE_LENGTH + 1));
    await user.press(screen.getByRole('button', { name: 'Renommer' }));
    expect(
      screen.getByText(`${MAX_TITLE_LENGTH} caractères au plus : raccourcissez le titre.`),
    ).toBeOnTheScreen();
    await user.clear(field);
    await user.type(field, 'Réunion du transport');
    await user.press(screen.getByRole('button', { name: 'Renommer' }));
    expect(library.get('demo-meeting')?.title).toBe('Réunion du transport');
    expect(screen.getByRole('header', { name: 'Réunion du transport' })).toBeOnTheScreen();
  });

  it('moves to the trash only after the dialog, then goes back', async () => {
    await open('demo-lecture');
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Autres actions' }));
    await user.press(screen.getByRole('menuitem', { name: 'Mettre à la corbeille' }));
    expect(
      screen.getByText(
        '« Cours de linguistique » restera 30 jours dans la corbeille, d’où vous pourrez le restaurer.',
      ),
    ).toBeOnTheScreen();
    expect(library.listTrash()).toHaveLength(0);
    await user.press(screen.getByRole('button', { name: 'Mettre à la corbeille' }));
    expect(library.listTrash().map((item) => item.id)).toEqual(['demo-lecture']);
    expect(router.back).toHaveBeenCalled();
  });
});

describe('Recording Detail in Arabic and pseudo-locale', () => {
  it('mirrors the back chevron in Arabic', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    await i18next.changeLanguage('ar');
    // demo-failed may have been retried above: the singleton keeps it for the session.
    await open('demo-market');
    expect(screen.getByText('نفدت الحصة السحابية')).toBeOnTheScreen();
    const chevron = screen.getByTestId('icon-chevron-left', { includeHiddenElements: true });
    expect(StyleSheet.flatten(chevron.props.style).transform).toEqual([{ scaleX: -1 }]);
  });

  it.each(['demo-failed', 'demo-market', 'demo-recovered', 'demo-transcribing', 'demo-kinshasa'])(
    '%s has no hard-coded text',
    async (id) => {
      await usePseudoLocale();
      await open(id);
      const title = library.get(id)?.title;
      // A title the user (or the demo set) gave is data, not interface text.
      expect(hardCodedTexts().filter((text) => text !== title)).toEqual([]);
    },
  );
});
