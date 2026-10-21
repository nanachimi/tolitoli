import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/ui';

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

export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarAllowFontScaling: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('library.title'),
          tabBarIcon: tabIcon('albums', 'albums-outline'),
          tabBarLabel: t('tabs.library'),
          tabBarAccessibilityLabel: t('tabs.library'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings.title'),
          tabBarIcon: tabIcon('settings', 'settings-outline'),
          tabBarLabel: t('tabs.settings'),
          tabBarAccessibilityLabel: t('tabs.settings'),
        }}
      />
    </Tabs>
  );
}
