import { screen, userEvent } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { I18nManager } from 'react-native';

import AboutScreen from '../../app/settings/about';
import StorageScreen from '../../app/settings/storage';
import TranscriptionLanguageScreen from '../../app/settings/transcription-language';
import TranscriptionModelScreen from '../../app/settings/transcription-model';
import SettingsScreen, { transcriptionLanguageSummary } from '../../app/(tabs)/settings';
import TrashScreen, { trashDaysLeft } from '../../app/trash';
import { library, setDemoDataEnabled } from '@/features/library/library';
import { freeBytes } from '@/features/library/storage';
import { ACTIVE_PROFILE } from '@/services/audio/activeProfile';
import { estimateRecordingBytes, MIN_RECORDING_MINUTES } from '@/services/audio/diskSpace';
import {
  setTranscriptionLanguage,
  useTranscriptionLanguage,
} from '@/features/settings/transcriptionLanguage';
import { i18next } from '@/i18n';
import { selectModel, selectedModel } from '@/features/transcription/model';
import { localQualityFor, TRANSCRIPTION_LANGUAGES } from '@/services/transcription/languages';

import { hardCodedTexts, usePseudoLocale } from '../../src/ui/__tests__/support';
import { renderScreen } from './renderScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: () => {},
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@/features/library/storage', () => ({
  itemBytes: () => 0,
  totalBytes: (items: unknown[]) => items.length * 1024 * 1024,
  freeBytes: jest.fn(() => 8 * 1024 ** 3),
}));

beforeEach(async () => {
  await i18next.changeLanguage('fr');
  setTranscriptionLanguage('fr');
});

afterEach(async () => {
  jest.restoreAllMocks();
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  jest.mocked(freeBytes).mockReturnValue(8 * 1024 ** 3);
  jest.mocked(router.push).mockClear();
  await setDemoDataEnabled(false);
});

describe('Settings groups', () => {
  it('summarises the transcription language with its quality, or that it needs the cloud', () => {
    const t = i18next.t;
    expect(transcriptionLanguageSummary('en', t)).toBe(
      `English · ${t(`quality.${localQualityFor('en', selectedModel())!}`)}`,
    );
    expect(transcriptionLanguageSummary('wo', t)).toBe('Wolof · cloud requis');
  });

  it('links to the interface language, transcription language, storage and about screens', async () => {
    await renderScreen(<SettingsScreen />);
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Langue de l’interface' }));
    await user.press(screen.getByRole('button', { name: 'Langue de transcription' }));
    await user.press(screen.getByRole('button', { name: 'Stockage' }));
    await user.press(screen.getByRole('button', { name: 'À propos' }));
    expect(jest.mocked(router.push).mock.calls.map(([path]) => path)).toEqual([
      '/settings/interface-language',
      '/settings/transcription-language',
      '/settings/storage',
      '/settings/about',
    ]);
  });

  it('turns the demo set on with a development switch', async () => {
    await renderScreen(<SettingsScreen />);
    const toggle = screen.getByRole('switch', { name: 'Données de démonstration' });
    expect(toggle).not.toBeChecked();
    await userEvent.setup().press(toggle);
    expect(await screen.findByRole('switch', { checked: true })).toBeOnTheScreen();
    expect(library.list().some((item) => item.demo)).toBe(true);
  });
});

describe('Transcription language screen', () => {
  it('lists the 16 languages, each with its quality or the cloud it needs', async () => {
    await renderScreen(<TranscriptionLanguageScreen />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(TRANSCRIPTION_LANGUAGES.length);
    expect(screen.getByRole('radio', { name: 'Langue de transcription : Français' })).toBeChecked();
    // The quality of the model the app downloads, from languages.ts (never written by hand here).
    const english = localQualityFor('en', selectedModel())!;
    expect(
      screen.getByRole('radio', { name: 'Langue de transcription : English' }).props
        .accessibilityHint,
    ).toBe(`Qualité sur l’appareil : ${i18next.t(`quality.${english}`)}`);
    expect(
      screen.getByRole('radio', { name: 'Langue de transcription : Wolof' }).props
        .accessibilityHint,
    ).toBe('Aucun moteur sur l’appareil : cloud requis');
  });

  it.each([
    ['fr', 'Cette langue demande la transcription cloud', 'Transcrire en Wolof ?'],
    ['ar', 'تحتاج هذه اللغة إلى النسخ السحابي', 'النسخ بلغة Wolof؟'],
  ])(
    'says in %s that a language without a local engine needs the cloud, and why',
    async (language, banner, dialog) => {
      await i18next.changeLanguage(language);
      await renderScreen(<TranscriptionLanguageScreen />);
      expect(screen.queryByText(banner)).toBeNull();
      const user = userEvent.setup();
      await user.press(screen.getByRole('radio', { name: /Wolof/ }));
      expect(useTranscriptionLanguage.getState().code).toBe('wo');
      expect(screen.getByText(banner)).toBeOnTheScreen();
      await user.press(
        screen.getByRole('button', { name: i18next.t('detail.cloudRequired.action') }),
      );
      expect(screen.getByRole('header', { name: dialog })).toBeOnTheScreen();
      expect(
        screen.getByText(i18next.t('transcription.cloudDialog.body', { language: 'Wolof' })),
      ).toBeOnTheScreen();
    },
  );

  it.each(['ig', 'pcm', 'zu', 'lg', 'wo', 'sw', 'ha', 'yo'])(
    'shows the cloud banner for %s, never a quality',
    async (code) => {
      setTranscriptionLanguage(code as 'wo');
      await renderScreen(<TranscriptionLanguageScreen />);
      expect(screen.getByText('Cette langue demande la transcription cloud')).toBeOnTheScreen();
    },
  );

  it.each([
    ['fr', 'Cette langue n’est pas encore disponible', 'Lingála'],
    ['ar', 'هذه اللغة غير متاحة بعد', 'Malagasy'],
  ])('announces in %s a language not available yet, with its reason', async (lang, title, name) => {
    await i18next.changeLanguage(lang);
    await renderScreen(<TranscriptionLanguageScreen />);
    const radio = screen.getByRole('radio', { name: new RegExp(name) });
    expect(radio.props.accessibilityHint).toBe(
      i18next.t('settings.transcription.notYetAvailableLong'),
    );
    await userEvent.setup().press(radio);
    expect(screen.getByText(title)).toBeOnTheScreen();
    expect(
      screen.getByText(i18next.t('settings.transcription.notYetBanner.body', { language: name })),
    ).toBeOnTheScreen();
  });

  it('redoes one recording in another language, and goes back', async () => {
    await setDemoDataEnabled(false);
    library.createRecording({ id: 'rec', createdAt: new Date().toISOString() });
    library.finalizeRecording('rec', {
      audioPath: 'rec.m4a',
      audioSize: 1,
      audioFormat: 'm4a',
      durationMs: 60_000,
      recovered: false,
    });
    jest.mocked(useLocalSearchParams).mockReturnValue({ recording: 'rec' });
    await renderScreen(<TranscriptionLanguageScreen />);
    expect(screen.getByRole('header', { name: 'Langue de cet enregistrement' })).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('radio', { name: /Deutsch/ }));
    // Queued in German; the queue runs at once and, without a model in Jest, says so.
    expect(library.get('rec')).toMatchObject({ language: 'de', issue: 'model-missing' });
    // The setting for new recordings is not touched.
    expect(useTranscriptionLanguage.getState().code).toBe('fr');
    expect(router.back).toHaveBeenCalled();
  });

  it('keeps the choice, independent of the interface language', async () => {
    await renderScreen(<TranscriptionLanguageScreen />);
    await userEvent
      .setup()
      .press(screen.getByRole('radio', { name: 'Langue de transcription : Kiswahili' }));
    expect(useTranscriptionLanguage.getState().code).toBe('sw');
    expect(i18next.language).toBe('fr');
  });

  it('goes back with a mirrored chevron in Arabic', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    await i18next.changeLanguage('ar');
    await renderScreen(<TranscriptionLanguageScreen />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'رجوع' }));
    expect(router.back).toHaveBeenCalled();
  });
});

describe('Storage screen', () => {
  it('shows the meter and links to the trash', async () => {
    await renderScreen(<StorageScreen />);
    expect(screen.getByRole('header', { name: 'Stockage' })).toBeOnTheScreen();
    expect(screen.getByRole('image', { name: /libre 8 Go/ })).toBeOnTheScreen();
    // An empty trash has nothing to empty.
    expect(screen.queryByRole('button', { name: 'Vider la corbeille' })).toBeNull();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Corbeille' }));
    expect(router.push).toHaveBeenCalledWith('/trash');
  });

  // The same function as the recording screen's (diskSpace.ts): no threshold of its own.
  const threshold = estimateRecordingBytes(ACTIVE_PROFILE, MIN_RECORDING_MINUTES);

  it('refuses just under the recording threshold', async () => {
    jest.mocked(freeBytes).mockReturnValue(threshold - 1);
    await renderScreen(<StorageScreen />);
    expect(screen.getByText('Espace insuffisant')).toBeOnTheScreen();
  });

  it('only warns at the threshold itself', async () => {
    jest.mocked(freeBytes).mockReturnValue(threshold);
    await renderScreen(<StorageScreen />);
    expect(screen.queryByText('Espace insuffisant')).toBeNull();
    expect(screen.getByText('Espace presque plein')).toBeOnTheScreen();
  });

  it('asks before emptying the trash', async () => {
    await setDemoDataEnabled(true);
    library.trash('demo-failed');
    await renderScreen(<StorageScreen />);
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Vider la corbeille' }));
    expect(screen.getByRole('header', { name: 'Vider la corbeille ?' })).toBeOnTheScreen();
    expect(library.listTrash()).toHaveLength(1);
    const confirm = screen.getAllByRole('button', { name: 'Vider la corbeille' }).at(-1);
    await user.press(confirm!);
    expect(library.listTrash()).toHaveLength(0);
  });
});

describe('Trash screen', () => {
  it('says how many days are left before the purge', () => {
    const now = new Date(2026, 9, 23, 12);
    const trashed = (daysAgo: number) =>
      new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
    expect(trashDaysLeft(trashed(0), now)).toBe(30);
    expect(trashDaysLeft(trashed(29.5), now)).toBe(1);
    expect(trashDaysLeft(trashed(31), now)).toBeLessThanOrEqual(0);
  });

  it('shows the days left on each trashed recording', async () => {
    await setDemoDataEnabled(true);
    library.trash('demo-market');
    await renderScreen(<TrashScreen />);
    expect(screen.getByText('Supprimé définitivement dans 30 jours')).toBeOnTheScreen();
  });

  it('is quietly empty', async () => {
    await renderScreen(<TrashScreen />);
    expect(screen.getByText('Corbeille vide', { exact: false })).toBeOnTheScreen();
  });

  it('restores a trashed recording', async () => {
    await setDemoDataEnabled(true);
    library.trash('demo-market');
    const title = library.listTrash()[0]!.title!;
    await renderScreen(<TrashScreen />);
    await userEvent.setup().press(screen.getByRole('button', { name: `Restaurer ${title}` }));
    expect(library.listTrash()).toHaveLength(0);
    expect(library.get('demo-market')).toBeTruthy();
  });
});

describe('About screen', () => {
  it('states the local promise and that legal texts are not final', async () => {
    await renderScreen(<AboutScreen />);
    expect(screen.getByText(/restent sur cet appareil/)).toBeOnTheScreen();
    expect(screen.getByText(/disponibles avant la publication/)).toBeOnTheScreen();
  });
});

describe.each([
  ['Transcription language', TranscriptionLanguageScreen],
  ['Storage', StorageScreen],
  ['Trash', TrashScreen],
  ['About', AboutScreen],
])('%s screen under pseudo-localization', (_name, Component) => {
  it('renders no hard-coded string', async () => {
    await setDemoDataEnabled(true);
    library.trash('demo-market');
    await usePseudoLocale();
    await renderScreen(<Component />);
    expect(hardCodedTexts()).toEqual([]);
  });
});

describe('Transcription model screen (step 3)', () => {
  afterEach(() => selectModel('base'));

  it('offers tiny, base and small, each with its size, time and quality for the language', async () => {
    await renderScreen(<TranscriptionModelScreen />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'Modèle : base' })).toBeChecked();
    const small = screen.getByRole('radio', { name: 'Modèle : small' });
    // Size, time per hour (or "not measured yet"), and the quality for French with small.
    expect(small.props.accessibilityHint).toMatch(/Go|Mo/);
    expect(small.props.accessibilityHint).toMatch(
      new RegExp(`Français : ${i18next.t(`quality.${localQualityFor('fr', 'small')!}`)}`),
    );
  });

  it('keeps the choice, and never shows a language without its quality or its reason', async () => {
    setTranscriptionLanguage('wo');
    await renderScreen(<TranscriptionModelScreen />);
    await userEvent.setup().press(screen.getByRole('radio', { name: 'Modèle : small' }));
    expect(selectedModel()).toBe('small');
    expect(screen.getByRole('radio', { name: 'Modèle : small' }).props.accessibilityHint).toMatch(
      /Wolof : cloud requis/,
    );
  });
});
