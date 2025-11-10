#!/bin/bash
set -e

echo "🧪 Starting test database container..."

# Start postgres-test with test profile
docker-compose --profile test up -d postgres-test

# Wait for healthy
echo "⏳ Waiting for test database to be ready..."
for i in {1..30}; do
  if docker exec cerebrobot-postgres-test-1 pg_isready -U cerebrobot -d cerebrobot_test 2>/dev/null; then
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Test database failed to start within 30 seconds"
    exit 1
  fi
  sleep 1
done

# Run migrations
echo "📦 Running migrations on test database..."
DATABASE_URL="postgresql://cerebrobot:cerebrobot@localhost:5434/cerebrobot_test" pnpm prisma migrate deploy

echo "✅ Test database ready at localhost:5434"
echo "   Run tests with: pnpm test"
echo "   Stop with: ./scripts/stop-test-db.sh"
