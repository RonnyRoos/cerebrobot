/**
 * Token Resolution Tests (T030-T031)
 * 
 * Purpose: Verify primitive and semantic tokens resolve correctly in DOM
 * Spec: /specs/013-neon-flux-design-system/spec.md (FR-001 to FR-004)
 * 
 * Test Strategy:
 * 1. Create test DOM element
 * 2. Import token stylesheets
 * 3. Verify CSS custom property values
 * 4. Validate token references (semantic → primitive)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getTokenValue } from '../../src/theme/types';

// Import token stylesheets for test environment
import '../../src/theme/tokens/primitives.css';
import '../../src/theme/tokens/semantic.css';
import '../../src/theme/tokens/component.css';

describe('T030: Primitive Token Resolution', () => {
  let testElement: HTMLDivElement;

  beforeEach(() => {
    // Create test element and attach to DOM
    testElement = document.createElement('div');
    document.body.appendChild(testElement);
  });

  afterEach(() => {
    // Cleanup
    document.body.removeChild(testElement);
  });

  describe('Color Primitives', () => {
    it('should resolve --color-purple-500 to HSL values', () => {
      const value = getTokenValue('--color-purple-500');
      expect(value).toBe('277 92% 62%');
    });

    it('should resolve --color-blue-500 to HSL values', () => {
      const value = getTokenValue('--color-blue-500');
      expect(value).toBe('221 91% 60%');
    });

    it('should resolve --color-pink-500 to HSL values', () => {
      const value = getTokenValue('--color-pink-500');
      expect(value).toBe('330 81% 60%');
    });

    it('should resolve --color-cyan-500 to HSL values', () => {
      const value = getTokenValue('--color-cyan-500');
      expect(value).toBe('187 95% 43%');
    });

    it('should resolve neutral scale colors', () => {
      expect(getTokenValue('--color-neutral-50')).toBe('240 5% 97%');
      expect(getTokenValue('--color-neutral-900')).toBe('222 47% 11%');
    });

    it('should resolve special colors', () => {
      expect(getTokenValue('--color-white')).toBe('0 0% 100%');
      expect(getTokenValue('--color-black')).toBe('0 0% 0%');
      expect(getTokenValue('--color-bg-dark')).toBe('240 20% 5%');
    });
  });

  describe('Spacing Primitives', () => {
    it('should resolve --space-1 to 0.25rem (4px)', () => {
      const value = getTokenValue('--space-1');
      expect(value).toBe('0.25rem');
    });

    it('should resolve --space-4 to 1rem (16px)', () => {
      const value = getTokenValue('--space-4');
      expect(value).toBe('1rem');
    });

    it('should resolve --space-16 to 4rem (64px)', () => {
      const value = getTokenValue('--space-16');
      expect(value).toBe('4rem');
    });

    it('should follow 4px base unit scale', () => {
      const space2 = getTokenValue('--space-2');
      const space3 = getTokenValue('--space-3');
      expect(space2).toBe('0.5rem'); // 8px
      expect(space3).toBe('0.75rem'); // 12px
    });
  });

  describe('Typography Primitives', () => {
    it('should resolve font family tokens', () => {
      const sans = getTokenValue('--font-family-sans');
      const mono = getTokenValue('--font-family-mono');
      
      expect(sans).toContain('Geist');
      expect(mono).toContain('Geist Mono');
    });

    it('should resolve font size tokens', () => {
      expect(getTokenValue('--font-size-xs')).toBe('0.75rem');
      expect(getTokenValue('--font-size-base')).toBe('1rem');
      expect(getTokenValue('--font-size-4xl')).toBe('2.25rem');
    });

    it('should resolve font weight tokens', () => {
      expect(getTokenValue('--font-weight-normal')).toBe('400');
      expect(getTokenValue('--font-weight-bold')).toBe('700');
    });

    it('should resolve line height tokens', () => {
      expect(getTokenValue('--line-height-none')).toBe('1');
      expect(getTokenValue('--line-height-normal')).toBe('1.5');
    });
  });

  describe('Elevation Primitives (Shadows)', () => {
    it('should resolve depth shadow tokens', () => {
      const shadowSm = getTokenValue('--shadow-sm');
      const shadowXl = getTokenValue('--shadow-xl');
      
      expect(shadowSm).toContain('0 1px 2px');
      expect(shadowXl).toContain('0 20px 25px');
    });

    it('should resolve glow shadow tokens (Neon Flux)', () => {
      const glowPurple = getTokenValue('--shadow-glow-purple');
      const glowBlue = getTokenValue('--shadow-glow-blue');
      
      expect(glowPurple).toContain('0 0 20px');
      expect(glowPurple).toContain('168, 85, 247');
      expect(glowBlue).toContain('59, 130, 246');
    });
  });

  describe('Radius Primitives', () => {
    it('should resolve radius tokens', () => {
      expect(getTokenValue('--radius-sm')).toBe('0.25rem');
      expect(getTokenValue('--radius-lg')).toBe('1rem');
      expect(getTokenValue('--radius-full')).toBe('9999px');
    });
  });

  describe('Blur Primitives (Glassmorphism)', () => {
    it('should resolve blur tokens', () => {
      expect(getTokenValue('--blur-sm')).toBe('4px');
      expect(getTokenValue('--blur-md')).toBe('12px');
      expect(getTokenValue('--blur-lg')).toBe('24px');
    });
  });
});

describe('T031: Semantic Token Resolution', () => {
  let testElement: HTMLDivElement;

  beforeEach(() => {
    testElement = document.createElement('div');
    document.body.appendChild(testElement);
  });

  afterEach(() => {
    document.body.removeChild(testElement);
  });

  describe('Semantic Color Tokens (Dark Theme Default)', () => {
    it('should resolve --color-text-primary to light text', () => {
      // Dark theme default: light text on dark background
      const value = getTokenValue('--color-text-primary');
      expect(value).toBe('240 5% 97%'); // --color-neutral-50
    });

    it('should resolve --color-bg-base to dark background', () => {
      const value = getTokenValue('--color-bg-base');
      expect(value).toBe('240 20% 5%'); // --color-bg-dark
    });

    it('should resolve --color-accent-primary to purple', () => {
      const value = getTokenValue('--color-accent-primary');
      expect(value).toBe('277 92% 62%'); // --color-purple-500
    });

    it('should resolve --color-accent-secondary to blue', () => {
      const value = getTokenValue('--color-accent-secondary');
      expect(value).toBe('221 91% 60%'); // --color-blue-500
    });
  });

  describe('Theme Overrides (Light Mode)', () => {
    beforeEach(() => {
      // Apply light theme class
      document.documentElement.classList.add('theme-light');
    });

    afterEach(() => {
      document.documentElement.classList.remove('theme-light');
    });

    it('should override --color-text-primary to dark text in light mode', () => {
      const value = getTokenValue('--color-text-primary');
      // In light mode, text should be dark
      expect(value).toBe('222 47% 11%'); // --color-neutral-900
    });

    it('should override --color-bg-base to light background', () => {
      const value = getTokenValue('--color-bg-base');
      expect(value).toBe('240 5% 97%'); // --color-neutral-50
    });
  });

  describe('Theme Overrides (High Contrast)', () => {
    beforeEach(() => {
      document.documentElement.classList.add('theme-high-contrast');
    });

    afterEach(() => {
      document.documentElement.classList.remove('theme-high-contrast');
    });

    it('should override --color-text-primary to pure white', () => {
      const value = getTokenValue('--color-text-primary');
      expect(value).toBe('0 0% 100%'); // --color-white
    });

    it('should override --color-bg-base to pure black', () => {
      const value = getTokenValue('--color-bg-base');
      expect(value).toBe('0 0% 0%'); // --color-black
    });

    it('should remove decorative glow effects', () => {
      const glow = getTokenValue('--elevation-glow-user-message');
      expect(glow).toBe('none');
    });
  });

  describe('Semantic Elevation Tokens', () => {
    it('should resolve semantic elevation to primitive shadows', () => {
      const cardElevation = getTokenValue('--elevation-card');
      const shadowSm = getTokenValue('--shadow-sm');
      
      // Semantic token should reference primitive
      expect(cardElevation).toBe(shadowSm);
    });

    it('should resolve glow elevation tokens', () => {
      const userGlow = getTokenValue('--elevation-glow-user-message');
      const purpleGlow = getTokenValue('--shadow-glow-purple');
      
      expect(userGlow).toBe(purpleGlow);
    });
  });

  describe('Token Type Safety', () => {
    it('should have type-safe token access via getTokenValue', () => {
      // TypeScript should enforce valid token names
      const purple = getTokenValue('--color-purple-500');
      const space = getTokenValue('--space-4');
      
      expect(purple).toBeDefined();
      expect(space).toBeDefined();
    });
  });
});
