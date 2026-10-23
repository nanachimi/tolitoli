import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { formatPlayerTime, formatRate, formatSpokenDuration } from '../format/display';
import { useTheme } from '../theme';
import { ActionSheet } from './ActionSheet';
import { AppText } from './AppText';
import { Icon } from './Icon';

/** Playback rates of the Player guide. */
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export const SKIP_MS = 15_000;

export type PlayerProps = {
  positionMs: number;
  durationMs: number;
  playing: boolean;
  rate: number;
  onSeek: (ms: number) => void;
  onTogglePlay: () => void;
  onSkip: (deltaMs: number) => void;
  onRateChange: (rate: number) => void;
};

const TRACK = 4;
const KNOB = 16;

/**
 * Audio player card of the Detail screen (guide Player). Everything mirrors in RTL,
 * bar included; the bar is adjustable for TalkBack in 15 s steps.
 */
export function Player({
  positionMs,
  durationMs,
  playing,
  rate,
  onSeek,
  onTogglePlay,
  onSkip,
  onRateChange,
}: PlayerProps) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const [rates, setRates] = useState(false);
  const [width, setWidth] = useState(0);
  const fraction = durationMs > 0 ? Math.min(1, Math.max(0, positionMs / durationMs)) : 0;
  const ink = playing ? theme.color.accent : theme.color['ink-muted'];

  const responder = useMemo(() => {
    const seekTo = (x: number) => {
      if (width <= 0) return;
      const ratio = Math.min(1, Math.max(0, x / width));
      onSeek(Math.round((I18nManager.isRTL ? 1 - ratio : ratio) * durationMs));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => seekTo(event.nativeEvent.locationX),
      onPanResponderMove: (event) => seekTo(event.nativeEvent.locationX),
    });
  }, [durationMs, onSeek, width]);

  const spoken = t('player.positionA11y', {
    position: formatSpokenDuration(positionMs, t),
    total: formatSpokenDuration(durationMs, t),
  });

  return (
    <View
      style={[
        styles.card,
        {
          paddingVertical: theme.space['space-3'],
          paddingHorizontal: theme.space['space-4'],
          borderRadius: theme.radius['radius-md'],
          backgroundColor: theme.color['surface-raised'],
          borderColor: theme.color.hairline,
        },
      ]}
    >
      {/* 48 px touch band around a 4 px track. */}
      <View
        testID="player-seek"
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t('player.seekA11y')}
        accessibilityValue={{ text: spoken }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) =>
          onSkip(event.nativeEvent.actionName === 'increment' ? SKIP_MS : -SKIP_MS)
        }
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={[styles.seek, { height: theme.size['control-md'] }]}
        {...responder.panHandlers}
      >
        <View
          pointerEvents="none"
          style={[
            styles.track,
            {
              borderRadius: theme.radius['radius-pill'],
              backgroundColor: theme.color['surface-sunken'],
            },
          ]}
        >
          <View
            testID="player-fill"
            style={{
              width: `${fraction * 100}%`,
              borderRadius: theme.radius['radius-pill'],
              backgroundColor: ink,
            }}
          />
        </View>
        <View
          pointerEvents="none"
          testID="player-knob"
          style={[
            styles.knob,
            {
              start: `${fraction * 100}%`,
              marginStart: -KNOB / 2,
              borderRadius: theme.radius['radius-pill'],
              backgroundColor: ink,
              borderColor: theme.color['surface-raised'],
            },
          ]}
        />
      </View>
      <View
        style={styles.times}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <AppText testID="i18n-data" variant="caption" color="ink-muted" style={styles.tabular}>
          {formatPlayerTime(positionMs)}
        </AppText>
        <AppText testID="i18n-data" variant="caption" color="ink-muted" style={styles.tabular}>
          {formatPlayerTime(durationMs)}
        </AppText>
      </View>
      <View
        style={[
          styles.controls,
          { gap: theme.space['space-4'], marginTop: theme.space['space-2'] },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('player.back15')}
          onPress={() => onSkip(-SKIP_MS)}
          style={[
            styles.center,
            { minWidth: theme.size['control-md'], minHeight: theme.size['control-md'] },
          ]}
        >
          <Icon name="rotate-ccw" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? t('player.pause') : t('player.play')}
          onPress={onTogglePlay}
          style={[
            styles.center,
            {
              width: theme.size['control-md'],
              height: theme.size['control-md'],
              borderRadius: theme.radius['radius-pill'],
              backgroundColor: theme.color.accent,
            },
          ]}
        >
          <Icon name={playing ? 'pause' : 'play'} color="on-accent" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('player.forward15')}
          onPress={() => onSkip(SKIP_MS)}
          style={[
            styles.center,
            { minWidth: theme.size['control-md'], minHeight: theme.size['control-md'] },
          ]}
        >
          <Icon name="rotate-cw" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('player.rateA11y', { rate: formatRate(rate, i18n.language) })}
          onPress={() => setRates(true)}
          style={[styles.rateTarget, { minHeight: theme.size['control-md'] }]}
        >
          <View
            style={[
              styles.rate,
              {
                paddingHorizontal: theme.space['space-3'],
                borderRadius: theme.radius['radius-pill'],
                backgroundColor: theme.color['surface-sunken'],
                borderColor: theme.color.hairline,
              },
            ]}
          >
            <AppText testID="i18n-data" variant="caption">
              {formatRate(rate, i18n.language)}
            </AppText>
          </View>
        </Pressable>
      </View>
      <ActionSheet
        visible={rates}
        title={t('player.rateTitle')}
        items={PLAYBACK_RATES.map((choice) => ({
          label: formatRate(choice, i18n.language),
          checked: choice === rate,
          onPress: () => {
            onRateChange(choice);
            setRates(false);
          },
        }))}
        onClose={() => setRates(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  seek: { justifyContent: 'center' },
  track: { height: TRACK, flexDirection: 'row', overflow: 'hidden' },
  knob: { position: 'absolute', width: KNOB, height: KNOB, borderWidth: 2 },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  tabular: { fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  rateTarget: { marginStart: 'auto', justifyContent: 'center' },
  rate: { minHeight: 32, justifyContent: 'center', borderWidth: 1 },
});
