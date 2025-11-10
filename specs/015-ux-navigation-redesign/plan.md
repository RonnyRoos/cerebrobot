# Implementation Plan: UX Navigation Architecture Redesign

**Branch**: `015-ux-navigation-redesign` | **Date**: 2025-11-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-ux-navigation-redesign/spec.md`

## Summary

This implementation plan covers a comprehensive UX navigation redesign introducing a collapsible sidebar (48px→280px), memory panel overlay (400px slide-in), multi-step agent wizard (4 steps), and enhanced chat visuals (gradient bubbles, glows). The implementation follows a 3-phase approach: **Phase 1 - Design Library Components** (4 new components: Sidebar, Panel, Wizard, Badge), **Phase 2 - Design Tokens** (shadows, animations, gradients), and **Phase 3 - App Integration** (replace existing UI with design system components).

**Technical Approach**: Build on completed Spec 014 (Design System Migration) foundation where all existing UI uses `@workspace/ui` components. Add 4 new composite components to the design library following Neon Flux patterns (glassmorphism, gradients, glows), then integrate into `apps/client/src/` using existing primitives (Box, Stack, Text, Button). All design values validated via working HTML prototypes with exact CSS specifications.

## Technical Context

**Language/Version**: TypeScript 5.5+, Node.js ≥20  
**Primary Dependencies**: 
- React 18+ (frontend framework)
- Fastify 5.6.1 (backend, no changes needed)
- @workspace/ui (design library - will be extended)
- Tailwind CSS 3.4.15+ (styling system)
- class-variance-authority (CVA) 0.7.0+ (variant API)
- Storybook 10.0.2+ (component documentation)

**Storage**: 
- localStorage (sidebar state, agent filter persistence)
- Existing Postgres/Prisma (no schema changes)

**Testing**: 
- Vitest (unit tests for new components)
- vitest-axe (accessibility validation)
- Storybook (visual documentation)
- Manual smoke tests (navigation flows, responsive breakpoints)

**Target Platform**: Desktop-first web application (Chrome/Firefox/Safari latest), responsive mobile support

**Project Type**: Monorepo web application (React frontend in `apps/client/`, design library in `packages/ui/`)

**Performance Goals**: 
- Navigation transitions <200ms (perceived instant)
- Memory panel slide-in <200ms
- Sidebar expand/collapse <200ms
- Page load remains <1s (no regression)
- Theme switching <200ms (existing constraint)

**Constraints**: 
- Must use `@workspace/ui` design library (Constitution Principle IX)
- No hardcoded colors/spacing (design tokens only)
- WCAG 2.1 AA accessibility compliance (4.5:1 contrast, 44px touch targets)
- Zero CSS files (CSS-in-JS via Tailwind utilities)
- Mobile responsive (<768px viewport)
- Backward compatible with existing routes/state

**Scale/Scope**: 
- 4 new composite components (Sidebar, Panel, Wizard, Badge)
- 3 design token categories (shadows, animations, gradients)
- 24 new Storybook stories
- 42 new unit tests
- 5 user stories (2 P1, 2 P2, 1 P3)
- 47 functional requirements
- Estimated 26 hours implementation (2 weeks)
- Zero backend/database changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Hygiene-First Development ✅ PASS
- **Requirement**: `pnpm lint` → `pnpm format:write` → `pnpm test` in strict order
- **Status**: All new components will follow hygiene loop before commit
- **Verification**: Pre-commit hooks already enforced (Spec 014), no changes needed

### II. Transparency & Inspectability ✅ PASS
- **Requirement**: Memory graph observable by operators
- **Status**: Memory panel (FR-010 to FR-017) provides real-time inspection UI
- **Enhancement**: This spec IMPROVES transparency with dedicated slide-in panel

### III. Type Safety & Testability ✅ PASS
- **Requirement**: No `any` types, dependency injection, 3-tier testing
- **Status**: 
  - All new components use TypeScript interfaces with explicit types
  - Components are pure (props-based), no hidden dependencies
  - Unit tests (42 new tests), manual smoke tests documented
- **Testing Strategy**:
  - **Tier 1 (Unit)**: Vitest tests for all 4 new components (sidebar, panel, wizard, badge)
  - **Tier 2 (Postgres)**: N/A - no database changes
  - **Tier 3 (Manual)**: Navigation flows, responsive breakpoints, accessibility

### IV. Incremental & Modular Development ✅ PASS
- **Requirement**: Small commits, independently testable increments, prioritized user stories
- **Status**: 
  - Implementation broken into 3 phases (design library → tokens → app integration)
  - 5 user stories with clear priorities (2 P1, 2 P2, 1 P3)
  - Each component independently testable in Storybook
  - Each user story can be tested without dependencies

### V. Stack Discipline ✅ PASS
- **Requirement**: Use approved stack, justify deviations with ADR
- **Status**: 
  - Uses existing stack: React 18+, Tailwind CSS 3.4.15+, Vitest, Storybook 10.0.2+
  - Only new dependency: `react-focus-lock@^2.9.4` (for Panel focus trap, WCAG compliance)
- **Justification**: `react-focus-lock` required for WCAG 2.1 AA modal accessibility (focus trap), industry-standard library (6M weekly downloads), zero breaking changes

### VI. Configuration Over Hardcoding ✅ PASS
- **Requirement**: External dependencies swappable via config
- **Status**: 
  - No external API dependencies added
  - Sidebar state persisted in localStorage (configurable key)
  - All visual values use design tokens (no hardcoded colors/spacing)
- **N/A**: No LLM/storage/networking changes

### VII. Operator-Centric Design ✅ PASS
- **Requirement**: Single-operator, self-hosted hobby deployments
- **Status**: 
  - No backend changes (Docker Compose deployment unaffected)
  - Memory editing remains safe (read-only panel in P1, edits deferred to Phase 2)
  - Enhanced UX reduces cognitive load (wizard, sidebar navigation)

### VIII. MCP Server Utilization ✅ PASS
- **Requirement**: Use SequentialThinking, Context7, Serena, Playwright, Memory when applicable
- **Status**: 
  - SequentialThinking: Used for multi-step planning (this plan)
  - Context7: Will query React/Tailwind docs during implementation if needed
  - Serena: Will use for code navigation during app integration
  - Playwright: Can use for UI debugging/smoke tests
  - Memory: Can use for preserving design decisions across sessions

### IX. Design Library First ✅ PASS
- **Requirement**: All UI components use `@workspace/ui`, contribute missing components first
- **Status**: 
  - **CRITICAL COMPLIANCE**: This spec adds 4 new components to design library BEFORE app usage
  - Phase 1: Build components in `packages/ui/` with Storybook + tests
  - Phase 2: Add design tokens (no ad-hoc Tailwind classes)
  - Phase 3: Import from `@workspace/ui` in app (no one-off implementations)
- **Workflow**: Sidebar → Panel → Wizard → Badge (all in design library first, then app integration)

---

## Constitution Compliance Summary

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Hygiene-First | ✅ PASS | Hygiene loop enforced via pre-commit hooks |
| II. Transparency | ✅ PASS | Memory panel improves observability |
| III. Type Safety | ✅ PASS | TypeScript interfaces, 42 new unit tests |
| IV. Incremental | ✅ PASS | 3 phases, 5 prioritized user stories |
| V. Stack Discipline | ✅ PASS | Only 1 new dep (react-focus-lock, justified) |
| VI. Configuration | ✅ PASS | localStorage for state, design tokens for styles |
| VII. Operator-Centric | ✅ PASS | No backend changes, enhanced UX |
| VIII. MCP Utilization | ✅ PASS | SequentialThinking for planning, Context7/Serena ready |
| IX. Design Library First | ✅ PASS | **CRITICAL**: 4 components added to library FIRST |

**GATE RESULT: ✅ ALL CHECKS PASS - Proceed to Phase 0 Research**

## Project Structure

### Documentation (this feature)

```text
specs/015-ux-navigation-redesign/
├── spec.md                    # Feature specification (complete)
├── plan.md                    # This file (implementation plan)
├── research.md                # Phase 0 output (generated below)
├── data-model.md              # Phase 1 output (generated below)
├── quickstart.md              # Phase 1 output (generated below)
├── contracts/                 # Phase 1 output (component APIs)
│   ├── Sidebar.ts            # TypeScript interfaces for Sidebar component
│   ├── Panel.ts              # TypeScript interfaces for Panel component
│   ├── Wizard.ts             # TypeScript interfaces for Wizard component
│   └── Badge.ts              # TypeScript interfaces for Badge component
├── tasks.md                   # Phase 2 output (/speckit.tasks command)
├── README.md                  # Overview with prototype insights (complete)
├── ux-requirements.md         # User flows & design decisions (complete)
├── design-spec.md             # Component implementation guide (complete)
├── design-system-impact.md    # Design library expansion plan (complete)
├── prototypes/                # Working HTML demos (complete)
│   ├── 01-collapsed-sidebar-chat.html
│   ├── 02-expanded-sidebar-memory-panel.html
│   └── 03-agent-creation-wizard.html
└── checklists/
    └── requirements.md        # Quality validation (complete)
```

### Source Code (monorepo structure)

```text
# Design Library (Phase 1 - NEW COMPONENTS)
packages/ui/
├── src/
│   ├── components/
│   │   ├── sidebar/          # NEW - Navigation sidebar family
│   │   │   ├── Sidebar.tsx
│   │   │   ├── SidebarItem.tsx
│   │   │   └── SidebarToggle.tsx
│   │   ├── panel/            # NEW - Overlay panel family
│   │   │   ├── Panel.tsx
│   │   │   ├── PanelHeader.tsx
│   │   │   └── PanelBackdrop.tsx
│   │   ├── wizard/           # NEW - Multi-step form family
│   │   │   ├── Wizard.tsx
│   │   │   ├── WizardStep.tsx
│   │   │   ├── WizardProgress.tsx
│   │   │   └── WizardNavigation.tsx
│   │   └── badge/            # NEW - Status indicator
│   │       └── Badge.tsx
│   ├── stories/              # NEW - Storybook documentation
│   │   ├── sidebar.stories.tsx
│   │   ├── panel.stories.tsx
│   │   ├── wizard.stories.tsx
│   │   └── badge.stories.tsx
│   ├── theme/
│   │   └── tokens/           # MODIFIED - Add new design tokens
│   │       ├── primitives.ts
│   │       ├── semantic.ts
│   │       └── component.ts  # Add sidebar, panel, wizard, badge tokens
│   └── index.ts              # MODIFIED - Export new components
├── __tests__/
│   └── components/           # NEW - Unit tests
│       ├── sidebar.test.tsx
│       ├── panel.test.tsx
│       ├── wizard.test.tsx
│       └── badge.test.tsx
└── tailwind.config.ts        # MODIFIED - Add shadows, animations, gradients

# Client Application (Phase 3 - INTEGRATION)
apps/client/
├── src/
│   ├── App.tsx               # MODIFIED - Add sidebar layout, routing
│   ├── components/
│   │   ├── NavigationSidebar.tsx  # NEW - App-specific sidebar wrapper
│   │   ├── MemoryPanel.tsx        # NEW - Memory graph panel (uses MemoryBrowser)
│   │   ├── AgentWizard.tsx        # NEW - Multi-step agent creation
│   │   ├── ChatView.tsx           # MODIFIED - Add memory toggle, gradient bubbles
│   │   ├── ThreadListView.tsx     # MODIFIED - Add agent filter UI
│   │   └── MessageBubble.tsx      # MODIFIED - Add gradient backgrounds, glows
│   └── hooks/
│       ├── useSidebarState.ts     # NEW - Sidebar expand/collapse logic
│       ├── useMemoryPanel.ts      # NEW - Memory panel open/close logic
│       └── useAgentFilter.ts      # NEW - Thread list filtering logic
├── index.html                # NO CHANGES (existing setup)
└── vite.config.ts            # NO CHANGES (existing setup)

# Backend (NO CHANGES)
apps/server/
└── (unchanged)

# Database (NO CHANGES)
prisma/
└── (unchanged)
```

**Structure Decision**: 
This implementation follows the **Design Library First** pattern (Constitution Principle IX). All new UI components are built in `packages/ui/` with Storybook documentation and unit tests BEFORE being used in `apps/client/`. The monorepo structure enables incremental development:
1. **Phase 1**: Build isolated components in design library (testable in Storybook)
2. **Phase 2**: Add design tokens (shadows, animations, gradients)
3. **Phase 3**: Import components in app, wire up app-specific logic (routing, state management)

This approach ensures reusability, prevents one-off implementations, and maintains design system consistency (all validated via prototypes).

## Complexity Tracking

> **This section intentionally left blank - NO CONSTITUTION VIOLATIONS**

All constitution checks passed (see Constitution Check section above). No violations to justify.

**Simplicity Maintained**:
- Using existing approved stack (React, Tailwind, Vitest, Storybook)
- Only 1 new dependency (`react-focus-lock`, justified for WCAG compliance)
- No new abstractions (components built from existing primitives)
- No backend/database changes (frontend-only enhancement)
- No breaking changes to existing code (additive changes only)

---

## Phase 0-1 Complete

**Deliverables Generated**:
- ✅ `research.md` - Research findings, design decisions, alternatives considered
- ✅ `data-model.md` - Entity definitions, state contracts, relationships
- ✅ `contracts/` - TypeScript interfaces for all 4 component families
  - `Sidebar.ts` - Navigation sidebar component contracts
  - `Panel.ts` - Overlay panel component contracts
  - `Wizard.ts` - Multi-step wizard component contracts
  - `Badge.ts` - Status indicator component contracts
- ✅ `quickstart.md` - Step-by-step implementation guide (2 weeks, 26 hours)

**Constitution Re-Check**: ✅ ALL CHECKS STILL PASS (no violations introduced during design)

**Next Steps**:
1. **Developer Action**: Run `/speckit.tasks` to generate `tasks.md` with detailed checklist
2. **Implementation**: Follow `quickstart.md` guide for phased implementation
3. **Testing**: Run hygiene loop after every significant change
4. **Validation**: Use manual smoke test checklist from `quickstart.md` Phase 4

**Ready for Implementation**: All planning artifacts complete, design validated via prototypes, constitution compliant.

---

## Summary

**Branch**: `015-ux-navigation-redesign`  
**Feature Spec**: [spec.md](./spec.md)  
**Implementation Plan**: This document  
**Estimated Effort**: 26 hours over 2 weeks

**Key Deliverables**:
- 4 new design library components (Sidebar, Panel, Wizard, Badge)
- 3 design token categories (shadows, animations, gradients)
- 24 new Storybook stories
- 42 new unit tests
- Enhanced chat experience (gradient bubbles, glows)
- Memory panel integration (lazy loading, slide-in animation)

**Constitution Compliance**: ✅ All 9 principles validated (Hygiene-First, Transparency, Type Safety, Incremental, Stack Discipline, Configuration, Operator-Centric, MCP Utilization, Design Library First)

**Risk Level**: LOW (additive changes only, no breaking changes, prototypes validated)

**Blockers**: None (Spec 014 complete, all research complete, all clarifications answered)
