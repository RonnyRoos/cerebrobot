# Quickstart Guide

**Feature**: Professional Design System with Neon Flux Theme  
**Audience**: Developers integrating the design system into Cerebrobot  
**Estimated Setup Time**: 15-30 minutes

---

## Prerequisites

- Node.js 18+ (LTS)
- pnpm 8+
- Familiarity with React, TypeScript, and Tailwind CSS

---

## Installation

### 1. Install Dependencies

The design system lives in the monorepo's `packages/ui` package:

```bash
# From repository root
pnpm install

# Build design system package
cd packages/ui
pnpm build
```

### 2. Import Design System

In your app (`apps/client` or similar):

```typescript
// Import theme provider
import { Theme } from '@workspace/ui/theme';

// Import component primitives
import { Box, Stack, Text, Button } from '@workspace/ui/components';

// Import token types (optional, for TypeScript)
import type { ColorToken, SpacingToken } from '@workspace/ui/types';
```

### 3. Wrap App in Theme Provider

```tsx
// apps/client/src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Theme } from '@workspace/ui/theme';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme appearance="dark" accentColor="purple" glassmorphism>
      <App />
    </Theme>
  </StrictMode>
);
```

### 4. Import Global Styles

```tsx
// apps/client/src/main.tsx
import '@workspace/ui/styles/globals.css'; // CSS custom properties
import '@workspace/ui/styles/tokens.css';  // Design tokens
import './index.css'; // Your app styles (Tailwind, etc.)
```

---

## Basic Usage

### Tokens in CSS

Use CSS custom properties for colors, spacing, typography, etc.:

```css
/* Your component CSS */
.my-component {
  /* Colors (HSL format for Tailwind opacity support) */
  color: hsl(var(--color-text-primary));
  background: hsl(var(--color-bg-surface) / 0.2); /* 20% opacity */
  
  /* Spacing */
  padding: var(--space-4);  /* 1rem = 16px */
  gap: var(--space-2);      /* 0.5rem = 8px */
  
  /* Typography */
  font-size: var(--font-size-base);   /* 1rem */
  line-height: var(--line-height-normal); /* 1.5 */
  
  /* Border radius */
  border-radius: var(--radius-lg); /* 1rem */
  
  /* Shadows (Neon Flux glow) */
  box-shadow: var(--shadow-glow-purple);
  
  /* Glassmorphism */
  backdrop-filter: blur(var(--blur-md));
}
```

### Tokens in Tailwind

Extend Tailwind config to use design tokens:

```javascript
// apps/client/tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic color tokens
        'text-primary': 'hsl(var(--color-text-primary))',
        'text-secondary': 'hsl(var(--color-text-secondary))',
        'text-on-dark': 'hsl(var(--color-text-on-dark))',
        'bg-surface': 'hsl(var(--color-bg-surface))',
        'bg-elevated': 'hsl(var(--color-bg-elevated))',
        'accent-primary': 'hsl(var(--color-accent-primary))',
        'accent-secondary': 'hsl(var(--color-accent-secondary))',
        'border-subtle': 'hsl(var(--color-border-subtle))',
      },
      spacing: {
        // Spacing scale (maps to --space-* tokens)
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '5': 'var(--space-5)',
        '6': 'var(--space-6)',
        '8': 'var(--space-8)',
        '10': 'var(--space-10)',
        '12': 'var(--space-12)',
        '16': 'var(--space-16)',
      },
      boxShadow: {
        // Elevation tokens
        'glow-purple': 'var(--shadow-glow-purple)',
        'glow-blue': 'var(--shadow-glow-blue)',
        'glow-pink': 'var(--shadow-glow-pink)',
        'glow-cyan': 'var(--shadow-glow-cyan)',
      },
      borderRadius: {
        // Radius tokens
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
      },
      backdropBlur: {
        // Glassmorphism
        'sm': 'var(--blur-sm)',
        'md': 'var(--blur-md)',
        'lg': 'var(--blur-lg)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

**Usage**:
```tsx
<div className="bg-accent-primary/20 text-text-on-dark p-4 rounded-lg shadow-glow-purple backdrop-blur-md">
  Neon Flux card with glassmorphism
</div>
```

---

## Component Primitives

### Box Component

Low-level layout primitive with token-based props:

```tsx
import { Box } from '@workspace/ui/components';

<Box
  p="4"                     // padding: var(--space-4)
  bg="bg-surface"           // background: hsl(var(--color-bg-surface))
  borderRadius="lg"         // border-radius: var(--radius-lg)
  display="flex"
  alignItems="center"
  gap="2"
>
  <Box color="text-primary">Content</Box>
</Box>
```

**Polymorphic** (change HTML element):
```tsx
<Box as="section" p="6">Section content</Box>
<Box as="a" href="/agents" p="4">Link styled as box</Box>
<Box as="button" onClick={handleClick}>Button styled as box</Box>
```

### Stack Component

Vertical/horizontal layout with consistent spacing:

```tsx
import { Stack } from '@workspace/ui/components';

{/* Vertical stack (default) */}
<Stack spacing="4">
  <Box>Item 1</Box>
  <Box>Item 2</Box>
  <Box>Item 3</Box>
</Stack>

{/* Horizontal stack */}
<Stack direction="horizontal" spacing="2" align="center">
  <Button variant="secondary">Cancel</Button>
  <Button variant="primary">Save</Button>
</Stack>

{/* Justified stack */}
<Stack direction="horizontal" justify="space-between" align="center">
  <Text variant="heading-2">Page Title</Text>
  <Button variant="ghost">Edit</Button>
</Stack>
```

### Text Component

Typography primitive with semantic variants:

```tsx
import { Text } from '@workspace/ui/components';

{/* Headings */}
<Text variant="heading-1">Page Title</Text>
<Text variant="heading-2" as="h2">Section Title</Text>

{/* Body text */}
<Text variant="body">Regular paragraph text.</Text>
<Text variant="body-small" color="text-secondary">
  Smaller secondary text.
</Text>

{/* Code */}
<Text variant="code">const x = 42;</Text>

{/* Truncation */}
<Text truncate>
  This is a very long line that will be truncated...
</Text>

{/* Custom overrides */}
<Text variant="body" weight="bold" color="accent-primary">
  Custom styled text
</Text>
```

### Button Component

Interactive button with theme-aware variants:

```tsx
import { Button } from '@workspace/ui/components';

{/* Primary action */}
<Button variant="primary" onClick={handleSave}>
  Save Changes
</Button>

{/* Secondary action */}
<Button variant="secondary">
  Cancel
</Button>

{/* Ghost button (minimal) */}
<Button variant="ghost" size="sm">
  Edit
</Button>

{/* Destructive action */}
<Button variant="destructive" onClick={handleDelete}>
  Delete Agent
</Button>

{/* With icons */}
import { PlusIcon } from 'lucide-react';

<Button iconBefore={<PlusIcon />}>
  Add Agent
</Button>

{/* Loading state */}
<Button loading={isSubmitting}>
  {isSubmitting ? 'Saving...' : 'Save'}
</Button>

{/* Full-width */}
<Button fullWidth>
  Submit Form
</Button>

{/* Link button */}
<Button as="a" href="/agents">
  View Agents
</Button>
```

---

## Theme Switching

### useTheme Hook

Access and manipulate theme state:

```tsx
import { useTheme } from '@workspace/ui/theme';

function ThemeToggle() {
  const { appearance, toggleAppearance } = useTheme();
  
  return (
    <button onClick={toggleAppearance}>
      {appearance === 'dark' ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}
```

### Accent Color Picker

```tsx
import { useTheme } from '@workspace/ui/theme';

function AccentColorPicker() {
  const { accentColor, setAccentColor } = useTheme();
  
  const colors = ['purple', 'blue', 'pink', 'cyan'] as const;
  
  return (
    <div className="flex gap-2">
      {colors.map((color) => (
        <button
          key={color}
          onClick={() => setAccentColor(color)}
          className={accentColor === color ? 'ring-2' : ''}
          style={{ background: `hsl(var(--color-${color}-500))` }}
        >
          {color}
        </button>
      ))}
    </div>
  );
}
```

### Conditional Rendering

```tsx
import { useTheme } from '@workspace/ui/theme';

function Logo() {
  const { appearance } = useTheme();
  
  return (
    <img
      src={appearance === 'dark' ? '/logo-dark.svg' : '/logo-light.svg'}
      alt="Cerebrobot"
    />
  );
}
```

---

## Glassmorphism (Neon Flux Aesthetic)

### Glassmorphic Surface Pattern

```tsx
import { Box } from '@workspace/ui/components';

<Box
  p="6"
  borderRadius="xl"
  className="glassmorphic-surface"
>
  Content with glassmorphism
</Box>
```

**CSS**:
```css
.glassmorphic-surface {
  background: hsl(var(--color-bg-surface) / 0.2); /* Semi-transparent */
  backdrop-filter: blur(var(--blur-md));          /* Blur effect */
  border: 1px solid hsl(var(--color-border-subtle) / 0.3);
  box-shadow: var(--shadow-glow-purple);          /* Neon glow */
}

/* Disable on reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .glassmorphic-surface {
    backdrop-filter: none;
  }
}
```

### Message Bubble Example

```tsx
import { Box, Text } from '@workspace/ui/components';

function MessageBubble({ variant, children }: Props) {
  const glowColor = variant === 'user' ? 'purple' : 'blue';
  
  return (
    <Box
      p="5"
      borderRadius="xl"
      bg={variant === 'user' ? 'accent-primary' : 'accent-secondary'}
      className={`bg-opacity-20 backdrop-blur-md shadow-glow-${glowColor}`}
    >
      <Text color="text-on-dark">{children}</Text>
    </Box>
  );
}
```

---

## TypeScript Usage

### Import Token Types

```typescript
import type {
  ColorToken,
  SpacingToken,
  FontSizeToken,
  RadiusToken,
  ShadowToken,
} from '@workspace/ui/types';

// Example: Type-safe token props
type CardProps = {
  bgColor?: ColorToken;
  padding?: SpacingToken;
  borderRadius?: RadiusToken;
};

function Card({ bgColor = 'bg-surface', padding = '4', borderRadius = 'lg' }: CardProps) {
  return (
    <Box bg={bgColor} p={padding} borderRadius={borderRadius}>
      Card content
    </Box>
  );
}
```

### Component Prop Types

```typescript
import type { BoxProps, StackProps, TextProps, ButtonProps } from '@workspace/ui/components';

// Extend Box component
type CustomBoxProps = BoxProps<'div'> & {
  customProp?: string;
};

function CustomBox(props: CustomBoxProps) {
  const { customProp, ...boxProps } = props;
  return <Box {...boxProps} />;
}
```

---

## Migration from Existing Code

### Step 1: Replace Hardcoded Colors

**Before**:
```tsx
<div className="bg-purple-500 text-white p-5 rounded-2xl">
  Content
</div>
```

**After**:
```tsx
<Box bg="accent-primary" color="text-on-dark" p="5" borderRadius="xl">
  Content
</Box>
```

### Step 2: Replace Hardcoded Shadows

**Before**:
```tsx
<div className="shadow-[0_0_20px_rgba(168,85,247,0.3)]">
```

**After**:
```tsx
<div className="shadow-glow-purple">
```

### Step 3: Use Stack for Layouts

**Before**:
```tsx
<div className="flex flex-col gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

**After**:
```tsx
<Stack spacing="4">
  <Box>Item 1</Box>
  <Box>Item 2</Box>
</Stack>
```

### Step 4: Use Text for Typography

**Before**:
```tsx
<h1 className="text-2xl font-bold text-white">Title</h1>
<p className="text-sm text-gray-400">Description</p>
```

**After**:
```tsx
<Text variant="heading-1" color="text-on-dark">Title</Text>
<Text variant="body-small" color="text-secondary">Description</Text>
```

---

## Accessibility

### Contrast Ratios

All token pairs meet **WCAG AA** (4.5:1 for text, 3:1 for UI components):

```typescript
// Validate contrast in tests
import { getContrastRatio } from '@workspace/ui/utils';

const textColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-text-primary');
const bgColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-bg-surface');

const ratio = getContrastRatio(textColor, bgColor);
console.log(`Contrast ratio: ${ratio.toFixed(2)}:1`); // e.g., 17.2:1 (AAA)
```

### Keyboard Navigation

All interactive components support keyboard navigation:

```tsx
// Buttons
<Button>Focusable</Button> {/* Tab to focus, Enter/Space to activate */}

// Custom interactive elements
<Box
  as="button"
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Custom button
</Box>
```

### ARIA Labels

```tsx
// Icon-only buttons
<Button iconOnly={<CloseIcon />} aria-label="Close dialog" />

// Text as label
<Text as="label" htmlFor="email">Email Address</Text>
<input id="email" type="email" />

// Landmarks
<Box as="nav" role="navigation" aria-label="Main navigation">
  {/* Nav links */}
</Box>
```

---

## Performance

### Theme Switching

Target: < 150ms for theme change

```typescript
// Measure theme switch performance
const start = performance.now();
setTheme('light');
requestAnimationFrame(() => {
  const duration = performance.now() - start;
  console.log(`Theme switch: ${duration.toFixed(2)}ms`);
});
```

### Optimization Tips

1. **Disable transitions during theme switch** (optional):
```css
.no-transitions,
.no-transitions * {
  transition: none !important;
}
```

2. **Use CSS custom properties** (fastest):
```css
/* All theme changes via CSS variables */
:root {
  --color-text-primary: 240 5% 97%;
}
.theme-light {
  --color-text-primary: 222 47% 11%;
}
```

3. **Lazy load theme variants**:
```typescript
// Only load light theme CSS when needed
const { appearance } = useTheme();

useEffect(() => {
  if (appearance === 'light' && !document.getElementById('theme-light-css')) {
    const link = document.createElement('link');
    link.id = 'theme-light-css';
    link.rel = 'stylesheet';
    link.href = '/themes/light.css';
    document.head.appendChild(link);
  }
}, [appearance]);
```

---

## Testing

### Unit Tests (Vitest)

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from '@workspace/ui/components';

test('renders button with variant', () => {
  render(<Button variant="primary">Click me</Button>);
  
  const button = screen.getByRole('button', { name: /click me/i });
  expect(button).toHaveClass('bg-accent-primary');
});
```

### Accessibility Tests (axe-core)

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('Button has no a11y violations', async () => {
  const { container } = render(<Button>Click me</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Visual Regression (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('Button primary variant', async ({ page }) => {
  await page.goto('/storybook?path=/story/button--primary');
  await expect(page.getByRole('button')).toHaveScreenshot('button-primary.png');
});
```

---

## Troubleshooting

### Issue: Tokens not applying

**Problem**: CSS custom properties not resolved

**Solution**: Ensure global styles imported
```tsx
import '@workspace/ui/styles/globals.css';
import '@workspace/ui/styles/tokens.css';
```

### Issue: Theme not persisting

**Problem**: localStorage not saving theme

**Solution**: Check `disableStorage` prop
```tsx
<Theme disableStorage={false}> {/* Enable storage */}
  <App />
</Theme>
```

### Issue: Glassmorphism not visible

**Problem**: `backdrop-filter` not supported or disabled

**Solution**: Fallback to solid background
```css
.glassmorphic-surface {
  background: hsl(var(--color-bg-surface)); /* Fallback */
}

@supports (backdrop-filter: blur(12px)) {
  .glassmorphic-surface {
    background: hsl(var(--color-bg-surface) / 0.2);
    backdrop-filter: blur(var(--blur-md));
  }
}
```

### Issue: Contrast ratio too low

**Problem**: Text not readable on background

**Solution**: Use token pairs with verified contrast
```tsx
{/* ✅ Good: Verified pair */}
<Box bg="bg-surface" color="text-primary">

{/* ❌ Bad: Unverified pair */}
<Box bg="accent-primary" color="accent-secondary">
```

---

## Next Steps

1. **Explore Token Catalog**: Review all available tokens in Storybook
2. **Read API Contracts**: [token-api.md](contracts/token-api.md), [component-api.md](contracts/component-api.md), [theme-api.md](contracts/theme-api.md)
3. **Migrate Existing Components**: Follow [migration-strategy.md](contracts/migration-strategy.md)
4. **Contribute**: Report issues, suggest improvements via GitHub

---

## Resources

- **Specification**: [spec.md](spec.md) - Complete design system requirements
- **Implementation Plan**: [plan.md](plan.md) - Migration roadmap
- **Data Model**: [data-model.md](data-model.md) - Token interfaces and naming conventions
- **Contracts**: [contracts/](contracts/) - API documentation
- **Current State Audit**: [current-state-audit.md](current-state-audit.md) - Existing implementation analysis

---

**Questions?** Refer to the contracts or open an issue in the repository.
