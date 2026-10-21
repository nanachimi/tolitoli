import { screen } from '@testing-library/react-native';

import LibraryScreen from '../../app/(tabs)/index';
import SettingsScreen from '../../app/(tabs)/settings';
import { i18next } from '@/i18n';
import { PSEUDO_LANGUAGE } from '@/i18n/languages';
import { PSEUDO_OPEN } from '@/i18n/pseudo';

import { renderScreen } from './renderScreen';

type Node = { props: Record<string, unknown>; parent: Node | null; children: unknown[] };

/** Data (language names, diagnostics) is marked with testID="i18n-data". */
function isData(node: Node | null): boolean {
  for (let current = node; current; current = current.parent) {
    if (current.props.testID === 'i18n-data') return true;
  }
  return false;
}

function textOf(node: Node): string {
  return node.children.map((child) => (typeof child === 'string' ? child : '')).join('');
}

describe.each([
  ['Library', LibraryScreen],
  ['Settings', SettingsScreen],
])('%s screen under pseudo-localization', (_name, Component) => {
  beforeEach(async () => {
    await i18next.changeLanguage(PSEUDO_LANGUAGE);
  });

  it('renders no hard-coded string', async () => {
    await renderScreen(<Component />);
    const texts = screen.getAllByText(/[\s\S]+/) as unknown as Node[];
    const hardCoded = texts.filter((node) => !isData(node) && !textOf(node).includes(PSEUDO_OPEN));
    expect(hardCoded.map(textOf)).toEqual([]);
  });
});
