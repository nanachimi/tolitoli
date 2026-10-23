import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { AccessibilityInfo, type HostInstance } from 'react-native';

/**
 * Gives the screen-reader focus back to the row that opened a sub-screen, once the
 * screen is shown again (guide OptionRow). Call the returned function with the row
 * when it opens its sub-screen.
 */
export function useReturnFocus(): (row: HostInstance | null) => void {
  const opened = useRef<HostInstance | null>(null);
  useFocusEffect(
    useCallback(() => {
      const row = opened.current;
      if (!row) return;
      opened.current = null;
      AccessibilityInfo.sendAccessibilityEvent(row, 'focus');
    }, []),
  );
  return useCallback((row: HostInstance | null) => {
    opened.current = row;
  }, []);
}
