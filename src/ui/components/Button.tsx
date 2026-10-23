import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme, type ColorName } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

/** `destructive` is the filled danger action of a Dialog (Dialog guide). */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'destructive';

export type ButtonProps = {
  /** A verb in the infinitive, translated (guide Button). */
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  /** When the visible label is not enough (it is by default). */
  accessibilityLabel?: string;
  /** Why a disabled button is disabled (OnboardingPage guide). */
  accessibilityHint?: string;
};

const INK: Record<ButtonVariant, ColorName> = {
  primary: 'on-accent',
  secondary: 'ink',
  ghost: 'accent',
  danger: 'danger',
  destructive: 'surface-raised',
};

/** One primary button per screen; 48 px touch area; focus ring outside the control. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const ink: ColorName = disabled ? 'ink-faint' : INK[variant];
  const background = disabled
    ? theme.color['surface-sunken']
    : variant === 'primary'
      ? theme.color.accent
      : variant === 'destructive'
        ? theme.color.danger
        : variant === 'secondary'
          ? theme.color['surface-raised']
          : 'transparent';
  const border =
    !disabled && (variant === 'secondary' || variant === 'danger')
      ? theme.color.hairline
      : 'transparent';

  return (
    <View
      testID="button-focus-ring"
      style={[
        styles.ring,
        { borderRadius: theme.radius['radius-md'] + 4 },
        focused && { borderColor: theme.color.focus },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.button,
          {
            minHeight: theme.size['control-md'],
            paddingHorizontal: theme.space['space-4'],
            gap: theme.space['space-1'],
            borderRadius: theme.radius['radius-md'],
            backgroundColor: background,
            borderColor: border,
          },
        ]}
      >
        {icon ? <Icon name={icon} color={ink} /> : null}
        <AppText variant="body-strong" color={ink}>
          {label}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // 2 px focus ring, 2 px outside the control (README, Couleur).
  ring: { borderWidth: 2, borderColor: 'transparent', padding: 2 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
