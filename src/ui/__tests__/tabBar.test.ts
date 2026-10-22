import {
  getTabBarHeight,
  TAB_BAR_BASE_HEIGHT,
  TAB_LABEL_LINE_HEIGHT,
  TAB_LABEL_MAX_FONT_SCALE,
} from '../layout/tabBar';

describe('getTabBarHeight', () => {
  it('fits a 24 px icon over a 13/18 caption with the preview padding', () => {
    expect(TAB_BAR_BASE_HEIGHT).toBe(8 + 24 + 4 + 18 + 12);
  });

  it('keeps the default height at the default font size', () => {
    expect(getTabBarHeight(1, 0)).toBe(TAB_BAR_BASE_HEIGHT);
  });

  it('adds the bottom safe-area inset', () => {
    expect(getTabBarHeight(1, 24)).toBe(TAB_BAR_BASE_HEIGHT + 24);
  });

  it('grows with the font scale', () => {
    expect(getTabBarHeight(1.3, 0)).toBe(
      TAB_BAR_BASE_HEIGHT + Math.ceil(TAB_LABEL_LINE_HEIGHT * 0.3),
    );
  });

  it('stops growing at the label cap', () => {
    const capped = getTabBarHeight(TAB_LABEL_MAX_FONT_SCALE, 0);
    expect(getTabBarHeight(2, 0)).toBe(capped);
    expect(getTabBarHeight(3.2, 0)).toBe(capped);
  });

  it('never shrinks below the default for small fonts', () => {
    expect(getTabBarHeight(0.85, 0)).toBe(TAB_BAR_BASE_HEIGHT);
  });
});
