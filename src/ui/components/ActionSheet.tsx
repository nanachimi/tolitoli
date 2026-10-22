import { Fragment } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type ActionSheetItem = {
  label: string;
  icon?: IconName;
  /** In danger, after a hairline; opens a Dialog next, never acts directly. */
  destructive?: boolean;
  /** Choice sheets (playback rate): the chosen line carries an accent check. */
  checked?: boolean;
  onPress: () => void;
};

export type ActionSheetProps = {
  visible: boolean;
  /** Reminds what the actions apply to. */
  title?: string;
  /** Explains a missing action when its absence would surprise. */
  note?: string;
  items: ActionSheetItem[];
  onClose: () => void;
};

const GRIP = { width: 36, height: 4 };

/** Sheet of actions or choices rising from the bottom (guide ActionSheet); no Cancel button. */
export function ActionSheet({ visible, title, note, items, onClose }: ActionSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const firstDestructive = items.findIndex((item) => item.destructive);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          testID="sheet-veil"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.ink, opacity: 0.4 }]}
        />
        <View
          accessibilityRole="menu"
          accessibilityLabel={title}
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              paddingTop: theme.space['space-2'],
              paddingBottom: theme.space['space-3'] + insets.bottom,
              borderTopStartRadius: theme.radius['radius-lg'],
              borderTopEndRadius: theme.radius['radius-lg'],
              backgroundColor: theme.color['surface-raised'],
              borderColor: theme.color.hairline,
            },
          ]}
        >
          <View
            style={[
              styles.grip,
              {
                marginBottom: theme.space['space-2'],
                borderRadius: theme.radius['radius-pill'],
                backgroundColor: theme.color.hairline,
              },
            ]}
          />
          {title ? (
            <AppText
              variant="caption"
              color="ink-muted"
              style={{
                paddingHorizontal: theme.space['space-4'],
                paddingTop: theme.space['space-2'],
                paddingBottom: theme.space['space-3'],
              }}
            >
              {title}
            </AppText>
          ) : null}
          {items.map((item, index) => (
            <Fragment key={item.label}>
              {index === firstDestructive && index > 0 ? (
                <View
                  style={{
                    height: 1,
                    backgroundColor: theme.color.hairline,
                    marginVertical: theme.space['space-2'],
                  }}
                />
              ) : null}
              <Pressable
                accessibilityRole="menuitem"
                accessibilityState={
                  item.checked !== undefined ? { checked: item.checked } : undefined
                }
                onPress={item.onPress}
                style={[
                  styles.item,
                  {
                    gap: theme.space['space-3'],
                    minHeight: theme.size['control-md'],
                    paddingVertical: theme.space['space-3'],
                    paddingHorizontal: theme.space['space-4'],
                  },
                ]}
              >
                {item.icon ? (
                  <Icon name={item.icon} color={item.destructive ? 'danger' : 'ink'} />
                ) : null}
                <AppText color={item.destructive ? 'danger' : 'ink'} style={styles.label}>
                  {item.label}
                </AppText>
                {item.checked ? <Icon name="check" color="accent" /> : null}
              </Pressable>
            </Fragment>
          ))}
          {note ? (
            <AppText
              variant="caption"
              color="ink-muted"
              style={{
                paddingHorizontal: theme.space['space-4'],
                paddingTop: theme.space['space-2'],
              }}
            >
              {note}
            </AppText>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderWidth: 1, borderBottomWidth: 0 },
  grip: { width: GRIP.width, height: GRIP.height, alignSelf: 'center' },
  item: { flexDirection: 'row', alignItems: 'center' },
  label: { flex: 1 },
});
