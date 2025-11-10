# Research: UX Navigation Architecture Redesign

**Feature**: UX Navigation Architecture Redesign  
**Phase**: 0 - Research & Validation  
**Date**: 2025-11-07

---

## Overview

This document consolidates research for implementing a collapsible sidebar, memory panel overlay, multi-step wizard, and enhanced chat experience. All design decisions were validated via working HTML prototypes with exact CSS specifications extracted.

---

## Research Tasks & Findings

### Task 1: Sidebar Collapsible Navigation Pattern

**Research Question**: What are best practices for hover-expandable sidebars in modern web apps?

**Findings**:
- **Pattern**: Icon rail (48px) that expands to full labels (280px) on hover
- **Examples**: macOS Dock, Discord, VS Code Activity Bar
- **Key Decision**: Hover-to-expand works better than click-toggle for desktop (more intuitive, no state persistence UX)
- **Clarification**: User confirmed BOTH hover (temporary) AND click (sticky with localStorage) supported

**Implementation Details**:
- CSS: `width: 48px` → `width: 280px` with `transition: width 200ms ease-out`
- Labels: `opacity: 0` → `opacity: 1` with `transition: opacity 200ms ease-out`
- Icons: `flex-shrink: 0` prevents squashing during transition
- Labels: `white-space: nowrap` + `overflow: hidden` prevents text wrapping
- Active state: `box-shadow: 0 0 20px rgba(168, 85, 247, 0.4)` (purple glow)

**Alternatives Considered**:
- **Click-toggle only**: Rejected because requires button click, less discoverable
- **Always expanded**: Rejected because wastes screen space (chat is primary view)
- **Bottom bar (mobile)**: Accepted as responsive fallback (<768px)

**Source**: Prototypes validated exact CSS values

---

### Task 2: Memory Panel Slide-In Overlay

**Research Question**: How should the memory panel integrate with chat without disrupting workflow?

**Findings**:
- **Pattern**: Slide-in drawer from right edge (400px width)
- **Examples**: Gmail conversation details, Slack channel info, Notion page properties
- **Key Decision**: Overlay chat (don't push content) to maintain message context
- **Clarification**: User confirmed lazy load (load memory only when panel first opens)

**Implementation Details**:
- CSS: `transform: translateX(100%)` → `translateX(0)` with `transition: transform 200ms ease-out`
- Backdrop: `rgba(0, 0, 0, 0.4)` + `backdrop-filter: blur(8px)` for depth
- Z-index: Panel (50), Backdrop (40), Chat (0) to prevent layering conflicts
- Panel background: `rgba(26, 26, 46, 0.9)` (glassmorphic, slightly less transparent than sidebar)
- Close: Click backdrop, X button, or memory toggle button

**Alternatives Considered**:
- **Push chat content left**: Rejected because disrupts message reading flow
- **Full-screen modal**: Rejected because loses chat context (transparency principle)
- **Split-pane**: Rejected because reduces chat area too much on smaller screens

**Source**: Prototypes validated exact rgba values, z-index layering

---

### Task 3: Multi-Step Wizard for Agent Creation

**Research Question**: How can we reduce cognitive load for the 20+ field agent creation form?

**Findings**:
- **Pattern**: Wizard with 4 steps (Basic Info → LLM → Memory → Autonomy)
- **Examples**: Stripe Checkout, Shopify setup, GitHub Actions workflow editor
- **Key Decision**: Progress indicator with dots (12px diameter, 16px gap) at top
- **Clarification**: User confirmed discard all data on cancel (KISS, no draft persistence)

**Implementation Details**:
- Progress dots: 12px diameter, `gap: 16px`, active dot `scale(1.25)` + purple glow
- Active dot: Pulsing animation (`@keyframes pulse-glow { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }`, 1.5s infinite)
- Completed dots: `rgba(168, 85, 247, 0.5)` background
- Step title: Gradient text (`linear-gradient(135deg, #a855f7, #ec4899)`, `-webkit-background-clip: text`)
- Form grid: `grid-template-columns: 1fr 1fr` for Temperature/Max Tokens (2-column layout)
- Navigation: Back/Next buttons, "Create Agent" on final step

**Alternatives Considered**:
- **Single-page form with sections**: Rejected because still overwhelming (all fields visible)
- **Tabs instead of wizard**: Rejected because implies non-linear flow (wizard is sequential)
- **Save draft on cancel**: Rejected per user clarification (KISS, discard completely)

**Source**: Prototypes validated exact dot sizes, animations, gradient CSS

---

### Task 4: Enhanced Chat Message Bubbles

**Research Question**: How can chat messages match the Neon Flux cyberpunk aesthetic?

**Findings**:
- **Pattern**: Gradient backgrounds with subtle glows on hover
- **Examples**: Cyberpunk game UIs, neon-themed chat apps
- **Key Decision**: Different gradients for user (purple-pink) vs agent (blue-purple)

**Implementation Details**:
- User messages: `linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))` (purple-pink)
- Agent messages: `linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2))` (blue-purple)
- Hover glow: `box-shadow: 0 0 30px rgba(168, 85, 247, 0.6)` with `transition: all 150ms ease-in-out`
- Border: `rgba(168, 85, 247, 0.3)` for user, `rgba(59, 130, 246, 0.3)` for agent
- Text: `color: #e0e0e0` for readability against gradients

**Learnings**:
- **Opacity critical**: 20% opacity on gradients + 30% on borders creates depth without overwhelming text
- **Contrast ratio**: Validated 4.5:1 minimum (WCAG AA) with white text on gradient backgrounds
- **Performance**: Hardware-accelerated (`transform: translateZ(0)`) for smooth 60fps animations

**Alternatives Considered**:
- **Solid color backgrounds**: Rejected because doesn't match Neon Flux aesthetic
- **Stronger gradients (50% opacity)**: Rejected because reduces text readability
- **No hover effects**: Rejected because reduces interactivity cues

**Source**: Prototypes validated exact rgba values, contrast ratios

---

### Task 5: Design Token Strategy

**Research Question**: Which new design tokens are needed for consistency across components?

**Findings**:
- **Required Tokens**: Shadows (glows), animations (slide-in, fade, pulse), gradients (message bubbles)
- **Tailwind Extensions**: boxShadow, keyframes, animation, backgroundImage
- **Component Tokens**: Sidebar (widths, backgrounds, transitions), Panel (widths, backdrop, shadows), Wizard (dot sizes, colors, scales)

**Implementation Details**:
```typescript
// Shadows (boxShadow)
'glow-blue': '0 0 20px rgba(59, 130, 246, 0.4)'
'glow-pink': '0 0 20px rgba(236, 72, 153, 0.4)'
'glow-green': '0 0 20px rgba(34, 197, 94, 0.4)'

// Animations (keyframes + animation)
'slide-in-right': 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)'
'fade-in': 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)'
'pulse-glow': '1s cubic-bezier(0.4, 0, 0.6, 1) infinite'

// Gradients (backgroundImage)
'gradient-purple-pink': 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))'
'gradient-blue-purple': 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2))'
```

**Alternatives Considered**:
- **CSS custom properties**: Rejected because Tailwind IntelliSense works better with config-based tokens
- **Inline styles**: Rejected because violates Constitution Principle IX (design library first)

**Source**: Exact values extracted from working prototypes

---

### Task 6: Accessibility (WCAG 2.1 AA Compliance)

**Research Question**: What accessibility features are required for navigation components?

**Findings**:
- **Sidebar**: `<nav>` semantic element, `aria-current="page"` for active item, `aria-label` for collapsed icons
- **Panel**: `role="dialog"` + `aria-modal="true"`, focus trap (requires `react-focus-lock`), Esc to close
- **Wizard**: `aria-label="Step X of Y"` for progress, focus management (move to first field on step change)
- **Touch targets**: 44px minimum (current: 12px dots need click areas expanded to 44px if clickable)

**Implementation Details**:
- Focus indicators: `:focus-visible` with `ring-2` (Tailwind utility)
- Keyboard navigation: Tab, Enter, Esc (all handled via semantic HTML + event handlers)
- Screen reader: All interactive elements have accessible labels
- Contrast ratio: 4.5:1 minimum validated (white text on gradients)

**New Dependency Required**:
- `react-focus-lock@^2.9.4` for Panel focus trap (WCAG 2.1 AA modal requirement)
- Justification: Industry-standard (6M weekly downloads), zero breaking changes, WCAG compliance

**Source**: WCAG 2.1 AA guidelines, axe-core validation tooling

---

### Task 7: Component API Design

**Research Question**: How should component props be structured for flexibility and type safety?

**Findings**:
- **Pattern**: Controlled components (props-based) with sensible defaults
- **TypeScript**: Interfaces with JSDoc comments for IntelliSense
- **CVA**: Use class-variance-authority for variant API (size, variant, state)
- **Composability**: Use primitives (Box, Stack, Text, Button) inside composites

**Example API**:
```typescript
interface SidebarProps {
  isExpanded?: boolean;           // Controlled state
  onToggle?: () => void;          // Callback for toggle
  collapsedWidth?: number;        // Default: 48px
  expandedWidth?: number;         // Default: 280px
  children: React.ReactNode;      // SidebarItem components
}
```

**Alternatives Considered**:
- **Uncontrolled components**: Rejected because app needs to persist state to localStorage
- **React Context for state**: Rejected for components (keep them pure), but may use in App.tsx

**Source**: Existing design library patterns (Button, Input, Select)

---

## Decision Summary

| Topic | Decision | Rationale |
|-------|----------|-----------|
| **Sidebar expansion** | Both hover (temporary) AND click (sticky) | User preference, flexibility without complexity |
| **Memory panel position** | Right slide-in overlay (400px) | Maintains chat context, common pattern |
| **Memory loading** | Lazy load on panel open | Performance, transparency principle (user requests inspection) |
| **Wizard steps** | 4 steps (Basic, LLM, Memory, Autonomy) | Reduces cognitive load, logical grouping |
| **Wizard cancellation** | Discard all data (no draft) | KISS principle, simpler implementation |
| **Message gradients** | 20% opacity, 30% border | Visual richness + text readability (4.5:1 contrast) |
| **Progress indicator** | Dots (12px, scale 1.25 active) | Visible but not jarring, prototype-validated |
| **Design tokens** | Tailwind config extensions | IntelliSense autocomplete, consistency |
| **New dependency** | react-focus-lock only | WCAG compliance (focus trap), industry-standard |
| **Component structure** | Composites from primitives | Reusability, consistency, testability |

---

## Alternatives Considered & Rejected

| Alternative | Why Rejected | Evidence |
|-------------|-------------|----------|
| Click-toggle only sidebar | Less discoverable, requires button click | Prototype testing showed hover more intuitive |
| Full-screen memory modal | Loses chat context (violates transparency principle) | User wants to inspect memory WHILE chatting |
| Single-page agent form | Still overwhelming (20+ fields visible) | UX research shows wizards reduce abandonment |
| Save wizard draft on cancel | Adds complexity (schema, recovery UI, stale data) | User clarified KISS (discard completely) |
| Stronger gradients (50% opacity) | Reduces text readability (contrast ratio <4.5:1) | WCAG AA failed validation |
| CSS custom properties for tokens | Tailwind config works better with IntelliSense | Developer experience testing |
| Bottom navigation only (mobile) | Desktop needs persistent sidebar for productivity | User profile is desktop-first operator |

---

## Open Questions Resolved

1. **Q: Should sidebar expand on hover OR click?**  
   **A**: Both (hover for temporary, click for sticky with localStorage) - User confirmed 2025-11-07

2. **Q: Should wizard preserve data on cancel?**  
   **A**: No, discard completely (KISS principle) - User confirmed 2025-11-07

3. **Q: Should memory load on chat start or panel open?**  
   **A**: Lazy load on panel open (performance + transparency) - User confirmed 2025-11-07

4. **Q: Does memory panel relate to existing MemoryBrowser?**  
   **A**: Yes, reuse MemoryBrowser component with enhanced glassmorphic panel wrapper - User confirmed 2025-11-07

5. **Q: Should we use framer-motion for animations?**  
   **A**: No, CSS transitions sufficient (200ms slide-ins, 150ms fades) - Prototypes validated performance

---

## Next Steps

**Phase 1: Data Model & Contracts** (see data-model.md, contracts/)
- Extract TypeScript interfaces from component APIs
- Define state management contracts (sidebar, panel, wizard)
- Document component composition patterns

**Ready for implementation**: All research complete, all clarifications answered, all design values validated via prototypes.
