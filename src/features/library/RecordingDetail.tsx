import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';

import { usePlayback } from '@/features/player/usePlayback';
import type { LibraryItem, Segment, TranscriptionIssue } from '@/services/library';
import { findTranscriptionLanguage, requiresCloud } from '@/services/transcription/languages';
import {
  AppText,
  Banner,
  EmptyState,
  Player,
  ProgressBar,
  QualityChip,
  ScreenHeader,
  TranscriptSegment,
  space,
  useTheme,
  type BannerKind,
} from '@/ui';
import {
  formatDurationShort,
  formatPlayerTime,
  formatShortDate,
  formatTime,
} from '@/ui/format/display';

import { itemTitle } from './display';
import { useLibrary } from './library';
import { RecordingActions } from './RecordingActions';

/** Room kept above the active segment when the transcript follows the player. */
const FOLLOW_OFFSET = 96;

const ISSUE_KEY = {
  failed: 'failed',
  'model-missing': 'modelMissing',
  offline: 'offline',
  'quota-exhausted': 'quotaExhausted',
} as const satisfies Record<TranscriptionIssue, string>;

const ISSUE_KIND: Record<TranscriptionIssue, BannerKind> = {
  failed: 'alert',
  'model-missing': 'alert',
  offline: 'interrupted',
  'quota-exhausted': 'alert',
};

export type RecordingDetailProps = {
  id: string;
  onBack: () => void;
};

/** The Detail screen's content, shared by the phone route and the tablet split pane. */
export function RecordingDetail({ id, onBack }: RecordingDetailProps) {
  const { t } = useTranslation();
  const library = useLibrary();
  const item = library.get(id);

  if (!item) {
    return (
      <View style={styles.fill}>
        <View style={styles.header}>
          <ScreenHeader title="" onBack={onBack} />
        </View>
        <View style={styles.centered}>
          <EmptyState
            icon="file-text"
            tone="quiet"
            title={t('detail.notFoundTitle')}
            body={t('detail.notFoundBody')}
          />
        </View>
      </View>
    );
  }
  // A new engine per recording: the key resets the player when the split pane switches.
  return <Loaded key={item.id} item={item} segments={library.segments(id)} onBack={onBack} />;
}

function Loaded({
  item,
  segments,
  onBack,
}: {
  item: LibraryItem;
  segments: Segment[];
  onBack: () => void;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const library = useLibrary();
  const [menu, setMenu] = useState(false);
  const now = useMemo(() => new Date(), []);
  const title = itemTitle(item, now, i18n.language, t);
  const durationMs = item.durationMs ?? 0;
  const playback = usePlayback(durationMs);
  const position = playback.status.positionMs;

  const scroll = useRef<ScrollViewInstance>(null);
  const offsets = useRef(new Map<string, number>());
  const active = segments.find((s) => position >= s.startMs && position < s.endMs);
  const activeId = active?.id;
  const playing = playback.status.playing;
  // While playing, the transcript follows the active segment (guide TranscriptSegment).
  useEffect(() => {
    if (activeId === undefined || !playing) return;
    const y = offsets.current.get(activeId);
    if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - FOLLOW_OFFSET) });
  }, [activeId, playing]);

  const created = new Date(item.createdAt);
  const date = `${formatShortDate(created, now, i18n.language)} ${formatTime(created, i18n.language)}`;
  const duration =
    item.durationMs === null
      ? t('library.durationUnknown')
      : formatDurationShort(item.durationMs, t);
  const language = item.language ? findTranscriptionLanguage(item.language) : undefined;
  const cloudOnly = item.language !== null && requiresCloud(item.language);

  return (
    <View style={styles.fill}>
      <View style={styles.header}>
        <ScreenHeader
          title={title}
          onBack={onBack}
          action={{
            icon: 'more-horizontal',
            label: t('detail.moreActions'),
            onPress: () => setMenu(true),
          }}
        />
      </View>
      <ScrollView ref={scroll} contentContainerStyle={styles.content}>
        <AppText testID="i18n-data" variant="caption" color="ink-muted">
          {t('detail.meta', { date, duration })}
        </AppText>
        {/* The quality is shown once there is a transcript, as on the Library card. */}
        {item.state === 'transcribing' ? (
          <QualityChip quality="busy" />
        ) : item.state === 'failed' ? (
          <QualityChip language={language?.nativeName} quality="failed" />
        ) : item.state === 'transcribed' && item.quality && language ? (
          <QualityChip language={language.nativeName} quality={item.quality} />
        ) : null}

        {item.issue ? (
          <Banner
            kind={ISSUE_KIND[item.issue]}
            icon={item.issue === 'offline' ? 'wifi-off' : undefined}
            title={t(`detail.issue.${ISSUE_KEY[item.issue]}.title`)}
            body={t(`detail.issue.${ISSUE_KEY[item.issue]}.body`)}
            action={
              item.issue === 'failed'
                ? {
                    label: t('detail.issue.failed.action'),
                    onPress: () => library.retryTranscription(item.id),
                  }
                : undefined
            }
          />
        ) : cloudOnly && item.state === 'audio' && language ? (
          <Banner
            kind="alert"
            title={t('detail.cloudRequired.title')}
            body={t('detail.cloudRequired.body', { language: language.nativeName })}
          />
        ) : null}

        {item.state === 'transcribing' ? (
          <ProgressBar
            label={t('detail.transcribing')}
            value={item.progress}
            detail={t('detail.transcribingDetail')}
            state="running"
          />
        ) : null}

        {segments.length > 0 ? (
          <View style={{ gap: theme.space['space-1'] }}>
            {segments.map((segment) => {
              const time = formatPlayerTime(segment.startMs);
              return (
                <View
                  key={segment.id}
                  onLayout={(event) => offsets.current.set(segment.id, event.nativeEvent.layout.y)}
                >
                  <TranscriptSegment
                    timestamp={time}
                    text={segment.text}
                    speaker={
                      segment.speaker === null
                        ? undefined
                        : t('detail.speaker', { number: segment.speaker })
                    }
                    state={
                      segment === active
                        ? 'active'
                        : segment.endMs <= position
                          ? 'past'
                          : 'upcoming'
                    }
                    accessibilityHint={t('detail.segmentHint', { time })}
                    onPress={() => playback.seek(segment.startMs)}
                  />
                </View>
              );
            })}
          </View>
        ) : item.state === 'audio' && !item.issue && !cloudOnly ? (
          <View style={styles.empty}>
            <EmptyState
              icon="file-text"
              tone="welcoming"
              title={t('detail.noTranscriptTitle')}
              body={t('detail.noTranscriptBody')}
            />
          </View>
        ) : null}
      </ScrollView>
      {durationMs > 0 ? (
        <View style={styles.player}>
          <Player
            positionMs={position}
            durationMs={durationMs}
            playing={playback.status.playing}
            rate={playback.status.rate}
            onSeek={playback.seek}
            onTogglePlay={playback.togglePlay}
            onSkip={playback.skip}
            onRateChange={playback.setRate}
          />
        </View>
      ) : null}
      <RecordingActions
        item={item}
        title={title}
        visible={menu}
        onClose={() => setMenu(false)}
        onTrashed={onBack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { paddingHorizontal: space['space-4'], paddingTop: space['space-2'] },
  content: { padding: space['space-4'], gap: space['space-4'] },
  centered: { flex: 1, justifyContent: 'center', padding: space['space-4'] },
  empty: { paddingVertical: space['space-8'] },
  player: { paddingHorizontal: space['space-4'], paddingBottom: space['space-4'] },
});
