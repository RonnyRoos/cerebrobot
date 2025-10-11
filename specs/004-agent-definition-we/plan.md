# Implementation Plan: Dynamic Agent Configuration

**Branch**: `004-agent-definition-we` | **Date**: October 10, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-agent-definition-we/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Move all agent personality configuration (LANGGRAPH, LANGCHAIN, LANGMEM, DEEPINFRA variables) from `.env` to JSON files stored in a git-ignored directory. The system will load agent configurations dynamically at runtime, validate all required fields on startup (hard fail if invalid), and provide a backend API endpoint for the frontend to list and select available agent profiles. Each agent configuration receives a UUID v4 identifier and human-readable name. Infrastructure settings (database URLs, ports) remain in `.env` to maintain separation between deployment and agent personality concerns.

## Technical Context

**Language/Version**: TypeScript 5.5+, Node.js ≥20  
**Primary Dependencies**: Fastify 5.6.1, @langchain/langgraph 0.4.9, langchain 0.3.34, Zod 4.1.11  
**Storage**: Filesystem (JSON files in git-ignored directory `./config/agents/`), Postgres via Prisma (for existing LangGraph checkpointing - not used for agent configs)  
**Testing**: Vitest (existing test framework), unit tests for config validation and loading  
**Target Platform**: Docker Compose deployment (Linux server, single-operator hobby project)  
**Project Type**: Web application (Fastify backend + React frontend)  
**Performance Goals**: Config validation < 50ms per API request (lazy loading, no startup overhead), API endpoint response < 100ms  
**Constraints**: Hard fail on invalid config (500 at listing, 400 at thread creation), all fields required (no defaults), backward compatibility with .env fallback  
**Scale/Scope**: Single operator, 1-10 agent configurations expected, file-based discovery (no database storage of configs)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- ✅ **Hygiene-First Development**: Will run `pnpm lint → pnpm format:write → pnpm test` after each change
- ✅ **Transparency & Inspectability**: Config loading logs clearly, validation errors actionable, API exposes available configs
- ✅ **Type Safety & Testability**: Zod schemas for validation, dependency injection for config loading, unit tests for validation logic
- ✅ **Incremental & Modular Development**: P1 stories (config loading, secure storage) deliver MVP; P2 (multiple profiles via UI) extends value
- ✅ **Stack Discipline**: Uses approved stack (Fastify, Zod, Node.js ≥20), no new dependencies required
- ✅ **Configuration Over Hardcoding**: Agent configs in JSON files, infrastructure in .env, swappable at runtime
- ✅ **Operator-Centric Design**: Single-operator model, Docker Compose deployment, file-based config (no complex setup)

**Gate Status**: ✅ **PASS** - No constitution violations. Feature aligns with all core principles.

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
apps/
├── server/
│   └── src/
│       ├── config/
│       │   ├── agent-config.ts       # Zod schema for agent configuration
│       │   ├── agent-loader.ts       # Load & validate JSON configs
│       │   └── agent-loader.test.ts  # Unit tests for loading/validation
│       ├── agent/
│       │   └── [existing agent code - refactored to accept config object]
│       └── api/
│           └── routes/
│               └── agents.ts         # GET /api/agents endpoint
├── client/
│   └── src/
│       └── components/
│           └── AgentSelector.tsx     # UI component for selecting agents

config/
└── agents/                            # Git-ignored directory
    ├── .gitkeep                       # Track directory structure
    ├── template.json                  # Example with all required fields
    └── [operator-created configs]     # e.g., flirty-assistant.json

.gitignore                             # Add config/agents/* (except .gitkeep and template.json)
```

**Structure Decision**: Web application structure selected. Backend (apps/server) handles config loading, validation, and API. Frontend (apps/client) provides UI for agent selection. Config directory at repo root for easy operator access, git-ignored to protect secrets.

## Complexity Tracking

*This section is empty - no constitution violations to justify.*

**No violations detected**: Feature uses existing tech stack, standard patterns, and aligns with operator-centric design principles.
