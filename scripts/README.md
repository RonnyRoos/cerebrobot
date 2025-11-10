# Scripts

Utility scripts for Cerebrobot development and operations.

## Test Database Setup

### `setup-test-db.sh`

Creates and configures a **separate test database** for Postgres validation tests.

**Why separate?**
- Prevents production data contamination during automated testing
- Ensures tests can't interfere with active agent conversations
- Follows constitution's 3-tier testing strategy (one Postgres validation test with isolated infrastructure)

**What it does:**
1. Creates `cerebrobot_test` database (if not exists)
2. Applies all Prisma migrations to the test database
3. Adds `DATABASE_URL_TEST` and `LANGGRAPH_PG_URL_TEST` to `.env`

**Usage:**
```bash
# One-time setup
./scripts/setup-test-db.sh

# Then run tests normally
pnpm test
```

**Prerequisites:**
- PostgreSQL running (`docker-compose up -d`)
- `.env` file exists with production `DATABASE_URL` configured

**Manual setup (alternative):**
```bash
# Create test database
createdb cerebrobot_test

# Apply migrations
DATABASE_URL="postgresql://cerebrobot:cerebrobot@localhost:5432/cerebrobot_test" pnpm prisma migrate deploy

# Add to .env
echo 'DATABASE_URL_TEST="postgresql://cerebrobot:cerebrobot@localhost:5432/cerebrobot_test"' >> .env
echo 'LANGGRAPH_PG_URL_TEST="postgresql://cerebrobot:cerebrobot@localhost:5432/cerebrobot_test"' >> .env
```

**Cleanup:**
```bash
# Drop test database (start fresh)
dropdb cerebrobot_test

# Then re-run setup script
./scripts/setup-test-db.sh
```

---

## Future Scripts

Additional operational scripts will be added here as needed (e.g., migration helpers, deployment automation, data backups).
