import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';

export type DialogProps = {
  visible: boolean;
  /** A question ("Mettre à la corbeille ?"). */
  title: string;
  /** The real consequence, with numbers when possible. */
  body: string;
  /** Repeats the action, never "OK". */
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
};

/** Confirmation for the few actions one cannot undo with a gesture (guide Dialog). */
export function Dialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false,
}: DialogProps) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.root}>
        {/* The veil closes the dialog, like Cancel. */}
        <Pressable
          testID="dialog-veil"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={onCancel}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.ink, opacity: 0.4 }]}
        />
        <View
          accessibilityRole="alert"
          accessibilityViewIsModal
          style={[
            styles.card,
            {
              margin: theme.space['space-4'],
              paddingTop: theme.space['space-6'],
              paddingHorizontal: theme.space['space-4'],
              paddingBottom: theme.space['space-4'],
              borderRadius: theme.radius['radius-lg'],
              backgroundColor: theme.color['surface-raised'],
              borderColor: theme.color.hairline,
            },
          ]}
        >
          <AppText variant="heading" accessibilityRole="header">
            {title}
          </AppText>
          <AppText
            variant="caption"
            color="ink-muted"
            style={{ marginTop: theme.space['space-2'], marginBottom: theme.space['space-6'] }}
          >
            {body}
          </AppText>
          {/* Least risky first: on the left in LTR, on the right in RTL. */}
          <View style={[styles.row, { gap: theme.space['space-2'] }]}>
            <Button label={cancelLabel} variant="ghost" onPress={onCancel} />
            <Button
              label={confirmLabel}
              variant={destructive ? 'destructive' : 'primary'}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { width: '90%', maxWidth: 360, borderWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap' },
});
