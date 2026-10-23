import { Pressable, StyleSheet, View, type TextStyle } from 'react-native';

import { scriptDirection } from '../format/direction';
import { useTheme } from '../theme';
import { AppText } from './AppText';

export type SegmentState = 'past' | 'active' | 'upcoming';

export type TranscriptSegmentProps = {
  /** Already formatted: "12:04". */
  timestamp: string;
  /** Mixed-language text shown as the engine returns it, in the system font. */
  text: string;
  /** "Locuteur 1" when speakers are separated. */
  speaker?: string;
  state: SegmentState;
  onPress: () => void;
  onLongPress?: () => void;
  /** "Aller à 12:04", read with the text. */
  accessibilityHint?: string;
};

/**
 * `direction` sets the paragraph direction of the text node: Android aligns `auto` text on
 * it, and ignores `writingDirection`, which iOS reads.
 */
function textDirectionStyle(text: string): TextStyle {
  const direction = scriptDirection(text);
  return direction
    ? { direction, writingDirection: direction, textAlign: 'auto' }
    : { writingDirection: 'auto', textAlign: 'auto' };
}

/** One transcript segment of the Detail screen (guide TranscriptSegment). */
export function TranscriptSegment({
  timestamp,
  text,
  speaker,
  state,
  onPress,
  onLongPress,
  accessibilityHint,
}: TranscriptSegmentProps) {
  const theme = useTheme();
  const upcoming = state === 'upcoming';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: state === 'active' }}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.segment,
        {
          gap: theme.space['space-3'],
          paddingVertical: theme.space['space-2'],
          paddingHorizontal: theme.space['space-3'],
          borderRadius: theme.radius['radius-sm'],
          backgroundColor: state === 'active' ? theme.color['accent-soft'] : 'transparent',
        },
      ]}
    >
      <AppText testID="i18n-data" variant="timestamp" color="ink-muted" style={styles.time}>
        {timestamp}
      </AppText>
      <View style={styles.body}>
        {speaker ? (
          <AppText testID="i18n-data" variant="caption" color="ink-muted">
            {speaker}
          </AppText>
        ) : null}
        {/* Aligned on its own script, while timestamp and speaker follow the interface (D-032). */}
        <AppText
          testID="i18n-data"
          color={upcoming ? 'ink-muted' : 'ink'}
          style={textDirectionStyle(text)}
        >
          {text}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', alignItems: 'flex-start' },
  time: { paddingTop: 4 },
  body: { flex: 1 },
});
