import { settingsStorage as Storage } from '@/features/settings/storage';
import { create } from 'zustand';

import {
  DEFAULT_TRANSCRIPTION_LANGUAGE,
  isTranscriptionLanguageCode,
  type TranscriptionLanguageCode,
} from '@/services/transcription/languages';

export const TRANSCRIPTION_LANGUAGE_STORAGE_KEY = 'settings.transcriptionLanguage';

function stored(): TranscriptionLanguageCode {
  const value = Storage.getItemSync(TRANSCRIPTION_LANGUAGE_STORAGE_KEY);
  return isTranscriptionLanguageCode(value) ? value : DEFAULT_TRANSCRIPTION_LANGUAGE;
}

/** Transcription language, independent of the interface language (CLAUDE.md). */
export const useTranscriptionLanguage = create<{ code: TranscriptionLanguageCode }>(() => ({
  code: stored(),
}));

export function setTranscriptionLanguage(code: TranscriptionLanguageCode): void {
  Storage.setItemSync(TRANSCRIPTION_LANGUAGE_STORAGE_KEY, code);
  useTranscriptionLanguage.setState({ code });
}
