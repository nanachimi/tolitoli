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

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: `${fr.app.name}${NAME_SUFFIX[VARIANT]}`,
  owner: 'tolitoli',
  slug: 'tolitoli',
  scheme: 'tolitoli',
  version: '0.1.0',
  orientation: 'default',
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
