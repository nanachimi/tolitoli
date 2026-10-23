import { act, fireEvent, screen, userEvent } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { I18nManager, StyleSheet } from 'react-native';

import RecordingScreen from '../../app/recording/[id]';
import { library, setDemoDataEnabled } from '@/features/library/library';
import { LOCAL_MODEL } from '@/features/transcription/model';
import {
  localQualityFor,
  requiresCloud,
  TRANSCRIPTION_LANGUAGES,
} from '@/services/transcription/languages';
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
  await setDemoDataEnabled(true);
});

afterEach(async () => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  jest.mocked(router.back).mockClear();
  await setDemoDataEnabled(false);
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

  it('aligns each segment of a mixed transcript on its own script', async () => {
    await open('demo-tunis');
    const direction = (text: RegExp) =>
      StyleSheet.flatten(screen.getByText(text, { includeHiddenElements: true }).props.style)
        .direction;
    expect(direction(/^صباح الخير/)).toBe('rtl');
    expect(direction(/^Oui, on commence/)).toBe('ltr');
    expect(direction(/^الميزانية جاهزة/)).toBe('rtl');
    expect(direction(/^Parfait, merci/)).toBe('ltr');
  });

  it('offers to retry a failed transcription', async () => {
    await open('demo-failed');
    expect(screen.getByText('La transcription a échoué')).toBeOnTheScreen();
    expect(screen.getByLabelText('Français · Échec')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Réessayer' }));
    expect(screen.queryByText('La transcription a échoué')).toBeNull();
    // Back in the queue, it waits its turn (step 3).
    expect(
      screen.getByRole('progressbar', { name: 'En attente de transcription' }),
    ).toBeOnTheScreen();
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
    // Unchanged, then empty: nothing to send yet (guide Dialog).
    expect(screen.getByRole('button', { name: 'Renommer' })).toBeDisabled();
    await user.clear(field);
    expect(screen.getByRole('button', { name: 'Renommer' })).toBeDisabled();
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

/** A real recording (not a demo item), finalised on the device. */
async function realRecording(id: string) {
  await setDemoDataEnabled(false);
  library.createRecording({ id, createdAt: new Date().toISOString() });
  library.finalizeRecording(id, {
    audioPath: `${id}.m4a`,
    audioSize: 1,
    audioFormat: 'm4a',
    durationMs: 60_000,
    recovered: false,
  });
}

describe('Recording Detail, transcription (step 3)', () => {
  it.each([
    ['fr', 'Cloud requis pour cette langue', 'Transcrire en Wolof ?'],
    ['ar', i18next.getFixedT('ar')('detail.cloudRequired.title'), 'النسخ بلغة Wolof؟'],
  ])(
    'says in %s that a language without a local engine needs the cloud: no empty transcript, no error',
    async (language, banner, dialog) => {
      await i18next.changeLanguage(language);
      await realRecording('rec');
      library.assignTranscriptionLanguage('rec', 'wo');
      await open('rec');
      expect(screen.getByText(banner)).toBeOnTheScreen();
      expect(screen.queryByText(i18next.t('detail.noTranscriptTitle'))).toBeNull();
      expect(screen.queryByText(i18next.t('detail.issue.failed.title'))).toBeNull();
      const user = userEvent.setup();
      await user.press(
        screen.getByRole('button', { name: i18next.t('detail.cloudRequired.action') }),
      );
      expect(screen.getByRole('header', { name: dialog })).toBeOnTheScreen();
      await user.press(
        screen.getByRole('button', { name: i18next.t('transcription.cloudDialog.confirm') }),
      );
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/settings/transcription-language',
        params: { recording: 'rec' },
      });
    },
  );

  it.each(['fr', 'ar'])(
    'never shows a transcribed language without its quality, in %s',
    async (language) => {
      await i18next.changeLanguage(language);
      for (const entry of TRANSCRIPTION_LANGUAGES.filter((l) => !requiresCloud(l.code))) {
        await realRecording(entry.code);
        library.queueTranscription(entry.code, {
          language: entry.code,
          engine: 'local',
          model: LOCAL_MODEL,
        });
        library.startTranscription(entry.code);
        library.saveDraft(entry.code, { startMs: 0, endMs: 1000, text: 'Texte' }, 1000);
        library.completeTranscription(entry.code, {
          quality: localQualityFor(entry.code, LOCAL_MODEL),
        });
        const view = await open(entry.code);
        const quality = i18next.t(`quality.${localQualityFor(entry.code, LOCAL_MODEL)!}`);
        expect(
          screen.getByLabelText(
            i18next.t('quality.withLanguage', { language: entry.nativeName, quality }),
          ),
        ).toBeOnTheScreen();
        view.unmount();
      }
    },
  );

  it('transcribes a recording on demand, in the language of the settings', async () => {
    await realRecording('rec');
    await open('rec');
    await userEvent.setup().press(screen.getByRole('button', { name: 'Transcrire' }));
    // Queued in French; without a model in Jest, the queue says so at once.
    expect(library.get('rec')).toMatchObject({ language: 'fr', issue: 'model-missing' });
    expect(screen.getByText('Modèle de transcription absent')).toBeOnTheScreen();
  });
});

describe('Recording Detail in Arabic and pseudo-locale', () => {
  it('mirrors the back chevron in Arabic', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    await i18next.changeLanguage('ar');
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
