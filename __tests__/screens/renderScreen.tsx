import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { i18next, initI18n } from '@/i18n';
import { ThemeProvider } from '@/ui';

initI18n();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export function renderScreen(ui: ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <I18nextProvider i18n={i18next}>
        <ThemeProvider>{ui}</ThemeProvider>
      </I18nextProvider>
    </SafeAreaProvider>,
  );
}
