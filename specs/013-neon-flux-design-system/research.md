# Research: Design System Best Practices

**Date**: 2025-11-02 | **Phase**: 0 (Pre-Implementation Research)  
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Executive Summary

This research combines **current state analysis** (Playwright audit + codebase inspection) with **industry best practices** (DTCG spec, Radix UI, Material Design) to create a migration strategy for systematizing Cerebrobot's existing Neon Flux implementation.

**Current State**: 
- ✅ Neon Flux aesthetic exists in chat components (glassmorphism, purple/blue, glow effects)
- ✅ CSS custom properties foundation (12 color tokens for chat)
- ❌ No token architecture (flat structure, chat-only)
- ❌ Inconsistent theming (chat dark, agents dark-plain, threads light)
- ❌ No primitives outside chat

**Key Decisions**:
1. **Extract existing tokens** into three-tier architecture (primitive → semantic → component)
2. **Preserve Neon Flux aesthetic** and extend to all pages (brand consistency)
3. **Backward-compatible migration** of existing chat components
4. **CSS custom properties** for zero-cost theming (already in use)
5. **Tailwind integration** via config extensions (already configured)
6. **MDX documentation** with interactive examples (new)

---

## 0. Current Implementation Analysis

**Source**: [current-state-audit.md](current-state-audit.md) (Playwright browser inspection + codebase review)

### 0.1 Existing CSS Custom Properties

**File**: `packages/ui/src/theme/globals.css`

**Current Structure** (Flat, Chat-Only):
```css
:root {
  /* Light Mode - Chat Colors */
  --color-message-user-bg: 239 84% 67%;     /* Soft blue HSL */
  --color-message-user-text: 222 47% 11%;   /* Dark text */
  --color-message-agent-bg: 240 5% 96%;     /* Light gray */
  --color-code-block-bg: 0 0% 98%;          /* Near-white */
  --color-code-block-border: 0 0% 89%;      /* Light border */
  --color-timestamp: 240 4% 46%;            /* Muted gray */
  --color-link: 221 83% 53%;                /* Link blue */
  --color-copy-button: 0 0% 60%;            /* Gray */
  --color-copy-button-success: 142 71% 45%; /* Green */
}

.dark {
  /* Dark Mode (Neon Flux) - Chat Colors */
  --color-message-user-bg: 277 92% 62%;     /* Purple #a855f7 */
  --color-message-user-text: 240 5% 97%;    /* Light text #f8fafc */
  --color-message-agent-bg: 221 91% 60%;    /* Blue #3b82f6 */
  --color-code-block-bg: 240 20% 5%;        /* Dark bg #0a0a0f */
  --color-code-block-border: 277 92% 62%;   /* Purple border */
  --color-link: 187 95% 43%;                /* Cyan #06b6d4 */
  --color-copy-button: 277 92% 62%;         /* Purple */
}
```

**Format Notes**:
- HSL values **without `hsl()` wrapper** (Tailwind convention for opacity control)
- Usage: `bg-message-user-bg/20` → `background: hsl(277 92% 62% / 0.2)`
- All values are chat-specific (messages, code blocks, timestamps)

**Missing Tokens**:
- ❌ Spacing (padding, margin, gap)
- ❌ Typography (font-size, line-height, font-weight)
- ❌ Border radius (rounded corners)
- ❌ Elevation (shadows for cards, modals, dropdowns)
- ❌ General UI colors (buttons, forms, backgrounds, borders)

### 0.2 Existing Neon Flux Aesthetic

**Component**: `MessageBubble` (`packages/ui/src/chat/message-bubble.tsx`)

**Neon Flux Characteristics**:
```tsx
const messageBubbleVariants = cva(
  'rounded-2xl px-5 py-4 backdrop-blur-md border shadow-lg',
  {
    variants: {
      sender: {
        user: 'bg-message-user-bg/20 border-message-user-bg/30 shadow-[0_0_20px_rgba(168,85,247,0.3)]',
        //     ^^^ Transparent bg   ^^^ Border opacity   ^^^ Purple glow
        agent: 'bg-message-agent-bg/15 border-message-agent-bg/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]',
        //      ^^^ Transparent bg   ^^^ Border opacity   ^^^ Blue glow
      },
    },
  },
);
```

**Pattern**: 
1. **Glassmorphism**: `backdrop-blur-md` (12px blur)
2. **Transparent backgrounds**: Token color with opacity (`/20` = 20%)
3. **Subtle borders**: Token color with lower opacity (`/30` = 30%)
4. **Glow shadows**: Hardcoded box-shadow with RGB color + opacity
5. **Rounded corners**: `rounded-2xl` (1rem / 16px)

**Hardcoded Values to Extract**:
- ❌ `shadow-[0_0_20px_rgba(168,85,247,0.3)]` → Should be `--shadow-glow-purple`
- ❌ `shadow-[0_0_20px_rgba(59,130,246,0.3)]` → Should be `--shadow-glow-blue`
- ❌ `rounded-2xl` → Should use `--radius-lg` token
- ❌ `backdrop-blur-md` → Should use `--blur-md` token
- ❌ Opacity values (`/20`, `/30`) → Should be semantic (`/surface`, `/border`)

### 0.3 Existing Color Palette (Neon Flux)

**Extracted from Code & Audit**:

| Color | HSL (Current) | Hex | Usage |
|-------|---------------|-----|-------|
| **Purple** | `277 92% 62%` | `#a855f7` | User messages, primary accent, borders |
| **Blue** | `221 91% 60%` | `#3b82f6` | Agent messages, secondary accent |
| **Pink** | `330 81% 60%` | `#ec4899` | (Referenced in spec 012, not in current code) |
| **Cyan** | `187 95% 43%` | `#06b6d4` | Links, tertiary accent |
| **Dark BG** | `240 20% 5%` | `#0a0a0f` | Code block backgrounds |
| **Light Text** | `240 5% 97%` | `#f8fafc` | Text on dark backgrounds |
| **Dark Text** | `222 47% 11%` | `#1e293b` | Text on light backgrounds |

**Decision**: Keep these exact values as primitive tokens, add missing colors (pink, neutrals scale)

### 0.4 Theming Inconsistency

**Current Pages**:

1. **Chat View** (`ChatView` component):
   - Theme: **Dark (Neon Flux)**
   - Glassmorphism: ✅ Yes
   - Colors: Purple/blue gradients
   - Status: Fully styled

2. **Agents Page** (`/agents`):
   - Theme: **Dark (Plain)**
   - Glassmorphism: ❌ No
   - Colors: Black background, basic dark mode
   - Status: Missing Neon Flux aesthetic

3. **Thread List** (`/`):
   - Theme: **Light**
   - Glassmorphism: ❌ No
   - Colors: White background, gray text
   - Status: Missing Neon Flux aesthetic

**Problem**: No unified theming mechanism, pages have different styles

**Solution**: 
1. Apply Neon Flux (dark mode) to all pages by default
2. Add theme switching (localStorage + CSS class)
3. Create light/high-contrast variants with same visual language (glassmorphism, glow effects)

### 0.5 Migration Priorities

**P1 (Must Have - MVP)**:
1. ✅ Extract existing colors into token architecture
2. ✅ Add spacing/typography/radius/elevation tokens
3. ✅ Refactor `MessageBubble` to use token-based shadows (not hardcoded)
4. ✅ Extend Neon Flux to agents/threads pages
5. ✅ Create component primitives (Box, Stack, Text, Button)

**P2 (Should Have)**:
1. ✅ Theme switching (dark/light)
2. ✅ Migrate all chat components to new token system
3. ✅ Refactor agents/threads to use primitives

**P3 (Nice to Have)**:
1. ✅ High-contrast theme
2. ✅ Component catalog documentation
3. ✅ Accessibility audit

---

## 1. Design Token Architecture (DTCG Specification)

**Source**: Design Tokens Community Group (W3C Community Group)  
**Reference**: [DTCG Format Specification](https://design-tokens.github.io/community-group/format/)

### 1.1 Token Tiers

The DTCG specification recommends a hierarchical token structure:

#### Primitive Tokens (Base Layer)
- **Purpose**: Fundamental, context-free values
- **Naming**: Descriptive (color scale, size scale)
- **Examples**:
  ```json
  {
    "color": {
      "purple": {
        "500": { "$value": "#a855f7", "$type": "color" },
        "600": { "$value": "#9333ea", "$type": "color" }
      },
      "neutral": {
        "50": { "$value": "#fafafa", "$type": "color" },
        "900": { "$value": "#171717", "$type": "color" }
      }
    },
    "font": {
      "size": {
        "xs": { "$value": "0.75rem", "$type": "dimension" },
        "base": { "$value": "1rem", "$type": "dimension" },
        "lg": { "$value": "1.125rem", "$type": "dimension" }
      }
    },
    "space": {
      "1": { "$value": "0.25rem", "$type": "dimension" },
      "4": { "$value": "1rem", "$type": "dimension" },
      "8": { "$value": "2rem", "$type": "dimension" }
    }
  }
  ```

#### Semantic Tokens (Alias Layer)
- **Purpose**: Role-based references to primitives
- **Naming**: Semantic (purpose, not appearance)
- **Examples**:
  ```json
  {
    "color": {
      "text": {
        "primary": { "$value": "{color.neutral.900}" },
        "secondary": { "$value": "{color.neutral.600}" },
        "inverse": { "$value": "{color.neutral.50}" }
      },
      "bg": {
        "surface": { "$value": "{color.neutral.50}" },
        "elevated": { "$value": "#ffffff" }
      }
    }
  }
  ```

#### Component Tokens (Component Layer)
- **Purpose**: UI-specific tokens
- **Naming**: Component-scoped
- **Examples**:
  ```json
  {
    "button": {
      "bg": {
        "primary": { "$value": "{color.purple.500}" },
        "hover": { "$value": "{color.purple.600}" }
      },
      "text": {
        "primary": { "$value": "{color.neutral.50}" }
      }
    }
  }
  ```

### 1.2 Token Properties

DTCG defines standard properties for all tokens:

| Property | Required | Description | Example |
|----------|----------|-------------|---------|
| `$value` | ✅ Yes | The token value | `"#a855f7"`, `"1rem"`, `"Geist"` |
| `$type` | ⚠️ Recommended | Token type hint | `"color"`, `"dimension"`, `"fontFamily"` |
| `$description` | ❌ Optional | Human-readable docs | `"Primary brand color"` |
| `$extensions` | ❌ Optional | Tool-specific metadata | `{ "figma": { "id": "S:123" } }` |

### 1.3 Standard Token Types

| Type | Value Format | CSS Property | Example |
|------|--------------|--------------|---------|
| `color` | Hex, RGB, HSL | `color`, `background-color`, `border-color` | `#a855f7`, `rgb(168, 85, 247)`, `hsl(271, 91%, 65%)` |
| `dimension` | px, rem, em, % | `width`, `height`, `padding`, `margin` | `1rem`, `16px`, `100%` |
| `fontFamily` | Font name(s) | `font-family` | `"Geist, sans-serif"` |
| `fontWeight` | Number (100-900) | `font-weight` | `400`, `700` |
| `duration` | ms, s | `transition-duration`, `animation-duration` | `150ms`, `0.3s` |
| `cubicBezier` | Array of 4 numbers | `transition-timing-function` | `[0.4, 0, 0.2, 1]` |

**Decision for Cerebrobot**:
- Use three-tier structure (primitive → semantic → component)
- Prioritize semantic tokens for application code
- Include `$type` for all tokens (improves tooling support)
- Document high-value tokens with `$description`

---

## 2. Component Composition Patterns (Radix UI Themes)

**Source**: Radix UI Themes documentation  
**Reference**: [Radix Themes - Theming](https://www.radix-ui.com/themes/docs/theme/overview)

### 2.1 Theme Component API

Radix UI Themes uses a `<Theme>` component for declarative theming:

```tsx
<Theme
  appearance="dark"          // 'light' | 'dark'
  accentColor="purple"       // Brand color
  grayColor="slate"          // Neutral color scale
  panelBackground="solid"    // 'solid' | 'translucent'
  radius="large"             // 'none' | 'small' | 'medium' | 'large' | 'full'
  scaling="100%"             // '90%' | '95%' | '100%' | '105%' | '110%'
>
  {children}
</Theme>
```

**Key Features**:
- **Nesting**: Child themes override parent themes (scoped theming)
- **CSS Variables**: All theme props map to CSS custom properties
- **SSR-safe**: No flash of unstyled content (FOUC)
- **Type-safe**: TypeScript types for all props

**Decision for Cerebrobot**:
- Adopt `<Theme>` component pattern
- Support `appearance` (light/dark), `accentColor` (purple/pink/blue), `radius` (small/medium/large)
- Skip `scaling` prop (UI density not in Phase 1 scope)
- Use CSS class-based theming (`.theme-dark`, `.theme-light`) for simple implementation

### 2.2 CSS Variable Naming Conventions

Radix UI uses predictable, scale-based naming:

#### Color Scales (12-step system)
```css
--accent-1  /* Lightest (backgrounds) */
--accent-2
--accent-3
...
--accent-9  /* Interactive states */
--accent-10
--accent-11 /* Low-contrast text */
--accent-12 /* High-contrast text (darkest) */
```

**Usage**:
- Steps 1-3: Backgrounds (app background, subtle backgrounds, UI elements)
- Steps 4-6: Borders (subtle, UI, hovered)
- Steps 7-9: Solid backgrounds (interactive states)
- Steps 10-12: Text (low-contrast, high-contrast)

#### Spacing Scale (9-step system)
```css
--space-1  /* 0.25rem (4px) */
--space-2  /* 0.5rem (8px) */
--space-3  /* 0.75rem (12px) */
--space-4  /* 1rem (16px) */
--space-5  /* 1.5rem (24px) */
--space-6  /* 2rem (32px) */
--space-7  /* 2.5rem (40px) */
--space-8  /* 3rem (48px) */
--space-9  /* 4rem (64px) */
```

**Base Unit**: 4px (aligns with common design systems)

#### Radius Scale (6-step system)
```css
--radius-1  /* 0.125rem (2px) */
--radius-2  /* 0.25rem (4px) */
--radius-3  /* 0.5rem (8px) */
--radius-4  /* 0.75rem (12px) */
--radius-5  /* 1rem (16px) */
--radius-6  /* 1.5rem (24px) */
```

#### Shadow Scale (6-step system)
```css
--shadow-1  /* Subtle elevation */
--shadow-2
...
--shadow-6  /* Maximum elevation */
```

**Decision for Cerebrobot**:
- Adopt numerical naming for primitive tokens (`.color-purple-500`, `--space-4`)
- Use semantic naming for application tokens (`--color-text-primary`, `--color-bg-surface`)
- Follow 4px spacing scale (matches Tailwind CSS)
- Support 12-step color scales for theming flexibility

### 2.3 Polymorphic Components

Radix UI primitives use polymorphic `as` prop for HTML element override:

```tsx
// Default: renders <div>
<Box>Content</Box>

// Override: renders <section>
<Box as="section">Content</Box>

// With React component
<Box as={Link} href="/home">Link content</Box>
```

**Implementation Pattern**:
```tsx
type BoxProps<T extends ElementType = 'div'> = {
  as?: T;
  className?: string;
  children?: ReactNode;
} & ComponentPropsWithoutRef<T>;

function Box<T extends ElementType = 'div'>({
  as,
  className,
  children,
  ...props
}: BoxProps<T>) {
  const Component = as || 'div';
  return (
    <Component className={cn('box', className)} {...props}>
      {children}
    </Component>
  );
}
```

**Benefits**:
- Flexible semantic HTML (use `<nav>`, `<article>`, `<section>` without wrapper divs)
- Type-safe props (TypeScript infers correct props for the element)
- Style reuse (same styles, different HTML)

**Decision for Cerebrobot**:
- Implement polymorphic `as` prop for Box, Stack, Text primitives
- Not needed for Button (always renders `<button>` or `<a>`)

### 2.4 Style Prop Merging

Radix UI allows inline style overrides:

```tsx
<Box style={{ color: 'red' }}>
  Overrides default styles
</Box>
```

**Merge Strategy**:
1. Base component styles (lowest priority)
2. Token prop styles (e.g., `color="primary"`)
3. className styles
4. Inline style prop (highest priority)

**Decision for Cerebrobot**:
- Support `className` prop for custom styles
- Support `style` prop for one-off overrides
- Token props (e.g., `color`, `bg`, `p`, `m`) apply before className/style

---

## 3. CSS Architecture

### 3.1 CSS Custom Properties for Theming

**Approach**: CSS custom properties (CSS variables) for zero-cost theme switching.

**Benefits**:
- **Zero runtime cost**: No JavaScript re-render on theme change
- **SSR-safe**: Works with server-side rendering
- **Fallback support**: Graceful degradation for older browsers
- **Scoped overrides**: Child themes override parent themes via CSS cascade

**Structure**:
```css
/* packages/ui/src/styles/tokens.css */
:root {
  /* Primitive tokens (context-free) */
  --color-purple-500: #a855f7;
  --color-pink-500: #ec4899;
  --color-neutral-50: #fafafa;
  --color-neutral-900: #171717;
  
  --font-size-xs: 0.75rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  
  --space-1: 0.25rem;
  --space-4: 1rem;
  --space-8: 2rem;
  
  /* Semantic tokens (default: dark theme) */
  --color-text-primary: var(--color-neutral-50);
  --color-text-secondary: var(--color-neutral-400);
  --color-bg-surface: rgba(255, 255, 255, 0.05);
  --color-bg-elevated: rgba(255, 255, 255, 0.08);
  --color-border-subtle: rgba(255, 255, 255, 0.1);
}

/* packages/ui/src/styles/themes/light.css */
.theme-light {
  --color-text-primary: var(--color-neutral-900);
  --color-text-secondary: var(--color-neutral-600);
  --color-bg-surface: rgba(0, 0, 0, 0.02);
  --color-bg-elevated: #ffffff;
  --color-border-subtle: rgba(0, 0, 0, 0.1);
}

/* packages/ui/src/styles/themes/neon-flux.css */
.theme-neon-flux {
  /* Glassmorphism overrides */
  --color-bg-surface: rgba(168, 85, 247, 0.05);
  --color-bg-elevated: rgba(168, 85, 247, 0.1);
  --backdrop-blur: 12px;
}
```

**Theme Switching Mechanism**:
```tsx
// packages/ui/src/components/Theme.tsx
function Theme({ appearance = 'dark', children }: ThemeProps) {
  React.useEffect(() => {
    document.documentElement.className = `theme-${appearance}`;
    localStorage.setItem('cerebro-theme', appearance);
  }, [appearance]);
  
  return <>{children}</>;
}
```

**Performance**: Theme switch requires only CSS variable update (no re-render), typically < 50ms.

### 3.2 Tailwind CSS Integration

**Challenge**: How to integrate design tokens with Tailwind CSS utilities?

**Approach 1: Extend Tailwind config** (recommended)
```js
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        'text-primary': 'var(--color-text-primary)',
        'bg-surface': 'var(--color-bg-surface)',
      },
      spacing: {
        '1': 'var(--space-1)',
        '4': 'var(--space-4)',
      }
    }
  }
};
```

**Usage**:
```tsx
<div className="bg-bg-surface text-text-primary p-4">
  Content
</div>
```

**Approach 2: Use arbitrary values**
```tsx
<div className="bg-[var(--color-bg-surface)] text-[var(--color-text-primary)]">
  Content
</div>
```

**Decision for Cerebrobot**:
- Extend Tailwind config with token references (Approach 1)
- Fallback to arbitrary values for non-standard tokens
- Keep token definitions in CSS files (single source of truth)

### 3.3 File Organization

```
packages/ui/src/styles/
├── globals.css           # Global resets, base styles
├── tokens.css            # CSS custom property definitions
├── themes/
│   ├── neon-flux.css     # Neon Flux theme overrides
│   ├── light.css         # Light theme overrides
│   └── high-contrast.css # High-contrast theme overrides
└── utilities.css         # Custom utility classes (if needed)
```

**Import Order** (in `globals.css`):
```css
@import 'tokens.css';
@import 'themes/neon-flux.css'; /* Default theme */

/* Tailwind layers */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 4. Accessibility Standards

**Goal**: Meet WCAG 2.1 Level AA for all text, Level AAA for high-contrast theme.

### 4.1 Contrast Ratios

| Text Size | WCAG AA | WCAG AAA |
|-----------|---------|----------|
| Normal text (<18pt) | 4.5:1 | 7:1 |
| Large text (≥18pt or ≥14pt bold) | 3:1 | 4.5:1 |
| UI components (icons, borders) | 3:1 | N/A |

**Color Token Requirements**:
- All text tokens must document contrast ratio
- Include both light and dark theme variants
- Flag non-compliant combinations

**Example Token Definition**:
```typescript
{
  name: 'color-text-primary',
  value: {
    light: '#171717', // neutral-900
    dark: '#fafafa'   // neutral-50
  },
  contrastRatio: {
    light: 15.8,  // vs #ffffff background (WCAG AAA)
    dark: 17.2    // vs #0a0a0a background (WCAG AAA)
  }
}
```

### 4.2 Keyboard Navigation

**Requirements**:
- All interactive elements must be keyboard-accessible (Tab, Enter, Space, Arrow keys)
- Focus indicators must meet 3:1 contrast ratio
- Focus trap for modals/dialogs
- Skip links for main content

**Focus Ring Standards**:
```css
:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

**Color Requirements**:
- Focus ring color must contrast 3:1 against background
- Use accent color with increased luminance for dark themes

### 4.3 ARIA Labels

**Button Component**:
```tsx
<Button
  aria-label="Close dialog"  // Required for icon-only buttons
  aria-pressed={isActive}    // For toggle buttons
  aria-expanded={isOpen}     // For disclosure buttons
>
  <Icon name="close" />
</Button>
```

**Form Inputs**:
```tsx
<label htmlFor="email">Email</label>
<input id="email" type="email" aria-required="true" />
```

### 4.4 Testing Tools

| Tool | Purpose | Integration |
|------|---------|-------------|
| `axe-core` | Automated accessibility testing | Vitest + `jest-axe` |
| VoiceOver (macOS) | Screen reader testing | Manual QA |
| NVDA (Windows) | Screen reader testing | Manual QA |
| Keyboard-only navigation | Focus management testing | Manual QA |
| Chrome DevTools Lighthouse | Accessibility audit | CI/CD pipeline |

**Automated Test Example**:
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('Button has no accessibility violations', async () => {
  const { container } = render(<Button>Click me</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**Decision for Cerebrobot**:
- Target WCAG AA for all tokens (minimum)
- WCAG AAA for high-contrast theme
- Include `axe-core` tests for all primitives
- Document keyboard navigation patterns in component docs

---

## 5. Documentation Best Practices

### 5.1 Component Documentation Structure

**Format**: MDX (Markdown + JSX) for interactive examples

**Template**:
```markdown
# ComponentName

## Overview
Brief description (1-2 sentences), primary use cases.

## Installation
\`\`\`bash
pnpm install @workspace/ui
\`\`\`

## Usage
\`\`\`tsx
import { ComponentName } from '@workspace/ui/primitives';

function Example() {
  return <ComponentName>Content</ComponentName>;
}
\`\`\`

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `ElementType` | `'div'` | HTML element or React component |
| `className` | `string` | - | Custom CSS class |
| `children` | `ReactNode` | - | Child elements |

## Accessibility
- **Keyboard**: Tab to focus, Enter/Space to activate
- **ARIA**: Required labels for icon-only variants
- **Focus**: Visible focus ring (3:1 contrast)
- **Screen Reader**: Announces as "button" or custom role

## Examples

### Basic Usage
<LiveExample>
  <ComponentName>Hello World</ComponentName>
</LiveExample>

### Variants
<LiveExample>
  <ComponentName variant="primary">Primary</ComponentName>
  <ComponentName variant="secondary">Secondary</ComponentName>
</LiveExample>

### Polymorphic Rendering
<LiveExample>
  <ComponentName as="a" href="/home">Link Button</ComponentName>
</LiveExample>

## Design Tokens
This component uses the following tokens:
- `--color-text-primary`
- `--color-bg-surface`
- `--space-4`

## Related
- [Button](./button.mdx) - Interactive button component
- [Text](./text.mdx) - Typography component
```

### 5.2 Token Documentation Structure

**Format**: Markdown tables with visual swatches

**Template**:
```markdown
# Color Tokens

## Primitive Tokens

| Token Name | Value | Swatch | Usage |
|------------|-------|--------|-------|
| `--color-purple-500` | `#a855f7` | <ColorSwatch color="#a855f7" /> | Accent color |
| `--color-pink-500` | `#ec4899` | <ColorSwatch color="#ec4899" /> | Secondary accent |

## Semantic Tokens

| Token Name | Light Mode | Dark Mode | Contrast Ratio | Usage |
|------------|------------|-----------|----------------|-------|
| `--color-text-primary` | `#171717` | `#fafafa` | 15.8:1 (AAA) | Primary text |
| `--color-text-secondary` | `#525252` | `#a3a3a3` | 4.6:1 (AA) | Secondary text |

## Accessibility Notes
- All text tokens meet WCAG AA (4.5:1 minimum)
- High-contrast theme meets WCAG AAA (7:1 minimum)
- Test with `axe-core` automated tools
```

### 5.3 Interactive Examples

**Tool Options**:
1. **Storybook** (industry standard, heavy setup)
2. **Ladle** (lightweight Storybook alternative)
3. **Custom MDX + Vite** (minimal, flexible)

**Decision for Cerebrobot**:
- Start with custom MDX + Vite (Phase 1)
- Consider Storybook in future spec if catalog becomes complex

**MDX Example Component**:
```tsx
// packages/ui/docs/components/LiveExample.tsx
import { useState } from 'react';
import { LiveProvider, LiveEditor, LivePreview, LiveError } from 'react-live';

export function LiveExample({ code, scope }) {
  return (
    <LiveProvider code={code} scope={scope}>
      <div className="grid grid-cols-2 gap-4">
        <LivePreview className="p-4 border rounded" />
        <div>
          <LiveEditor className="p-4 bg-neutral-900 text-neutral-50 rounded font-mono text-sm" />
          <LiveError className="p-4 bg-red-500 text-white rounded-b" />
        </div>
      </div>
    </LiveProvider>
  );
}
```

### 5.4 Documentation Hierarchy

```
packages/ui/docs/
├── index.mdx                  # Documentation home
├── getting-started.mdx        # Installation, setup, first component
├── tokens/
│   ├── index.mdx             # Token system overview
│   ├── color.mdx             # Color token reference
│   ├── typography.mdx        # Typography tokens
│   ├── spacing.mdx           # Spacing scale
│   ├── elevation.mdx         # Shadow tokens
│   └── radius.mdx            # Border radius tokens
├── primitives/
│   ├── index.mdx             # Primitives overview
│   ├── box.mdx               # Box component
│   ├── stack.mdx             # Stack layout
│   ├── text.mdx              # Text component
│   └── button.mdx            # Button component
├── patterns/
│   ├── forms.mdx             # Form patterns
│   ├── layouts.mdx           # Layout patterns
│   └── theming.mdx           # Theme customization
└── accessibility/
    ├── index.mdx             # Accessibility overview
    ├── contrast.mdx          # Contrast requirements
    ├── keyboard.mdx          # Keyboard navigation
    └── screen-readers.mdx    # Screen reader support
```

**Navigation**:
- Sidebar navigation (auto-generated from folder structure)
- Search functionality (Algolia DocSearch or Pagefind)
- Breadcrumbs for deep pages

---

## 6. Implementation Decisions Summary

### Token Architecture
- ✅ Three-tier system (primitive → semantic → component)
- ✅ Semantic naming for application tokens (`text-primary` not `gray-900`)
- ✅ CSS custom properties (not CSS-in-JS)
- ✅ 4px base spacing unit (matches Tailwind)
- ✅ 12-step color scales (Radix UI pattern)

### Component Composition
- ✅ Polymorphic `as` prop for Box, Stack, Text
- ✅ Theme component for declarative theming
- ✅ Style prop merging (base → token → className → style)
- ✅ Type-safe props with TypeScript

### Theming
- ✅ CSS class-based theme switching (`.theme-dark`, `.theme-light`)
- ✅ localStorage for theme persistence (key: `cerebro-theme`)
- ✅ Zero-cost theme switching (CSS variable update only)
- ✅ SSR-safe (no FOUC)

### Accessibility
- ✅ WCAG AA minimum (4.5:1 text contrast)
- ✅ WCAG AAA for high-contrast theme (7:1 text contrast)
- ✅ Automated testing with `axe-core`
- ✅ Focus ring 3:1 contrast requirement
- ✅ Keyboard navigation support (Tab, Enter, Arrow keys)

### Documentation
- ✅ MDX-based component catalog
- ✅ Interactive code examples with `react-live`
- ✅ Token reference tables with swatches
- ✅ Accessibility documentation per component
- ❌ Storybook (deferred to future spec)

### File Organization
- ✅ Monorepo structure (`packages/ui`, `apps/client`)
- ✅ Tokens in `/tokens/` directory (primitives, semantic, themes)
- ✅ Primitives in `/primitives/` directory (Box, Stack, Text, Button)
- ✅ Documentation in `/docs/` directory (MDX files)

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Breaking existing components** | Medium | High | Gradual migration, backward-compatible token props |
| **Theme switch performance < 150ms** | Low | Medium | Use CSS variables (zero re-render), profile in CI |
| **WCAG AA compliance failure** | Low | High | Automated `axe-core` tests, manual audits |
| **Token naming inconsistency** | Medium | Medium | Establish naming conventions early, document in contracts/ |
| **Documentation maintenance burden** | Medium | Low | MDX co-located with code, automated token reference generation |
| **Tailwind CSS conflicts** | Low | Low | Extend Tailwind config, use token CSS as source of truth |

---

## 8. Open Questions for Implementation

1. **Token Versioning**: How to handle breaking changes to token names?
   - **Recommendation**: Use semantic versioning for `@workspace/ui` package, deprecation warnings for 1 major version
   
2. **Dark Mode Default**: Should default theme be dark (Neon Flux) or light?
   - **Recommendation**: Default to dark (matches spec 012 aesthetic), respect system preference with `prefers-color-scheme`

3. **Component Primitive vs Existing Components**: Should existing chat components (MessageBubble, CodeBlock) be rebuilt with primitives?
   - **Recommendation**: Refactor incrementally (Phase 2+), prioritize new components using primitives

4. **MDX Documentation Hosting**: Where to host component docs?
   - **Recommendation**: Vite-based static site in `apps/docs` (future spec), serve from `/design-system` route

5. **Token Export Format**: Should tokens be exported as JSON, TypeScript, or CSS only?
   - **Recommendation**: Multi-format (CSS for web, TypeScript for type-safety, JSON for tools)

---

## 9. References

### External Resources
- [Design Tokens Community Group Spec](https://design-tokens.github.io/community-group/format/)
- [Radix UI Themes Documentation](https://www.radix-ui.com/themes/docs)
- [Material Design 3 Tokens](https://m3.material.io/foundations/design-tokens/overview)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Open Props](https://open-props.style/) (CSS variable inspiration)

### Internal Resources
- [spec.md](spec.md) - Feature specification
- [plan.md](plan.md) - Implementation plan
- [spec 012](../012-design-library-specification/spec.md) - Existing design library
- [Neon Flux theme reference](../012-design-library-specification/themes/theme-neon-flux.html)

---

**Next Steps**: Proceed to Phase 1 (data-model.md, contracts/, quickstart.md)
