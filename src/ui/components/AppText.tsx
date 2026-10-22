import { useTranslation } from 'react-i18next';
import { Text, type TextProps } from 'react-native';

import { useTheme, type ColorName, type TextStyleName } from '../theme';

/** Interface languages written in Latin script: the only ones where `overline` is set in capitals. */
const LATIN_SCRIPT_LANGUAGES = new Set(['fr', 'en', 'de', 'wo']);

export type AppTextProps = TextProps & {
  /** A text style of docs/design/tokens.json. */
  variant?: TextStyleName;
  /** A colour token; `ink` by default. */
  color?: ColorName;
};

/** Text in a design-system style; it always follows the system font scale, without a cap. */
export function AppText({ variant = 'body', color = 'ink', style, ...props }: AppTextProps) {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const capitals = variant === 'overline' && LATIN_SCRIPT_LANGUAGES.has(i18n.language);
  return (
    <Text
      allowFontScaling
      style={[
        theme.text[variant],
        { color: theme.color[color] },
        capitals ? { textTransform: 'uppercase' } : null,
        style,
      ]}
      {...props}
    />
  );
}
