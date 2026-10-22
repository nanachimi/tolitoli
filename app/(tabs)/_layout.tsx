import { Tabs } from 'expo-router';
import { Text, useWindowDimensions, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import {
  getTabBarHeight,
  Icon,
  TAB_BAR_PADDING_BOTTOM,
  TAB_BAR_PADDING_TOP,
  TAB_LABEL_MAX_FONT_SCALE,
  useTheme,
  type IconName,
} from '@/ui';

/** Lucide icon, hidden from screen readers: the tab is announced by its label (D-019). */
function tabIcon(name: IconName) {
  function TabIcon({ focused }: { focused: boolean }) {
    return <Icon name={name} color={focused ? 'accent' : 'ink-muted'} />;
  }
  return TabIcon;
}

/** Caption label capped at 1.5× the system font size; the bar grows with it (D-014). */
function tabLabel(text: string) {
  function TabLabel({ color }: { color: ColorValue }) {
    const theme = useTheme();
    return (
      <Text
        allowFontScaling
        maxFontSizeMultiplier={TAB_LABEL_MAX_FONT_SCALE}
        numberOfLines={1}
        style={[theme.text.caption, { color, textAlign: 'center' }]}
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
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.color['surface-raised'],
          borderTopColor: theme.color.hairline,
          borderTopWidth: 1,
          paddingTop: TAB_BAR_PADDING_TOP,
          paddingBottom: TAB_BAR_PADDING_BOTTOM + insets.bottom,
          height: getTabBarHeight(fontScale, insets.bottom),
        },
        tabBarActiveTintColor: theme.color.accent,
        tabBarInactiveTintColor: theme.color['ink-muted'],
        sceneStyle: { backgroundColor: theme.color.surface },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('library.title'),
          tabBarIcon: tabIcon('list'),
          tabBarLabel: tabLabel(t('tabs.library')),
          tabBarAccessibilityLabel: t('tabs.library'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings.title'),
          tabBarIcon: tabIcon('settings'),
          tabBarLabel: tabLabel(t('tabs.settings')),
          tabBarAccessibilityLabel: t('tabs.settings'),
        }}
      />
    </Tabs>
  );
}
