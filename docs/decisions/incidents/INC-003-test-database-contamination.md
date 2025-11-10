# Test Database Separation - Implementation Summary

## Problem

The `postgres-validation.test.ts` file was using the production `DATABASE_URL` environment variable, causing:
- Production database contamination during test runs
- Duplicate key constraint violations when tests ran while agents were active
- User confusion about "no integration tests" policy vs actual constitution requirements

## Constitution Clarification

The constitution **explicitly mandates** one Postgres validation test (Principle III, Tier 2):
- "ONE test file that validates: DB schema, migrations, pgvector index using real Postgres"
- Uses "test database with mocked embeddings (deterministic, no API costs)"

The constitution's "no integration tests" anti-pattern refers to **pseudo-integration tests** (heavily mocked tests that can't validate what they claim to test), NOT database validation tests.

## Solution Implemented (Option B)

✅ **Separate test database** - maintains constitution compliance while preventing production contamination

### Root Cause Analysis

The tests were configured to use `DATABASE_URL_TEST` and `LANGGRAPH_PG_URL_TEST`, but **Vitest wasn't loading the `.env` file**. The environment variables were available during server runtime (via `src/index.ts`) but NOT during test execution, causing tests to fall back to production database URLs or undefined.

### Changes Made

1. **Vitest Setup File** (`apps/server/vitest.setup.ts`) - **CRITICAL FIX**:
   - Created setup file that loads `.env` before all tests
   - Verifies test database URLs are present and warns if missing
   - Ensures `DATABASE_URL_TEST` and `LANGGRAPH_PG_URL_TEST` are available to all tests

2. **Vitest Configuration** (`apps/server/vitest.config.ts`):
   - Added `setupFiles: ['./vitest.setup.ts']` to load environment before tests
   - This was the missing piece - tests now have access to `.env` variables

3. **Test File Updates** (`apps/server/src/agent/__tests__/postgres-validation.test.ts`):
   - Changed from `DATABASE_URL` → `DATABASE_URL_TEST`
   - Changed from `LANGGRAPH_PG_URL` → `LANGGRAPH_PG_URL_TEST`
   - Updated all PrismaClient instantiations to use test database URLs
   - Enhanced error messages with test database setup instructions

4. **Environment Configuration** (`.env.example`):
   - Added `DATABASE_URL_TEST` documentation
   - Added `LANGGRAPH_PG_URL_TEST` documentation
   - Clear separation from production `DATABASE_URL` and `LANGGRAPH_PG_URL`

5. **Setup Script** (`scripts/setup-test-db.sh`):
   - Creates `cerebrobot_test` database automatically
   - Applies all Prisma migrations to test database
   - Adds test database URLs to `.env` if not present
   - Works with Docker-based PostgreSQL (uses `docker exec`)
   - Includes comprehensive error messages and manual instructions

6. **Documentation Updates**:
   - `docs/best-practices.md`: Updated testing section to emphasize separate test database
   - `scripts/README.md`: Created with test database setup instructions and cleanup procedures

## Verification

✅ Test database created: `cerebrobot_test`
✅ All 14 migrations applied to test database
✅ Test database URLs added to `.env`
✅ All 871 tests passing (240 server + 98 client + 472 UI + 61 shared)
✅ 22 postgres-validation tests passing with isolated test database
✅ Hygiene loop clean (lint ✅, format ✅, tests ✅)

## Usage

### One-Time Setup
```bash
./scripts/setup-test-db.sh
```

### Running Tests
```bash
pnpm test  # Automatically uses DATABASE_URL_TEST if configured
```

### Manual Database Inspection
```bash
docker exec -it cerebrobot-postgres-1 psql -U cerebrobot -d cerebrobot_test
```

### Cleanup (Start Fresh)
```bash
dropdb cerebrobot_test  # Or: docker exec cerebrobot-postgres-1 dropdb -U cerebrobot cerebrobot_test
./scripts/setup-test-db.sh  # Re-run setup
```

## Benefits

1. **Production Safety**: Tests never touch production database
2. **Constitutional Compliance**: Maintains mandated Postgres validation test
3. **Automated Setup**: One-command test database creation and migration
4. **Clear Separation**: Explicit `_TEST` suffix makes intent obvious
5. **CI-Friendly**: Tests skip if `DATABASE_URL_TEST` not set (graceful degradation)

## What Tests Validate

The postgres-validation tests verify:
- **Schema Correctness**: All tables, columns, and types exist
- **Migrations**: All Prisma migrations apply successfully
- **pgvector**: IVFFlat index works for semantic search
- **Unique Constraints**: Events, effects, and timers enforce uniqueness
- **LangGraph Checkpointing**: Conversation persistence works
- **Memory Storage**: PostgresMemoryStore operations succeed

All with **mocked embeddings** (deterministic, no API costs, fast).

## Files Modified

- **`apps/server/vitest.setup.ts`** - **NEW** - Loads `.env` before all tests (CRITICAL FIX)
- **`apps/server/vitest.config.ts`** - Added `setupFiles` to load environment variables
- `apps/server/src/agent/__tests__/postgres-validation.test.ts` - Use separate test database
- `.env.example` - Document test database URLs
- `docs/best-practices.md` - Update testing expectations
- `scripts/setup-test-db.sh` - Automated test database setup
- `scripts/README.md` - Setup script documentation

## Constitutional Impact

No constitutional changes required. This implementation:
- ✅ Satisfies Principle III (Type Safety & Testability) - "ONE test file that validates... using real Postgres"
- ✅ Prevents production contamination (Principle VII - Operator-Centric Design)
- ✅ Maintains hygiene-first development (Principle I)
- ✅ Follows 3-tier testing strategy (unit → Postgres validation → manual smoke tests)
