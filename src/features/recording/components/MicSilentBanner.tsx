import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, radius, space, useTheme } from '@/ui';

/** Alert only: digital silence while recording (D-023). The recording goes on. */
export function MicSilentBanner() {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View
      accessibilityLiveRegion="assertive"
      style={[
        styles.banner,
        { backgroundColor: theme.color['surface-raised'], borderColor: theme.color['accent'] },
      ]}
    >
      <AppText variant="title" accessibilityRole="header">
        {t('record.micSilent.title')}
      </AppText>
      <AppText color="ink-muted">{t('record.micSilent.body')}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    gap: space['space-2'],
    padding: space['space-4'],
    borderRadius: radius['radius-md'],
    borderWidth: 2,
  },
});
