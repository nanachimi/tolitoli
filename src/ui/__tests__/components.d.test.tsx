import { fireEvent, screen, userEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { I18nManager, StyleSheet } from 'react-native';

import { renderScreen } from '../../../__tests__/screens/renderScreen';
import { hardCodedTexts, usePseudoLocale } from './support';
import { i18next } from '@/i18n';
import { ActionSheet, color, Dialog, OnboardingPage, Player, StorageMeter } from '@/ui';

const light = color.light;
const MB = 1024 * 1024;

function flat(node: { props: { style?: unknown } }) {
  return StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;
}

afterEach(async () => {
  jest.restoreAllMocks();
  await i18next.changeLanguage('fr');
});

describe('Dialog', () => {
  const props = {
    visible: true,
    title: 'Mettre à la corbeille ?',
    body: '« Réunion » restera 30 jours dans la corbeille.',
    confirmLabel: 'Mettre à la corbeille',
    cancelLabel: 'Annuler',
  };

  it('asks a question, cancels first, confirms with a filled danger button when destructive', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await renderScreen(<Dialog {...props} destructive onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByRole('header', { name: 'Mettre à la corbeille ?' })).toBeOnTheScreen();
    const confirm = screen.getByRole('button', { name: 'Mettre à la corbeille' });
    expect(flat(confirm).backgroundColor).toBe(light.danger);
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Annuler' }));
    await user.press(confirm);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('closes on the veil like Cancel', async () => {
    const onCancel = jest.fn();
    await renderScreen(<Dialog {...props} onConfirm={jest.fn()} onCancel={onCancel} />);
    await fireEvent.press(screen.getByTestId('dialog-veil', { includeHiddenElements: true }));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('ActionSheet', () => {
  it('lists actions, separates the destructive one and closes on the veil', async () => {
    const onClose = jest.fn();
    const rename = jest.fn();
    await renderScreen(
      <ActionSheet
        visible
        title="Réunion fournisseur"
        note="L’export arrive avec la transcription."
        items={[
          { label: 'Renommer', icon: 'file-text', onPress: rename },
          {
            label: 'Mettre à la corbeille',
            icon: 'trash-2',
            destructive: true,
            onPress: jest.fn(),
          },
        ]}
        onClose={onClose}
      />,
    );
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
    expect(flat(screen.getByText('Mettre à la corbeille')).color).toBe(light.danger);
    expect(screen.getByText('L’export arrive avec la transcription.')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('menuitem', { name: 'Renommer' }));
    expect(rename).toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('sheet-veil', { includeHiddenElements: true }));
    expect(onClose).toHaveBeenCalled();
  });

  it('marks the chosen line of a choice sheet', async () => {
    await renderScreen(
      <ActionSheet
        visible
        items={[
          { label: '1×', checked: true, onPress: jest.fn() },
          { label: '1,5×', checked: false, onPress: jest.fn() },
        ]}
        onClose={jest.fn()}
      />,
    );
    // React Native has no menuitemradio role: the state rides on the menu item.
    expect(screen.getByRole('menuitem', { name: '1×' }).props.accessibilityState).toEqual({
      checked: true,
    });
    expect(screen.getByRole('menuitem', { name: '1,5×' }).props.accessibilityState).toEqual({
      checked: false,
    });
  });
});

describe('StorageMeter', () => {
  it('names the three parts in one image label and keeps small parts visible', async () => {
    const onEmptyTrash = jest.fn();
    await renderScreen(
      <StorageMeter
        recordingsBytes={1800 * MB}
        trashBytes={1 * MB}
        freeBytes={12_400 * MB}
        onEmptyTrash={onEmptyTrash}
      />,
    );
    expect(
      screen.getByRole('image', { name: 'Enregistrements 1,8 Go, corbeille 1 Mo, libre 12,1 Go' }),
    ).toBeOnTheScreen();
    expect(flat(screen.getByTestId('storage-trash', { includeHiddenElements: true })).width).toBe(
      '2%',
    );
    await userEvent.setup().press(screen.getByRole('button', { name: 'Vider la corbeille' }));
    expect(onEmptyTrash).toHaveBeenCalled();
  });

  it('warns when space runs low, and when recording would not start', async () => {
    const view = await renderScreen(
      <StorageMeter
        recordingsBytes={0}
        trashBytes={0}
        freeBytes={300 * MB}
        warning={{ kind: 'low', remainingMinutes: 156 }}
      />,
    );
    expect(screen.getByText('Espace presque plein')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Vider la corbeille' })).toBeNull();
    await view.rerender(
      <StorageMeter
        recordingsBytes={0}
        trashBytes={0}
        freeBytes={10 * MB}
        warning={{ kind: 'insufficient', remainingMinutes: 5 }}
      />,
    );
    expect(screen.getByText(/L’enregistrement ne démarrera pas/)).toBeOnTheScreen();
  });
});

describe('OnboardingPage', () => {
  it('page 1: brand, promise, Continue', async () => {
    const onNext = jest.fn();
    await renderScreen(<OnboardingPage page={1} onNext={onNext} />);
    expect(
      screen.getByText('Tout reste sur votre appareil. Aucun compte n’est nécessaire.'),
    ).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Continuer' }));
    expect(onNext).toHaveBeenCalled();
  });

  it('page 2: the button stays disabled, and says why, until the box is ticked', async () => {
    const onToggleAccept = jest.fn();
    const view = await renderScreen(
      <OnboardingPage
        page={2}
        onNext={jest.fn()}
        accepted={false}
        onToggleAccept={onToggleAccept}
      />,
    );
    const accept = screen.getByRole('button', { name: 'Accepter et continuer' });
    expect(accept).toBeDisabled();
    expect(accept.props.accessibilityHint).toBe('Cochez d’abord la case pour continuer.');
    const box = screen.getByRole('checkbox', {
      name: 'J’informerai les personnes présentes que j’enregistre.',
    });
    expect(box).not.toBeChecked();
    await userEvent.setup().press(box);
    expect(onToggleAccept).toHaveBeenCalled();
    await view.rerender(
      <OnboardingPage page={2} onNext={jest.fn()} accepted onToggleAccept={onToggleAccept} />,
    );
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getByRole('button', { name: 'Accepter et continuer' })).toBeEnabled();
  });

  it('page 3: downloading then Start, with a later option while downloading', async () => {
    const download = { value: 0.62, done: false, doneSize: '145 Mo', totalSize: '233 Mo' };
    const view = await renderScreen(
      <OnboardingPage page={3} onNext={jest.fn()} download={download} onLater={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Téléchargement…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Télécharger plus tard' })).toBeOnTheScreen();
    await view.rerender(
      <OnboardingPage
        page={3}
        onNext={jest.fn()}
        download={{ ...download, value: 1, done: true }}
        onLater={jest.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Commencer' })).toBeEnabled();
  });

  it.each([1, 2, 3] as const)('page %d has no hard-coded text (pseudo-locale)', async (page) => {
    await usePseudoLocale();
    const props =
      page === 1
        ? { page, onNext: jest.fn() }
        : page === 2
          ? { page, onNext: jest.fn(), accepted: false, onToggleAccept: jest.fn() }
          : {
              page,
              onNext: jest.fn(),
              onLater: jest.fn(),
              download: { value: 0.5, done: false, doneSize: '1', totalSize: '2' },
            };
    await renderScreen(<OnboardingPage {...(props as ComponentProps<typeof OnboardingPage>)} />);
    expect(hardCodedTexts()).toEqual([]);
  });
});

describe('Player', () => {
  const base = {
    positionMs: 734_000,
    durationMs: 1_928_000,
    rate: 1,
    onSeek: jest.fn(),
    onTogglePlay: jest.fn(),
    onSkip: jest.fn(),
    onRateChange: jest.fn(),
  };

  it('shows the times, a labelled play/pause and 15 s skips', async () => {
    const onSkip = jest.fn();
    const onTogglePlay = jest.fn();
    await renderScreen(
      <Player {...base} playing={false} onSkip={onSkip} onTogglePlay={onTogglePlay} />,
    );
    expect(screen.getByText('12:14', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('32:08', { includeHiddenElements: true })).toBeTruthy();
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Lire' }));
    await user.press(screen.getByRole('button', { name: 'Reculer de 15 secondes' }));
    await user.press(screen.getByRole('button', { name: 'Avancer de 15 secondes' }));
    expect(onTogglePlay).toHaveBeenCalled();
    expect(onSkip.mock.calls).toEqual([[-15_000], [15_000]]);
  });

  it('labels the button Pause while playing', async () => {
    await renderScreen(<Player {...base} playing />);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeOnTheScreen();
  });

  it('is adjustable for screen readers, with the position spoken in words, 15 s per step', async () => {
    const onSkip = jest.fn();
    await renderScreen(<Player {...base} playing onSkip={onSkip} />);
    const bar = screen.getByRole('adjustable', { name: 'Position de lecture' });
    expect(bar.props.accessibilityValue).toEqual({ text: '12 min 14 s sur 32 min 8 s' });
    await fireEvent(bar, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onSkip).toHaveBeenCalledWith(15_000);
  });

  it('dims the fill and knob when paused', async () => {
    await renderScreen(<Player {...base} playing={false} />);
    expect(flat(screen.getByTestId('player-fill')).backgroundColor).toBe(light['ink-muted']);
  });

  it('chooses the rate in a sheet, written in the locale', async () => {
    const onRateChange = jest.fn();
    await renderScreen(<Player {...base} playing onRateChange={onRateChange} />);
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Vitesse de lecture : 1×' }));
    expect(
      screen.getAllByRole('menuitem').map((item) => item.props.accessibilityState?.checked),
    ).toEqual([false, false, true, false, false, false]);
    await user.press(screen.getByRole('menuitem', { name: '1,5×' }));
    expect(onRateChange).toHaveBeenCalledWith(1.5);
  });

  it('mirrors the skip icons in Arabic', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    await i18next.changeLanguage('ar');
    await renderScreen(<Player {...base} playing />);
    expect(
      flat(screen.getByTestId('icon-rotate-ccw', { includeHiddenElements: true })).transform,
    ).toEqual([{ scaleX: -1 }]);
  });

  it('has no hard-coded text (pseudo-locale)', async () => {
    await usePseudoLocale();
    await renderScreen(<Player {...base} playing />);
    expect(hardCodedTexts()).toEqual([]);
  });
});
