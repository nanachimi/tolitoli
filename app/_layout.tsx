import { Rubik_500Medium, Rubik_600SemiBold, useFonts } from '@expo-google-fonts/rubik';
import { NavigationBar } from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';

import { useOnboarding } from '@/features/onboarding/onboarding';
import { startLibrary } from '@/features/library/launch';
import { useLibraryVersion } from '@/features/library/library';
import { initI18n } from '@/i18n';
import { ThemeProvider, useTheme } from '@/ui';

const i18n = initI18n();

// Titles are set in Rubik: the splash stays up until it is loaded (CLAUDE.md, Design).
void SplashScreen.preventAutoHideAsync();

function ThemedStack() {
  const theme = useTheme();
  const onboarded = useOnboarding((state) => state.done);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.color.surface);
  }, [theme.color.surface]);

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      {/* Android system navigation bar buttons follow the colour scheme (D-015). */}
      <NavigationBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Nothing opens, not even by a link, before the recording consent (CLAUDE.md). */}
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="record"
            options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
          />
          <Stack.Screen name="recording/[id]" />
          <Stack.Screen name="trash" />
          <Stack.Screen name="settings/interface-language" />
          <Stack.Screen name="settings/transcription-language" />
          <Stack.Screen name="settings/storage" />
          <Stack.Screen name="settings/about" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Rubik_500Medium, Rubik_600SemiBold });
  const libraryReady = useLibraryVersion((state) => state.ready);
  const ready = (fontsLoaded || fontError !== null) && libraryReady;

  // Database open and migrated, recordings recovered (never deleted), then the trash purge.
  useEffect(() => {
    void startLibrary();
  }, []);

  useEffect(() => {
    // On a font error the app goes on with the system font rather than staying on the splash.
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <ThemedStack />
      </ThemeProvider>
    </I18nextProvider>
  );
}
