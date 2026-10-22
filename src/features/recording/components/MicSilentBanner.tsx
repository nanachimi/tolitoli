import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, radius, spacing, useTheme } from '@/ui';

/** Alert only: digital silence while recording (D-023). The recording goes on. */
export function MicSilentBanner() {
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
        {t('record.micSilent.title')}
      </AppText>
      <AppText muted>{t('record.micSilent.body')}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 2 },
});
