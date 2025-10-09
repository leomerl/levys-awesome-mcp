import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: './tests/setup.ts',
    // Include only e2e orchestration tests
    include: [
      'tests/e2e/**/*.test.{ts,tsx}',
      'tests/integration/*e2e*.test.ts',
      'tests/integration/orchestrator-*.test.ts'
    ],
    // Longer timeout for full orchestration tests (30 minutes)
    testTimeout: 1800000,
    environmentMatchGlobs: [
      // Only use jsdom for React component tests
      ['**/test-projects/**/*.test.{ts,tsx}', 'jsdom'],
      ['**/tests/e2e/*e2e*.test.tsx', 'jsdom']
    ]
  }
});
