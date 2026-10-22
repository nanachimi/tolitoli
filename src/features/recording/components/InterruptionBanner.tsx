import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, radius, spacing, useTheme } from '@/ui';

type Props = {
  /** False while a call still holds the microphone: no resume button (D-023). */
  resumeOffered: boolean;
  onResume: () => void;
};

export function InterruptionBanner({ resumeOffered, onResume }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View
      accessibilityLiveRegion="assertive"
      style={[
        styles.banner,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary },
      ]}
    >
      <AppText variant="title" accessibilityRole="header">
        {t('record.interruption.title')}
      </AppText>
      <AppText muted>
        {resumeOffered ? t('record.interruption.body') : t('record.interruption.waitBody')}
      </AppText>
      {resumeOffered ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('record.interruption.resume')}
          onPress={onResume}
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
        >
          <AppText style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>
            {t('record.interruption.resume')}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 2 },
  button: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
});
