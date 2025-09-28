#!/bin/bash
# Simple test execution script for vitest

cd /home/gofri/projects/levys-awesome-mcp

echo "══════════════════════════════════════════════════════════"
echo " EXECUTING ALL TESTS WITH VITEST"
echo "══════════════════════════════════════════════════════════"
echo ""

# Run all tests
echo "🧪 Running all tests..."
npx vitest run

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests passed successfully!"

    # Run calculator tests specifically to verify
    echo ""
    echo "🧮 Verifying calculator tests specifically..."
    npx vitest run tests/unit/utils/calculator.test.ts

    if [ $? -eq 0 ]; then
        echo "✅ Calculator tests confirmed PASSING"
    else
        echo "❌ Calculator tests FAILED"
    fi

    # Try to generate coverage
    echo ""
    echo "📊 Generating test coverage report..."
    npx vitest run --coverage

    echo ""
    echo "══════════════════════════════════════════════════════════"
    echo " TEST EXECUTION COMPLETE"
    echo "══════════════════════════════════════════════════════════"
else
    echo ""
    echo "❌ Some tests failed. Please review the output above."
    exit 1
fi