import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';

import { formatClock, formatDurationShort } from '../format/display';
import { useTheme } from '../theme';
import { AppText } from './AppText';

export type TimerState = 'recording' | 'paused' | 'interrupted';

const DOT = 12;
const PULSE_MS = 1200;
const MINUTE_MS = 60_000;

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => subscription.remove();
  }, []);
  return reduce;
}

/** Recording timer: pulsing accent dot, then HH:MM:SS in the `timer` style (guide Timer). */
export function Timer({ elapsedMs, state }: { elapsedMs: number; state: TimerState }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const [opacity] = useState(() => new Animated.Value(1));
  const running = state === 'recording';
  const pulsing = running && !reduceMotion;

  useEffect(() => {
    if (!pulsing) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: PULSE_MS / 2, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: PULSE_MS / 2, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulsing, opacity]);

  // Screen readers hear the duration once a minute, never every second.
  const minutes = Math.floor(elapsedMs / MINUTE_MS) * MINUTE_MS;
  return (
    <View style={[styles.row, { gap: theme.space['space-3'] }]}>
      <Animated.View
        testID="timer-dot"
        style={[
          styles.dot,
          {
            opacity,
            borderRadius: theme.radius['radius-pill'],
            backgroundColor: running ? theme.color.accent : theme.color['ink-muted'],
          },
        ]}
      />
      <AppText
        testID="i18n-data"
        variant="timer"
        color={running ? 'ink' : 'ink-muted'}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {formatClock(elapsedMs)}
      </AppText>
      <View style={styles.hidden}>
        <AppText accessibilityLiveRegion="polite" accessibilityRole="timer">
          {t('record.timerA11y', { duration: formatDurationShort(minutes, t) })}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  dot: { width: DOT, height: DOT },
  // Present for screen readers, invisible on screen.
  hidden: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
});
