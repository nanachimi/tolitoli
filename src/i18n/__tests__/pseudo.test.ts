import { pseudoLocalize, pseudoLocalizeString, PSEUDO_CLOSE, PSEUDO_OPEN } from '../pseudo';

describe('pseudoLocalize', () => {
  it('wraps, accents and lengthens strings', () => {
    const source = 'Aucun enregistrement';
    const result = pseudoLocalizeString(source);
    expect(result.startsWith(PSEUDO_OPEN)).toBe(true);
    expect(result.endsWith(PSEUDO_CLOSE)).toBe(true);
    expect(result).toContain('Áúçúñ');
    expect(result.length - 2).toBeGreaterThanOrEqual(Math.ceil(source.length * 1.3));
  });

  it('keeps interpolation variables intact', () => {
    expect(pseudoLocalizeString('{{count}} enregistrements')).toContain('{{count}}');
  });

  it('walks nested resources', () => {
    const result = pseudoLocalize({ a: { b: 'x' }, c: 'y' });
    expect(result.a.b).toBe(pseudoLocalizeString('x'));
    expect(result.c).toBe(pseudoLocalizeString('y'));
  });
});
