export type ColorScheme = 'light' | 'dark';

export type Colors = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  border: string;
};

export const colors: Record<ColorScheme, Colors> = {
  light: {
    background: '#FFFFFF',
    surface: '#F4F5F7',
    text: '#111418',
    textMuted: '#4A5260',
    primary: '#0B5FD7',
    onPrimary: '#FFFFFF',
    border: '#D5D9E0',
  },
  dark: {
    background: '#121212',
    surface: '#1E1F22',
    text: '#F2F3F5',
    textMuted: '#B4BAC5',
    primary: '#7FB2FF',
    onPrimary: '#0A1A33',
    border: '#33363B',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 12,
} as const;

/** Base sizes; the system font scale is applied on top (allowFontScaling). */
export const fontSize = {
  caption: 13,
  body: 16,
  title: 22,
} as const;

/** Tablet split view: list pane width (cahier des charges, écrans). */
export const SPLIT_LIST_WIDTH = 360;
export const TABLET_MIN_WIDTH = 768;
/** Android's sw600dp tablet threshold; every iPad is above it. */
export const TABLET_MIN_SHORTEST_SIDE = 600;

export type Theme = {
  scheme: ColorScheme;
  colors: Colors;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
};

export function getTheme(scheme: ColorScheme): Theme {
  return { scheme, colors: colors[scheme], spacing, radius, fontSize };
}
