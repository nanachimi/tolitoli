import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '../theme';
import { Icon } from './Icon';

export type SearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  /** Says what is searched: titles and transcripts (i18n). */
  placeholder: string;
};

/** Library search field (guide SearchField); the consumer runs the search. */
export function SearchField({ value, onChangeText, onClear, placeholder }: SearchFieldProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View
      style={[
        styles.field,
        {
          gap: theme.space['space-2'],
          minHeight: theme.size['control-md'],
          paddingHorizontal: theme.space['space-3'],
          backgroundColor: theme.color['surface-sunken'],
          borderColor: theme.color.hairline,
          borderRadius: theme.radius['radius-sm'],
        },
      ]}
    >
      <Icon name="search" size="icon-sm" color="ink-muted" />
      <TextInput
        accessibilityRole="search"
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.color['ink-faint']}
        returnKeyType="search"
        allowFontScaling
        style={[styles.input, theme.text.body, { color: theme.color.ink }]}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('search.clear')}
          onPress={onClear}
          hitSlop={theme.space['space-3']}
          style={{ padding: theme.space['space-1'] }}
        >
          <Icon name="x" color="ink-muted" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  input: { flex: 1, minWidth: 0, paddingVertical: 0 },
});
