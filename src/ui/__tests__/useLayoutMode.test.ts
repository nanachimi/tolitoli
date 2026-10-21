import { getLayoutMode } from '../layout/useLayoutMode';

describe('getLayoutMode', () => {
  it.each([
    [390, 844, 'single'],
    [844, 390, 'single'],
    [1024, 768, 'tablet-split'],
    [768, 1024, 'single'],
    [1366, 1024, 'tablet-split'],
    [932, 430, 'single'],
    [1133, 744, 'tablet-split'],
  ])('%i×%i gives %s', (width, height, expected) => {
    expect(getLayoutMode(width, height)).toBe(expected);
  });
});
