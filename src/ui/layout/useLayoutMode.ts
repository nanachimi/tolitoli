import { useWindowDimensions } from 'react-native';

import { TABLET_MIN_SHORTEST_SIDE, TABLET_MIN_WIDTH } from '../theme/tokens';

export type LayoutMode = 'single' | 'tablet-split';

/**
 * Two panes only on tablets in landscape (cahier des charges: ≥ 768 pt,
 * paysage). The shortest-side check keeps large phones in landscape single-pane.
 */
export function getLayoutMode(width: number, height: number): LayoutMode {
  const isTablet = Math.min(width, height) >= TABLET_MIN_SHORTEST_SIDE;
  return isTablet && width >= TABLET_MIN_WIDTH && width > height ? 'tablet-split' : 'single';
}

export function useLayoutMode(): LayoutMode {
  const { width, height } = useWindowDimensions();
  return getLayoutMode(width, height);
}
