import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      STORAGE_BACKEND: 'memory',
      ENABLE_LOCAL_AI_FALLBACK: 'true',
      DEMO_SESSION_SECRET: 'test-secret-at-least-32-characters-long',
    },
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
