import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export type ProgressBarProps = {
  label: string;
  /** 0–1; absent means indeterminate (local transcription). */
  value?: number;
  detail?: string;
  state: 'running' | 'done';
};

const HEIGHT = 8;
const SLIDE_MS = 1400;
const SEGMENT = 0.4;

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => subscription.remove();
  }, []);
  return reduce;
}

/** Long waits: model download, transcription, upload (guide ProgressBar). Failure uses a Banner. */
export function ProgressBar({ label, value, detail, state }: ProgressBarProps) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const reduceMotion = useReduceMotion();
  const [slide] = useState(() => new Animated.Value(0));
  const [width, setWidth] = useState(0);
  const done = state === 'done';
  const indeterminate = value === undefined && !done;
  const animate = indeterminate && !reduceMotion;

  useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
      Animated.timing(slide, {
        toValue: 1,
        duration: SLIDE_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, slide]);

  const fraction = done ? 1 : Math.min(1, Math.max(0, value ?? 0));
  const percent = new Intl.NumberFormat(i18n.language === 'pseudo' ? 'en' : i18n.language, {
    style: 'percent',
  }).format(fraction);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={
        value !== undefined || done
          ? { min: 0, max: 100, now: Math.round(fraction * 100) }
          : undefined
      }
      style={{ gap: theme.space['space-2'] }}
    >
      <View style={[styles.row, { gap: theme.space['space-2'] }]}>
        <AppText style={styles.label}>{label}</AppText>
        {done ? (
          <View
            accessibilityLiveRegion="polite"
            style={[styles.row, { gap: theme.space['space-1'] }]}
          >
            <Icon name="check" size="icon-sm" color="success" />
            <AppText variant="caption" color="success">
              {t('progress.done')}
            </AppText>
          </View>
        ) : value !== undefined ? (
          <AppText testID="i18n-data" variant="caption">
            {percent}
          </AppText>
        ) : null}
      </View>
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={[
          styles.track,
          {
            borderRadius: theme.radius['radius-pill'],
            backgroundColor: theme.color['surface-sunken'],
            borderColor: theme.color.hairline,
          },
        ]}
      >
        {indeterminate ? (
          <Animated.View
            testID="progress-fill"
            style={{
              width: reduceMotion ? '100%' : `${SEGMENT * 100}%`,
              opacity: reduceMotion ? 0.35 : 1,
              borderRadius: theme.radius['radius-pill'],
              backgroundColor: theme.color.accent,
              transform: reduceMotion
                ? []
                : [
                    {
                      translateX: slide.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-SEGMENT * width, width],
                      }),
                    },
                  ],
            }}
          />
        ) : (
          <View
            testID="progress-fill"
            style={{
              width: `${fraction * 100}%`,
              borderRadius: theme.radius['radius-pill'],
              backgroundColor: theme.color.accent,
            }}
          />
        )}
      </View>
      {detail ? (
        <AppText variant="caption" color="ink-muted">
          {detail}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { flex: 1 },
  track: { height: HEIGHT, flexDirection: 'row', borderWidth: 1, overflow: 'hidden' },
});
