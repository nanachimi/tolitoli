import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';

/** Below this level the fill turns ink-faint: "silence", without alarm (guide LevelMeter). */
export const QUIET_LEVEL = 0.05;
const SMOOTHING_MS = 60;
const HEIGHT = 12;

/** Input level 0 → 1 (computed in dBFS by services/audio/level.ts). It reassures; it does not alert. */
export function LevelMeter({ level }: { level: number }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const clamped = Math.min(1, Math.max(0, level));
  // One Animated.Value for the component's life, created on first render only.
  const [fill] = useState(() => new Animated.Value(clamped));

  useEffect(() => {
    Animated.timing(fill, {
      toValue: clamped,
      duration: SMOOTHING_MS,
      useNativeDriver: false,
    }).start();
  }, [clamped, fill]);

  const percent = Math.round(clamped * 100);
  return (
    <View
      // React Native has no "meter" role; progressbar carries the value, with no live announcement.
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('record.levelA11y', { percent })}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={[
        styles.track,
        {
          backgroundColor: theme.color['surface-sunken'],
          borderColor: theme.color.hairline,
          borderRadius: theme.radius['radius-pill'],
        },
      ]}
    >
      <Animated.View
        testID="level-fill"
        style={{
          width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          borderRadius: theme.radius['radius-pill'],
          backgroundColor: clamped < QUIET_LEVEL ? theme.color['ink-faint'] : theme.color.accent,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Row direction: the fill starts at the start edge, so it grows from the right in Arabic.
  track: { height: HEIGHT, flexDirection: 'row', borderWidth: 1, overflow: 'hidden' },
});
