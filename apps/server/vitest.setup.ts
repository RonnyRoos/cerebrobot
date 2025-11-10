/**
 * Vitest Setup File
 *
 * Runs before all tests to configure the test environment.
 * 
 * CRITICAL: This file forces ALL tests to use the test database (cerebrobot_test)
 * running in a separate postgres-test Docker container (port 5434).
 * 
 * Test Database Architecture:
 * - Production: postgres service → localhost:5432 → cerebrobot database
 * - Test: postgres-test service → localhost:5434 → cerebrobot_test database
 * 
 * Benefits of separate containers:
 * - Clean logs: test errors don't appear in production logs
 * - Resource isolation: independent connection pools and memory
 * - Independent lifecycle: can restart test DB without affecting production
 * 
 * Note: Postgres logs from postgres-test will show duplicate key errors from
 * constraint validation tests. These are EXPECTED and INTENTIONAL - tests verify
 * unique constraints by attempting duplicate inserts that should fail.
 * 
 * Setup:
 * 1. Start test database: ./scripts/start-test-db.sh
 * 2. Run tests: pnpm test
 * 3. Stop test database: ./scripts/stop-test-db.sh
 */

import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// Load .env from repository root
const envPath = resolve(__dirname, '../../.env');
loadEnv({ path: envPath, override: true });

// CRITICAL: Override all database URLs to use test database
// This ensures EVERY test (including those that create PrismaClient without explicit datasource)
// connects to cerebrobot_test, not production cerebrobot
process.env.DATABASE_URL_TEST =
  process.env.DATABASE_URL_TEST ||
  'postgresql://cerebrobot:cerebrobot@localhost:5432/cerebrobot_test';
process.env.LANGGRAPH_PG_URL_TEST =
  process.env.LANGGRAPH_PG_URL_TEST ||
  'postgresql://cerebrobot:cerebrobot@localhost:5432/cerebrobot_test';
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.LANGGRAPH_PG_URL = process.env.LANGGRAPH_PG_URL_TEST;
