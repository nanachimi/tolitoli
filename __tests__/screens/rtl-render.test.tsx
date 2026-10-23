import { screen } from '@testing-library/react-native';
import { I18nManager, StyleSheet } from 'react-native';

import LibraryScreen from '../../app/(tabs)/index';
import SettingsScreen from '../../app/(tabs)/settings';
import { i18next } from '@/i18n';

import { renderScreen } from './renderScreen';

jest.mock('@/ui/layout/useLayoutMode', () => ({
  ...jest.requireActual('@/ui/layout/useLayoutMode'),
  useLayoutMode: () => 'tablet-split',
}));

describe('Arabic (RTL) rendering', () => {
  beforeEach(async () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    await i18next.changeLanguage('ar');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the settings screen in Arabic', async () => {
    await renderScreen(<SettingsScreen />);
    expect(screen.getByText('لغة الواجهة')).toBeOnTheScreen();
  });

  it('puts the list pane on the start side of the tablet split view', async () => {
    await renderScreen(<LibraryScreen />);

    const row = StyleSheet.flatten(screen.getByTestId('split-layout').props.style);
    const list = StyleSheet.flatten(screen.getByTestId('split-list').props.style);
    // `row` (not `row-reverse`) and start/end borders flip automatically in RTL.
    expect(row.flexDirection).toBe('row');
    expect(list.borderEndWidth).toBeGreaterThan(0);
    expect(list.borderRightWidth).toBeUndefined();
    expect(screen.getByText('اضغط على تسجيل للبدء')).toBeOnTheScreen();
  });
});
