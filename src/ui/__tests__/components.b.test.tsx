import { screen, userEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { I18nManager, StyleSheet } from 'react-native';

import { renderScreen } from '../../../__tests__/screens/renderScreen';
import { hardCodedTexts, t, usePseudoLocale } from './support';
import { i18next } from '@/i18n';
import { color, QualityChip, RecordButton, RecordingCard, TranscriptSegment } from '@/ui';

const light = color.light;

function flat(node: { props: { style?: unknown } }) {
  return StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;
}

afterEach(async () => {
  jest.restoreAllMocks();
  await i18next.changeLanguage('fr');
});

describe('RecordButton', () => {
  it('record: 72 px accent circle with a mic, haptic, labelled "Enregistrer"', async () => {
    const onPress = jest.fn();
    const haptic = jest.spyOn(Haptics, 'impactAsync').mockResolvedValue();
    await renderScreen(
      <RecordButton
        mode="record"
        label="Enregistrer"
        accessibilityLabel="Enregistrer"
        onPress={onPress}
      />,
    );
    const button = screen.getByRole('button', { name: 'Enregistrer' });
    expect(flat(button)).toMatchObject({ width: 72, height: 72, backgroundColor: light.accent });
    await userEvent.setup().press(button);
    expect(onPress).toHaveBeenCalled();
    expect(haptic).toHaveBeenCalled();
  });

  it('stop: 96 px raised circle ringed in accent with an accent square, no haptic', async () => {
    const haptic = jest.spyOn(Haptics, 'impactAsync').mockResolvedValue();
    await renderScreen(
      <RecordButton
        mode="stop"
        label="Arrêter"
        accessibilityLabel="Arrêter l’enregistrement"
        onPress={jest.fn()}
      />,
    );
    const button = screen.getByRole('button', { name: 'Arrêter l’enregistrement' });
    expect(flat(button)).toMatchObject({ width: 96, borderColor: light.accent });
    expect(flat(screen.getByTestId('stop-square'))).toMatchObject({ width: 32 });
    await userEvent.setup().press(button);
    expect(haptic).not.toHaveBeenCalled();
  });

  it('has no hard-coded text (pseudo-locale)', async () => {
    await usePseudoLocale();
    await renderScreen(
      <RecordButton
        mode="record"
        label={t('record.start')}
        accessibilityLabel={t('record.start')}
        onPress={jest.fn()}
      />,
    );
    expect(hardCodedTexts()).toEqual([]);
  });
});

describe('QualityChip', () => {
  it.each([
    ['good', 'Swahili · bonne', light.success],
    ['medium', 'Lingala · moyenne', light.ink],
    ['draft', 'Yoruba · brouillon', light.warning],
  ] as const)('%s always says its quality word', async (quality, text, ink) => {
    const language = text.split(' ·')[0];
    await renderScreen(<QualityChip language={language} quality={quality} />);
    expect(flat(screen.getByText(text)).color).toBe(ink);
  });

  it('failed says "Échec" in danger, after the language when it is known', async () => {
    await renderScreen(<QualityChip language="Français" quality="failed" />);
    expect(flat(screen.getByText('Français · Échec')).color).toBe(light.danger);
    expect(screen.getByTestId('icon-alert-triangle', { includeHiddenElements: true })).toBeTruthy();
  });

  it('failed reads "Échec" alone when the language is unknown', async () => {
    await renderScreen(<QualityChip quality="failed" />);
    expect(screen.getByLabelText('Échec')).toBeOnTheScreen();
  });

  it('busy reads "Transcription…"', async () => {
    await renderScreen(<QualityChip quality="busy" />);
    expect(screen.getByText('Transcription…')).toBeOnTheScreen();
  });

  it('has no hard-coded text (pseudo-locale)', async () => {
    await usePseudoLocale();
    await renderScreen(<QualityChip language="Wolof" quality="draft" />);
    expect(hardCodedTexts()).toEqual([]);
  });
});

describe('RecordingCard', () => {
  const recording = {
    title: 'Enregistrement du 22 oct. 09:31',
    time: '09:31',
    duration: '1 h 12',
    state: 'audio' as const,
    recovered: true,
  };

  it('shows title, time · duration and the recovered badge, as one accessible element', async () => {
    await renderScreen(<RecordingCard recording={recording} accessibilityLabel="Carte" />);
    expect(screen.getByLabelText('Carte')).toBeOnTheScreen();
    expect(screen.getByText('09:31 · 1 h 12', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Récupéré', { includeHiddenElements: true })).toBeTruthy();
  });

  it('shows a failure to the eye: danger icon and an "Échec" chip', async () => {
    await renderScreen(
      <RecordingCard
        recording={{ ...recording, state: 'failed', language: 'Français', recovered: false }}
        accessibilityLabel="Carte"
      />,
    );
    const icons = screen.getAllByTestId('icon-alert-triangle', { includeHiddenElements: true });
    // The state icon, then the chip's.
    expect(icons).toHaveLength(2);
    expect(JSON.stringify(icons[0])).toContain(light.danger);
    expect(screen.getByText('Français · Échec', { includeHiddenElements: true })).toBeTruthy();
  });

  it('has no chevron while there is nowhere to go, one when it opens something', async () => {
    const view = await renderScreen(
      <RecordingCard recording={recording} accessibilityLabel="Carte" />,
    );
    expect(screen.queryByTestId('icon-chevron-right', { includeHiddenElements: true })).toBeNull();
    await view.rerender(
      <RecordingCard recording={recording} accessibilityLabel="Carte" onPress={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Carte' })).toBeOnTheScreen();
    expect(screen.getByTestId('icon-chevron-right', { includeHiddenElements: true })).toBeTruthy();
  });

  it('mirrors the chevron in Arabic and has no hard-coded text (pseudo-locale)', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    await usePseudoLocale();
    await renderScreen(
      <RecordingCard
        recording={{ ...recording, title: t('library.title') }}
        accessibilityLabel={t('library.title')}
        onPress={jest.fn()}
      />,
    );
    expect(hardCodedTexts()).toEqual([]);
    const chevron = screen.getByTestId('icon-chevron-right', { includeHiddenElements: true });
    expect(flat(chevron).transform).toEqual([{ scaleX: -1 }]);
  });
});

describe('TranscriptSegment', () => {
  it.each([
    ['past', 'transparent', light.ink],
    ['active', light['accent-soft'], light.ink],
    ['upcoming', 'transparent', light['ink-muted']],
  ] as const)('%s segment', async (state, background, ink) => {
    const onPress = jest.fn();
    await renderScreen(
      <TranscriptSegment
        timestamp="12:11"
        speaker="Locuteur 2"
        text="Sawa, but the delivery schedule needs to move to Friday."
        state={state}
        onPress={onPress}
      />,
    );
    const segment = screen.getByRole('button');
    expect(flat(segment).backgroundColor).toBe(background);
    expect(segment.props.accessibilityState).toMatchObject({ selected: state === 'active' });
    expect(flat(screen.getByText(/delivery schedule/)).color).toBe(ink);
    await userEvent.setup().press(segment);
    expect(onPress).toHaveBeenCalled();
  });
});
