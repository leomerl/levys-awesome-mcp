/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!tests/**/*.test.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: [
    '<rootDir>/tests/**/*.minimal.ts',
    '<rootDir>/tests/integration.test.ts',
    '<rootDir>/tests/orchestrator.test.ts',
    '<rootDir>/tests/server-runner.test.ts',
    '<rootDir>/tests/test-runner.test.ts',
    '<rootDir>/tests/real-agent-invocation.test.ts',
    '<rootDir>/tests/e2e-workflow.test.ts',
    '<rootDir>/tests/agent-continue.test.ts'
  ],
  testTimeout: 15000,
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true
    }]
  }
};