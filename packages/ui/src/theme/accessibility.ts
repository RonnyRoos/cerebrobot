/**
 * Accessibility Utilities
 *
 * Purpose: Color contrast validation and WCAG compliance helpers
 * Usage: Validate token contrast ratios in tests and development
 *
 * Spec: /specs/013-neon-flux-design-system/spec.md (FR-018, FR-026)
 * Standards: WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text)
 */

/* ========================================
   Types
   ======================================== */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ContrastResult {
  ratio: number;
  wcagAA: {
    normalText: boolean; // 4.5:1
    largeText: boolean; // 3:1
  };
  wcagAAA: {
    normalText: boolean; // 7:1
    largeText: boolean; // 4.5:1
  };
}

/* ========================================
   Contrast Ratio Calculation
   ======================================== */

/**
 * Calculate relative luminance (WCAG 2.1 formula)
 * @param rgb - RGB color values (0-255)
 * @returns Relative luminance (0-1)
 */
function getRelativeLuminance(rgb: RGB): number {
  const { r, g, b } = rgb;

  // Convert RGB to sRGB
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  // Apply gamma correction
  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  // Calculate luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate WCAG contrast ratio between two colors
 * @param color1 - First color (RGB)
 * @param color2 - Second color (RGB)
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(color1: RGB, color2: RGB): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG standards
 * @param ratio - Contrast ratio (1-21)
 * @returns WCAG compliance results
 */
export function checkContrastCompliance(ratio: number): ContrastResult {
  return {
    ratio,
    wcagAA: {
      normalText: ratio >= 4.5,
      largeText: ratio >= 3,
    },
    wcagAAA: {
      normalText: ratio >= 7,
      largeText: ratio >= 4.5,
    },
  };
}

/**
 * Get contrast ratio and compliance for two colors
 * @param foreground - Foreground color (RGB)
 * @param background - Background color (RGB)
 * @returns Contrast result with WCAG compliance
 */
export function checkContrast(foreground: RGB, background: RGB): ContrastResult {
  const ratio = getContrastRatio(foreground, background);
  return checkContrastCompliance(ratio);
}

/* ========================================
   Color Parsing Utilities
   ======================================== */

/**
 * Parse HSL color string to RGB
 * @param hsl - HSL string (e.g., "277 92% 62%" or "hsl(277, 92%, 62%)")
 * @returns RGB color values
 */
export function hslToRgb(hsl: string): RGB {
  // Remove hsl() wrapper if present
  const values = hsl.replace(/hsl\(|\)/g, '').split(/[\s,]+/);

  const h = parseFloat(values[0]) / 360;
  const s = parseFloat(values[1]) / 100;
  const l = parseFloat(values[2]) / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // Achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Parse hex color string to RGB
 * @param hex - Hex color string (e.g., "#a855f7" or "a855f7")
 * @returns RGB color values
 */
export function hexToRgb(hex: string): RGB {
  const cleanHex = hex.replace('#', '');

  if (cleanHex.length === 3) {
    // Expand shorthand (e.g., "a5f" → "aa55ff")
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return { r, g, b };
  }

  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return { r, g, b };
  }

  throw new Error(`Invalid hex color: ${hex}`);
}

/**
 * Get token value from DOM and convert to RGB
 * @param tokenName - CSS custom property name (with or without --)
 * @param element - Element to query (defaults to document.documentElement)
 * @returns RGB color values
 */
export function getTokenRgb(tokenName: string, element?: HTMLElement): RGB {
  const el = element || document.documentElement;
  const token = tokenName.startsWith('--') ? tokenName : `--${tokenName}`;
  const value = getComputedStyle(el).getPropertyValue(token).trim();

  // Try HSL first (our token format)
  if (value.includes(' ') && value.includes('%')) {
    return hslToRgb(value);
  }

  // Try hex
  if (value.startsWith('#')) {
    return hexToRgb(value);
  }

  // Try rgb()
  if (value.startsWith('rgb')) {
    const values = value.replace(/rgb\(|\)/g, '').split(',');
    return {
      r: parseInt(values[0]),
      g: parseInt(values[1]),
      b: parseInt(values[2]),
    };
  }

  throw new Error(`Unable to parse color value: ${value}`);
}

/**
 * Check contrast between two design tokens
 * @param foregroundToken - Foreground color token name
 * @param backgroundToken - Background color token name
 * @param element - Element to query (defaults to document.documentElement)
 * @returns Contrast result with WCAG compliance
 *
 * @example
 * ```ts
 * const result = checkTokenContrast('--color-text-primary', '--color-bg-base');
 * console.log(result.wcagAA.normalText); // true if ratio >= 4.5:1
 * ```
 */
export function checkTokenContrast(
  foregroundToken: string,
  backgroundToken: string,
  element?: HTMLElement,
): ContrastResult {
  const fg = getTokenRgb(foregroundToken, element);
  const bg = getTokenRgb(backgroundToken, element);
  return checkContrast(fg, bg);
}

/* ========================================
   Preset Color Constants (for testing)
   ======================================== */

export const WHITE: RGB = { r: 255, g: 255, b: 255 };
export const BLACK: RGB = { r: 0, g: 0, b: 0 };
export const GRAY_50: RGB = { r: 249, g: 249, b: 251 }; // --color-neutral-50
export const GRAY_900: RGB = { r: 15, g: 17, b: 26 }; // --color-neutral-900
export const PURPLE_500: RGB = { r: 168, g: 85, b: 247 }; // --color-purple-500
export const BLUE_500: RGB = { r: 59, g: 130, b: 246 }; // --color-blue-500
export const DARK_BG: RGB = { r: 10, g: 10, b: 15 }; // --color-bg-dark
