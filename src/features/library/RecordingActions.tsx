import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { LibraryItem } from '@/services/library';
import { ActionSheet, Dialog, TextField } from '@/ui';

import { itemTitle } from './display';
import { library } from './library';

/** Long enough for a meeting name, short enough for two lines of a card. */
export const MAX_TITLE_LENGTH = 120;

type Stage = 'menu' | 'rename' | 'trash';

export type RecordingActionsProps = {
  item: LibraryItem;
  /** Title as shown (the default title when the user gave none). */
  title: string;
  visible: boolean;
  onClose: () => void;
  onTrashed?: () => void;
};

/**
 * Actions on a recording, from the Detail's more button or a long press on a card:
 * rename, then trash behind a Dialog (guide ActionSheet). Export is absent until step 4.
 */
export function RecordingActions({
  item,
  title,
  visible,
  onClose,
  onTrashed,
}: RecordingActionsProps) {
  const { t, i18n } = useTranslation();
  const [stage, setStage] = useState<Stage>('menu');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | undefined>();

  const close = () => {
    setStage('menu');
    setError(undefined);
    onClose();
  };

  const rename = () => {
    if (draft.trim().length > MAX_TITLE_LENGTH) {
      setError(t('rename.tooLong', { max: MAX_TITLE_LENGTH }));
      return;
    }
    library.rename(item.id, draft);
    close();
  };

  return (
    <>
      <ActionSheet
        visible={visible && stage === 'menu'}
        title={title}
        note={t('actions.exportNote')}
        items={[
          {
            label: t('actions.rename'),
            icon: 'file-text',
            onPress: () => {
              setDraft(item.title ?? '');
              setStage('rename');
            },
          },
          {
            label: t('actions.trash'),
            icon: 'trash-2',
            destructive: true,
            onPress: () => setStage('trash'),
          },
        ]}
        onClose={close}
      />
      <Dialog
        visible={visible && stage === 'rename'}
        title={t('rename.title')}
        body={t('rename.body')}
        confirmLabel={t('rename.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={rename}
        onCancel={close}
      >
        <TextField
          label={t('rename.label')}
          value={draft}
          onChangeText={(text) => {
            setDraft(text);
            setError(undefined);
          }}
          placeholder={itemTitle({ ...item, title: null }, new Date(), i18n.language, t)}
          hint={t('rename.hint')}
          error={error}
          autoFocus
          onSubmitEditing={rename}
        />
      </Dialog>
      <Dialog
        visible={visible && stage === 'trash'}
        title={t('trash.confirmTitle')}
        body={t('trash.confirmBody', { title })}
        confirmLabel={t('actions.trash')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => {
          library.trash(item.id);
          close();
          onTrashed?.();
        }}
        onCancel={close}
      />
    </>
  );
}
