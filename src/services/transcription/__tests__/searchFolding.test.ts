import { foldForSearch, hasIdeographs, SEARCH_FOLDS } from '../searchFolding';

describe('foldForSearch', () => {
  it.each([
    ['Réunion fournisseur', 'reunion fournisseur'],
    ['L’ÉLÉPHANT', "l'elephant"],
    // Wolof: ñ decomposes, ŋ is a letter of its own.
    ['Ñaata la ? Ŋangu na.', 'naata la ? nangu na.'],
    // Lingala: tones are combining marks, ɛ and ɔ are letters.
    ['Mbɔ́tɛ na bino', 'mbote na bino'],
    // Hausa hooked letters.
    ['Ɓaƙi ɗaya ƴan', 'baki daya yan'],
    ['Kiswahili: habari za asubuhi', 'kiswahili: habari za asubuhi'],
    ['Привет, Ёжик', 'привет, ежик'],
    ['今天我们开会讨论预算', '今天我们开会讨论预算'],
    // Arabic-Indic and Eastern Arabic-Indic (Persian) digits become Latin ones.
    ['٢٣/١٠/٢٠٢٦', '23/10/2026'],
    ['۲۳ ۱۰', '23 10'],
    // The direction marks of an Arabic date go, so the date stays one word.
    ['٢٣\u200f/١٠\u200f/٢٠٢٦', '23/10/2026'],
  ])('%s → %s', (text, folded) => {
    expect(foldForSearch(text)).toBe(folded);
  });

  it('folds every letter of its table, upper case included', () => {
    for (const [letter, target] of Object.entries(SEARCH_FOLDS)) {
      expect(foldForSearch(letter)).toBe(target);
      expect(foldForSearch(letter.toUpperCase())).toBe(target);
    }
  });

  it('is idempotent, so the index and the query always agree', () => {
    const once = foldForSearch('Mbɔ́tɛ, Ñaata, L’Éléphant');
    expect(foldForSearch(once)).toBe(once);
  });
});

describe('hasIdeographs', () => {
  it.each([
    ['讨论', true],
    ['budget 预算', true],
    ['mbote', false],
    ['привет', false],
    ['العربية', false],
  ])('%s → %s', (text, expected) => {
    expect(hasIdeographs(text)).toBe(expected);
  });
});
