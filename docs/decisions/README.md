# Cerebrobot Decision Records

This directory contains various types of decision documentation for the Cerebrobot project.

## Directory Structure

### 📐 ADR (Architecture Decision Records)
**Location**: `adr/`  
**Purpose**: Documents major architectural decisions that have lasting structural impact on the codebase.

These decisions:
- Affect the system's fundamental structure
- Constrain future technical choices
- Involve meaningful trade-offs with no obviously "correct" answer
- Impact multiple stakeholders (developers, users, operators)

**Current ADRs**:
- [ADR 005: Thread Terminology Standardization](./adr/005-thread-terminology.md) - Align with LangGraph conventions
- [ADR 006: Complete Thread Terminology Alignment](./adr/006-thread-terminology-complete.md) - Frontend terminology completion

### ⚙️ TDR (Technical Decision Records)
**Location**: `tdr/`  
**Purpose**: Documents smaller tactical technical choices and implementation strategies.

These decisions:
- Affect implementation approach but not overall architecture
- Can be reversed with moderate effort
- Are important enough to justify in writing
- Help explain "why we did it this way"

**Current TDRs**:
- [TDR 004: Testing Strategy - Deferred Approach](./tdr/004-testing-strategy-deferred.md) - When and how to add test coverage

### 🚨 Incident Reports
**Location**: `incidents/`  
**Purpose**: Documents problems encountered, their root causes, and solutions implemented.

These reports:
- Capture lessons learned from production/development issues
- Document debugging process and resolution
- Help prevent similar issues in the future
- Serve as institutional knowledge

**Current Incidents**:
- [Incident 007: Test Database Cleanup Data Loss](./incidents/007-test-cleanup-data-loss.md) - Tests deleting production data

## When to Create Each Type

### Create an ADR when:
- Making a choice that affects system architecture
- Standardizing patterns across the codebase
- Making API contract changes
- Choosing between frameworks or major libraries
- Establishing system-wide conventions

### Create a TDR when:
- Choosing implementation strategies
- Deferring work with clear rationale
- Selecting tools or libraries for specific features
- Establishing coding patterns or practices
- Making tactical trade-offs

### Create an Incident Report when:
- Fixing a bug with broader implications
- Resolving a data loss or corruption issue
- Learning from a production incident
- Discovering and fixing unsafe patterns
- Documenting breaking changes to workflow

## Document Format

All decision documents should include:

1. **Title** - Clear, descriptive name
2. **Status** - Accepted, Superseded, Deprecated, Amended
3. **Date** - When the decision was made
4. **Context** - What problem or situation led to this decision
5. **Decision** - What was decided and why
6. **Consequences** - Positive, negative, and neutral outcomes
7. **Alternatives Considered** - What other options were evaluated
8. **References** - Links to related documents, code, or discussions

## Cross-References

Documents reference each other when there are dependencies:
- ADRs may reference earlier ADRs (e.g., ADR 006 extends ADR 005)
- TDRs may reference ADRs that constrain implementation choices
- Incident Reports may reference ADRs/TDRs that need updating

## Historical Note

This structure was established in October 2025 to better categorize decision documentation. Previously, all documents were in a single `docs/adr/` directory. Files were reorganized to improve clarity and discoverability while preserving git history.

---

**Related Documentation**:
- [Engineering Best Practices](../best-practices.md) - When to document deviations
- [Code Style Guide](../code-style.md) - How to reference decisions in code
- [AGENTS.md](../../AGENTS.md) - Project working cadence and guidelines
