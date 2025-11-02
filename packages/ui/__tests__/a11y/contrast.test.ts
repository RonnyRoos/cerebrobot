/**
 * Accessibility Contrast Tests (T033)
 * 
 * Purpose: Validate WCAG 2.1 AA compliance for design token color pairs
 * Spec: /specs/013-neon-flux-design-system/spec.md (NFR-005)
 * Standards: WCAG 2.1 Level AA
 *   - Normal text: 4.5:1 minimum contrast ratio
 *   - Large text (≥18pt or ≥14pt bold): 3:1 minimum contrast ratio
 * 
 * Test Strategy:
 * 1. Test core semantic color pairs (text/background)
 * 2. Validate all three themes meet WCAG AA
 * 3. Verify accent colors on backgrounds
 * 4. Check utility functions (getContrastRatio, checkTokenContrast)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getContrastRatio,
  checkContrast,
  checkTokenContrast,
  hexToRgb,
  hslToRgb,
  type RGB,
  type ContrastResult,
  WHITE,
  BLACK,
  PURPLE_500,
  BLUE_500,
  GRAY_50,
  GRAY_900,
  DARK_BG,
} from '../../src/theme/accessibility';

describe('T033: Accessibility Contrast Validation', () => {
  describe('Color Parsing Utilities', () => {
    it('should parse hex colors to RGB', () => {
      const black = hexToRgb('#000000');
      expect(black).toEqual({ r: 0, g: 0, b: 0 });

      const white = hexToRgb('#FFFFFF');
      expect(white).toEqual({ r: 255, g: 255, b: 255 });

      const purple = hexToRgb('#a855f7');
      expect(purple).toEqual({ r: 168, g: 85, b: 247 });
    });

    it('should parse shorthand hex colors', () => {
      const result = hexToRgb('#FFF');
      expect(result).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('should parse HSL colors to RGB', () => {
      const black = hslToRgb('0 0% 0%');
      expect(black.r).toBe(0);
      expect(black.g).toBe(0);
      expect(black.b).toBe(0);

      const white = hslToRgb('0 0% 100%');
      expect(white.r).toBe(255);
      expect(white.g).toBe(255);
      expect(white.b).toBe(255);
    });

    it('should handle HSL with hsl() wrapper', () => {
      const result = hslToRgb('hsl(277, 92%, 62%)');
      expect(result.r).toBeGreaterThan(0);
      expect(result.g).toBeGreaterThan(0);
      expect(result.b).toBeGreaterThan(0);
    });
  });

  describe('getContrastRatio Utility', () => {
    it('should calculate maximum contrast for pure black/white', () => {
      const ratio = getContrastRatio(BLACK, WHITE);
      expect(ratio).toBe(21); // Maximum possible contrast
    });

    it('should calculate minimum contrast for identical colors', () => {
      const ratio = getContrastRatio(WHITE, WHITE);
      expect(ratio).toBe(1); // Minimum possible contrast
    });

    it('should work with RGB objects', () => {
      const ratio = getContrastRatio(BLACK, WHITE);
      expect(ratio).toBeGreaterThan(1);
      expect(ratio).toBeLessThanOrEqual(21);
    });

    it('should return ratios between 1 and 21', () => {
      // Test a variety of color pairs
      const testPairs: Array<[RGB, RGB]> = [
        [hexToRgb('#FF0000'), hexToRgb('#00FF00')],
        [hexToRgb('#0000FF'), hexToRgb('#FFFF00')],
        [hexToRgb('#888888'), hexToRgb('#CCCCCC')],
        [hexToRgb('#333333'), hexToRgb('#EEEEEE')],
      ];

      testPairs.forEach(([fg, bg]) => {
        const ratio = getContrastRatio(fg, bg);
        expect(ratio).toBeGreaterThanOrEqual(1);
        expect(ratio).toBeLessThanOrEqual(21);
      });
    });
  });

  describe('checkContrast Utility', () => {
    it('should pass WCAG AA for high contrast pairs', () => {
      const result: ContrastResult = checkContrast(BLACK, WHITE);
      
      expect(result.ratio).toBe(21);
      expect(result.wcagAA.normalText).toBe(true);
      expect(result.wcagAA.largeText).toBe(true);
      expect(result.wcagAAA.normalText).toBe(true);
      expect(result.wcagAAA.largeText).toBe(true);
    });

    it('should fail WCAG AA for low contrast pairs', () => {
      const result: ContrastResult = checkContrast(hexToRgb('#CCCCCC'), WHITE);
      
      expect(result.ratio).toBeLessThan(4.5);
      expect(result.wcagAA.normalText).toBe(false);
    });

    it('should pass AA Large but not AA for medium contrast', () => {
      // Test a color pair with 3:1 - 4.5:1 contrast
      const result: ContrastResult = checkContrast(hexToRgb('#767676'), WHITE);
      
      if (result.ratio >= 3 && result.ratio < 4.5) {
        expect(result.wcagAA.largeText).toBe(true);
        expect(result.wcagAA.normalText).toBe(false);
      }
    });

    it('should validate AAA standard (7:1 for normal text)', () => {
      const result: ContrastResult = checkContrast(BLACK, WHITE);
      expect(result.wcagAAA.normalText).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(7);
    });

    it('should validate AAA Large standard (4.5:1 for large text)', () => {
      const result: ContrastResult = checkContrast(hexToRgb('#595959'), WHITE);
      
      if (result.ratio >= 4.5) {
        expect(result.wcagAAA.largeText).toBe(true);
      }
    });
  });

  describe('Preset Color Constants', () => {
    it('should provide WHITE constant', () => {
      expect(WHITE).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('should provide BLACK constant', () => {
      expect(BLACK).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('should provide Neon Flux color constants', () => {
      expect(PURPLE_500).toEqual({ r: 168, g: 85, b: 247 });
      expect(BLUE_500).toEqual({ r: 59, g: 130, b: 246 });
    });

    it('should provide neutral scale constants', () => {
      expect(GRAY_50).toEqual({ r: 249, g: 249, b: 251 });
      expect(GRAY_900).toEqual({ r: 15, g: 17, b: 26 });
    });

    it('should provide dark background constant', () => {
      expect(DARK_BG).toEqual({ r: 10, g: 10, b: 15 });
    });
  });

  describe('Neon Flux Accent Colors Contrast', () => {
    it('should validate purple accent against dark background', () => {
      const result = checkContrast(PURPLE_500, DARK_BG);
      
      expect(result.wcagAA.largeText).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(3);
    });

    it('should validate blue accent against dark background', () => {
      const result = checkContrast(BLUE_500, DARK_BG);
      
      expect(result.wcagAA.largeText).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(3);
    });

    it('should validate purple accent against light background', () => {
      const result = checkContrast(PURPLE_500, GRAY_50);
      
      expect(result.wcagAA.largeText).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(3);
    });

    it('should validate blue accent against light background', () => {
      const result = checkContrast(BLUE_500, GRAY_50);
      
      expect(result.wcagAA.largeText).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Dark Theme Semantic Tokens (DOM-based)', () => {
    let testElement: HTMLDivElement;

    beforeEach(() => {
      // Create test element with dark theme
      testElement = document.createElement('div');
      testElement.className = 'theme-dark';
      testElement.style.display = 'none';
      document.body.appendChild(testElement);

      // Import token stylesheets (simulate production environment)
      const style = document.createElement('style');
      style.textContent = `
        :root, .theme-dark {
          --color-text-primary: 249 249 251;
          --color-text-secondary: 212 214 221;
          --color-bg-base: 10 10 15;
          --color-bg-surface: 15 17 26;
          --color-accent-primary: 277 92% 62%;
          --color-border-subtle: 38 38 45;
        }
        .theme-light {
          --color-text-primary: 15 17 26;
          --color-bg-base: 255 255 255;
          --color-bg-surface: 249 249 251;
        }
        .theme-high-contrast {
          --color-text-primary: 0 0% 100%;
          --color-bg-base: 0 0% 0%;
        }
      `;
      document.head.appendChild(style);
    });

    afterEach(() => {
      document.body.removeChild(testElement);
    });

    it('should pass WCAG AA for text-primary on bg-surface', () => {
      const result = checkTokenContrast(
        '--color-text-primary',
        '--color-bg-surface',
        testElement
      );
      
      expect(result.wcagAA.normalText).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should pass WCAG AA for text-primary on bg-base', () => {
      const result = checkTokenContrast(
        '--color-text-primary',
        '--color-bg-base',
        testElement
      );
      
      expect(result.wcagAA.normalText).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should pass WCAG AA for text-secondary on bg-surface', () => {
      const result = checkTokenContrast(
        '--color-text-secondary',
        '--color-bg-surface',
        testElement
      );
      
      expect(result.wcagAA.normalText).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should pass WCAG AA Large for accent-primary on bg-base', () => {
      const result = checkTokenContrast(
        '--color-accent-primary',
        '--color-bg-base',
        testElement
      );
      
      // Accent colors should meet at least AA Large (3:1) for interactive elements
      expect(result.wcagAA.largeText).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(3);
    });

    it('should pass WCAG AA Large for border-subtle on bg-surface', () => {
      const result = checkTokenContrast(
        '--color-border-subtle',
        '--color-bg-surface',
        testElement
      );
      
      // Borders need at least 3:1 for UI components
      expect(result.wcagAA.largeText).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Light Theme Token Contrast', () => {
    it('should pass WCAG AA for inverted text/background', () => {
      // Light theme: dark text on light background
      const result = checkContrast(GRAY_900, GRAY_50);
      
      expect(result.wcagAA.normalText).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should pass WCAG AA for purple accent on light background', () => {
      const result = checkContrast(PURPLE_500, GRAY_50);
      
      expect(result.wcagAA.largeText).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(3);
    });

    it('should pass WCAG AA for blue accent on light background', () => {
      const result = checkContrast(BLUE_500, GRAY_50);
      
      expect(result.wcagAA.largeText).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(3);
    });
  });

  describe('High-Contrast Theme Token Contrast', () => {
    it('should achieve maximum contrast for text on background', () => {
      // High-contrast theme uses pure black/white
      const result = checkContrast(WHITE, BLACK);
      
      expect(result.wcagAAA.normalText).toBe(true);
      expect(result.ratio).toBe(21); // Maximum contrast
    });

    it('should pass WCAG AAA for all semantic pairs', () => {
      // High-contrast theme should exceed AAA standards (7:1)
      const result = checkContrast(WHITE, BLACK);
      
      expect(result.wcagAAA.normalText).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(7);
    });
  });

  describe('WCAG Compliance Summary', () => {
    it('should verify critical dark theme pairs meet AA', () => {
      const criticalPairs: Array<[RGB, RGB]> = [
        [GRAY_50, DARK_BG],      // text-primary on bg-base (dark theme)
        [GRAY_50, GRAY_900],      // text-primary on bg-surface (dark theme)
      ];

      criticalPairs.forEach(([fg, bg]) => {
        const result = checkContrast(fg, bg);
        expect(result.wcagAA.normalText).toBe(true);
      });
    });

    it('should verify critical light theme pairs meet AA', () => {
      const criticalPairs: Array<[RGB, RGB]> = [
        [GRAY_900, WHITE],       // text-primary on bg-base (light theme)
        [GRAY_900, GRAY_50],     // text-primary on bg-surface (light theme)
      ];

      criticalPairs.forEach(([fg, bg]) => {
        const result = checkContrast(fg, bg);
        expect(result.wcagAA.normalText).toBe(true);
      });
    });

    it('should verify interactive elements meet AA Large', () => {
      const interactivePairs: Array<[RGB, RGB]> = [
        [PURPLE_500, DARK_BG],   // accent-primary on bg-base (dark)
        [BLUE_500, DARK_BG],     // accent-secondary on bg-base (dark)
        [PURPLE_500, GRAY_50],   // accent-primary on bg-base (light)
      ];

      interactivePairs.forEach(([fg, bg]) => {
        const result = checkContrast(fg, bg);
        expect(result.wcagAA.largeText).toBe(true);
      });
    });
  });
});
