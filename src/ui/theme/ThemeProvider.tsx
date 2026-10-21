import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { getTheme, type Theme } from './tokens';

const ThemeContext = createContext<Theme>(getTheme('light'));

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return <ThemeContext.Provider value={getTheme(scheme)}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
