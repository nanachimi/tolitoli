import { Platform, type TextStyle } from 'react-native';

/**
 * Typed transcription of docs/design/tokens.json (the design system is the
 * source of truth; CLAUDE.md, Design). Names are kept exactly as in the design
 * so the parity test and a search across both stay trivial.
 */

export type ColorScheme = 'light' | 'dark';

export const COLOR_NAMES = [
  'surface',
  'surface-raised',
  'surface-sunken',
  'ink',
  'ink-muted',
  'ink-faint',
  'hairline',
  'accent',
  'on-accent',
  'accent-soft',
  'ochre',
  'success',
  'warning',
  'danger',
  'focus',
] as const;

export type ColorName = (typeof COLOR_NAMES)[number];
export type Palette = Record<ColorName, string>;

export const color: Record<ColorScheme, Palette> = {
  light: {
    surface: '#f7f1e8',
    'surface-raised': '#fffaf3',
    'surface-sunken': '#efe6d9',
    ink: '#2a211b',
    'ink-muted': '#6b5c50',
    'ink-faint': '#9a8878',
    hairline: '#e3d7c8',
    accent: '#b84a24',
    'on-accent': '#fff6ee',
    'accent-soft': '#f6dccd',
    ochre: '#b8862b',
    success: '#1f6f66',
    warning: '#9a5b12',
    danger: '#a3281f',
    focus: '#1f5f8b',
  },
  dark: {
    surface: '#1c1816',
    'surface-raised': '#272120',
    'surface-sunken': '#141110',
    ink: '#f3ebe1',
    'ink-muted': '#b8a999',
    'ink-faint': '#7f7164',
    hairline: '#3b332d',
    accent: '#e47d52',
    'on-accent': '#2a1309',
    'accent-soft': '#4a2a1d',
    ochre: '#d9a84c',
    success: '#62b5a6',
    warning: '#dca15a',
    danger: '#e5776f',
    focus: '#82b7e3',
  },
};

export const space = {
  'space-1': 4,
  'space-2': 8,
  'space-3': 12,
  'space-4': 16,
  'space-6': 24,
  'space-8': 32,
  'space-12': 48,
} as const;

export const radius = {
  'radius-sm': 8,
  'radius-md': 14,
  'radius-lg': 22,
  'radius-pill': 999,
} as const;

export const size = {
  'control-md': 48,
  'control-lg': 72,
  'control-xl': 96,
  'icon-sm': 16,
  'icon-md': 24,
  'icon-lg': 32,
  'stroke-icon': 1.75,
} as const;

export type SpaceName = keyof typeof space;
export type RadiusName = keyof typeof radius;
export type SizeName = keyof typeof size;

/** Font families of tokens.json: display is Rubik, body the system font, mono the system monospace. */
export type FontFamilyName = 'display' | 'body' | 'mono';

/** Rubik weights loaded by expo-font (app/_layout.tsx); one family per weight. */
export const RUBIK_BY_WEIGHT = { 500: 'Rubik_500Medium', 600: 'Rubik_600SemiBold' } as const;

const MONO_FAMILY = Platform.select({ ios: 'Menlo', default: 'monospace' });

export type TextStyleName =
  | 'display'
  | 'title'
  | 'heading'
  | 'timer'
  | 'body'
  | 'body-strong'
  | 'caption'
  | 'overline'
  | 'timestamp';

/** Text styles as specified (px and em), compared one to one with tokens.json. */
export type TextSpec = {
  family: FontFamilyName;
  fontSize: number;
  lineHeight: number;
  fontWeight: 400 | 500 | 600;
  /** In em, as in the design. */
  letterSpacing?: number;
};

export const textSpec: Record<TextStyleName, TextSpec> = {
  display: {
    family: 'display',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: 600,
    letterSpacing: -0.01,
  },
  title: { family: 'display', fontSize: 24, lineHeight: 30, fontWeight: 600 },
  heading: { family: 'display', fontSize: 18, lineHeight: 24, fontWeight: 500 },
  timer: { family: 'display', fontSize: 48, lineHeight: 52, fontWeight: 500, letterSpacing: 0.02 },
  body: { family: 'body', fontSize: 16, lineHeight: 24, fontWeight: 400 },
  'body-strong': { family: 'body', fontSize: 16, lineHeight: 24, fontWeight: 600 },
  caption: { family: 'body', fontSize: 13, lineHeight: 18, fontWeight: 400 },
  overline: { family: 'body', fontSize: 12, lineHeight: 16, fontWeight: 600, letterSpacing: 0.06 },
  timestamp: { family: 'mono', fontSize: 12, lineHeight: 16, fontWeight: 500 },
};

function toTextStyle(spec: TextSpec): TextStyle {
  // A loaded font carries its weight in its family; adding fontWeight makes Android synthesise it.
  const face: TextStyle =
    spec.family === 'display'
      ? { fontFamily: RUBIK_BY_WEIGHT[spec.fontWeight === 600 ? 600 : 500] }
      : {
          fontWeight: String(spec.fontWeight) as TextStyle['fontWeight'],
          ...(spec.family === 'mono' ? { fontFamily: MONO_FAMILY } : {}),
        };
  return {
    fontSize: spec.fontSize,
    lineHeight: spec.lineHeight,
    ...face,
    ...(spec.letterSpacing ? { letterSpacing: spec.letterSpacing * spec.fontSize } : {}),
  };
}

/** React Native styles derived from textSpec; the timer keeps tabular digits so it never jitters. */
export const text = Object.fromEntries(
  Object.entries(textSpec).map(([name, spec]) => [
    name,
    name === 'timer' ? { ...toTextStyle(spec), fontVariant: ['tabular-nums'] } : toTextStyle(spec),
  ]),
) as Record<TextStyleName, TextStyle>;

/** Tablet split view: list pane width (cahier des charges, écrans). */
export const SPLIT_LIST_WIDTH = 360;
export const TABLET_MIN_WIDTH = 768;
/** Android's sw600dp tablet threshold; every iPad is above it. */
export const TABLET_MIN_SHORTEST_SIDE = 600;

export type Theme = {
  scheme: ColorScheme;
  color: Palette;
  space: typeof space;
  radius: typeof radius;
  size: typeof size;
  text: typeof text;
};

export function getTheme(scheme: ColorScheme): Theme {
  return { scheme, color: color[scheme], space, radius, size, text };
}
