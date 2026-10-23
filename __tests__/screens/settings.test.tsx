import { act, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AccessibilityInfo, DevSettings, I18nManager } from 'react-native';

import SettingsScreen from '../../app/(tabs)/settings';
import InterfaceLanguageScreen, {
  interfaceLanguageOptions,
} from '../../app/settings/interface-language';
import { i18next } from '@/i18n';
import { UI_LANGUAGES } from '@/i18n/languages';

import { hardCodedTexts, usePseudoLocale } from '../../src/ui/__tests__/support';
import { renderScreen } from './renderScreen';

jest.mock('@/features/library/storage', () => ({
  itemBytes: () => 0,
  totalBytes: () => 0,
  freeBytes: () => 8 * 1024 ** 3,
}));

beforeEach(async () => {
  await i18next.changeLanguage('fr');
  jest.spyOn(DevSettings, 'reload').mockImplementation(() => {});
  jest.spyOn(router, 'push').mockImplementation(() => {});
  jest.spyOn(router, 'back').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Settings: interface language row', () => {
  it('is one line with the current language, like the transcription language', async () => {
    await renderScreen(<SettingsScreen />);
    const row = screen.getByRole('button', { name: 'Langue de l’interface' });
    expect(row.props.accessibilityHint).toBe('Français');
    expect(screen.queryAllByRole('radio')).toEqual([]);
    await userEvent.setup().press(row);
    expect(router.push).toHaveBeenCalledWith('/settings/interface-language');
  });

  it('gives the focus back to the row when the sub-screen closes', async () => {
    const focus = jest
      .spyOn(AccessibilityInfo, 'sendAccessibilityEvent')
      .mockImplementation(() => {});
    await renderScreen(<SettingsScreen />);
    const row = screen.getByRole('button', { name: 'Langue de l’interface' });
    await userEvent.setup().press(row);
    expect(focus).not.toHaveBeenCalled();
    await act(async () => globalThis.refocus());
    expect(focus).toHaveBeenCalledTimes(1);
    expect(focus.mock.calls[0]?.[1]).toBe('focus');
    // Shown again later without having opened anything: no focus is forced.
    await act(async () => globalThis.refocus());
    expect(focus).toHaveBeenCalledTimes(1);
  });
});

describe('Interface language screen', () => {
  it('labels every language option and marks the current one', async () => {
    await renderScreen(<InterfaceLanguageScreen />);
    for (const { code, nativeName } of UI_LANGUAGES) {
      const option = screen.getByRole('radio', { name: `Langue de l’interface : ${nativeName}` });
      if (code === 'fr') expect(option).toBeChecked();
      else expect(option).not.toBeChecked();
    }
  });

  it('exposes each language once to screen readers (radio label only)', async () => {
    await renderScreen(<InterfaceLanguageScreen />);
    for (const { nativeName } of UI_LANGUAGES) {
      expect(screen.getByText(nativeName, { includeHiddenElements: true })).toBeTruthy();
      expect(screen.queryByText(nativeName)).toBeNull();
    }
  });

  it('says before choosing that Arabic restarts the app', async () => {
    await renderScreen(<InterfaceLanguageScreen />);
    const arabic = screen.getByRole('radio', { name: 'Langue de l’interface : العربية' });
    expect(arabic.props.accessibilityHint).toBe(
      'L’application va redémarrer pour changer le sens d’écriture.',
    );
    expect(
      screen.getByRole('radio', { name: 'Langue de l’interface : English' }).props
        .accessibilityHint,
    ).toBeUndefined();
  });

  it('switches the interface to German at the first tap', async () => {
    await renderScreen(<InterfaceLanguageScreen />);
    await userEvent
      .setup()
      .press(screen.getByRole('radio', { name: 'Langue de l’interface : Deutsch' }));
    expect(await screen.findByText('Verfügbare Sprachen')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: /Deutsch$/ })).toBeChecked();
  });

  it('offers the pseudo-locale in development only', () => {
    expect(interfaceLanguageOptions(true).map((o) => o.nativeName)).toContain('Pseudo');
    expect(interfaceLanguageOptions(false).map((o) => o.nativeName)).not.toContain('Pseudo');
    expect(interfaceLanguageOptions(false)).toHaveLength(UI_LANGUAGES.length);
  });

  it('renders in Arabic, French offered with a restart notice', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    await i18next.changeLanguage('ar');
    await renderScreen(<InterfaceLanguageScreen />);
    expect(screen.getByRole('header', { name: 'لغة الواجهة' })).toBeOnTheScreen();
    expect(
      screen.getByRole('radio', { name: 'لغة الواجهة: Français' }).props.accessibilityHint,
    ).toBeTruthy();
  });

  it('has no hard-coded text (pseudo-locale)', async () => {
    await usePseudoLocale();
    await renderScreen(<InterfaceLanguageScreen />);
    expect(hardCodedTexts()).toEqual([]);
  });
});
