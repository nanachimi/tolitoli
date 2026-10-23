import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export type BannerKind = 'interrupted' | 'resumable' | 'alert';

export type BannerProps = {
  kind: BannerKind;
  title: string;
  /** One sentence, in full (guide Banner). */
  body: string;
  /** At most one; never during a call (D-023): the consumer leaves it out. */
  action?: { label: string; onPress: () => void };
  /** Overrides the kind's icon when the cause has its own (`wifi-off` when offline). */
  icon?: IconName;
};

/** State banner under the timer; it goes away when the state changes, never by itself. */
export function Banner({ kind, title, body, action, icon }: BannerProps) {
  const theme = useTheme();
  const alert = kind === 'alert';
  return (
    <View
      testID="banner"
      accessibilityLiveRegion="assertive"
      style={[
        styles.banner,
        {
          gap: theme.space['space-3'],
          paddingVertical: theme.space['space-3'],
          paddingHorizontal: theme.space['space-4'],
          borderRadius: theme.radius['radius-md'],
          backgroundColor: alert ? theme.color['surface-raised'] : theme.color['accent-soft'],
          borderColor: alert ? theme.color.hairline : 'transparent',
        },
      ]}
    >
      <Icon
        name={icon ?? (alert ? 'alert-triangle' : 'phone-off')}
        color={alert ? 'danger' : 'accent'}
      />
      <View style={[styles.text, { gap: theme.space['space-1'] }]}>
        <AppText variant="body-strong" accessibilityRole="header">
          {title}
        </AppText>
        <AppText variant="caption" color="ink-muted">
          {body}
        </AppText>
        {action ? (
          <View style={[styles.action, { marginTop: theme.space['space-2'] }]}>
            <Button label={action.label} onPress={action.onPress} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1 },
  text: { flex: 1 },
  action: { alignItems: 'flex-start' },
});
