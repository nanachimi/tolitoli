import type { ConfigContext, ExpoConfig } from 'expo/config';

import fr from './src/i18n/fr.json';

type Variant = 'development' | 'preview' | 'production';

const VARIANT: Variant = (process.env.APP_VARIANT as Variant | undefined) ?? 'development';

// Production keeps the canonical identifier (docs/DECISIONS.md D-002); other
// variants get a suffix so all three builds can coexist on one device.
const BASE_ID = 'app.tolitoli.mobile';
const ID_SUFFIX: Record<Variant, string> = {
  development: '.dev',
  preview: '.preview',
  production: '',
};
const NAME_SUFFIX: Record<Variant, string> = {
  development: ' Dev',
  preview: ' Preview',
  production: '',
};

// Public identifier from `eas init` (@tolitoli/tolitoli); not a secret (D-011).
const EAS_PROJECT_ID = '705d0724-afde-4df4-83eb-6ad4db7b2cdf';

// Native strings (iOS permission prompts) per UI language; drafts per D-007.
const NATIVE_LOCALES = ['fr', 'en', 'de', 'ru', 'ar', 'wo', 'zh-Hans'] as const;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: `${fr.app.name}${NAME_SUFFIX[VARIANT]}`,
  owner: 'tolitoli',
  slug: 'tolitoli',
  scheme: 'tolitoli',
  version: '0.1.0',
  orientation: 'default',
  locales: Object.fromEntries(
    NATIVE_LOCALES.map((code) => [code, `./src/i18n/native/${code}.json`]),
  ),
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: `${BASE_ID}${ID_SUFFIX[VARIANT]}`,
  },
  android: {
    package: `${BASE_ID}${ID_SUFFIX[VARIANT]}`,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-dev-client',
    'expo-sqlite',
    ['expo-localization', { supportsRTL: true }],
    // Recording engine (D-020): microphone foreground service on Android that keeps
    // running if the app is swiped away; the notification stays visible (no discreet mode).
    [
      'react-native-audio-api',
      {
        iosBackgroundMode: true,
        iosMicrophonePermission:
          'Tolitoli uses the microphone to record the conversations you start. Audio stays on this device unless you turn on the cloud.',
        androidPermissions: [
          'android.permission.RECORD_AUDIO',
          'android.permission.FOREGROUND_SERVICE',
          'android.permission.FOREGROUND_SERVICE_MICROPHONE',
          'android.permission.POST_NOTIFICATIONS',
        ],
        androidForegroundService: true,
        androidFSTypes: ['microphone'],
        androidFSStopWithTask: false,
      },
    ],
    // Android navigation bar follows the theme (D-015); background colour APIs were removed in v56.
    ['expo-navigation-bar', { enforceContrast: false }],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        backgroundColor: '#FFFFFF',
        dark: { backgroundColor: '#121212' },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  runtimeVersion: { policy: 'fingerprint' },
  updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}` },
  extra: { eas: { projectId: EAS_PROJECT_ID } },
});
