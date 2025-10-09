# Incident Report 007: Test Database Cleanup Data Loss

## Status
**Resolved** (2025-10-08)

## Classification
Incident Report - Data Loss Prevention

## Context

During development, the user discovered that running tests via `pnpm test` was deleting all their conversation threads from the database. Investigation revealed that the `postgres-validation.test.ts` file had a `beforeEach` hook that wiped **ALL** checkpoints before each test:

```typescript
beforeEach(async () => {
  await prisma.langGraphCheckpointWrite.deleteMany(); // ❌ Deletes EVERYTHING
  await prisma.langGraphCheckpoint.deleteMany();      // ❌ Deletes EVERYTHING
});
```

This caused production/development data loss every time the hygiene loop (`pnpm lint → pnpm format → pnpm test`) ran.

## Problem

**Tests should never modify production or development data.** The original pattern:
- Wiped the entire database before each test
- Destroyed user's conversation threads
- Made it unsafe to run tests during development
- Violated the principle of test isolation

## Decision

**Implement test-specific cleanup patterns for all database tests:**

### 1. Track Test-Created Data
Tests that create database records must track their IDs and clean up only those records:

```typescript
// Track test thread IDs for cleanup
const testThreadIds: string[] = [];

afterEach(async () => {
  // Clean up only the threads created during this test
  if (testThreadIds.length > 0) {
    await prisma.langGraphCheckpointWrite.deleteMany({
      where: { threadId: { in: testThreadIds } },
    });
    await prisma.langGraphCheckpoint.deleteMany({
      where: { threadId: { in: testThreadIds } },
    });
    testThreadIds.length = 0;
  }
});
```

### 2. Use Test-Specific Prefixes
Test data should use identifiable prefixes to enable scoped cleanup:

```typescript
// Memory tests clean up only test namespaces
beforeEach(async () => {
  await realPrisma.$executeRaw`DELETE FROM memories WHERE namespace[1] = 'test'`;
});
```

### 3. Prefer Mocked Databases
Most tests should mock Prisma rather than connecting to real databases:

```typescript
// Mock Prisma client (already used in most tests)
vi.mock('@prisma/client', () => {
  class PrismaClientMock {
    public readonly memory = { delete: vi.fn() };
    public readonly $executeRaw = vi.fn();
  }
  return { PrismaClient: PrismaClientMock };
});
```

## Implementation Status

### Tests Using Real Postgres

Only **ONE** test file connects to real Postgres:

#### ✅ `postgres-validation.test.ts` (FIXED)
**Purpose**: Integration tests validating Postgres-backed features (memory storage, LangGraph checkpointing)

**Cleanup Strategy**:
1. **Memory tests**: Delete only records where `namespace[1] = 'test'`
2. **LangGraph tests**: Track test thread IDs, delete only tracked threads in `afterEach`

**Changes Made**:
- Added `afterEach` import to vitest imports
- Created `testThreadIds` array to track test-created threads
- Changed `beforeEach` to only clear mocks (no database wipes)
- Added `afterEach` to delete only tracked thread IDs
- Updated test to push thread ID to tracking array

### Tests Using Mocked Prisma

All other tests mock the database and don't require special cleanup:

#### ✅ `store.test.ts`
**Mocks**: `@prisma/client` - Prisma client fully mocked
**No changes needed**: Never touches real database

#### ✅ `user.routes.test.ts`
**Mocks**: `@prisma/client` - Prisma client fully mocked
**No changes needed**: Never touches real database

#### ✅ All other tests
**Pattern**: Either mock Prisma or don't use database at all
**No changes needed**: No real database access

## Validation

### Before Fix
```bash
# User had 2 threads before running tests
pnpm test
# After: 0 threads remaining (all wiped!)
```

### After Fix
```bash
# User has 1 thread before running tests
pnpm test
# After: 1 thread still exists ✅
# Only test-created threads (with 'test-session-' prefix) are cleaned up
```

### Test Results
```bash
✓ src/agent/__tests__/postgres-validation.test.ts (8)
  ✓ PostgresMemoryStore Integration (6)
  ✓ LangGraph Postgres persistence (2)
    ✓ persists conversation state across agent instances
Test Files: 1 passed (1)
Tests: 7 passed | 1 skipped (8)
```

## Consequences

### Positive
- ✅ **Safe to run tests during development** - Production data preserved
- ✅ **Test isolation** - Each test cleans up only its own data
- ✅ **Clear patterns** - Future tests can follow established patterns
- ✅ **Fast feedback** - No need for separate test database setup
- ✅ **User trust** - Hygiene loop no longer destroys work

### Negative
- ⚠️ **Test data accumulation** - If tests crash before cleanup, test data may linger
  - **Mitigation**: Use recognizable prefixes (`test-`, `'test'` namespace) for manual cleanup
- ⚠️ **Potential conflicts** - If tests run in parallel and create same IDs, conflicts possible
  - **Mitigation**: Use timestamps or UUIDs in test IDs (`test-session-${Date.now()}`)

### Neutral
- 🔄 **Single database** - Development and test data share same database
  - **Acceptable**: Only one developer, low risk of conflicts
  - **Future**: Could add separate `TEST_DATABASE_URL` if needed

## Alternative Considered: Separate Test Database

We could have used a separate test database via environment variable:

```typescript
const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
```

**Rejected because**:
- Adds setup complexity (need to create/migrate test database)
- Requires Docker Compose changes (second Postgres instance)
- Current single-database approach works well for single-developer workflow
- Test-specific cleanup is sufficient and simpler

**Reconsider when**:
- Multiple developers working concurrently
- CI/CD pipeline needs isolation
- Test data accumulation becomes problematic

## Related Documents
- [Engineering Best Practices](../../best-practices.md) - Testing philosophy and hygiene loop
- [postgres-validation.test.ts](../../../apps/server/src/agent/__tests__/postgres-validation.test.ts) - Implementation

## Incident Timeline
- **2025-10-08 - Discovery**: User reported threads lost after running hygiene loop
- **2025-10-08 - Investigation**: Found `beforeEach` hook deleting all checkpoints in postgres-validation.test.ts
- **2025-10-08 - Root Cause**: Test cleanup was wiping entire database instead of test-specific data
- **2025-10-08 - Fix Implemented**: Replaced blanket `deleteMany()` with tracked ID cleanup pattern
- **2025-10-08 - Validation**: Tests pass, user's production thread preserved
- **2025-10-09 - Documentation**: Moved to `docs/decisions/incidents/` and reclassified as incident report

---

**Summary**: Tests must never modify production/development data. Use test-specific prefixes and tracked IDs for cleanup. Mock Prisma whenever possible. Only `postgres-validation.test.ts` connects to real Postgres, and it now uses safe cleanup patterns.
