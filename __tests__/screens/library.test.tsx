import { act, screen, userEvent } from '@testing-library/react-native';
import { download } from 'react-native-executorch';
import { router } from 'expo-router';

import LibraryScreen, { SEARCH_DEBOUNCE_MS } from '../../app/(tabs)/index';
import { library, setDemoDataEnabled } from '@/features/library/library';
import { freeBytes } from '@/features/library/storage';
import { cancelModelDownload, useModel } from '@/features/transcription/model';
import { i18next } from '@/i18n';
import * as layout from '@/ui/layout/useLayoutMode';

import { hardCodedTexts, usePseudoLocale } from '../../src/ui/__tests__/support';
import { renderScreen } from './renderScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

const GB = 1024 ** 3;

jest.mock('@/features/library/storage', () => ({
  itemBytes: () => 0,
  totalBytes: () => 0,
  freeBytes: jest.fn(() => 8 * 1024 ** 3),
}));

jest.mock('@/ui/layout/useLayoutMode', () => ({
  ...jest.requireActual('@/ui/layout/useLayoutMode'),
  useLayoutMode: jest.fn(() => 'single'),
}));

beforeEach(async () => {
  jest.mocked(download).mockClear();
  await i18next.changeLanguage('fr');
  await setDemoDataEnabled(true);
  useModel.setState({ status: 'ready', progress: 1 });
});

afterEach(async () => {
  cancelModelDownload();
  jest.mocked(freeBytes).mockReturnValue(8 * GB);
  jest.useRealTimers();
  jest.mocked(router.push).mockClear();
  jest.mocked(layout.useLayoutMode).mockReturnValue('single');
  await setDemoDataEnabled(false);
});

async function search(text: string) {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.type(screen.getByRole('search'), text);
  await act(() => jest.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS));
}

describe('Library', () => {
  it('welcomes a first launch and says what to do', async () => {
    await setDemoDataEnabled(false);
    await renderScreen(<LibraryScreen />);
    expect(screen.getByLabelText(/Appuyez sur Enregistrer pour commencer/)).toBeOnTheScreen();
    // Nothing to search yet.
    expect(screen.queryByRole('search')).toBeNull();
  });

  it('describes each card: title, length, state, language with its quality, recovered', async () => {
    await renderScreen(<LibraryScreen />);
    expect(
      screen.getByRole('button', {
        name: /^Réunion fournisseur, .+, durée .+, Kiswahili, qualité brouillon$/,
      }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /transcription en cours$/ })).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: /récupéré après une interruption$/ }),
    ).toBeOnTheScreen();
  });

  it('shows on the card that a transcription failed', async () => {
    // The list renders its first rows only: newer cards are trashed to bring this one up.
    for (const id of ['demo-meeting', 'demo-transcribing', 'demo-lecture', 'demo-recovered']) {
      library.trash(id);
    }
    await renderScreen(<LibraryScreen />);
    expect(screen.getByRole('button', { name: /transcription en échec$/ })).toBeOnTheScreen();
    expect(screen.getByText('Français · Échec', { includeHiddenElements: true })).toBeTruthy();
  });

  it('opens a recording', async () => {
    await renderScreen(<LibraryScreen />);
    await userEvent.setup().press(screen.getByRole('button', { name: /^Réunion fournisseur/ }));
    expect(router.push).toHaveBeenCalledWith('/recording/demo-meeting');
  });

  it('opens the recording beside the list on a tablet', async () => {
    jest.mocked(layout.useLayoutMode).mockReturnValue('tablet-split');
    await renderScreen(<LibraryScreen />);
    await userEvent.setup().press(screen.getByRole('button', { name: /^Cours de linguistique/ }));
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByRole('header', { name: 'Cours de linguistique' })).toBeOnTheScreen();
  });

  it('searches titles and transcripts after a pause, then says when nothing matches', async () => {
    jest.useFakeTimers();
    await renderScreen(<LibraryScreen />);
    await search('mbongo');
    expect(screen.getByRole('button', { name: /^Entretien à Kinshasa/ })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Réunion fournisseur/ })).toBeNull();
    await search('zzz');
    expect(screen.getByLabelText(/Aucun résultat/)).toBeOnTheScreen();
    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(screen.getByRole('button', { name: 'Effacer la recherche' }));
    expect(screen.getByRole('button', { name: /^Réunion fournisseur/ })).toBeOnTheScreen();
  });

  it('opens the actions on a long press, and trashes behind a dialog', async () => {
    await renderScreen(<LibraryScreen />);
    const user = userEvent.setup();
    const card = screen.getByRole('button', { name: /^Cours de linguistique/ });
    expect(card.props.accessibilityHint).toBe('Appui long pour renommer ou mettre à la corbeille');
    await user.longPress(card);
    await user.press(screen.getByRole('menuitem', { name: 'Mettre à la corbeille' }));
    await user.press(screen.getByRole('button', { name: 'Mettre à la corbeille' }));
    expect(screen.queryByRole('button', { name: /^Cours de linguistique/ })).toBeNull();
    expect(library.listTrash().map((item) => item.id)).toEqual(['demo-lecture']);
  });

  it('has no hard-coded text with the demo set (pseudo-locale)', async () => {
    await usePseudoLocale();
    await renderScreen(<LibraryScreen />);
    const titles = new Set(library.list().map((item) => item.title));
    expect(hardCodedTexts().filter((text) => !titles.has(text))).toEqual([]);
  });
});

describe('Library notices', () => {
  it('offers the model when it was put off, and shows its download', async () => {
    jest.useFakeTimers();
    useModel.setState({ status: 'missing', progress: 0 });
    await renderScreen(<LibraryScreen />);
    expect(screen.getByText('Modèle de transcription absent')).toBeOnTheScreen();
    await userEvent
      .setup({ advanceTimers: jest.advanceTimersByTime })
      .press(screen.getByRole('button', { name: 'Télécharger' }));
    await act(async () => {
      for (let i = 0; i < 20 && jest.mocked(download).mock.calls.length === 0; i++) {
        await Promise.resolve();
      }
    });
    expect(download).toHaveBeenCalled();
    expect(screen.getByRole('progressbar', { name: 'Téléchargement du modèle' })).toBeOnTheScreen();
    await act(async () => {
      useModel.setState({ status: 'ready', progress: 1 });
      await jest.advanceTimersByTimeAsync(0);
    });
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByText('Modèle de transcription absent')).toBeNull();
  });

  it('warns when space runs low and leads to the storage screen', async () => {
    jest.mocked(freeBytes).mockReturnValue(300 * 1024 * 1024);
    await renderScreen(<LibraryScreen />);
    expect(screen.getByText('Espace presque plein')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Gérer l’espace' }));
    expect(router.push).toHaveBeenCalledWith('/settings/storage');
  });

  it('has no hard-coded text in its notices (pseudo-locale)', async () => {
    useModel.setState({ status: 'missing', progress: 0 });
    jest.mocked(freeBytes).mockReturnValue(10 * 1024 * 1024);
    await setDemoDataEnabled(false);
    await usePseudoLocale();
    await renderScreen(<LibraryScreen />);
    expect(hardCodedTexts()).toEqual([]);
  });
});
