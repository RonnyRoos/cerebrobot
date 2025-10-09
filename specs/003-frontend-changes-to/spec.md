# Feature Specification: Conversation Thread Management UI

**Feature Branch**: `003-frontend-changes-to`  
**Created**: 2025-10-08  
**Status**: Draft  
**Input**: User description: "Frontend changes to support fetching all ongoing conversation threads and allow the user to resume them. The UI should start with the user being presented with possible threads to select, or be allowed to start a new one."

## Clarifications

### Session 2025-10-08

- Q: What happens to conversation threads that are created but have no messages (user clicked "New Conversation" but navigated away without sending anything)? → A: Empty threads are kept permanently and displayed like any other thread
- Q: What loading indicators should be shown while threads are being fetched or when conversation history is loading? → A: No loading indicators - keep it simple
- Q: How should the thread title be derived for display in the thread list? → A: First user message only (first 50 characters)
- Q: When the same user opens the same thread on two different devices/tabs, how should changes be synchronized? → A: Manual refresh only - user must reload page to see updates from other devices
- Q: When resuming a thread, is there a limit to how many messages are loaded, or should the complete history always be retrieved? → A: Always load complete history (all messages from the beginning)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Available Conversation Threads (Priority: P1)

When a user opens the application (after initial user setup), they see a list of their previous conversation threads, allowing them to understand what conversations they have in progress and select one to continue.

**Why this priority**: This is the foundation of the feature - users cannot resume conversations if they cannot see what's available. This is the minimum viable increment.

**Independent Test**: Can be fully tested by creating a user, starting 2-3 conversations, closing the app, reopening it, and verifying all previous threads are displayed with identifiable information.

**Acceptance Scenarios**:

1. **Given** a user has 3 existing conversation threads, **When** they open the application after user setup, **Then** they see a list showing all 3 threads with preview information
2. **Given** a user has no existing conversation threads, **When** they open the application after user setup, **Then** they see an empty state message prompting them to start a new conversation
3. **Given** a user is viewing their thread list, **When** the threads load, **Then** each thread shows a preview of the last message and timestamp
4. **Given** a user is viewing their thread list, **When** the threads are displayed, **Then** they are sorted by most recent activity first

---

### User Story 2 - Resume Existing Conversation (Priority: P2)

Users can select a previous conversation thread from the list and resume chatting from where they left off, maintaining full conversation context and memory.

**Why this priority**: Once users can see their threads (P1), the next critical capability is actually resuming them. This delivers the core value of thread management.

**Independent Test**: Can be tested by creating a conversation with specific context/memories, closing it, selecting that thread from the list, and verifying the conversation continues with full context intact.

**Acceptance Scenarios**:

1. **Given** a user is viewing the thread list, **When** they click on a specific thread, **Then** the chat view opens with the full conversation history loaded
2. **Given** a user has resumed a conversation, **When** they send a new message, **Then** the response maintains context from the previous conversation
3. **Given** a user has resumed a conversation containing memory references, **When** they send related messages, **Then** the assistant recalls and uses those memories appropriately
4. **Given** a user is viewing an active conversation, **When** they send a message, **Then** the thread list updates to reflect the new last message and timestamp

---

### User Story 3 - Start New Conversation Thread (Priority: P2)

Users can initiate a new conversation thread from the thread list view, creating a fresh conversation context separate from existing threads.

**Why this priority**: Equal in value to resuming threads - users need the ability to start fresh conversations on new topics without polluting existing thread contexts.

**Independent Test**: Can be tested by viewing the thread list, clicking "New Conversation", verifying a new thread is created, sending messages to establish it, then returning to the thread list to confirm it appears.

**Acceptance Scenarios**:

1. **Given** a user is viewing the thread list, **When** they click the "New Conversation" button, **Then** a new chat view opens with empty conversation history
2. **Given** a user has started a new conversation, **When** they send the first message, **Then** a new thread is created and appears in the thread list
3. **Given** a user has created a new conversation, **When** they return to the thread list, **Then** the new thread appears at the top (most recent)
4. **Given** a user starts a new conversation, **When** messages are exchanged, **Then** the thread is independent of all other existing threads

---

### User Story 4 - Thread Identification and Preview (Priority: P3)

Users can distinguish between conversation threads at a glance using meaningful preview information including thread title, last message preview, and timestamp.

**Why this priority**: Enhances usability but not critical for basic functionality - users can still resume threads by clicking through them even without rich previews.

**Independent Test**: Can be tested by creating threads with distinctive first messages, verifying the preview shows enough information to identify each thread's topic.

**Acceptance Scenarios**:

1. **Given** a conversation thread exists, **When** viewing the thread list, **Then** the thread shows a title derived from the conversation topic or first message
2. **Given** a conversation thread has multiple messages, **When** viewing the thread list, **Then** the preview shows the last 50-100 characters of the most recent message
3. **Given** multiple threads exist from different times, **When** viewing the thread list, **Then** each thread displays a human-readable timestamp (e.g., "2 hours ago", "Yesterday", "Dec 15")
4. **Given** a thread is actively streaming a response, **When** viewing the thread list, **Then** the thread shows a visual indicator of active status

---

### Edge Cases

- What happens when a thread has been deleted or corrupted in the database but appears in the list?
- How does the system handle attempting to resume a thread that no longer exists?
- What happens if thread list loading fails (network error, database unavailable)?
- How are threads displayed when a user has 100+ conversations?
- Multi-device/tab access: changes require manual page reload to sync (no real-time updates)
- How does the system handle threads with very long messages in the preview?
- Empty threads (with no messages) are displayed in the thread list and can be resumed to start adding messages

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a thread list view as the initial screen after user setup, showing all conversation threads belonging to the authenticated user
- **FR-002**: System MUST fetch thread metadata from the backend (see [data-model.md](./data-model.md#threadmetadata) for complete field specification including thread ID, title, last message content, last activity timestamp, message count, and last message role)
- **FR-003**: System MUST sort conversation threads by most recent activity (last message timestamp) in descending order
- **FR-004**: System MUST allow users to select a thread from the list to resume the conversation with full history
- **FR-005**: System MUST load complete conversation history when a thread is resumed, including all previous messages from the beginning in chronological order
- **FR-006**: System MUST maintain conversation context and memory when resuming a thread (use existing sessionId/threadId)
- **FR-007**: System MUST provide a "New Conversation" action that creates a fresh thread with empty conversation history
- **FR-008**: System MUST display an empty state message when a user has no existing conversation threads
- **FR-009**: System MUST show a preview of the last message for each thread (truncated to 100 characters)
- **FR-010**: System MUST display human-readable timestamps for each thread (relative time for recent, absolute for older)
- **FR-011**: System MUST update the thread list when a new message is sent in the active conversation
- **FR-012**: System MUST handle errors gracefully when thread list fails to load, showing appropriate error message and retry option
- **FR-013**: System MUST handle errors gracefully when attempting to resume a non-existent thread, redirecting to thread list with error notification
- **FR-014**: System MUST allow users to navigate back to the thread list from an active conversation
- **FR-015**: System MUST display empty threads (threads with no messages) in the thread list alongside threads with messages
- **FR-016**: System should load threads and conversation history without explicit loading indicators (content appears when ready)

### Key Entities *(include if feature involves data)*

- **Thread Metadata**: Represents summary information about a conversation thread, including unique identifier (sessionId/threadId), last message preview, last activity timestamp, message count, and optional thread title/topic
- **Thread List**: Collection of thread metadata entries for a specific user, sorted by recency
- **Conversation History**: Complete sequence of messages within a specific thread, maintained when resuming threads

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view their list of conversation threads within 2 seconds of completing user setup
- **SC-002**: Users can successfully resume any existing conversation thread and see the complete history (all messages) within 1 second of selection
- **SC-003**: 95% of thread resume operations successfully maintain conversation context (verified by memory/context references working correctly)
- **SC-004**: Users can start a new conversation from the thread list in under 3 clicks
- **SC-005**: Thread list correctly displays and sorts up to 100 conversation threads without performance degradation
- **SC-006**: Users can distinguish between threads at a glance based on preview information (measured by task completion rate in usability testing)
- **SC-007**: Error states (thread not found, load failure) are presented clearly with actionable recovery options, resulting in 90% successful error recovery rate

## Assumptions

- Backend API endpoints for fetching thread list and thread history will be created as part of this feature (or exist already via LangGraph checkpoints)
- The existing sessionId maps directly to LangGraph's threadId concept and can be used to identify threads
- Thread metadata can be derived from LangGraph checkpoint data in PostgreSQL (`LangGraphCheckpoint` table)
- The current `userId` authentication mechanism is sufficient for thread ownership and access control
- Threads do not require explicit "deletion" functionality in this phase (can be added later)
- Thread title is derived from the first user message (first 50 characters); empty threads show a default label
- Relative timestamps are sufficient (no timezone handling required for initial version)
- Preview length defaults to 100 characters unless clarified otherwise
- Pagination/infinite scroll for large thread lists is deferred to future enhancement
- Multi-device synchronization requires manual page reload; no real-time sync in this phase
- Complete conversation history is always loaded when resuming a thread (no message limit or pagination)

## Technical Context

**Terminology Clarification**:
- **sessionId vs threadId**: In this implementation, `sessionId` (used in frontend/API) and `thread_id` (used by LangGraph) are the **same identifier**. They map 1:1 - when a user creates a session, that sessionId becomes the LangGraph thread_id. Throughout this document, "thread" and "session" refer to the same concept: a persistent conversation context.

The implementation should build upon:
- Existing `useChatSession` hook for session management
- Current `userId` validation and authentication flow
- LangGraph checkpoint persistence in PostgreSQL (`LangGraphCheckpoint` table with `threadId`, `metadata`, `createdAt`, `updatedAt`)
- Existing chat API at `/api/chat` and session API at `/api/session`
- Current React/TypeScript frontend architecture in `apps/client`

Backend requirements:
- New API endpoint to list threads for a user: `GET /api/threads?userId={userId}`
- New API endpoint to fetch thread history: `GET /api/threads/{threadId}/messages`
- Ability to query LangGraph checkpoints by userId and extract thread metadata
