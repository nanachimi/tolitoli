/** React Navigation's uikit tab bar height, without the bottom safe-area inset. */
export const TAB_BAR_BASE_HEIGHT = 49;

/** Label size and line height matching React Navigation's label below the icon. */
export const TAB_LABEL_FONT_SIZE = 10;
export const TAB_LABEL_LINE_HEIGHT = 13;

/**
 * Tab labels follow the system font size up to 1.5× (iOS does not scale them
 * further either); screen content is never capped (D-014).
 */
export const TAB_LABEL_MAX_FONT_SCALE = 1.5;

/**
 * Grows the bar by the extra height the scaled label needs, so labels are not
 * clipped by the system navigation bar at large font sizes.
 */
export function getTabBarHeight(fontScale: number, bottomInset: number): number {
  const labelScale = Math.min(Math.max(fontScale, 1), TAB_LABEL_MAX_FONT_SCALE);
  const extraLabelHeight = Math.ceil(TAB_LABEL_LINE_HEIGHT * (labelScale - 1));
  return TAB_BAR_BASE_HEIGHT + extraLabelHeight + bottomInset;
}
