import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom', // UI tests need DOM
    globals: true,
    include: ['src/**/*.test.ts', '__tests__/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
});
