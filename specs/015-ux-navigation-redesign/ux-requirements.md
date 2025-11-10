# UX Requirements: Cerebrobot Navigation & Flow Redesign

**Spec ID**: 015  
**Status**: Draft  
**Created**: 2025-11-07  
**Designer Requirements Document**

**Prototypes**: Validated design decisions in working HTML demos at `specs/draft-spec/prototypes/`
- All navigation patterns, color schemes, and animations tested and approved
- Exact spacing, glassmorphic effects, and gradient values confirmed

---

## Problem Statement

Cerebrobot has successfully migrated to the Neon Flux design system (100% token-based styling, glassmorphism, design library), but the **UX architecture is non-existent**:

- ❌ **No navigation structure** - Users can't intuitively move between Agents, Threads, Memory, Settings
- ❌ **Confusing agent-thread relationship** - Unclear how agents and conversations relate
- ❌ **Hidden memory graph** - Mission-critical transparency feature buried (not visible during chat)
- ❌ **Clunky forms** - Agent creation/editing feels tedious despite proper styling
- ❌ **Basic chat experience** - Messages lack personality, no visual richness
- ❌ **No clear flow** - Disconnected pages with no cohesive journey

**Current State**: Collection of isolated pages (Thread List, Agents, Chat) with ad-hoc routing in `App.tsx`. No persistent navigation, no visual hierarchy, no immersive experience.

**Desired State**: Cyberpunk command center with collapsible sidebar navigation, immersive chat canvas, transparent memory inspection, and elegant agent management.

---

## User Profile: The Single Operator

**Who**: Solo hobbyist running self-hosted LangGraph chatbot via Docker Compose  
**Technical Level**: Comfortable with CLI, Docker, configuration files  
**Primary Goals**:
1. Quickly switch between multiple agents (different personalities/capabilities)
2. Start new conversations or resume existing threads
3. Inspect and modify agent memory graph in real-time (transparency!)
4. Configure agents with custom LLM settings, memory, autonomy

**Pain Points (Current)**:
1. **Navigation confusion** - "How do I get back to agents? Where's the memory view?"
2. **Agent-thread mental model** - "Are threads global or per-agent?"
3. **Hidden capabilities** - "I know there's a memory browser, but where is it?"
4. **Form fatigue** - "Creating agents has too many fields, feels overwhelming"
5. **Boring chat** - "It works, but doesn't feel immersive or engaging"

**Success Metrics**:
- Time to create new agent: < 2 minutes (down from ~5 minutes)
- Time to find memory inspector: < 5 seconds (currently hidden)
- Task completion rate: 100% for common flows (new thread, switch agent, inspect memory)
- Subjective satisfaction: "Feels like controlling a cyberpunk AI brain" (visual richness)

---

## Design Decisions (Approved)

### 1. Navigation Pattern: **Collapsible Sidebar (Icon Rail)**

**Rationale**: Balances always-accessible navigation with immersive full-width chat experience.

**Structure**:
```
┌─┬─────────────────────────────────┐
│☰│   MAIN CONTENT (FULL WIDTH)     │  ← Collapsed (default)
│🤖│                                 │
│💬│   Chat canvas maximized         │
│🧠│                                 │
│⚙│                                 │
└─┴─────────────────────────────────┘

┌─────────────┬───────────────────────┐
│  SIDEBAR    │   MAIN CONTENT        │  ← Expanded (on click)
│             │                       │
│ ☰ Menu      │                       │
│ 🤖 Agents    │   Chat canvas         │
│ 💬 Threads   │   (reduced width)     │
│ 🧠 Memory    │                       │
│ ⚙ Settings  │                       │
└─────────────┴───────────────────────┘
```

**Behavior**:
- **Collapsed by default**: Icon-only rail (48px width), glassmorphic background
- **Expand on hover/click**: Slides out to 280px, shows labels + icons
- **Persists state**: Remembers expanded/collapsed preference in localStorage
- **Mobile**: Bottom bar with icons (no collapse), full-screen panels on tap

**Navigation Items** (Priority Order):
1. 💬 **Threads** (default view) - List of all conversations, grouped by agent
2. 🤖 **Agents** - Manage agent configurations
3. 🧠 **Memory** - Standalone memory graph browser (future: dedicated view)
4. ⚙ **Settings** - Theme, user preferences, system config (future)

**Visual Design**:
- Glassmorphic sidebar: `backdrop-blur-xl`, `bg-surface/80`, subtle glow on active item
- Active nav item: Purple glow (`shadow-glow-purple`), accent border-left
- Hover state: Slight scale (1.05), brightness increase
- Collapse/expand animation: 200ms ease-out

---

### 2. Home State: **Thread List (Current Implementation)**

**Rationale**: KISS principle - operator already navigates to threads first, keep existing flow.

**Default Landing**: `/` → Thread List (all conversations, chronological)

**Future Enhancement** (Out of Scope):
- Dashboard view with agent status cards, recent activity, quick actions
- Defer to separate spec when Phase 2+ features (memory stats, multi-agent) are ready

---

### 3. Agent-Thread Relationship: **Threads Belong to Agents**

**Rationale**: Already implemented in current codebase, matches LangGraph mental model.

**Mental Model**: "Agents are personas with isolated conversation histories"

**UX Implications**:
- Navigate: **Agents → Select Agent → See Threads → Chat**
- Thread list shows agent avatar/icon + agent name alongside thread title
- Threads are **filtered** when viewing agent-specific context
- Memory is **scoped per agent** (each agent has its own memory namespace)

**Agent Context Mode** (Current Implementation):
- When operator selects agent for new conversation → enters "Agent Context Mode"
- Thread list header shows: "🤖 {AgentName} Conversations" + "Back to All Threads" button
- "+ New Conversation" button reuses context agent (no picker modal)

**Visual Hierarchy**:
```
All Threads View:
┌─────────────────────────────────┐
│ 💬 All Conversations            │
│ [+ New Conversation] → Agent Picker
│                                 │
│ 🤖 Agent A | "Discuss roadmap"  │
│ 🤖 Agent B | "Debug auth flow"  │
│ 🤖 Agent A | "Review PR #42"    │
└─────────────────────────────────┘

Agent Context Mode:
┌─────────────────────────────────┐
│ 🤖 Agent A Conversations        │
│ [← Back to All Threads]         │
│ [+ New Conversation] → Agent A  │
│                                 │
│ "Discuss roadmap"               │
│ "Review PR #42"                 │
└─────────────────────────────────┘
```

---

### 4. Memory Visibility: **Toggle Panel (Drawer)**

**Rationale**: Transparency by design (Constitution Principle II) without overwhelming chat canvas.

**Default State**: Memory panel **hidden** (chat full-width)

**Trigger**: 🧠 **Memory icon** in chat header → slides in right panel (400px width)

**Memory Panel Layout**:
```
┌────────────────┬─────────────────┐
│   Chat Canvas  │  Memory Panel   │
│                │                 │
│  [Messages]    │  🔍 Search      │
│                │  ───────────    │
│  [Input]       │  📊 Stats       │
│                │  ───────────    │
│                │  🧩 Nodes       │
│                │  • Entity: User │
│                │  • Topic: Pizza │
│                │  ───────────    │
│                │  [+ Add Node]   │
└────────────────┴─────────────────┘
```

**Panel Features**:
- **Search bar**: Query memory by content, entity name, topic
- **Stats summary**: Total nodes, relations, last updated timestamp
- **Node list**: Scrollable list of memory nodes (entity/relation/observation)
- **Create/Edit/Delete**: Inline actions for memory manipulation
- **Live updates**: Panel auto-refreshes when agent creates new memories during chat

**Visual Design**:
- Panel slides in from right (200ms ease-out animation)
- Glassmorphic background matching sidebar
- Nodes displayed as cards with entity type badge (purple for entities, blue for relations)
- "Close" button (X icon) or click outside panel to dismiss

**Mobile**: Memory panel becomes full-screen modal overlay

---

### 5. Visual Tone: **Cyberpunk Command Center**

**Rationale**: Matches Neon Flux design system aesthetic, creates immersive "controlling an AI brain" experience.

**Aesthetic Direction** (Prototype-Validated):
- **Heavy glassmorphism**: `backdrop-filter: blur(24px)` on all surfaces, `rgba(26, 26, 46, 0.8-0.9)` backgrounds
- **Animated gradients**: `linear-gradient(135deg, #a855f7, #ec4899)` for primary actions, blue/purple for agent messages
- **Neon glows**: `box-shadow: 0 0 20px rgba(168, 85, 247, 0.4)` on hover, `0 0 30px rgba(168, 85, 247, 0.6)` on active
- **Dark theme primary**: `linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%)` background, `#e0e0e0` text
- **Border accents**: `rgba(255, 255, 255, 0.1)` for subtle separation, `rgba(168, 85, 247, 0.3)` for active elements

**Design System Application**:
- **Buttons**: Maximum drama - primary buttons glow on hover, pulsing animation on loading states
- **Cards**: Heavy blur, gradient borders (`border-image: linear-gradient(...)`), subtle box shadows
- **Typography**: Sans-serif for UI (Inter), monospace for technical content (Fira Code)
- **Motion**: Rich animations - page transitions (fade + slide), hover effects (scale 1.05), micro-interactions

**References**:
- Blade Runner 2077 UI (holographic interfaces, neon accents)
- Cyberpunk 2077 menus (glitchy transitions, layered panels)
- Matrix Resurrections code rain aesthetic (optional background effect)

**Accessibility Balance**:
- Default theme: Heavy aesthetics, WCAG AA compliant (4.5:1 contrast minimum)
- High-contrast mode available: Disables glassmorphism, solid backgrounds, WCAG AAA (7:1 contrast)

---

## Top 6 UX Pain Points (Prioritized)

### 1. **Clunky UX** (P1 - CRITICAL)
**Problem**: Forms feel tedious, navigation is unclear, overall flow is disjointed  
**Solution**: Redesign agent form as wizard/stepper, add persistent sidebar navigation, streamline common tasks  
**Success Criteria**: Agent creation time < 2 min, zero confusion on how to navigate

### 2. **Chat Feels Basic** (P1 - CRITICAL)
**Problem**: Messages are plain text bubbles, no visual richness, lacks immersion  
**Solution**: Enhance message bubbles with gradients/glows, add typing indicators, rich markdown rendering, code syntax highlighting  
**Success Criteria**: Operator describes chat as "engaging" and "immersive"

### 3. **No Clear Navigation** (P1 - CRITICAL)
**Problem**: Can't easily move between Threads/Agents/Memory, relies on browser back button  
**Solution**: Implement collapsible sidebar with icon rail, always accessible  
**Success Criteria**: 100% task completion for "switch to agents page" flow

### 4. **Form UX Clunky** (P2 - HIGH)
**Problem**: Agent creation form has 20+ fields in single page, overwhelming  
**Solution**: Multi-step wizard (Basic Info → LLM Config → Memory → Autonomy), progress indicator  
**Success Criteria**: Form completion rate increases, fewer abandoned forms

### 5. **Agent-Thread Confusion** (P2 - HIGH)
**Problem**: Unclear if threads are global or per-agent, confusing mental model  
**Solution**: Visual hierarchy - show agent avatar in thread list, "Agent Context Mode" header clarifies filtering  
**Success Criteria**: Zero questions about "where did my thread go?"

### 6. **Memory Graph Hidden** (P2 - HIGH)
**Problem**: Memory browser exists but not discoverable, violates transparency principle  
**Solution**: 🧠 icon in chat header, always visible, slides in panel on click  
**Success Criteria**: Time to find memory < 5 seconds, usage increases

---

## User Flows (Task Completion Paths)

### Flow 1: Create New Agent & Start Conversation

**Steps**:
1. Click **🤖 Agents** in sidebar → Navigate to Agents page
2. Click **+ Create Agent** button → Open agent creation wizard (modal or dedicated page)
3. **Step 1: Basic Info** - Name, description (2 fields) → Next
4. **Step 2: LLM Config** - Model, API endpoint, temperature (3 fields) → Next
5. **Step 3: Memory** - Enable/disable, namespace (2 fields) → Next
6. **Step 4: Autonomy** - Enable/disable, max iterations (2 fields) → Create Agent
7. Success toast → Auto-navigate to agent's thread list (Agent Context Mode)
8. Click **+ New Conversation** → Start chat immediately (no picker, reuses new agent)

**Current Pain Points**:
- All 20+ fields on one page (overwhelming)
- No progress indicator
- No auto-navigation after creation

**Proposed Improvements**:
- Multi-step wizard with progress bar (Step 1 of 4)
- Auto-navigate to new agent's context after creation
- Pre-fill defaults for optional fields (reduce cognitive load)

---

### Flow 2: Resume Existing Conversation & Inspect Memory

**Steps**:
1. Default view: **💬 Threads** (thread list visible)
2. Click thread item → Navigate to **Chat View**
3. Chat loads with history, messages displayed
4. Click **🧠 Memory** icon in chat header → Memory panel slides in from right
5. View memory nodes, search, or create new node
6. Click **X** or click outside → Panel dismisses, chat remains full-width

**Current Pain Points**:
- Memory browser requires navigating away from chat (separate view)
- No way to see memory updates in real-time during conversation

**Proposed Improvements**:
- Memory panel as overlay (no navigation required)
- Live updates: Auto-refresh when agent creates memory during chat
- Inline hints: Chat messages show "🧠 Memory Updated" badge when relevant

---

### Flow 3: Switch Between Agents

**Steps**:
1. In **Chat View** or **Thread List**
2. Click **🤖 Agents** in sidebar → Navigate to Agents page
3. View agent cards (name, description, model, status)
4. Click agent card → Navigate to agent's thread list (Agent Context Mode)
5. Click **+ New Conversation** → Start chat with selected agent

**Current Pain Points**:
- No quick agent switcher in chat (must navigate to Agents page)
- Agents page feels disconnected from chat experience

**Proposed Improvements**:
- Agent switcher dropdown in chat header (quick access without full navigation)
- Agents page: Add "Start Chat" CTA on each agent card
- Agent cards show recent activity (last conversation, memory count)

---

## Information Architecture (Sitemap)

```
Cerebrobot App
│
├── / (Root - Thread List)
│   ├── All Threads View
│   │   ├── Thread List (grouped by agent, chronological)
│   │   ├── [+ New Conversation] → Agent Picker Modal
│   │   └── Thread Item → Chat View
│   │
│   └── Agent Context Mode
│       ├── Thread List (filtered to selected agent)
│       ├── [← Back to All Threads]
│       ├── [+ New Conversation] → Chat View (reuses agent)
│       └── Thread Item → Chat View
│
├── /agents (Agents Management)
│   ├── Agent List (cards with name, model, status)
│   ├── [+ Create Agent] → Agent Creation Wizard
│   ├── Agent Card
│   │   ├── [Start Chat] → Agent Context Mode
│   │   ├── [Edit] → Agent Edit Form
│   │   └── [Delete] → Confirmation Modal
│   │
│   └── Agent Creation Wizard
│       ├── Step 1: Basic Info
│       ├── Step 2: LLM Config
│       ├── Step 3: Memory Config
│       └── Step 4: Autonomy Config
│
├── /chat/:threadId (Chat View)
│   ├── Chat Header
│   │   ├── Agent Name + Avatar
│   │   ├── Thread Title (editable)
│   │   ├── [← Back] → Thread List
│   │   ├── [🧠 Memory] → Toggle Memory Panel
│   │   └── [Agent Switcher] → Dropdown (future)
│   │
│   ├── Message List
│   │   ├── User Messages (purple gradient glow)
│   │   ├── Agent Messages (blue gradient glow)
│   │   ├── System Messages (muted)
│   │   └── [🧠 Memory Updated] Badges
│   │
│   ├── Input Area
│   │   ├── Textarea (auto-resize, 80px min)
│   │   ├── [Send] Button (primary, glows on hover)
│   │   └── [Cancel] (if streaming)
│   │
│   └── Memory Panel (overlay, 400px width)
│       ├── Search Bar
│       ├── Stats Summary (total nodes, relations)
│       ├── Node List (scrollable cards)
│       ├── Node Card
│       │   ├── Entity/Relation/Observation Badge
│       │   ├── Content Preview
│       │   └── [Edit] [Delete] Actions
│       └── [+ Add Memory Node] → Create Form
│
├── /memory (Future - Dedicated Memory View)
│   └── Full-screen memory graph visualization
│
└── /settings (Future - Application Settings)
    ├── Theme Selector (Dark, Light, High-Contrast)
    ├── User Preferences
    └── System Configuration
```

---

## Component Patterns (Design Library Usage)

### Navigation Sidebar Component

**File**: `apps/client/src/components/NavigationSidebar.tsx`

**Structure**:
```tsx
<NavigationSidebar isExpanded={expanded} onToggle={handleToggle}>
  <NavItem icon="💬" label="Threads" active={true} onClick={...} />
  <NavItem icon="🤖" label="Agents" onClick={...} />
  <NavItem icon="🧠" label="Memory" onClick={...} />
  <NavItem icon="⚙" label="Settings" onClick={...} />
</NavigationSidebar>
```

**Design System Primitives**:
- **Container**: `Box` with glassmorphic background (`bg-surface/80`, `backdrop-blur-xl`)
- **Nav Items**: `Stack` (vertical), `Button` variant="ghost" with custom hover glow
- **Icons**: Emoji or SVG icons (48x48px)
- **Labels**: `Text` variant="body" (16px), hidden when collapsed

**Variants**:
- `isExpanded={true}`: 280px width, labels visible
- `isExpanded={false}`: 48px width, icon-only

---

### Memory Panel Component

**File**: `apps/client/src/components/MemoryPanel.tsx`

**Structure**:
```tsx
<MemoryPanel isOpen={open} onClose={handleClose}>
  <MemorySearch onSearch={handleSearch} />
  <MemoryStats total={stats.nodes} relations={stats.relations} />
  <MemoryNodeList nodes={memories}>
    <MemoryNodeCard node={node} onEdit={...} onDelete={...} />
  </MemoryNodeList>
  <Button variant="primary" onClick={handleCreate}>+ Add Memory</Button>
</MemoryPanel>
```

**Design System Primitives**:
- **Panel Container**: `Box` with slide-in animation (400px width, right-aligned)
- **Search**: `Input` with search icon
- **Stats**: `Stack` (horizontal) with `Text` variant="caption"
- **Node Card**: `Box` with glassmorphic card styling, gradient border
- **Actions**: `Button` variant="ghost" for edit/delete

**Animation**:
- Slide-in from right: `transform: translateX(100%)` → `translateX(0)`, 200ms ease-out
- Backdrop overlay: `bg-black/40`, `backdrop-blur-sm`, fade-in 150ms

---

### Agent Creation Wizard Component

**File**: `apps/client/src/components/AgentWizard.tsx`

**Structure**:
```tsx
<AgentWizard step={currentStep} totalSteps={4} onComplete={handleCreate}>
  <WizardStep title="Basic Info" number={1}>
    <Input label="Agent Name" />
    <Textarea label="Description" />
  </WizardStep>
  
  <WizardStep title="LLM Config" number={2}>
    <Input label="Model" />
    <Input label="API Endpoint" />
  </WizardStep>
  
  <WizardStep title="Memory Config" number={3}>
    <Checkbox label="Enable Memory" />
    <Input label="Namespace" />
  </WizardStep>
  
  <WizardStep title="Autonomy" number={4}>
    <Checkbox label="Enable Autonomy" />
    <Input label="Max Iterations" />
  </WizardStep>
  
  <WizardNav>
    <Button variant="secondary" onClick={handleBack}>← Back</Button>
    <Button variant="primary" onClick={handleNext}>Next →</Button>
  </WizardNav>
</AgentWizard>
```

**Design System Primitives**:
- **Wizard Container**: `Stack` (vertical), `Box` glassmorphic card
- **Progress Indicator**: Custom component (4 dots, active dot glows)
- **Step Content**: `Stack` (vertical) with form fields
- **Navigation**: `Stack` (horizontal, space-between), `Button` components

**Behavior**:
- Step 1-3: "Next" button enabled when required fields valid
- Step 4: "Next" becomes "Create Agent" (primary, glowing)
- Validation: Inline error messages below invalid fields (red glow)

---

## Layout Grids & Breakpoints

### Desktop Layout (≥1024px)

**Sidebar Collapsed**:
```
┌─┬───────────────────────────────────────┐
│S│         Main Content (Full)           │
│I│                                       │
│D│         [Thread List / Chat]          │
│E│                                       │
│ │                                       │
└─┴───────────────────────────────────────┘
48px | Remaining width
```

**Sidebar Expanded**:
```
┌───────────┬───────────────────────────┐
│  SIDEBAR  │    Main Content           │
│           │                           │
│  Nav      │    [Thread List / Chat]   │
│  Items    │                           │
│           │                           │
└───────────┴───────────────────────────┘
280px       | Remaining width
```

**Memory Panel Open**:
```
┌─┬─────────────────┬──────────────────┐
│S│   Chat Canvas   │   Memory Panel   │
│I│                 │                  │
│D│   [Messages]    │   [Search]       │
│E│   [Input]       │   [Nodes]        │
│ │                 │                  │
└─┴─────────────────┴──────────────────┘
48px | Flex-grow     | 400px fixed
```

### Mobile Layout (<768px)

**Navigation**: Bottom bar (56px height), 4 icons centered
```
┌─────────────────────────────────────┐
│                                     │
│         Main Content (Full)         │
│                                     │
│         [Thread List / Chat]        │
│                                     │
├─────────────────────────────────────┤
│  💬    🤖    🧠    ⚙               │ ← Bottom Bar
└─────────────────────────────────────┘
```

**Memory Panel**: Full-screen modal overlay (no side panel)
```
┌─────────────────────────────────────┐
│  🧠 Memory           [X Close]      │
├─────────────────────────────────────┤
│                                     │
│         [Search Bar]                │
│         [Stats]                     │
│         [Node List]                 │
│                                     │
└─────────────────────────────────────┘
```

---

## Accessibility Standards

### Keyboard Navigation
- **Tab order**: Sidebar nav → Main content → Memory panel (if open)
- **Shortcuts**: 
  - `Ctrl+/`: Toggle sidebar
  - `Ctrl+M`: Toggle memory panel
  - `Ctrl+N`: New conversation
  - `Esc`: Close modals/panels

### Screen Readers
- **ARIA labels**: All icon-only buttons (`aria-label="Threads"`)
- **Live regions**: Chat messages use `aria-live="polite"` for new messages
- **Focus management**: Modal/panel open → focus first interactive element

### WCAG AA Compliance
- **Contrast**: 4.5:1 minimum for text on glassmorphic backgrounds
- **Touch targets**: 44x44px minimum for all interactive elements
- **Focus indicators**: 2px purple ring (`ring-2 ring-accent-primary`) on all focusable elements

---

## Out of Scope (Future Specs)

1. **Dashboard Landing Page** - Agent status cards, recent activity overview
2. **Dedicated Memory Graph View** - Full-screen node/relation visualization (Phase 2)
3. **Multi-Agent Orchestration UI** - Coordination workflows (Phase 5)
4. **Settings Page** - Theme selector, user preferences, system config
5. **Agent Switcher Dropdown** - Quick agent change without navigation
6. **Thread Search** - Search across all conversations
7. **Export/Import** - Agent configs, thread history, memory dumps

---

## Success Criteria

### UX Metrics (Post-Implementation)
- ✅ **Navigation clarity**: 100% task completion for "find memory panel" flow
- ✅ **Agent creation time**: < 2 minutes (down from ~5 minutes)
- ✅ **Form completion rate**: ≥90% (wizard reduces abandonment)
- ✅ **Memory panel usage**: ≥50% of chat sessions open memory panel at least once
- ✅ **Subjective satisfaction**: "Feels like a cyberpunk command center" (user feedback)

### Technical Metrics (Design System Compliance)
- ✅ Zero hardcoded colors (100% design tokens)
- ✅ All navigation components use `@workspace/ui` primitives
- ✅ Animations complete in <200ms (perceived instant feedback)
- ✅ WCAG AA compliance (4.5:1 contrast minimum, 44px touch targets)

### Visual Quality Benchmarks
- ✅ Glassmorphism effects render correctly in Chrome/Firefox/Safari
- ✅ Neon glows visible on hover (purple for primary, blue for active)
- ✅ Animations smooth (60fps) on hardware acceleration
- ✅ Mobile responsive (no horizontal scroll, buttons tappable)

---

## Next Steps for Designer

After reviewing this UX requirements document, create:

1. **Low-Fidelity Wireframes** (`wireframes/` directory)
   - Navigation sidebar (collapsed + expanded states)
   - Thread list view (all threads + agent context mode)
   - Chat view with memory panel (open + closed states)
   - Agent creation wizard (4 steps)

2. **High-Fidelity Mockups** (Figma or similar)
   - Apply Neon Flux design system (glassmorphism, gradients, glows)
   - Desktop (1440px) + Mobile (375px) breakpoints
   - Dark theme with cyberpunk aesthetic

3. **Interactive Prototype** (Optional)
   - Clickable prototype showing navigation flows
   - Sidebar collapse/expand animation
   - Memory panel slide-in/out

4. **Component Specifications** (`design-spec.md`)
   - Detailed component anatomy (spacing, colors, typography)
   - Interaction states (hover, focus, active, disabled)
   - Animation timings and easing curves

**Handoff Format**: Annotated mockups with component callouts, spacing measurements, color token references, motion guidelines.
