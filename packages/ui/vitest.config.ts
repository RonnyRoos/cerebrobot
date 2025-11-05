import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'happy-dom', // UI tests need DOM
    globals: true,
    include: ['src/**/*.test.ts', '__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
    },
    // Enable CSS processing for token tests
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
