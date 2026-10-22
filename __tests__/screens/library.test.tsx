import { act, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import LibraryScreen, { SEARCH_DEBOUNCE_MS } from '../../app/(tabs)/index';
import { library, setDemoDataEnabled } from '@/features/library/library';
import { i18next } from '@/i18n';
import * as layout from '@/ui/layout/useLayoutMode';

import { hardCodedTexts, usePseudoLocale } from '../../src/ui/__tests__/support';
import { renderScreen } from './renderScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('@/ui/layout/useLayoutMode', () => ({
  ...jest.requireActual('@/ui/layout/useLayoutMode'),
  useLayoutMode: jest.fn(() => 'single'),
}));

beforeEach(async () => {
  await i18next.changeLanguage('fr');
  setDemoDataEnabled(true);
});

afterEach(() => {
  jest.useRealTimers();
  jest.mocked(router.push).mockClear();
  jest.mocked(layout.useLayoutMode).mockReturnValue('single');
  for (const item of library.listTrash()) library.restore(item.id);
  setDemoDataEnabled(false);
});

async function search(text: string) {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.type(screen.getByRole('search'), text);
  await act(() => jest.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS));
}

describe('Library', () => {
  it('welcomes a first launch and says what to do', async () => {
    setDemoDataEnabled(false);
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
    expect(screen.getByRole('button', { name: /transcription en échec$/ })).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: /récupéré après une interruption$/ }),
    ).toBeOnTheScreen();
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
