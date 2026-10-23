import { screen } from '@testing-library/react-native';

import { i18next } from '@/i18n';
import { PSEUDO_LANGUAGE } from '@/i18n/languages';
import { PSEUDO_OPEN } from '@/i18n/pseudo';

type Node = { props: Record<string, unknown>; parent: Node | null; children: unknown[] };

/** Data (numbers, language names) is marked with testID="i18n-data". */
function isData(node: Node | null): boolean {
  for (let current = node; current; current = current.parent) {
    if (current.props.testID === 'i18n-data') return true;
  }
  return false;
}

function textOf(node: Node): string {
  return node.children.map((child) => (typeof child === 'string' ? child : '')).join('');
}

/** Every visible or screen-reader text that did not go through i18n, under the pseudo-locale. */
export function hardCodedTexts(): string[] {
  const texts = screen.queryAllByText(/[\s\S]+/, {
    includeHiddenElements: true,
  }) as unknown as Node[];
  return texts.filter((node) => !isData(node) && !textOf(node).includes(PSEUDO_OPEN)).map(textOf);
}

export async function usePseudoLocale() {
  await i18next.changeLanguage(PSEUDO_LANGUAGE);
}

export const t = i18next.t;

declare global {
  /** Runs the screens' focus effects again, as when a screen comes back (jest.setup.ts). */
  function refocus(): void;
}
