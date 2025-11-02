# Data Model: Design System Tokens & Primitives

**Feature**: Professional Design System with Neon Flux Theme  
**Phase**: 1 (Planning)  
**Date**: 2025-11-02

---

## Overview

This document defines the data structures for design tokens, theme configurations, and component primitives. All structures are implemented as TypeScript interfaces for type safety and CSS custom properties for runtime styling.

---

## Token Naming Convention

**Pattern**: `--{category}-{property}-{variant?}`

**Rules**:
1. All tokens prefixed with `--` (CSS custom property standard)
2. Kebab-case (lowercase with hyphens)
3. No namespace prefix (tokens scoped to `@workspace/ui`)
4. Semantic names over descriptive (`text-primary` not `gray-900`)
5. Variants as suffixes (`button-bg-hover`, `text-on-dark`)

**Examples**:
- `--color-text-primary` (color category, text property, primary variant)
- `--space-4` (spacing category, size 4)
- `--font-size-body` (typography category, font-size property, body variant)
- `--shadow-glow-purple` (elevation category, glow variant, purple color)

---

## 1. Design Token Interfaces

### 1.1 Base Token Interface

```typescript
/**
 * Base interface for all design tokens
 */
interface DesignToken {
  /** Token name (CSS custom property format: --category-property-variant) */
  name: string;
  
  /** CSS value (supports CSS custom property references) */
  value: string | number;
  
  /** Token category for organization */
  category: 'color' | 'typography' | 'spacing' | 'elevation' | 'radius' | 'blur';
  
  /** Human-readable description (for documentation) */
  description?: string;
  
  /** Deprecation notice (if token is being phased out) */
  deprecated?: {
    reason: string;
    replacedBy?: string; // Name of replacement token
    removedIn?: string;  // Version when removed
  };
}
```

---

### 1.2 Color Token

```typescript
/**
 * Color token with light/dark theme variants
 * HSL format without hsl() wrapper (Tailwind convention for opacity support)
 */
interface ColorToken extends DesignToken {
  category: 'color';
  
  /** HSL values as string: "hue saturation% lightness%" */
  value: string; // e.g., "277 92% 62%" for purple
  
  /** Hex representation (for documentation/tooling) */
  hex: string; // e.g., "#a855f7"
  
  /** Whether this is a semantic token (references primitive) or primitive */
  semantic: boolean;
  
  /** Light/dark theme variants (if different) */
  variants?: {
    light: string; // HSL format
    dark: string;  // HSL format
  };
  
  /** WCAG contrast ratio against common backgrounds (for validation) */
  contrastRatio?: {
    onLight: number;  // Ratio against white/light backgrounds
    onDark: number;   // Ratio against black/dark backgrounds
  };
  
  /** Usage context (helps developers choose correct token) */
  usage: 'text' | 'background' | 'border' | 'accent' | 'gradient' | 'shadow';
}
```

**Example**:
```typescript
{
  name: '--color-text-primary',
  value: '240 5% 97%', // Light text for dark mode
  hex: '#f8fafc',
  category: 'color',
  semantic: true,
  variants: {
    light: '222 47% 11%', // Dark text for light mode (#1e293b)
    dark: '240 5% 97%'    // Light text for dark mode (#f8fafc)
  },
  contrastRatio: {
    onLight: 15.8, // Exceeds WCAG AAA
    onDark: 17.2
  },
  usage: 'text',
  description: 'Primary text color, adapts to theme'
}
```

---

### 1.3 Typography Token

```typescript
/**
 * Typography token for font properties
 */
interface TypographyToken extends DesignToken {
  category: 'typography';
  
  /** Font family stack */
  fontFamily?: string; // e.g., "Geist, system-ui, sans-serif"
  
  /** Font size in rem units */
  fontSize?: string; // e.g., "1rem", "1.5rem"
  
  /** Line height (unitless multiplier or specific value) */
  lineHeight?: string | number; // e.g., 1.6, "1.5rem"
  
  /** Font weight (100-900) */
  fontWeight?: number; // e.g., 400, 700
  
  /** Letter spacing (em units or px) */
  letterSpacing?: string; // e.g., "0.05em", "-0.02em"
  
  /** Text transform (if applicable) */
  textTransform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
}
```

**Example**:
```typescript
{
  name: '--font-heading-1',
  category: 'typography',
  fontSize: '2.25rem',   // 36px
  lineHeight: 1.2,
  fontWeight: 700,
  letterSpacing: '-0.02em',
  description: 'H1 heading style'
}
```

---

### 1.4 Spacing Token

```typescript
/**
 * Spacing token based on 4px base unit
 */
interface SpacingToken extends DesignToken {
  category: 'spacing';
  
  /** Pixel value (multiple of 4px) */
  value: string; // e.g., "1rem" (16px = 4 * 4px)
  
  /** Multiplier from base unit (4px) */
  multiplier: number; // e.g., 4 for 16px
  
  /** Rem equivalent (for responsive scaling) */
  rem: string; // e.g., "1rem"
}
```

**Scale** (4px base unit):
```typescript
const spacingScale = {
  '--space-1': { value: '0.25rem', multiplier: 1 },   // 4px
  '--space-2': { value: '0.5rem', multiplier: 2 },    // 8px
  '--space-3': { value: '0.75rem', multiplier: 3 },   // 12px
  '--space-4': { value: '1rem', multiplier: 4 },      // 16px
  '--space-5': { value: '1.25rem', multiplier: 5 },   // 20px
  '--space-6': { value: '1.5rem', multiplier: 6 },    // 24px
  '--space-8': { value: '2rem', multiplier: 8 },      // 32px
  '--space-10': { value: '2.5rem', multiplier: 10 },  // 40px
  '--space-12': { value: '3rem', multiplier: 12 },    // 48px
  '--space-16': { value: '4rem', multiplier: 16 },    // 64px
};
```

**Migration Note**: Existing components use `px-5` (20px) which becomes `--space-5` (1.25rem).

---

### 1.5 Elevation Token (Shadows)

```typescript
/**
 * Elevation token for box shadows
 */
interface ElevationToken extends DesignToken {
  category: 'elevation';
  
  /** CSS box-shadow value */
  value: string;
  
  /** Elevation level (0 = flat, 6 = floating) */
  level: number;
  
  /** Whether this is a glow effect (Neon Flux aesthetic) */
  glow?: boolean;
  
  /** Associated color (for glow shadows) */
  color?: string; // e.g., "purple", "blue"
}
```

**Examples**:
```typescript
{
  name: '--shadow-sm',
  category: 'elevation',
  value: '0 1px 2px rgba(0, 0, 0, 0.05)',
  level: 1,
  description: 'Subtle elevation for cards'
}

{
  name: '--shadow-glow-purple',
  category: 'elevation',
  value: '0 0 20px rgba(168, 85, 247, 0.3)',
  level: 3,
  glow: true,
  color: 'purple',
  description: 'Neon Flux purple glow (user messages)'
}

{
  name: '--shadow-glow-blue',
  category: 'elevation',
  value: '0 0 20px rgba(59, 130, 246, 0.3)',
  level: 3,
  glow: true,
  color: 'blue',
  description: 'Neon Flux blue glow (agent messages)'
}
```

---

### 1.6 Border Radius Token

```typescript
/**
 * Border radius token for corner rounding
 */
interface RadiusToken extends DesignToken {
  category: 'radius';
  
  /** CSS border-radius value */
  value: string; // e.g., "0.5rem", "50%"
  
  /** Size variant */
  size: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
}
```

**Scale**:
```typescript
const radiusScale = {
  '--radius-none': { value: '0', size: 'none' },
  '--radius-sm': { value: '0.25rem', size: 'sm' },    // 4px
  '--radius-md': { value: '0.5rem', size: 'md' },     // 8px
  '--radius-lg': { value: '1rem', size: 'lg' },       // 16px
  '--radius-xl': { value: '1.5rem', size: 'xl' },     // 24px (current rounded-2xl)
  '--radius-full': { value: '9999px', size: 'full' }, // Pill shape
};
```

**Migration Note**: Current `rounded-2xl` (1rem) maps to `--radius-lg`.

---

### 1.7 Blur Token (Glassmorphism)

```typescript
/**
 * Backdrop blur token for glassmorphism effects
 */
interface BlurToken extends DesignToken {
  category: 'blur';
  
  /** CSS backdrop-filter blur value */
  value: string; // e.g., "12px", "24px"
  
  /** Blur intensity */
  intensity: 'sm' | 'md' | 'lg';
}
```

**Scale**:
```typescript
const blurScale = {
  '--blur-sm': { value: '4px', intensity: 'sm' },
  '--blur-md': { value: '12px', intensity: 'md' },  // Current backdrop-blur-md
  '--blur-lg': { value: '24px', intensity: 'lg' },
};
```

---

## 2. Theme Configuration

```typescript
/**
 * Theme configuration defining token overrides
 */
interface ThemeConfig {
  /** Theme identifier */
  name: 'neon-flux' | 'light' | 'high-contrast' | string;
  
  /** Theme appearance (affects CSS class) */
  appearance: 'light' | 'dark';
  
  /** Color token overrides (semantic tokens only) */
  colors: Record<string, string>; // e.g., { '--color-text-primary': '240 5% 97%' }
  
  /** Gradient definitions (Neon Flux specific) */
  gradients?: {
    primary: string;   // e.g., "linear-gradient(135deg, #a855f7, #ec4899)"
    secondary: string;
    accent: string;
  };
  
  /** Glassmorphism settings */
  glassmorphism?: {
    enabled: boolean;
    blur: string;        // References --blur-* token
    opacity: number;     // 0-1 for background opacity
  };
  
  /** Accessibility overrides (for high-contrast theme) */
  accessibility?: {
    minContrast: number; // 4.5 for AA, 7 for AAA
    reduceMotion: boolean;
    removeGradients: boolean; // High-contrast replaces gradients with solids
  };
}
```

**Example - Neon Flux Theme**:
```typescript
{
  name: 'neon-flux',
  appearance: 'dark',
  colors: {
    '--color-text-primary': '240 5% 97%',
    '--color-bg-surface': '240 20% 5%', // Dark background
    '--color-accent-primary': '277 92% 62%', // Purple
    '--color-accent-secondary': '221 91% 60%', // Blue
  },
  gradients: {
    primary: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
    secondary: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
    accent: 'radial-gradient(circle, #a855f7 0%, transparent 70%)'
  },
  glassmorphism: {
    enabled: true,
    blur: '--blur-md',
    opacity: 0.2
  }
}
```

---

## 3. Component Primitive Interfaces

### 3.1 Box Primitive

```typescript
/**
 * Foundational layout primitive (renders div by default)
 */
interface BoxProps<T extends ElementType = 'div'> {
  /** Polymorphic element type */
  as?: T;
  
  /** Token-based styling props */
  color?: string;        // References --color-* token
  bg?: string;           // Background color token
  p?: keyof typeof spacingScale;  // Padding (e.g., '4' -> --space-4)
  px?: keyof typeof spacingScale; // Horizontal padding
  py?: keyof typeof spacingScale; // Vertical padding
  m?: keyof typeof spacingScale;  // Margin
  borderRadius?: keyof typeof radiusScale; // Border radius
  shadow?: string;       // References --shadow-* token
  
  /** Layout props */
  display?: 'block' | 'inline-block' | 'flex' | 'grid' | 'inline-flex';
  
  /** Standard HTML props */
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  
  /** Element-specific props (TypeScript infers based on 'as') */
} & ComponentPropsWithoutRef<T>;
```

**Usage**:
```tsx
<Box as="section" bg="--color-bg-surface" p="4" borderRadius="lg">
  Content
</Box>
```

---

### 3.2 Stack Primitive

```typescript
/**
 * Layout primitive for vertical/horizontal stacking with consistent spacing
 */
interface StackProps extends Omit<BoxProps, 'display'> {
  /** Stack direction */
  direction: 'row' | 'column';
  
  /** Gap between children (spacing token) */
  spacing: keyof typeof spacingScale; // e.g., '4' -> --space-4
  
  /** Alignment */
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  
  /** Wrap behavior */
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
}
```

**Usage**:
```tsx
<Stack direction="column" spacing="4" align="start">
  <Text>Item 1</Text>
  <Text>Item 2</Text>
</Stack>
```

---

### 3.3 Text Primitive

```typescript
/**
 * Typography primitive with automatic token application
 */
interface TextProps<T extends ElementType = 'span'> {
  /** Polymorphic element type */
  as?: T;
  
  /** Typography variant (applies preset tokens) */
  variant?: 'heading-1' | 'heading-2' | 'heading-3' | 'body' | 'caption' | 'code';
  
  /** Font size override (typography token) */
  size?: string; // e.g., '--font-size-lg'
  
  /** Font weight override */
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  
  /** Color override (color token) */
  color?: string;
  
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  
  children: ReactNode;
  className?: string;
}
```

**Usage**:
```tsx
<Text variant="heading-1">Welcome</Text>
<Text variant="body" color="--color-text-secondary">Description</Text>
```

---

### 3.4 Button Primitive

```typescript
/**
 * Interactive button primitive with theme-aware variants
 */
interface ButtonProps extends Omit<ComponentPropsWithoutRef<'button'>, 'color'> {
  /** Visual variant */
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  
  /** Loading state */
  loading?: boolean;
  
  /** Icon (left/right) */
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  
  children: ReactNode;
  className?: string;
}
```

**Token Mapping**:
```typescript
const buttonVariants = {
  primary: {
    bg: '--color-accent-primary',
    color: '--color-text-on-dark',
    shadow: '--shadow-glow-purple'
  },
  secondary: {
    bg: '--color-accent-secondary',
    color: '--color-text-on-dark',
    shadow: '--shadow-glow-blue'
  },
  ghost: {
    bg: 'transparent',
    color: '--color-text-primary',
    border: '--color-border-subtle'
  }
};
```

---

## 4. Token Tier Structure

### Primitive Tokens (Base Layer)
- **Purpose**: Context-free, fundamental values
- **Examples**: `--color-purple-500`, `--space-4`, `--font-size-base`
- **Naming**: Descriptive (color scale, size number)

### Semantic Tokens (Alias Layer)
- **Purpose**: Role-based references to primitives
- **Examples**: `--color-text-primary`, `--color-bg-surface`, `--spacing-card-padding`
- **Naming**: Semantic (purpose, not appearance)
- **References**: Point to primitive tokens via CSS custom property

### Component Tokens (Component Layer)
- **Purpose**: UI-specific tokens (optional, use sparingly)
- **Examples**: `--button-bg-primary`, `--message-bubble-glow`
- **Naming**: Component-scoped
- **Note**: Most components should use semantic tokens directly

---

## 5. Token Versioning & Deprecation

```typescript
/**
 * Token change log entry
 */
interface TokenChange {
  version: string;          // Semver (1.0.0, 1.1.0, etc.)
  date: string;             // ISO date
  type: 'added' | 'changed' | 'deprecated' | 'removed';
  tokens: string[];         // Token names affected
  reason: string;           // Why the change was made
  migrationPath?: string;   // How to update code
}
```

**Deprecation Strategy**:
1. Mark token as deprecated in TypeScript interface
2. Add console warning in development mode (if token used)
3. Provide replacement token in `replacedBy` field
4. Remove in next major version (allow 1 major version grace period)

**Example**:
```typescript
{
  name: '--color-primary',
  deprecated: {
    reason: 'Renamed for clarity',
    replacedBy: '--color-accent-primary',
    removedIn: '2.0.0'
  }
}
```

---

## 6. Migration from Existing Code

### Current State (spec 012)
```css
.dark {
  --color-message-user-bg: 277 92% 62%;  /* Purple */
  --color-message-agent-bg: 221 91% 60%; /* Blue */
}
```

### New Token Structure
```css
/* Primitive tokens */
:root {
  --color-purple-500: 277 92% 62%;
  --color-blue-500: 221 91% 60%;
}

/* Semantic tokens (default: dark theme) */
:root {
  --color-accent-primary: var(--color-purple-500);
  --color-accent-secondary: var(--color-blue-500);
}

/* Component tokens (backwards compatibility) */
:root {
  --color-message-user-bg: var(--color-accent-primary);
  --color-message-agent-bg: var(--color-accent-secondary);
}
```

**Migration Path**:
1. Keep existing token names as aliases (backward compatible)
2. Add new token tiers (primitive, semantic)
3. Update components incrementally to use semantic tokens
4. Deprecate old component tokens in version 2.0

---

## 7. Token Export Formats

### TypeScript (Type Safety)
```typescript
// packages/ui/src/tokens/index.ts
export const tokens = {
  color: {
    text: {
      primary: '--color-text-primary',
      secondary: '--color-text-secondary',
    }
  },
  spacing: {
    1: '--space-1',
    4: '--space-4',
  }
} as const;

export type TokenPath = /* Auto-generated from tokens object */;
```

### CSS (Runtime)
```css
/* packages/ui/src/styles/tokens.css */
:root {
  --color-text-primary: 240 5% 97%;
  --space-4: 1rem;
}
```

### JSON (Tooling)
```json
{
  "color": {
    "text": {
      "primary": {
        "value": "240 5% 97%",
        "type": "color",
        "description": "Primary text color"
      }
    }
  }
}
```

---

**Next**: See [contracts/](contracts/) for API specifications and [quickstart.md](quickstart.md) for usage guide.
