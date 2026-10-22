import { NavigationBar } from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';

import { recoverAtLaunch } from '@/features/recording/recordingController';
import { initI18n } from '@/i18n';
import { ThemeProvider, useTheme } from '@/ui';

const i18n = initI18n();

function ThemedStack() {
  const theme = useTheme();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.color['surface']);
  }, [theme.color['surface']]);

  // Recordings left by a killed app are finalised and marked recovered, never deleted.
  useEffect(() => {
    void recoverAtLaunch();
  }, []);

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      {/* Android system navigation bar buttons follow the colour scheme (D-015). */}
      <NavigationBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="record"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
      </Stack>
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
