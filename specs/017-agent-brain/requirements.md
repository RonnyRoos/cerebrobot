# Requirements Checklist: Agent Brain Activity Transparency

**Purpose**: Validate that the spec.md covers all critical aspects of the feature implementation
**Created**: 2025-01-12
**Feature**: [spec.md](./spec.md)

## User Stories & Testing

- [x] CHK001 P1 user story (Observe Agent Tool Calls) is independently testable and delivers standalone value
- [x] CHK002 P2 user story (Monitor Memory Operations) is independently testable and delivers standalone value
- [x] CHK003 P3 user story (Track Autonomy Decisions) is independently testable and delivers standalone value
- [x] CHK004 P4 user story (Observe Context Pruning) is independently testable and delivers standalone value
- [x] CHK005 Each user story has clear acceptance scenarios in Given/When/Then format
- [x] CHK006 Edge cases cover failure scenarios (tool call fails, rapid events, closed UI, multi-agent, large payloads)
- [x] CHK007 Edge cases cover boundary conditions (query failures, WebSocket drops)

## Functional Requirements

### Data Capture
- [x] CHK008 FR-001: Tool call capture is specified (via ToolNode instrumentation, ONLY registered tools)
- [x] CHK009 FR-002: Memory search capture is specified (via retrieveMemories node)
- [x] CHK010 FR-003: Schedule timer capture is specified (via evaluateAutonomy node)
- [x] CHK011 FR-004: Context pruning capture is specified (via summarize node)
- [x] CHK012 FR-005: Event attributes are fully specified (timestamp, type, agentId, threadId, payload)
- [x] CHK013 FR-017: Tool tracking scope is explicit (ONLY tools from memoryTools array, currently: upsertMemory)

### Storage & Architecture
- [x] CHK013 FR-006: Effects pattern for emission is specified (nodes return effects, SessionProcessor persists)
- [x] CHK014 FR-007: Event source distinction is specified (USER|AGENT|SYSTEM enum)
- [x] CHK015 FR-016: Database migration for 'source' column is specified with Prisma schema

### API Requirements
- [x] CHK016 FR-008: GET endpoint is specified (`/api/agents/:agentId/threads/:threadId/activity`)
- [x] CHK017 FR-009: Pagination and filtering are specified (type, date range, limit, offset)
- [x] CHK018 FR-010: Parallel query strategy is specified (events + effects, in-memory merge, decorator pattern)

### UI Requirements
- [x] CHK019 FR-011: Component rename is specified (MemoryBrowser → AgentBrain with Activity tab)
- [x] CHK020 FR-012: Display order and visual distinction are specified (reverse chronological, event type icons)
- [x] CHK021 FR-013: Real-time streaming is specified (WebSocket pattern, brain_activity.created event)
- [x] CHK022 FR-014: Event detail expansion is specified (click to show full payload)
- [x] CHK023 FR-015: Access control is specified (agent-scoped, same as memories)

## Key Entities

- [x] CHK024 BrainActivityEvent entity is fully defined (attributes, sources, relationships)
- [x] CHK025 BrainActivityPayload types are fully defined for all 4 event types
- [x] CHK026 Entity sources are clear (Event table vs Effect table)
- [x] CHK027 Relationships to Thread and Agent are specified

## Success Criteria

### Performance
- [x] CHK028 SC-001: Real-time latency is measurable (<500ms)
- [x] CHK029 SC-002: Scale target is measurable (1000 events without degradation)
- [x] CHK030 SC-003: Query performance is measurable (90% under 200ms for 50-100 events)

### Quality
- [x] CHK031 SC-004: Data integrity is measurable (zero data loss)
- [x] CHK032 SC-005: UX clarity is measurable (4 event types visually distinguishable)
- [x] CHK033 SC-006: Filtering functionality is measurable (by type and date range)
- [x] CHK034 SC-007: Migration safety is measurable (no downtime)

## Architecture & Implementation

### Architectural Decisions
- [x] CHK035 Hybrid events+effects approach is justified with rationale and trade-offs
- [x] CHK036 Parallel queries strategy is justified with performance reasoning
- [x] CHK037 Effects pattern choice is justified with architectural consistency reasoning
- [x] CHK038 Infrastructure reuse is justified with complexity reduction reasoning
- [x] CHK039 Tool tracking scope is explicit (ONLY chatModel.bindTools registered tools, prevents unregistered tools)

### Database Changes
- [x] CHK040 Prisma schema change is complete (EventSource enum, source column, indexes)
- [x] CHK041 Migration impact is assessed (default value, existing code updates)
- [x] CHK042 Database indexes are specified for query optimization

### API Design
- [x] CHK043 Endpoint signature is complete (path, query params, response type)
- [x] CHK044 Implementation steps are clear (parallel queries, merge, filter, paginate, transform)
- [x] CHK045 WebSocket event structure is specified (brain_activity.created)
- [x] CHK046 Error handling patterns are implied (similar to memory routes)

### UI Design
- [x] CHK047 Component structure is clear (AgentBrain with Tabs)
- [x] CHK048 ActivityList requirements are complete (order, icons, expand, real-time, virtual scroll, filters)
- [x] CHK049 Reuse patterns are explicit (pagination, WebSocket, loading states from MemoryList)

### Graph Node Changes
- [x] CHK050 ToolNode instrumentation is specified with code example (ONLY registered tools tracked)
- [x] CHK051 retrieveMemories modification is specified with code example
- [x] CHK052 summarize modification is specified with code example
- [x] CHK053 evaluateAutonomy is noted as already compliant (no change needed)

### Timeline
- [x] CHK054 Week 1 tasks are clear (database, backend, effects emission)
- [x] CHK055 Week 2 tasks are clear (frontend, integration, testing)
- [x] CHK056 Timeline is realistic for 2-week implementation

### Testing
- [x] CHK057 Unit test scope is defined (decorator, queries, nodes, UI rendering)
- [x] CHK058 Integration test scope is defined (E2E, migration, pagination, WebSocket)
- [x] CHK059 Performance test scope is defined (query time, UI scrolling, parallel queries)

### Risk Management
- [x] CHK060 5 critical risks are identified with impact assessment
- [x] CHK061 Each risk has a concrete mitigation strategy
- [x] CHK062 Out-of-scope items are explicitly deferred (liveliness controls, analytics, export, visualization)

## Open Questions

- [x] CHK063 Event retention policy is addressed with proposed answer
- [x] CHK064 Payload size limits are addressed with proposed answer
- [x] CHK065 Real-time vs polling fallback is addressed with proposed answer
- [x] CHK066 Event deletion policy is addressed with proposed answer

## References

- [x] CHK067 Spec 008 (Events & Effects) is referenced
- [x] CHK068 Spec 009 (Server-Side Autonomy) is referenced
- [x] CHK069 LangGraph documentation is referenced
- [x] CHK070 Existing memory system files are referenced
- [x] CHK071 Conversation graph file is referenced
- [x] CHK072 Memory tools file is referenced (apps/server/src/agent/memory/tools.ts for upsertMemory)

## Quality Metrics

**Spec Completeness**: 72/72 items checked (100%)
**Independently Testable Stories**: 4/4 (100%)
**Measurable Success Criteria**: 7/7 (100%)
**Architectural Decisions Justified**: 5/5 (100%)
**Risks with Mitigations**: 5/5 (100%)

## Notes

✅ **Spec Quality Assessment**: EXCELLENT
- All mandatory sections (User Scenarios, Requirements, Success Criteria) are complete
- Architectural decisions are justified with clear rationale
- Implementation details are concrete with code examples
- Timeline is realistic and broken into incremental steps
- Risks are identified and mitigated
- References to existing specs and codebase are thorough
- **Tool tracking scope is explicit**: ONLY tracks tools registered via `chatModel.bindTools(memoryTools)`
- **Current registered tools**: `upsertMemory` (from apps/server/src/agent/memory/tools.ts)
- **Future-proof**: Automatic tracking when new tools are added to memoryTools array

✅ **Alignment with Project Constitution**:
- Reuses existing infrastructure (memory routes, WebSocket, Prisma) per "Simplest END solution" principle
- Follows Events & Effects architecture (Spec 008)
- Maintains Event Sourcing principles (nodes don't access EventStore)
- Respects agent-scoped access control (Spec 007)

✅ **Ready for Implementation**: YES
- Can begin Week 1 database migration immediately
- All API contracts are specified
- UI component structure is clear
- Graph node changes have code examples
- Tool tracking scope prevents unregistered tools from appearing
