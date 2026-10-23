import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { useLibrary } from '@/features/library/library';
import { freeBytes, totalBytes } from '@/features/library/storage';
import { ACTIVE_PROFILE } from '@/services/audio/activeProfile';
import { checkDiskSpace } from '@/services/audio/diskSpace';
import { Dialog, OptionGroup, OptionRow, Screen, ScreenHeader, StorageMeter, space } from '@/ui';

export default function StorageScreen() {
  const { t } = useTranslation();
  const library = useLibrary();
  const [confirming, setConfirming] = useState(false);
  const trash = library.listTrash();
  const free = freeBytes();
  // Same thresholds as the recording screen (D-021): the meter warns before recording fails.
  const disk = checkDiskSpace(free, ACTIVE_PROFILE);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title={t('storage.title')} onBack={() => router.back()} />
        <StorageMeter
          recordingsBytes={totalBytes(library.list())}
          trashBytes={totalBytes(trash)}
          freeBytes={free}
          warning={disk.kind === 'ok' ? undefined : disk}
          onEmptyTrash={trash.length > 0 ? () => setConfirming(true) : undefined}
        />
        <OptionGroup title={t('settings.storage.trash')}>
          <OptionRow
            kind="link"
            label={t('trash.title')}
            description={t('library.count', { count: trash.length })}
            onPress={() => router.push('/trash')}
          />
        </OptionGroup>
      </ScrollView>
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
  content: { padding: space['space-4'], gap: space['space-4'] },
});
