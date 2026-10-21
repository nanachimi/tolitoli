type Resource = { [key: string]: string | Resource };

const ACCENTS: Record<string, string> = {
  a: 'á',
  e: 'é',
  i: 'í',
  o: 'ó',
  u: 'ú',
  y: 'ý',
  c: 'ç',
  n: 'ñ',
  A: 'Á',
  E: 'É',
  I: 'Í',
  O: 'Ó',
  U: 'Ú',
  Y: 'Ý',
  C: 'Ç',
  N: 'Ñ',
};

export const PSEUDO_OPEN = '⟦';
export const PSEUDO_CLOSE = '⟧';

/** German runs about 30 % longer than French; pad a bit more to be safe. */
const EXPANSION = 0.35;

const INTERPOLATION = /(\{\{[^}]+\}\})/;

export function pseudoLocalizeString(value: string): string {
  const accented = value
    .split(INTERPOLATION)
    .map((part) =>
      INTERPOLATION.test(part) ? part : part.replace(/[a-zA-Z]/g, (char) => ACCENTS[char] ?? char),
    )
    .join('');
  const padding = '~'.repeat(Math.ceil(value.length * EXPANSION));
  return `${PSEUDO_OPEN}${accented}${padding}${PSEUDO_CLOSE}`;
}

export function pseudoLocalize<T extends Resource>(resource: T): T {
  const result: Resource = {};
  for (const [key, value] of Object.entries(resource)) {
    result[key] = typeof value === 'string' ? pseudoLocalizeString(value) : pseudoLocalize(value);
  }
  return result as T;
}
