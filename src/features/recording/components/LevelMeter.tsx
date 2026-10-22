import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { radius, useTheme } from '@/ui';

/** Horizontal input level bar; fills from the start side, so it mirrors in RTL. */
export function LevelMeter({ level }: { level: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const percent = Math.round(Math.min(1, Math.max(0, level)) * 100);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('record.levelA11y', { percent })}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={[
        styles.track,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <View
        testID="level-fill"
        style={[styles.fill, { width: `${percent}%`, backgroundColor: theme.colors.primary }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 12,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  fill: { height: '100%' },
});
