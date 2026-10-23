import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '../theme';

/**
 * Themed, safe-area aware screen container; screens carry their own titles (no navigation
 * header). Insets are physical; content spacing uses start/end.
 */
const ALL_EDGES: Edge[] = ['top', 'left', 'right', 'bottom'];

/** Tab screens: the tab bar carries the bottom inset, so the screen must not add it again. */
export const TAB_SCREEN_EDGES: Edge[] = ['top', 'left', 'right'];

export function Screen({ children, edges = ALL_EDGES }: { children: ReactNode; edges?: Edge[] }) {
  const theme = useTheme();
  return (
    <SafeAreaView
      testID="screen"
      edges={edges}
      style={[styles.root, { backgroundColor: theme.color['surface'] }]}
    >
      <View style={styles.root}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
