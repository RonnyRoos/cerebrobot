import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

process.env.VITE_WS_URL = process.env.VITE_WS_URL ?? 'ws://localhost:3030/api/chat/ws';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
});
