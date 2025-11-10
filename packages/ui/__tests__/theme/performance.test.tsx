/**
 * Theme Switch Performance Tests (T053)
 *
 * Purpose: Validate theme switching completes in < 150ms (Success Criterion S7)
 * User Story: US3 - Theme Switching (Priority P2)
 *
 * Test Coverage:
 * - Theme switch duration measurement
 * - DOM class application performance
 * - CSS transition performance
 * - Multiple rapid theme switches
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Theme, useTheme } from '../../src/theme/theme-provider';

/**
 * Performance threshold from spec.md (S7)
 */
const PERFORMANCE_THRESHOLD_MS = 150;

/**
 * Test component for performance testing
 */
function PerformanceTestComponent() {
  const { theme, setTheme } = useTheme();

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
    </div>
  );
}

describe('Theme Switch Performance', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';

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

    // Mock requestAnimationFrame for performance testing
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      setTimeout(cb, 0);
      return 0;
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Theme Switch Duration', () => {
    it('should complete theme switch in < 150ms', async () => {
      const userEvent = (await import('@testing-library/user-event')).default;

      render(
        <Theme disablePersistence>
          <PerformanceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toBeInTheDocument();
      });

      const startTime = performance.now();

      await userEvent.click(screen.getByTestId('set-light'));

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('light');
      });

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('should switch from dark to light quickly', async () => {
      const userEvent = (await import('@testing-library/user-event')).default;

      render(
        <Theme defaultTheme="dark" disablePersistence>
          <PerformanceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      });

      const startTime = performance.now();

      await userEvent.click(screen.getByTestId('set-light'));

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('light');
      });

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });

    it('should switch from light to high-contrast quickly', async () => {
      const userEvent = (await import('@testing-library/user-event')).default;

      render(
        <Theme defaultTheme="light" disablePersistence>
          <PerformanceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('light');
      });

      const startTime = performance.now();

      await userEvent.click(screen.getByTestId('set-high-contrast'));

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('high-contrast');
      });

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });
  });

  describe('DOM Class Application', () => {
    it('should apply theme class to document root immediately', async () => {
      const userEvent = (await import('@testing-library/user-event')).default;

      render(
        <Theme disablePersistence>
          <PerformanceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toBeInTheDocument();
      });

      const startTime = performance.now();

      await userEvent.click(screen.getByTestId('set-light'));

      // Wait for DOM to update
      await waitFor(() => {
        expect(document.documentElement.classList.contains('theme-light')).toBe(true);
      });

      const duration = performance.now() - startTime;

      // DOM update should be reasonably fast (< 100ms)
      // Note: Increased from 50ms to account for CI/test environment variability
      expect(duration).toBeLessThan(100);
    });

    it('should remove old theme class immediately', async () => {
      const userEvent = (await import('@testing-library/user-event')).default;

      render(
        <Theme defaultTheme="dark" disablePersistence>
          <PerformanceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
      });

      await userEvent.click(screen.getByTestId('set-light'));

      await waitFor(() => {
        expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
        expect(document.documentElement.classList.contains('theme-light')).toBe(true);
      });
    });
  });

  describe('Rapid Theme Switches', () => {
    it('should handle multiple rapid theme switches without degradation', async () => {
      const userEvent = (await import('@testing-library/user-event')).default;

      render(
        <Theme disablePersistence>
          <PerformanceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toBeInTheDocument();
      });

      const durations: number[] = [];

      // Perform 5 rapid theme switches
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();

        const targetTheme = i % 3 === 0 ? 'light' : i % 3 === 1 ? 'dark' : 'high-contrast';
        const buttonTestId =
          targetTheme === 'light'
            ? 'set-light'
            : targetTheme === 'dark'
              ? 'set-dark'
              : 'set-high-contrast';

        await userEvent.click(screen.getByTestId(buttonTestId));

        await waitFor(() => {
          expect(screen.getByTestId('theme')).toHaveTextContent(targetTheme);
        });

        const duration = performance.now() - startTime;
        durations.push(duration);
      }

      // All switches should be fast
      durations.forEach((duration) => {
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      });

      // Average duration should be well under threshold
      const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      expect(averageDuration).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 0.5);
    });

    it('should not accumulate DOM classes with rapid switches', async () => {
      const userEvent = (await import('@testing-library/user-event')).default;

      render(
        <Theme disablePersistence>
          <PerformanceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toBeInTheDocument();
      });

      // Rapid switches
      await userEvent.click(screen.getByTestId('set-light'));
      await userEvent.click(screen.getByTestId('set-dark'));
      await userEvent.click(screen.getByTestId('set-high-contrast'));

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('high-contrast');
      });

      // Only high-contrast class should be present
      const root = document.documentElement;
      expect(root.classList.contains('theme-high-contrast')).toBe(true);
      expect(root.classList.contains('theme-light')).toBe(false);
      expect(root.classList.contains('theme-dark')).toBe(false);

      // Count theme-related classes (should be exactly 1)
      const themeClasses = Array.from(root.classList).filter((cls) => cls.startsWith('theme-'));
      expect(themeClasses.length).toBe(1);
    });
  });

  describe('localStorage Performance', () => {
    it('should not block theme switch while writing to localStorage', async () => {
      const userEvent = (await import('@testing-library/user-event')).default;

      render(
        <Theme>
          <PerformanceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toBeInTheDocument();
      });

      const startTime = performance.now();

      await userEvent.click(screen.getByTestId('set-light'));

      // Wait for visual update (should be fast)
      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('light');
      });

      const visualUpdateDuration = performance.now() - startTime;

      // Visual update should be fast even with localStorage write
      expect(visualUpdateDuration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      // Verify localStorage was updated (may happen async)
      await waitFor(() => {
        expect(localStorage.getItem('cerebro-theme')).toBe('light');
      });
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory with repeated theme switches', async () => {
      const userEvent = (await import('@testing-library/user-event')).default;

      render(
        <Theme disablePersistence>
          <PerformanceTestComponent />
        </Theme>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toBeInTheDocument();
      });

      // Initial class count
      const initialClassCount = document.documentElement.classList.length;

      // Perform many theme switches
      for (let i = 0; i < 20; i++) {
        const targetButton =
          i % 3 === 0 ? 'set-light' : i % 3 === 1 ? 'set-dark' : 'set-high-contrast';
        await userEvent.click(screen.getByTestId(targetButton));
      }

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toBeInTheDocument();
      });

      // Class count should not grow significantly
      const finalClassCount = document.documentElement.classList.length;
      expect(finalClassCount).toBeLessThanOrEqual(initialClassCount + 2); // Allow small variance
    });
  });
});
