import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: './tests/setup.ts',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // Exclude full e2e orchestration tests from regular test runs
      'tests/e2e/**/*.test.{ts,tsx}',
      'tests/integration/*e2e*.test.ts',
      'tests/integration/orchestrator-*.test.ts',
      // Exclude long-running integration tests that invoke real agents
      'tests/integration/all-agents-invocation.test.ts',
      'tests/integration/monitoring-workflow.integration.test.ts',
      'tests/integration/task-tracker.integration.test.ts'
    ],
    environmentMatchGlobs: [
      // Only use jsdom for React component tests
      ['**/test-projects/**/*.test.{ts,tsx}', 'jsdom'],
      ['**/tests/unit/*HelloWorld*.test.{ts,tsx}', 'jsdom'],
      ['**/tests/unit/*hello*.test.{ts,tsx}', 'jsdom']
    ]
  }
});
