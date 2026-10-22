import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { useRecordingStore } from '@/features/recording/useRecordingStore';
import { formatDuration, formatRecordingDate } from '@/services/audio/duration';
import type { RecordingManifest } from '@/services/audio/recordingStore';
import { AppText, Screen, SplitLayout, radius, spacing, useTheme } from '@/ui';

/** Provisional list read from manifests; the real library comes with SQLite (step 2). */
function RecordingRow({ item }: { item: RecordingManifest }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const date = formatRecordingDate(item.createdAt);
  const duration =
    item.durationMs === null ? t('library.durationUnknown') : formatDuration(item.durationMs);
  return (
    <View
      accessible
      accessibilityLabel={t(item.recovered ? 'library.itemRecoveredA11y' : 'library.itemA11y', {
        date,
        duration,
      })}
      style={[styles.row, { borderColor: theme.colors.border }]}
    >
      <AppText testID="i18n-data">{date}</AppText>
      <View style={styles.rowEnd}>
        {item.recovered ? (
          <AppText
            style={[
              styles.badge,
              { color: theme.colors.primary, borderColor: theme.colors.primary },
            ]}
          >
            {t('library.recovered')}
          </AppText>
        ) : null}
        <AppText testID="i18n-data" muted>
          {duration}
        </AppText>
      </View>
    </View>
  );
}

export default function LibraryScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const recordings = useRecordingStore((state) => state.recordings);

  const list =
    recordings.length === 0 ? (
      <View style={styles.empty}>
        <AppText variant="title" accessibilityRole="header">
          {t('library.empty.title')}
        </AppText>
        <AppText muted>{t('library.empty.body')}</AppText>
      </View>
    ) : (
      <FlatList
        data={recordings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <RecordingRow item={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <AppText variant="title" accessibilityRole="header">
            {t('library.listTitle')}
          </AppText>
        }
      />
    );

  return (
    <Screen>
      <SplitLayout
        list={
          <View style={styles.fill}>
            {list}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('library.recordA11y')}
              onPress={() => router.push('/record')}
              style={[styles.recordButton, { backgroundColor: theme.colors.primary }]}
            >
              <AppText style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>
                {t('library.record')}
              </AppText>
            </Pressable>
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
  fill: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  list: { padding: spacing.md, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  rowEnd: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    fontSize: 13,
  },
  recordButton: {
    margin: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
});
