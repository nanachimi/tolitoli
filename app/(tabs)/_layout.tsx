import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Text, useWindowDimensions, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import {
  getTabBarHeight,
  TAB_LABEL_FONT_SIZE,
  TAB_LABEL_LINE_HEIGHT,
  TAB_LABEL_MAX_FONT_SCALE,
  useTheme,
} from '@/ui';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Symmetric glyphs only, so nothing needs mirroring in RTL (D-013). Icons are
 * decorative: the tab label already carries the accessible name.
 */
function tabIcon(focused: IconName, unfocused: IconName) {
  function TabIcon({
    color,
    size,
    focused: isFocused,
  }: {
    color: ColorValue;
    size: number;
    focused: boolean;
  }) {
    return (
      <Ionicons
        name={isFocused ? focused : unfocused}
        // Tint colors come from the theme (hex strings); ColorValue is wider than Ionicons accepts.
        color={color as string}
        size={size}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    );
  }
  return TabIcon;
}

/** Label capped at 1.5× the base size so it always fits the grown bar (D-014). */
function tabLabel(text: string) {
  function TabLabel({ color }: { color: ColorValue }) {
    return (
      <Text
        allowFontScaling
        maxFontSizeMultiplier={TAB_LABEL_MAX_FONT_SCALE}
        numberOfLines={1}
        style={{
          color,
          fontSize: TAB_LABEL_FONT_SIZE,
          lineHeight: TAB_LABEL_LINE_HEIGHT,
          fontWeight: '500',
          textAlign: 'center',
        }}
      >
        {text}
      </Text>
    );
  }
  return TabLabel;
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.color['surface-raised'] },
        headerTintColor: theme.color['ink'],
        tabBarStyle: {
          backgroundColor: theme.color['surface-raised'],
          borderTopColor: theme.color['hairline'],
          height: getTabBarHeight(fontScale, insets.bottom),
        },
        tabBarActiveTintColor: theme.color['accent'],
        tabBarInactiveTintColor: theme.color['ink-muted'],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('library.title'),
          tabBarIcon: tabIcon('albums', 'albums-outline'),
          tabBarLabel: tabLabel(t('tabs.library')),
          tabBarAccessibilityLabel: t('tabs.library'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings.title'),
          tabBarIcon: tabIcon('settings', 'settings-outline'),
          tabBarLabel: tabLabel(t('tabs.settings')),
          tabBarAccessibilityLabel: t('tabs.settings'),
        }}
      />
    </Tabs>
  );
}
