# Feature Specification: UX Fixes & Global Agent Settings

**Feature Branch**: `017-ux-fixes`  
**Created**: 2025-11-10  
**Status**: Draft  
**Input**: Fix critical UX issues (retry flow, memory panel) and add global agent configuration with markdown rendering

## Clarifications

### Session 2025-11-10

**Retry Flow & Memory Panel**:
- Q: Should failed messages be restored to input immediately on error, or only when retry is clicked? → A: Immediate restoration (mirror cancellation UX)
- Q: Should non-retryable errors also preserve the message for editing? → A: Yes, preserve for editing/correcting
- Q: What happens if user starts typing a new message while error is displayed? → A: Auto-clear error state silently
- Q: Should failed retry attempts be persisted to database? → A: No, skip persistence until send succeeds
- Q: Are duplicate retry messages visible in the UI? → A: Yes, confirmed via screenshot evidence (Issue #5)
- Q: Should there be visual distinction for restored-after-error messages? → A: No, keep simple and consistent

**Global Agent Configuration**:
- Q: Should global settings be system-wide, per-user, or configurable override? → A: System-wide (KISS approach)
- Q: What tool reference format should be used? → A: Iterate all LangChain tools and include in prompts
- Q: Should this be in 017-ux-fixes or separate spec? → A: Include in 017-ux-fixes (expand scope)
- Q: Should markdown renderer apply to all messages or just agent messages? → A: All messages (KISS), use industry-standard React/Tailwind library

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Failed Message Retry Without Retyping (Priority: P1)

As an operator, when my message fails to send due to a network error or timeout, I want the message to remain in the input field so I can retry without retyping it, matching the behavior of the cancellation flow.

**Why this priority**: This is a critical UX bug affecting all retryable errors. Users experience significant frustration when forced to retype entire messages after network failures. High severity, high frequency.

**Independent Test**: Start a chat → Type a long message → Simulate network failure (disconnect WiFi) → Send message → See error with retry button → Verify message is still in input field → Reconnect WiFi → Click retry → Message sends successfully. No retyping required.

**Acceptance Scenarios**:

1. **Given** I type "Hello world" and send, **When** the send fails with a retryable error (network timeout), **Then** "Hello world" remains in the input field and an error message appears with a "Retry" button
2. **Given** a send fails and my message is preserved in the input, **When** I click the "Retry" button, **Then** the error clears, the message sends, and the input field clears upon successful send
3. **Given** a send fails with a non-retryable error (validation failure), **When** the error appears, **Then** my message remains in the input field so I can edit and correct it
4. **Given** a send fails and my message is preserved, **When** I start typing a new message, **Then** the error state auto-clears and I can send the new message
5. **Given** a send fails and I correct the message in the input field, **When** I click send again, **Then** the corrected message sends successfully

---

### User Story 2 - No Duplicate Messages on Retry (Priority: P1)

As an operator, when a message send fails and I retry, I want only the successful send to be persisted to the thread history, not multiple duplicate copies of the same message.

**Why this priority**: Data integrity issue causing pollution of thread history, confusing LLM context, and wasting database space. High severity with clear visual evidence.

**Independent Test**: Start a chat → Send a message → Simulate timeout causing retry → Verify only ONE user message appears in thread history → Check database to confirm no duplicate message records. No manual cleanup required.

**Acceptance Scenarios**:

1. **Given** I send a message that fails initially but succeeds on retry, **When** I view the thread history, **Then** I see exactly ONE copy of my message (the successful send)
2. **Given** I retry a failed message 3 times before it succeeds, **When** I view the thread history, **Then** I see exactly ONE copy of my message, not 3-4 duplicates
3. **Given** a message send fails, **When** the failure occurs, **Then** the system does NOT persist the message to the database or LangGraph checkpoint
4. **Given** a message is retried successfully, **When** the agent responds, **Then** the agent's response references only the single user message, not confused by duplicates
5. **Given** multiple messages fail and retry in a conversation, **When** I view the thread history, **Then** each message appears exactly once with correct chronological order

---

### User Story 3 - Simplified Memory Panel UI (Priority: P3)

As an operator, when I open the memory panel, I want a clean, simple interface without redundant headers or unnecessary helper text so I can focus on browsing my agent's memories efficiently.

**Why this priority**: Visual polish issue that doesn't block functionality but reduces cognitive load. Low priority but quick win (5-minute fix).

**Independent Test**: Open a chat → Click 🧠 Memory button → See memory panel with single "Memory" title, search input with placeholder text, and memory list. No redundant headers or verbose helper text cluttering the view.

**Acceptance Scenarios**:

1. **Given** I open the memory panel, **When** it loads, **Then** I see a single clear title "Memory" at the top (not "Memory Graph" AND "Agent Memory")
2. **Given** I view the search section, **When** I look at the search input, **Then** I see a placeholder "Search memories..." inside the input field (no separate helper text block)
3. **Given** I view the memory panel, **When** I scan the interface, **Then** I do NOT see the redundant text "Search using natural language (e.g., 'preferences', 'chocolate')"
4. **Given** I view the memory panel, **When** I look at the visual hierarchy, **Then** the layout follows: Title → Memory count → Search input → Sort indicator → Memory list (clean, logical flow)
5. **Given** I search for memories, **When** I use the search, **Then** the functionality works identically to before (only visual cleanup, no behavior changes)

---

### User Story 4 - Global Agent Configuration Settings (Priority: P2)

As an operator, I want to configure global agent settings that apply to all my agents automatically so I don't have to repeat the same configuration in every agent's system prompt.

**Why this priority**: Reduces repetitive configuration work and ensures consistency across all agents. First implementation of the Settings feature. Medium priority - valuable but not blocking core UX fixes.

**Independent Test**: Navigate to /settings → See "Global Agent Configuration" section → Configure markdown response format → Configure tool reference injection → Save settings → Create new agent → Verify global settings are automatically applied to agent's system prompt. No manual prompt editing required.

**Acceptance Scenarios**:

1. **Given** I navigate to /settings, **When** the page loads, **Then** I see a "Global Agent Configuration" section with toggles for markdown formatting and tool references
2. **Given** I enable "Respond in Markdown" setting, **When** I save, **Then** all agents automatically receive "Respond using markdown formatting" instruction in their system prompts
3. **Given** I enable "Include Tool References" setting, **When** I save, **Then** all agents receive a list of available LangChain tools in their system prompts
4. **Given** global settings are configured, **When** I create a new agent, **Then** the agent inherits global configuration without requiring manual prompt editing
5. **Given** global settings are changed, **When** I start a conversation with any agent, **Then** the updated global settings are applied to that agent's system prompt

---

### User Story 5 - Markdown-Formatted Agent Responses (Priority: P2)

As an operator, when chatting with an agent, I want to see responses rendered with proper markdown formatting (headers, lists, code blocks, bold, italic) so the content is more readable and structured.

**Why this priority**: Significantly improves readability and user experience for complex agent responses. Enables agents to provide better-structured information. Medium priority - enhances UX but not critical bug fix.

**Independent Test**: Start a chat → Ask agent "Explain TypeScript interfaces using markdown" → Agent responds with markdown syntax → See rendered output with headers, code blocks, lists, and formatting. No raw markdown syntax visible (e.g., `**bold**` renders as **bold**).

**Acceptance Scenarios**:

1. **Given** an agent responds with markdown syntax (headers, lists, code), **When** I view the response, **Then** I see properly rendered markdown (not raw syntax)
2. **Given** an agent includes code blocks with language specifiers, **When** I view the response, **Then** code blocks are syntax-highlighted appropriately
3. **Given** an agent uses bold, italic, or inline code formatting, **When** I view the response, **Then** formatting is applied correctly (bold text is bold, inline code has monospace font)
4. **Given** I send a message with markdown syntax, **When** the message is displayed, **Then** my message also renders markdown formatting for consistency
5. **Given** an agent responds with a long markdown document, **When** I scroll through the response, **Then** rendering performance is smooth without lag or flickering

---

### User Story 6 - Settings Navigation (Priority: P3)

As an operator, I want to access application settings through the navigation sidebar so I can configure system-wide preferences without searching through menus.

**Why this priority**: Completes the navigation structure by adding Settings. Low priority - nice-to-have for navigation completeness, but global settings can function without dedicated nav item initially.

**Independent Test**: Open app → See sidebar navigation → Click "Settings" icon → Navigate to /settings page → See global agent configuration section → Navigate back to chat. Settings accessible from any page.

**Acceptance Scenarios**:

1. **Given** I am on any page, **When** I look at the sidebar, **Then** I see a "Settings" navigation item with a gear icon
2. **Given** I click the Settings navigation item, **When** the page loads, **Then** I see the Settings page with available configuration sections
3. **Given** I am on the Settings page, **When** I click another navigation item, **Then** settings are saved automatically (or prompt to save if unsaved changes exist)
4. **Given** the sidebar is collapsed, **When** I hover over the Settings icon, **Then** I see a tooltip "Settings"
5. **Given** I am on the Settings page, **When** the page loads, **Then** the Settings navigation item is highlighted as active

---

### Edge Cases

- **What happens when network fails mid-stream during agent response?** Failed user message already persisted successfully; only the incomplete agent response is discarded. User can send a new message to retry.
- **What if the user edits the preserved failed message before retrying?** Edited version sends on retry (expected behavior), original failed content is discarded completely.
- **How does the system handle rapid retry clicks?** Debounce retry button with 500ms cooldown to prevent duplicate sends, show loading state during retry attempt.
- **What happens if persistence fails but WebSocket send succeeds?** Edge case requiring error handling - show error "Message sent but not saved to history", log error, allow user to continue (fail operational).
- **How does cancellation flow interact with failed message flow?** Cancellation preserves message and allows retry; failure preserves message and allows retry. Both use same `lastUserMessageRef` pattern for consistency.
- **What if the user closes the browser tab during a failed send?** Message is lost (expected behavior for unsaved drafts); no auto-recovery on tab reopen.
- **How does the memory panel handle zero memories?** Shows "No memories yet" empty state with explanation "Start chatting to build the memory graph" (already implemented, no changes needed).
- **What happens if memory panel is open during memory deletion?** Real-time update removes deleted memory from list (WebSocket event, already implemented).
- **What if global settings change mid-conversation?** Next message in conversation uses updated global settings; existing messages remain unchanged (no retroactive re-rendering).
- **How does markdown rendering handle malformed markdown syntax?** Renderer gracefully degrades to plain text or best-effort rendering without breaking the UI.
- **What if an agent's response contains XSS-vulnerable markdown?** Markdown renderer sanitizes HTML to prevent XSS attacks (industry-standard library handles this).
- **How are global settings stored?** Persisted in database with singleton pattern (one global config per system), loaded on server startup.
- **What if LangChain tools list is empty?** Tool references section is omitted from system prompts; markdown setting still functions independently.

## Requirements *(mandatory)*

### Functional Requirements

#### Failed Message Retry Flow

- **FR-001**: System MUST preserve failed message content in the input field immediately when a send error occurs (retryable or non-retryable)
- **FR-002**: System MUST extend the `ErrorState` interface to include `failedMessage?: string` and `failedMessageId?: string` fields
- **FR-003**: System MUST repopulate the input field with `lastUserMessageRef.current.content` when `handleAssistantError` executes
- **FR-004**: Retry button click MUST clear the error state and send the current input field content (which contains the preserved message)
- **FR-005**: System MUST clear the error state automatically when user starts typing a new message (overriding the preserved failed message)
- **FR-006**: System MUST remove the failed user message from the UI message list when retry is clicked (cleanup of optimistic UI update)
- **FR-007**: System MUST mirror the cancellation flow pattern for consistency (`setPendingMessage(lastUserMessageRef.current.content)`)

#### Duplicate Message Prevention

- **FR-008**: System MUST NOT persist user messages to database/checkpoint until WebSocket send completes successfully
- **FR-009**: System MUST NOT create duplicate message records when a failed send is retried
- **FR-010**: System MUST remove any optimistic UI message previews when a send fails (before retry)
- **FR-011**: System MUST ensure only the successful retry persists to the thread history, not failed attempts
- **FR-012**: System MUST maintain correct message chronological order even when retries occur
- **FR-013**: System MUST NOT send duplicate messages to the LLM context window during retries

#### Memory Panel UI Simplification

- **FR-014**: System MUST display a single "Memory" title at the top of the memory panel (remove "Memory Graph" and "Agent Memory" redundancy)
- **FR-015**: System MUST remove the helper text "Search using natural language (e.g., 'preferences', 'chocolate')" from the memory panel
- **FR-016**: System MUST use placeholder text "Search memories..." inside the search input field instead of separate helper text
- **FR-017**: System MUST remove any redundant "Search" label between the input and helper text
- **FR-018**: System MUST maintain all existing memory panel functionality (search, sort, CRUD operations) without behavior changes

#### Global Agent Configuration

- **FR-019**: System MUST provide a Settings page accessible via /settings route
- **FR-020**: Settings page MUST include a "Global Agent Configuration" section
- **FR-021**: Global configuration MUST include a toggle for "Respond in Markdown" setting
- **FR-022**: Global configuration MUST include a toggle for "Include Tool References" setting
- **FR-023**: System MUST persist global configuration to database (singleton pattern - one global config per system)
- **FR-024**: When "Respond in Markdown" is enabled, system MUST inject "You must respond using markdown formatting for all messages" instruction into every agent's system prompt
- **FR-025**: When "Include Tool References" is enabled, system MUST iterate all available LangChain tools and inject their names/descriptions into every agent's system prompt
- **FR-026**: System MUST apply global configuration to all agents automatically without requiring manual prompt editing
- **FR-027**: Global configuration changes MUST take effect on the next message in any active conversation (no retroactive changes to existing messages)
- **FR-028**: System MUST load global configuration on server startup and cache for performance

#### Markdown Rendering

- **FR-029**: System MUST render all chat messages (user and agent) with markdown formatting support
- **FR-030**: Markdown renderer MUST support standard markdown syntax (headers, lists, code blocks, bold, italic, links, inline code)
- **FR-031**: Markdown renderer MUST provide syntax highlighting for code blocks with language specifiers
- **FR-032**: Markdown renderer MUST sanitize HTML to prevent XSS attacks
- **FR-033**: Markdown renderer MUST gracefully handle malformed markdown syntax without breaking the UI
- **FR-034**: Markdown rendering MUST maintain smooth scroll performance for long messages

#### Settings Navigation

- **FR-035**: Sidebar navigation MUST include a "Settings" item with gear icon
- **FR-036**: Settings navigation item MUST route to /settings page
- **FR-037**: Settings navigation item MUST highlight as active when on /settings route
- **FR-038**: Settings page MUST be accessible from any route via sidebar navigation

### Key Entities

- **ErrorState (Extended)**: Interface for error information
  - `message`: String describing the error
  - `retryable`: Boolean indicating if retry is allowed
  - `failedMessage?`: String containing the user's failed message content (NEW)
  - `failedMessageId?`: String ID of the failed message for cleanup (NEW)
  
- **Message Persistence Flow**: Lifecycle states for user messages
  - **Optimistic UI**: Message shown in UI immediately when user sends (client-side only)
  - **WebSocket Send**: Message transmitted to server via WebSocket
  - **Success Path**: WebSocket confirms success → Persist to database/checkpoint → Mark UI message as confirmed
  - **Failure Path**: WebSocket errors → Remove optimistic UI message → Preserve content in input → Allow retry → Only persist on successful retry

- **Memory Panel Components**: UI elements
  - Title: Single "Memory" header
  - Search Input: Placeholder "Search memories..." (no helper text)
  - Memory List: Sorted, filterable list of agent memories
  - Empty State: "No memories yet" message

- **GlobalConfiguration (NEW)**: System-wide settings entity
  - `markdownEnabled`: Boolean - whether agents should respond in markdown
  - `toolReferencesEnabled`: Boolean - whether to inject tool references into prompts
  - `createdAt`: Timestamp of creation
  - `updatedAt`: Timestamp of last modification
  
- **Tool Reference (NEW)**: LangChain tool metadata
  - `name`: Tool identifier (e.g., "web_search", "calculator")
  - `description`: Human-readable tool description
  - `parameters`: Tool input parameters (optional, for prompt injection)

- **Settings Page Components (NEW)**: UI elements
  - Global Agent Configuration Section: Container for global settings
  - Markdown Toggle: Enable/disable markdown response formatting
  - Tool References Toggle: Enable/disable tool list injection
  - Save Button: Persist configuration changes

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of failed message sends preserve the message in the input field for retry (zero retyping required)
- **SC-002**: 100% of successful retries result in exactly ONE persisted message in thread history (zero duplicates)
- **SC-003**: Error state auto-clears when user starts typing a new message (smooth UX flow)
- **SC-004**: Memory panel visual hierarchy simplified with zero redundant text elements (confirmed via screenshot review)
- **SC-005**: All existing memory panel functionality works identically after UI cleanup (zero regressions)
- **SC-006**: Retry flow matches cancellation flow pattern (consistent UX behavior)
- **SC-007**: Failed send attempts consume zero database/checkpoint storage (only successful sends persist)
- **SC-008**: LLM context window receives zero duplicate user messages (clean conversation history)
- **SC-009**: 100% of agents automatically receive global configuration in system prompts without manual editing
- **SC-010**: Markdown-formatted agent responses render correctly with zero XSS vulnerabilities (sanitized HTML)
- **SC-011**: Settings page accessible from any route via sidebar navigation (100% navigation success rate)
- **SC-012**: Global configuration changes take effect immediately on next message (zero delay beyond normal message latency)
- **SC-013**: Code blocks in agent responses display with appropriate syntax highlighting
- **SC-014**: Markdown rendering maintains smooth scroll performance for messages up to 10,000 characters

## Scope

### In Scope

**Retry Flow & Memory Panel Polish**:
- Extending `ErrorState` interface in `useChatMessages.ts` to preserve failed messages
- Modifying `handleAssistantError` to repopulate input field with failed message
- Updating `onRetry` to clear error and cleanup failed message from UI
- Preventing message persistence until WebSocket send succeeds
- Cleaning up duplicate message creation logic during retries
- Simplifying memory panel title hierarchy (single "Memory" header)
- Removing redundant helper text from memory panel search
- Updating search input placeholder text

**Global Agent Configuration**:
- Creating Settings page UI component and /settings route
- Creating GlobalConfiguration database model/service
- Implementing global configuration CRUD operations
- Adding "Global Agent Configuration" section to Settings page
- Adding markdown and tool references toggle controls
- Injecting markdown instruction into agent system prompts when enabled
- Iterating LangChain tools and injecting references into agent system prompts when enabled
- Applying global configuration to all agents automatically

**Markdown Rendering**:
- Integrating industry-standard React/Tailwind markdown library (e.g., react-markdown)
- Rendering all chat messages (user and agent) with markdown support
- Implementing syntax highlighting for code blocks
- Sanitizing markdown HTML to prevent XSS attacks
- Handling malformed markdown gracefully

**Settings Navigation**:
- Adding Settings navigation item to sidebar with gear icon
- Implementing Settings route and page component
- Highlighting active navigation item for Settings

### Out of Scope

- Changing WebSocket protocol or message format
- Modifying LangGraph checkpoint schema
- Altering agent response streaming behavior
- Adding new memory panel features (search filters, sorting options)
- Changing memory creation/deletion logic
- Modifying thread persistence or conversation management
- Adding visual indicators for "restored after error" messages (keep simple)
- Implementing offline queue for failed messages (future enhancement)
- Per-agent override of global configuration (all agents use same global settings)
- Custom markdown themes or styling options (use default library styles with design system)
- Exporting/importing global configuration (manual editing only)
- Version history for global configuration changes (simple save/update only)
- Tool usage analytics or monitoring (just reference injection)

## Assumptions

**Retry Flow**:
- `lastUserMessageRef` already tracks the sent message content (confirmed via code analysis)
- Cancellation flow using `setPendingMessage` works correctly (confirmed as reference implementation)
- `ErrorState` interface can be extended without breaking existing error handling
- WebSocket send completion is the correct trigger for message persistence
- Optimistic UI message updates can be rolled back on send failure

**Memory Panel**:
- Memory panel components are isolated and can be updated independently
- Existing memory panel search/sort functionality does not depend on removed helper text
- Memory panel styling already uses design system components (no design system migration needed)

**Global Configuration**:
- System-wide global configuration is acceptable (no per-user customization needed)
- LangChain tools can be iterated programmatically to extract names/descriptions
- Agents will respect markdown formatting instructions in their system prompts
- Global configuration changes can take effect immediately (no caching invalidation issues)
- Tool references are informational only (agents decide whether to use tools based on LangChain logic)

**Markdown Rendering**:
- Industry-standard React markdown library exists and is compatible with Tailwind/design system
- Markdown library handles XSS sanitization automatically (no custom security needed)
- React markdown library supports syntax highlighting for code blocks
- Rendering performance is acceptable for typical message lengths (<10,000 chars)
- User messages will occasionally contain markdown syntax worth rendering

## Dependencies

**Existing Components**:
- **Client Hook**: `apps/client/src/hooks/useChatMessages.ts` - Error handling and retry logic
- **WebSocket Client**: `apps/client/src/hooks/useChatMessages.ts` - Message send/receive via WebSocket
- **Memory Panel Component**: `apps/client/src/components/MemoryPanel.tsx` (or similar) - UI simplification target
- **Design System**: `@workspace/ui` - Memory panel uses design system primitives (Box, Stack, Text, Input)
- **Message Persistence**: Server-side event/effect system ensures messages persist after WebSocket confirmation
- **Agent Service**: `apps/server/src/agent/` - Agent configuration and system prompt management
- **LangGraph Agent**: `apps/server/src/agent/graph/` - Agent execution with LangChain tools

**New Dependencies (To Be Added)**:
- **Markdown Rendering Library**: Industry-standard React markdown library (e.g., `react-markdown` + `remark-gfm` + `rehype-highlight`)
- **Syntax Highlighting**: Code syntax highlighter compatible with chosen markdown library (e.g., `highlight.js` or `prism-react-renderer`)
- **GlobalConfiguration Model**: Database model/service for storing global settings
- **Settings Page Components**: New UI components for Settings page and configuration forms

## Non-Functional Requirements

**Performance**:
- Message preservation adds <5ms overhead (in-memory ref copy)
- Markdown rendering adds <50ms overhead per message (acceptable for UX)
- Global configuration cached on server startup (zero per-request database lookups)
- Settings page loads in <500ms

**Reliability**:
- Failed message preservation has 100% accuracy (no edge cases where message is lost)
- Markdown renderer handles malformed syntax without UI crashes
- Global configuration persists reliably across server restarts

**Consistency**:
- Retry flow behavior exactly matches cancellation flow behavior
- Markdown rendering applies consistently to all messages (user + agent)
- Global configuration applies uniformly to all agents

**Maintainability**:
- Single pattern (`lastUserMessageRef`) used consistently across error and cancellation flows
- Markdown library choice prioritizes long-term maintenance and community support
- Global configuration uses singleton pattern for simplicity

**Debuggability**:
- Failed sends logged with clear error context for troubleshooting
- Global configuration changes logged for audit trail
- Markdown rendering errors logged without breaking message display

**Backward Compatibility**:
- Existing conversations and message history unaffected by changes
- Agents without markdown-enabled global config still function normally
- Plain text messages render correctly when markdown is enabled

**Accessibility**:
- Memory panel UI simplification maintains screen reader compatibility and keyboard navigation
- Markdown-rendered content maintains semantic HTML for screen readers
- Settings page follows WCAG 2.1 AA accessibility standards

**Security**:
- Markdown rendering sanitizes HTML to prevent XSS attacks
- Global configuration stored in database with appropriate access controls
- Tool references do not expose sensitive system information

## Security & Privacy

**Retry Flow & Memory Panel**:
- Failed message content stored only in client-side memory (`lastUserMessageRef`), not transmitted or logged
- No change to message encryption or WebSocket security
- Memory panel UI changes do not affect memory access control or privacy settings
- Failed messages cleared from memory when page reloads (no persistent storage of failed sends)

**Markdown Rendering**:
- Markdown renderer MUST sanitize HTML to prevent XSS attacks (industry-standard library handles this)
- No user-generated HTML allowed in markdown (only safe markdown syntax)
- Code blocks rendered with syntax highlighting but no code execution
- External links in markdown open with `rel="noopener noreferrer"` to prevent tabnabbing

**Global Configuration**:
- Global configuration stored in database with appropriate access controls (admin-only write access)
- Tool references expose only publicly documented LangChain tool names/descriptions (no sensitive internals)
- Configuration changes logged for audit trail
- No sensitive data (API keys, credentials) stored in global configuration

## Future Considerations

**Retry Flow Enhancements**:
- **Offline Queue**: Persist failed messages to IndexedDB for recovery after tab close/network restoration
- **Retry Indicators**: Visual badge showing "Message restored after error" for transparency
- **Auto-Retry**: Configurable automatic retry with exponential backoff for transient network errors
- **Draft Persistence**: Auto-save message drafts in input field to localStorage for crash recovery

**Memory Panel Enhancements**:
- **Advanced Memory Search**: Autocomplete, filters by date/type, semantic similarity threshold slider
- **Memory Panel Features**: Bulk operations (delete multiple), memory tagging, memory editing UI

**Global Configuration Expansion**:
- **Per-Agent Overrides**: Allow individual agents to override specific global settings
- **Per-User Customization**: Support multiple operators with different global preferences
- **Configuration Templates**: Pre-defined configuration profiles for different use cases
- **Export/Import**: Backup and restore global configuration
- **Version History**: Track configuration changes over time with rollback capability

**Markdown Enhancements**:
- **Custom Themes**: Allow customization of code block themes and markdown styling
- **Mermaid Diagrams**: Support rendering diagrams from markdown
- **LaTeX Math**: Support mathematical notation in markdown
- **Collapsible Sections**: Allow long responses to be collapsed/expanded
- **Copy Code Button**: Add copy-to-clipboard button for code blocks

**Settings Expansion**:
- **User Preferences**: Theme selection, notification settings, keyboard shortcuts
- **System Configuration**: Database connection, API endpoints, logging levels
- **Security Settings**: Session timeout, password policies, 2FA configuration
- **Integration Settings**: Webhook configurations, third-party API keys
