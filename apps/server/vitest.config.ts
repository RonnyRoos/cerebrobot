import { defineConfig } from 'vitest/config';

const includePostgresValidation = process.env.POSTGRES_VALIDATION === 'true';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: includePostgresValidation
      ? ['src/**/*.test.ts']
      : ['src/**/*.test.ts', '!src/**/*postgres-validation.test.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
});
