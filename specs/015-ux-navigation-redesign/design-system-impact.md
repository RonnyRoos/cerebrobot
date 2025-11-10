# Design System Impact Analysis: UX Architecture Redesign

**Spec ID**: 015  
**Status**: Draft  
**Created**: 2025-11-07  
**Target**: `@workspace/ui` Design Library

---

## Executive Summary

The UX Architecture Redesign (Spec 015) requires **4 new composite components** and **3 new design tokens** to be added to the `@workspace/ui` design library. All proposed components follow the Neon Flux design system principles (glassmorphism, gradients, glows) and build upon existing primitives (Box, Stack, Text, Button).

**Impact Level**: **MODERATE** - New components required, but no breaking changes to existing primitives.

**Migration Path**: Incremental - new components can be added without affecting existing code.

**Prototype Validation**: All design tokens and component APIs validated in working HTML prototypes (`specs/draft-spec/prototypes/`). Visual specifications match rendered output exactly.

**Key Learnings from Prototypes**:
1. **Sidebar hover-expand works better than click-toggle** - More intuitive, doesn't require state persistence UX
2. **Exact color values critical** - `rgba(26, 26, 46, 0.8)` vs Tailwind tokens ensures cross-browser consistency
3. **Z-index layering must be explicit** - Sidebar (50), backdrop (40), panel (50) prevents conflicts
4. **Glassmorphism requires backdrop-filter + background** - Both properties needed for proper effect
5. **Progress dots scale (1.25) optimal** - Visible but not jarring, 12px base size works on all screens
6. **Message gradients need careful opacity** - 20% opacity with 30% border creates depth without overwhelming text

---

## Required New Components

### 1. Sidebar Component Family

**Location**: `packages/ui/src/components/sidebar/`

**New Files**:
- `Sidebar.tsx` - Collapsible navigation sidebar container
- `SidebarItem.tsx` - Individual navigation item
- `SidebarToggle.tsx` - Collapse/expand button
- `sidebar.stories.tsx` - Storybook documentation
- `sidebar.test.tsx` - Unit tests

**Design Rationale**:
Currently, `@workspace/ui` has NO navigation components. The sidebar is a critical pattern for multi-page applications and should be reusable across future features (not just this redesign).

**Component API**:
```typescript
// Sidebar.tsx
export interface SidebarProps {
  /** Controlled expanded state */
  isExpanded?: boolean;
  
  /** Callback when toggle clicked */
  onToggle?: () => void;
  
  /** Width when collapsed (default: 48px) */
  collapsedWidth?: number;
  
  /** Width when expanded (default: 280px) */
  expandedWidth?: number;
  
  /** Position (default: left) */
  position?: 'left' | 'right';
  
  /** Children (SidebarItem components) */
  children: React.ReactNode;
  
  /** Additional CSS classes */
  className?: string;
}

// SidebarItem.tsx
export interface SidebarItemProps {
  /** Icon (emoji or React component) */
  icon: React.ReactNode;
  
  /** Label text (hidden when collapsed) */
  label: string;
  
  /** Active state */
  active?: boolean;
  
  /** Click handler */
  onClick?: () => void;
  
  /** Badge count (optional) */
  badge?: number;
  
  /** Additional CSS classes */
  className?: string;
}
```

**Design Tokens Required**:
```typescript
// packages/ui/src/styles/tokens.ts (additions)

export const componentTokens = {
  sidebar: {
    // Widths
    collapsedWidth: '48px',
    expandedWidth: '280px',
    
    // Background (validated in prototype)
    background: 'rgba(26, 26, 46, 0.8)',
    backdropBlur: '24px',
    
    // Borders
    border: 'rgba(255, 255, 255, 0.1)',
    borderWidth: '1px',
    
    // Item states
    itemHoverBg: 'hsl(var(--surface))',
    itemActiveBg: 'hsl(var(--accent-primary) / 0.1)',
    itemActiveBorder: 'hsl(var(--accent-primary))',
    itemActiveShadow: 'var(--shadow-glow-purple)',
    
    // Transitions
    expandDuration: '200ms',
    expandEasing: 'cubic-bezier(0.4, 0, 0.2, 1)', // ease-out
  },
};
```

**Storybook Stories Required**:
- Collapsed state (default)
- Expanded state
- With active item
- With badge counts
- Right-positioned variant
- Mobile variant (bottom bar)

**Testing Requirements**:
- ✅ Renders collapsed by default
- ✅ Expands when toggle clicked
- ✅ Persists state to localStorage
- ✅ Calls onClick when item clicked
- ✅ Highlights active item correctly
- ✅ Keyboard navigation works (Tab, Enter)
- ✅ ARIA attributes present (`aria-current`, `aria-label`)
- ✅ No accessibility violations (axe-core)

**Accessibility Considerations**:
- Sidebar uses `<nav>` semantic element
- Items use `<button>` or `<a>` depending on navigation type
- Active item has `aria-current="page"`
- Collapsed items still have accessible labels (`aria-label`)
- Focus visible on keyboard navigation (`:focus-visible`)

---

### 2. Panel (Overlay) Component

**Location**: `packages/ui/src/components/panel/`

**New Files**:
- `Panel.tsx` - Slide-in overlay panel container
- `PanelHeader.tsx` - Header with title and close button
- `PanelBackdrop.tsx` - Dimmed backdrop overlay
- `panel.stories.tsx` - Storybook documentation
- `panel.test.tsx` - Unit tests

**Design Rationale**:
The Memory Panel pattern is a common "slide-in drawer" UI, useful for filters, settings, notifications, etc. This component should be generic and reusable (not memory-specific).

**Component API**:
```typescript
// Panel.tsx
export interface PanelProps {
  /** Whether panel is visible */
  isOpen: boolean;
  
  /** Callback when panel closed */
  onClose: () => void;
  
  /** Panel position (default: right) */
  position?: 'left' | 'right' | 'top' | 'bottom';
  
  /** Panel width (default: 400px for left/right) */
  width?: string;
  
  /** Panel height (default: 300px for top/bottom) */
  height?: string;
  
  /** Show backdrop (default: true) */
  showBackdrop?: boolean;
  
  /** Close on backdrop click (default: true) */
  closeOnBackdropClick?: boolean;
  
  /** Title for header */
  title?: string;
  
  /** Children (panel content) */
  children: React.ReactNode;
  
  /** Additional CSS classes */
  className?: string;
}
```

**Design Tokens Required**:
```typescript
// packages/ui/src/styles/tokens.ts (additions)
// Validated exact values from working prototypes

export const componentTokens = {
  panel: {
    // Widths/Heights
    defaultWidth: '400px',
    defaultHeight: '300px',
    
    // Background (from prototype 02)
    background: 'rgba(26, 26, 46, 0.9)',
    backdropBlur: '24px',
    
    // Backdrop (from prototype 02)
    backdropBackground: 'rgba(0, 0, 0, 0.4)',
    backdropBlur: '8px',
    
    // Borders
    border: 'rgba(255, 255, 255, 0.1)',
    borderWidth: '1px',
    
    // Shadows (from prototype 02)
    shadow: '-10px 0 50px rgba(0, 0, 0, 0.5)',
    
    // Transitions
    slideDuration: '200ms',
    slideEasing: 'ease-out',
    backdropFadeDuration: '150ms',
  },
};
```

**Storybook Stories Required**:
- Right-positioned (default)
- Left-positioned
- Bottom-positioned (mobile)
- With custom width
- With header title
- Without backdrop
- With scrollable content

**Testing Requirements**:
- ✅ Does not render when isOpen=false
- ✅ Renders when isOpen=true
- ✅ Slides in from correct direction
- ✅ Closes when backdrop clicked (if enabled)
- ✅ Closes when X button clicked
- ✅ Closes when Esc pressed
- ✅ Focus trapped within panel when open
- ✅ Returns focus to trigger element when closed
- ✅ ARIA attributes present (`aria-modal`, `role="dialog"`)
- ✅ No accessibility violations (axe-core)

**Accessibility Considerations**:
- Panel uses `role="dialog"` and `aria-modal="true"`
- Focus trapped within panel when open (use `react-focus-lock`)
- First focusable element receives focus on open
- Focus returns to trigger element on close
- Esc key closes panel
- Backdrop has `aria-hidden="true"`

---

### 3. Wizard (Multi-Step Form) Component

**Location**: `packages/ui/src/components/wizard/`

**New Files**:
- `Wizard.tsx` - Multi-step form container
- `WizardStep.tsx` - Individual step wrapper
- `WizardProgress.tsx` - Progress indicator (dots)
- `WizardNavigation.tsx` - Back/Next button controls
- `wizard.stories.tsx` - Storybook documentation
- `wizard.test.tsx` - Unit tests

**Design Rationale**:
Multi-step forms are a common pattern for complex data entry (onboarding, settings, checkouts). This component should be generic and reusable (not agent-specific).

**Component API**:
```typescript
// Wizard.tsx
export interface WizardProps {
  /** Current step index (0-based) */
  currentStep: number;
  
  /** Callback when step changes */
  onStepChange: (step: number) => void;
  
  /** Callback when wizard completes */
  onComplete: () => void;
  
  /** Callback when wizard cancelled */
  onCancel: () => void;
  
  /** Step labels (for progress indicator) */
  steps: string[];
  
  /** Children (WizardStep components) */
  children: React.ReactNode;
  
  /** Disable next button (for validation) */
  disableNext?: boolean;
  
  /** Custom next button text */
  nextButtonText?: string;
  
  /** Custom complete button text (last step) */
  completeButtonText?: string;
  
  /** Additional CSS classes */
  className?: string;
}

// WizardStep.tsx
export interface WizardStepProps {
  /** Step title */
  title: string;
  
  /** Step description (optional) */
  description?: string;
  
  /** Children (form fields) */
  children: React.ReactNode;
  
  /** Additional CSS classes */
  className?: string;
}
```

**Design Tokens Required**:
```typescript
// packages/ui/src/styles/tokens.ts (additions)

export const componentTokens = {
  wizard: {
    // Progress indicator
    dotSize: '12px',
    dotGap: '8px',
    dotInactiveColor: 'hsl(var(--surface))',
    dotInactiveBorder: 'hsl(var(--border))',
    dotActiveColor: 'hsl(var(--accent-primary))',
    dotActiveShadow: 'var(--shadow-glow-purple)',
    dotActiveScale: '1.25',
    dotCompletedColor: 'hsl(var(--accent-primary) / 0.5)',
    
    // Transitions
    dotTransitionDuration: '200ms',
    dotTransitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)', // ease-out
    
    // Layout
    maxWidth: '768px', // max-w-2xl
  },
};
```

**Storybook Stories Required**:
- 2-step wizard (basic)
- 4-step wizard (complex)
- With validation (disabled next button)
- With custom button text
- With step descriptions
- Mobile responsive

**Testing Requirements**:
- ✅ Renders first step by default
- ✅ Shows correct progress indicator (active step highlighted)
- ✅ "Next" button advances to next step
- ✅ "Back" button returns to previous step
- ✅ "Next" button disabled when disableNext=true
- ✅ Last step shows "Complete" button instead of "Next"
- ✅ Calls onComplete when "Complete" clicked
- ✅ Calls onCancel when "Cancel" clicked (first step)
- ✅ Keyboard navigation works (Tab, Enter)
- ✅ No accessibility violations (axe-core)

**Accessibility Considerations**:
- Wizard uses `role="group"` with `aria-labelledby` pointing to title
- Progress indicator uses `aria-label="Step X of Y"`
- Completed steps use `aria-current="step"` for active step
- Focus moves to first field when step changes
- Validation errors announced via `aria-live="polite"`

---

### 4. Badge Component (Enhancement)

**Location**: `packages/ui/src/components/badge/` (NEW)

**New Files**:
- `Badge.tsx` - Small status/count indicator
- `badge.stories.tsx` - Storybook documentation
- `badge.test.tsx` - Unit tests

**Design Rationale**:
Badges are used for memory update notifications, unread counts, status indicators, etc. Currently missing from design system.

**Component API**:
```typescript
// Badge.tsx
export interface BadgeProps {
  /** Badge content (text or number) */
  children: React.ReactNode;
  
  /** Visual variant */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  
  /** Additional CSS classes */
  className?: string;
}
```

**CVA Variants**:
```typescript
// badge.tsx
const badgeVariants = cva(
  [
    'inline-flex items-center gap-1',
    'rounded-md border',
    'font-medium',
    'transition-colors duration-150',
  ],
  {
    variants: {
      variant: {
        default: 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary',
        success: 'bg-green-500/10 border-green-500/30 text-green-400',
        warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
        error: 'bg-red-500/10 border-red-500/30 text-red-400',
        info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-xs', // 6px padding, 12px font
        md: 'px-2 py-1 text-sm', // 8px padding, 14px font
        lg: 'px-3 py-1.5 text-base', // 12px padding, 16px font
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);
```

**Storybook Stories Required**:
- All variants (default, success, warning, error, info)
- All sizes (sm, md, lg)
- With icons
- With counts

**Testing Requirements**:
- ✅ Renders children correctly
- ✅ Applies variant styles correctly
- ✅ Applies size styles correctly
- ✅ No accessibility violations (axe-core)

---

## Required Design Token Additions

### 1. Shadow Glow Variants

**Location**: `packages/ui/tailwind.config.ts`

**Current State**: Only `shadow-glow-purple` exists (from Spec 013).

**Required Additions**:
```typescript
// tailwind.config.ts (extend.boxShadow)
boxShadow: {
  'glow-purple': '0 0 20px rgba(168, 85, 247, 0.4)', // Existing
  'glow-blue': '0 0 20px rgba(59, 130, 246, 0.4)',   // NEW - for agent messages
  'glow-pink': '0 0 20px rgba(236, 72, 153, 0.4)',   // NEW - for accent elements
  'glow-green': '0 0 20px rgba(34, 197, 94, 0.4)',   // NEW - for success states
}
```

**Usage**:
- `shadow-glow-blue`: Agent message bubbles, agent-related UI
- `shadow-glow-pink`: User message bubbles, interactive highlights
- `shadow-glow-green`: Success badges, confirmation states

---

### 2. Animation Utilities

**Location**: `packages/ui/tailwind.config.ts`

**Current State**: No custom animations defined.

**Required Additions**:
```typescript
// tailwind.config.ts (extend.keyframes and extend.animation)
keyframes: {
  'slide-in-right': {
    '0%': { transform: 'translateX(100%)' },
    '100%': { transform: 'translateX(0)' },
  },
  'slide-in-left': {
    '0%': { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(0)' },
  },
  'slide-in-bottom': {
    '0%': { transform: 'translateY(100%)' },
    '100%': { transform: 'translateY(0)' },
  },
  'fade-in': {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  'pulse-glow': {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.5' },
  },
},
animation: {
  'slide-in-right': 'slide-in-right 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  'slide-in-left': 'slide-in-left 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  'slide-in-bottom': 'slide-in-bottom 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  'fade-in': 'fade-in 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  'pulse-glow': 'pulse-glow 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
},
```

**Usage**:
- `animate-slide-in-right`: Memory panel slide-in
- `animate-slide-in-left`: Left-positioned panels
- `animate-slide-in-bottom`: Mobile bottom bar
- `animate-fade-in`: Backdrop overlay
- `animate-pulse-glow`: Typing indicator dots, loading states

---

### 3. Gradient Backgrounds

**Location**: `packages/ui/tailwind.config.ts`

**Current State**: Tailwind default gradients only.

**Required Additions**:
```typescript
// tailwind.config.ts (extend.backgroundImage)
backgroundImage: {
  'gradient-purple-pink': 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))',
  'gradient-blue-purple': 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2))',
  'gradient-neon-glow': 'radial-gradient(circle at center, rgba(168, 85, 247, 0.3), transparent 70%)',
}
```

**Usage**:
- `bg-gradient-purple-pink`: User message bubbles
- `bg-gradient-blue-purple`: Agent message bubbles
- `bg-gradient-neon-glow`: Hover effects, focus states

---

## Impact on Existing Components

### No Breaking Changes Required

All proposed components are **additive** - no modifications to existing primitives (Box, Stack, Text, Button, Input, Textarea, Select) are needed.

**Existing Components**: UNCHANGED
- `Box.tsx` ✅
- `Stack.tsx` ✅
- `Text.tsx` ✅
- `Button.tsx` ✅
- `Input.tsx` ✅
- `Textarea.tsx` ✅
- `Select.tsx` ✅

**Reason**: New components are **composites** built FROM primitives, not replacements.

---

## Storybook Expansion

### New Stories Required

**Current Storybook Pages**: 7 (Box, Stack, Text, Button, Input, Textarea, Select)

**New Storybook Pages**: 4 (Sidebar, Panel, Wizard, Badge)

**Total Storybook Pages After**: 11

**Estimated Story Count**:
- Sidebar: 6 stories (collapsed, expanded, active, badges, right-pos, mobile)
- Panel: 7 stories (right, left, bottom, custom width, header, no backdrop, scrollable)
- Wizard: 6 stories (2-step, 4-step, validation, custom text, descriptions, mobile)
- Badge: 5 stories (variants x5)

**Total New Stories**: ~24

**Storybook URL**: http://localhost:6006 (existing setup, no changes needed)

---

## Testing Expansion

### Unit Tests (Vitest)

**Current Test Coverage**: 360 UI component tests (Spec 014)

**New Test Files Required**:
- `sidebar.test.tsx` (~15 tests)
- `panel.test.tsx` (~12 tests)
- `wizard.test.tsx` (~10 tests)
- `badge.test.tsx` (~5 tests)

**Total New Tests**: ~42

**Estimated New Coverage**: 360 + 42 = **402 UI tests**

---

### Accessibility Tests (axe-core)

**Current Coverage**: All existing components have axe-core tests (Spec 014)

**New Coverage Required**:
- Sidebar navigation (nav, aria-current, aria-label)
- Panel modal (aria-modal, focus trap, Esc handler)
- Wizard steps (aria-label for progress, focus management)
- Badge (semantic HTML, contrast ratios)

**All new components MUST pass axe-core** before merging.

---

## Migration Path

### Phase 1: Add New Components to Design Library (Week 1)

**Tasks**:
1. Create `packages/ui/src/components/sidebar/` directory
   - Implement `Sidebar.tsx`, `SidebarItem.tsx`, `SidebarToggle.tsx`
   - Add Storybook stories
   - Write unit tests
   - Export from `packages/ui/src/index.ts`

2. Create `packages/ui/src/components/panel/` directory
   - Implement `Panel.tsx`, `PanelHeader.tsx`, `PanelBackdrop.tsx`
   - Add Storybook stories
   - Write unit tests
   - Export from `packages/ui/src/index.ts`

3. Create `packages/ui/src/components/wizard/` directory
   - Implement `Wizard.tsx`, `WizardStep.tsx`, `WizardProgress.tsx`, `WizardNavigation.tsx`
   - Add Storybook stories
   - Write unit tests
   - Export from `packages/ui/src/index.ts`

4. Create `packages/ui/src/components/badge/` directory
   - Implement `Badge.tsx`
   - Add Storybook stories
   - Write unit tests
   - Export from `packages/ui/src/index.ts`

**Estimated Effort**: 12 hours

---

### Phase 2: Add Design Tokens (Week 1)

**Tasks**:
1. Update `packages/ui/tailwind.config.ts`:
   - Add shadow glow variants (blue, pink, green)
   - Add animation keyframes (slide-in-right, slide-in-left, slide-in-bottom, fade-in, pulse-glow)
   - Add gradient backgrounds (purple-pink, blue-purple, neon-glow)

2. Update `packages/ui/src/styles/tokens.ts`:
   - Add sidebar component tokens
   - Add panel component tokens
   - Add wizard component tokens
   - Add badge component tokens

**Estimated Effort**: 2 hours

---

### Phase 3: Use New Components in App (Week 2)

**Tasks**:
1. Import new components in `apps/client/src/App.tsx`:
   ```typescript
   import { Sidebar, SidebarItem } from '@workspace/ui/components/sidebar';
   import { Panel } from '@workspace/ui/components/panel';
   import { Wizard, WizardStep } from '@workspace/ui/components/wizard';
   import { Badge } from '@workspace/ui/components/badge';
   ```

2. Replace ad-hoc implementations with design library components
   - Use `<Sidebar>` instead of custom `NavigationSidebar`
   - Use `<Panel>` instead of custom `MemoryPanel`
   - Use `<Wizard>` instead of custom `AgentWizard`
   - Use `<Badge>` for memory update indicators

**Estimated Effort**: 6 hours

---

## Verification Checklist

### Before Merging to Main

**Design System Components**:
- ✅ All new components exported from `@workspace/ui/src/index.ts`
- ✅ All new components have TypeScript interfaces with JSDoc comments
- ✅ All new components use CVA for variants (where applicable)
- ✅ All new components forward refs (`React.forwardRef`)
- ✅ All new components accept `className` prop for customization

**Storybook Documentation**:
- ✅ All new components have `.stories.tsx` files
- ✅ All stories render without errors at http://localhost:6006
- ✅ All variants documented with descriptions
- ✅ All interactive props demonstrated (onClick, onClose, etc.)

**Testing**:
- ✅ All new components have `.test.tsx` files
- ✅ All tests pass: `pnpm test --filter @workspace/ui`
- ✅ All axe-core accessibility tests pass
- ✅ Test coverage remains ≥80% (current: 100%)

**Design Tokens**:
- ✅ All new tokens added to `tailwind.config.ts`
- ✅ All new tokens documented in `tokens.ts`
- ✅ Tailwind IntelliSense autocompletes new utilities

**Enforcement**:
- ✅ ESLint rules pass (no CSS imports, no inline styles)
- ✅ Pre-commit hooks pass (Prettier, ESLint, tests)
- ✅ No TypeScript errors (`pnpm typecheck`)

---

## Rollback Plan

If issues arise after merging, the rollback process is straightforward:

### Step 1: Revert Design Library Changes
```bash
git revert <commit-hash-for-new-components>
pnpm install
pnpm test
```

### Step 2: Revert App Changes
```bash
git revert <commit-hash-for-app-integration>
pnpm dev # Verify app still works
```

**Risk Level**: LOW - New components are isolated, no shared state, no breaking changes to existing primitives.

---

## Open Questions

1. **Focus Trap Library**: Should we add `react-focus-lock` for Panel component? (Currently not in dependencies)
   - **Recommendation**: YES - required for WCAG 2.1 AA compliance (modal focus trap)
   - **Alternative**: Manual focus management (more complex, error-prone)

2. **Animation Library**: Should we use `framer-motion` for smoother animations? (Currently using CSS transitions)
   - **Recommendation**: NO - CSS transitions sufficient for these simple animations
   - **Revisit**: If future components need complex gestures (drag, swipe)

3. **State Management**: Should Sidebar/Panel state be managed via React Context instead of props?
   - **Recommendation**: NO - keep components controlled (props-based) for flexibility
   - **App-level**: Use React Context in `apps/client/src/App.tsx` if needed

---

## Success Criteria

### Design Library Quality
- ✅ All 4 new components render without errors in Storybook
- ✅ All components follow Neon Flux design system (glassmorphism, gradients, glows)
- ✅ All components are responsive (mobile, tablet, desktop)
- ✅ All components have TypeScript types with JSDoc comments
- ✅ All components pass axe-core accessibility tests

### Developer Experience
- ✅ Components easy to use (clear APIs, sensible defaults)
- ✅ IntelliSense autocompletes props and variants
- ✅ Storybook provides clear usage examples
- ✅ No breaking changes to existing code

### Test Coverage
- ✅ All components have ≥80% unit test coverage
- ✅ All user interactions tested (click, keyboard, hover)
- ✅ All accessibility features tested (ARIA, focus management)

---

## Dependencies

**New NPM Dependencies Required**:
```json
{
  "dependencies": {
    "react-focus-lock": "^2.9.4"  // For Panel focus trap
  }
}
```

**No Changes Required**:
- `class-variance-authority` ✅ (already installed)
- `clsx` ✅ (already installed)
- `tailwindcss` ✅ (already installed)
- `@radix-ui/react-*` ✅ (already installed for Select component)

---

## Timeline Summary

| Phase | Tasks | Effort | Week |
|-------|-------|--------|------|
| **Phase 1** | Add 4 new components to `@workspace/ui` (Sidebar, Panel, Wizard, Badge) | 12 hours | Week 1 |
| **Phase 2** | Add design tokens (shadows, animations, gradients) | 2 hours | Week 1 |
| **Phase 3** | Integrate components into `apps/client` | 6 hours | Week 2 |
| **Testing** | Unit tests, Storybook stories, axe-core validation | 4 hours | Week 2 |
| **Documentation** | Update README, add usage examples | 2 hours | Week 2 |
| **TOTAL** | | **26 hours** | **2 weeks** |

---

## References

- [Spec 013: Neon Flux Design System](../013-neon-flux-design-system/spec.md) - Design tokens, Tailwind config
- [Spec 014: Design System Migration](../014-design-system-migration/spec.md) - Current component inventory
- [Design Specification](./design-spec.md) - Component implementation details
- [UX Requirements](./ux-requirements.md) - User flows and design decisions
- [Storybook](http://localhost:6006) - Component catalog (existing)
- [CVA Documentation](https://cva.style/docs) - Variant API patterns
- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Accessibility standards
