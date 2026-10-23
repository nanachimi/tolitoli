import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { AppText, Screen, ScreenHeader, space } from '@/ui';

export default function AboutScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title={t('settings.about.title')} onBack={() => router.back()} />
        <AppText variant="heading">{t('app.name')}</AppText>
        <AppText color="ink-muted">
          {t('settings.about.version', { version: Constants.expoConfig?.version ?? '' })}
        </AppText>
        <AppText>{t('settings.about.local')}</AppText>
        {/* Legal texts are drafts until a lawyer reviews them (CLAUDE.md). */}
        <AppText variant="caption" color="ink-muted">
          {t('settings.about.legal')}
        </AppText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space['space-4'], gap: space['space-4'] },
});
