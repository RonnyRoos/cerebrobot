# Implementation Plan: Professional Design System with Neon Flux Theme

**Branch**: `013-neon-flux-design-system` | **Date**: 2025-11-02 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/013-neon-flux-design-system/spec.md`

## Summary

**Current State**: Cerebrobot has Neon Flux aesthetics partially implemented in chat components (MessageBubble, CodeBlock) with glassmorphism, purple/blue gradients, and CSS custom properties. However, theming is inconsistent (chat is dark, other pages are light/plain), tokens are chat-specific and not systematized, and no component primitives exist outside chat.

**Goal**: Extract and systematize the existing Neon Flux implementation into a professional, token-based design system following industry best practices (DTCG spec, Radix Themes). Transform `@workspace/ui` from ad-hoc chat components into a comprehensive, documented, and extensible foundation. Extend Neon Flux aesthetic from chat to all pages (agents, threads) for brand consistency.

**Technical Approach**: 
1. **Extract existing tokens** from `globals.css` into three-tier architecture (primitive → semantic → component)
2. **Migrate chat components** to use new token system (backward-compatible)
3. **Extend tokens** to cover non-chat UI (buttons, forms, layouts)
4. **Create primitives** (Box, Stack, Text, Button) using extracted patterns
5. **Apply Neon Flux consistently** across all pages
6. **Add theme switching** (dark/light/high-contrast)
7. **Document everything** with MDX catalog

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18+  
**Primary Dependencies**: 
- Design tokens: CSS custom properties (native web platform)
- Component library: React 18+ with `@radix-ui/react-*` primitives (existing from spec 012)
- Styling: Tailwind CSS 3.x (existing), PostCSS
- Documentation: MDX, Storybook 8.x (or custom catalog using Vite)
- Accessibility: WCAG AA compliance, tested with axe-core

**Storage**: N/A (design system is stateless; theme preference in localStorage)  
**Testing**: Vitest (existing), React Testing Library, axe accessibility tests  
**Target Platform**: Modern browsers (Chrome/Firefox/Safari latest 2 versions), no IE11 support  
**Project Type**: Monorepo package (`packages/ui`) consumed by `apps/client`  
**Performance Goals**: 
- Theme switching < 150ms
- Zero layout shift on theme change
- CSS bundle < 50KB gzipped (tokens + components)

**Constraints**:
- Must maintain existing Neon Flux aesthetic from spec 012
- Cannot break existing chat components (MessageBubble, CodeBlock, etc.)
- Documentation must be accessible to non-React developers (token reference usable in vanilla CSS)

**Scale/Scope**: 
- ~100 design tokens (color, typography, spacing, elevation, radius)
- 4 component primitives (Box, Stack, Text, Button)
- 3 themes (dark, light, high-contrast)
- 20-30 documentation pages (token reference, component guides, accessibility standards)

## Current State Analysis

**Audit Source**: [current-state-audit.md](current-state-audit.md) (Playwright inspection + codebase analysis)

### Existing Implementation ✅

1. **CSS Custom Properties** (`packages/ui/src/theme/globals.css`):
   - 12 color tokens for light/dark modes (chat-specific)
   - HSL format without `hsl()` wrapper (Tailwind convention for opacity)
   - Example: `--color-message-user-bg: 277 92% 62%` (purple #a855f7)

2. **Neon Flux Aesthetic in Chat**:
   - Glassmorphism (`backdrop-blur-md`)
   - Transparent backgrounds with opacity (`bg-message-user-bg/20`)
   - Glow shadows (`shadow-[0_0_20px_rgba(168,85,247,0.3)]`)
   - Purple/blue gradient colors (#a855f7, #3b82f6, #ec4899, #06b6d4)
   - Rounded corners (`rounded-2xl`)

3. **Chat Components** (`packages/ui/src/chat/`):
   - `MessageBubble` - fully styled with CVA variants
   - `CodeBlock` - syntax highlighting with purple borders
   - `TypingIndicator` - animated glowing dots
   - `Timestamp`, `CopyButton`, `Avatar`

4. **Tailwind Integration**:
   - `cn()` utility for class merging
   - Tailwind v3.x configured
   - Component library structure in place

### Gaps & Inconsistencies ❌

1. **No Token Architecture**:
   - Colors are flat (no primitive → semantic → component tiers)
   - Only chat colors defined (no buttons, backgrounds, borders for forms/lists)
   - No spacing/typography/radius/elevation tokens
   - Hardcoded values in components (`px-5`, `py-4`, `shadow-[0_0_20px_rgba(...)]`)

2. **Inconsistent Theming**:
   - Chat: Dark with Neon Flux (purple/blue glassmorphism)
   - Agents page: Dark but plain (no glassmorphism, black background)
   - Thread list: Light mode (white background, basic styling)
   - No theme switching mechanism

3. **No Component Primitives**:
   - No `<Box>`, `<Stack>`, `<Text>`, `<Button>`
   - Agent/thread pages use raw HTML (`<div>`, `<button>`)
   - Inconsistent spacing, alignment, typography

4. **No Documentation**:
   - No token reference
   - No component catalog
   - No accessibility guidelines

### Migration Strategy

**Phase 1 (P1)**: Extract & Systematize
- Extract existing colors into token tiers (primitive: `--color-purple-500`, semantic: `--color-text-primary`)
- Add missing tokens (spacing, typography, radius, elevation)
- Create Tailwind config extensions for token-based utilities
- **Keep existing chat components working** (backward-compatible refactor)

**Phase 2 (P2)**: Extend & Unify
- Create component primitives (Box, Stack, Text, Button)
- Extend Neon Flux to agents/threads pages
- Add theme switching (`.theme-dark`, `.theme-light`, localStorage persistence)
- Migrate existing components to use primitives

**Phase 3 (P3)**: Document & Polish
- Build MDX component catalog
- Document tokens with contrast ratios
- Accessibility audit and documentation

## Constitution Check

**Version**: 1.2.0 (from `.specify/memory/constitution.md`)

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Alignment** | ✅ Pass | Design system aligns with Cerebrobot mission (operator-focused tools, extensible architecture). Enables spec 012's frontend re-implementation. No scope creep. |
| **II. Completeness** | ✅ Pass | Spec defines all success criteria (50% faster dev, 100% token usage, WCAG AA compliance, 150ms theme switching). No ambiguous deliverables. |
| **III. Testability** | ✅ Pass | Measurable outcomes: token coverage metrics, accessibility audits (axe-core), theme switch performance profiling. Component primitive tests with React Testing Library. |
| **IV. Boundaries** | ✅ Pass | Phase 1 (P1) scope is bounded: tokens + typography + spacing only. Excludes animations (P3), complex components. |
| **V. Incrementality** | ✅ Pass | P1 (tokens/primitives) → P2 (themes) → P3 (catalog). Each phase delivers value independently. Can ship token system before component catalog. |
| **VI. Autonomy** | ✅ Pass | PM (spec author) has defined acceptance criteria. Engineer has implementation freedom for token naming conventions, component composition patterns. |
| **VII. Documentation** | ✅ Pass | Spec includes user stories (US-001 to US-006), functional requirements (FR-001 to FR-026), success criteria. This plan adds research.md, data-model.md, contracts/. |
| **VIII. Tool Intelligence** | ⚠️ Conditional | UX Designer mode exempts from MCP server usage. Context7 was used in planning phase for DTCG/Radix research (good practice). Sequential thinking applied for architecture decisions. |

**Assessment**: APPROVED for planning phase. No constitutional violations. Proceed with Phase 0 (research.md).

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/ui/               # Existing @workspace/ui package (from spec 012)
├── src/
│   ├── tokens/           # NEW: Design token definitions
│   │   ├── primitives/   # Base values (colors, font-sizes, spacing-scale)
│   │   ├── semantic/     # Role-based tokens (text-primary, bg-surface)
│   │   ├── themes/       # Theme-specific overrides (neon-flux.css, light.css)
│   │   └── index.ts      # Token exports (TypeScript type-safety)
│   ├── primitives/       # NEW: Component primitives (Box, Stack, Text, Button)
│   ├── components/       # EXISTING: Chat components from spec 012
│   │   ├── message-bubble.tsx
│   │   ├── code-block.tsx
│   │   └── ...
│   ├── hooks/            # EXISTING: useTheme, etc.
│   ├── lib/              # EXISTING: utils (cn function)
│   └── styles/           # MODIFIED: Add token CSS files
│       ├── globals.css
│       ├── tokens.css    # NEW: CSS custom property definitions
│       └── themes/       # NEW: Theme CSS imports
├── docs/                 # NEW: MDX documentation (component catalog)
│   ├── getting-started.mdx
│   ├── tokens/
│   │   ├── color.mdx
│   │   ├── typography.mdx
│   │   └── spacing.mdx
│   ├── primitives/
│   │   ├── box.mdx
│   │   ├── stack.mdx
│   │   └── ...
│   └── accessibility/
│       └── contrast-ratios.mdx
├── __tests__/            # EXISTING: Component tests
│   ├── primitives/       # NEW: Box.test.tsx, Stack.test.tsx
│   └── tokens/           # NEW: Token coverage tests
└── package.json

apps/client/              # EXISTING: Frontend app
└── src/
    └── prototypes/       # NEW: Design system playground
        └── design-system-demo/
            └── DesignSystemDemo.tsx
```

```

## Phase 0: Research

**Goal**: Document design system best practices and technical decisions to guide implementation.

**Process**: Create `research.md` with findings from Context7 queries (DTCG spec, Radix UI Themes) and architectural decisions.

**Key Research Areas**:
1. **Design Token Standards**: DTCG specification (Base/Alias/Component tiers), naming conventions (semantic vs descriptive)
2. **Component Composition**: Radix UI patterns (Theme component API, compound components, slot-based composition)
3. **CSS Architecture**: CSS custom properties for theming, variable naming conventions (--color-*, --space-*, --font-*)
4. **Accessibility**: WCAG AA/AAA contrast ratios, keyboard navigation, focus management
5. **Documentation**: MDX-based component catalog, interactive code examples, token reference tables

**Deliverable**: `research.md` (see Phase 0 section below for detailed content)

---

## Phase 1: Design & Contracts

**Goal**: Define data models, API contracts, and implementation guide before coding begins.

### Phase 1.1: Data Model

**Deliverable**: `data-model.md`

**Content**:
- **DesignToken Interface**: `{ name: string, value: string | number, category: 'color' | 'typography' | 'spacing' | 'elevation' | 'radius', description?: string, deprecated?: boolean }`
- **ColorToken**: `{ name: string, value: string (HSL/RGB), contrastRatio: number, semantic: boolean, variants?: { light: string, dark: string } }`
- **TypographyToken**: `{ name: string, fontFamily: string, fontSize: string, lineHeight: string, fontWeight: number, letterSpacing?: string }`
- **SpacingToken**: `{ name: string, value: string (rem/px), multiplier: number (4px base unit) }`
- **ThemeConfig**: `{ name: string, tokens: Record<string, string>, appearance: 'light' | 'dark', accentColor: string }`
- **ComponentPrimitive Props**: `{ as?: ElementType, className?: string, style?: CSSProperties, ...tokenProps (color, bg, p, m, etc.) }`

### Phase 1.2: Contracts

**Deliverable**: `contracts/` directory with API definitions

**Files**:
1. **token-api.md**: CSS custom property naming (`--color-text-primary`, `--space-4`, `--font-size-base`), token tier structure (primitive → semantic → component)
2. **component-api.md**: Box/Stack/Text/Button prop interfaces, polymorphic `as` prop, style prop merging behavior
3. **theme-api.md**: `<Theme>` component props, `useTheme()` hook API, theme switching mechanism (CSS class + localStorage)
4. **documentation-contract.md**: Component catalog page structure (Overview, Props, Usage, Accessibility, Examples), token reference table format

### Phase 1.3: Quickstart Guide

**Deliverable**: `quickstart.md`

**Content**:
```markdown
# Quickstart: Using the Design System

## Installation
\`\`\`bash
pnpm install @workspace/ui
\`\`\`

## Basic Usage (Tokens)
\`\`\`tsx
import '@workspace/ui/styles/tokens.css';
import '@workspace/ui/styles/themes/neon-flux.css';

// Use tokens in CSS
.my-component {
  color: var(--color-text-primary);
  padding: var(--space-4);
}
\`\`\`

## Basic Usage (Primitives)
\`\`\`tsx
import { Box, Stack, Text, Button } from '@workspace/ui/primitives';

function MyComponent() {
  return (
    <Stack spacing="4" direction="column">
      <Text size="lg" weight="bold">Hello World</Text>
      <Button variant="primary">Click me</Button>
    </Stack>
  );
}
\`\`\`

## Theming
\`\`\`tsx
import { Theme } from '@workspace/ui';

function App() {
  return (
    <Theme appearance="dark" accentColor="purple">
      {/* Your app */}
    </Theme>
  );
}
\`\`\`
```

### Phase 1.4: Agent Context Update

**Action**: Update `AGENTS.md` or `.specify/memory/` with design system patterns.

**Content**:
- Token naming conventions (use semantic names: `text-primary` not `gray-900`)
- Component primitive usage over raw HTML (`<Box>` instead of `<div>`)
- Theme switching mechanism (CSS class `.theme-dark`, `.theme-light`)
- Accessibility requirements (WCAG AA contrast, keyboard navigation)

---

## Phase 2: Task Breakdown

**Note**: This phase is executed by the `/speckit.tasks` command, NOT by `/speckit.plan`.

**Deliverable**: `tasks.md` (generated by task planning agent)

**Expected Structure**:
- P1 Tasks: Implement design tokens (primitives, semantic), typography system, spacing system
- P2 Tasks: Implement component primitives (Box, Stack, Text, Button), theme switching
- P3 Tasks: Build component catalog, accessibility audits

---

## Implementation Phases (Preview)

### P1: Token Foundation (US-001, US-002, US-003)

**Scope**: Design tokens (color, typography, spacing), CSS custom properties, TypeScript types

**Success Criteria**:
- 100% of primitive tokens defined (colors, font-sizes, spacing-scale)
- 100% of semantic tokens defined (text-primary, bg-surface, border-subtle)
- Zero hardcoded values in existing components
- All tokens documented with contrast ratios (WCAG AA compliance)

**Key Deliverables**:
- `packages/ui/src/tokens/primitives/colors.ts`
- `packages/ui/src/tokens/primitives/typography.ts`
- `packages/ui/src/tokens/primitives/spacing.ts`
- `packages/ui/src/tokens/semantic/text.ts`
- `packages/ui/src/tokens/semantic/backgrounds.ts`
- `packages/ui/src/styles/tokens.css` (CSS custom properties)

### P2: Component Primitives & Theming (US-004, US-005)

**Scope**: Box, Stack, Text, Button components, Theme provider, multi-theme support

**Success Criteria**:
- 4 component primitives implemented (Box, Stack, Text, Button)
- 3 themes functional (neon-flux, light, high-contrast)
- Theme switching < 150ms
- Zero layout shift on theme change

**Key Deliverables**:
- `packages/ui/src/primitives/Box.tsx`
- `packages/ui/src/primitives/Stack.tsx`
- `packages/ui/src/primitives/Text.tsx`
- `packages/ui/src/primitives/Button.tsx`
- `packages/ui/src/components/Theme.tsx`
- `packages/ui/src/styles/themes/neon-flux.css`

### P3: Documentation & Catalog (US-006)

**Scope**: Component catalog, token reference, accessibility guides, interactive examples

**Success Criteria**:
- 100% of tokens documented with usage examples
- 100% of primitives documented with interactive demos
- Accessibility guidelines published (contrast, keyboard nav, ARIA)

**Key Deliverables**:
- `packages/ui/docs/getting-started.mdx`
- `packages/ui/docs/tokens/color.mdx`
- `packages/ui/docs/primitives/box.mdx`
- `packages/ui/docs/accessibility/contrast-ratios.mdx`

---

## Phase 0: Research Details

**File**: `research.md` (to be generated)

### 1. Design Token Architecture (DTCG Spec)

**Source**: Design Tokens Community Group specification (via Context7)

**Key Findings**:
- **Token Tiers**: 
  - **Primitive Tokens**: Fundamental values with no semantic meaning (`color.purple.500: #a855f7`, `font.size.16: 1rem`)
  - **Semantic Tokens**: Role-based references (`color.text.primary: {$value: '{color.neutral.900}'}`)
  - **Component Tokens**: UI-specific tokens (`button.bg.primary: {$value: '{color.brand.600}'}`)
  
- **Naming Strategies**:
  - **Descriptive**: `purple-500`, `text-large` (good for primitives)
  - **Semantic**: `text-primary`, `bg-surface` (good for components)
  - **Recommendation**: Use descriptive for primitives, semantic for application-level tokens

- **Token Properties**:
  - `$value`: The token value (required)
  - `$type`: Token type hint (Color, Dimension, Font, Duration, etc.)
  - `$description`: Human-readable documentation

**Decision**: Use three-tier architecture (primitive → semantic → component) with semantic naming for application tokens.

### 2. Component Composition Patterns (Radix UI Themes)

**Source**: Radix UI Themes documentation (via Context7)

**Key Findings**:
- **Theme Component API**:
  ```tsx
  <Theme appearance="dark" accentColor="purple" radius="large" scaling="100%">
    {children}
  </Theme>
  ```
  - Props: `appearance`, `accentColor`, `grayColor`, `panelBackground`, `radius`, `scaling`
  - Nesting supported (local theme overrides)

- **CSS Variable Patterns**:
  - Color scales: `--accent-1` through `--accent-12` (light to dark)
  - Spacing: `--space-1` through `--space-9` (4px base unit)
  - Radius: `--radius-1` through `--radius-6`
  - Shadows: `--shadow-1` through `--shadow-6`

- **Component Composition**:
  - Polymorphic `as` prop for HTML element override
  - Style prop merging (user styles override defaults)
  - Slot-based composition for complex components

**Decision**: Adopt Radix UI's Theme component pattern and CSS variable naming conventions.

### 3. CSS Architecture

**Approach**: CSS custom properties for theming (no CSS-in-JS, no runtime cost)

**Structure**:
```css
/* packages/ui/src/styles/tokens.css */
:root {
  /* Primitive tokens */
  --color-purple-500: #a855f7;
  --color-pink-500: #ec4899;
  --font-size-base: 1rem;
  --space-4: 1rem;
  
  /* Semantic tokens (default to dark theme) */
  --color-text-primary: var(--color-neutral-50);
  --color-bg-surface: rgba(255, 255, 255, 0.05);
}

/* packages/ui/src/styles/themes/light.css */
.theme-light {
  --color-text-primary: var(--color-neutral-900);
  --color-bg-surface: rgba(0, 0, 0, 0.02);
}
```

**Performance**: CSS custom properties enable zero-cost theme switching (no re-render, just CSS variable update).

### 4. Accessibility Standards

**WCAG AA Requirements**:
- Normal text: 4.5:1 contrast ratio
- Large text (18pt+): 3:1 contrast ratio
- UI components: 3:1 contrast ratio

**WCAG AAA Requirements**:
- Normal text: 7:1 contrast ratio
- Large text: 4.5:1 contrast ratio

**Testing Tools**:
- `axe-core` for automated accessibility testing
- Manual keyboard navigation testing
- Screen reader testing (VoiceOver, NVDA)

**Decision**: Target WCAG AA for all text, WCAG AAA for high-contrast theme.

### 5. Documentation Best Practices

**Format**: MDX (Markdown + JSX) for interactive component examples

**Structure**:
```markdown
# Component Name

## Overview
Brief description, use cases

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|

## Usage
<CodeExample>
  <Button>Click me</Button>
</CodeExample>

## Accessibility
- Keyboard navigation: Tab, Enter
- ARIA labels: Required for icon-only buttons
- Focus management: Visible focus ring

## Examples
### Primary Button
<CodeExample>...</CodeExample>

### Secondary Button
<CodeExample>...</CodeExample>
```

**Decision**: Use MDX with live code examples, prioritize accessibility documentation.

---

## Notes & Open Questions

**Notes**:
- Existing chat components from spec 012 must be migrated to use new tokens (backward compatibility concern)
- Tailwind CSS integration: Tokens should map to Tailwind utilities where possible (e.g., `space-4` = `p-4`)
- Theme persistence: Use `localStorage` for theme preference (key: `cerebro-theme`)

**Open Questions**:
- Should we support CSS variable fallbacks for older browsers? (Decision: No, modern browsers only per Technical Context)
- MDX documentation vs Storybook? (Decision: Start with MDX, consider Storybook in future spec if needed)
- Token versioning strategy? (Decision: Defer to future spec, use semantic versioning for `@workspace/ui` package)

---

## Success Metrics (from Spec)

1. **50% faster component development**: Measure time to build new component before/after design system
2. **100% token usage**: Zero hardcoded colors/spacing in codebase (automated linting rule)
3. **WCAG AA compliance**: All text passes 4.5:1 contrast ratio (automated testing)
4. **<150ms theme switching**: Performance profiling of theme change
5. **30% CSS reduction**: Compare bundle size before/after token consolidation

---

## Timeline Estimate (Informational)

**P1 (Tokens)**: 1-2 weeks
- Define primitive tokens (2 days)
- Define semantic tokens (2 days)
- Create CSS custom property files (1 day)
- TypeScript type definitions (1 day)
- Documentation (2 days)

**P2 (Primitives + Themes)**: 1-2 weeks
- Implement Box/Stack (2 days)
- Implement Text/Button (2 days)
- Theme provider + switching (2 days)
- Migrate existing components to tokens (3 days)

**P3 (Documentation)**: 1 week
- Set up MDX infrastructure (1 day)
- Write component docs (3 days)
- Write token reference (1 day)
- Accessibility guide (1 day)

**Total**: 3-5 weeks (depends on parallel work and review cycles)

---

## Plan Approval

- [ ] PM reviewed and approved (spec alignment, scope clarity)
- [ ] Engineer reviewed and approved (technical feasibility, estimates)
- [ ] Constitution compliance verified (all principles pass)
- [ ] `research.md` generated
- [ ] `data-model.md` generated
- [ ] `contracts/` files generated
- [ ] `quickstart.md` generated
- [ ] Agent context updated

**Next Step**: Execute `/speckit.tasks` to generate `tasks.md` with concrete implementation tasks.
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
