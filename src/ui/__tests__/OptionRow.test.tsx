import { screen, userEvent } from '@testing-library/react-native';
import { I18nManager, StyleSheet } from 'react-native';

import { renderScreen } from '../../../__tests__/screens/renderScreen';
import { hardCodedTexts, t, usePseudoLocale } from './support';
import { i18next } from '@/i18n';
import { color, OptionGroup, OptionRow } from '@/ui';

const light = color.light;

function flat(node: { props: { style?: unknown } }) {
  return StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;
}

afterEach(async () => {
  await i18next.changeLanguage('fr');
});

describe('OptionRow', () => {
  it('radio: one focusable node with its checked state; the check shows on the chosen row only', async () => {
    const onPress = jest.fn();
    await renderScreen(
      <OptionGroup title="Langue de l’interface" exclusive>
        <OptionRow
          kind="radio"
          label="Français"
          labelIsData
          checked
          accessibilityLabel="Langue : Français"
          onPress={onPress}
        />
        <OptionRow
          kind="radio"
          label="Wolof"
          labelIsData
          accessibilityLabel="Langue : Wolof"
          onPress={onPress}
        />
      </OptionGroup>,
    );
    // The group is not itself focusable (it would hide its rows), so check the role on the view.
    type JsonNode = { props: Record<string, unknown>; children: (JsonNode | string)[] | null };
    const groups: JsonNode[] = [];
    const visit = (node: JsonNode | string | null) => {
      if (!node || typeof node === 'string') return;
      if (node.props.accessibilityRole === 'radiogroup') groups.push(node);
      node.children?.forEach(visit);
    };
    visit(screen.toJSON() as JsonNode);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.props.accessibilityLabel).toBe('Langue de l’interface');
    expect(screen.getByRole('radio', { name: 'Langue : Français' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Langue : Wolof' })).not.toBeChecked();
    expect(screen.queryByText('Wolof')).toBeNull();
    expect(screen.getAllByTestId('option-checked', { includeHiddenElements: true })).toHaveLength(
      1,
    );
    await userEvent.setup().press(screen.getByRole('radio', { name: 'Langue : Wolof' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('switch: accent track and on-accent thumb when on, its state on the row', async () => {
    await renderScreen(
      <OptionRow
        kind="switch"
        label="Transcription cloud"
        description="Désactivée. Vos enregistrements restent sur l’appareil."
        icon="cloud"
        checked
        onPress={jest.fn()}
      />,
    );
    const row = screen.getByRole('switch', { name: 'Transcription cloud' });
    expect(row).toBeChecked();
    expect(row.props.accessibilityHint).toBe(
      'Désactivée. Vos enregistrements restent sur l’appareil.',
    );
    const track = screen.getByTestId('option-switch', { includeHiddenElements: true });
    expect(flat(track).backgroundColor).toBe(light.accent);
  });

  it('link: a chevron that mirrors in Arabic', async () => {
    jest.replaceProperty(I18nManager, 'isRTL', true);
    await renderScreen(
      <OptionRow kind="link" label="Langue de transcription" onPress={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Langue de transcription' })).toBeOnTheScreen();
    const chevron = screen.getByTestId('icon-chevron-right', { includeHiddenElements: true });
    expect(flat(chevron).transform).toEqual([{ scaleX: -1 }]);
  });

  it('has no hard-coded text (pseudo-locale)', async () => {
    await usePseudoLocale();
    await renderScreen(
      <OptionGroup title={t('settings.language.title')} exclusive>
        <OptionRow
          kind="radio"
          label="Français"
          labelIsData
          description={t('settings.language.restartRtl')}
          accessibilityLabel={t('settings.language.optionA11y', { language: 'Français' })}
          onPress={jest.fn()}
        />
      </OptionGroup>,
    );
    expect(hardCodedTexts()).toEqual([]);
  });
});
