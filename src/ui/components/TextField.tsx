import { useId } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** An example, never a stand-in for the label (guide TextField). */
  placeholder?: string;
  hint?: string;
  /** Set on validation, not while typing; says what to do. */
  error?: string;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  error,
  autoFocus,
  onSubmitEditing,
}: TextFieldProps) {
  const theme = useTheme();
  const labelId = useId();
  return (
    <View style={{ gap: theme.space['space-1'] }}>
      <AppText nativeID={labelId} variant="caption" color="ink-muted">
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityLabelledBy={labelId}
        // React Native has no "invalid" state: the error is read with the field and announced.
        accessibilityHint={error ?? hint}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.color['ink-faint']}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        allowFontScaling
        style={[
          styles.input,
          theme.text.body,
          {
            minHeight: theme.size['control-md'],
            paddingHorizontal: theme.space['space-3'],
            color: theme.color.ink,
            backgroundColor: theme.color['surface-sunken'],
            borderColor: error ? theme.color.danger : theme.color.hairline,
            borderRadius: theme.radius['radius-sm'],
          },
        ]}
      />
      {error ? (
        <View
          accessibilityLiveRegion="polite"
          style={[styles.message, { gap: theme.space['space-1'] }]}
        >
          <Icon name="alert-triangle" size="icon-sm" color="danger" />
          <AppText variant="caption" color="danger">
            {error}
          </AppText>
        </View>
      ) : hint ? (
        <AppText variant="caption" color="ink-muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, paddingVertical: 0 },
  message: { flexDirection: 'row', alignItems: 'center' },
});
