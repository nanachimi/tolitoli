import { Children, type ReactNode, type Ref } from 'react';
import { Pressable, StyleSheet, View, type HostInstance } from 'react-native';

import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type OptionRowKind = 'radio' | 'switch' | 'link';

export type OptionRowProps = {
  kind: OptionRowKind;
  label: string;
  description?: string;
  icon?: IconName;
  /** Chosen radio, or switch on. */
  checked?: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** "Langue de l'interface : Wolof" for a radio; the label for the others. */
  accessibilityLabel?: string;
  /** The label is data (a language written in its own name), not interface text. */
  labelIsData?: boolean;
  /** Lets a screen give the focus back to this row when a sub-screen closes. */
  ref?: Ref<HostInstance>;
};

const SWITCH = { width: 44, height: 26, thumb: 18, inset: 3 };

function Switch({ on }: { on: boolean }) {
  const theme = useTheme();
  return (
    <View
      testID="option-switch"
      style={[
        styles.track,
        {
          borderRadius: theme.radius['radius-pill'],
          backgroundColor: on ? theme.color.accent : theme.color['surface-sunken'],
          borderColor: on ? theme.color.accent : theme.color.hairline,
        },
      ]}
    >
      <View
        style={[
          styles.thumb,
          {
            start: on ? SWITCH.width - SWITCH.thumb - SWITCH.inset - 2 : SWITCH.inset,
            backgroundColor: on ? theme.color['on-accent'] : theme.color['ink-muted'],
          },
        ]}
      />
    </View>
  );
}

/**
 * Settings row (guide OptionRow): exclusive choice, switch or navigation. The
 * row is the only focusable node; its inner text is hidden from screen readers
 * (D-019) and the state lives on the row.
 */
export function OptionRow({
  kind,
  label,
  description,
  icon,
  checked = false,
  onPress,
  disabled = false,
  accessibilityLabel,
  labelIsData = false,
  ref,
}: OptionRowProps) {
  const theme = useTheme();
  const role = kind === 'radio' ? 'radio' : kind === 'switch' ? 'switch' : 'button';
  return (
    <Pressable
      ref={ref}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={description}
      accessibilityState={kind === 'link' ? { disabled } : { checked, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.row,
        {
          gap: theme.space['space-3'],
          minHeight: theme.size['control-md'],
          paddingVertical: theme.space['space-3'],
          paddingHorizontal: theme.space['space-4'],
        },
      ]}
    >
      {icon ? <Icon name={icon} color="ink-muted" /> : null}
      <View
        style={styles.text}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <AppText testID={labelIsData ? 'i18n-data' : undefined}>{label}</AppText>
        {description ? (
          <AppText variant="caption" color="ink-muted">
            {description}
          </AppText>
        ) : null}
      </View>
      {kind === 'radio' ? (
        // Present on every row, visible on the chosen one only, so rows never shift.
        <View style={{ opacity: checked ? 1 : 0 }} testID={checked ? 'option-checked' : undefined}>
          <Icon name="check" color="accent" />
        </View>
      ) : null}
      {kind === 'switch' ? <Switch on={checked} /> : null}
      {kind === 'link' ? <Icon name="chevron-right" color="ink-muted" /> : null}
    </Pressable>
  );
}

export type OptionGroupProps = {
  /** Overline above the group ("LANGUE DE L'INTERFACE"); no title inside it. */
  title?: string;
  /** Exclusive choices: the group is announced as a radio group. */
  exclusive?: boolean;
  children: ReactNode;
};

/** Group of OptionRows on surface-raised, rows separated by hairlines. */
export function OptionGroup({ title, exclusive = false, children }: OptionGroupProps) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: theme.space['space-4'] }}>
      {title ? (
        <AppText
          variant="overline"
          color="ink-muted"
          accessibilityRole="header"
          style={{ marginBottom: theme.space['space-2'], marginStart: theme.space['space-1'] }}
        >
          {title}
        </AppText>
      ) : null}
      <View
        accessibilityRole={exclusive ? 'radiogroup' : undefined}
        accessibilityLabel={exclusive ? title : undefined}
        style={[
          styles.group,
          {
            borderRadius: theme.radius['radius-md'],
            backgroundColor: theme.color['surface-raised'],
            borderColor: theme.color.hairline,
          },
        ]}
      >
        {Children.toArray(children).map((child, index) => (
          <View
            key={index}
            style={index > 0 ? { borderTopWidth: 1, borderTopColor: theme.color.hairline } : null}
          >
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1, minWidth: 0 },
  group: { borderWidth: 1, overflow: 'hidden' },
  track: { width: SWITCH.width, height: SWITCH.height, borderWidth: 1 },
  thumb: {
    position: 'absolute',
    top: SWITCH.inset - 1,
    width: SWITCH.thumb,
    height: SWITCH.thumb,
    borderRadius: SWITCH.thumb / 2,
  },
});
