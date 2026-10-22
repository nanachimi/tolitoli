import design from '../../../docs/design/tokens.json';
import { color, radius, size, space, textSpec, type ColorScheme } from '../theme/tokens';

/** "16px" → 16, "1.75px" → 1.75; "-0.01em" → -0.01. */
function number(value: string, unit: 'px' | 'em'): number {
  expect(value.endsWith(unit)).toBe(true);
  return Number(value.slice(0, -unit.length));
}

function named(tokens: { name: string; value: string }[]): Record<string, number> {
  return Object.fromEntries(tokens.map((t) => [t.name, number(t.value, 'px')]));
}

describe('tokens.ts mirrors docs/design/tokens.json', () => {
  it.each<ColorScheme>(['light', 'dark'])(
    'has the same %s colours, by name and value',
    (scheme) => {
      const fromDesign = Object.fromEntries(
        design.color.tokens.map((t) => [t.name, t.value[scheme].toLowerCase()]),
      );
      expect(color[scheme]).toEqual(fromDesign);
    },
  );

  it('has the same spacing, radii and sizes', () => {
    expect(space).toEqual(named(design.spacing.tokens));
    expect(radius).toEqual(named(design.radius.tokens));
    expect(size).toEqual(named(design.size.tokens));
  });

  it('has the same text styles, by name, family, size, line height, weight and tracking', () => {
    const fromDesign = Object.fromEntries(
      design.type.groups.flatMap((group) =>
        group.styles.map((style) => {
          const spec: Record<string, unknown> = {
            family: group.family,
            fontSize: number(style.fontSize, 'px'),
            lineHeight: number(style.lineHeight, 'px'),
            fontWeight: style.fontWeight,
          };
          if ('letterSpacing' in style && style.letterSpacing) {
            spec.letterSpacing = number(style.letterSpacing, 'em');
          }
          return [style.name, spec];
        }),
      ),
    );
    expect(textSpec).toEqual(fromDesign);
  });
});
