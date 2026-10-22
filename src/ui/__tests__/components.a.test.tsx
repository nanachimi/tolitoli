import { act, fireEvent, screen, userEvent } from '@testing-library/react-native';
import { AccessibilityInfo, I18nManager, StyleSheet } from 'react-native';

import { renderScreen } from '../../../__tests__/screens/renderScreen';
import { hardCodedTexts, t, usePseudoLocale } from './support';
import { i18next } from '@/i18n';
import { Banner, Button, color, LevelMeter, Timer } from '@/ui';

const light = color.light;

function flat(node: { props: { style?: unknown } }) {
  return StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;
}

afterEach(async () => {
  await i18next.changeLanguage('fr');
});

describe('Button', () => {
  it.each([
    ['primary', light.accent],
    ['secondary', light['surface-raised']],
    ['ghost', 'transparent'],
    ['danger', 'transparent'],
  ] as const)('%s variant', async (variant, background) => {
    const onPress = jest.fn();
    await renderScreen(<Button label="Exporter" variant={variant} onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Exporter' });
    expect(flat(button).backgroundColor).toBe(background);
    expect(flat(button).minHeight).toBe(48);
    await userEvent.setup().press(button);
    expect(onPress).toHaveBeenCalled();
  });

  it('shows disabled as ink-faint on surface-sunken, never by opacity', async () => {
    const onPress = jest.fn();
    await renderScreen(<Button label="Enregistrer" disabled onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Enregistrer' });
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    expect(flat(button).backgroundColor).toBe(light['surface-sunken']);
    expect(flat(button).opacity).toBeUndefined();
    expect(flat(screen.getByText('Enregistrer')).color).toBe(light['ink-faint']);
  });

  it('draws the focus ring outside the control when focused', async () => {
    await renderScreen(<Button label="Exporter" onPress={jest.fn()} />);
    await fireEvent(screen.getByRole('button'), 'focus');
    expect(flat(screen.getByTestId('button-focus-ring')).borderColor).toBe(light.focus);
  });

  it('has no hard-coded text (pseudo-locale)', async () => {
    await usePseudoLocale();
    await renderScreen(<Button label={t('record.pause')} icon="pause" onPress={jest.fn()} />);
    expect(hardCodedTexts()).toEqual([]);
  });
});

describe('Banner', () => {
  it('interrupted: accent-soft, phone-off icon, no button, announced', async () => {
    await renderScreen(
      <Banner
        kind="interrupted"
        title="Enregistrement interrompu"
        body="Vous pourrez reprendre."
      />,
    );
    const header = screen.getByRole('header', { name: 'Enregistrement interrompu' });
    expect(header).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByTestId('icon-phone-off', { includeHiddenElements: true })).toBeTruthy();
    const banner = screen.getByTestId('banner');
    expect(banner.props.accessibilityLiveRegion).toBe('assertive');
    expect(flat(banner).backgroundColor).toBe(light['accent-soft']);
  });

  it('resumable: one action button', async () => {
    const onPress = jest.fn();
    await renderScreen(
      <Banner
        kind="resumable"
        title="Appel terminé"
        body="Ce qui précède l’appel est conservé."
        action={{ label: 'Reprendre l’enregistrement', onPress }}
      />,
    );
    await userEvent
      .setup()
      .press(screen.getByRole('button', { name: 'Reprendre l’enregistrement' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('alert: surface-raised with a hairline and a danger icon', async () => {
    await renderScreen(<Banner kind="alert" title="Le micro semble coupé" body="…" />);
    expect(screen.getByTestId('icon-alert-triangle', { includeHiddenElements: true })).toBeTruthy();
  });

  it('has no hard-coded text (pseudo-locale) and lays out in RTL', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    await usePseudoLocale();
    await renderScreen(
      <Banner kind="alert" title={t('record.micSilent.title')} body={t('record.micSilent.body')} />,
    );
    expect(hardCodedTexts()).toEqual([]);
  });
});

describe('LevelMeter', () => {
  // The 60 ms smoothing animates outside React's act(); fake timers keep the tests quiet.
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('is a progress bar with its percentage, never a live region', async () => {
    await renderScreen(<LevelMeter level={0.5} />);
    const meter = screen.getByRole('progressbar', { name: 'Niveau sonore : 50 %' });
    expect(meter.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 50 });
    expect(meter.props.accessibilityLiveRegion).toBeUndefined();
  });

  it('fills in accent, and in ink-faint below 0.05 (silence, no alarm)', async () => {
    const view = await renderScreen(<LevelMeter level={0.5} />);
    expect(flat(screen.getByTestId('level-fill')).backgroundColor).toBe(light.accent);
    await view.rerender(<LevelMeter level={0.02} />);
    expect(flat(screen.getByTestId('level-fill')).backgroundColor).toBe(light['ink-faint']);
  });

  it('has no hard-coded text (pseudo-locale)', async () => {
    await usePseudoLocale();
    await renderScreen(<LevelMeter level={0.3} />);
    expect(hardCodedTexts()).toEqual([]);
  });
});

describe('Timer', () => {
  it('shows HH:MM:SS, hidden from screen readers, with a per-minute spoken duration', async () => {
    await renderScreen(<Timer elapsedMs={65_000} state="recording" />);
    expect(screen.getByText('00:01:05', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText('00:01:05')).toBeNull();
    const spoken = screen.getByText('Durée : 1 min');
    expect(spoken.props.accessibilityLiveRegion).toBe('polite');
  });

  it('dims the time and stops the dot when paused or interrupted', async () => {
    await renderScreen(<Timer elapsedMs={1000} state="paused" />);
    const time = screen.getByText('00:00:01', { includeHiddenElements: true });
    expect(flat(time).color).toBe(light['ink-muted']);
    expect(flat(screen.getByTestId('timer-dot')).backgroundColor).toBe(light['ink-muted']);
  });

  it('keeps the dot still when the system reduces motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await renderScreen(<Timer elapsedMs={1000} state="recording" />);
    await act(async () => {});
    expect(flat(screen.getByTestId('timer-dot')).opacity).toBe(1);
  });

  it('has no hard-coded text (pseudo-locale)', async () => {
    await usePseudoLocale();
    await renderScreen(<Timer elapsedMs={125_000} state="interrupted" />);
    expect(hardCodedTexts()).toEqual([]);
  });
});
