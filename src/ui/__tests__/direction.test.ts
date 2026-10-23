import { scriptDirection } from '../format/direction';

describe('scriptDirection', () => {
  it.each([
    ['Bonjour à tous', 'ltr'],
    ['صباح الخير، on commence la réunion ?', 'rtl'],
    ['Oui, on commence. عندي سؤال على الميزانية.', 'ltr'],
    ['12:30 — الميزانية جاهزة', 'rtl'],
    ['« Salut » dit-il', 'ltr'],
    ['שלום', 'rtl'],
    ['中文的会议', 'ltr'],
    ['Ñaata la ?', 'ltr'],
    ['Привет', 'ltr'],
  ] as const)('%s → %s, from the first strong character', (text, direction) => {
    expect(scriptDirection(text)).toBe(direction);
  });

  it.each(['', '   ', '12:30', '…', '😀 !'])('%j has no strong character', (text) => {
    expect(scriptDirection(text)).toBeNull();
  });
});
