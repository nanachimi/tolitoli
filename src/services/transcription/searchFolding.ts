/**
 * Search folding, next to the language table it serves (owner, step 2 plan). A user types
 * "mbote" on an ordinary keyboard, not "mbɔ́tɛ": the indexed text and the query both go
 * through foldForSearch, while the displayed text stays as the engine returned it.
 */

/** Letters of the transcription languages that have no decomposition to strip. */
export const SEARCH_FOLDS: Readonly<Record<string, string>> = {
  // Lingala, also Wolof and Yoruba orthographies.
  ɛ: 'e',
  ɔ: 'o',
  // Wolof, Igbo (ŋ), Hausa hooked letters (ɓ, ɗ, ƙ, ƴ).
  ŋ: 'n',
  ɓ: 'b',
  ɗ: 'd',
  ƙ: 'k',
  ƴ: 'y',
  // Apostrophes: "l’éléphant" and "l'elephant" are the same word.
  '’': "'",
  ʼ: "'",
  // Arabic-Indic and Eastern Arabic-Indic digits: "٢٣" and "23" find each other.
  ...Object.fromEntries(
    [...'٠١٢٣٤٥٦٧٨٩'].flatMap((digit, value) => [
      [digit, String(value)],
      [String.fromCharCode(0x06f0 + value), String(value)],
    ]),
  ),
};

const FOLD_PATTERN = new RegExp(`[${Object.keys(SEARCH_FOLDS).join('')}]`, 'g');

/** Direction marks Intl puts in Arabic dates ("٢٣‏/١٠‏/٢٠٢٦"): invisible, they would split words. */
const BIDI_MARKS = /[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/g;

export function foldForSearch(text: string): string {
  return text
    .replace(BIDI_MARKS, '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(FOLD_PATTERN, (letter) => SEARCH_FOLDS[letter] ?? letter);
}

/**
 * Chinese has no spaces between words, so the FTS tokenizer makes one token of a whole
 * sentence; queries with ideographs use a substring match instead (D-036).
 */
export function hasIdeographs(text: string): boolean {
  return /[㐀-䶿一-鿿豈-﫿]/.test(text);
}
