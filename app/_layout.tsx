import { NavigationBar } from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';

import { initI18n } from '@/i18n';
import { ThemeProvider, useTheme } from '@/ui';

const i18n = initI18n();

function ThemedStack() {
  const theme = useTheme();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.background);
  }, [theme.colors.background]);

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      {/* Android system navigation bar buttons follow the colour scheme (D-015). */}
      <NavigationBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <ThemedStack />
      </ThemeProvider>
    </I18nextProvider>
  );
}
