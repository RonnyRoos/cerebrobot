/**
 * Design System Type Definitions
 *
 * Purpose: Type-safe token references and theme configuration
 * Usage: Import types for component props and theme utilities
 *
 * Spec: /specs/013-neon-flux-design-system/spec.md (FR-015)
 * Contract: /specs/013-neon-flux-design-system/contracts/token-api.md
 */

/* ========================================
   Token Type Definitions
   Auto-generated from token files for type safety
   ======================================== */

/**
 * Color token names (CSS custom property format)
 * Use with getComputedStyle() or CSS var() references
 */
export type ColorToken =
  // Primitive Colors
  | '--color-purple-500'
  | '--color-blue-500'
  | '--color-pink-500'
  | '--color-cyan-500'
  | '--color-neutral-50'
  | '--color-neutral-100'
  | '--color-neutral-200'
  | '--color-neutral-300'
  | '--color-neutral-400'
  | '--color-neutral-500'
  | '--color-neutral-600'
  | '--color-neutral-700'
  | '--color-neutral-800'
  | '--color-neutral-900'
  | '--color-black'
  | '--color-white'
  | '--color-bg-dark'
  // Semantic Colors
  | '--color-text-primary'
  | '--color-text-secondary'
  | '--color-text-tertiary'
  | '--color-text-disabled'
  | '--color-text-inverse'
  | '--color-bg-base'
  | '--color-bg-surface'
  | '--color-bg-elevated'
  | '--color-bg-overlay'
  | '--color-border-subtle'
  | '--color-border-default'
  | '--color-border-strong'
  | '--color-accent-primary'
  | '--color-accent-secondary'
  | '--color-accent-tertiary'
  | '--color-accent-quaternary'
  | '--color-success'
  | '--color-warning'
  | '--color-error'
  | '--color-info'
  | '--color-interactive-hover'
  | '--color-interactive-active'
  | '--color-interactive-disabled';

/**
 * Spacing token names (CSS custom property format)
 * Based on 4px base unit
 */
export type SpacingToken =
  | '--space-1'
  | '--space-2'
  | '--space-3'
  | '--space-4'
  | '--space-5'
  | '--space-6'
  | '--space-8'
  | '--space-10'
  | '--space-12'
  | '--space-16';

/**
 * Typography token names (CSS custom property format)
 */
export type TypographyToken =
  // Font Families
  | '--font-family-sans'
  | '--font-family-mono'
  // Font Sizes
  | '--font-size-xs'
  | '--font-size-sm'
  | '--font-size-base'
  | '--font-size-lg'
  | '--font-size-xl'
  | '--font-size-2xl'
  | '--font-size-3xl'
  | '--font-size-4xl'
  // Line Heights
  | '--line-height-none'
  | '--line-height-tight'
  | '--line-height-snug'
  | '--line-height-normal'
  | '--line-height-relaxed'
  | '--line-height-loose'
  // Font Weights
  | '--font-weight-normal'
  | '--font-weight-medium'
  | '--font-weight-semibold'
  | '--font-weight-bold'
  | '--font-weight-extrabold'
  // Letter Spacing
  | '--letter-spacing-tighter'
  | '--letter-spacing-tight'
  | '--letter-spacing-normal'
  | '--letter-spacing-wide'
  | '--letter-spacing-wider';

/**
 * Elevation token names (CSS custom property format)
 * Includes both depth shadows and glow effects
 */
export type ElevationToken =
  // Depth Shadows
  | '--shadow-sm'
  | '--shadow-md'
  | '--shadow-lg'
  | '--shadow-xl'
  // Glow Shadows (Neon Flux)
  | '--shadow-glow-purple'
  | '--shadow-glow-blue'
  | '--shadow-glow-pink'
  | '--shadow-glow-cyan'
  // Semantic Elevation
  | '--elevation-card'
  | '--elevation-modal'
  | '--elevation-tooltip'
  | '--elevation-glow-user-message'
  | '--elevation-glow-assistant-message'
  | '--elevation-glow-accent'
  | '--elevation-glow-highlight';

/**
 * Border radius token names (CSS custom property format)
 */
export type RadiusToken =
  | '--radius-none'
  | '--radius-sm'
  | '--radius-md'
  | '--radius-lg'
  | '--radius-xl'
  | '--radius-full';

/**
 * Blur token names (CSS custom property format)
 * For glassmorphism effects
 */
export type BlurToken = '--blur-sm' | '--blur-md' | '--blur-lg';

/**
 * All design tokens (union of all token types)
 */
export type DesignToken =
  | ColorToken
  | SpacingToken
  | TypographyToken
  | ElevationToken
  | RadiusToken
  | BlurToken;

/* ========================================
   Theme Configuration Types
   ======================================== */

/**
 * Available theme names
 */
export type ThemeName = 'dark' | 'light' | 'high-contrast';

/**
 * Theme configuration object
 */
export interface ThemeConfig {
  /** Active theme name */
  theme: ThemeName;
  /** Whether system preference should be respected */
  useSystemTheme: boolean;
}

/**
 * Theme context value (for React Context)
 */
export interface ThemeContext {
  /** Current theme name */
  theme: ThemeName;
  /** Set theme programmatically */
  setTheme: (theme: ThemeName) => void;
  /** Whether system theme is being used */
  useSystemTheme: boolean;
  /** Toggle system theme preference */
  toggleSystemTheme: () => void;
}

/* ========================================
   Utility Types for Components
   ======================================== */

/**
 * Spacing values (can use token or custom value)
 */
export type SpacingValue = SpacingToken | number | string;

/**
 * Color values (can use token or custom value)
 */
export type ColorValue = ColorToken | string;

/**
 * Responsive breakpoints (Tailwind standard)
 */
export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Responsive value (can be single value or breakpoint map)
 */
export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>;

/* ========================================
   Token Constants (for runtime usage)
   ======================================== */

/**
 * Color token constants (easier autocomplete than string literals)
 */
export const ColorTokens = {
  // Primitives
  purple500: '--color-purple-500',
  blue500: '--color-blue-500',
  pink500: '--color-pink-500',
  cyan500: '--color-cyan-500',
  // Semantic
  textPrimary: '--color-text-primary',
  textSecondary: '--color-text-secondary',
  bgBase: '--color-bg-base',
  bgSurface: '--color-bg-surface',
  accentPrimary: '--color-accent-primary',
  accentSecondary: '--color-accent-secondary',
} as const;

/**
 * Spacing token constants
 */
export const SpacingTokens = {
  1: '--space-1',
  2: '--space-2',
  3: '--space-3',
  4: '--space-4',
  5: '--space-5',
  6: '--space-6',
  8: '--space-8',
  10: '--space-10',
  12: '--space-12',
  16: '--space-16',
} as const;

/**
 * Shadow token constants
 */
export const ShadowTokens = {
  sm: '--shadow-sm',
  md: '--shadow-md',
  lg: '--shadow-lg',
  xl: '--shadow-xl',
  glowPurple: '--shadow-glow-purple',
  glowBlue: '--shadow-glow-blue',
  glowPink: '--shadow-glow-pink',
  glowCyan: '--shadow-glow-cyan',
} as const;

/**
 * Radius token constants
 */
export const RadiusTokens = {
  none: '--radius-none',
  sm: '--radius-sm',
  md: '--radius-md',
  lg: '--radius-lg',
  xl: '--radius-xl',
  full: '--radius-full',
} as const;

/* ========================================
   Helper Functions
   ======================================== */

/**
 * Get CSS custom property value
 * @param token - Token name (with or without --)
 * @param element - Element to query (defaults to document.documentElement)
 * @returns Token value or empty string if not found
 */
export function getTokenValue(token: DesignToken, element?: HTMLElement): string {
  const el = element || document.documentElement;
  const tokenName = token.startsWith('--') ? token : `--${token}`;
  return getComputedStyle(el).getPropertyValue(tokenName).trim();
}

/**
 * Set CSS custom property value
 * @param token - Token name (with or without --)
 * @param value - New token value
 * @param element - Element to update (defaults to document.documentElement)
 */
export function setTokenValue(token: DesignToken, value: string, element?: HTMLElement): void {
  const el = element || document.documentElement;
  const tokenName = token.startsWith('--') ? token : `--${token}`;
  el.style.setProperty(tokenName, value);
}

/**
 * Check if dark mode is active
 * @returns true if .theme-dark or .dark class is present on <html>
 */
export function isDarkMode(): boolean {
  return (
    document.documentElement.classList.contains('theme-dark') ||
    document.documentElement.classList.contains('dark')
  );
}

/**
 * Get current theme name
 * @returns Active theme name (defaults to 'dark' if no theme class found)
 */
export function getCurrentTheme(): ThemeName {
  const { classList } = document.documentElement;
  if (classList.contains('theme-light')) return 'light';
  if (classList.contains('theme-high-contrast')) return 'high-contrast';
  return 'dark'; // Default
}
