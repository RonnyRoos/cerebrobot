# ADR 007: Multi-Agent Support Before Memory Persistence

## Status
Accepted

## Context

The original Cerebrobot roadmap (see `docs/mission.md`) defines a phased approach:

- **Phase 1**: Conversational Core (single agent, custom prompt)
- **Phase 2**: Memory Persistence & Manipulation
- **Phase 3**: Public API Surface
- **Phase 4**: Interactive Frontend
- **Phase 5**: Advanced Capabilities (multi-agent coordination, configurable personas)

Feature 004-agent-definition-we implements **multi-agent configuration support** (Phase 5 scope) before completing Phase 2 (memory persistence). This deviates from the planned sequence.

## Decision

We will implement multi-agent configuration as **Phase 1.5**, positioned between Phase 1 and Phase 2.

### Rationale

1. **Foundation for Phase 2**: Agent configuration is foundational infrastructure needed for Phase 2 memory work. Memory persistence must be agent-aware to support proper context isolation.

2. **Thread-Agent Association Required**: Multi-user deployments (future) require thread-to-agent association to prevent memory leakage between different agent personalities. Implementing this now creates the right data model.

3. **Testing Validation**: Having multiple agent configurations allows better testing of memory features in Phase 2. We can validate that memory retrieval works correctly across different agent contexts.

4. **Parallel Development**: Agent configuration work can proceed independently while planning Phase 2 memory architecture. The thread metadata model provides the join point.

5. **Operator Value**: Single-operator deployments benefit from multiple agent personalities (e.g., technical advisor vs. casual chat) even before memory persistence.

### Implementation Approach

- **Agent metadata storage**: New `Thread` model in Prisma schema stores `agentId` association
- **Lazy loading**: AgentFactory loads agent configs on-demand, not at startup
- **Backward compatibility**: Falls back to `.env` configuration when no JSON configs exist
- **Fail-fast validation**: All agent configs validated via Zod schemas, invalid configs prevent startup

## Consequences

### Positive

- ✅ Agent framework ready for Phase 2 memory features
- ✅ Thread metadata includes agent context from day one
- ✅ Can test memory persistence with different agent configurations
- ✅ Enables parallel development tracks
- ✅ Operator can experiment with multiple personalities immediately

### Negative

- ⚠️ Cannot validate agent+memory interaction until Phase 2
- ⚠️ Adds complexity before core memory features proven
- ⚠️ Requires careful integration testing in Phase 2
- ⚠️ Deviates from linear phase progression

### Mitigation Strategy

Phase 2 implementation will include comprehensive validation:

1. **Memory persistence per agent**: Verify that memories are stored with agent context
2. **Agent-specific retrieval**: Validate memory queries filter by agent when appropriate
3. **Cross-agent isolation**: Ensure agent A cannot access agent B's private context
4. **Migration testing**: Verify existing threads can be associated with agents retroactively

## Validation Commitments

The following must be validated during Phase 2:

- [ ] Memory persistence includes agent context
- [ ] Memory retrieval works correctly for each agent
- [ ] Switching agents in UI properly isolates memory contexts
- [ ] .env fallback agent receives same memory treatment as JSON-configured agents
- [ ] Thread-agent associations persist correctly across restarts

## References

- Original roadmap: `docs/mission.md` (Phases 1-5)
- Feature spec: `specs/004-agent-definition-we/spec.md`
- Thread model: `prisma/schema.prisma` (Thread table with agentId foreign key)
- Agent configuration: `apps/server/src/config/agent-config.ts`

## Alternatives Considered

### Alternative 1: Wait for Phase 2 completion
**Rejected** because memory persistence design requires knowing agent structure upfront. Building Phase 2 without agent awareness would require refactoring later.

### Alternative 2: Single agent with switchable configs
**Rejected** because this doesn't solve the thread-agent association problem. Threads need stable agent identity for memory isolation.

### Alternative 3: Agent as Phase 2 feature
**Rejected** because agent configuration is simpler than memory persistence and provides independent value. Combining them would make Phase 2 too large.

## Decision Date
October 10, 2025

## Last Updated
October 10, 2025
