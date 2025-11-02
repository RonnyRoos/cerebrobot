import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'node:path';

const apiTarget = process.env.VITE_API_BASE ?? 'http://localhost:3030';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../..', 'packages/chat-shared/src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: Number(process.env.CLIENT_PORT ?? 5173),
    strictPort: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.CLIENT_PORT ?? 4173),
    strictPort: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying
      },
    },
  },
});
