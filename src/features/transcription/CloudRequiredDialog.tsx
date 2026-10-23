import { useTranslation } from 'react-i18next';

import { Dialog } from '@/ui';

/**
 * Why a language gets no transcript (owner's answer D): it needs cloud transcription, which
 * comes in a future version. The truth, no date promised, and no cloud setting that would do
 * nothing. Two buttons, as the Dialog guide wants: close, or pick another language.
 */
export function CloudRequiredDialog({
  visible,
  language,
  onClose,
  onChooseLanguage,
}: {
  visible: boolean;
  /** The language's own name (languages.ts). */
  language: string;
  onClose: () => void;
  onChooseLanguage: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog
      visible={visible}
      title={t('transcription.cloudDialog.title', { language })}
      body={t('transcription.cloudDialog.body', { language })}
      confirmLabel={t('transcription.cloudDialog.confirm')}
      cancelLabel={t('transcription.cloudDialog.close')}
      onConfirm={onChooseLanguage}
      onCancel={onClose}
    />
  );
}
