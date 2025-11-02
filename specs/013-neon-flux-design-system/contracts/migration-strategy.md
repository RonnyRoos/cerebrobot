# Migration Strategy Contract

**Feature**: Professional Design System with Neon Flux Theme  
**Version**: 1.0.0  
**Date**: 2025-11-02

---

## Overview

This document defines the backward-compatible migration strategy for refactoring existing Cerebrobot components (spec 012) to use the new design system (spec 013).

**Critical Constraint**: All migrations must be backward-compatible. Existing components must continue working during the transition.

---

## Current State Analysis

### Existing Components (spec 012)

From [current-state-audit.md](../current-state-audit.md):

**CSS Custom Properties** (`packages/ui/src/theme/globals.css`):
```css
:root {
  /* Light mode (minimal usage) */
  --color-message-user-bg: 240 5% 96%;
  --color-message-agent-bg: 240 5% 94%;
  /* ... 12 total tokens (chat-specific) */
}

.dark {
  /* Dark mode (Neon Flux in chat) */
  --color-message-user-bg: 277 92% 62%;      /* Purple #a855f7 */
  --color-message-agent-bg: 221 91% 60%;     /* Blue #3b82f6 */
  --color-message-user-text: 240 5% 97%;
  /* ... */
}
```

**MessageBubble Component** (`packages/ui/src/chat/message-bubble.tsx`):
```tsx
const messageBubbleVariants = cva(
  'p-5 rounded-2xl backdrop-blur-md transition-all duration-200', // Base
  {
    variants: {
      variant: {
        user: [
          'bg-message-user-bg/20',
          'text-message-user-text',
          'shadow-[0_0_20px_rgba(168,85,247,0.3)]', // Hardcoded purple glow
        ],
        agent: [
          'bg-message-agent-bg/30',
          'text-message-agent-text',
          'shadow-[0_0_20px_rgba(59,130,246,0.3)]',  // Hardcoded blue glow
        ],
      },
    },
  }
);
```

**Other Components**:
- `AgentsPage.tsx` - Dark background but no glassmorphism, uses Tailwind defaults
- `ThreadListView.tsx` - Light theme, no tokens
- `CodeBlock.tsx` - Syntax highlighting, no theme integration

### Gaps & Inconsistencies

1. **Hardcoded Values**:
   - Shadows: `shadow-[0_0_20px_rgba(168,85,247,0.3)]`
   - Border-radius: `rounded-2xl` (1rem)
   - Opacity: `/20`, `/30` (Tailwind opacity syntax)

2. **Flat Token Structure**:
   - No primitive/semantic/component tiers
   - Component-specific tokens (`--color-message-user-bg`)
   - No spacing/typography/radius tokens

3. **Inconsistent Theming**:
   - Chat: Dark + glassmorphism (Neon Flux)
   - Agents: Dark + plain (no glassmorphism)
   - Threads: Light mode
   - No centralized theme switching

4. **No Token Documentation**:
   - No contrast ratios
   - No usage guidelines
   - No TypeScript types

---

## Migration Principles

### 1. Backward Compatibility

**Rule**: Never break existing components during migration.

**Strategy**: Alias-based refactor
```css
/* Step 1: Add new tokens */
--color-purple-500: 277 92% 62%;
--color-accent-primary: var(--color-purple-500);

/* Step 2: Alias old tokens (backward-compatible) */
--color-message-user-bg: var(--color-accent-primary);

/* Step 3: Update components (gradual) */
/* Old code still works, new code uses semantic tokens */
```

**Deprecation Timeline**:
- **v1.0.0**: Add new tokens, keep old tokens as aliases
- **v1.x.x**: Migrate components incrementally, mark old tokens `@deprecated`
- **v2.0.0**: Remove old tokens (1 major version grace period)

### 2. Incremental Adoption

**Rule**: Migrate component-by-component, not all-at-once.

**Priority Order** (based on user-facing impact):
1. **P1 (MVP)**: MessageBubble, TypingIndicator (chat core)
2. **P2 (Polish)**: AgentsPage, ThreadListView (navigation/lists)
3. **P3 (Enhancement)**: CodeBlock, ErrorBoundary, Modals (utilities)

### 3. Test Before & After

**Rule**: Every migration must pass visual regression tests.

**Process**:
1. Capture baseline screenshots (before)
2. Refactor component to use tokens
3. Capture new screenshots (after)
4. Compare with Percy/Playwright (< 0.1% pixel diff)
5. Manual QA for interactions (hover, focus, etc.)

### 4. Document Changes

**Rule**: Update documentation alongside code changes.

**Artifacts**:
- **Changelog**: Document breaking changes
- **Migration Guide**: Step-by-step instructions for each component
- **Token Catalog**: Visual documentation of all tokens

---

## Phase-by-Phase Migration Plan

### Phase 1: Foundation (Extract & Systematize)

**Goal**: Establish token system without breaking existing code.

**Tasks**:
1. ✅ Create token interfaces (`data-model.md`)
2. ✅ Define naming convention (`--{category}-{property}-{variant}`)
3. ⏳ Create primitive tokens (`packages/ui/src/theme/tokens/primitives.css`)
4. ⏳ Create semantic tokens (`packages/ui/src/theme/tokens/semantic.css`)
5. ⏳ Alias existing tokens to new semantic tokens
6. ⏳ Add TypeScript types for tokens
7. ⏳ Update Tailwind config to reference tokens

**Validation**:
- All existing components render identically (visual regression)
- No console warnings/errors
- TypeScript types compile

**Estimated Effort**: 2-3 days

---

### Phase 2: Component Migration (Extend & Unify)

**Goal**: Refactor components to use semantic tokens and primitives.

#### Task 2.1: MessageBubble Migration

**Current Code**:
```tsx
const messageBubbleVariants = cva(
  'p-5 rounded-2xl backdrop-blur-md',
  {
    variants: {
      variant: {
        user: [
          'bg-message-user-bg/20',
          'text-message-user-text',
          'shadow-[0_0_20px_rgba(168,85,247,0.3)]',
        ],
      },
    },
  }
);
```

**New Code**:
```tsx
const messageBubbleVariants = cva(
  '', // Base styles via Box component
  {
    variants: {
      variant: {
        user: [
          'bg-accent-primary/20',        // Semantic token
          'text-text-on-dark',           // Semantic token
          'shadow-glow-purple',          // Elevation token
        ],
      },
    },
  }
);

export function MessageBubble({ variant, children }: Props) {
  return (
    <Box
      p="5"                 // Token prop
      borderRadius="xl"     // Token prop (maps to rounded-2xl)
      className={cn(
        'backdrop-blur-md',
        messageBubbleVariants({ variant })
      )}
    >
      <Text color="text-on-dark">{children}</Text>
    </Box>
  );
}
```

**Validation**:
- Visual regression: MessageBubble renders identically
- Accessibility: Contrast ratios unchanged (WCAG AA)
- Performance: No layout shift, no additional re-renders

**Effort**: 2-3 hours

---

#### Task 2.2: AgentsPage Migration

**Current Code**:
```tsx
<div className="bg-neutral-900 text-neutral-50 p-6">
  <h1 className="text-2xl font-bold mb-4">Agents</h1>
  {/* ... */}
</div>
```

**New Code**:
```tsx
<Box bg="bg-surface" color="text-primary" p="6">
  <Text variant="heading-1" mb="4">Agents</Text>
  {/* ... */}
</Box>
```

**Changes**:
- Replace hardcoded Tailwind classes with token props
- Use `Text` component for typography
- Apply glassmorphism if enabled

**Validation**:
- Visual regression: AgentsPage matches current appearance
- Theme switching: Works with light/dark themes
- Accessibility: Focus states preserved

**Effort**: 3-4 hours

---

#### Task 2.3: ThreadListView Migration

**Current Code**:
```tsx
<div className="bg-white p-4 rounded-lg border border-gray-200">
  <p className="text-gray-900">Thread title</p>
</div>
```

**New Code**:
```tsx
<Box
  bg="bg-surface"
  p="4"
  borderRadius="lg"
  borderColor="border-subtle"
  className="border"
>
  <Text color="text-primary">Thread title</Text>
</Box>
```

**Changes**:
- Theme-aware colors (light/dark)
- Token-based spacing/radius
- Consistent with MessageBubble aesthetic

**Validation**:
- Visual regression: ThreadListView appearance unchanged in current theme
- Light theme: Works correctly (was default)
- Dark theme: New Neon Flux aesthetic applied

**Effort**: 2-3 hours

---

#### Task 2.4: CodeBlock Migration

**Current Code**:
```tsx
<pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
  <code>{children}</code>
</pre>
```

**New Code**:
```tsx
<Box
  as="pre"
  bg="bg-elevated"
  color="text-primary"
  p="4"
  borderRadius="md"
  overflow="auto"
>
  <Text as="code" variant="code">{children}</Text>
</Box>
```

**Changes**:
- Semantic tokens for colors
- Token-based spacing/radius
- Syntax highlighting preserved (via Prism/Highlight.js)

**Validation**:
- Visual regression: Code blocks render identically
- Syntax highlighting: Colors preserved
- Overflow: Horizontal scroll works

**Effort**: 2 hours

---

**Phase 2 Total Effort**: 4-5 days (including testing)

---

### Phase 3: Documentation & Tooling (Document & Polish)

**Goal**: Create comprehensive documentation and developer tools.

**Tasks**:
1. ⏳ Token catalog (Storybook/visual documentation)
2. ⏳ Component playground (interactive demos)
3. ⏳ Migration guide (per-component instructions)
4. ⏳ Contrast ratio validation tool
5. ⏳ ESLint rules (detect hardcoded colors/spacing)
6. ⏳ TypeScript strict mode for token usage

**Validation**:
- Documentation covers all tokens
- All components have interactive demos
- ESLint catches token violations
- Contrast ratios validated automatically

**Estimated Effort**: 3-4 days

---

## Token Alias Mapping

### Color Tokens

```css
/* NEW: Primitive tokens */
--color-purple-500: 277 92% 62%;
--color-blue-500: 221 91% 60%;
--color-neutral-50: 240 5% 97%;
--color-neutral-900: 222 47% 11%;

/* NEW: Semantic tokens */
--color-accent-primary: var(--color-purple-500);
--color-accent-secondary: var(--color-blue-500);
--color-text-primary: var(--color-neutral-900);  /* Light theme */
--color-text-on-dark: var(--color-neutral-50);
--color-bg-surface: 240 20% 5%;  /* Dark theme */

/* OLD: Component-specific tokens (aliased for backward compatibility) */
--color-message-user-bg: var(--color-accent-primary);
--color-message-agent-bg: var(--color-accent-secondary);
--color-message-user-text: var(--color-text-on-dark);
--color-message-agent-text: var(--color-text-on-dark);

/* @deprecated Use --color-accent-primary. Removed in v2.0 */
```

### Shadow Tokens

```css
/* NEW: Elevation tokens */
--shadow-glow-purple: 0 0 20px rgba(168, 85, 247, 0.3);
--shadow-glow-blue: 0 0 20px rgba(59, 130, 246, 0.3);

/* OLD: Hardcoded values (to be replaced) */
shadow-[0_0_20px_rgba(168,85,247,0.3)]  → shadow-glow-purple
shadow-[0_0_20px_rgba(59,130,246,0.3)]   → shadow-glow-blue
```

### Spacing/Radius Tokens

```css
/* NEW: Spacing tokens */
--space-5: 1.25rem;  /* 20px */

/* NEW: Radius tokens */
--radius-xl: 1.5rem; /* 24px */

/* OLD: Tailwind classes (to be replaced) */
p-5        → p="5"              (Box component prop)
rounded-2xl → borderRadius="xl" (Box component prop)
```

---

## Refactoring Patterns

### Pattern 1: Hardcoded Color → Token

**Before**:
```tsx
<div className="bg-purple-500 text-white">
```

**After**:
```tsx
<Box bg="accent-primary" color="text-on-dark">
```

---

### Pattern 2: Hardcoded Shadow → Token

**Before**:
```tsx
<div className="shadow-[0_0_20px_rgba(168,85,247,0.3)]">
```

**After**:
```tsx
<Box className="shadow-glow-purple">
{/* Or extend Tailwind config: */}
<Box className="shadow-glow-purple">
```

**Tailwind Config**:
```javascript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      boxShadow: {
        'glow-purple': 'var(--shadow-glow-purple)',
        'glow-blue': 'var(--shadow-glow-blue)',
      },
    },
  },
};
```

---

### Pattern 3: Hardcoded Spacing → Token Prop

**Before**:
```tsx
<div className="p-5 gap-4">
```

**After**:
```tsx
<Box p="5" gap="4">
```

---

### Pattern 4: Manual Flex Layout → Stack

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

---

### Pattern 5: Opacity Syntax (Tailwind)

**Before**:
```tsx
<div className="bg-message-user-bg/20">
```

**After** (preserve Tailwind syntax with semantic tokens):
```tsx
<div className="bg-accent-primary/20">
```

**Why**: Tailwind's `/20` opacity syntax requires HSL format without `hsl()` wrapper. Tokens already use this format (`277 92% 62%`), so `bg-accent-primary/20` works seamlessly.

---

## Testing Strategy

### Visual Regression Tests

**Tool**: Playwright with Percy or visual snapshot comparison

**Process**:
1. Capture baseline screenshots (before migration)
2. Refactor component
3. Capture new screenshots (after migration)
4. Compare with pixel-diff threshold (< 0.1%)

**Example** (Playwright):
```typescript
import { test, expect } from '@playwright/test';

test.describe('MessageBubble migration', () => {
  test('user variant matches baseline', async ({ page }) => {
    await page.goto('/storybook?path=/story/message-bubble--user');
    await expect(page.locator('[data-testid="message-bubble"]')).toHaveScreenshot('message-bubble-user.png');
  });
  
  test('agent variant matches baseline', async ({ page }) => {
    await page.goto('/storybook?path=/story/message-bubble--agent');
    await expect(page.locator('[data-testid="message-bubble"]')).toHaveScreenshot('message-bubble-agent.png');
  });
});
```

---

### Contrast Ratio Validation

**Tool**: `axe-core` + custom contrast checker

**Process**:
1. Extract all color token pairs (foreground/background)
2. Calculate contrast ratios (WCAG formula)
3. Assert ratios meet WCAG AA (4.5:1 text, 3:1 UI components)

**Example**:
```typescript
import { getContrastRatio } from './utils/color';

test('text-primary on bg-surface meets WCAG AA', () => {
  const textColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-text-primary');
  const bgColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-bg-surface');
  
  const ratio = getContrastRatio(textColor, bgColor);
  expect(ratio).toBeGreaterThanOrEqual(4.5); // WCAG AA for normal text
});
```

---

### Performance Testing

**Metrics**:
1. **Theme switch time**: < 150ms (success criterion)
2. **Layout shift**: 0 (no visual jank)
3. **Re-renders**: Minimal (React DevTools Profiler)

**Example** (Playwright):
```typescript
test('theme switch completes in <150ms', async ({ page }) => {
  await page.goto('/');
  
  const start = Date.now();
  await page.click('[data-testid="theme-toggle"]');
  
  await page.waitForFunction(() => {
    return document.documentElement.classList.contains('theme-light');
  });
  
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(150);
});
```

---

## Rollout Phases

### Phase 1: Internal Testing (Week 1)

**Scope**: Core team only

**Tasks**:
1. Deploy to staging environment
2. Manually test all migrated components
3. Capture visual regression baselines
4. Fix any critical bugs

**Success Criteria**:
- Zero visual regressions
- Zero accessibility regressions
- Theme switching works correctly

---

### Phase 2: Beta Testing (Week 2)

**Scope**: Selected users/operators

**Tasks**:
1. Deploy to beta environment
2. Gather feedback on UX changes
3. Monitor for performance issues
4. Iterate on feedback

**Success Criteria**:
- No reported visual bugs
- Theme switch < 150ms (measured in production)
- Positive feedback on Neon Flux aesthetic

---

### Phase 3: Production Rollout (Week 3)

**Scope**: All users

**Tasks**:
1. Deploy to production
2. Monitor error tracking (Sentry)
3. Monitor performance (Web Vitals)
4. Provide migration guide for operators

**Success Criteria**:
- Zero production incidents
- No performance regressions
- Migration guide followed successfully

---

## Deprecation Workflow

### Step 1: Mark Token as Deprecated

```css
/* @deprecated Use --color-accent-primary instead. Removed in v2.0 */
--color-message-user-bg: var(--color-accent-primary);
```

### Step 2: Add Console Warning (Development Only)

```typescript
// packages/ui/src/theme/deprecation.ts
const DEPRECATED_TOKENS = {
  '--color-message-user-bg': '--color-accent-primary',
  '--color-message-agent-bg': '--color-accent-secondary',
  // ...
};

if (process.env.NODE_ENV === 'development') {
  Object.keys(DEPRECATED_TOKENS).forEach((oldToken) => {
    const usage = document.querySelector(`[style*="${oldToken}"]`);
    if (usage) {
      console.warn(
        `⚠️ Deprecated token "${oldToken}" used. Replace with "${DEPRECATED_TOKENS[oldToken]}".`
      );
    }
  });
}
```

### Step 3: Update Documentation

Add deprecation notice to token catalog:

```markdown
### ~~--color-message-user-bg~~ (Deprecated)

**Deprecated in**: v1.2.0  
**Removed in**: v2.0.0  
**Replacement**: `--color-accent-primary`

**Migration**:
```diff
- color: hsl(var(--color-message-user-bg));
+ color: hsl(var(--color-accent-primary));
```
```

### Step 4: Remove Token (v2.0.0)

1. Delete CSS custom property
2. Delete TypeScript type
3. Update changelog with breaking changes
4. Provide automated migration script (codemod)

**Example Codemod** (jscodeshift):
```javascript
// Rename --color-message-user-bg → --color-accent-primary
module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  
  root.find(j.Literal, {
    value: (value) => typeof value === 'string' && value.includes('--color-message-user-bg')
  }).forEach((path) => {
    path.node.value = path.node.value.replace(
      /--color-message-user-bg/g,
      '--color-accent-primary'
    );
  });
  
  return root.toSource();
};
```

**Usage**:
```bash
npx jscodeshift -t migration-v2.js packages/ui/src/**/*.tsx
```

---

## Risk Assessment & Mitigation

### Risk 1: Visual Regressions

**Likelihood**: Medium  
**Impact**: High  
**Mitigation**:
- Comprehensive visual regression tests (Playwright + Percy)
- Manual QA for critical user flows (chat, agent list)
- Rollback plan (Git revert + redeploy)

### Risk 2: Performance Degradation

**Likelihood**: Low  
**Impact**: Medium  
**Mitigation**:
- Performance tests for theme switching (< 150ms)
- Lighthouse audits (before/after)
- Real-user monitoring (Web Vitals)

### Risk 3: Accessibility Regressions

**Likelihood**: Medium  
**Impact**: High  
**Mitigation**:
- axe-core automated tests
- Contrast ratio validation for all token pairs
- Manual keyboard navigation testing

### Risk 4: Breaking Changes for Operators

**Likelihood**: Low (backward-compatible design)  
**Impact**: Medium  
**Mitigation**:
- Deprecation warnings in development
- Comprehensive migration guide
- Automated codemod for v2.0 migration

### Risk 5: Theme Flash on Page Load (FOUC)

**Likelihood**: Medium (SSR/client hydration)  
**Impact**: Low (cosmetic)  
**Mitigation**:
- Inline script before first paint (see [theme-api.md](theme-api.md#ssr-compatibility))
- localStorage theme class applied synchronously
- CSS preload for faster initial render

---

## Backward-Compatibility Checklist

Before deploying migration:

- [ ] All existing CSS custom properties aliased to new tokens
- [ ] Visual regression tests pass (< 0.1% pixel diff)
- [ ] Contrast ratios unchanged or improved (WCAG AA)
- [ ] Performance benchmarks met (theme switch < 150ms)
- [ ] No console warnings/errors in production
- [ ] Migration guide published
- [ ] Deprecation notices added (development mode)
- [ ] Rollback plan documented

---

## Open Questions & Decisions

### Q1: Should we remove hardcoded Tailwind classes immediately?

**Options**:
- A. Replace all hardcoded classes with token props (Box component)
- B. Keep Tailwind classes but extend config with token-based utilities

**Decision**: **B** (Tailwind classes + token-based config)

**Rationale**:
- Less intrusive migration (fewer component changes)
- Tailwind classes familiar to developers
- Token-based utilities (`bg-accent-primary`, `shadow-glow-purple`) leverage existing Tailwind infrastructure

---

### Q2: How to handle non-tokenizable values?

**Example**: `z-index: 9999`, `line-clamp-3`

**Decision**: Pragmatic approach
- **Common values**: Add tokens (`--z-index-modal: 9999`)
- **One-off values**: Keep hardcoded (avoid over-tokenization)
- **Utility-specific**: Rely on Tailwind (`line-clamp-3`)

**Rationale**: YAGNI principle - don't tokenize unless reused 3+ times

---

### Q3: Should we support CSS-in-JS (styled-components, emotion)?

**Decision**: **No** (CSS custom properties + Tailwind only)

**Rationale**:
- Existing codebase uses Tailwind + CSS modules
- CSS custom properties provide runtime theming without CSS-in-JS overhead
- Single-operator app doesn't need CSS-in-JS benefits (isolation, dynamic styles)

---

**Next**: See [quickstart.md](../quickstart.md) for developer onboarding guide.
