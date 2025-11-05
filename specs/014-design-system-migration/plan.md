# Implementation Plan: Design System Migration & UX Rebuild

**Branch**: `014-design-system-migration` | **Date**: 2025-11-05 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/014-design-system-migration/spec.md`

**Note**: This plan follows the `/speckit.plan` command workflow as defined in `.specify/templates/commands/plan.md`.

## Summary

Migrate the Cerebrobot client application from legacy CSS styling to the Neon Flux design system (`@workspace/ui`). This pure frontend migration removes 7 CSS files, eliminates inline styles and hardcoded values, and adopts design system primitives (Box, Stack, Text, Button) across 3 pages (homepage, agents page, chat view). Key deliverables include expanding the design library with form input components (Input, Textarea, Select), enforcing design system usage via ESLint rules and pre-commit hooks, and achieving 100% visual consistency through manual smoke testing. Performance targets: theme switching <200ms, page load time decrease ≥5%, zero CSS imports/inline styles remaining. Accessibility baseline: WCAG AA, AAA for high-contrast mode.

## Technical Context

**Language/Version**: TypeScript 5.5+, Node.js ≥20  
**Primary Dependencies**: 
- Frontend: React 18+, Vite 5+
- Design System: `@workspace/ui` 0.1.0 (Neon Flux theme)
- Styling: Tailwind CSS 3.4.15+, CVA (class-variance-authority) 0.7.1
- Component Patterns: ShadCN UI-inspired primitives
- Testing: Vitest 2.1.8, @testing-library/react 14.3.1, vitest-axe 0.1.0
- Documentation: Storybook 10.0.2+

**Storage**: N/A (pure UI migration, no backend/database changes)

**Testing**: 
- 3-tier strategy: (1) Unit tests for components (Vitest + Testing Library), (2) N/A (no Postgres changes), (3) Manual smoke tests for visual validation
- Accessibility: vitest-axe for automated WCAG checks
- Visual regression: Manual comparison before/after migration

**Target Platform**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)  
**Project Type**: Web frontend (monorepo package: `apps/client`)

**Performance Goals**:
- Theme switching: <200ms (FR-020, SC-004)
- Page load time: ≥5% decrease vs current (SC-005)
- Zero React re-renders on theme change (SC-006)
- CSS bundle size: ≥20% reduction (SC-018)

**Constraints**:
- WCAG 2.1 Level AA compliance (FR-034-039)
- WCAG AAA for high-contrast mode (7:1 contrast, FR-024)
- Mobile responsive: no horizontal scroll on 375px viewport (FR-025)
- Touch targets: ≥44x44 pixels on mobile (FR-028)
- Hobby project deployment: manual smoke testing, no automated visual regression tools

**Scale/Scope**:
- 3 pages: homepage (thread list), agents page, chat view
- 7 components with CSS files to migrate + delete CSS
- 51 functional requirements (FR-001 to FR-051)
- 26 success criteria (SC-001 to SC-026)
- Design library expansion: +3 components (Input, Textarea, Select)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Hygiene-First Development
**Status**: ✅ **PASS**  
**Verification**: Migration plan includes hygiene loop at every increment (lint → format → test). ESLint rules will enforce design system patterns. Pre-commit hooks will prevent legacy code from being committed.

### Principle II: Transparency & Inspectability
**Status**: ✅ **PASS**  
**Verification**: UI migration does not affect memory graph observability or LangGraph state logging. No changes to Pino logging, configuration traceability, or error context.

### Principle III: Type Safety & Testability
**Status**: ✅ **PASS**  
**Verification**: 
- TypeScript strict mode enforced (no `any` types)
- 3-tier testing strategy applied: (1) Unit tests for all migrated components, (2) N/A (no Postgres), (3) Manual smoke tests for visual validation
- Components use dependency injection (theme context via ThemeProvider)
- Pure functional components preferred over class components

### Principle IV: Incremental & Modular Development
**Status**: ✅ **PASS**  
**Verification**: 
- Spec prioritized into P1 (visual consistency, forms, interactive elements), P2 (theme switching, responsive), P3 (empty states)
- Migration can proceed page-by-page (homepage → agents page → chat view)
- Each component migration is independently testable
- Commits will be small, focused on single component migrations

### Principle V: Stack Discipline
**Status**: ✅ **PASS**  
**Verification**: 
- No new external dependencies beyond approved stack
- Adding husky for pre-commit hooks (standard tooling, no ADR needed)
- All design system dependencies already approved in Spec 013:
  - Tailwind CSS 3.4.15+ ✓
  - CVA 0.7.1 ✓
  - Storybook 10.0.2+ ✓
  - vitest-axe 0.1.0 ✓

### Principle VI: Configuration Over Hardcoding
**Status**: ✅ **PASS**  
**Verification**: Theme preference stored in localStorage (no new config). All colors/spacing via CSS variables (design tokens), not hardcoded values. Migration removes hardcoded inline styles.

### Principle VII: Operator-Centric Design
**Status**: ✅ **PASS**  
**Verification**: 
- Manual smoke testing approach confirmed by operator (hobby project context)
- No complex automated visual regression tools (avoids overengineering)
- Docker Compose deployment unchanged (pure frontend work)
- Documentation updated for migration patterns

### Principle VIII: MCP Server Utilization
**Status**: ✅ **PASS**  
**Verification**: 
- ✅ SequentialThinking used for multi-step planning (this document)
- ✅ Context7 queried for ShadCN UI and ESLint best practices
- Plan to use Serena for code navigation during migration
- Plan to use Playwright for UI debugging if visual issues arise

### Principle IX: Design Library First
**Status**: ⚠️ **DEPENDENCY CHECK REQUIRED**  
**Verification**: 
- Migration depends on Spec 013 (Neon Flux Design System) being complete
- Need to verify `@workspace/ui` has all required primitives: Box, Stack, Text, Button ✓
- Need to ADD to design library: Input, Textarea, Select (user confirmed in clarifications)
- Workflow: Add form components to design library FIRST, then migrate client components

**GATE DECISION**: ✅ **PROCEED**  
All constitutional principles satisfied. Spec 013 dependency will be verified in Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/014-design-system-migration/
├── spec.md              # Feature specification (already complete)
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output (generated below)
├── data-model.md        # N/A (pure UI migration, no data entities)
├── quickstart.md        # Phase 1 output (migration guide)
├── contracts/           # N/A (no API changes)
└── tasks.md             # Phase 2 output (/speckit.tasks - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Monorepo structure (pnpm workspaces)

apps/
├── client/                          # React frontend (PRIMARY MIGRATION TARGET)
│   ├── src/
│   │   ├── components/              # Components to migrate (7 with CSS files)
│   │   │   ├── AgentForm.tsx        # Migrate + delete AgentForm.css
│   │   │   ├── BasicInfoSection.tsx # Migrate + delete BasicInfoSection.css
│   │   │   ├── LLMConfigSection.tsx # Migrate + delete LLMConfigSection.css
│   │   │   ├── MemoryConfigSection.tsx  # Migrate + delete MemoryConfigSection.css
│   │   │   ├── AutonomyConfigSection.tsx # Migrate + delete AutonomyConfigSection.css
│   │   │   ├── FieldError.tsx       # Migrate + delete FieldError.css
│   │   │   ├── ValidationMessage.tsx # Migrate + delete ValidationMessage.css
│   │   │   ├── AgentCard.tsx        # Migrate (may have inline styles)
│   │   │   ├── AgentList.tsx        # Migrate (may have inline styles)
│   │   │   ├── ThreadListItem.tsx   # Migrate (may have inline styles)
│   │   │   ├── ThreadListView.tsx   # Migrate (may have inline styles)
│   │   │   └── ChatView.tsx         # Verify (may already be migrated)
│   │   ├── pages/                   # Pages to verify/migrate
│   │   │   ├── AgentsPage.tsx       # Agent list, cards, forms
│   │   │   ├── ThreadListPage.tsx   # Homepage (thread list, empty states)
│   │   │   └── AgentFormPage.tsx    # All form sections
│   │   └── main.tsx                 # Already imports ThemeProvider from @workspace/ui
│   ├── package.json
│   └── vite.config.ts

packages/
├── ui/                              # Design library (EXPANSION TARGET)
│   ├── src/
│   │   ├── components/              # Existing primitives
│   │   │   ├── box.tsx              # Layout primitive (already exists)
│   │   │   ├── stack.tsx            # Layout primitive (already exists)
│   │   │   ├── text.tsx             # Typography primitive (already exists)
│   │   │   ├── button.tsx           # Interactive primitive (already exists)
│   │   │   ├── input.tsx            # TO ADD (form input)
│   │   │   ├── textarea.tsx         # TO ADD (form textarea)
│   │   │   └── select.tsx           # TO ADD (form select)
│   │   ├── stories/                 # Storybook documentation
│   │   │   ├── input.stories.tsx    # TO ADD
│   │   │   ├── textarea.stories.tsx # TO ADD
│   │   │   └── select.stories.tsx   # TO ADD
│   │   ├── theme/
│   │   │   ├── tokens/              # Design tokens (CSS variables)
│   │   │   └── globals.css          # Global theme styles
│   │   └── index.ts                 # Package exports
│   ├── __tests__/
│   │   └── components/              # Unit tests
│   │       ├── input.test.tsx       # TO ADD
│   │       ├── textarea.test.tsx    # TO ADD
│   │       └── select.test.tsx      # TO ADD
│   ├── package.json
│   └── vitest.config.ts

# Root configuration changes
├── .eslintrc.cjs                    # TO UPDATE (add custom rules)
├── .husky/                          # TO CREATE (pre-commit hooks)
│   └── pre-commit                   # TO CREATE
├── package.json                     # TO UPDATE (add husky devDependency)
└── pnpm-workspace.yaml              # No changes (already configured)
```

**Structure Decision**: Monorepo with pnpm workspaces. Primary migration target is `apps/client` (React frontend). Design library expansion in `packages/ui` (add form input components). Root-level enforcement via ESLint + husky pre-commit hooks. No backend changes (`apps/server` untouched). No database changes (prisma/ untouched).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations requiring justification.** All constitutional principles pass. Migration is straightforward frontend work with approved stack and incremental approach.

---

## Phase 0: Research & Decision Documentation

### Research Topics

The following research tasks resolve unknowns from the Technical Context and inform Phase 1 design decisions:

#### 1. Form Input Component Architecture (CRITICAL - from clarifications)

**Research Goal**: Determine component design for Input, Textarea, Select to match Neon Flux design system and enable form migration.

**Questions to Answer**:
- What ShadCN UI input patterns should we adopt? (base component structure, ref forwarding, TypeScript types)
- How to integrate CVA variants for size/state variations? (default, small, large; default, error, disabled)
- What accessibility attributes are required? (aria-invalid, aria-describedby, aria-required)
- How to apply Neon Flux theming? (glassmorphism borders, focus glow effects, design token mapping)
- What validation error display pattern? (inline error messages, field-error association)

**Sources**:
- ✅ Context7 query for ShadCN UI input/textarea/select components (COMPLETED)
- Design library existing patterns (Box, Stack, Text, Button for reference)
- Neon Flux token system (color, spacing, effects)

**Deliverable**: Component specification documenting:
- TypeScript interface definitions
- CVA variant configurations
- Design token mappings
- Accessibility requirements
- Storybook story requirements

---

#### 2. ESLint Rule Configuration (HIGH - FR-051, SC-025)

**Research Goal**: Configure custom ESLint rules to enforce design system usage and prevent legacy patterns.

**Questions to Answer**:
- How to detect CSS file imports in component files? (no-restricted-syntax with ImportDeclaration selector)
- How to detect inline style attributes? (no-restricted-syntax with JSXAttribute[name.name="style"] selector)
- How to detect hardcoded color values? (regex patterns for hex, rgb, rgba)
- How to enforce @workspace/ui imports? (no-restricted-imports with patterns)
- Warning vs error severity? (error for all violations - build must fail)
- Exemption patterns? (allow inline styles in .stories.tsx for demonstrations)

**Sources**:
- ✅ Context7 query for ESLint no-restricted-syntax and no-restricted-imports (COMPLETED)
- Existing .eslintrc.cjs configuration
- ESLint plugin ecosystem (no new plugins needed, built-in rules sufficient)

**Deliverable**: ESLint rule configuration block ready to add to `.eslintrc.cjs`:

```javascript
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'ImportDeclaration[source.value=/\\.css$/]',
      message: 'CSS file imports are not allowed. Use design system primitives from @workspace/ui instead.',
    },
    {
      selector: 'JSXAttribute[name.name="style"]',
      message: 'Inline styles are not allowed. Use design system props or CSS variables instead.',
    },
  ],
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: ['!@workspace/ui', '!react', '!react-dom', /* other allowed imports */],
          message: 'UI components must import primitives from @workspace/ui only.',
        },
      ],
    },
  ],
}
```

---

#### 3. Pre-commit Hook Setup (HIGH - SC-026)

**Research Goal**: Implement husky pre-commit hooks to prevent legacy patterns from being committed.

**Questions to Answer**:
- How to install husky in monorepo? (root-level devDependency, pnpm install husky --save-dev -w)
- How to initialize husky? (pnpm exec husky init)
- What checks to run on pre-commit? (grep for CSS imports, inline styles, hardcoded colors)
- Performance considerations? (only check staged files, exit early on first violation)
- How to handle exemptions? (allow CSS imports in packages/ui/src/theme/)

**Sources**:
- Husky documentation (standard git hooks tool)
- Best practices for monorepo git hooks
- Existing CI/CD checks (mirror locally)

**Deliverable**: Pre-commit hook script (`.husky/pre-commit`):

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Detect CSS imports in client components (exclude design library theme)
if git diff --cached --name-only | grep "apps/client/.*\.tsx$" | xargs grep -l "import.*\.css" 2>/dev/null; then
  echo "❌ CSS imports detected in client components. Use design system primitives instead."
  exit 1
fi

# Detect inline styles
if git diff --cached --name-only | grep "\.tsx$" | xargs grep -l 'style={{' 2>/dev/null; then
  echo "❌ Inline styles detected. Use design system props instead."
  exit 1
fi

# Detect hardcoded colors (hex, rgb, rgba) - exclude design library tokens
if git diff --cached --name-only | grep "apps/client/.*\.tsx$" | xargs grep -E "#[0-9a-fA-F]{6}|rgb\(|rgba\(" 2>/dev/null; then
  echo "❌ Hardcoded colors detected. Use design tokens instead."
  exit 1
fi

# Run hygiene loop
pnpm lint && pnpm format:write && pnpm test
```

---

#### 4. Responsive Glassmorphism Patterns (MEDIUM - FR-025-029)

**Research Goal**: Ensure glassmorphism effects (backdrop-filter) work correctly on mobile and degrade gracefully when unsupported.

**Questions to Answer**:
- Does backdrop-filter perform well on mobile browsers? (Safari 14+, Chrome 90+ support confirmed)
- What fallback strategy for unsupported browsers? (solid background with same opacity, no blur)
- How to disable glassmorphism in high-contrast mode? (CSS custom property toggle, replace with solid)
- What layout adjustments needed for mobile viewports? (Stack components vertically, increase touch targets)

**Sources**:
- MDN backdrop-filter browser compatibility
- Neon Flux design system theme configuration (already implemented in Spec 013)
- Existing ThemeProvider implementation

**Deliverable**: Responsive glassmorphism guidance:
- Confirm backdrop-filter support in target browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+) ✓
- Fallback pattern: `@supports not (backdrop-filter: blur(10px)) { background: var(--color-surface-glass-fallback); }`
- High-contrast mode: disable backdrop-filter, use solid backgrounds with AAA contrast
- Mobile layout: Stack components provide automatic vertical stacking on <768px viewports

---

#### 5. Theme Switching Performance Optimization (MEDIUM - FR-020, SC-004)

**Research Goal**: Ensure theme changes complete in <200ms with zero React re-renders.

**Questions to Answer**:
- How does CSS variable update avoid React re-renders? (CSS variables trigger browser repaint, not React reconciliation)
- What causes Flash of Unstyled Content (FOUC)? (theme preference loaded after initial render)
- How to prevent FOUC? (inline script in index.html to set theme class before render)
- Is localStorage fast enough for theme persistence? (synchronous read, <10ms)

**Sources**:
- Existing ThemeProvider implementation (verify implementation)
- React performance profiling best practices
- CSS variable performance characteristics

**Deliverable**: Theme switching performance verification:
- CSS variable updates do NOT trigger React re-renders (verified by React DevTools profiler)
- FOUC prevention: inline script in index.html reads localStorage, sets theme class on `<html>` before React mounts
- localStorage read/write <10ms (synchronous, no async overhead)
- Theme switch flow: User clicks toggle → Update localStorage → Update CSS class on `<html>` → Browser repaints with new CSS variables → <200ms total

---

### Research Consolidation

**Output**: `research.md` documenting all decisions with rationale and alternatives.

---

## Phase 1: Design & Contracts

**Prerequisites:** `research.md` complete (Phase 0)

### 1. Data Model

**Status**: N/A - Pure UI migration introduces no new data entities.

**Rationale**: This feature affects only the presentation layer. No changes to database schema, API contracts, or data storage. Existing entities (Agent, Thread, User, Memory) unchanged.

---

### 2. Component Architecture Design

**Deliverable**: Component specifications for Input, Textarea, Select

**Design Approach** (based on ShadCN UI patterns + CVA):

#### Input Component

```typescript
// packages/ui/src/components/input.tsx

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const inputVariants = cva(
  'flex w-full rounded-md border transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-input bg-background text-foreground',
        error: 'border-destructive bg-destructive/10 text-foreground',
      },
      size: {
        default: 'h-10 px-3 py-2 text-sm',
        sm: 'h-8 px-2 py-1 text-xs',
        lg: 'h-12 px-4 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input, inputVariants };
```

**Design Decisions**:
- Polymorphic via type prop (text, email, password, etc.)
- CVA variants: default/error for states, sm/default/lg for sizes
- Design tokens: border-input, bg-background, text-foreground (map to Neon Flux)
- Accessibility: Supports aria-invalid, aria-describedby (passed via ...props)
- Ref forwarding: Enables parent form control

#### Textarea Component

```typescript
// packages/ui/src/components/textarea.tsx

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const textareaVariants = cva(
  'flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-input bg-background text-foreground',
        error: 'border-destructive bg-destructive/10 text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <textarea
        className={cn(textareaVariants({ variant, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea, textareaVariants };
```

**Design Decisions**:
- Min-height: 80px (3-4 lines visible)
- Variant system: default/error (consistent with Input)
- Design tokens: Same as Input for consistency
- Accessibility: Supports aria-invalid, aria-describedby

#### Select Component

```typescript
// packages/ui/src/components/select.tsx

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const selectTriggerVariants = cva(
  'flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-input bg-background text-foreground',
        error: 'border-destructive bg-destructive/10 text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> &
    VariantProps<typeof selectTriggerVariants>
>(({ className, variant, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(selectTriggerVariants({ variant, className }))}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

// ... (additional Select subcomponents: SelectContent, SelectItem, SelectValue)

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
```

**Design Decisions**:
- Uses Radix UI Select primitive (composable, accessible)
- Variant system: default/error (consistent with Input/Textarea)
- Icon: lucide-react ChevronDown (already in design library dependencies)
- Accessibility: Radix provides keyboard navigation, ARIA attributes

---

### 3. Migration Sequence Design

**Deliverable**: `quickstart.md` - Step-by-step migration guide

**Migration Order** (P1 → P2 → P3):

**Phase 1A: Design Library Expansion** (P1 - PREREQUISITE)
1. Add Input component to `packages/ui/src/components/input.tsx`
2. Add Textarea component to `packages/ui/src/components/textarea.tsx`
3. Add Select component to `packages/ui/src/components/select.tsx`
4. Create Storybook stories for each (input.stories.tsx, textarea.stories.tsx, select.stories.tsx)
5. Write unit tests + accessibility tests for each
6. Export from `packages/ui/src/index.ts`
7. Run hygiene loop (lint, format, test)

**Phase 1B: ESLint & Pre-commit Setup** (P1 - ENFORCEMENT)
1. Add husky devDependency to root `package.json`
2. Run `pnpm exec husky init`
3. Create `.husky/pre-commit` script (from Phase 0 research)
4. Update `.eslintrc.cjs` with custom rules (from Phase 0 research)
5. Test pre-commit hook with intentional violation (verify it blocks commit)
6. Test ESLint rules with intentional violation (verify build fails)

**Phase 1C: Form Component Migration** (P1 - FORMS)
1. Migrate `FieldError.tsx` → Use Text component with error variant, delete FieldError.css
2. Migrate `ValidationMessage.tsx` → Use Text component with caption variant, delete ValidationMessage.css
3. Migrate `BasicInfoSection.tsx` → Use Stack + Input/Textarea, delete BasicInfoSection.css
4. Migrate `LLMConfigSection.tsx` → Use Stack + Input/Select, delete LLMConfigSection.css
5. Migrate `MemoryConfigSection.tsx` → Use Stack + Input, delete MemoryConfigSection.css
6. Migrate `AutonomyConfigSection.tsx` → Use Stack + Input, delete AutonomyConfigSection.css
7. Migrate `AgentForm.tsx` → Use Stack/Box for layout, delete AgentForm.css
8. Run hygiene loop after each component
9. Manual smoke test: Create/edit agent, verify all fields work

**Phase 1D: Page Component Migration** (P1 - VISUAL CONSISTENCY)
1. Migrate `AgentCard.tsx` → Use Box/Stack/Text/Button for card layout
2. Migrate `AgentList.tsx` → Use Stack for list layout
3. Migrate `ThreadListItem.tsx` → Use Box/Stack/Text for item layout
4. Migrate `ThreadListView.tsx` → Use Stack for list layout
5. Verify `ChatView.tsx` → Check if already migrated (uses MessageBubble with design tokens)
6. Run hygiene loop after each component
7. Manual smoke test: Navigate homepage → agents page → chat, verify visual consistency

**Phase 2A: Theme Switching Verification** (P2 - PERFORMANCE)
1. Verify ThemeProvider implementation (CSS variable updates)
2. Add FOUC prevention inline script to `index.html` (if not already present)
3. Test theme switching with React DevTools profiler (verify zero re-renders)
4. Measure theme switch time (should be <200ms)
5. Manual smoke test: Toggle dark/light/high-contrast, verify performance

**Phase 2B: Responsive Design Verification** (P2 - MOBILE)
1. Test all pages at 375px viewport (Chrome DevTools)
2. Verify Stack components auto-stack vertically
3. Verify touch targets ≥44x44 pixels
4. Verify no horizontal scrolling
5. Test on real mobile device (iOS or Android)
6. Manual smoke test: Navigate all pages on mobile, verify usability

**Phase 3A: Empty States Enhancement** (P3 - POLISH)
1. Enhance empty state in `ThreadListView.tsx` (icon, heading, CTA)
2. Enhance empty state in `AgentsPage.tsx` (icon, heading, CTA)
3. Run hygiene loop
4. Manual smoke test: Delete all data, verify empty states

---

### 4. Agent Context Update

**Action**: Run `.specify/scripts/bash/update-agent-context.sh copilot`

**Purpose**: Update `.github/copilot-instructions.md` with new technology from this plan:
- husky (pre-commit hooks)
- Form input components (Input, Textarea, Select in @workspace/ui)
- ESLint enforcement rules

**Note**: Script will preserve manual additions between markers.

---

## Phase 2: Task Breakdown

**Status**: NOT GENERATED BY THIS COMMAND  
**Action**: Run `/speckit.tasks` after Phase 1 design is complete to generate `tasks.md` with detailed task breakdown.

---

## Completion Report

**Feature Branch**: `014-design-system-migration`  
**Implementation Plan Path**: `/Users/ronny/dev/cerebrobot/specs/014-design-system-migration/plan.md`

**Generated Artifacts**:
- ✅ plan.md (this file)
- ⏳ research.md (Phase 0 - to be generated by research agents)
- N/A data-model.md (pure UI migration, no data entities)
- ⏳ quickstart.md (Phase 1 - migration guide, to be generated)
- N/A contracts/ (no API changes)
- ⏳ tasks.md (Phase 2 - run /speckit.tasks command)

**Constitution Compliance**: ✅ All principles pass  
**Dependencies**: Spec 013 (Neon Flux Design System) must be complete - design library primitives available at `@workspace/ui`

**Next Steps**:
1. Verify Spec 013 completion (check `packages/ui` has Box, Stack, Text, Button)
2. Generate `research.md` (Phase 0 research agents)
3. Generate `quickstart.md` (Phase 1 migration guide)
4. Run `/speckit.tasks` to create detailed task breakdown

**Estimated Timeline** (based on spec priorities):
- Phase 1A (Design Library): 2-3 hours (3 components + tests + stories)
- Phase 1B (Enforcement): 1 hour (ESLint + husky)
- Phase 1C (Forms): 4-6 hours (7 components + tests)
- Phase 1D (Pages): 3-4 hours (5 components + tests)
- Phase 2A (Theme): 1 hour (verification + testing)
- Phase 2B (Responsive): 2 hours (testing + fixes)
- Phase 3A (Empty States): 1-2 hours (polish)
- **Total**: 14-19 hours

**Risk Assessment**:
- ⚠️ **Medium Risk**: Form input components may need multiple iterations to match Neon Flux aesthetic
- ⚠️ **Low Risk**: ESLint rules may have false positives requiring refinement
- ✅ **Low Risk**: Migration is reversible (git branch workflow, no rollback needed per user clarification)
