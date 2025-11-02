# Feature Specification: Agent Management UI

**Feature Branch**: `011-agent-crud-ui`  
**Created**: 2025-10-31  
**Status**: Draft  
**Input**: Build a UI to CRUD agents using the same definition structure as config/agents, storing them as JSON documents in the database with schema validation

## Executive Summary

Enable operators to manage agent configurations through a web interface, replacing filesystem-based JSON editing with database-backed CRUD operations while preserving the existing agent definition schema.

## Clarifications

### Session 2025-10-31

- Q: How should the UI handle displaying and editing sensitive API keys in agent configurations? → A: Display API keys in plain text (readable in form fields)
- Q: When an agent is deleted along with its conversations, should the associated LangGraph checkpoint data also be deleted? → A: Yes, cascade delete all checkpoint data for deleted conversations
- Q: Should the system support concurrent edits from multiple operators or enforce single-operator usage? → A: Single operator only (one browser session at a time, no concurrent edit conflict resolution)
- Q: What ID format should be used for agents? → A: Auto-generate UUIDs always (KISS approach)
- Q: How should the system handle migration from filesystem configs to database? → A: No migration - operators manually recreate agents in UI

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View All Agents (Priority: P1)

Operators need to see all available agent configurations at a glance to understand what agents exist in their system and select one to work with.

**Why this priority**: Core foundation - without viewing agents, no other operations are possible. Provides immediate value by surfacing what was previously hidden in the filesystem.

**Independent Test**: Can be fully tested by loading the UI and verifying the agent list displays all agents from the database with key metadata (name, ID, model, autonomy status).

**Acceptance Scenarios**:

1. **Given** multiple agents exist in the database, **When** operator opens the agent management UI, **Then** all agents are displayed in a list with name, ID, and active status visible
2. **Given** no agents exist, **When** operator opens the agent management UI, **Then** an empty state is shown with a prompt to create the first agent
3. **Given** agents have different autonomy settings, **When** viewing the agent list, **Then** autonomy status (enabled/disabled) is clearly indicated for each agent

---

### User Story 2 - Create New Agent (Priority: P2)

Operators need to create new agent configurations without manually editing JSON files or touching the filesystem.

**Why this priority**: Primary value proposition - enables self-service agent creation, replacing manual file editing. Unlocks experimentation without deployment friction.

**Independent Test**: Can be tested by clicking "Create Agent", filling the form with valid data, submitting, and verifying the new agent appears in the list and can be used for conversations.

**Acceptance Scenarios**:

1. **Given** operator is viewing the agent list, **When** they click "Create Agent", **Then** a form is presented with all required fields (name, system prompt, model, memory settings, autonomy settings)
2. **Given** operator fills all required fields with valid data, **When** they submit the form, **Then** the agent is saved to the database and appears in the agent list
3. **Given** operator provides invalid configuration, **When** they attempt to submit, **Then** validation errors are shown inline with clear guidance on what needs fixing
4. **Given** a new agent is created, **When** operator starts a conversation with that agent, **Then** the agent behaves according to its configuration

---

### User Story 3 - Edit Existing Agent (Priority: P3)

Operators need to modify agent configurations to tune behavior, update prompts, or adjust memory/autonomy settings without recreating the agent.

**Why this priority**: Enables iterative improvement and configuration tuning. Less critical than creation since agents can be deleted and recreated, but significantly improves workflow.

**Independent Test**: Can be tested by selecting an existing agent, modifying its configuration (e.g., changing system prompt), saving, and verifying the changes persist and affect behavior.

**Acceptance Scenarios**:

1. **Given** operator selects an agent from the list, **When** they click "Edit", **Then** a form is pre-populated with the agent's current configuration
2. **Given** operator modifies any configuration field, **When** they save changes, **Then** the updated configuration is persisted and immediately available for new conversations
3. **Given** operator edits an agent that has active conversations, **When** they save changes, **Then** existing conversations continue with old config while new conversations use updated config
4. **Given** operator provides invalid configuration during edit, **When** they attempt to save, **Then** validation prevents save and shows clear error messages

---

### User Story 4 - Delete Agent (Priority: P4)

Operators need to remove agent configurations they no longer use to keep the system organized and prevent accidental usage.

**Why this priority**: Important for housekeeping but not critical for initial value delivery. Can be deferred if needed since unused agents simply remain in the list.

**Independent Test**: Can be tested by deleting an agent, verifying it disappears from the list, and confirming it cannot be selected for new conversations.

**Acceptance Scenarios**:

1. **Given** operator selects an agent from the list, **When** they click "Delete" and confirm, **Then** the agent is removed from the database and no longer appears in the list
2. **Given** operator attempts to delete an agent, **When** they are prompted for confirmation, **Then** a clear warning is shown about the consequences (cannot be undone, all conversations with this agent will be deleted)
3. **Given** an agent has active conversations, **When** operator deletes it, **Then** the agent and all associated conversations are deleted from the database (cascade delete)

---

### User Story 5 - Validate Configuration Before Save (Priority: P2)

Operators need immediate feedback when their configuration is invalid to prevent saving broken agents and ensure all agents in the database are valid.

**Why this priority**: Critical for data integrity and user experience. Prevents frustration of creating broken agents and debugging why they don't work.

**Independent Test**: Can be tested by attempting to save agents with various invalid configurations (missing required fields, invalid JSON structures, out-of-range values) and verifying appropriate error messages appear.

**Acceptance Scenarios**:

1. **Given** operator provides invalid LLM configuration (e.g., missing model name), **When** they attempt to save, **Then** a clear error message explains the LLM model is required
2. **Given** operator provides invalid memory configuration (e.g., negative token budget), **When** they attempt to save, **Then** validation rejects the value with a specific error message
3. **Given** operator provides valid configuration, **When** they save, **Then** no validation errors are shown and save completes successfully
4. **Given** operator copies configuration from template.json, **When** they paste into the UI, **Then** all fields are parsed correctly and validation passes

---

### Edge Cases

- What happens if database connection is lost while saving an agent?
- What happens if an operator tries to create an agent with a duplicate ID?
- What happens if schema validation rules change in a future version?
- What happens if operator opens multiple browser tabs and edits same agent?
- How does system differentiate between filesystem-loaded and database-stored agents?

## Requirements *(mandatory)*

### Functional Requirements

#### Agent Display & Discovery

- **FR-001**: System MUST display all agents from the database in a list view
- **FR-002**: Agent list MUST show agent name, ID, LLM model, autonomy status, and timestamps (created, updated) for each agent
- **FR-003**: System MUST show an empty state when no agents exist with clear call-to-action to create first agent
- **FR-004**: System MUST allow operators to select an agent from the list to edit (Edit button serves as detail view entry point)

#### Agent Creation

- **FR-005**: System MUST provide a form to create new agents with all configuration fields from the agent schema
- **FR-006**: Form MUST include sections for: basic info (name, personaTag), system prompt, LLM settings, memory configuration, and autonomy settings
- **FR-007**: System MUST validate agent configuration against the schema before saving
- **FR-008**: System MUST auto-generate UUID for new agent ID (ID not editable by operator)
- **FR-009**: System MUST prevent creation of agents with duplicate IDs (Note: UUID v4 collision probability is ~1 in 5.3×10³⁶, making duplicates statistically impossible without explicit validation)
- **FR-010**: System MUST save new agent configuration as JSON document in database
- **FR-010a**: Form MUST display API keys (LLM apiKey, embedding apiKey) in plain text input fields

#### Agent Editing

- **FR-011**: System MUST allow operators to edit existing agent configurations
- **FR-012**: Edit form MUST pre-populate with current agent configuration
- **FR-012a**: Edit form MUST display existing API keys in plain text (not masked)
- **FR-013**: System MUST validate edited configuration against schema before saving
- **FR-014**: System MUST persist configuration changes to database
- **FR-015**: Updated agent configuration MUST be used for new conversations immediately after save

#### Agent Deletion

- **FR-016**: System MUST allow operators to delete agent configurations
- **FR-017**: System MUST prompt for confirmation before deleting an agent
- **FR-018**: Deletion confirmation MUST warn that all conversations with this agent will also be deleted (cascade delete)
- **FR-019**: System MUST remove deleted agent and all associated conversations from database (cascade delete)
- **FR-019a**: System MUST cascade delete all LangGraph checkpoint data (LangGraphCheckpoint and LangGraphCheckpointWrite records) associated with deleted conversations

#### Schema Validation

- **FR-020**: System MUST validate all agent configurations against the AgentConfigSchema (Zod) defined in packages/chat-shared/src/schemas/agent.ts (based on config/agents/template.json structure)
- **FR-021**: Validation MUST check required fields: id, name, systemPrompt, personaTag, llm (model, temperature, apiKey, apiBase)
- **FR-022**: Validation MUST check memory configuration: hotPathLimit, hotPathTokenBudget, embeddingModel, embeddingEndpoint, apiKey
- **FR-023**: Validation MUST check autonomy configuration when enabled: evaluator settings, limits, memoryContext
- **FR-023**: Validation MUST check autonomy configuration when enabled: evaluator settings, limits, memoryContext
- **FR-024**: System MUST display specific, actionable error messages for validation failures
- **FR-025**: System MUST prevent saving invalid agent configurations

#### Data Migration

- **FR-026**: System MUST provide empty state guidance for operators to manually recreate agents in the database (one-time migration from filesystem to database as single source of truth)
- **FR-027**: After migration, all agent configurations MUST be managed exclusively through the database (filesystem config/agents directory deprecated for agent definitions)

### Key Entities *(include if feature involves data)*

- **Agent Configuration**: Represents a complete agent definition including identity (id, name, personaTag), behavior (systemPrompt), LLM settings (model, temperature, API endpoints), memory configuration (hot-path limits, embedding settings, retrieval parameters), and autonomy settings (enabled flag, evaluator config, follow-up limits). Stored as JSON document in database with schema validation.

- **Agent Schema**: Defines the structure and validation rules for agent configurations. Based on existing template.json structure with required/optional field definitions and value constraints.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can view all existing agents in the UI within 2 seconds of loading the page
- **SC-002**: Operators can create a new functional agent through the UI in under 3 minutes (including filling all required fields)
- **SC-003**: Client-side debounced configuration validation provides specific error messages within 500ms of last keystroke
- **SC-004**: 100% of agents saved through the UI pass schema validation and work correctly in conversations
- **SC-005**: Operators can edit and save agent configuration changes that take effect for new conversations within 1 second
- **SC-006**: Database is single source of truth for all agent configurations (filesystem configs no longer used)
- **SC-007**: 90% reduction in time to create/modify agents compared to manual JSON file editing

## Assumptions

- Single operator deployment with one active browser session at a time (no concurrent edit conflict resolution needed in Phase 1)
- Operator has basic understanding of LLM concepts (models, temperature, prompts)
- All agents stored in database will use the same schema version (no multi-version schema support needed initially)
- Database is the single source of truth for agent configurations (filesystem configs deprecated after migration)
- Operators willing to manually recreate existing filesystem agents in the UI once (one-time manual migration)
- Agent configurations are relatively small (<100KB each) and don't require pagination for agent list
- Default values from template.json can be used to pre-populate form fields for better UX during manual migration
- Agent deletion is permanent with cascade delete of all associated conversations
- Operators understand that deleting an agent removes all conversation history with that agent

## Out of Scope

The following are explicitly excluded from this feature:

- **Agent versioning**: No history or rollback of configuration changes (Phase 1)
- **Multi-operator collaboration**: No concurrent edit detection, locking, or merge conflict resolution
- **Agent templates/presets**: Beyond the single template.json reference, no library of pre-built agent configurations
- **Agent testing/preview**: No built-in way to test agent configuration before deploying to production
- **Import/export**: Beyond initial migration, no bulk import/export of agent configs (can be added later)
- **Permission management**: No role-based access control for who can edit which agents
- **Audit logging**: No tracking of who changed what configuration when (can be added in Phase 2)
- **Agent marketplace**: No sharing or discovering agents from other operators/community
- **Advanced validation**: No runtime validation of API keys, model availability, or endpoint reachability (only schema validation)

## Dependencies

### Technical Dependencies

- PostgreSQL database with JSON/JSONB support for storing agent configurations
- Existing agent schema defined in config/agents/template.json
- Frontend framework (React-based from apps/client) for UI implementation
- Backend API endpoints (Fastify-based from apps/server) for CRUD operations
- Schema validation library (Zod already in use) for runtime validation

### Upstream Dependencies

- Spec 010 (Memory Brain UI) - shares the same client app structure and may inform UI patterns
- Thread model (Thread table in schema.prisma) - agents are referenced by agentId in threads
- Agent loading mechanism (current filesystem-based loader) - needs to support database-backed agents

### Migration Considerations

- No automated migration from filesystem to database (operators manually recreate agents once)
- After manual migration complete, filesystem config/agents directory no longer used for agent definitions
- Database becomes single source of truth for all agent configurations going forward

## Open Questions Requiring Clarification

*All open questions have been resolved through the clarification session on 2025-10-31.*

---

**Note**: This specification focuses on WHAT the agent management UI should do and WHY it's valuable, without prescribing HOW to implement it technically. Implementation details (database schema, API design, UI components) will be covered in the planning phase.
