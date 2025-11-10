# Data Model: UX Navigation Architecture Redesign

**Feature**: UX Navigation Architecture Redesign  
**Phase**: 1 - Data Model & Contracts  
**Date**: 2025-11-07

---

## Overview

This document defines the data models and state contracts for the UX navigation redesign. All entities are **client-side only** (no database changes). State is managed via React hooks and persisted in localStorage where applicable.

---

## Core Entities

### 1. NavigationState

**Purpose**: Represents the current active view and sidebar expansion state

**Fields**:
- `activeRoute: 'threads' | 'agents' | 'memory' | 'settings'` - Current active navigation item
- `isSidebarExpanded: boolean` - Whether sidebar is expanded (for sticky click-based expansion)
- `lastVisited: Record<string, Date>` - Timestamps of last visit per route (for "Back to X" flows)

**Persistence**: localStorage key `cerebrobot:navigation-state`

**State Transitions**:
```
Collapsed → User hovers sidebar → Temporarily expanded (no state change)
Collapsed → User clicks expand button → Expanded (persist to localStorage)
Expanded → User clicks outside or close button → Collapsed (persist to localStorage)
Any route → User clicks navigation item → New route (update activeRoute, persist to localStorage)
```

**Validation Rules**:
- `activeRoute` must be one of the 4 valid routes
- `isSidebarExpanded` defaults to `false` (collapsed)
- `lastVisited` timestamps must be valid ISO 8601 dates

**Example**:
```typescript
{
  activeRoute: 'threads',
  isSidebarExpanded: true,
  lastVisited: {
    threads: '2025-11-07T14:30:00Z',
    agents: '2025-11-07T13:15:00Z',
    memory: '2025-11-06T09:00:00Z',
    settings: '2025-11-05T10:45:00Z'
  }
}
```

---

### 2. MemoryPanelState

**Purpose**: Represents whether the memory panel is open for the current chat thread

**Fields**:
- `isOpen: boolean` - Whether panel is currently visible
- `animationState: 'opening' | 'open' | 'closing' | 'closed'` - Current animation phase
- `threadId: string | null` - Active thread ID (null if no chat active)
- `hasLoaded: boolean` - Whether memory data has been loaded (for lazy loading)

**Persistence**: None (session state only, resets on navigation)

**State Transitions**:
```
closed → User clicks 🧠 button → opening (200ms) → open
open → User clicks backdrop/X/🧠 → closing (200ms) → closed
open → User navigates away from chat → closed (immediate)
open → Memory data loads → hasLoaded = true (persist for session)
```

**Validation Rules**:
- `isOpen` can only be true if `threadId` is not null
- `animationState` must match `isOpen` (open/opening when true, closed/closing when false)
- `hasLoaded` can only be true if memory fetch succeeded

**Example**:
```typescript
{
  isOpen: true,
  animationState: 'open',
  threadId: '550e8400-e29b-41d4-a716-446655440000',
  hasLoaded: true
}
```

---

### 3. WizardState

**Purpose**: Represents the current step and form data in the agent creation wizard

**Fields**:
- `currentStep: 0 | 1 | 2 | 3` - Current step index (0-based, 4 steps total)
- `completedSteps: boolean[]` - Which steps have been completed (length 4)
- `formData: Partial<AgentConfig>` - Accumulated form data from all steps
- `validationErrors: Record<string, string>` - Field-level validation errors

**Persistence**: None (discard completely on cancel, per user clarification)

**State Transitions**:
```
Step 0 → User fills Basic Info → Click "Next" → completedSteps[0] = true, currentStep = 1
Step 1 → User clicks "Back" → currentStep = 0 (preserve formData)
Step 3 → User clicks "Create Agent" → Submit formData, close wizard
Any step → User clicks "Cancel" → Discard formData, close wizard (show confirmation if formData not empty)
```

**Validation Rules**:
- `currentStep` must be 0-3
- `completedSteps` length must always be 4
- `formData` must conform to `AgentConfig` schema (validated per step)
- "Next" button disabled if current step has validation errors

**Example**:
```typescript
{
  currentStep: 1,
  completedSteps: [true, false, false, false],
  formData: {
    name: 'My New Agent',
    description: 'A helpful assistant',
    provider: 'deepinfra',
    model: 'meta-llama/Meta-Llama-3.1-70B-Instruct'
  },
  validationErrors: {}
}
```

---

### 4. AgentFilter

**Purpose**: Represents the active agent filter in the thread list

**Fields**:
- `agentId: string | null` - Selected agent ID (null = show all threads)
- `agentName: string | null` - Selected agent name (for header display)

**Persistence**: localStorage key `cerebrobot:agent-filter`

**State Transitions**:
```
null → User selects agent from dropdown → agentId + agentName set
agentId set → User clicks "Back to All Threads" → null
agentId set → User clicks "+ New Conversation" → Auto-use filtered agent (no picker)
```

**Validation Rules**:
- If `agentId` is set, `agentName` must also be set
- `agentId` must exist in agents table (validate on load)
- Filter cleared if selected agent is deleted

**Example**:
```typescript
{
  agentId: '123e4567-e89b-12d3-a456-426614174000',
  agentName: 'Code Assistant'
}
```

---

### 5. MessageVisualProps (Extended)

**Purpose**: Visual properties for enhanced chat message rendering

**Fields** (extends existing `ChatMessage`):
- `messageType: 'user' | 'agent'` - Message sender type
- `gradientStyle: string` - CSS gradient background (purple-pink or blue-purple)
- `glowIntensity: 'default' | 'hover'` - Glow shadow intensity
- `agentName: string` - Agent name to display (instead of generic "Assistant")

**Persistence**: None (computed from message data at render time)

**Derivation Logic**:
```typescript
messageType = message.role === 'user' ? 'user' : 'agent'
gradientStyle = messageType === 'user' 
  ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))'
  : 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2))'
glowIntensity = isHovered ? 'hover' : 'default'
agentName = message.agentId ? agents.find(a => a.id === message.agentId).name : 'Assistant'
```

**Validation Rules**:
- `messageType` must match `message.role` ('user' | 'assistant')
- `gradientStyle` must be valid CSS gradient string
- `agentName` must not be empty

**Example**:
```typescript
{
  messageType: 'agent',
  gradientStyle: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2))',
  glowIntensity: 'default',
  agentName: 'Code Assistant'
}
```

---

## Relationships

### NavigationState → Routes
- **1:1** - One active route at a time
- **1:N** - Multiple routes in history (lastVisited)

### MemoryPanelState → Thread
- **1:1** - One panel per active thread
- **0:1** - Panel can exist without thread (null threadId when closed)

### WizardState → AgentConfig
- **1:1** - One wizard instance per agent creation flow
- **0:1** - WizardState can exist without formData (empty wizard)

### AgentFilter → Agent
- **1:1** - One filter per selected agent
- **0:1** - Filter can be null (show all threads)

---

## State Management Patterns

### 1. Sidebar State (NavigationState)

**Hook**: `useSidebarState()`

**Location**: `apps/client/src/hooks/useSidebarState.ts`

**API**:
```typescript
interface UseSidebarStateReturn {
  activeRoute: 'threads' | 'agents' | 'memory' | 'settings';
  isSidebarExpanded: boolean;
  navigate: (route: string) => void;
  toggleSidebar: () => void;
  expandSidebar: () => void;
  collapseSidebar: () => void;
}
```

**Persistence Logic**:
- Load from localStorage on mount
- Save to localStorage on every state change
- Sync across tabs via `storage` event listener

---

### 2. Memory Panel State (MemoryPanelState)

**Hook**: `useMemoryPanel(threadId: string | null)`

**Location**: `apps/client/src/hooks/useMemoryPanel.ts`

**API**:
```typescript
interface UseMemoryPanelReturn {
  isOpen: boolean;
  animationState: 'opening' | 'open' | 'closing' | 'closed';
  hasLoaded: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
}
```

**Lazy Loading Logic**:
- `hasLoaded` starts as `false`
- When `openPanel()` called, check `hasLoaded`
- If `false`, trigger memory fetch, set `hasLoaded = true`
- If `true`, reuse cached memory data

---

### 3. Wizard State (WizardState)

**Hook**: `useWizardState()`

**Location**: `apps/client/src/hooks/useWizardState.ts`

**API**:
```typescript
interface UseWizardStateReturn {
  currentStep: number;
  completedSteps: boolean[];
  formData: Partial<AgentConfig>;
  validationErrors: Record<string, string>;
  nextStep: () => void;
  previousStep: () => void;
  updateFormData: (stepData: Partial<AgentConfig>) => void;
  completeWizard: () => Promise<void>;
  cancelWizard: () => void;
  canGoNext: boolean;
}
```

**Cancel Logic**:
- If `formData` has any values → Show confirmation dialog
- On confirm → Discard all data, close wizard
- On cancel → Return to wizard (preserve data)

---

### 4. Agent Filter State (AgentFilter)

**Hook**: `useAgentFilter()`

**Location**: `apps/client/src/hooks/useAgentFilter.ts`

**API**:
```typescript
interface UseAgentFilterReturn {
  agentId: string | null;
  agentName: string | null;
  setFilter: (agentId: string, agentName: string) => void;
  clearFilter: () => void;
  isFiltered: boolean;
}
```

**Persistence Logic**:
- Load from localStorage on mount
- Save to localStorage when filter changes
- Clear filter if selected agent deleted (listen to agent mutations)

---

## Edge Cases & Error Handling

### NavigationState
- **Invalid route in localStorage**: Reset to 'threads' (default)
- **Corrupted JSON**: Clear localStorage, use defaults
- **Route doesn't exist**: Redirect to 404 page (sidebar still visible)

### MemoryPanelState
- **Thread deleted while panel open**: Close panel immediately
- **Memory fetch fails**: Show error state in panel, allow retry
- **Animation interrupted**: Complete animation before allowing next action

### WizardState
- **Invalid step index**: Reset to step 0
- **Form data doesn't match schema**: Show validation errors, block "Next"
- **Create agent API fails**: Show error message, keep wizard open (allow retry)

### AgentFilter
- **Filtered agent deleted**: Clear filter automatically, show toast notification
- **Invalid agent ID in localStorage**: Clear filter, use defaults

---

## Component-Level State (Not Persisted)

### Sidebar Hover State
- **Type**: `boolean` (ephemeral)
- **Purpose**: Track hover for temporary expansion
- **Lifecycle**: Set on `mouseenter`, clear on `mouseleave`

### Panel Animation State
- **Type**: `'opening' | 'open' | 'closing' | 'closed'`
- **Purpose**: Control CSS transitions, prevent interaction during animation
- **Lifecycle**: Transitions managed via `setTimeout` (200ms duration)

### Wizard Validation State
- **Type**: `Record<string, string>` (field errors)
- **Purpose**: Inline validation messages
- **Lifecycle**: Cleared on step change, updated on blur/submit

---

## Performance Considerations

### localStorage Usage
- **Keys**: 2 total (`cerebrobot:navigation-state`, `cerebrobot:agent-filter`)
- **Size**: ~500 bytes max (minimal JSON)
- **Frequency**: Write on user action only (not on render)

### Memory Panel Lazy Loading
- **Benefit**: Reduces initial page load by ~200ms
- **Trade-off**: 200ms delay on first panel open (acceptable, user-initiated)

### Animation State
- **Use CSS transitions** (hardware-accelerated) instead of JavaScript
- **Debounce rapid toggles** (prevent animation queue buildup)

---

## Testing Strategy

### NavigationState
- ✅ Persists to localStorage on route change
- ✅ Loads from localStorage on mount
- ✅ Resets to defaults if localStorage corrupted
- ✅ Syncs across tabs via storage event

### MemoryPanelState
- ✅ Opens/closes with correct animation states
- ✅ Lazy loads memory on first open
- ✅ Closes automatically when navigating away
- ✅ Handles fetch errors gracefully

### WizardState
- ✅ Advances/reverses through steps correctly
- ✅ Preserves form data on "Back"
- ✅ Discards data on "Cancel" (with confirmation)
- ✅ Submits data on "Create Agent"
- ✅ Blocks "Next" when validation fails

### AgentFilter
- ✅ Persists to localStorage
- ✅ Clears automatically when agent deleted
- ✅ Auto-uses filtered agent for "+ New Conversation"

---

## Next Steps

**Phase 1 Complete**: Data models defined, state contracts documented

**Phase 2**: Generate TypeScript contracts in `/contracts/` directory (see contracts/ folder)

**Phase 3**: Implement hooks in `apps/client/src/hooks/` during app integration phase
