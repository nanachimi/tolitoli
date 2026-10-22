import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { SPLIT_LIST_WIDTH, useTheme } from '../theme';
import { useLayoutMode } from './useLayoutMode';

type Props = {
  list: ReactNode;
  detail?: ReactNode;
};

/**
 * List + detail panes on tablets in landscape, list only on phones. `row`
 * follows the layout direction, so the list sits on the start side in RTL.
 * Filled in at step 5.
 */
export function SplitLayout({ list, detail }: Props) {
  const mode = useLayoutMode();
  const theme = useTheme();

  if (mode === 'single') {
    return <View style={styles.fill}>{list}</View>;
  }

  return (
    <View testID="split-layout" style={styles.row}>
      <View testID="split-list" style={[styles.list, { borderEndColor: theme.color['hairline'] }]}>
        {list}
      </View>
      <View testID="split-detail" style={styles.fill}>
        {detail}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flex: 1, flexDirection: 'row' },
  list: { width: SPLIT_LIST_WIDTH, borderEndWidth: StyleSheet.hairlineWidth },
});
