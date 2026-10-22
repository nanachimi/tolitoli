import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { formatBytes } from '../format/display';
import { useTheme, type ColorName } from '../theme';
import { AppText } from './AppText';
import { Banner } from './Banner';
import { Button } from './Button';

export type StorageMeterProps = {
  recordingsBytes: number;
  trashBytes: number;
  freeBytes: number;
  /**
   * Disk check of services/audio/diskSpace.ts: `low` under 500 MB, `insufficient` when
   * less than 10 minutes of recording fit (the threshold follows the format, D-021).
   */
  warning?: { kind: 'low' | 'insufficient'; remainingMinutes: number };
  onEmptyTrash?: () => void;
};

/** A non-zero part never shrinks below this share of the bar (guide StorageMeter). */
const MIN_SHARE = 0.02;
const HEIGHT = 12;
const SWATCH = 10;

export function StorageMeter({
  recordingsBytes,
  trashBytes,
  freeBytes,
  warning,
  onEmptyTrash,
}: StorageMeterProps) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const total = Math.max(1, recordingsBytes + trashBytes + freeBytes);
  const share = (bytes: number) => (bytes > 0 ? Math.max(MIN_SHARE, bytes / total) : 0);
  const sizes = {
    recordings: formatBytes(recordingsBytes, i18n.language, t),
    trash: formatBytes(trashBytes, i18n.language, t),
    free: formatBytes(freeBytes, i18n.language, t),
  };
  const legend: { key: string; color: ColorName; label: string }[] = [
    {
      key: 'recordings',
      color: 'accent',
      label: t('storage.recordings', { size: sizes.recordings }),
    },
    { key: 'trash', color: 'ochre', label: t('storage.trash', { size: sizes.trash }) },
    { key: 'free', color: 'surface-sunken', label: t('storage.free', { size: sizes.free }) },
  ];

  return (
    <View style={{ gap: theme.space['space-4'] }}>
      {warning ? (
        <Banner
          kind="alert"
          title={t(warning.kind === 'low' ? 'storage.lowTitle' : 'storage.insufficientTitle')}
          body={
            warning.kind === 'low'
              ? t('storage.lowBody', { minutes: warning.remainingMinutes })
              : t('storage.insufficientBody')
          }
        />
      ) : null}
      <View
        style={[
          styles.card,
          {
            padding: theme.space['space-4'],
            borderRadius: theme.radius['radius-md'],
            backgroundColor: theme.color['surface-raised'],
            borderColor: theme.color.hairline,
          },
        ]}
      >
        <AppText variant="heading" accessibilityRole="header">
          {t('storage.title')}
        </AppText>
        {/* One image for screen readers, its label names the three parts. */}
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('storage.barA11y', sizes)}
          style={[
            styles.bar,
            {
              marginVertical: theme.space['space-3'],
              borderRadius: theme.radius['radius-pill'],
              backgroundColor: theme.color['surface-sunken'],
              borderColor: theme.color.hairline,
            },
          ]}
        >
          <View
            testID="storage-recordings"
            style={{
              width: `${share(recordingsBytes) * 100}%`,
              backgroundColor: theme.color.accent,
            }}
          />
          <View
            testID="storage-trash"
            style={{ width: `${share(trashBytes) * 100}%`, backgroundColor: theme.color.ochre }}
          />
        </View>
        <View style={[styles.legend, { gap: theme.space['space-3'] }]}>
          {legend.map((part) => (
            <View
              key={part.key}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.legendItem, { gap: theme.space['space-1'] }]}
            >
              <View
                style={{
                  width: SWATCH,
                  height: SWATCH,
                  borderRadius: 3,
                  backgroundColor: theme.color[part.color],
                  borderWidth: part.color === 'surface-sunken' ? 1 : 0,
                  borderColor: theme.color.hairline,
                }}
              />
              <AppText variant="caption" color="ink-muted">
                {part.label}
              </AppText>
            </View>
          ))}
        </View>
      </View>
      {onEmptyTrash && trashBytes > 0 ? (
        <View style={styles.actions}>
          <Button label={t('storage.emptyTrash')} variant="secondary" onPress={onEmptyTrash} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  bar: { height: HEIGHT, flexDirection: 'row', overflow: 'hidden', borderWidth: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  actions: { alignItems: 'flex-start' },
});
