/**
 * Theme (light/dark) — persisted per logged-in user (AsyncStorage)
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
import lightColors from '../theme/colors';
import darkColors from '../theme/colorsDark';
import { useAuth } from './AuthContext';

function themeStorageKey(userId) {
  if (!userId) return null;
  return `@people_app_dark_mode_user_${String(userId)}`;
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?._id || user?.id || null;

  const [isDark, setIsDark] = useState(false);
  const [ready, setReady] = useState(false);

  // Load preference after auth is known so each account has its own dark mode
  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    (async () => {
      try {
        if (!userId) {
          if (!cancelled) {
            setIsDark(false);
            setReady(true);
          }
          return;
        }

        const key = themeStorageKey(userId);
        const v = await AsyncStorage.getItem(key);
        if (cancelled) return;

        if (v === 'true') setIsDark(true);
        else if (v === 'false') setIsDark(false);
        else setIsDark(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, authLoading]);

  const setDarkMode = useCallback(async (value) => {
    const next = !!value;
    setIsDark(next);
    if (!userId) {
      try {
        await AsyncStorage.setItem('@people_app_dark_mode_guest', next ? 'true' : 'false');
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      await AsyncStorage.setItem(themeStorageKey(userId), next ? 'true' : 'false');
    } catch {
      /* ignore */
    }
  }, [userId]);

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  const value = useMemo(
    () => ({
      isDark,
      colors,
      setDarkMode,
      themeReady: ready,
    }),
    [isDark, colors, ready, setDarkMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      isDark: false,
      colors: lightColors,
      setDarkMode: async () => {},
      themeReady: true,
    };
  }
  return ctx;
}
