import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionList, StyleSheet, View } from 'react-native';

import { itemTitle } from '@/features/library/display';
import { useLibrary } from '@/features/library/library';
import { RecordingActions } from '@/features/library/RecordingActions';
import { RecordingDetail } from '@/features/library/RecordingDetail';
import { freeBytes } from '@/features/library/storage';
import { MODEL_BYTES, startModelDownload, useModel } from '@/features/transcription/model';
import { ACTIVE_PROFILE } from '@/services/audio/activeProfile';
import { checkDiskSpace } from '@/services/audio/diskSpace';
import type { LibraryItem } from '@/services/library';
import { findTranscriptionLanguage } from '@/services/transcription/languages';
import {
  AppText,
  Banner,
  EmptyState,
  ProgressBar,
  RecordButton,
  RecordingCard,
  Screen,
  TAB_SCREEN_EDGES,
  SearchField,
  SplitLayout,
  space,
  useLayoutMode,
  useTheme,
  type RecordingCardState,
} from '@/ui';
import {
  dayKey,
  formatBytes,
  formatDayGroup,
  formatDurationShort,
  formatShortDate,
  formatTime,
} from '@/ui/format/display';

/** Search runs as one types, after this pause (guide SearchField). */
export const SEARCH_DEBOUNCE_MS = 250;

/** `formatted`: a date written by Intl (data), not "Aujourd'hui" or "Hier". */
type Section = { key: number; title: string; formatted: boolean; data: LibraryItem[] };

/** The Detail says why a transcription failed and offers to retry. */
const CARD_STATE: Record<LibraryItem['state'], RecordingCardState> = {
  audio: 'audio',
  transcribing: 'transcribing',
  transcribed: 'transcribed',
  failed: 'failed',
};

function Card({
  item,
  now,
  onOpen,
  onMenu,
}: {
  item: LibraryItem;
  now: Date;
  onOpen: () => void;
  onMenu: () => void;
}) {
  const { t, i18n } = useTranslation();
  const created = new Date(item.createdAt);
  const time = formatTime(created, i18n.language);
  const title = itemTitle(item, now, i18n.language, t);
  const duration =
    item.durationMs === null
      ? t('library.durationUnknown')
      : formatDurationShort(item.durationMs, t);
  const language = item.language ? findTranscriptionLanguage(item.language) : undefined;
  const quality = item.state === 'transcribed' ? (item.quality ?? undefined) : undefined;

  // The default title already says the date and time; a given title does not.
  const date = `${formatShortDate(created, now, i18n.language)} ${time}`;
  const a11y = [title, ...(item.title ? [date] : []), t('library.a11y.duration', { duration })];
  if (item.state === 'transcribing') a11y.push(t('library.a11y.transcribing'));
  if (item.state === 'failed') a11y.push(t('library.a11y.failed'));
  if (quality && language) {
    a11y.push(
      t('library.a11y.quality', {
        language: language.nativeName,
        quality: t(`quality.${quality}`),
      }),
    );
  }
  if (item.recovered) a11y.push(t('library.a11y.recovered'));

  return (
    <RecordingCard
      recording={{
        title,
        time,
        duration,
        state: CARD_STATE[item.state],
        language: language?.nativeName,
        quality,
        recovered: item.recovered,
      }}
      accessibilityLabel={a11y.join(t('format.listSeparator'))}
      accessibilityHint={t('library.a11y.longPress')}
      onPress={onOpen}
      onLongPress={onMenu}
    />
  );
}

/** Waiting and warning states above the list: the model and the disk (cahier, « États à concevoir »). */
function Notices() {
  const { t, i18n } = useTranslation();
  const model = useModel();
  const disk = checkDiskSpace(freeBytes(), ACTIVE_PROFILE);
  const size = (bytes: number) => formatBytes(bytes, i18n.language, t);
  return (
    <>
      {model.status === 'missing' ? (
        <Banner
          kind="alert"
          title={t('detail.issue.modelMissing.title')}
          body={t('library.model.body', { size: size(MODEL_BYTES) })}
          action={{ label: t('library.model.download'), onPress: () => startModelDownload() }}
        />
      ) : model.status === 'waiting-wifi' ? (
        // Wi-Fi only by default: our markets pay dearly for mobile data.
        <Banner
          kind="interrupted"
          icon="wifi-off"
          title={t('library.model.waitingWifi.title')}
          body={t('library.model.waitingWifi.body', { size: size(MODEL_BYTES) })}
          action={{
            label: t('library.model.waitingWifi.action'),
            onPress: () => startModelDownload({ mobileData: true }),
          }}
        />
      ) : model.status === 'failed' ? (
        <Banner
          kind="alert"
          title={t('library.model.failed.title')}
          body={t(
            model.failure === 'integrity'
              ? 'library.model.failed.integrity'
              : 'library.model.failed.network',
          )}
          action={{ label: t('library.model.failed.action'), onPress: () => startModelDownload() }}
        />
      ) : model.status === 'downloading' || model.status === 'verifying' ? (
        <ProgressBar
          label={t(
            model.status === 'verifying' ? 'library.model.verifying' : 'onboarding.model.progress',
          )}
          value={model.progress}
          detail={t('onboarding.model.detail', {
            done: size(MODEL_BYTES * model.progress),
            total: size(MODEL_BYTES),
          })}
          state="running"
        />
      ) : null}
      {disk.kind !== 'ok' ? (
        <Banner
          kind="alert"
          title={t(disk.kind === 'low' ? 'storage.lowTitle' : 'storage.insufficientTitle')}
          body={
            disk.kind === 'low'
              ? t('storage.lowBody', { minutes: disk.remainingMinutes })
              : t('storage.insufficientBody')
          }
          action={{
            label: t('library.storage.manage'),
            onPress: () => router.push('/settings/storage'),
          }}
        />
      ) : null}
    </>
  );
}

export default function LibraryScreen() {
  const { t, i18n } = useTranslation();
  const library = useLibrary();
  const theme = useTheme();
  const split = useLayoutMode() === 'tablet-split';
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<LibraryItem | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearched(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const all = library.list();
  const items = searched.trim() === '' ? all : library.search(searched);
  // The screen re-renders on every library change: day groups follow midnight then.
  const now = new Date();
  const sections = (() => {
    const byDay = new Map<number, Section>();
    for (const item of items) {
      const created = new Date(item.createdAt);
      const key = dayKey(created);
      const title = formatDayGroup(created, now, i18n.language, t);
      const section = byDay.get(key) ?? {
        key,
        title,
        formatted: title !== t('format.today') && title !== t('format.yesterday'),
        data: [],
      };
      section.data.push(item);
      byDay.set(key, section);
    }
    return [...byDay.values()];
  })();

  const open = (id: string) => (split ? setSelected(id) : router.push(`/recording/${id}`));

  const list = (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Card item={item} now={now} onOpen={() => open(item.id)} onMenu={() => setMenuFor(item)} />
      )}
      renderSectionHeader={({ section }) => (
        <AppText
          variant="overline"
          color="ink-muted"
          accessibilityRole="header"
          testID={section.formatted ? 'i18n-data' : undefined}
          style={styles.overline}
        >
          {section.title}
        </AppText>
      )}
      stickySectionHeadersEnabled={false}
      // A tall tablet pane shows more than the default ten rows (headers count as rows).
      initialNumToRender={16}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.header}>
          <AppText variant="display" accessibilityRole="header">
            {t('library.title')}
          </AppText>
          <Notices />
          {all.length > 0 ? (
            <SearchField
              value={query}
              onChangeText={setQuery}
              onClear={() => {
                setQuery('');
                setSearched('');
              }}
              placeholder={t('library.searchPlaceholder')}
            />
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          {all.length === 0 ? (
            <EmptyState
              icon="mic"
              tone="welcoming"
              title={t('library.empty.title')}
              body={t('library.empty.body')}
            />
          ) : (
            <EmptyState
              icon="search"
              tone="quiet"
              title={t('library.noResults.title')}
              body={t('library.noResults.body')}
            />
          )}
        </View>
      }
    />
  );

  const menuTitle = menuFor ? itemTitle(menuFor, now, i18n.language, t) : '';

  return (
    <Screen edges={TAB_SCREEN_EDGES}>
      <SplitLayout
        list={
          <View style={styles.fill}>
            {list}
            {/* A docked bar, not a floating button: the list stops above it, so no card is
                ever hidden (guide RecordButton). */}
            <View
              testID="record-bar"
              style={[
                styles.recordBar,
                {
                  backgroundColor: theme.color['surface-raised'],
                  borderTopColor: theme.color.hairline,
                },
              ]}
            >
              <RecordButton
                mode="record"
                accessibilityLabel={t('record.start')}
                onPress={() => router.push('/record')}
              />
            </View>
          </View>
        }
        detail={
          selected ? (
            <RecordingDetail id={selected} onBack={() => setSelected(null)} />
          ) : (
            <View style={styles.placeholder}>
              <AppText color="ink-muted">{t('library.detailPlaceholder')}</AppText>
            </View>
          )
        }
      />
      {menuFor ? (
        <RecordingActions
          item={menuFor}
          title={menuTitle}
          visible
          onClose={() => setMenuFor(null)}
          onTrashed={() => {
            if (selected === menuFor.id) setSelected(null);
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: {
    flexGrow: 1,
    paddingHorizontal: space['space-4'],
    paddingTop: space['space-8'],
    paddingBottom: space['space-6'],
  },
  header: { gap: space['space-4'], marginBottom: space['space-2'] },
  overline: { marginTop: space['space-4'], marginBottom: space['space-2'] },
  separator: { height: space['space-2'] },
  empty: { flex: 1, justifyContent: 'center', paddingVertical: space['space-8'] },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space['space-6'],
  },
  recordBar: {
    alignItems: 'center',
    paddingVertical: space['space-4'],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
