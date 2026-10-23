import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

/** The gesture that starts a recording also pauses and resumes it; only the icon changes. */
export type RecordButtonMode = 'record' | 'pause' | 'resume';

export type RecordButtonProps = {
  mode: RecordButtonMode;
  onPress: () => void;
  /** `lg` in the Library bar, `xl` in the middle of the Recording screen. */
  size?: 'lg' | 'xl';
  /** Caption under the button; none in the app (guide RecordButton), kept for previews. */
  label?: string;
  /** "Enregistrer", "Mettre en pause", "Reprendre l'enregistrement"; never just "micro". */
  accessibilityLabel: string;
  disabled?: boolean;
};

/** The app's one round button (guide RecordButton): an accent disc whose icon follows the mode. */
export function RecordButton({
  mode,
  onPress,
  size = 'lg',
  label,
  accessibilityLabel,
  disabled = false,
}: RecordButtonProps) {
  const theme = useTheme();
  const record = mode === 'record';
  const diameter = theme.size[size === 'xl' ? 'control-xl' : 'control-lg'];

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
            backgroundColor: theme.color.accent,
            borderColor: 'transparent',
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Icon name={mode === 'pause' ? 'pause' : 'mic'} size="icon-lg" color="on-accent" />
      </Pressable>
      {label ? (
        <AppText
          variant="caption"
          color="ink-muted"
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { alignItems: 'center' },
  round: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
