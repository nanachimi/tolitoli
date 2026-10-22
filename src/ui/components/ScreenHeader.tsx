import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type ScreenHeaderProps = {
  title: string;
  onBack: () => void;
  /** Describes what it opens ("Autres actions"). */
  action?: { icon: IconName; label: string; onPress: () => void };
};

/** Header of screens that are not tabs: back, title on one line, optional end action. */
export function ScreenHeader({ title, onBack, action }: ScreenHeaderProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  // Buttons overflow by space-2 so their 48 px target does not push the title.
  const button = { padding: theme.space['space-2'], minWidth: theme.size['control-md'] };
  return (
    <View
      style={[styles.header, { gap: theme.space['space-2'], minHeight: theme.size['control-md'] }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        onPress={onBack}
        style={[styles.button, button, { marginStart: -theme.space['space-2'] }]}
      >
        <Icon name="chevron-left" />
      </Pressable>
      <AppText variant="title" accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={[styles.button, button, { marginEnd: -theme.space['space-2'] }]}
        >
          <Icon name={action.icon} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  button: { alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, minWidth: 0 },
});
