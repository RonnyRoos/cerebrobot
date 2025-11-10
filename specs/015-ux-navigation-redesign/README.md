# UX Architecture Redesign - Spec 015 (Draft)

**Status**: Draft - Prototyped & Validated  
**Created**: 2025-11-07  
**Phase**: 1.5 (Foundations - UX Architecture)

---

## Overview

This spec redesigns Cerebrobot's navigation and flow architecture to create an immersive cyberpunk command center experience while maintaining "transparency by design" for memory inspection.

**Core Changes**:
- Collapsible sidebar navigation (48px → 280px on hover)
- Memory panel overlay (400px slide-in from right)
- Multi-step agent creation wizard (4 steps instead of single 20+ field form)
- Enhanced chat experience (gradient message bubbles, glows, glassmorphism)

---

## Specification Documents

### 1. [UX Requirements](./ux-requirements.md)
**Purpose**: Designer-facing requirements and user flows  
**Audience**: UX/UI designers, product managers

**Key Sections**:
- User profile & pain points (single operator, Docker Compose deployment)
- Design decisions (collapsible sidebar, toggle memory panel, cyberpunk aesthetic)
- User flows (create agent → start chat, resume chat → inspect memory)
- Information architecture (sitemap, navigation patterns)
- Component patterns (sidebar, memory panel, wizard specifications)

**Status**: ✅ Validated with prototypes

---

### 2. [Design Specification](./design-spec.md)
**Purpose**: Engineer-facing implementation guide  
**Audience**: Frontend developers, React engineers

**Key Sections**:
- Component architecture (NavigationSidebar, MemoryPanel, AgentWizard, ChatView enhancements)
- TypeScript interfaces and props
- Layout implementation (App.tsx modifications, responsive breakpoints)
- Animation specifications (durations, easing, CSS transitions)
- Design tokens usage (colors, spacing, typography, shadows)
- Testing strategy (manual smoke tests, Vitest unit tests, axe-core accessibility)

**Status**: ✅ Validated with prototypes, exact CSS values confirmed

---

### 3. [Design System Impact](./design-system-impact.md)
**Purpose**: Design library expansion requirements  
**Audience**: Design system maintainers, @workspace/ui contributors

**Key Sections**:
- Required new components (Sidebar, Panel, Wizard, Badge)
- Design token additions (shadow glows, animations, gradients)
- Storybook expansion (24 new stories across 4 component families)
- Testing expansion (42 new unit tests, axe-core coverage)
- Migration path (3-phase: design library → tokens → app integration)
- Verification checklist (pre-merge requirements)

**Status**: ✅ Validated with prototypes, exact rgba values extracted

---

## Working Prototypes

### [01-collapsed-sidebar-chat.html](./prototypes/01-collapsed-sidebar-chat.html)
**Demonstrates**: Default chat view with hover-expandable sidebar

**Features**:
- Sidebar collapses to 48px (icon-only), expands to 280px on hover
- Labels fade in/out with `opacity` transition (200ms)
- Active nav item with purple glow (`box-shadow: 0 0 20px rgba(168, 85, 247, 0.4)`)
- Gradient message bubbles (purple/pink for user, blue/purple for agent)
- Memory update badges inline with messages
- Glassmorphic chat header (sticky, `z-index: 10`)

**Key Insights**:
- Hover-to-expand works better than click-toggle (more intuitive)
- `flex-shrink: 0` on icons prevents squashing during transition
- `white-space: nowrap` + `overflow: hidden` on labels prevents text wrapping

---

### [02-expanded-sidebar-memory-panel.html](./prototypes/02-expanded-sidebar-memory-panel.html)
**Demonstrates**: Memory panel overlay with backdrop dimming

**Features**:
- Expanded sidebar (280px) showing full navigation labels
- Memory panel slides in from right (400px width)
- Backdrop overlay (`rgba(0, 0, 0, 0.4)` + `backdrop-filter: blur(8px)`)
- Memory search, stats grid (total nodes, relations), node cards
- Panel slides with `transform: translateX(100%)` → `translateX(0)` (200ms)
- Click backdrop or X button to dismiss

**Key Insights**:
- Backdrop blur (8px) provides depth without obscuring chat
- Panel z-index (50) must match sidebar to prevent layering issues
- Memory cards need hover state (`border-color: rgba(168, 85, 247, 0.4)`) for interactivity
- Stats grid (`grid-template-columns: 1fr 1fr`) optimal for 2 metrics

---

### [03-agent-creation-wizard.html](./prototypes/03-agent-creation-wizard.html)
**Demonstrates**: Multi-step form with progress indicator

**Features**:
- 4-step wizard (Basic Info → LLM → Memory → Autonomy)
- Progress dots (12px diameter, 16px gap) at top
- Active dot: `scale(1.25)` + purple glow + pulsing animation (1.5s infinite)
- Completed dots: `rgba(168, 85, 247, 0.5)` background
- Step title with gradient text (`linear-gradient(135deg, #a855f7, #ec4899)`)
- Form grid (`grid-template-columns: 1fr 1fr`) for Temperature/Max Tokens
- Back/Next navigation with state management

**Key Insights**:
- Progress dots at 12px optimal for visibility and touch targets (44px min when clickable)
- Gradient text (`-webkit-background-clip: text`) creates cyberpunk aesthetic
- Form hints at `12px`, `color: #808080` provide context without clutter
- `max-width: 768px` wizard container prevents overly wide forms

---

## Prototype-Validated Design Decisions

### Colors (Exact RGBA Values)
```css
/* Backgrounds */
--body-gradient: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%);
--sidebar-bg: rgba(26, 26, 46, 0.8);
--panel-bg: rgba(26, 26, 46, 0.9);
--input-bg: rgba(255, 255, 255, 0.05);

/* Borders */
--border-subtle: rgba(255, 255, 255, 0.1);
--border-active: rgba(168, 85, 247, 0.3);

/* Shadows */
--glow-purple: 0 0 20px rgba(168, 85, 247, 0.4);
--glow-purple-hover: 0 0 30px rgba(168, 85, 247, 0.6);
--glow-blue: 0 0 20px rgba(59, 130, 246, 0.3);
--panel-shadow: -10px 0 50px rgba(0, 0, 0, 0.5);

/* Gradients */
--gradient-primary: linear-gradient(135deg, #a855f7, #ec4899);
--gradient-user-msg: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2));
--gradient-agent-msg: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2));
```

### Spacing (Exact Pixel Values)
```css
/* Sidebar */
--sidebar-collapsed: 48px;
--sidebar-expanded: 280px;
--sidebar-padding: 8px;
--nav-item-padding: 12px;
--nav-item-gap: 8px;

/* Memory Panel */
--panel-width: 400px;
--panel-padding: 24px;

/* Chat */
--message-gap: 16px;
--input-gap: 12px;

/* Wizard */
--progress-dot-size: 12px;
--progress-dot-gap: 16px;
--form-field-gap: 24px;
```

### Typography (Exact Font Sizes)
```css
/* Navigation */
--nav-icon-size: 24px;
--nav-label-size: 14px;
--nav-label-weight: 500;

/* Messages */
--message-content-size: 15px;
--message-line-height: 1.6;
--message-header-size: 12px;

/* Wizard */
--step-title-size: 28px;
--form-label-size: 14px;
--form-hint-size: 12px;

/* Panel */
--panel-title-size: 24px;
```

### Animations (Exact Timings)
```css
/* Sidebar */
--sidebar-transition: width 200ms ease-out;
--label-fade: opacity 200ms ease-out;

/* Memory Panel */
--panel-slide: transform 200ms ease-out;
--backdrop-fade: 150ms;

/* Buttons */
--button-hover: all 150ms ease-in-out;

/* Progress Dots */
--dot-transition: all 200ms ease-out;
--dot-pulse: pulse 1.5s infinite;
```

### Z-Index Layering
```css
--z-main-content: 0;
--z-chat-header: 10;
--z-backdrop: 40;
--z-sidebar: 50;
--z-panel: 50;
```

---

## Implementation Roadmap

### Phase 1: Design Library Components (Week 1)
**Effort**: 12 hours  
**Owner**: @workspace/ui maintainers

**Tasks**:
1. Create `Sidebar` component family (`Sidebar.tsx`, `SidebarItem.tsx`)
2. Create `Panel` component (`Panel.tsx`, `PanelHeader.tsx`, `PanelBackdrop.tsx`)
3. Create `Wizard` component family (`Wizard.tsx`, `WizardStep.tsx`, `WizardProgress.tsx`)
4. Create `Badge` component (`Badge.tsx`)
5. Add Storybook stories (24 total)
6. Write unit tests (42 total)
7. Export from `@workspace/ui/src/index.ts`

**Validation**: All components render in Storybook, tests pass, axe-core compliant

---

### Phase 2: Design Tokens (Week 1)
**Effort**: 2 hours  
**Owner**: Design system maintainers

**Tasks**:
1. Update `packages/ui/tailwind.config.ts`:
   - Add shadow glows (`glow-blue`, `glow-pink`, `glow-green`)
   - Add animations (`slide-in-right`, `slide-in-left`, `fade-in`, `pulse-glow`)
   - Add gradients (`gradient-purple-pink`, `gradient-blue-purple`, `gradient-neon-glow`)
2. Update `packages/ui/src/styles/tokens.ts`:
   - Add sidebar tokens (widths, backgrounds, borders, transitions)
   - Add panel tokens (widths, backdrop, shadows, slide duration)
   - Add wizard tokens (dot sizes, colors, scales)

**Validation**: Tailwind IntelliSense autocompletes new utilities, no build errors

---

### Phase 3: App Integration (Week 2)
**Effort**: 6 hours  
**Owner**: Frontend engineers

**Tasks**:
1. Update `apps/client/src/App.tsx`:
   - Import `Sidebar`, `Panel` from `@workspace/ui`
   - Add sidebar state management (activeRoute, expanded)
   - Wrap app in flex layout (sidebar + main content)
2. Create `apps/client/src/components/NavigationSidebar.tsx` (app-specific wrapper)
3. Create `apps/client/src/components/MemoryPanel.tsx` (reuse MemoryBrowser)
4. Update `apps/client/src/components/ChatView.tsx`:
   - Add memory toggle button in header
   - Enhance MessageBubble with gradients
5. Create `apps/client/src/components/AgentWizard.tsx`:
   - Extract step components from existing AgentForm
   - Wire up Wizard from @workspace/ui

**Validation**: App renders without errors, navigation works, memory panel slides in/out

---

### Phase 4: Testing & QA (Week 2)
**Effort**: 4 hours  
**Owner**: QA engineers

**Tasks**:
1. Manual smoke tests (sidebar expand/collapse, memory panel, wizard steps)
2. Keyboard navigation tests (Tab, Enter, Esc, Ctrl+/, Ctrl+M)
3. Mobile responsive tests (resize to <768px, verify bottom bar)
4. Accessibility audit (axe-core, screen reader testing)

**Validation**: All flows complete successfully, WCAG AA compliance, 0 regressions

---

### Phase 5: Documentation (Week 2)
**Effort**: 2 hours  
**Owner**: Tech writers

**Tasks**:
1. Update `packages/ui/README.md` with new components
2. Add usage examples to Storybook docs
3. Update `AGENTS.md` with new navigation patterns
4. Create video walkthrough (optional)

**Validation**: Docs accurate, examples run without errors

---

## Total Effort: 26 hours over 2 weeks

---

## Success Criteria

### UX Metrics (Post-Implementation)
- ✅ **Navigation clarity**: 100% task completion for "find memory panel" flow
- ✅ **Agent creation time**: < 2 minutes (down from ~5 minutes)
- ✅ **Form completion rate**: ≥90% (wizard reduces abandonment)
- ✅ **Memory panel usage**: ≥50% of chat sessions open memory panel at least once

### Technical Metrics
- ✅ Zero hardcoded colors (100% design tokens or exact rgba values)
- ✅ All navigation components use `@workspace/ui` primitives (or custom if not available)
- ✅ Animations complete in <200ms (perceived instant feedback)
- ✅ WCAG AA compliance (4.5:1 contrast minimum, 44px touch targets)

### Visual Quality Benchmarks
- ✅ Glassmorphism effects render correctly in Chrome/Firefox/Safari
- ✅ Neon glows visible on hover (purple for primary, blue for active)
- ✅ Animations smooth (60fps) with hardware acceleration
- ✅ Mobile responsive (no horizontal scroll, buttons tappable)

---

## Known Limitations & Future Work

### Out of Scope (Defer to Future Specs)
1. **Dashboard Landing Page** - Agent status cards, recent activity overview
2. **Dedicated Memory Graph View** - Full-screen node/relation visualization (Phase 2+)
3. **Settings Page** - Theme selector, user preferences, system config
4. **Agent Switcher Dropdown** - Quick agent change without navigation
5. **Thread Search** - Search across all conversations
6. **Mobile Bottom Bar** - Full implementation (prototype shows concept only)

### Technical Debt
- **Hover-to-expand sidebar** - May need click-to-lock variant for touch devices
- **Memory panel position** - Right-aligned optimal for LTR, needs RTL support
- **Progress dots clickable** - Prototype non-interactive, production should allow step jumping

---

## References

### Internal Documents
- [Spec 013: Neon Flux Design System](../013-neon-flux-design-system/spec.md)
- [Spec 014: Design System Migration](../014-design-system-migration/spec.md)
- [Mission Statement](../../docs/mission.md)
- [Constitution Principles](../../.specify/memory/constitution.md)

### External Resources
- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [CVA Documentation](https://cva.style/docs) - Variant API patterns
- [Tailwind CSS Docs](https://tailwindcss.com/docs) - Utility classes reference

---

## Feedback & Iteration

**Status**: Draft - Awaiting review from:
- [ ] Product Manager (UX requirements validation)
- [ ] Lead Designer (visual design approval)
- [ ] Tech Lead (implementation feasibility)
- [ ] QA Lead (testing strategy review)

**Next Steps**:
1. Review prototypes in browser (`open specs/draft-spec/prototypes/*.html`)
2. Provide feedback on UX flows, visual design, technical approach
3. Approve for implementation or request revisions
4. Move to `specs/015-ux-architecture-redesign/` when finalized

---

**Last Updated**: 2025-11-07  
**Author**: GitHub Copilot (UX Designer Mode)
