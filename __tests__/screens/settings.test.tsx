import { screen, userEvent } from '@testing-library/react-native';
import { DevSettings } from 'react-native';

import SettingsScreen from '../../app/(tabs)/settings';
import { i18next } from '@/i18n';
import { UI_LANGUAGES } from '@/i18n/languages';

import { renderScreen } from './renderScreen';

describe('Settings language picker', () => {
  beforeEach(async () => {
    await i18next.changeLanguage('fr');
    jest.spyOn(DevSettings, 'reload').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('labels every language option and marks the current one', async () => {
    await renderScreen(<SettingsScreen />);
    for (const { code, nativeName } of UI_LANGUAGES) {
      const option = screen.getByRole('radio', { name: `Langue de l’interface : ${nativeName}` });
      if (code === 'fr') expect(option).toBeChecked();
      else expect(option).not.toBeChecked();
    }
  });

  it('exposes each language once to screen readers (radio label only)', async () => {
    await renderScreen(<SettingsScreen />);
    for (const { nativeName } of UI_LANGUAGES) {
      expect(screen.getByText(nativeName, { includeHiddenElements: true })).toBeTruthy();
      expect(screen.queryByText(nativeName)).toBeNull();
    }
  });

  it('says before choosing that Arabic restarts the app', async () => {
    await renderScreen(<SettingsScreen />);
    const arabic = screen.getByRole('radio', { name: 'Langue de l’interface : العربية' });
    expect(arabic.props.accessibilityHint).toBe(
      'L’application va redémarrer pour changer le sens d’écriture.',
    );
    expect(
      screen.getByRole('radio', { name: 'Langue de l’interface : English' }).props
        .accessibilityHint,
    ).toBeUndefined();
  });

  it('switches the interface to German', async () => {
    const user = userEvent.setup();
    await renderScreen(<SettingsScreen />);

    await user.press(screen.getByRole('radio', { name: 'Langue de l’interface : Deutsch' }));

    expect(await screen.findByText('Sprache der Benutzeroberfläche')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: /Deutsch$/ })).toBeChecked();
  });
});
