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
   * `whisper-paper`: OpenAI's FLEURS table per model size (arXiv 2212.04356, appendix D),
   * read speech, so better than a conversation. `tolitoli`: our measurement on 30 min of real
   * conversation (CLAUDE.md), recorded in docs/DECISIONS.md.
   */
  source: 'whisper-paper' | 'tolitoli';
};

export type TranscriptionLanguage = {
  code: TranscriptionLanguageCode;
  /** Written in the language itself; shown as data, not translated. */
  nativeName: string;
  /** On-device Whisper, per model; null when there is no local engine (cloud required). */
  local: Record<LocalModelId, LocalEstimate> | null;
};

/** WER below which a transcript is called good, then medium; draft above (to be validated). */
export const QUALITY_THRESHOLDS = { good: 15, medium: 30 } as const;

const paper = (tiny: number | null, base: number | null): Record<LocalModelId, LocalEstimate> => ({
  tiny: { werPercent: tiny, source: 'whisper-paper' },
  base: { werPercent: base, source: 'whisper-paper' },
});

export const TRANSCRIPTION_LANGUAGES: readonly TranscriptionLanguage[] = [
  // FLEURS, tiny then base (XNNPACK fp32 exports of the same weights). None measured by us yet.
  { code: 'fr', nativeName: 'Français', local: paper(41.4, 28.5) },
  { code: 'en', nativeName: 'English', local: paper(12.4, 8.9) },
  { code: 'de', nativeName: 'Deutsch', local: paper(27.8, 17.9) },
  { code: 'ru', nativeName: 'Русский', local: paper(31.1, 20.5) },
  { code: 'zh', nativeName: '中文', local: paper(40.5, 34.1) },
  { code: 'ar', nativeName: 'العربية', local: paper(63.4, 48.8) },
  // The spec's "about 34 %" for Swahili is a large model's figure: tiny and base are near 100 %.
  { code: 'sw', nativeName: 'Kiswahili', local: paper(100.9, 92.5) },
  { code: 'ha', nativeName: 'Hausa', local: paper(100.2, 98.6) },
  { code: 'yo', nativeName: 'Yorùbá', local: paper(106.4, 101.8) },
  { code: 'ln', nativeName: 'Lingála', local: paper(105.4, 96.7) },
  // Not in OpenAI's FLEURS tables: no figure at all.
  { code: 'mg', nativeName: 'Malagasy', local: paper(null, null) },
  // No local engine: without the cloud the app says so and offers to turn it on.
  { code: 'ig', nativeName: 'Igbo', local: null },
  { code: 'pcm', nativeName: 'Naijá', local: null },
  { code: 'zu', nativeName: 'isiZulu', local: null },
  { code: 'lg', nativeName: 'Luganda', local: null },
  { code: 'wo', nativeName: 'Wolof', local: null },
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
  return findTranscriptionLanguage(code)?.local === null;
}
