/**
 * Token Demo Component (T037)
 *
 * Purpose: Smoke test for design system token integration
 * Usage: Visual verification that tokens resolve correctly in browser
 *
 * This component exercises:
 * - Color tokens (primitives + semantic)
 * - Spacing tokens (4px base unit)
 * - Typography tokens (Geist font, sizes, weights)
 * - Elevation tokens (shadows + Neon Flux glows)
 * - Radius tokens (border-radius)
 * - Blur tokens (glassmorphism)
 * - Theme switching (dark/light/high-contrast)
 */

import React from 'react';

export function TokenDemo(): JSX.Element {
  const [theme, setTheme] = React.useState<'dark' | 'light' | 'high-contrast'>('dark');

  return (
    <div className={`theme-${theme} min-h-screen bg-bg-base p-8 transition-colors`}>
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-text-primary">Design System Token Demo</h1>
          <p className="text-lg text-text-secondary">
            Visual verification of token resolution and theme switching
          </p>
        </div>

        {/* Theme Switcher */}
        <div className="flex gap-4">
          <button
            onClick={() => setTheme('dark')}
            className={`rounded-lg px-4 py-2 font-medium transition-colors ${
              theme === 'dark'
                ? 'bg-accent-primary text-white'
                : 'bg-bg-surface text-text-primary hover:bg-bg-elevated'
            }`}
          >
            Dark
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`rounded-lg px-4 py-2 font-medium transition-colors ${
              theme === 'light'
                ? 'bg-accent-primary text-white'
                : 'bg-bg-surface text-text-primary hover:bg-bg-elevated'
            }`}
          >
            Light
          </button>
          <button
            onClick={() => setTheme('high-contrast')}
            className={`rounded-lg px-4 py-2 font-medium transition-colors ${
              theme === 'high-contrast'
                ? 'bg-accent-primary text-white'
                : 'bg-bg-surface text-text-primary hover:bg-bg-elevated'
            }`}
          >
            High Contrast
          </button>
        </div>

        {/* Color Tokens */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-text-primary">Color Tokens</h2>

          {/* Neon Flux Accents */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="h-20 rounded-lg bg-[hsl(var(--color-purple-500))] shadow-glow-purple" />
              <p className="text-sm text-text-secondary">Purple (Primary)</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 rounded-lg bg-[hsl(var(--color-blue-500))] shadow-glow-blue" />
              <p className="text-sm text-text-secondary">Blue (Secondary)</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 rounded-lg bg-[hsl(var(--color-pink-500))] shadow-glow-pink" />
              <p className="text-sm text-text-secondary">Pink (Tertiary)</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 rounded-lg bg-[hsl(var(--color-cyan-500))] shadow-glow-cyan" />
              <p className="text-sm text-text-secondary">Cyan (Quaternary)</p>
            </div>
          </div>

          {/* Semantic Colors */}
          <div className="space-y-2 rounded-lg bg-bg-surface p-6 shadow-card">
            <p className="text-text-primary">Primary text on surface background</p>
            <p className="text-text-secondary">Secondary text with reduced opacity</p>
            <p className="text-text-tertiary">Tertiary text for less important info</p>
            <div className="mt-4 border-t border-border-subtle pt-4">
              <p className="text-sm text-text-secondary">Border: border-subtle</p>
            </div>
          </div>
        </section>

        {/* Spacing Tokens */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-text-primary">Spacing Tokens (4px base)</h2>
          <div className="space-y-2 rounded-lg bg-bg-surface p-6">
            <div className="flex items-center gap-2">
              <div className="h-4 bg-accent-primary" style={{ width: 'var(--space-1)' }} />
              <span className="text-sm text-text-secondary">space-1 (4px)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 bg-accent-primary" style={{ width: 'var(--space-4)' }} />
              <span className="text-sm text-text-secondary">space-4 (16px)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 bg-accent-primary" style={{ width: 'var(--space-8)' }} />
              <span className="text-sm text-text-secondary">space-8 (32px)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 bg-accent-primary" style={{ width: 'var(--space-16)' }} />
              <span className="text-sm text-text-secondary">space-16 (64px)</span>
            </div>
          </div>
        </section>

        {/* Typography Tokens */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-text-primary">Typography Tokens</h2>
          <div className="space-y-4 rounded-lg bg-bg-surface p-6">
            <p className="text-xs text-text-secondary">Extra small (12px) - font-size-xs</p>
            <p className="text-sm text-text-secondary">Small (14px) - font-size-sm</p>
            <p className="text-base text-text-primary">Base (16px) - font-size-base</p>
            <p className="text-lg text-text-primary">Large (18px) - font-size-lg</p>
            <p className="text-xl text-text-primary">Extra large (20px) - font-size-xl</p>
            <p className="text-2xl font-semibold text-text-primary">2XL (24px) - font-size-2xl</p>
            <p className="text-4xl font-bold text-text-primary">4XL (36px) - font-size-4xl</p>

            <div className="mt-4 border-t border-border-subtle pt-4">
              <p className="font-mono text-sm text-text-secondary">
                Monospace font (Geist Mono) - font-family-mono
              </p>
            </div>
          </div>
        </section>

        {/* Elevation Tokens */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-text-primary">Elevation Tokens</h2>

          {/* Depth Shadows */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-bg-surface p-6 shadow-sm">
              <p className="text-sm text-text-secondary">shadow-sm</p>
            </div>
            <div className="rounded-lg bg-bg-surface p-6 shadow-lg">
              <p className="text-sm text-text-secondary">shadow-lg</p>
            </div>
            <div className="rounded-lg bg-bg-surface p-6 shadow-xl">
              <p className="text-sm text-text-secondary">shadow-xl</p>
            </div>
          </div>

          {/* Semantic Shadows */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-bg-surface p-6 shadow-card">
              <p className="text-sm text-text-secondary">shadow-card (elevation-card)</p>
            </div>
            <div className="rounded-lg bg-bg-surface p-6 shadow-modal">
              <p className="text-sm text-text-secondary">shadow-modal (elevation-modal)</p>
            </div>
          </div>
        </section>

        {/* Radius Tokens */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-text-primary">Radius Tokens</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-20 rounded-sm bg-bg-surface p-4 shadow-card">
              <p className="text-xs text-text-secondary">rounded-sm</p>
            </div>
            <div className="h-20 rounded-md bg-bg-surface p-4 shadow-card">
              <p className="text-xs text-text-secondary">rounded-md</p>
            </div>
            <div className="h-20 rounded-lg bg-bg-surface p-4 shadow-card">
              <p className="text-xs text-text-secondary">rounded-lg</p>
            </div>
            <div className="h-20 rounded-full bg-bg-surface p-4 shadow-card">
              <p className="text-xs text-text-secondary">rounded-full</p>
            </div>
          </div>
        </section>

        {/* Glassmorphism (Blur Tokens) */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-text-primary">Glassmorphism (Blur Tokens)</h2>
          <div className="relative h-48 overflow-hidden rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
            <div className="absolute inset-0 flex items-center justify-center gap-4">
              <div className="rounded-lg bg-bg-surface/20 p-6 backdrop-blur-sm">
                <p className="text-sm text-white">blur-sm</p>
              </div>
              <div className="rounded-lg bg-bg-surface/20 p-6 backdrop-blur-md">
                <p className="text-sm text-white">blur-md</p>
              </div>
              <div className="rounded-lg bg-bg-surface/20 p-6 backdrop-blur-lg">
                <p className="text-sm text-white">blur-lg</p>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Elements */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-text-primary">Interactive States</h2>
          <div className="flex gap-4">
            <button className="rounded-lg bg-accent-primary px-6 py-3 font-medium text-white shadow-glow-purple transition-all hover:bg-accent-primary/90 hover:shadow-lg active:scale-95">
              Primary Button
            </button>
            <button className="rounded-lg border border-border-default bg-bg-surface px-6 py-3 font-medium text-text-primary transition-colors hover:bg-bg-elevated">
              Secondary Button
            </button>
            <button
              className="rounded-lg bg-bg-surface px-6 py-3 font-medium text-text-tertiary transition-colors hover:text-text-primary"
              disabled
            >
              Disabled Button
            </button>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-border-subtle pt-8 text-center">
          <p className="text-sm text-text-tertiary">
            Design System Token Demo • Phase 2 (T037) • Spec 013
          </p>
        </div>
      </div>
    </div>
  );
}
