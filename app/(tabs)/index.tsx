import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionList, StyleSheet, View } from 'react-native';

import { useRecordingStore } from '@/features/recording/useRecordingStore';
import type { RecordingManifest } from '@/services/audio/recordingStore';
import {
  AppText,
  RecordButton,
  RecordingCard,
  Screen,
  SplitLayout,
  size,
  space,
  textSpec,
} from '@/ui';
import {
  dayKey,
  formatDayGroup,
  formatDurationShort,
  formatShortDate,
  formatTime,
} from '@/ui/format/display';

/** Room left under the list for the floating Record button and its caption. */
const RECORD_AREA =
  size['control-lg'] + space['space-2'] + textSpec.caption.lineHeight + 2 * space['space-6'];

type Section = { key: number; title: string; data: RecordingManifest[] };

/** Provisional list read from manifests; the real library comes with SQLite (step 2). */
function Card({ item, now }: { item: RecordingManifest; now: Date }) {
  const { t, i18n } = useTranslation();
  const created = new Date(item.createdAt);
  const time = formatTime(created, i18n.language);
  const date = `${formatShortDate(created, now, i18n.language)} ${time}`;
  const duration =
    item.durationMs === null
      ? t('library.durationUnknown')
      : formatDurationShort(item.durationMs, t);
  return (
    <RecordingCard
      recording={{
        title: t('library.cardTitle', { date }),
        time,
        duration,
        state: 'audio',
        recovered: item.recovered,
      }}
      accessibilityLabel={t(item.recovered ? 'library.itemRecoveredA11y' : 'library.itemA11y', {
        date,
        duration,
      })}
    />
  );
}

export default function LibraryScreen() {
  const { t, i18n } = useTranslation();
  const recordings = useRecordingStore((state) => state.recordings);
  // Day groups are computed when the list changes; a list left open over midnight regroups on the next change.
  const now = useMemo(() => new Date(), [recordings]);

  const sections = useMemo(() => {
    const byDay = new Map<number, Section>();
    for (const item of recordings) {
      const created = new Date(item.createdAt);
      const key = dayKey(created);
      const section = byDay.get(key) ?? {
        key,
        title: formatDayGroup(created, now, i18n.language, t),
        data: [],
      };
      section.data.push(item);
      byDay.set(key, section);
    }
    return [...byDay.values()];
  }, [recordings, now, i18n.language, t]);

  const list = (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <Card item={item} now={now} />}
      renderSectionHeader={({ section }) => (
        <AppText
          variant="overline"
          color="ink-muted"
          accessibilityRole="header"
          style={styles.overline}
        >
          {section.title}
        </AppText>
      )}
      stickySectionHeadersEnabled={false}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <AppText variant="display" accessibilityRole="header" style={styles.title}>
          {t('library.title')}
        </AppText>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <AppText variant="heading" accessibilityRole="header">
            {t('library.empty.title')}
          </AppText>
          <AppText color="ink-muted" style={styles.centered}>
            {t('library.empty.body')}
          </AppText>
        </View>
      }
    />
  );

  return (
    <Screen>
      <SplitLayout
        list={
          <View style={styles.fill}>
            {list}
            <View style={styles.record} pointerEvents="box-none">
              <RecordButton
                mode="record"
                label={t('library.record')}
                accessibilityLabel={t('record.start')}
                onPress={() => router.push('/record')}
              />
            </View>
          </View>
        }
        detail={
          <View style={styles.empty}>
            <AppText color="ink-muted">{t('library.detailPlaceholder')}</AppText>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: {
    paddingHorizontal: space['space-4'],
    paddingTop: space['space-8'],
    paddingBottom: RECORD_AREA,
  },
  title: { marginBottom: space['space-6'] },
  overline: { marginTop: space['space-4'], marginBottom: space['space-2'] },
  separator: { height: space['space-2'] },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space['space-2'],
    paddingHorizontal: space['space-6'],
    paddingVertical: space['space-12'],
  },
  centered: { textAlign: 'center' },
  record: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: space['space-6'],
    alignItems: 'center',
  },
});
