import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { renderScreen } from '../../../__tests__/screens/renderScreen';
import { i18next } from '@/i18n';
import { AppText, color, RUBIK_BY_WEIGHT } from '@/ui';

function styleOf(text: string) {
  return StyleSheet.flatten(screen.getByText(text).props.style);
}

describe('AppText', () => {
  afterEach(async () => {
    await i18next.changeLanguage('fr');
  });

  it('sets titles in Rubik, without a synthetic weight', async () => {
    await renderScreen(<AppText variant="title">Titre</AppText>);
    expect(styleOf('Titre')).toMatchObject({ fontFamily: RUBIK_BY_WEIGHT[600], fontSize: 24 });
    expect(styleOf('Titre').fontWeight).toBeUndefined();
  });

  it('sets body text in the system font, in ink by default', async () => {
    await renderScreen(<AppText>Texte</AppText>);
    expect(styleOf('Texte').fontFamily).toBeUndefined();
    expect(styleOf('Texte').color).toBe(color.light.ink);
  });

  it('uses the colour token it is given', async () => {
    await renderScreen(<AppText color="ink-muted">Date</AppText>);
    expect(styleOf('Date').color).toBe(color.light['ink-muted']);
  });

  it('keeps tabular digits on the timer', async () => {
    await renderScreen(<AppText variant="timer">00:42:17</AppText>);
    expect(styleOf('00:42:17').fontVariant).toEqual(['tabular-nums']);
  });

  it.each([
    ['fr', 'uppercase'],
    ['wo', 'uppercase'],
    ['ru', undefined],
    ['ar', undefined],
    ['zh-Hans', undefined],
  ])('sets overline in capitals only for Latin script (%s)', async (language, transform) => {
    await i18next.changeLanguage(language);
    await renderScreen(<AppText variant="overline">Aujourd’hui</AppText>);
    expect(styleOf('Aujourd’hui').textTransform).toBe(transform);
  });
});
