/**
 * ThemeContext — global theme state + persistence
 *
 * Wraps the entire app so every screen / component can call `useAppTheme()`
 * to receive the current `Theme` object and a `setThemeName()` setter.
 *
 * The chosen theme name is persisted to AsyncStorage so it survives app
 * restarts.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createTheme,
  obsidianTheme,
  type Theme,
  type ThemeName,
} from './theme';

// ─── Storage key ─────────────────────────────────────────────────────────────

const THEME_STORAGE_KEY = '@tradingapp_theme';

// ─── Context shape ───────────────────────────────────────────────────────────

interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: obsidianTheme,
  themeName: 'obsidian',
  setThemeName: () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────────

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [themeName, setThemeNameState] = useState<ThemeName>('obsidian');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted theme on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (
          stored === 'obsidian' ||
          stored === 'ivory' ||
          stored === 'midnight'
        ) {
          setThemeNameState(stored);
        }
      } catch {
        // Silently fall back to default
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const setThemeName = useCallback((name: ThemeName) => {
    setThemeNameState(name);
    AsyncStorage.setItem(THEME_STORAGE_KEY, name).catch(() => {});
  }, []);

  const theme = useMemo(() => createTheme(themeName), [themeName]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, themeName, setThemeName }),
    [theme, themeName, setThemeName],
  );

  // Don't render children until we've read the stored theme to prevent a
  // flash of the default theme.
  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

// ─── Hook ────────────────────────────────────────────────────────────────────

/** Returns the current theme object + setter. Use everywhere. */
export const useAppTheme = (): ThemeContextValue => useContext(ThemeContext);
