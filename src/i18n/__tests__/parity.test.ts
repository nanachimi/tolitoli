import { UI_LANGUAGES } from '../languages';
import { sourceTranslation, translations } from '../resources';

type Tree = { [key: string]: string | Tree };

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string'
      ? { ...acc, [path]: value }
      : { ...acc, ...flatten(value, path) };
  }, {});
}

/** Groups plural forms (`count_one`, `count_other`…) under their base key. */
function byBaseKey(flat: Record<string, string>): Map<string, Map<string, string>> {
  const groups = new Map<string, Map<string, string>>();
  for (const [key, value] of Object.entries(flat)) {
    const suffix = PLURAL_SUFFIX.exec(key)?.[1] ?? '';
    const base = key.replace(PLURAL_SUFFIX, '');
    const group = groups.get(base) ?? new Map<string, string>();
    group.set(suffix, value);
    groups.set(base, group);
  }
  return groups;
}

function variables(value: string): string[] {
  return [...value.matchAll(/\{\{\s*([^}\s]+)\s*\}\}/g)].map((match) => match[1] ?? '');
}

const source = byBaseKey(flatten(sourceTranslation as Tree));

describe.each(UI_LANGUAGES.map((language) => language.code))('%s translation', (code) => {
  const target = byBaseKey(flatten(translations[code] as Tree));

  it('has exactly the keys of fr.json', () => {
    expect([...target.keys()].sort()).toEqual([...source.keys()].sort());
  });

  it('has no empty value', () => {
    for (const group of target.values()) {
      for (const value of group.values()) expect(value.trim()).not.toBe('');
    }
  });

  it('only uses variables defined in fr.json', () => {
    for (const [base, group] of target) {
      const allowed = new Set([...(source.get(base)?.values() ?? [])].flatMap(variables));
      for (const value of group.values()) {
        for (const variable of variables(value)) expect(allowed).toContain(variable);
      }
    }
  });

  it('provides every CLDR plural form of the language', () => {
    const categories = new Intl.PluralRules(code).resolvedOptions().pluralCategories;
    for (const [base, group] of target) {
      const isPlural = [...(source.get(base)?.keys() ?? [])].some((suffix) => suffix !== '');
      if (!isPlural) continue;
      expect([...group.keys()].sort()).toEqual([...categories].sort());
    }
  });
});
