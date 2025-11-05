# Component API Contract

**Feature**: Professional Design System with Neon Flux Theme  
**Version**: 1.0.0  
**Date**: 2025-11-02

---

## Overview

This contract defines the prop interfaces, composition patterns, and usage guidelines for the design system's component primitives: `Box`, `Stack`, `Text`, and `Button`.

---

## Design Principles

1. **Composition Over Configuration**: Prefer composing primitives over complex components
2. **Token-First Styling**: Use design tokens, not hardcoded values
3. **Polymorphic Components**: Support `as` prop for semantic HTML
4. **Accessibility by Default**: ARIA attributes, keyboard navigation, focus management
5. **Type Safety**: Full TypeScript support with strict types

---

## Box Component

### Purpose

Low-level layout primitive with token-based styling props.

### Props Interface

```typescript
import { ElementType, ComponentPropsWithoutRef } from 'react';

type BoxOwnProps<T extends ElementType> = {
  as?: T;
  
  // Spacing (token refs)
  p?: SpacingToken;     // padding
  px?: SpacingToken;    // padding-inline
  py?: SpacingToken;    // padding-block
  pt?: SpacingToken;    // padding-top
  pr?: SpacingToken;    // padding-right
  pb?: SpacingToken;    // padding-bottom
  pl?: SpacingToken;    // padding-left
  m?: SpacingToken;     // margin
  mx?: SpacingToken;    // margin-inline
  my?: SpacingToken;    // margin-block
  mt?: SpacingToken;    // margin-top
  mr?: SpacingToken;    // margin-right
  mb?: SpacingToken;    // margin-bottom
  ml?: SpacingToken;    // margin-left
  gap?: SpacingToken;   // gap
  
  // Color (token refs)
  color?: ColorToken;
  bg?: ColorToken;
  borderColor?: ColorToken;
  
  // Border radius (token refs)
  borderRadius?: RadiusToken;
  
  // Display
  display?: 'block' | 'inline-block' | 'flex' | 'inline-flex' | 'grid' | 'inline-grid' | 'none';
  
  // Flexbox
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  alignItems?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justifyContent?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  
  // Grid
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  
  // Width/Height
  width?: string | number;
  height?: string | number;
  maxWidth?: string | number;
  maxHeight?: string | number;
  minWidth?: string | number;
  minHeight?: string | number;
  
  // Overflow
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowX?: 'visible' | 'hidden' | 'scroll' | 'auto';
  overflowY?: 'visible' | 'hidden' | 'scroll' | 'auto';
  
  // Position
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  left?: string | number;
  
  // Other
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

type BoxProps<T extends ElementType> = BoxOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof BoxOwnProps<T>>;

export function Box<T extends ElementType = 'div'>(
  props: BoxProps<T>
): JSX.Element;
```

### Token Prop Mapping

Token props (`p`, `px`, `color`, etc.) map to CSS custom properties:

```typescript
// Internal implementation
const spacing = {
  '1': 'var(--space-1)',
  '2': 'var(--space-2)',
  '4': 'var(--space-4)',
  // ... all spacing tokens
};

const colors = {
  'text-primary': 'hsl(var(--color-text-primary))',
  'bg-surface': 'hsl(var(--color-bg-surface))',
  // ... all color tokens
};

// Usage
<Box p="4" color="text-primary" bg="bg-surface">
// Renders:
<div style={{
  padding: 'var(--space-4)',
  color: 'hsl(var(--color-text-primary))',
  background: 'hsl(var(--color-bg-surface))',
}}>
```

### Style Prop Merging Order

Styles cascade in this order (later overrides earlier):

1. **Base component styles** (internal defaults)
2. **Token props** (`p="4"`, `color="text-primary"`)
3. **className prop** (Tailwind classes)
4. **style prop** (inline styles)

**Example**:
```tsx
<Box
  p="4"                       // ② padding: var(--space-4)
  className="p-8"             // ③ padding: 2rem (Tailwind wins)
  style={{ padding: '32px' }} // ④ padding: 32px (inline wins)
>
```

### Polymorphic Behavior

The `as` prop changes the rendered element while preserving props:

```tsx
// Renders <div>
<Box>Default div</Box>

// Renders <section>
<Box as="section">Semantic section</Box>

// Renders <a> with href
<Box as="a" href="/agents">
  Link
</Box>

// TypeScript knows props based on 'as'
<Box as="button" disabled> {/* ✅ button props allowed */}
<Box as="div" disabled>    {/* ❌ Type error: disabled not valid on div */}
```

### Usage Examples

**Basic Layout**:
```tsx
<Box p="4" bg="bg-surface" borderRadius="lg">
  <Box mb="2" color="text-primary">Title</Box>
  <Box color="text-secondary">Description</Box>
</Box>
```

**Flex Container**:
```tsx
<Box display="flex" alignItems="center" justifyContent="space-between" gap="4">
  <Box>Left content</Box>
  <Box>Right content</Box>
</Box>
```

**Grid Layout**:
```tsx
<Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap="4">
  <Box>Item 1</Box>
  <Box>Item 2</Box>
  <Box>Item 3</Box>
</Box>
```

**Polymorphic Link**:
```tsx
<Box
  as="a"
  href="/agents"
  p="4"
  bg="bg-surface"
  borderRadius="lg"
  display="block"
>
  Navigate to agents
</Box>
```

---

## Stack Component

### Purpose

Opinionated layout primitive for vertical/horizontal spacing.

### Props Interface

```typescript
type StackProps = {
  /** Layout direction */
  direction?: 'vertical' | 'horizontal';
  
  /** Gap between items (token ref) */
  spacing?: SpacingToken;
  
  /** Alignment (flexbox align-items) */
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  
  /** Distribution (flexbox justify-content) */
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
  
  /** Allow wrapping */
  wrap?: boolean;
  
  /** Semantic HTML element */
  as?: 'div' | 'section' | 'article' | 'nav' | 'ul' | 'ol';
  
  /** Additional className */
  className?: string;
  
  /** Child elements */
  children: React.ReactNode;
};

export function Stack(props: StackProps): JSX.Element;
```

### Implementation Details

```typescript
function Stack({
  direction = 'vertical',
  spacing = '4',
  align,
  justify,
  wrap = false,
  as = 'div',
  className,
  children,
}: StackProps) {
  const Component = as;
  
  return (
    <Component
      className={cn(
        'flex',
        direction === 'vertical' ? 'flex-col' : 'flex-row',
        wrap && 'flex-wrap',
        className
      )}
      style={{
        gap: `var(--space-${spacing})`,
        alignItems: align,
        justifyContent: justify,
      }}
    >
      {children}
    </Component>
  );
}
```

### Usage Examples

**Vertical Stack** (default):
```tsx
<Stack spacing="4">
  <Box>Item 1</Box>
  <Box>Item 2</Box>
  <Box>Item 3</Box>
</Stack>
// Equivalent to:
<Box display="flex" flexDirection="column" gap="4">
```

**Horizontal Stack**:
```tsx
<Stack direction="horizontal" spacing="2" align="center">
  <Button>Cancel</Button>
  <Button variant="primary">Save</Button>
</Stack>
```

**Justified Stack**:
```tsx
<Stack direction="horizontal" justify="space-between" align="center">
  <Text variant="heading">Title</Text>
  <Button variant="ghost">Edit</Button>
</Stack>
```

**Wrapping Stack**:
```tsx
<Stack direction="horizontal" spacing="2" wrap>
  <Badge>Tag 1</Badge>
  <Badge>Tag 2</Badge>
  <Badge>Tag 3</Badge>
  {/* Wraps to next line if needed */}
</Stack>
```

**Semantic Stack**:
```tsx
<Stack as="nav" direction="horizontal" spacing="4">
  <a href="/">Home</a>
  <a href="/agents">Agents</a>
  <a href="/threads">Threads</a>
</Stack>
```

---

## Text Component

### Purpose

Typography primitive with semantic variants and token-based styling.

### Props Interface

```typescript
type TextProps = {
  /** Typographic variant (maps to token presets) */
  variant?: 
    | 'heading-1' | 'heading-2' | 'heading-3' | 'heading-4'
    | 'body' | 'body-large' | 'body-small'
    | 'caption' | 'code' | 'label';
  
  /** Font size override (token ref) */
  size?: FontSizeToken;
  
  /** Font weight override (token ref) */
  weight?: FontWeightToken;
  
  /** Line height override (token ref) */
  lineHeight?: LineHeightToken;
  
  /** Text color (token ref) */
  color?: ColorToken;
  
  /** Text alignment */
  align?: 'left' | 'center' | 'right' | 'justify';
  
  /** Truncation behavior */
  truncate?: boolean | number; // true = 1 line, number = max lines
  
  /** Semantic HTML element */
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'code';
  
  /** Additional className */
  className?: string;
  
  /** Child content */
  children: React.ReactNode;
};

export function Text(props: TextProps): JSX.Element;
```

### Variant Presets

Each variant maps to a combination of font tokens:

```typescript
const variantStyles = {
  'heading-1': {
    fontSize: 'var(--font-size-4xl)',
    fontWeight: 'var(--font-weight-bold)',
    lineHeight: 'var(--line-height-tight)',
    defaultAs: 'h1',
  },
  'heading-2': {
    fontSize: 'var(--font-size-3xl)',
    fontWeight: 'var(--font-weight-bold)',
    lineHeight: 'var(--line-height-tight)',
    defaultAs: 'h2',
  },
  'body': {
    fontSize: 'var(--font-size-base)',
    fontWeight: 'var(--font-weight-normal)',
    lineHeight: 'var(--line-height-normal)',
    defaultAs: 'p',
  },
  'code': {
    fontFamily: 'var(--font-family-mono)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-normal)',
    lineHeight: 'var(--line-height-normal)',
    defaultAs: 'code',
  },
  // ... other variants
};
```

### Usage Examples

**Headings**:
```tsx
<Text variant="heading-1">Page Title</Text>
<Text variant="heading-2" as="h2">Section Title</Text>
```

**Body Text**:
```tsx
<Text variant="body">This is regular body text.</Text>
<Text variant="body-small" color="text-secondary">
  This is smaller secondary text.
</Text>
```

**Code**:
```tsx
<Text variant="code">const x = 42;</Text>
```

**Truncation**:
```tsx
{/* Single-line truncation */}
<Text truncate>
  This is a very long line of text that will be truncated with an ellipsis...
</Text>

{/* Multi-line truncation (3 lines max) */}
<Text truncate={3}>
  This is a longer paragraph that will be clamped to 3 lines maximum...
</Text>
```

**Custom Overrides**:
```tsx
<Text variant="body" weight="bold" color="accent-primary">
  Custom styled text
</Text>
```

**Semantic Label**:
```tsx
<Text as="label" htmlFor="email" variant="label">
  Email Address
</Text>
```

---

## Button Component

### Purpose

Interactive button primitive with theme-aware variants and states.

### Props Interface

```typescript
type ButtonProps = {
  /** Visual variant (theme-aware) */
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  
  /** Full-width button */
  fullWidth?: boolean;
  
  /** Disabled state */
  disabled?: boolean;
  
  /** Loading state (shows spinner, disables interaction) */
  loading?: boolean;
  
  /** Icon before text */
  iconBefore?: React.ReactNode;
  
  /** Icon after text */
  iconAfter?: React.ReactNode;
  
  /** Icon-only button (no text) */
  iconOnly?: React.ReactNode;
  
  /** Semantic HTML element */
  as?: 'button' | 'a';
  
  /** Additional className */
  className?: string;
  
  /** Click handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  
  /** Child content */
  children?: React.ReactNode;
} & (
  // Polymorphic props based on 'as'
  | { as?: 'button'; type?: 'button' | 'submit' | 'reset' }
  | { as: 'a'; href: string; target?: string; rel?: string }
);

export function Button(props: ButtonProps): JSX.Element;
```

### Variant Styles (CVA-based)

```typescript
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center',
    'font-medium transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-accent-primary text-white',
          'hover:bg-accent-primary/90',
          'shadow-glow-purple hover:shadow-glow-purple/60',
        ],
        secondary: [
          'bg-bg-surface/20 text-text-primary',
          'border border-border-subtle',
          'hover:bg-bg-surface/30',
          'backdrop-blur-md',
        ],
        ghost: [
          'bg-transparent text-text-primary',
          'hover:bg-bg-surface/10',
        ],
        destructive: [
          'bg-error text-white',
          'hover:bg-error/90',
          'shadow-glow-red hover:shadow-glow-red/60',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-sm rounded-md',
        md: 'h-10 px-4 text-base rounded-lg',
        lg: 'h-12 px-6 text-lg rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);
```

### State Behaviors

**Disabled**:
```tsx
<Button disabled>Disabled Button</Button>
// Renders: opacity-50, cursor-not-allowed, no hover effects, onClick blocked
```

**Loading**:
```tsx
<Button loading>Saving...</Button>
// Renders: spinner icon, disabled interaction, preserves width
```

**Focus**:
```tsx
// Automatic focus ring (keyboard navigation)
<Button>Focusable</Button>
// Renders: focus-visible:ring-2 ring-accent-primary
```

### Usage Examples

**Primary Action**:
```tsx
<Button variant="primary" onClick={handleSave}>
  Save Changes
</Button>
```

**Secondary Action**:
```tsx
<Button variant="secondary">
  Cancel
</Button>
```

**Ghost Button (minimal)**:
```tsx
<Button variant="ghost" size="sm">
  Edit
</Button>
```

**Destructive Action**:
```tsx
<Button variant="destructive" onClick={handleDelete}>
  Delete Agent
</Button>
```

**With Icons**:
```tsx
import { PlusIcon } from 'lucide-react';

<Button iconBefore={<PlusIcon />}>
  Add Agent
</Button>

<Button iconAfter={<ArrowRightIcon />}>
  Next
</Button>

{/* Icon-only */}
<Button iconOnly={<EditIcon />} aria-label="Edit" />
```

**Loading State**:
```tsx
<Button loading={isSubmitting}>
  {isSubmitting ? 'Saving...' : 'Save'}
</Button>
```

**Link Button**:
```tsx
<Button as="a" href="/agents">
  View Agents
</Button>
```

**Full-Width**:
```tsx
<Button fullWidth>
  Submit Form
</Button>
```

---

## Accessibility Requirements

### ARIA Attributes

All interactive components must support ARIA props:

```typescript
// Button
<Button aria-label="Close dialog" iconOnly={<CloseIcon />} />

// Text as label
<Text as="label" htmlFor="email">Email</Text>

// Box as landmark
<Box as="nav" role="navigation" aria-label="Main navigation">
```

### Keyboard Navigation

**Button**:
- `Enter` / `Space` - Trigger action
- `Tab` - Focus next/previous
- Visible focus ring (`:focus-visible`)

**Links** (Button as="a"):
- `Enter` - Navigate
- `Tab` - Focus next/previous

**Custom Interactive Elements**:
```tsx
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

### Focus Management

**Focus Ring**:
```css
/* Token-based focus ring */
.focus-ring {
  outline: 2px solid hsl(var(--color-focus-ring));
  outline-offset: 2px;
}

/* Tailwind */
focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2
```

**Skip to Content**:
```tsx
<Box as="a" href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</Box>
```

---

## Testing Strategies

### Unit Tests (Vitest)

**Component Rendering**:
```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './button';

test('renders with correct variant', () => {
  render(<Button variant="primary">Click me</Button>);
  
  const button = screen.getByRole('button', { name: /click me/i });
  expect(button).toHaveClass('bg-accent-primary');
});
```

**Token Prop Mapping**:
```typescript
test('Box applies spacing tokens', () => {
  const { container } = render(<Box p="4">Content</Box>);
  
  const box = container.firstChild;
  const styles = getComputedStyle(box);
  expect(styles.padding).toBe('var(--space-4)');
});
```

**Polymorphic Behavior**:
```typescript
test('Box renders as custom element', () => {
  render(<Box as="section">Content</Box>);
  
  const section = screen.getByText('Content');
  expect(section.tagName).toBe('SECTION');
});
```

### Accessibility Tests (axe-core)

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('Button has no accessibility violations', async () => {
  const { container } = render(<Button>Click me</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

test('Button with iconOnly has aria-label', async () => {
  const { container } = render(
    <Button iconOnly={<CloseIcon />} aria-label="Close" />
  );
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Visual Regression Tests (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('Button variants render correctly', async ({ page }) => {
  await page.goto('/storybook?path=/story/button');
  
  await expect(page.getByRole('button', { name: 'Primary' })).toHaveScreenshot('button-primary.png');
  await expect(page.getByRole('button', { name: 'Secondary' })).toHaveScreenshot('button-secondary.png');
});

test('Button hover state', async ({ page }) => {
  await page.goto('/storybook?path=/story/button');
  
  const button = page.getByRole('button', { name: 'Primary' });
  await button.hover();
  
  await expect(button).toHaveScreenshot('button-primary-hover.png');
});
```

---

## Migration Guide

### From Existing Components

**MessageBubble → Box + Text**:
```tsx
// Old (spec 012)
<div className="bg-message-user-bg/20 backdrop-blur-md rounded-2xl p-5 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
  <p className="text-neutral-50">User message</p>
</div>

// New (spec 013)
<Box
  bg="accent-primary"
  p="5"
  borderRadius="xl"
  className="bg-opacity-20 backdrop-blur-md shadow-glow-purple"
>
  <Text color="text-on-dark">User message</Text>
</Box>
```

**Hardcoded Button → Button Component**:
```tsx
// Old
<button className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-400">
  Save
</button>

// New
<Button variant="primary">
  Save
</Button>
```

**Manual Flex Layout → Stack**:
```tsx
// Old
<div className="flex flex-col gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// New
<Stack spacing="4">
  <Box>Item 1</Box>
  <Box>Item 2</Box>
</Stack>
```

---

**Next**: See [theme-api.md](theme-api.md) for theming system contracts.
