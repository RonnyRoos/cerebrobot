# Feature Specification: Dynamic Agent Configuration

**Feature Branch**: `004-agen- **FR- **FR-010**: System MUST separate infrastructure configuration (database URLs, ports) from agent personality configuration (prompts, model settings)
- **FR-011**: System MUST provide a complete template agent configuration file with all required fields populated with example values
- **FR-012**: System MUST log which agent configuration is loaded during startup for operational transparency9**: System MUST separate infrastructure configuration (database URLs, ports) from agent personality configuration (prompts, model settings)
- **FR-010**: System MUST provide a template or example agent configuration file to help operators create new agent profiles
- **FR-011**: System MUST log which agent configuration is loaded during startup for operational transparencyefinition-we`  
**Created**: October 9, 2025  
**Status**: Draft  
**Input**: User description: "Agent definition. We want to move all the variables that make up the personality of the bot into a json document structure that we dynamically load during runtime instead of the .env-file approach we have at the moment. The json document-folder is NOT to be committed to git. Find a suitable location for it as it will contain secrets. I think all LANGGRAPH, LANGCHAIN, LANGMEM, DEEPINFRA variables should be moved to allow for a COMPLETE specification for the agent using the json document. We should also give the agent a unique identifier and a name retained in the structure."

## Clarifications

### Session 2025-10-09

- Q: Which identifier format should agent configurations use? → A: UUID v4 (guarantees global uniqueness, generated automatically)
- Q: How should operators specify the agent configuration file path? → A: UI-based selection - frontend calls backend API that lists all available agent configurations
- Q: What should happen when agent configuration validation fails? → A: Hard fail - server refuses to start, exits with error code and detailed message
- Q: What file permissions should be enforced on agent configuration files? → A: No enforcement - system loads any readable file, permissions are operator responsibility
- Q: Which configuration fields should be required (server fails if missing)? → A: All fields required - no defaults, operator must specify every value
- Q: Should the system support multiple bots running simultaneously or just switching between configurations? → A: Multiple bots can be added and available, operator selects which one to use per conversation/session

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agent Configuration Loading (Priority: P1)

Operators need to start the Cerebrobot server with agent configuration loaded from a JSON file instead of environment variables, allowing the bot to use a complete personality definition including model settings, prompts, and memory parameters.

**Why this priority**: Core functionality that enables all other agent configuration capabilities. Without this, no JSON-based configuration can work.

**Independent Test**: Can be fully tested by starting the server with a valid agent JSON file and verifying the agent responds using the configured personality, model, and memory settings.

**Acceptance Scenarios**:

1. **Given** a valid agent configuration JSON file exists, **When** the server starts, **Then** the agent loads with the specified personality, model, and memory settings
2. **Given** the agent configuration file is missing, **When** the server starts, **Then** the system provides a clear error message indicating the configuration file path expected
3. **Given** the agent configuration file contains invalid JSON, **When** the server starts, **Then** the system provides a clear error message with validation details

---

### User Story 2 - Multiple Agent Profiles (Priority: P2)

Operators need to switch between different agent personalities (e.g., professional assistant vs. casual chatbot) by specifying different configuration files, allowing flexible agent behavior without code changes.

**Why this priority**: Enables reusability and experimentation with different agent configurations. Valuable but not critical for initial deployment.

**Independent Test**: Can be tested by creating two agent JSON files with different personalities and verifying the server loads the correct personality based on the specified configuration file.

**Acceptance Scenarios**:

1. **Given** multiple agent configuration files exist, **When** the operator views the agent selection UI, **Then** all available agent profiles are listed with their names
2. **Given** the operator selects an agent from the UI, **When** a new conversation starts, **Then** the system uses the selected agent's personality and settings (selection applies per session; cannot switch agents mid-conversation)

---

### User Story 3 - Secure Configuration Storage (Priority: P1)

Operators need agent configuration files (containing API keys and secrets) stored outside version control to prevent accidental exposure of sensitive credentials.

**Why this priority**: Security-critical requirement. Exposing API keys could lead to unauthorized access and service abuse.

**Independent Test**: Can be verified by checking that the configuration directory is properly excluded from git and that secrets within the JSON are not committed to the repository.

**Acceptance Scenarios**:

1. **Given** the agent configuration directory is created, **When** git status is checked, **Then** the configuration directory does not appear in tracked or staged files
2. **Given** a configuration file contains API keys, **When** the repository is committed, **Then** no secrets are present in the commit history
3. **Given** the configuration directory doesn't exist, **When** the server attempts to start, **Then** a clear error message guides the operator to create the required directory and file

---

### Edge Cases

- What happens when a JSON file is modified while the server is running? (New version discoverable on next GET /api/agents call; active threads continue using previously loaded config)
- How does the system handle partial or incomplete configuration JSON? (Hard fail at both listing (500) and thread creation (400) with detailed validation errors)
- What happens when the specified configuration file path doesn't exist? (Hard fail at thread creation with clear 404 error message)
- How does the system handle configuration files with extra/unknown fields? (Should ignore unknown fields to allow for future extensions; unknown fields not included in TypeScript types via strict mode)
- What happens if required environment variables (like DATABASE_URL) conflict with JSON configuration values? (Environment variables take precedence for infrastructure settings, JSON controls agent behavior)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST load agent configuration from a JSON file at runtime instead of environment variables for all agent personality and behavior settings
- **FR-002**: System MUST support all current LANGGRAPH, LANGCHAIN, LANGMEM, and DEEPINFRA configuration variables in the JSON structure
- **FR-003**: System MUST assign each agent configuration a unique identifier and human-readable name
- **FR-004**: System MUST store agent configuration files in a directory excluded from version control (git-ignored)
- **FR-005**: System MUST validate agent configuration when selected for a thread and refuse to create thread if validation fails, returning a 400 error with detailed error message
- **FR-006**: System MUST require all configuration fields (no defaults) - validation fails if any field is missing or invalid (applies to JSON configs; .env fallback uses existing .env validation rules)
- **FR-007**: System MUST provide a backend API endpoint that lists all available agent configurations for UI selection
- **FR-008**: System MUST allow operators to select which agent configuration to use via the frontend UI
- **FR-009**: System MUST maintain backward compatibility by supporting a fallback to environment variables if no JSON configuration is specified (fallback requires same .env validation; incomplete vars exit with error)
- **FR-010**: System MUST separate infrastructure configuration (database URLs, ports) from agent personality configuration (prompts, model settings)
- **FR-011**: System MUST provide a template or example agent configuration file to help operators create new agent profiles
- **FR-012**: System MUST validate all agent configurations when listing (GET /api/agents) and return 500 error with detailed validation failures if any config is invalid (fail-fast at both listing and thread creation)

### Non-Functional Requirements

- **NFR-001**: System MUST respond to GET /api/agents within 100ms (P95) for listing operations

### Non-Functional Requirements

- **NFR-001**: System MUST respond to GET /api/agents within 100ms (P95) for listing operations

### Key Entities *(include if feature involves data)*

- **Agent Configuration**: Complete specification of an agent's personality and behavior, including:
  - Unique identifier (UUID v4 format, auto-generated)
  - Human-readable name
  - System prompt and persona tag
  - LLM model name and temperature setting
  - Memory configuration (hot path limits, token budgets, similarity thresholds)
  - API credentials and endpoints (DeepInfra key, embedding model)
  - Memory injection and retrieval settings

- **Configuration Storage Location**: Secure directory structure for agent JSON files:
  - Default location recommendation (e.g., `./config/agents/` or user home directory)
  - Git-ignored to prevent credential exposure
  - Readable file naming convention (e.g., `{agent-name}.json`)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can start the server with a JSON-based agent configuration in under 30 seconds (including file creation from template)
- **SC-002**: System prevents 100% of accidental git commits containing agent configuration files through proper .gitignore configuration
- **SC-003**: Operators can switch between different agent personalities by selecting from a UI list populated by the backend API
- **SC-004**: Configuration validation catches and reports 100% of missing required fields when listing agents (GET /api/agents) or creating threads
- **SC-005**: API error responses clearly indicate validation failures with file and field details (fail-fast feedback)
- **SC-006**: Zero production incidents related to hardcoded credentials within the first 3 months of deployment

## Assumptions *(optional)*

- Operators have filesystem access to create and manage JSON configuration files
- Single-operator deployment model (Phase 1 scope) - multi-tenant configuration management deferred to future phases
- New agent configurations discoverable immediately via GET /api/agents (no server restart required)
- Infrastructure settings (DATABASE_URL, POSTGRES_* variables) remain in .env file as they're deployment-specific, not agent-specific
- Standard JSON format without encryption (file-system security is sufficient for hobby deployments)
- Backend API discovers available agents by scanning the configuration directory on each GET /api/agents request
- File permissions on configuration files are the operator's responsibility; system attempts to load any readable JSON file
- All configuration fields are required with no defaults; template file provides example values for all fields
- ALL configurations must be valid for GET /api/agents to succeed (fail-fast validation at listing time); invalid configs cause 500 error with details

## Dependencies *(optional)*

- Existing .env validation and loading mechanism (to maintain for infrastructure settings)
- Current LangGraph agent initialization code (needs refactoring to accept JSON-based config)
- Git ignore configuration (must be updated to exclude agent configuration directory)

## Out of Scope *(optional)*

- Web-based UI for editing agent configurations (future enhancement)
- Automatic hot-reloading via file watchers (manual refresh of GET /api/agents achieves same result)
- Configuration encryption at rest
- Multi-agent orchestration or simultaneous agent profiles
- Configuration versioning or rollback mechanisms
- Cloud-based configuration storage (e.g., AWS Secrets Manager)
- Configuration validation API separate from server startup
