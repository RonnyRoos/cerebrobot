# Token API Contract

**Feature**: Professional Design System with Neon Flux Theme  
**Version**: 1.0.0  
**Date**: 2025-11-02

---

## Overview

This contract defines the CSS custom property naming conventions, token categories, and usage patterns for the Cerebrobot design system.

---

## Token Naming Convention

### Pattern

```
--{category}-{property}-{variant?}
```

### Rules

1. **Prefix**: All tokens start with `--` (CSS custom property standard)
2. **Case**: Kebab-case (lowercase with hyphens)
3. **Namespace**: No prefix (scoped to `@workspace/ui` package)
4. **Semantics**: Use semantic names (`text-primary`) over descriptive (`gray-900`)
5. **Variants**: Suffixes for states/contexts (`hover`, `active`, `on-dark`)

### Examples

```css
/* ✅ Correct */
--color-text-primary
--color-bg-surface
--space-4
--font-size-body
--shadow-glow-purple
--button-bg-hover

/* ❌ Incorrect */
--primary-color          /* Category not specified */
--color_text_primary     /* Underscores not allowed */
--colorTextPrimary       /* camelCase not allowed */
--color-gray-900         /* Descriptive, not semantic */
--cerebroColorText       /* No namespace prefix */
```

---

## Token Categories

### 1. Color Tokens

**Prefix**: `--color-`

**Subcategories**:
- **Text**: `--color-text-{variant}`
- **Background**: `--color-bg-{variant}`
- **Border**: `--color-border-{variant}`
- **Accent**: `--color-accent-{variant}`

**Format**: HSL without `hsl()` wrapper (Tailwind convention)
```css
--color-text-primary: 240 5% 97%;  /* Not: hsl(240, 5%, 97%) */
```

**Usage**: Use with opacity via Tailwind
```css
/* CSS */
background: hsl(var(--color-bg-surface) / 0.2);

/* Tailwind */
<div className="bg-bg-surface/20">
```

**Primitive Tokens** (descriptive):
```css
--color-purple-500: 277 92% 62%;
--color-blue-500: 221 91% 60%;
--color-pink-500: 330 81% 60%;
--color-cyan-500: 187 95% 43%;
--color-neutral-50: 240 5% 97%;
--color-neutral-900: 222 47% 11%;
```

**Semantic Tokens** (role-based):
```css
--color-text-primary: var(--color-neutral-900);     /* Dark text (light theme) */
--color-text-secondary: var(--color-neutral-600);
--color-text-on-dark: var(--color-neutral-50);      /* Light text (dark theme) */
--color-bg-surface: var(--color-neutral-50);
--color-bg-elevated: #ffffff;
--color-border-subtle: var(--color-neutral-200);
--color-accent-primary: var(--color-purple-500);
--color-accent-secondary: var(--color-blue-500);
```

**Theme Overrides** (dark mode):
```css
.theme-dark {
  --color-text-primary: var(--color-neutral-50);
  --color-bg-surface: 240 20% 5%;  /* #0a0a0f */
}
```

---

### 2. Spacing Tokens

**Prefix**: `--space-`

**Pattern**: `--space-{multiplier}`

**Base Unit**: 4px (0.25rem)

**Scale**:
```css
--space-1: 0.25rem;   /*  4px */
--space-2: 0.5rem;    /*  8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

**Usage**:
```css
/* CSS */
padding: var(--space-4);
gap: var(--space-2);

/* Tailwind (extended config) */
<div className="p-4 gap-2">
```

**Migration from Existing**:
```css
/* Old (Tailwind defaults) */
padding: 1.25rem;  /* px-5 = 20px */

/* New (token-based) */
padding: var(--space-5);  /* 1.25rem = 20px */
```

---

### 3. Typography Tokens

**Prefix**: `--font-`

**Subcategories**:
- **Font Family**: `--font-family-{variant}`
- **Font Size**: `--font-size-{variant}`
- **Line Height**: `--line-height-{variant}`
- **Font Weight**: `--font-weight-{variant}`
- **Letter Spacing**: `--letter-spacing-{variant}`

**Font Families**:
```css
--font-family-sans: 'Geist', system-ui, -apple-system, sans-serif;
--font-family-mono: 'Geist Mono', 'Courier New', monospace;
```

**Font Sizes** (rem-based):
```css
--font-size-xs: 0.75rem;    /* 12px */
--font-size-sm: 0.875rem;   /* 14px */
--font-size-base: 1rem;     /* 16px */
--font-size-lg: 1.125rem;   /* 18px */
--font-size-xl: 1.25rem;    /* 20px */
--font-size-2xl: 1.5rem;    /* 24px */
--font-size-3xl: 1.875rem;  /* 30px */
--font-size-4xl: 2.25rem;   /* 36px */
```

**Composite Tokens** (preset combinations):
```css
--font-heading-1: var(--font-weight-bold) var(--font-size-4xl) / var(--line-height-tight) var(--font-family-sans);
--font-body: var(--font-weight-normal) var(--font-size-base) / var(--line-height-normal) var(--font-family-sans);
--font-code: var(--font-weight-normal) var(--font-size-sm) / var(--line-height-normal) var(--font-family-mono);
```

**Usage**:
```css
/* Individual tokens */
font-family: var(--font-family-sans);
font-size: var(--font-size-lg);

/* Composite (shorthand) */
font: var(--font-heading-1);
```

---

### 4. Elevation Tokens (Shadows)

**Prefix**: `--shadow-`

**Subcategories**:
- **Depth Shadows**: `--shadow-{size}` (sm, md, lg, xl)
- **Glow Effects**: `--shadow-glow-{color}` (Neon Flux aesthetic)

**Depth Shadows**:
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);
```

**Glow Shadows** (Neon Flux):
```css
--shadow-glow-purple: 0 0 20px rgba(168, 85, 247, 0.3);
--shadow-glow-blue: 0 0 20px rgba(59, 130, 246, 0.3);
--shadow-glow-pink: 0 0 20px rgba(236, 72, 153, 0.3);
--shadow-glow-cyan: 0 0 20px rgba(6, 182, 212, 0.3);
```

**Usage**:
```css
box-shadow: var(--shadow-glow-purple);

/* Multiple shadows */
box-shadow: var(--shadow-md), var(--shadow-glow-purple);
```

**Migration from Existing**:
```css
/* Old (hardcoded) */
box-shadow: 0 0 20px rgba(168, 85, 247, 0.3);

/* New (token) */
box-shadow: var(--shadow-glow-purple);
```

---

### 5. Border Radius Tokens

**Prefix**: `--radius-`

**Pattern**: `--radius-{size}`

**Scale**:
```css
--radius-none: 0;
--radius-sm: 0.25rem;   /*  4px */
--radius-md: 0.5rem;    /*  8px */
--radius-lg: 1rem;      /* 16px */
--radius-xl: 1.5rem;    /* 24px */
--radius-full: 9999px;  /* Pill shape */
```

**Usage**:
```css
border-radius: var(--radius-lg);

/* Tailwind */
<div className="rounded-lg">
```

**Migration from Existing**:
```css
/* Old (Tailwind class) */
rounded-2xl  /* 1rem */

/* New (token) */
--radius-lg  /* 1rem */
```

---

### 6. Blur Tokens (Glassmorphism)

**Prefix**: `--blur-`

**Pattern**: `--blur-{intensity}`

**Scale**:
```css
--blur-sm: 4px;
--blur-md: 12px;
--blur-lg: 24px;
```

**Usage**:
```css
backdrop-filter: blur(var(--blur-md));

/* Tailwind (custom utility) */
<div className="backdrop-blur-md">
```

**Glassmorphism Pattern** (Neon Flux):
```css
.glassmorphic-surface {
  background: hsl(var(--color-bg-surface) / 0.2);
  backdrop-filter: blur(var(--blur-md));
  border: 1px solid hsl(var(--color-border-subtle) / 0.3);
  box-shadow: var(--shadow-glow-purple);
}
```

---

## Token Tier Architecture

### Tier 1: Primitive Tokens (Base Layer)

**Purpose**: Context-free, fundamental values

**Naming**: Descriptive (color scale, size number)

**Examples**:
```css
--color-purple-500: 277 92% 62%;
--space-4: 1rem;
--font-size-base: 1rem;
```

**Rules**:
- No references to other tokens (hardcoded values only)
- Organized by scale (color: 50-900, spacing: 1-16)
- Never used directly in components (use semantic tokens instead)

---

### Tier 2: Semantic Tokens (Alias Layer)

**Purpose**: Role-based references to primitives

**Naming**: Semantic (purpose, not appearance)

**Examples**:
```css
--color-text-primary: var(--color-neutral-900);
--spacing-card-padding: var(--space-4);
--font-body: var(--font-size-base);
```

**Rules**:
- Always reference primitive tokens via `var(--token-name)`
- Change based on theme (light/dark)
- Preferred for component styling

---

### Tier 3: Component Tokens (Component Layer) - Optional

**Purpose**: UI-specific tokens (use sparingly)

**Naming**: Component-scoped

**Examples**:
```css
--button-bg-primary: var(--color-accent-primary);
--message-bubble-glow: var(--shadow-glow-purple);
```

**Rules**:
- Only create if component has complex token logic
- Most components should use semantic tokens directly
- Useful for backward compatibility during migration

---

## Theme Switching

### CSS Class-Based Theming

**Root Element**:
```html
<html class="theme-dark">
```

**Theme Classes**:
- `.theme-dark` - Default (Neon Flux)
- `.theme-light` - Light mode
- `.theme-high-contrast` - Accessibility mode

**Token Overrides**:
```css
/* Default (dark) */
:root {
  --color-text-primary: 240 5% 97%;
  --color-bg-surface: 240 20% 5%;
}

/* Light theme override */
.theme-light {
  --color-text-primary: 222 47% 11%;
  --color-bg-surface: 240 5% 96%;
}

/* High-contrast override */
.theme-high-contrast {
  --color-text-primary: #ffffff;
  --color-bg-surface: #000000;
  --shadow-glow-purple: none; /* Remove decorative shadows */
}
```

### JavaScript API

```typescript
// Set theme
document.documentElement.className = 'theme-dark';

// Persist to localStorage
localStorage.setItem('cerebro-theme', 'dark');

// Read from localStorage
const savedTheme = localStorage.getItem('cerebro-theme') || 'dark';
```

---

## Backward Compatibility

### Migration Strategy

**Phase 1**: Add new tokens alongside existing (aliases)
```css
/* Existing (spec 012) */
--color-message-user-bg: 277 92% 62%;

/* New primitive */
--color-purple-500: 277 92% 62%;

/* New semantic */
--color-accent-primary: var(--color-purple-500);

/* Backward-compatible alias */
--color-message-user-bg: var(--color-accent-primary);
```

**Phase 2**: Update components to use semantic tokens

**Phase 3**: Deprecate component-specific tokens (version 2.0)

### Deprecation Policy

1. Mark token as deprecated (add comment)
2. Add console warning in development mode
3. Provide replacement token in documentation
4. Remove in next major version (1 major version grace period)

**Example**:
```css
/* @deprecated Use --color-accent-primary instead. Removed in v2.0 */
--color-message-user-bg: var(--color-accent-primary);
```

---

## Token Documentation Format

Each token must include:

1. **Name**: CSS custom property name
2. **Value**: Default value (or reference)
3. **Category**: Token category (color, spacing, etc.)
4. **Description**: Usage context and purpose
5. **Example**: Code snippet showing usage
6. **Contrast** (colors only): WCAG ratios for light/dark backgrounds

**Example**:
```markdown
### --color-text-primary

- **Value**: `240 5% 97%` (light text for dark mode)
- **Category**: Color → Text
- **Description**: Primary text color, adapts to theme (dark text on light, light text on dark)
- **Contrast**: 
  - Light mode: 15.8:1 (WCAG AAA)
  - Dark mode: 17.2:1 (WCAG AAA)
- **Usage**:
  ```css
  color: hsl(var(--color-text-primary));
  ```
```

---

## Tooling Integration

### TypeScript Type Safety

```typescript
// Auto-generated from tokens
type ColorToken = 
  | '--color-text-primary'
  | '--color-text-secondary'
  | '--color-bg-surface'
  // ... all color tokens

type SpacingToken =
  | '--space-1'
  | '--space-2'
  // ... all spacing tokens

// Usage
const color: ColorToken = '--color-text-primary'; // ✅ Type-safe
const invalid: ColorToken = '--color-invalid'; // ❌ Type error
```

### Tailwind Config Extension

```javascript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        'text-primary': 'hsl(var(--color-text-primary))',
        'bg-surface': 'hsl(var(--color-bg-surface))',
      },
      spacing: {
        '1': 'var(--space-1)',
        '4': 'var(--space-4)',
      },
      boxShadow: {
        'glow-purple': 'var(--shadow-glow-purple)',
        'glow-blue': 'var(--shadow-glow-blue)',
      }
    }
  }
};
```

---

## Validation Rules

### Linting

**ESLint Rule**: Detect hardcoded colors/spacing
```javascript
// ❌ Fail
const style = { color: '#a855f7' };
const padding = '16px';

// ✅ Pass
const style = { color: 'hsl(var(--color-accent-primary))' };
const padding = 'var(--space-4)';
```

### Testing

**Unit Test**: Verify token resolution
```typescript
test('--color-text-primary resolves correctly', () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  
  const computed = getComputedStyle(el).getPropertyValue('--color-text-primary');
  expect(computed).toBe('240 5% 97%');
});
```

**Visual Regression**: Theme switching
```typescript
test('theme switch does not cause layout shift', async () => {
  const before = await page.screenshot();
  await page.evaluate(() => {
    document.documentElement.className = 'theme-light';
  });
  const after = await page.screenshot();
  
  const diff = await compareScreenshots(before, after);
  expect(diff.layoutShift).toBe(0);
});
```

---

**Next**: See [component-api.md](component-api.md) for component primitive contracts.
