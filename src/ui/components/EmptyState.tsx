import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export type EmptyStateProps = {
  icon: IconName;
  title: string;
  /** Says what to do, not what is missing (guide EmptyState). */
  body: string;
  /** Only when it resolves the state. */
  action?: { label: string; onPress: () => void };
  tone: 'welcoming' | 'quiet';
};

const HALO = 64;

export function EmptyState({ icon, title, body, action, tone }: EmptyStateProps) {
  const theme = useTheme();
  const welcoming = tone === 'welcoming';
  return (
    <View
      style={[
        styles.root,
        {
          gap: theme.space['space-2'],
          paddingVertical: theme.space['space-6'],
          paddingHorizontal: theme.space['space-4'],
        },
      ]}
    >
      <View
        style={[
          styles.halo,
          welcoming && {
            width: HALO,
            height: HALO,
            borderRadius: theme.radius['radius-pill'],
            backgroundColor: theme.color['accent-soft'],
            marginBottom: theme.space['space-2'],
          },
        ]}
      >
        <Icon name={icon} size="icon-lg" color={welcoming ? 'accent' : 'ink-faint'} />
      </View>
      {/* One node for screen readers: title then explanation. */}
      <View accessible accessibilityLabel={`${title}. ${body}`} style={styles.text}>
        <AppText variant={welcoming ? 'heading' : 'body-strong'} style={styles.centered}>
          {title}
        </AppText>
        <AppText variant="caption" color="ink-muted" style={styles.centered}>
          {body}
        </AppText>
      </View>
      {action ? (
        <View style={{ marginTop: theme.space['space-3'] }}>
          <Button label={action.label} onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center' },
  halo: { alignItems: 'center', justifyContent: 'center' },
  text: { alignItems: 'center', maxWidth: 300 },
  centered: { textAlign: 'center' },
});
