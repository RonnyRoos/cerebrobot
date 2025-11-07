/**
 * Theme Provider Component
 *
 * Purpose: React Context for theme management with localStorage persistence
 * Usage: Wrap app in <Theme> component, use useTheme() hook in components
 *
 * Spec: /specs/013-neon-flux-design-system/spec.md (FR-020, FR-023)
 * Contract: /specs/013-neon-flux-design-system/contracts/theme-api.md
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ThemeName, ThemeContext as ThemeContextType } from './types';

/* ========================================
   Constants
   ======================================== */

const THEME_STORAGE_KEY = 'cerebro-theme';
const SYSTEM_THEME_STORAGE_KEY = 'cerebro-use-system-theme';
const DEFAULT_THEME: ThemeName = 'dark';

/* ========================================
   Theme Context
   ======================================== */

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/* ========================================
   Theme Provider Component
   ======================================== */

export interface ThemeProps {
  /** Child components */
  children: React.ReactNode;
  /** Default theme (overrides localStorage) */
  defaultTheme?: ThemeName;
  /** Whether to respect system theme preference by default */
  defaultUseSystemTheme?: boolean;
  /** Disable theme persistence (useful for testing) */
  disablePersistence?: boolean;
}

export function Theme({
  children,
  defaultTheme = DEFAULT_THEME,
  defaultUseSystemTheme = false,
  disablePersistence = false,
}: ThemeProps) {
  const [theme, setThemeState] = useState<ThemeName>(defaultTheme);
  const [useSystemTheme, setUseSystemTheme] = useState(defaultUseSystemTheme);
  const [mounted, setMounted] = useState(false);

  /* ========================================
     Initialize theme from localStorage
     ======================================== */

  useEffect(() => {
    if (disablePersistence) {
      setMounted(true);
      return;
    }

    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName | null;
    const savedUseSystemTheme = localStorage.getItem(SYSTEM_THEME_STORAGE_KEY) === 'true';

    if (savedUseSystemTheme) {
      setUseSystemTheme(true);
      const systemTheme = getSystemTheme();
      setThemeState(systemTheme);
    } else if (savedTheme) {
      setThemeState(savedTheme);
    }

    setMounted(true);
  }, [disablePersistence]);

  /* ========================================
     Apply theme to DOM
     ======================================== */

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Add theme-switching class to prevent transitions during theme change
    root.classList.add('theme-switching');

    // Remove all theme classes
    root.classList.remove('theme-dark', 'theme-light', 'theme-high-contrast', 'dark');

    // Add new theme class
    root.classList.add(`theme-${theme}`);

    // Add .dark class for backward compatibility with existing components
    // (both 'dark' and 'high-contrast' themes use dark backgrounds)
    if (theme === 'dark' || theme === 'high-contrast') {
      root.classList.add('dark');
    }

    // Remove theme-switching class after a short delay
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove('theme-switching');
      });
    });

    // Persist to localStorage
    if (!disablePersistence) {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme, mounted, disablePersistence]);

  /* ========================================
     Listen to system theme changes
     ======================================== */

  useEffect(() => {
    if (!useSystemTheme || !mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const systemTheme = e.matches ? 'dark' : 'light';
      setThemeState(systemTheme);
    };

    // Initial check
    handleChange(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [useSystemTheme, mounted]);

  /* ========================================
     Theme setters
     ======================================== */

  const setTheme = (newTheme: ThemeName) => {
    setUseSystemTheme(false);
    setThemeState(newTheme);

    if (!disablePersistence) {
      localStorage.setItem(SYSTEM_THEME_STORAGE_KEY, 'false');
    }
  };

  const toggleSystemTheme = () => {
    const newUseSystemTheme = !useSystemTheme;
    setUseSystemTheme(newUseSystemTheme);

    if (newUseSystemTheme) {
      const systemTheme = getSystemTheme();
      setThemeState(systemTheme);
    }

    if (!disablePersistence) {
      localStorage.setItem(SYSTEM_THEME_STORAGE_KEY, String(newUseSystemTheme));
    }
  };

  /* ========================================
     Context value
     ======================================== */

  const value: ThemeContextType = {
    theme,
    setTheme,
    useSystemTheme,
    toggleSystemTheme,
  };

  // Prevent SSR flash by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/* ========================================
   useTheme Hook
   ======================================== */

/**
 * Hook to access theme context
 * @throws Error if used outside Theme provider
 * @returns Theme context value
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { theme, setTheme } = useTheme();
 *
 *   return (
 *     <button onClick={() => setTheme('light')}>
 *       Current theme: {theme}
 *     </button>
 *   );
 * }
 * ```
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a <Theme> provider');
  }

  return context;
}

/* ========================================
   Helper Functions
   ======================================== */

/**
 * Get system theme preference
 * @returns 'dark' or 'light' based on prefers-color-scheme media query
 */
function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return isDark ? 'dark' : 'light';
}
