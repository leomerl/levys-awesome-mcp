#!/bin/bash
# Script to verify that the JSON reporter works with Vitest v2

echo "Testing Vitest JSON reporter configuration..."

# Create test results directory
mkdir -p test-results

# Test 1: Basic JSON reporter with outputFile
echo "Test 1: Basic JSON reporter..."
npx vitest run tests/verify-vitest-reporter.test.ts --reporter=json --outputFile test-results/test1.json

if [ -f test-results/test1.json ]; then
    echo "✅ Test 1 passed: JSON file created"
else
    echo "❌ Test 1 failed: JSON file not created"
fi

# Test 2: Multiple reporters (verbose + json)
echo "Test 2: Multiple reporters..."
npx vitest run tests/verify-vitest-reporter.test.ts --reporter=verbose --reporter=json --outputFile test-results/test2.json

if [ -f test-results/test2.json ]; then
    echo "✅ Test 2 passed: JSON file created with multiple reporters"
else
    echo "❌ Test 2 failed: JSON file not created with multiple reporters"
fi

# Test 3: Using npm test command (as in workflow)
echo "Test 3: Using npm test command..."
npm test -- --reporter=json --outputFile test-results/test3.json

if [ -f test-results/test3.json ]; then
    echo "✅ Test 3 passed: JSON file created via npm test"
    echo "JSON structure sample:"
    head -n 20 test-results/test3.json
else
    echo "❌ Test 3 failed: JSON file not created via npm test"
fi

echo ""
echo "Verification complete. Cleaning up test files..."
rm -rf test-results/test*.json