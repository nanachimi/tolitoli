import type { LocalModelId } from '../whisper/models';

/**
 * Transcription languages of the 1.0 (CLAUDE.md, « Langues de transcription »). Step 8 adds the
 * cloud engines (Deepgram, Intron Sahara) without changing this shape for the interface. It
 * drives both the picker and the routing.
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

/**
 * What a local model is expected to do on a language: its word error rate and where that
 * figure comes from. The quality shown is derived from it, for the model in use: "good" in
 * French with small is not "good" with tiny (owner, step 3).
 */
export type LocalEstimate = {
  /** Word error rate in % (character error rate for Chinese); null when never measured. */
  werPercent: number | null;
  /**
   * `whisper-paper`: FLEURS, read speech, publisher's figure (OpenAI, arXiv 2212.04356,
   * appendix D), not measured by us — optimistic for a conversation, like Intron's own figures
   * (CLAUDE.md). `tolitoli`: our measurement on 30 min of real conversation, in DECISIONS.md.
   */
  source: 'whisper-paper' | 'tolitoli';
};

/** The engine the cloud will use (step 8); null when no cloud engine covers the language. */
export type CloudEngine = 'deepgram' | 'intron';

export type TranscriptionLanguage = {
  code: TranscriptionLanguageCode;
  /** Written in the language itself; shown as data, not translated. */
  nativeName: string;
  /** On-device Whisper, per model; null when no local model gives a usable text. */
  local: Record<LocalModelId, LocalEstimate> | null;
  cloud: CloudEngine | null;
};

/** WER below which a transcript is called good, then medium; draft above (owner, step 3). */
export const QUALITY_THRESHOLDS = { good: 15, medium: 30 } as const;

/** FLEURS figures of OpenAI per model size: tiny, base, small. */
const paper = (tiny: number, base: number, small: number): Record<LocalModelId, LocalEstimate> => ({
  tiny: { werPercent: tiny, source: 'whisper-paper' },
  base: { werPercent: base, source: 'whisper-paper' },
  small: { werPercent: small, source: 'whisper-paper' },
});

export const TRANSCRIPTION_LANGUAGES: readonly TranscriptionLanguage[] = [
  // Even the major languages are draft to medium in tiny and base: a really readable text
  // needs small or the cloud (owner, step 3). FLEURS, read speech, publisher's figures.
  { code: 'fr', nativeName: 'Français', local: paper(41.4, 28.5, 15.0), cloud: 'deepgram' },
  { code: 'en', nativeName: 'English', local: paper(12.4, 8.9, 6.1), cloud: 'deepgram' },
  { code: 'de', nativeName: 'Deutsch', local: paper(27.8, 17.9, 10.2), cloud: 'deepgram' },
  { code: 'ru', nativeName: 'Русский', local: paper(31.1, 20.5, 11.4), cloud: 'deepgram' },
  { code: 'zh', nativeName: '中文', local: paper(40.5, 34.1, 20.8), cloud: 'deepgram' },
  { code: 'ar', nativeName: 'العربية', local: paper(63.4, 48.8, 30.6), cloud: 'deepgram' },
  // About 100 % WER on the device (FLEURS tiny / base / small: Swahili 100.9 / 92.5 / 73.7,
  // Hausa 100.2 / 98.6 / 90.1, Yoruba 106.4 / 101.8 / 116.4): noise, not a draft. Cloud only.
  { code: 'sw', nativeName: 'Kiswahili', local: null, cloud: 'intron' },
  { code: 'ha', nativeName: 'Hausa', local: null, cloud: 'intron' },
  { code: 'yo', nativeName: 'Yorùbá', local: null, cloud: 'intron' },
  // Lingala about 100 % on the device too (105.4 / 96.7 / 91.3), Malagasy not even in the
  // FLEURS tables, and Intron covers neither: not yet available, said so (owner, step 3).
  { code: 'ln', nativeName: 'Lingála', local: null, cloud: null },
  { code: 'mg', nativeName: 'Malagasy', local: null, cloud: null },
  // No local engine at all.
  { code: 'ig', nativeName: 'Igbo', local: null, cloud: 'intron' },
  { code: 'pcm', nativeName: 'Naijá', local: null, cloud: 'intron' },
  { code: 'zu', nativeName: 'isiZulu', local: null, cloud: 'intron' },
  { code: 'lg', nativeName: 'Luganda', local: null, cloud: 'intron' },
  { code: 'wo', nativeName: 'Wolof', local: null, cloud: 'intron' },
];

/** Draft when unknown: a figure nobody measured never earns a better word. */
export function qualityFromWer(werPercent: number | null): Quality {
  if (werPercent === null) return 'draft';
  if (werPercent < QUALITY_THRESHOLDS.good) return 'good';
  if (werPercent <= QUALITY_THRESHOLDS.medium) return 'medium';
  return 'draft';
}

/** Expected quality of a language with a local model; null when it has no local engine. */
export function localQualityFor(
  code: TranscriptionLanguageCode,
  model: LocalModelId,
): Quality | null {
  const local = findTranscriptionLanguage(code)?.local;
  return local ? qualityFromWer(local[model].werPercent) : null;
}

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
  const language = findTranscriptionLanguage(code);
  return language?.local === null && language.cloud !== null;
}

/** No engine, local or cloud, transcribes it usably yet: announced as coming, never hidden. */
export function isNotYetAvailable(code: TranscriptionLanguageCode): boolean {
  const language = findTranscriptionLanguage(code);
  return language?.local === null && language.cloud === null;
}
