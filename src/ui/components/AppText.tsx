import { Text, type TextProps } from 'react-native';

import { useTheme } from '../theme';

type Variant = 'title' | 'body' | 'caption';

export type AppTextProps = TextProps & {
  variant?: Variant;
  muted?: boolean;
};

/** Text that follows the theme and the system font scale. */
export function AppText({ variant = 'body', muted = false, style, ...props }: AppTextProps) {
  const theme = useTheme();
  return (
    <Text
      allowFontScaling
      style={[
        {
          color: muted ? theme.colors.textMuted : theme.colors.text,
          fontSize: theme.fontSize[variant],
          fontWeight: variant === 'title' ? '600' : '400',
        },
        style,
      ]}
      {...props}
    />
  );
}
