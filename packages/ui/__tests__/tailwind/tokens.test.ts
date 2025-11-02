/**
 * Tailwind Config Integration Tests (T032)
 * 
 * Purpose: Verify Tailwind generates correct utility classes from design tokens
 * Spec: /specs/013-neon-flux-design-system/spec.md (FR-014)
 * 
 * Test Strategy:
 * 1. Import Tailwind config
 * 2. Verify theme extensions exist
 * 3. Test that utility classes reference token CSS custom properties
 */

import { describe, it, expect } from 'vitest';
import tailwindConfig from '../../tailwind.config';
import resolveConfig from 'tailwindcss/resolveConfig';

describe('T032: Tailwind Config Token Integration', () => {
  const config = resolveConfig(tailwindConfig);

  describe('Color Utilities', () => {
    it('should extend colors with semantic token references', () => {
      const colors = config.theme.colors;
      
      // Semantic colors should be defined
      expect(colors).toHaveProperty('text-primary');
      expect(colors).toHaveProperty('bg-surface');
      expect(colors).toHaveProperty('accent-primary');
      expect(colors).toHaveProperty('border-subtle');
    });

    it('should include primitive color tokens', () => {
      const colors = config.theme.colors;
      
      expect(colors).toHaveProperty('purple-500');
      expect(colors).toHaveProperty('blue-500');
      expect(colors).toHaveProperty('pink-500');
      expect(colors).toHaveProperty('cyan-500');
    });

    it('should include neutral scale', () => {
      const colors = config.theme.colors;
      
      expect(colors).toHaveProperty('neutral-50');
      expect(colors).toHaveProperty('neutral-900');
    });

    it('should maintain backward-compatible chat colors', () => {
      const colors = config.theme.colors;
      
      expect(colors).toHaveProperty('message-user');
      expect(colors).toHaveProperty('message-agent');
      expect(colors).toHaveProperty('code-block');
    });

    it('should support opacity modifiers via HSL format', () => {
      const colors = config.theme.colors as unknown as Record<string, string | Record<string, string>>;
      
      // Check that colors use hsl() with <alpha-value> placeholder
      const accentPrimary = colors['accent-primary'] as string;
      expect(accentPrimary).toContain('hsl(');
      expect(accentPrimary).toContain('<alpha-value>');
      expect(accentPrimary).toContain('--color-accent-primary');
    });
  });

  describe('Spacing Utilities', () => {
    it('should extend spacing with design system tokens', () => {
      const spacing = config.theme.spacing;
      
      // Design system spacing (overrides Tailwind defaults)
      expect(spacing).toHaveProperty('1');
      expect(spacing).toHaveProperty('4');
      expect(spacing).toHaveProperty('16');
    });

    it('should reference CSS custom properties', () => {
      const spacing = config.theme.spacing as Record<string, string>;
      
      expect(spacing['1']).toBe('var(--space-1)');
      expect(spacing['4']).toBe('var(--space-4)');
      expect(spacing['16']).toBe('var(--space-16)');
    });

    it('should support 4px base unit scale', () => {
      const spacing = config.theme.spacing as Record<string, string>;
      
      // Verify full scale exists
      expect(spacing).toHaveProperty('1'); // 4px
      expect(spacing).toHaveProperty('2'); // 8px
      expect(spacing).toHaveProperty('3'); // 12px
      expect(spacing).toHaveProperty('4'); // 16px
      expect(spacing).toHaveProperty('5'); // 20px
      expect(spacing).toHaveProperty('6'); // 24px
      expect(spacing).toHaveProperty('8'); // 32px
      expect(spacing).toHaveProperty('10'); // 40px
      expect(spacing).toHaveProperty('12'); // 48px
      expect(spacing).toHaveProperty('16'); // 64px
    });
  });

  describe('Typography Utilities', () => {
    it('should extend fontSize with design system tokens', () => {
      const fontSize = config.theme.fontSize;
      
      expect(fontSize).toHaveProperty('xs');
      expect(fontSize).toHaveProperty('base');
      expect(fontSize).toHaveProperty('4xl');
    });

    it('should include line height configurations', () => {
      const fontSize = config.theme.fontSize as Record<string, [string, { lineHeight: string }]>;
      
      // Font sizes should be tuples with line height
      const base = fontSize['base'];
      expect(Array.isArray(base)).toBe(true);
      expect(base[1]).toHaveProperty('lineHeight');
    });

    it('should maintain backward-compatible chat typography', () => {
      const fontSize = config.theme.fontSize;
      
      expect(fontSize).toHaveProperty('chat-body');
      expect(fontSize).toHaveProperty('chat-code');
    });

    it('should extend fontFamily with design system tokens', () => {
      const fontFamily = config.theme.fontFamily;
      
      expect(fontFamily).toHaveProperty('sans');
      expect(fontFamily).toHaveProperty('mono');
    });

    it('should reference token CSS custom properties', () => {
      const fontFamily = config.theme.fontFamily as Record<string, string[]>;
      
      expect(fontFamily['sans'][0]).toBe('var(--font-family-sans)');
      expect(fontFamily['mono'][0]).toBe('var(--font-family-mono)');
    });

    it('should extend fontWeight with design system tokens', () => {
      const fontWeight = config.theme.fontWeight;
      
      expect(fontWeight).toHaveProperty('normal');
      expect(fontWeight).toHaveProperty('semibold');
      expect(fontWeight).toHaveProperty('bold');
    });
  });

  describe('Shadow Utilities (Elevation)', () => {
    it('should extend boxShadow with design system tokens', () => {
      const boxShadow = config.theme.boxShadow;
      
      // Depth shadows
      expect(boxShadow).toHaveProperty('sm');
      expect(boxShadow).toHaveProperty('lg');
      expect(boxShadow).toHaveProperty('xl');
      
      // Glow shadows (Neon Flux)
      expect(boxShadow).toHaveProperty('glow-purple');
      expect(boxShadow).toHaveProperty('glow-blue');
      expect(boxShadow).toHaveProperty('glow-pink');
      expect(boxShadow).toHaveProperty('glow-cyan');
      
      // Semantic elevation
      expect(boxShadow).toHaveProperty('card');
      expect(boxShadow).toHaveProperty('modal');
    });

    it('should reference token CSS custom properties', () => {
      const boxShadow = config.theme.boxShadow as Record<string, string>;
      
      expect(boxShadow['sm']).toBe('var(--shadow-sm)');
      expect(boxShadow['glow-purple']).toBe('var(--shadow-glow-purple)');
      expect(boxShadow['card']).toBe('var(--elevation-card)');
    });
  });

  describe('Radius Utilities', () => {
    it('should extend borderRadius with design system tokens', () => {
      const borderRadius = config.theme.borderRadius;
      
      expect(borderRadius).toHaveProperty('none');
      expect(borderRadius).toHaveProperty('sm');
      expect(borderRadius).toHaveProperty('lg');
      expect(borderRadius).toHaveProperty('full');
    });

    it('should reference token CSS custom properties', () => {
      const borderRadius = config.theme.borderRadius as Record<string, string>;
      
      expect(borderRadius['sm']).toBe('var(--radius-sm)');
      expect(borderRadius['lg']).toBe('var(--radius-lg)');
      expect(borderRadius['full']).toBe('var(--radius-full)');
    });
  });

  describe('Blur Utilities (Glassmorphism)', () => {
    it('should extend blur with design system tokens', () => {
      const blur = config.theme.blur;
      
      expect(blur).toHaveProperty('sm');
      expect(blur).toHaveProperty('md');
      expect(blur).toHaveProperty('lg');
    });

    it('should reference token CSS custom properties', () => {
      const blur = config.theme.blur as Record<string, string>;
      
      expect(blur['sm']).toBe('var(--blur-sm)');
      expect(blur['md']).toBe('var(--blur-md)');
      expect(blur['lg']).toBe('var(--blur-lg)');
    });
  });

  describe('Animation Utilities (Neon Flux)', () => {
    it('should preserve existing Neon Flux animations', () => {
      const animation = config.theme.animation;
      
      expect(animation).toHaveProperty('gradient-shift');
      expect(animation).toHaveProperty('message-appear');
      expect(animation).toHaveProperty('typing-glow');
    });

    it('should preserve keyframes', () => {
      const keyframes = config.theme.keyframes;
      
      expect(keyframes).toHaveProperty('gradient-shift');
      expect(keyframes).toHaveProperty('message-appear');
      expect(keyframes).toHaveProperty('typing-glow');
    });
  });

  describe('Dark Mode Configuration', () => {
    it('should use class-based dark mode strategy', () => {
      expect(tailwindConfig.darkMode).toEqual(['class']);
    });
  });

  describe('Content Paths', () => {
    it('should include all source files for JIT compilation', () => {
      expect(tailwindConfig.content).toContain('./src/**/*.{ts,tsx}');
    });
  });
});
