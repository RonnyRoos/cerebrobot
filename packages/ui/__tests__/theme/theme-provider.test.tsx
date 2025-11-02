/**
 * Theme Provider Component Tests (T050)
 *
 * Purpose: Validate Theme component applies correct CSS classes and context values
 * User Story: US3 - Theme Switching (Priority P2)
 *
 * Test Coverage:
 * - Appearance prop (dark, light, high-contrast)
 * - CSS className application (.theme-dark, .theme-light, .theme-high-contrast)
 * - Backward compatibility (.dark class)
 * - Theme context value propagation
 * - System theme detection
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Theme, useTheme } from '../../src/theme/theme-provider';

/**
 * Test component that consumes theme context
 */
function ThemeConsumer() {
  const { theme, setTheme, useSystemTheme, toggleSystemTheme } = useTheme();

  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="use-system-theme">{String(useSystemTheme)}</span>
      <button onClick={() => setTheme('dark')} data-testid="set-dark">
        Dark
      </button>
      <button onClick={() => setTheme('light')} data-testid="set-light">
        Light
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

describe('Theme Provider Component', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Reset DOM classes
    document.documentElement.className = '';

    // Mock matchMedia for system theme detection
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
    vi.restoreAllMocks();
  });

  describe('Default Theme', () => {
    it('should default to dark theme', async () => {
      render(
        <Theme disablePersistence>
          <ThemeConsumer />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      });
    });

    it('should apply .theme-dark class to document root', async () => {
      render(
        <Theme disablePersistence>
          <ThemeConsumer />
        </Theme>,
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
      });
    });

    it('should apply .dark class for backward compatibility', async () => {
      render(
        <Theme disablePersistence>
          <ThemeConsumer />
        </Theme>,
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });
  });

  describe('Theme Prop', () => {
    it('should accept defaultTheme prop', async () => {
      render(
        <Theme defaultTheme="light" disablePersistence>
          <ThemeConsumer />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      });
    });

    it('should apply .theme-light class when defaultTheme is light', async () => {
      render(
        <Theme defaultTheme="light" disablePersistence>
          <ThemeConsumer />
        </Theme>,
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('theme-light')).toBe(true);
        expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });
    });

    it('should apply .theme-high-contrast class when defaultTheme is high-contrast', async () => {
      render(
        <Theme defaultTheme="high-contrast" disablePersistence>
          <ThemeConsumer />
        </Theme>,
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('theme-high-contrast')).toBe(true);
        expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
      });
    });
  });

  describe('Theme Context', () => {
    it('should provide theme context to children', async () => {
      render(
        <Theme disablePersistence>
          <ThemeConsumer />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toBeInTheDocument();
        expect(screen.getByTestId('use-system-theme')).toBeInTheDocument();
      });
    });

    it('should update theme when setTheme is called', async () => {
      const userEvent = (await import('@testing-library/user-event')).default;

      render(
        <Theme disablePersistence>
          <ThemeConsumer />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      });

      await userEvent.click(screen.getByTestId('set-light'));

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
        expect(document.documentElement.classList.contains('theme-light')).toBe(true);
      });
    });

    it('should support all theme variants (dark, light, high-contrast)', async () => {
      const userEvent = (await import('@testing-library/user-event')).default;

      render(
        <Theme disablePersistence>
          <ThemeConsumer />
        </Theme>,
      );

      // Test dark
      await userEvent.click(screen.getByTestId('set-dark'));
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
        expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
      });

      // Test light
      await userEvent.click(screen.getByTestId('set-light'));
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
        expect(document.documentElement.classList.contains('theme-light')).toBe(true);
        expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
      });

      // Test high-contrast
      await userEvent.click(screen.getByTestId('set-high-contrast'));
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('high-contrast');
        expect(document.documentElement.classList.contains('theme-high-contrast')).toBe(true);
        expect(document.documentElement.classList.contains('theme-light')).toBe(false);
      });
    });
  });

  describe('System Theme', () => {
    it('should detect system theme when defaultUseSystemTheme is true', async () => {
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
        <Theme defaultUseSystemTheme disablePersistence>
          <ThemeConsumer />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
        expect(screen.getByTestId('use-system-theme')).toHaveTextContent('true');
      });
    });

    it('should update theme when system preference changes', async () => {
      const listeners: Array<(e: MediaQueryListEvent) => void> = [];

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
            if (event === 'change') {
              listeners.push(listener);
            }
          }),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(
        <Theme defaultUseSystemTheme disablePersistence>
          <ThemeConsumer />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      });

      // Simulate system preference change to light
      const event = { matches: false } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));

      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      });
    });

    it('should toggle system theme preference', async () => {
      const userEvent = (await import('@testing-library/user-event')).default;

      render(
        <Theme disablePersistence>
          <ThemeConsumer />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('use-system-theme')).toHaveTextContent('false');
      });

      await userEvent.click(screen.getByTestId('toggle-system'));

      await waitFor(() => {
        expect(screen.getByTestId('use-system-theme')).toHaveTextContent('true');
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error when useTheme is used outside Theme provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        render(<ThemeConsumer />);
      }).toThrow('useTheme must be used within a <Theme> provider');

      console.error = originalError;
    });
  });

  describe('SSR Support', () => {
    it('should render null initially and mount after hydration', async () => {
      // In test environment, React effects run synchronously
      // In SSR, the component would return null until client-side hydration
      render(
        <Theme>
          <div data-testid="child">Child</div>
        </Theme>,
      );

      // After mount effects run, children should be visible
      await waitFor(() => {
        expect(screen.getByTestId('child')).toBeInTheDocument();
      });

      // Theme class should also be applied
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
    });

    it('should render children after mount', async () => {
      render(
        <Theme disablePersistence>
          <div data-testid="child">Child</div>
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('child')).toBeInTheDocument();
      });
    });
  });
});
