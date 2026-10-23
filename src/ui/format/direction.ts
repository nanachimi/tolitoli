export type ScriptDirection = 'ltr' | 'rtl';

/** Hebrew, Arabic, Syriac, Thaana, N'Ko and their presentation forms. */
function isRtlChar(code: number): boolean {
  return (
    (code >= 0x0590 && code <= 0x08ff) ||
    (code >= 0xfb1d && code <= 0xfdff) ||
    (code >= 0xfe70 && code <= 0xfeff)
  );
}

/** Digits, punctuation, spaces, symbols, combining marks and emoji: they follow the text around them. */
function isNeutral(code: number): boolean {
  return (
    code < 0x41 ||
    (code >= 0x5b && code <= 0x60) ||
    (code >= 0x7b && code <= 0xbf) ||
    code === 0xd7 ||
    code === 0xf7 ||
    (code >= 0x02b9 && code <= 0x036f) ||
    (code >= 0x2000 && code <= 0x2bff) ||
    (code >= 0x3000 && code <= 0x303f) ||
    (code >= 0xd800 && code <= 0xdfff) ||
    (code >= 0xfe00 && code <= 0xfe0f) ||
    (code >= 0xff00 && code <= 0xff20)
  );
}

/**
 * Direction of a text from its first strong character (Unicode's first-strong rule),
 * or null when it has none (digits, punctuation). A transcript mixes languages, so each
 * segment is aligned on its own script, not on the interface's (D-032).
 */
export function scriptDirection(text: string): ScriptDirection | null {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (isRtlChar(code)) return 'rtl';
    if (!isNeutral(code)) return 'ltr';
  }
  return null;
}
