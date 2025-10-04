# Vitest JSON Reporter Fix

## Issue Description
The nightly test runner workflow was failing with the error:
```
CACError: Unknown option `--json`
```

This occurred because the workflow was using an invalid Vitest command:
```bash
vitest run --json --outputFile=test-results/results.json
```

## Root Cause
Vitest does not have a `--json` flag. The correct way to generate JSON output is to use the `--reporter=json` option.

## Solution
Created specialized test runner scripts that use the correct Vitest reporter syntax:

### Files Created:
1. **`tests/nightly-test-runner.js`** - JavaScript version of the nightly test runner
2. **`tests/nightly-test-runner.ts`** - TypeScript version with better type safety
3. **`tests/unit/json-reporter.test.ts`** - Test suite to verify JSON reporter functionality

### Correct Usage:
```bash
# ❌ INCORRECT (causes error)
vitest run --json --outputFile=results.json

# ✅ CORRECT
vitest run --reporter=json --outputFile=results.json
```

## How to Use the Fix

### For GitHub Actions Workflow:
Instead of using:
```yaml
npm test -- --json --outputFile=test-results/results.json
```

Use the new test runner script:
```yaml
node tests/nightly-test-runner.js test-results/results.json
# OR
npx tsx tests/nightly-test-runner.ts test-results/results.json
```

### For Local Testing:
```bash
# Run with default output location
node tests/nightly-test-runner.js

# Run with custom output location
node tests/nightly-test-runner.js custom-path/results.json
```

## Benefits of the New Test Runner:
1. **Correct Reporter Syntax**: Uses `--reporter=json` instead of invalid `--json`
2. **Better Error Handling**: Gracefully handles test failures and still generates JSON
3. **Enhanced Output**: Provides clear console summary of test results
4. **Process Management**: Handles SIGINT/SIGTERM signals properly
5. **Directory Creation**: Automatically creates output directories if they don't exist
6. **Type Safety**: TypeScript version provides better type checking

## Verification:
Run the test to verify the fix works:
```bash
npm test tests/unit/json-reporter.test.ts
```

This test suite:
- Verifies that `--reporter=json` works correctly
- Confirms that `--json` fails as expected
- Tests the nightly runner script functionality

## Workflow Update Required:
The `.github/workflows/nightly-test-runner.yml` file needs to be updated at line 51 to use the new test runner script instead of the incorrect command. Since the testing agent cannot modify workflow files directly, this change needs to be made manually or by another agent with appropriate permissions.

## Related Files:
- Issue: #54 - Test Failure: Vitest Unknown Option --json
- Failed Workflow Run: https://github.com/leomerl/levys-awesome-mcp/actions/runs/18245802244
- Fix Implementation: tests/nightly-test-runner.js