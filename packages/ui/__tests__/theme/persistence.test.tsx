/**
 * Theme Persistence Tests (T052)
 *
 * Purpose: Validate localStorage save/load functionality for theme preferences
 * User Story: US3 - Theme Switching (Priority P2)
 *
 * Test Coverage:
 * - Save theme to localStorage
 * - Load theme from localStorage
 * - Persist system theme preference
 * - Schema versioning (future-proofing)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Theme, useTheme } from '../../src/theme/theme-provider';

const THEME_STORAGE_KEY = 'cerebro-theme';
const SYSTEM_THEME_STORAGE_KEY = 'cerebro-use-system-theme';

/**
 * Test component for persistence testing
 */
function PersistenceTestComponent() {
  const { theme, setTheme, toggleSystemTheme } = useTheme();

  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme('light')} data-testid="set-light">
        Light
      </button>
      <button onClick={() => setTheme('dark')} data-testid="set-dark">
        Dark
      </button>
      <button onClick={() => setTheme('high-contrast')} data-testid="set-high-contrast">
        High Contrast
      </button>
      <button onClick={toggleSystemTheme} data-testid="toggle-system">
        Toggle System
      </button>
    </div>
  );
}

describe('Theme Persistence', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Reset DOM classes
    document.documentElement.className = '';

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Save to localStorage', () => {
    it('should save theme to localStorage when theme changes', async () => {
      const userEvent = (await import('@testing-library/user-event')).default;

      render(
        <Theme>
          <PersistenceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('set-light'));

      await waitFor(() => {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        expect(savedTheme).toBe('light');
      });
    });

    it('should save dark theme to localStorage', async () => {
      const userEvent = (await import('@testing-library/user-event')).default;

      render(
        <Theme defaultTheme="light">
          <PersistenceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('set-dark'));

      await waitFor(() => {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        expect(savedTheme).toBe('dark');
      });
    });

    it('should save high-contrast theme to localStorage', async () => {
      const userEvent = (await import('@testing-library/user-event')).default;

      render(
        <Theme>
          <PersistenceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('set-high-contrast'));

      await waitFor(() => {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        expect(savedTheme).toBe('high-contrast');
      });
    });

    it('should save system theme preference to localStorage', async () => {
      const userEvent = (await import('@testing-library/user-event')).default;

      render(
        <Theme>
          <PersistenceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('toggle-system'));

      await waitFor(() => {
        const savedUseSystemTheme = localStorage.getItem(SYSTEM_THEME_STORAGE_KEY);
        expect(savedUseSystemTheme).toBe('true');
      });
    });

    it('should disable system theme when manually setting theme', async () => {
      const userEvent = (await import('@testing-library/user-event')).default;

      render(
        <Theme defaultUseSystemTheme>
          <PersistenceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('set-light'));

      await waitFor(() => {
        const savedUseSystemTheme = localStorage.getItem(SYSTEM_THEME_STORAGE_KEY);
        expect(savedUseSystemTheme).toBe('false');
      });
    });
  });

  describe('Load from localStorage', () => {
    it('should load saved theme from localStorage on mount', async () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'light');

      render(
        <Theme>
          <PersistenceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('light');
        expect(document.documentElement.classList.contains('theme-light')).toBe(true);
      });
    });

    it('should load dark theme from localStorage', async () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');

      render(
        <Theme>
          <PersistenceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
        expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
      });
    });

    it('should load high-contrast theme from localStorage', async () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'high-contrast');

      render(
        <Theme>
          <PersistenceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('high-contrast');
        expect(document.documentElement.classList.contains('theme-high-contrast')).toBe(true);
      });
    });

    it('should load system theme preference from localStorage', async () => {
      localStorage.setItem(SYSTEM_THEME_STORAGE_KEY, 'true');

      render(
        <Theme>
          <PersistenceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        // Should respect system theme (dark from our mock)
        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      });
    });

    it('should prioritize system theme over saved theme when useSystemTheme is true', async () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
      localStorage.setItem(SYSTEM_THEME_STORAGE_KEY, 'true');

      // Mock system preference as dark
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(
        <Theme>
          <PersistenceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        // Should use system theme (dark), not saved theme (light)
        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      });
    });

    it('should use defaultTheme when localStorage is empty', async () => {
      render(
        <Theme defaultTheme="light">
          <PersistenceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('light');
      });
    });
  });

  describe('Disable Persistence', () => {
    it('should not save to localStorage when disablePersistence is true', async () => {
      const userEvent = (await import('@testing-library/user-event')).default;

      render(
        <Theme disablePersistence>
          <PersistenceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('set-light'));

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('light');
      });

      // localStorage should remain empty
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    });

    it('should not load from localStorage when disablePersistence is true', async () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'light');

      render(
        <Theme defaultTheme="dark" disablePersistence>
          <PersistenceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        // Should use defaultTheme, not localStorage value
        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      });
    });
  });

  describe('Cross-Session Consistency', () => {
    it('should maintain theme across component remounts', async () => {
      const userEvent = (await import('@testing-library/user-event')).default;

      // First mount: set theme to light
      const { unmount } = render(
        <Theme>
          <PersistenceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId('set-light'));

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('light');
      });

      unmount();

      // Second mount: theme should persist
      render(
        <Theme>
          <PersistenceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('light');
      });
    });
  });
});
