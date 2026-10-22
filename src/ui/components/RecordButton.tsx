import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export type RecordButtonProps = {
  mode: 'record' | 'stop';
  onPress: () => void;
  /** Caption under the button ("Enregistrer", "Arrêter"). */
  label: string;
  /** "Enregistrer" or "Arrêter l'enregistrement", never just "micro" (guide RecordButton). */
  accessibilityLabel: string;
  disabled?: boolean;
};

const SQUARE = 32;

/** The two round buttons: Record on the Library (72 px), Stop on the Recording screen (96 px). */
export function RecordButton({
  mode,
  onPress,
  label,
  accessibilityLabel,
  disabled = false,
}: RecordButtonProps) {
  const theme = useTheme();
  const record = mode === 'record';
  const diameter = theme.size[record ? 'control-lg' : 'control-xl'];

  const press = () => {
    // Haptic feedback when recording starts; a device without it just records.
    if (record) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    onPress();
  };

  return (
    <View style={[styles.column, { gap: theme.space['space-2'] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={press}
        style={[
          styles.round,
          {
            width: diameter,
            height: diameter,
            borderRadius: theme.radius['radius-pill'],
            backgroundColor: record ? theme.color.accent : theme.color['surface-raised'],
            borderColor: record ? 'transparent' : theme.color.accent,
          },
        ]}
      >
        {record ? (
          <Icon name="mic" size="icon-lg" color="on-accent" />
        ) : (
          <View
            testID="stop-square"
            style={{
              width: SQUARE,
              height: SQUARE,
              borderRadius: theme.radius['radius-sm'],
              backgroundColor: theme.color.accent,
            }}
          />
        )}
      </Pressable>
      <AppText
        variant="caption"
        color="ink-muted"
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { alignItems: 'center' },
  round: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
