import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useTheme, type ColorName } from '../theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type Quality = 'good' | 'medium' | 'draft' | 'busy';

const LOOK: Record<Quality, { icon: IconName; ink: ColorName }> = {
  good: { icon: 'check', ink: 'success' },
  medium: { icon: 'clock', ink: 'ink' },
  draft: { icon: 'alert-triangle', ink: 'warning' },
  busy: { icon: 'clock', ink: 'ink-muted' },
};

/**
 * Transcription language with its expected quality: never a language without
 * its quality word, never the colour alone (guide QualityChip).
 */
export function QualityChip({ language, quality }: { language?: string; quality: Quality }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { icon, ink } = LOOK[quality];
  const text =
    quality === 'busy'
      ? t('quality.busy')
      : t('quality.withLanguage', { language, quality: t(`quality.${quality}`) });
  return (
    <View
      accessible
      accessibilityLabel={text}
      style={[
        styles.chip,
        {
          gap: theme.space['space-1'],
          paddingVertical: theme.space['space-1'],
          paddingHorizontal: theme.space['space-3'],
          borderRadius: theme.radius['radius-sm'],
          backgroundColor:
            quality === 'medium' ? theme.color['accent-soft'] : theme.color['surface-raised'],
          borderColor: quality === 'medium' ? 'transparent' : theme.color.hairline,
        },
      ]}
    >
      <Icon name={icon} size="icon-sm" color={ink} />
      <AppText variant="caption" color={ink}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1 },
});
