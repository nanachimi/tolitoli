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

  it('switches the interface to German', async () => {
    const user = userEvent.setup();
    await renderScreen(<SettingsScreen />);

    await user.press(screen.getByRole('radio', { name: 'Langue de l’interface : Deutsch' }));

    expect(await screen.findByText('Sprache der Benutzeroberfläche')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: /Deutsch$/ })).toBeChecked();
  });
});
