import { colors, type ColorScheme } from '../theme/tokens';

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

describe.each<ColorScheme>(['light', 'dark'])('%s colors', (scheme) => {
  const c = colors[scheme];

  it.each([
    ['text', c.text, c.background],
    ['text on surface', c.text, c.surface],
    ['muted text', c.textMuted, c.background],
    ['muted text on surface', c.textMuted, c.surface],
    ['primary', c.primary, c.background],
    ['on primary', c.onPrimary, c.primary],
  ])('%s meets WCAG AA (4.5:1)', (_name, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
