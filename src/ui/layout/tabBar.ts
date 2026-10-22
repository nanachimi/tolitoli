import { size, space, textSpec } from '../theme/tokens';

/** Label in the `caption` style under an `icon-md` icon (TabBar guide and preview). */
export const TAB_LABEL_FONT_SIZE = textSpec.caption.fontSize;
export const TAB_LABEL_LINE_HEIGHT = textSpec.caption.lineHeight;
export const TAB_BAR_PADDING_TOP = space['space-2'];
export const TAB_BAR_PADDING_BOTTOM = space['space-3'];

/** Bar height without the bottom safe-area inset: padding, icon, space-1, label. */
export const TAB_BAR_BASE_HEIGHT =
  TAB_BAR_PADDING_TOP +
  size['icon-md'] +
  space['space-1'] +
  TAB_LABEL_LINE_HEIGHT +
  TAB_BAR_PADDING_BOTTOM;

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
