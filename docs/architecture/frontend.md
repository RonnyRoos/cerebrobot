# Frontend Architecture

## Overview

The Cerebrobot frontend is built with React 18+ and Vite, following a component-driven architecture with strict separation between app-specific and reusable UI components.

## AppLayout Component

`apps/client/src/components/AppLayout.tsx` serves as the primary shell component, orchestrating navigation, panels, and main content.

### Responsibilities

1. **Navigation State Management**
   - Manages sidebar expansion state via `useNavigationState()` hook
   - Persists state to `localStorage` (`cerebrobot:navigation-state`)
   - Handles responsive behavior: bottom nav (<768px), side nav (≥768px)

2. **Routing Integration**
   - Uses React Router for declarative routing
   - Active route highlighting in sidebar
   - Route persistence across sessions

3. **Panel Orchestration**
   - Memory panel slide-in/slide-out
   - Agent wizard modal
   - Focus trap management for accessible UX

4. **Responsive Layout**
   - Mobile (<768px): Bottom navigation, full-screen panels
   - Tablet (768-1024px): Side navigation (200px expanded), slide-in panels
   - Desktop (>1024px): Side navigation (280px expanded), slide-in panels

### Structure

```typescript
<AppLayout>
  <Sidebar> {/* Navigation */}
    <SidebarItem route="/chat" icon={MessageSquare} label="Chat" />
    <SidebarItem route="/agents" icon={Bot} label="Agents" />
    <SidebarItem route="/memory" icon={Brain} label="Memory" />
  </Sidebar>
  
  <main> {/* Main Content */}
    <Routes>
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/agents" element={<AgentsPage />} />
      <Route path="/memory" element={<MemoryPage />} />
    </Routes>
  </main>
  
  <Panel> {/* Memory Panel (conditional) */}
    <MemoryPanelContent />
  </Panel>
  
  <WizardModal> {/* Agent Wizard (conditional) */}
    <AgentWizard />
  </WizardModal>
</AppLayout>
```

### Component Interactions

```
AppLayout
├── useNavigationState() → localStorage (sidebar expansion, active route)
├── useMemoryPanel() → Panel visibility, lazy loading
├── useAgentWizard() → Wizard modal state
└── Sidebar → SidebarItem (click handlers update navigation state)
```

## Design Library Pattern

All UI components MUST be sourced from `@workspace/ui` to maintain consistency and reusability.

### Workflow

1. **Check Storybook** at `http://localhost:6006`
   - Browse existing components
   - Verify component API in stories

2. **Reuse Existing Primitives**
   - Prefer composition over new components
   - Example: Use `Box + Stack + Text` instead of creating custom card

3. **Add Missing Components** (if needed)
   - Create in `/packages/ui/src/components/`
   - Follow naming conventions: `ComponentName.tsx`, `ComponentName.stories.tsx`, `ComponentName.test.tsx`
   - Export from `/packages/ui/src/index.ts`

4. **Document in Storybook**
   - Write `.stories.tsx` with all variants
   - Add JSDoc comments for props
   - Include usage examples

5. **Test Thoroughly**
   - Unit tests (`ComponentName.test.tsx`)
   - Accessibility tests (`ComponentName.a11y.test.tsx`)
   - Visual regression (Storybook snapshots)

6. **Import from `@workspace/ui`**
   ```typescript
   import { Box, Stack, Text, Button, Sidebar, Panel } from '@workspace/ui';
   ```

### Anti-Patterns

❌ **DO NOT**:
- Create one-off UI components in `/apps/client/src/components/` if they could be generalized
- Hardcode colors/spacing (use design tokens from Neon Flux theme)
- Skip Storybook documentation
- Mix design systems or inline styles

✅ **DO**:
- Compose from existing primitives
- Use design tokens (`bg-dark-800`, `text-neutral-100`, etc.)
- Write comprehensive Storybook stories
- Test accessibility (WCAG 2.1 AA)

## State Management

### React Hooks

Cerebrobot uses standard React hooks for state management:

- **`useState`**: Local component state (form inputs, toggles)
- **`useEffect`**: Side effects (WebSocket connections, data fetching)
- **`useContext`**: Shared state (theme, auth context if added)

### Custom Hooks

Encapsulate reusable logic in custom hooks:

- **`useNavigationState()`**: Navigation sidebar state + localStorage sync
- **`useAgentFilter()`**: Agent thread filter state + localStorage sync
- **`useAgents()`**: Agent CRUD operations (React Query)
- **`useDeleteAgent()`**: Agent deletion with optimistic updates
- **`useWebSocket()`**: WebSocket connection management (chat)

### localStorage Persistence

Two keys persist UI state:

1. **`cerebrobot:navigation-state`**
   ```typescript
   { isSidebarExpanded: boolean; activeRoute: string; }
   ```

2. **`cerebrobot:agent-filter`**
   ```typescript
   { agentId: string; agentName: string; } | null
   ```

See [AGENTS.md](../../AGENTS.md#client-side-state-persistence) for detailed schemas.

## Responsive Design

### Breakpoints

- **Mobile**: `<768px` (base Tailwind classes)
- **Tablet**: `768px-1024px` (`md:` prefix)
- **Desktop**: `>1024px` (`lg:` prefix)

### Component Adaptations

**Sidebar**:
- Mobile: Bottom nav (icon-only, fixed height 16)
- Tablet: Side nav (collapsed 48px, expanded 200px)
- Desktop: Side nav (collapsed 48px, expanded 280px)

**Panel**:
- Mobile: Full-screen overlay (`inset-0`)
- Tablet+: Slide-in from right/left (`md:inset-auto`)

**SidebarItem**:
- Mobile: Centered icon (`flex-col justify-center`)
- Tablet+: Horizontal layout with label (`md:flex-row md:gap-3`)

### Implementation

Use Tailwind's responsive prefixes:

```typescript
// Mobile-first approach
className="bottom-0 flex-row h-16 md:top-0 md:flex-col md:h-auto lg:w-[280px]"
```

## Accessibility

### Keyboard Navigation

- **Tab**: Navigate between interactive elements
- **Enter/Space**: Activate buttons/links
- **Escape**: Close panels/modals
- **Arrow Keys**: Navigate within wizards (future)

### Focus Management

- 2px purple focus indicators (WCAG 2.1 AA)
- Focus trap in `Panel` component (via `react-focus-lock`)
- Restore focus after modal close

### ARIA Labels

- `aria-label` on icon-only buttons
- `aria-expanded` on collapsible elements
- `aria-current="page"` on active routes
- `role="navigation"` on sidebar

### Testing

121 automated accessibility tests validate:
- Focus indicators
- Keyboard navigation
- ARIA attributes
- Color contrast (WCAG AA)

Run: `pnpm test:a11y --filter @workspace/ui`

## Styling

### Neon Flux Theme

All components use the Neon Flux design system with glassmorphism and vibrant gradients.

**Design Tokens** (Tailwind config):
- **Background**: `bg-dark-900`, `bg-dark-800` (semi-transparent blacks)
- **Text**: `text-neutral-100`, `text-neutral-300` (whites/grays)
- **Accent**: `accent-primary` (purple), `accent-secondary` (pink/blue)
- **Borders**: `border-neutral-700`, `border-accent-primary`

**Effects**:
- **Glassmorphism**: `backdrop-blur-xl bg-dark-800/50`
- **Gradients**: `bg-gradient-to-br from-purple-500 to-pink-500`
- **Glow**: `shadow-glow-purple`, `shadow-glow-blue`

### Tailwind Utilities

Prefer utility classes over inline styles:

```typescript
// Good
<div className="flex flex-col gap-4 p-6 bg-dark-800 rounded-lg">

// Bad
<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
```

## Testing

### Test Structure

```
packages/ui/__tests__/
├── components/          # Component unit tests
│   ├── box.test.tsx
│   ├── sidebar.test.tsx
│   └── panel.test.tsx
├── a11y/                # Accessibility tests
│   ├── focus.a11y.test.tsx
│   └── keyboard.a11y.test.tsx
└── setup.ts             # Test environment setup

apps/client/__tests__/
├── hooks/               # Custom hook tests
│   ├── useNavigationState.test.ts
│   └── useAgentFilter.test.ts
└── components/          # App-specific component tests
    ├── AppLayout.test.tsx
    └── ChatPage.test.tsx
```

### Testing Guidelines

1. **Unit Tests**: Test components in isolation with mocked dependencies
2. **A11y Tests**: Validate keyboard navigation, focus, ARIA attributes
3. **Hook Tests**: Use `@testing-library/react-hooks` for custom hooks
4. **WebSocket Tests**: Use `vitest-websocket-mock` for chat flows

### Running Tests

```bash
# All tests
pnpm test

# UI package only
pnpm test --filter @workspace/ui

# Accessibility tests only
pnpm test:a11y --filter @workspace/ui

# Client app only
pnpm test --filter @workspace/client
```

## Performance

### Lazy Loading

Memory panel content loads on-demand:

```typescript
const MemoryPanel = lazy(() => import('./MemoryPanelContent'));

// In AppLayout
{isMemoryPanelOpen && (
  <Suspense fallback={<LoadingSpinner />}>
    <MemoryPanel />
  </Suspense>
)}
```

### WebSocket Optimization

- Single persistent connection per session
- Message batching for rapid updates
- Reconnection logic with exponential backoff

### Code Splitting

Vite automatically splits routes:
- `/chat` → `ChatPage.tsx` chunk
- `/agents` → `AgentsPage.tsx` chunk
- `/memory` → `MemoryPage.tsx` chunk

## Developer Experience

### Storybook

Visual development environment at `http://localhost:6006`:

```bash
pnpm storybook
```

Browse all UI components with interactive controls.

### Hot Module Replacement

Vite provides instant feedback:

```bash
pnpm dev  # Client at http://localhost:5173
```

Changes reflect without full page reload.

### TypeScript

Strict mode enabled (`tsconfig.json`):
- No implicit `any`
- Exhaustive switch cases
- Strict null checks

## Future Enhancements

- **Dark/Light Theme Toggle**: Add theme context with localStorage persistence
- **i18n Support**: Integrate `react-i18next` for multi-language support
- **Analytics**: Add event tracking for user interactions
- **Offline Mode**: Service worker for offline chat history access

## References

- [TypeScript Code Style](../code-style.md)
- [Tech Stack Guardrails](../tech-stack.md)
- [Design Library Spec](../../specs/012-design-library-specification/plan.md)
- [Neon Flux Theme](../../specs/013-neon-flux-design-system/plan.md)
