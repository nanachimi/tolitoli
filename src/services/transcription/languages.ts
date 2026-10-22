/**
 * Transcription languages of the 1.0 (CLAUDE.md, « Langues de transcription »).
 * Provisional table of step 1c: the local engine and its expected quality only.
 * Step 8 adds the cloud engines (Deepgram, Intron Sahara) without changing this shape
 * for the interface. It drives both the picker and, later, the routing.
 */

/** Expected quality, always shown next to the language (never "recognised" alone). */
export type Quality = 'good' | 'medium' | 'draft';

export type TranscriptionLanguageCode =
  | 'fr'
  | 'en'
  | 'de'
  | 'ru'
  | 'zh'
  | 'ar'
  | 'sw'
  | 'ha'
  | 'yo'
  | 'ln'
  | 'mg'
  | 'ig'
  | 'pcm'
  | 'zu'
  | 'lg'
  | 'wo';

export type TranscriptionLanguage = {
  code: TranscriptionLanguageCode;
  /** Written in the language itself; shown as data, not translated. */
  nativeName: string;
  /** Quality of on-device Whisper, or null when there is no local engine (cloud required). */
  localQuality: Quality | null;
};

export const TRANSCRIPTION_LANGUAGES: readonly TranscriptionLanguage[] = [
  { code: 'fr', nativeName: 'Français', localQuality: 'good' },
  { code: 'en', nativeName: 'English', localQuality: 'good' },
  { code: 'de', nativeName: 'Deutsch', localQuality: 'good' },
  { code: 'ru', nativeName: 'Русский', localQuality: 'good' },
  { code: 'zh', nativeName: '中文', localQuality: 'good' },
  { code: 'ar', nativeName: 'العربية', localQuality: 'good' },
  // Whisper covers five of the ten African languages, poorly.
  { code: 'sw', nativeName: 'Kiswahili', localQuality: 'draft' },
  { code: 'ha', nativeName: 'Hausa', localQuality: 'draft' },
  { code: 'yo', nativeName: 'Yorùbá', localQuality: 'draft' },
  { code: 'ln', nativeName: 'Lingála', localQuality: 'medium' },
  { code: 'mg', nativeName: 'Malagasy', localQuality: 'medium' },
  // No local engine: without the cloud the app says so and offers to turn it on.
  { code: 'ig', nativeName: 'Igbo', localQuality: null },
  { code: 'pcm', nativeName: 'Naijá', localQuality: null },
  { code: 'zu', nativeName: 'isiZulu', localQuality: null },
  { code: 'lg', nativeName: 'Luganda', localQuality: null },
  { code: 'wo', nativeName: 'Wolof', localQuality: null },
];

export const DEFAULT_TRANSCRIPTION_LANGUAGE: TranscriptionLanguageCode = 'fr';

export function findTranscriptionLanguage(code: string): TranscriptionLanguage | undefined {
  return TRANSCRIPTION_LANGUAGES.find((language) => language.code === code);
}

export function isTranscriptionLanguageCode(
  value: string | null | undefined,
): value is TranscriptionLanguageCode {
  return TRANSCRIPTION_LANGUAGES.some((language) => language.code === value);
}

/** True when the language can only be transcribed in the cloud. */
export function requiresCloud(code: TranscriptionLanguageCode): boolean {
  return findTranscriptionLanguage(code)?.localQuality === null;
}
