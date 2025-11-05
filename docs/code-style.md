# TypeScript Code Style

## Purpose & Scope
LLM teammates must follow this guide when writing or editing TypeScript. Formatting and linting are owned by automated tools; the rules below cover structural and stylistic decisions not enforced by those tools.

## Module & File Conventions
- Keep files focused; if a module exceeds one responsibility or becomes hard to scan, split it instead of exceeding arbitrary LOC caps.
- Use named exports by default; reserve default exports for framework-required entry points.
- Prefer absolute import aliases (e.g., `@/memory/store`) over deep relative paths once tooling supports it.
- Group imports: Node built-ins → external packages → internal modules, separated by blank lines.

## Type System Usage
- Favor `interface` for contracts consumed by multiple modules; use `type` for unions, mapped types, or aliases.
- Model state machines with discriminated unions rather than boolean flags.
- Treat `any` as forbidden; start from `unknown` and narrow explicitly.
- Derive literal types from constants (`as const`) to keep enums and message roles in sync.

## Functions & Classes
- Keep functions small and purposeful; extract helpers when branching or side effects multiply.
- Prefer pure functions for graph logic; isolate I/O in adapters or service classes.
- Inject dependencies (LLM clients, stores) via parameters or constructors to simplify testing and swapping implementations.
- Avoid unnecessary classes—favor functions and object literals unless stateful behavior is required.

## Async & Error Handling
- Standardize on `async/await`; avoid mixing with `.then()` chains for readability.
- Surface domain errors with typed error classes or `Result` objects instead of generic `Error` instances when context matters.
- Ensure every `await` lives inside try/catch where failure is expected; propagate errors with context rather than silent fallbacks.
- Close over cancellations and abort signals where possible to keep long-running LangGraph operations interruptible.

## Testing Patterns
- Mirror production import paths in tests; keep test files alongside source files with `.test.ts` suffixes.
- Name tests after observable behavior (`shouldPersistMemorySnapshotOnSuccess`) rather than implementation details.
- Prefer real factories or builders over hand-rolled objects; centralize them under `test/support/`.
- Use Vitest lifecycle hooks sparingly; reset shared state in `beforeEach` to avoid cross-test coupling.

## Comments & Documentation
- Write comments to explain intent, trade-offs, or links to decision documents; delete comments that merely restate obvious code.
- Add TSDoc blocks to exported functions or types when the signature alone does not convey usage.
- Reference decision documents with relative links (`docs/decisions/adr/...`, `docs/decisions/tdr/...`) when extra context is required.
- Capture TODOs with issue numbers (`TODO(#123):`) and avoid leaving anonymous TODOs in shared code.

## Component Composition & Design Library

**Context**: All UI components must use the `@workspace/ui` design library (Constitution Principle IX). Check Storybook at `http://localhost:6006` before creating components.

### Import Patterns

```typescript
// GOOD: Import primitives from design library
import { Box, Stack, Text, Button } from '@workspace/ui';

// BAD: Create one-off components in apps/client
import { CustomCard } from './components/ui/Card'; // ❌ Should be in @workspace/ui
```

### Primitive Composition

Use Box, Stack, Text, and Button to compose layouts instead of raw HTML or Tailwind divs:

```tsx
// GOOD: Compose with primitives and token props
<Stack direction="vertical" spacing={4}>
  <Text variant="heading" size="lg">
    Welcome
  </Text>
  <Box padding={6} backgroundColor="bg-surface" borderRadius="lg">
    <Text variant="body">Content goes here</Text>
  </Box>
  <Button variant="primary" size="md">
    Get Started
  </Button>
</Stack>

// BAD: Hardcoded Tailwind classes and inline styling
<div className="flex flex-col gap-4">
  <h2 className="text-2xl font-bold text-purple-500">Welcome</h2>
  <div className="p-6 bg-gray-900 rounded-xl">
    <p>Content goes here</p>
  </div>
  <button className="px-6 py-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
    Get Started
  </button>
</div>
```

### Token Props vs Inline Tailwind

Prefer token props over inline Tailwind classes to maintain theme consistency:

```tsx
// GOOD: Token-driven props (theme-aware, supports dark/light modes)
<Box
  padding={4}              // Maps to --space-4 token
  backgroundColor="bg-surface"  // Maps to --color-bg-surface semantic token
  borderRadius="lg"        // Maps to --radius-lg token
>
  Content
</Box>

// BAD: Hardcoded Tailwind utilities (breaks theming, not maintainable)
<div className="p-4 bg-gray-900 rounded-lg">
  Content
</div>
```

### Polymorphic Components

Use the `as` prop to render components as different HTML elements:

```tsx
// Render Box as a <section> instead of <div>
<Box as="section" padding={8}>
  <Text as="h1" variant="heading">Page Title</Text>
</Box>

// Render Button as a link
<Button as="a" href="/about" variant="secondary">
  Learn More
</Button>
```

### When to Extract to Design Library

Extract a component to `/packages/ui/` when:

1. **Reusability**: Used in 2+ places across apps
2. **Complexity**: Has variants, states, or complex styling logic
3. **Consistency**: Needs to match Neon Flux aesthetic with gradients/glows/glassmorphism
4. **Token usage**: Requires semantic tokens for theming support

**Example**: Creating a Card component

```typescript
// /packages/ui/src/components/primitives/card.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ComponentPropsWithoutRef, type ElementType } from 'react';
import { cn } from '../utils/cn';

const cardVariants = cva(
  'backdrop-blur-md border transition-all', // Base styles
  {
    variants: {
      variant: {
        default: 'bg-bg-surface border-border-default',
        elevated: 'bg-bg-surface border-border-default shadow-glow-purple',
        ghost: 'bg-transparent border-transparent',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  },
);

type CardProps<T extends ElementType = 'div'> = {
  as?: T;
} & VariantProps<typeof cardVariants> &
  ComponentPropsWithoutRef<T>;

export const Card = forwardRef<HTMLElement, CardProps>(
  ({ as: Component = 'div', variant, padding, className, ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    />
  ),
) as <T extends ElementType = 'div'>(
  props: CardProps<T> & { ref?: React.Ref<HTMLElement> },
) => React.ReactElement;

Card.displayName = 'Card';
```

Then create Storybook documentation:

```typescript
// /packages/ui/src/stories/Card.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Card } from '../components/primitives/card';

const meta: Meta<typeof Card> = {
  title: 'Components/Primitives/Card',
  component: Card,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Card content',
  },
};

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    children: 'Elevated card with glow effect',
  },
};
```

### Anti-Patterns to Avoid

```tsx
// ❌ Creating component directories in apps/client
apps/client/src/components/ui/Card.tsx  // Should be in packages/ui/

// ❌ Hardcoding colors instead of using tokens
<div className="bg-purple-500 text-white">  // Use bg-accent-primary, text-text-primary

// ❌ Mixing design systems
import { Button } from '@mui/material';  // Use @workspace/ui Button

// ❌ Skipping Storybook documentation
// Component exists but no .stories.tsx file → undocumented, unmaintainable

// ❌ No tests for "simple" components
// Even basic components need unit + a11y tests for WCAG compliance
```

### Design Library Contribution Checklist

When adding a component to `/packages/ui/`, ensure:

- [ ] Component file in `/packages/ui/src/components/primitives/` or `/packages/ui/src/components/`
- [ ] TypeScript props interface with proper types
- [ ] CVA variants for visual variations (size, variant, state)
- [ ] Token-driven styling (use `--color-*`, `--space-*`, `--radius-*` tokens)
- [ ] Polymorphic `as` prop if semantically flexible
- [ ] Unit tests in `/packages/ui/__tests__/components/`
- [ ] Accessibility tests with axe-core
- [ ] Storybook stories in `/packages/ui/src/stories/` (at least 3 variants)
- [ ] Exported from `/packages/ui/src/index.ts`
- [ ] Used in at least one app to validate real-world usage

See Constitution Principle IX for complete workflow and rationale.
