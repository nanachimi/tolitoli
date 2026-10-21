import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Screen, SplitLayout, spacing } from '@/ui';

export default function LibraryScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <SplitLayout
        list={
          <View style={styles.empty}>
            <AppText variant="title" accessibilityRole="header">
              {t('library.empty.title')}
            </AppText>
            <AppText muted>{t('library.empty.body')}</AppText>
          </View>
        }
        detail={
          <View style={styles.empty}>
            <AppText muted>{t('library.detailPlaceholder')}</AppText>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});
