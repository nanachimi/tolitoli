import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';

import { itemTitle } from '@/features/library/display';
import { useLibrary } from '@/features/library/library';
import type { TrashedItem } from '@/services/library';
import { AppText, Button, Dialog, EmptyState, Screen, ScreenHeader, space, useTheme } from '@/ui';
import { formatDurationShort } from '@/ui/format/display';

function Row({ item, now }: { item: TrashedItem; now: Date }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const library = useLibrary();
  const title = itemTitle(item, now, i18n.language, t);
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.color['surface-raised'],
          borderColor: theme.color.hairline,
          borderRadius: theme.radius['radius-md'],
        },
      ]}
    >
      <View style={styles.text}>
        {/* A title the user gave is data, not interface text. */}
        <AppText
          variant="body-strong"
          numberOfLines={2}
          testID={item.title ? 'i18n-data' : undefined}
        >
          {title}
        </AppText>
        <AppText variant="caption" color="ink-muted">
          {item.durationMs === null
            ? t('library.durationUnknown')
            : formatDurationShort(item.durationMs, t)}
        </AppText>
      </View>
      <Button
        variant="secondary"
        label={t('trash.restore')}
        accessibilityLabel={t('trash.restoreA11y', { title })}
        onPress={() => library.restore(item.id)}
      />
    </View>
  );
}

/** Trashed recordings stay 30 days; emptying is simulated in memory until step 2. */
export default function TrashScreen() {
  const { t } = useTranslation();
  const library = useLibrary();
  const [confirming, setConfirming] = useState(false);
  const items = library.listTrash();
  const now = useMemo(() => new Date(), []);

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Row item={item} now={now} />}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <ScreenHeader
            title={t('trash.title')}
            onBack={() => router.back()}
            action={
              items.length > 0
                ? {
                    icon: 'trash-2',
                    label: t('storage.emptyTrash'),
                    onPress: () => setConfirming(true),
                  }
                : undefined
            }
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <EmptyState
              icon="trash-2"
              tone="quiet"
              title={t('trash.emptyTitle')}
              body={t('trash.emptyBody')}
            />
          </View>
        }
      />
      <Dialog
        visible={confirming}
        title={t('trash.confirmEmptyTitle')}
        body={t('trash.confirmEmptyBody')}
        confirmLabel={t('storage.emptyTrash')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => {
          library.emptyTrash();
          setConfirming(false);
        }}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space['space-4'], gap: space['space-4'], flexGrow: 1 },
  separator: { height: space['space-2'] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['space-3'],
    padding: space['space-4'],
    borderWidth: 1,
  },
  text: { flex: 1, minWidth: 0, gap: space['space-1'] },
  empty: { flex: 1, justifyContent: 'center' },
});
