import { color, type ColorName, type ColorScheme } from '../theme/tokens';

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

const SURFACES: ColorName[] = ['surface', 'surface-raised', 'surface-sunken'];

/** Contrast promises written in the usage notes of docs/design/tokens.json. */
describe.each<ColorScheme>(['light', 'dark'])('%s colours keep the design contrasts', (scheme) => {
  const c = color[scheme];

  it.each(SURFACES)('ink is at least 12:1 on %s', (surface) => {
    expect(contrast(c.ink, c[surface])).toBeGreaterThanOrEqual(12);
  });

  it.each(SURFACES)('ink-muted is at least 5:1 on %s', (surface) => {
    expect(contrast(c['ink-muted'], c[surface])).toBeGreaterThanOrEqual(5);
  });

  it('on-accent is readable on accent (4.5:1)', () => {
    expect(contrast(c['on-accent'], c.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('warning text is readable on surface (4.5:1)', () => {
    expect(contrast(c.warning, c.surface)).toBeGreaterThanOrEqual(4.5);
  });
});
