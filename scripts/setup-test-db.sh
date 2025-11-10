#!/usr/bin/env bash
set -euo pipefail

# Setup Test Database for Postgres Validation Tests
#
# This script creates a separate test database to prevent production data
# contamination during automated testing. The test database uses the same
# schema as production but is completely isolated.
#
# Prerequisites:
#   - PostgreSQL running (docker-compose up -d)
#   - .env file exists with DATABASE_URL configured
#
# Usage:
#   ./scripts/setup-test-db.sh

echo "🔧 Setting up test database for Postgres validation tests..."

# Load environment variables
if [ ! -f .env ]; then
  echo "❌ .env file not found. Copy .env.example to .env first."
  exit 1
fi

source .env

# Extract database connection details from DATABASE_URL
# Expected format: postgresql://user:password@host:port/database
DB_USER="${POSTGRES_USER:-cerebrobot}"
DB_PASSWORD="${POSTGRES_PASSWORD:-cerebrobot}"
DB_HOST="localhost"
DB_PORT="${POSTGRES_PORT:-5432}"
TEST_DB_NAME="cerebrobot_test"

echo "📦 Database: ${DB_USER}@${DB_HOST}:${DB_PORT}/${TEST_DB_NAME}"

# Check if PostgreSQL Docker container is running
if ! docker ps --filter "name=cerebrobot-postgres" --format "{{.Names}}" | grep -q cerebrobot-postgres; then
  echo "❌ cerebrobot-postgres container is not running"
  echo "   Start it with: docker-compose up -d"
  exit 1
fi

echo "✅ PostgreSQL container is running"

# Create test database if it doesn't exist (using Docker exec)
echo "🗄️  Creating test database '${TEST_DB_NAME}'..."
docker exec cerebrobot-postgres-1 psql -U "$DB_USER" -tc "SELECT 1 FROM pg_database WHERE datname = '${TEST_DB_NAME}'" | grep -q 1 || \
  docker exec cerebrobot-postgres-1 psql -U "$DB_USER" -c "CREATE DATABASE ${TEST_DB_NAME}"

echo "✅ Test database '${TEST_DB_NAME}' ready"

# Apply migrations to test database
echo "🔄 Applying migrations to test database..."
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${TEST_DB_NAME}"
pnpm prisma migrate deploy

echo "✅ Migrations applied successfully"

# Add test database URLs to .env if not already present
if ! grep -q "DATABASE_URL_TEST" .env; then
  echo ""
  echo "📝 Adding test database URLs to .env..."
  cat >> .env << EOF

# ============================================================================
# TEST INFRASTRUCTURE (added by scripts/setup-test-db.sh)
# ============================================================================
DATABASE_URL_TEST="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${TEST_DB_NAME}"
LANGGRAPH_PG_URL_TEST="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${TEST_DB_NAME}"
EOF
  echo "✅ Test database URLs added to .env"
else
  echo "ℹ️  DATABASE_URL_TEST already exists in .env (skipping)"
fi

echo ""
echo "✅ Test database setup complete!"
echo ""
echo "You can now run tests with: pnpm test"
echo ""
echo "To manually inspect the test database:"
echo "  docker exec -it cerebrobot-postgres-1 psql -U ${DB_USER} -d ${TEST_DB_NAME}"

