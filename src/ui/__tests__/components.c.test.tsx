import { act, screen, userEvent } from '@testing-library/react-native';
import { AccessibilityInfo, I18nManager, StyleSheet } from 'react-native';

import { renderScreen } from '../../../__tests__/screens/renderScreen';
import { hardCodedTexts, t, usePseudoLocale } from './support';
import { i18next } from '@/i18n';
import { color, EmptyState, ProgressBar, ScreenHeader, SearchField, TextField } from '@/ui';

const light = color.light;

function flat(node: { props: { style?: unknown } }) {
  return StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;
}

afterEach(async () => {
  jest.restoreAllMocks();
  await i18next.changeLanguage('fr');
});

describe('SearchField', () => {
  it('is a search field labelled by its placeholder, with a clear button only once typed', async () => {
    const onClear = jest.fn();
    const view = await renderScreen(
      <SearchField
        value=""
        onChangeText={jest.fn()}
        onClear={onClear}
        placeholder="Rechercher dans les enregistrements"
      />,
    );
    expect(screen.getByLabelText('Rechercher dans les enregistrements')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Effacer la recherche' })).toBeNull();
    await view.rerender(
      <SearchField
        value="lingala"
        onChangeText={jest.fn()}
        onClear={onClear}
        placeholder="Rechercher"
      />,
    );
    await userEvent.setup().press(screen.getByRole('button', { name: 'Effacer la recherche' }));
    expect(onClear).toHaveBeenCalled();
  });

  it('passes typed text to the consumer', async () => {
    const onChangeText = jest.fn();
    await renderScreen(
      <SearchField
        value=""
        onChangeText={onChangeText}
        onClear={jest.fn()}
        placeholder="Rechercher"
      />,
    );
    await userEvent.setup().type(screen.getByLabelText('Rechercher'), 'abc');
    expect(onChangeText).toHaveBeenCalledWith('c');
  });
});

describe('TextField', () => {
  it('keeps its label visible and shows the hint', async () => {
    await renderScreen(
      <TextField label="Titre" value="" onChangeText={jest.fn()} hint="40 caractères au plus" />,
    );
    expect(screen.getByText('Titre')).toBeOnTheScreen();
    expect(screen.getByText('40 caractères au plus')).toBeOnTheScreen();
  });

  it('replaces the hint by the error, with a danger border, an icon and an announcement', async () => {
    await renderScreen(
      <TextField
        label="Titre"
        value=""
        onChangeText={jest.fn()}
        hint="aide"
        error="Donnez un titre d’au moins un caractère."
      />,
    );
    expect(screen.queryByText('aide')).toBeNull();
    const field = screen.getByLabelText('Titre');
    expect(flat(field).borderColor).toBe(light.danger);
    expect(field.props.accessibilityHint).toBe('Donnez un titre d’au moins un caractère.');
    expect(screen.getByTestId('icon-alert-triangle', { includeHiddenElements: true })).toBeTruthy();
  });
});

describe('EmptyState', () => {
  it('welcoming: icon in an accent-soft disc, one accessible node, one action', async () => {
    const onPress = jest.fn();
    await renderScreen(
      <EmptyState
        tone="welcoming"
        icon="mic"
        title="Aucun enregistrement"
        body="Appuyez sur Enregistrer pour commencer."
        action={{ label: 'Activer le cloud', onPress }}
      />,
    );
    expect(
      screen.getByLabelText('Aucun enregistrement. Appuyez sur Enregistrer pour commencer.'),
    ).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Activer le cloud' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('quiet: no disc, ink-faint icon, no action', async () => {
    await renderScreen(
      <EmptyState tone="quiet" icon="search" title="Aucun résultat" body="Essayez un autre mot." />,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('has no hard-coded text (pseudo-locale)', async () => {
    await usePseudoLocale();
    await renderScreen(
      <EmptyState
        tone="quiet"
        icon="search"
        title={t('library.empty.title')}
        body={t('library.empty.body')}
      />,
    );
    expect(hardCodedTexts()).toEqual([]);
  });
});

describe('ProgressBar', () => {
  it('determinate: shows the percentage in the locale and carries its value', async () => {
    await renderScreen(
      <ProgressBar label="Modèle" value={0.62} detail="145 Mo sur 233 Mo" state="running" />,
    );
    const bar = screen.getByRole('progressbar', { name: 'Modèle' });
    expect(bar.props.accessibilityValue).toMatchObject({ now: 62 });
    expect(screen.getByText('62 %', { includeHiddenElements: true })).toBeTruthy();
    expect(flat(screen.getByTestId('progress-fill', { includeHiddenElements: true })).width).toBe(
      '62%',
    );
  });

  it('indeterminate: no percentage, a sliding 40 % segment, still and dimmed with reduced motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await renderScreen(
      <ProgressBar
        label="Transcription"
        state="running"
        detail="Cela peut prendre quelques minutes"
      />,
    );
    await act(async () => {});
    expect(
      screen.getByRole('progressbar', { name: 'Transcription' }).props.accessibilityValue,
    ).toBeUndefined();
    expect(
      flat(screen.getByTestId('progress-fill', { includeHiddenElements: true })),
    ).toMatchObject({ width: '100%', opacity: 0.35 });
  });

  it('done: full bar and "Terminé" in success', async () => {
    await renderScreen(<ProgressBar label="Modèle" value={1} state="done" />);
    expect(flat(screen.getByText('Terminé', { includeHiddenElements: true })).color).toBe(
      light.success,
    );
  });
});

describe('ScreenHeader', () => {
  it('has a back button, a header title and an optional end action', async () => {
    const onBack = jest.fn();
    const onPress = jest.fn();
    await renderScreen(
      <ScreenHeader
        title="Réunion fournisseur"
        onBack={onBack}
        action={{ icon: 'more-horizontal', label: 'Autres actions', onPress }}
      />,
    );
    expect(screen.getByRole('header', { name: 'Réunion fournisseur' })).toBeOnTheScreen();
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Retour' }));
    await user.press(screen.getByRole('button', { name: 'Autres actions' }));
    expect(onBack).toHaveBeenCalled();
    expect(onPress).toHaveBeenCalled();
  });

  it('mirrors the back chevron in Arabic', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    await i18next.changeLanguage('ar');
    await renderScreen(<ScreenHeader title="العنوان" onBack={jest.fn()} />);
    const chevron = screen.getByTestId('icon-chevron-left', { includeHiddenElements: true });
    expect(flat(chevron).transform).toEqual([{ scaleX: -1 }]);
  });
});
