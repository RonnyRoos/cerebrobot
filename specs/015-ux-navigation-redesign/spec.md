# Feature Specification: UX Navigation Architecture Redesign

**Feature Branch**: `015-ux-navigation-redesign`  
**Created**: 2025-11-07  
**Status**: Draft  
**Input**: User description: "Complete UX/UI navigation redesign with collapsible sidebar, memory panel, agent wizard, and enhanced chat experience using Neon Flux design system"

## Clarifications

### Session 2025-11-07

- Q: Should the sidebar expand on hover (auto-expand) OR require an explicit click action? → A: Both hover AND click (expand on hover, also allow clicking expand button for sticky expansion)
- Q: Should wizard data be preserved if the user cancels midway (for recovery) or completely discarded? → A: Discard completely
- Q: Should the memory graph load immediately when chat starts (preload in background) OR only when the user first opens the memory panel (lazy load)? → A: Lazy load on panel open

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navigate Between Core Views (Priority: P1)

As an operator, I want a persistent navigation sidebar that lets me quickly switch between Threads, Agents, Memory, and Settings so I can efficiently manage my AI chatbot without getting lost.

**Why this priority**: Core navigation is the foundation of the entire UX. Without it, users cannot access any features intuitively. This is the minimum viable navigation structure.

**Independent Test**: Open the app → See collapsible sidebar with icons → Click "Threads" → See thread list → Click "Agents" → See agent list → Click "Memory" → See memory graph browser. All navigation works without any other features implemented.

**Acceptance Scenarios**:

1. **Given** I am on any page in the app, **When** I look at the left edge, **Then** I see a 48px-wide icon rail with navigation items (Threads, Agents, Memory, Settings)
2. **Given** the sidebar is collapsed (48px), **When** I hover over it or click the expand button, **Then** it smoothly expands to 280px showing both icons and labels
3. **Given** the sidebar is expanded, **When** I click a navigation item, **Then** the main content area updates to show the selected view and the active item is highlighted with a purple glow
4. **Given** I navigate to the Threads view, **When** I refresh the page, **Then** I return to the Threads view (navigation state persists)
5. **Given** I expand the sidebar, **When** I refresh the page, **Then** the sidebar remembers my expanded/collapsed preference

---

### User Story 2 - Inspect Memory During Chat (Priority: P1)

As an operator, I want to toggle a memory panel while chatting with an agent so I can see the agent's memory graph in real-time and understand how it's reasoning (transparency by design).

**Why this priority**: Transparency is a core mission principle. Memory inspection is critical for understanding agent behavior and debugging conversations. This delivers the "memory graph observable" promise.

**Independent Test**: Start a chat → Click the 🧠 Memory button in chat header → See 400px right panel slide in with memory graph → Click backdrop or close button → Panel slides out. Chat remains functional throughout. Delivers transparency value immediately.

**Acceptance Scenarios**:

1. **Given** I am in an active chat conversation, **When** I click the 🧠 Memory button in the chat header, **Then** a 400px-wide memory panel slides in from the right edge showing the agent's memory graph
2. **Given** the memory panel is open, **When** I click the backdrop (dimmed area) or the close button, **Then** the panel smoothly slides out and the backdrop fades away
3. **Given** the memory panel is open, **When** I continue chatting, **Then** the memory graph updates in real-time to reflect new memories created by the conversation
4. **Given** the memory panel is open, **When** I resize my browser window, **Then** the panel maintains its 400px width and the chat area adjusts accordingly
5. **Given** I open the memory panel, **When** I navigate away from the chat, **Then** the panel state resets (closed by default on next chat)

---

### User Story 3 - Create Agent with Guided Wizard (Priority: P2)

As an operator, I want to create a new agent using a multi-step wizard that breaks down the 20+ configuration fields into logical sections so I don't feel overwhelmed and can focus on one category at a time.

**Why this priority**: Improves agent creation experience significantly, but the app is usable with the existing form. Reduces cognitive load and increases completion rate for new users.

**Independent Test**: Click "+ New Agent" → See wizard with 4 steps (Basic, LLM, Memory, Autonomy) → Fill out each step → Click "Next" through all steps → Click "Create Agent" → New agent appears in agent list. Works independently of chat or memory features.

**Acceptance Scenarios**:

1. **Given** I am on the Agents page, **When** I click "+ New Agent", **Then** a modal wizard opens showing Step 1 (Basic Information) with a progress indicator (4 dots)
2. **Given** I am on Step 1 of the wizard, **When** I fill in required fields (name, description) and click "Next", **Then** I see Step 2 (LLM Configuration) and the first progress dot is marked complete
3. **Given** I am on Step 2 (LLM Config), **When** I click "Back", **Then** I return to Step 1 with my previously entered data preserved
4. **Given** I am on Step 4 (Autonomy), **When** I click "Create Agent", **Then** the wizard closes, the agent is saved, and I see a success notification
5. **Given** I am on any wizard step, **When** I click "Cancel" or the X button, **Then** a confirmation dialog appears asking if I want to discard changes

---

### User Story 4 - Enhanced Chat Visual Experience (Priority: P2)

As an operator, I want chat messages to have gradient backgrounds, glow effects on hover, and smooth animations so the chat experience feels immersive and matches the cyberpunk aesthetic of the design system.

**Why this priority**: Enhances visual richness and brand identity, but the app is fully functional with basic messages. Increases user satisfaction and perceived quality.

**Independent Test**: Start a chat → Send messages → See user messages with purple-pink gradient background → See agent messages with blue-purple gradient → Hover over messages → See subtle glow effect. All visual enhancements work independently without affecting functionality.

**Acceptance Scenarios**:

1. **Given** I send a message in chat, **When** it renders, **Then** my message bubble has a purple-pink gradient background (`linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))`) with a subtle border
2. **Given** the agent responds, **When** the message renders, **Then** the agent's message has a blue-purple gradient background (`linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2))`)
3. **Given** I hover over any message bubble, **When** my cursor is over it, **Then** a purple glow appears (`box-shadow: 0 0 30px rgba(168, 85, 247, 0.6)`) with a smooth 150ms transition
4. **Given** a new message arrives, **When** it enters the chat, **Then** it fades in with a 200ms opacity animation
5. **Given** I scroll through a long conversation, **When** I use the scrollbar, **Then** the scrollbar has a purple glassmorphic style matching the design system

---

### User Story 5 - Thread List with Agent Context (Priority: P3)

As an operator, I want to see which agent each thread belongs to in the thread list so I can quickly identify conversations and optionally filter to show only threads for a specific agent.

**Why this priority**: Improves thread organization and discovery, but the app is usable without agent labels in the thread list. Enhances navigation efficiency for operators with many agents.

**Independent Test**: Open thread list → See agent avatar/icon next to each thread title → Click "Filter by Agent" → Select an agent → See only threads for that agent → Click "Clear Filter" → See all threads again. Works independently of chat or wizard features.

**Acceptance Scenarios**:

1. **Given** I have threads for multiple agents, **When** I open the thread list, **Then** each thread shows the agent's avatar/icon and name alongside the thread title
2. **Given** I am viewing all threads, **When** I click the "Filter by Agent" dropdown, **Then** I see a list of all my agents
3. **Given** I select an agent from the filter, **When** the filter applies, **Then** the thread list shows only threads for that agent and the header reads "🤖 {AgentName} Conversations"
4. **Given** I am in agent-filtered mode, **When** I click "+ New Conversation", **Then** it automatically uses the filtered agent (no agent picker needed)
5. **Given** I am in agent-filtered mode, **When** I click "Back to All Threads" or clear the filter, **Then** I see all threads from all agents again

---

### Edge Cases

- **What happens when the sidebar is expanded and the user opens the memory panel?** Memory panel overlays the chat area, sidebar remains expanded but does not overlap the panel (z-index layering: sidebar 50, panel 50, backdrop 40)
- **How does the system handle responsive breakpoints (mobile, tablet)?** Sidebar becomes a bottom navigation bar with icons on mobile (<768px), memory panel becomes full-screen overlay on mobile
- **What happens if an agent has zero threads?** Agent-filtered thread list shows "No conversations yet" empty state with "+ New Conversation" CTA
- **How does the memory panel relate to the existing MemoryBrowser component?** Reuse existing MemoryBrowser component (already migrated to design system) with enhanced glassmorphic panel styling, no architectural changes needed
- **How does the wizard handle invalid form inputs?** Inline validation messages appear below fields, "Next" button is disabled until required fields are valid
- **What happens if the user closes the wizard midway through?** Show confirmation dialog: "Discard changes? Your agent won't be saved." with Cancel/Discard buttons
- **How does the memory panel handle empty memory graphs?** Show "No memories yet" empty state with explanation: "Start chatting to build the memory graph"
- **What happens if the LLM API is unreachable during agent creation?** Agent saves successfully (configuration stored), error message appears only when trying to chat: "Cannot connect to LLM. Check agent configuration."
- **How does the system handle very long thread titles?** Truncate with ellipsis after 40 characters, show full title on hover tooltip
- **What happens when the user navigates to an invalid route?** Show 404 page with navigation sidebar still visible, "Return to Threads" button
- **How does the memory panel handle large memory graphs (500+ nodes)?** Implement virtualization/pagination, load first 100 nodes, "Load More" button at bottom

## Requirements *(mandatory)*

### Functional Requirements

#### Navigation System

- **FR-001**: System MUST provide a collapsible sidebar navigation that is visible on all pages except full-screen modals
- **FR-002**: Sidebar MUST support two states: collapsed (48px icon-only rail) and expanded (280px with icons + labels)
- **FR-003**: Sidebar MUST expand on hover for temporary expansion OR on explicit click/tap for sticky expansion that persists until user clicks outside or closes sidebar
- **FR-004**: System MUST persist the user's sidebar state preference (collapsed/expanded) in browser localStorage only for sticky click-based expansion (hover expansion is always temporary)
- **FR-005**: Navigation MUST include four primary items in priority order: Threads, Agents, Memory, Settings
- **FR-006**: System MUST highlight the active navigation item with a visual indicator (purple glow, accent border)
- **FR-007**: Navigation item clicks MUST update the main content area and browser URL without page reload (SPA routing)
- **FR-008**: System MUST restore the last active view on page refresh based on URL
- **FR-009**: Sidebar MUST use glassmorphic design with backdrop blur (24px), semi-transparent background (rgba(26, 26, 46, 0.8)), and subtle border

#### Memory Panel

- **FR-010**: System MUST provide a memory panel toggle button (🧠 icon) in the chat view header
- **FR-011**: Memory panel MUST slide in from the right edge (400px width) with a 200ms ease-out animation
- **FR-012**: When memory panel opens, system MUST display a semi-transparent backdrop (rgba(0, 0, 0, 0.4)) with 8px blur over the chat area
- **FR-013**: Users MUST be able to close the memory panel by clicking the backdrop, close button (X), or memory toggle button
- **FR-014**: Memory panel MUST display the active agent's memory graph with real-time updates during conversation, loading data only when panel first opens (lazy load)
- **FR-015**: System MUST overlay the memory panel on top of chat content with z-index layering (panel 50, backdrop 40, chat 0)
- **FR-016**: Memory panel MUST remain open while navigating within the same chat thread
- **FR-017**: System MUST close the memory panel when navigating away from the chat view

#### Agent Creation Wizard

- **FR-018**: System MUST replace the single-page agent form with a multi-step wizard (4 steps: Basic, LLM, Memory, Autonomy)
- **FR-019**: Wizard MUST display a progress indicator showing current step, completed steps, and remaining steps (visual dots: 12px diameter, active scaled to 1.25)
- **FR-020**: Users MUST be able to navigate forward ("Next" button) only when current step's required fields are valid
- **FR-021**: Users MUST be able to navigate backward ("Back" button) from any step except the first, preserving entered data
- **FR-022**: System MUST validate form inputs inline and display error messages below invalid fields
- **FR-023**: Final step MUST show a "Create Agent" button that saves the agent configuration and closes the wizard
- **FR-024**: Users MUST be able to cancel the wizard from any step with a confirmation dialog if changes were made, discarding all entered data completely (no draft persistence)
- **FR-025**: Wizard MUST open as a centered modal (max-width 768px) with glassmorphic background and backdrop dimming

#### Enhanced Chat Experience

- **FR-026**: User messages MUST render with a purple-pink gradient background (linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2)))
- **FR-027**: Agent messages MUST render with a blue-purple gradient background (linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2)))
- **FR-028**: Message bubbles MUST display a purple glow effect (box-shadow: 0 0 30px rgba(168, 85, 247, 0.6)) on hover with 150ms transition
- **FR-029**: New messages MUST fade in with a 200ms opacity animation
- **FR-030**: Chat scrollbar MUST use custom glassmorphic styling (8px width, purple thumb with 50% opacity, hover to 70%)
- **FR-031**: Message text MUST remain highly readable (color: #e0e0e0) against gradient backgrounds

#### Thread List & Agent Context

- **FR-032**: Thread list MUST display agent avatar/icon and name alongside each thread title
- **FR-033**: System MUST provide a "Filter by Agent" dropdown in the thread list header
- **FR-034**: When an agent filter is applied, thread list MUST show only threads belonging to that agent
- **FR-035**: Agent-filtered mode MUST update the header to read "🤖 {AgentName} Conversations"
- **FR-036**: Agent-filtered mode MUST provide a "Back to All Threads" button to clear the filter
- **FR-037**: In agent-filtered mode, "+ New Conversation" button MUST automatically use the filtered agent (no agent picker)
- **FR-038**: System MUST support navigating from Agents page → Select Agent → View Agent's Threads (enters agent-filtered mode)

#### Responsive Design

- **FR-039**: On mobile devices (<768px), sidebar MUST transform into a bottom navigation bar with icon-only buttons
- **FR-040**: On mobile devices, memory panel MUST become a full-screen overlay instead of a 400px side panel
- **FR-041**: On tablet devices (768px-1024px), sidebar MUST remain at 48px collapsed but expand to 200px (not 280px) to preserve chat space
- **FR-042**: System MUST maintain all functionality across desktop, tablet, and mobile viewports

#### Accessibility

- **FR-043**: All navigation items MUST be keyboard accessible (Tab navigation, Enter to activate)
- **FR-044**: Memory panel MUST trap focus when open (Tab cycles within panel, Escape to close)
- **FR-045**: Wizard MUST support keyboard navigation (Tab between fields, Enter to submit, Escape to cancel)
- **FR-046**: All interactive elements MUST have ARIA labels and proper semantic HTML
- **FR-047**: Focus indicators MUST be visible and meet WCAG 2.1 contrast requirements

### Key Entities

- **NavigationState**: Represents the current active view (threads, agents, memory, settings) and sidebar state (collapsed/expanded), persisted in localStorage
- **MemoryPanelState**: Represents whether the memory panel is open/closed for the current chat thread, includes animation state (opening, open, closing, closed)
- **WizardStep**: Represents a single step in the agent creation wizard (step number, title, description, form fields, validation rules)
- **AgentFilter**: Represents the active agent filter in the thread list (agentId or null for all threads)
- **ChatMessage**: Extended with visual properties (messageType: user/agent, gradientStyle, glowIntensity) for enhanced rendering

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can navigate between Threads, Agents, and Memory views in under 2 seconds (100% task completion rate)
- **SC-002**: Time to create a new agent reduces from ~5 minutes to under 2 minutes (60% improvement)
- **SC-003**: Memory panel opens within 200ms of button click (perceived instant response)
- **SC-004**: At least 90% of users successfully complete the agent creation wizard on first attempt (measured by completion rate without abandonment)
- **SC-005**: Memory panel usage increases to at least 50% of chat sessions (measured by toggle button clicks)
- **SC-006**: Navigation clarity improves to 100% (zero "how do I get to X?" support questions)
- **SC-007**: Chat experience satisfaction rating reaches 4.5/5 or higher (measured by in-app feedback)
- **SC-008**: Page load time remains under 1 second despite enhanced visual effects (performance budget maintained)
- **SC-009**: Zero accessibility violations detected by automated testing tools (axe-core, WAVE)
- **SC-010**: Mobile users can access all features with same completion rates as desktop users (responsive parity)

---

## Dependencies & Assumptions

### Dependencies

- **Neon Flux Design System**: All components MUST use `@workspace/ui` design library (Spec 014 complete)
- **Design Tokens**: Exact color values (rgba), spacing (8/12/16/24px), animations (150/200ms) defined in prototypes
- **React Router**: SPA routing for navigation state management
- **localStorage API**: Browser support for persisting sidebar and filter preferences
- **WebSocket API**: Real-time memory graph updates during chat (existing implementation)

### Assumptions

- **Single-operator deployment**: No multi-user authentication, all data is local to the operator's browser session
- **Desktop-first**: Primary usage on desktop (laptop/desktop screens), mobile is secondary
- **Modern browsers**: Chrome 90+, Firefox 88+, Safari 14+ (CSS backdrop-filter support required)
- **Existing memory graph implementation**: Memory data structure and API already exist, this spec only adds UI layer
- **Agent CRUD already exists**: Basic agent create/read/update/delete functionality present, wizard is a UX enhancement

---

## Out of Scope (Future Work)

- **Dashboard view**: Centralized home screen with agent status cards, activity feed (deferred to Phase 2)
- **Settings page**: Theme customization, user preferences, system configuration (basic settings only in P1)
- **Memory editing UI**: Inline memory node editing, deletion, manual memory creation (read-only in P1)
- **Agent templates**: Pre-configured agent templates (Code Assistant, Creative Writer, etc.)
- **Keyboard shortcuts**: Global hotkeys for navigation (e.g., Cmd+1 for Threads, Cmd+2 for Agents)
- **Search functionality**: Global search across threads, messages, memories
- **Drag-and-drop**: Reordering agents, organizing threads into folders
- **Dark/light theme toggle**: Neon Flux is dark-only in Phase 1

---

## References

- **Prototypes**: Working HTML demos in `specs/015-ux-navigation-redesign/prototypes/`
  - `01-collapsed-sidebar-chat.html`: Hover-expandable sidebar pattern
  - `02-expanded-sidebar-memory-panel.html`: Memory panel slide-in with backdrop
  - `03-agent-creation-wizard.html`: Multi-step wizard with progress indicator
- **UX Requirements**: Detailed user research and design decisions in `specs/015-ux-navigation-redesign/ux-requirements.md`
- **Design Spec**: TypeScript component APIs and layouts in `specs/015-ux-navigation-redesign/design-spec.md`
- **Design System Impact**: New components and tokens in `specs/015-ux-navigation-redesign/design-system-impact.md`
- **Neon Flux Design System**: `specs/013-neon-flux-design-system/spec.md`
- **Design System Migration**: `specs/014-design-system-migration/spec.md`
- **Cerebrobot Mission**: `docs/mission.md` (transparency by design principle)
