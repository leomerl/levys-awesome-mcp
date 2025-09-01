# Test Suite Documentation

## Overview
Comprehensive test suite for Levy's Awesome MCP Toolkit following best practices for MCP server testing.

## Test Structure

### 1. Unit Tests (`tests/unit/`)
- Test individual functions and utilities in isolation
- Focus on pure functions and business logic
- No external dependencies or I/O operations

### 2. Contract Tests (`tests/contract/`)
- Test each MCP tool with real inputs and outputs
- Validate JSON schema conformance
- Assert on actual behavior, not implementation details

### 3. Integration Tests (`tests/integration/`)
- Start the server as agents do (`npx tsx src/index.ts`)
- Test MCP JSON-RPC protocol over stdio
- Validate protocol compliance (jsonrpc, id pairing, error codes)

### 4. Golden/Snapshot Tests (`tests/golden/`)
- Store stable, sanitized outputs for deterministic inputs
- Detect unintended changes in tool behavior
- Snapshots stored in `tests/golden/snapshots/`

## Running Tests

### All Tests
```bash
npm test
```

### By Category
```bash
npm run test:unit        # Unit tests only
npm run test:contract    # Contract tests only
npm run test:integration # Integration tests only
npm run test:mutate      # Mutation testing
```

### Update Golden Files
```bash
UPDATE_GOLDEN=1 npm run test:golden
```

## Test Guidelines

### What We Test
- ✅ Observable behavior and outputs
- ✅ JSON schema conformance
- ✅ Error handling and edge cases
- ✅ Protocol compliance (MCP JSON-RPC)
- ✅ Performance thresholds

### What We Don't Test
- ❌ Internal implementation details
- ❌ Mock-heavy scenarios
- ❌ Tautological assertions

### Mocking Policy
- Only mock true externals (network, clock, randomness)
- Never mock MCP transport or server's public API
- Prefer fakes over mocks when possible

## Performance Benchmarks
- Server boot time: < 2 seconds
- First response time: < 1 second
- Tool execution: < 10 seconds (varies by tool)

## Mutation Testing
Run mutation tests to validate test quality:
```bash
npm run test:mutate
```
Target mutation score: >70%

## CI Integration
Tests run automatically on:
1. Install dependencies
2. Build server
3. Run unit tests
4. Run contract tests  
5. Run integration tests
6. Upload golden snapshots as artifacts

## Updating Golden Files
When tool outputs legitimately change:
1. Review the changes carefully
2. Run `UPDATE_GOLDEN=1 npm test`
3. Commit updated golden files
4. Document changes in PR

## Troubleshooting

### Server Won't Start
- Check if port is already in use
- Verify build completed successfully
- Check for TypeScript compilation errors

### Golden Tests Failing
- Run with `UPDATE_GOLDEN=1` to see differences
- Ensure deterministic test inputs
- Check for timestamp/random data in outputs

### Integration Tests Timeout
- Increase timeout in test configuration
- Check server startup logs
- Verify MCP protocol compliance