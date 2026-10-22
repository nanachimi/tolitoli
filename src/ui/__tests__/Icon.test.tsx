import { screen } from '@testing-library/react-native';
import { I18nManager, StyleSheet } from 'react-native';

import { renderScreen } from '../../../__tests__/screens/renderScreen';
import { Icon } from '@/ui';

function transformOf(testID: string) {
  return StyleSheet.flatten(screen.getByTestId(testID, { includeHiddenElements: true }).props.style)
    ?.transform;
}

describe('Icon', () => {
  it('is hidden from screen readers by default (a label goes with it)', async () => {
    await renderScreen(<Icon name="mic" />);
    const icon = screen.getByTestId('icon-mic', { includeHiddenElements: true });
    expect(icon.props.accessibilityElementsHidden).toBe(true);
    expect(icon.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('carries its own label when it stands alone', async () => {
    await renderScreen(<Icon name="x" decorative={false} accessibilityLabel="Fermer" />);
    expect(screen.getByRole('image', { name: 'Fermer' })).toBeOnTheScreen();
  });

  it('does not mirror anything in left-to-right', async () => {
    await renderScreen(<Icon name="chevron-right" />);
    expect(transformOf('icon-chevron-right')).toBeUndefined();
  });

  describe('in right-to-left (Arabic)', () => {
    beforeEach(() => {
      jest.replaceProperty(I18nManager, 'isRTL', true);
    });

    it.each(['chevron-right', 'chevron-left'] as const)('mirrors %s', async (name) => {
      await renderScreen(<Icon name={name} />);
      expect(transformOf(`icon-${name}`)).toEqual([{ scaleX: -1 }]);
    });

    it.each(['mic', 'phone-off', 'check', 'settings'] as const)(
      'keeps %s as drawn',
      async (name) => {
        await renderScreen(<Icon name={name} />);
        expect(transformOf(`icon-${name}`)).toBeUndefined();
      },
    );
  });
});
