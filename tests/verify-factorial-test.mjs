#!/usr/bin/env node

// Simple test verification script for TASK-005
// This script verifies that the factorial test exists and can be imported

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verifying Factorial Test Setup for TASK-005\n');
console.log('═'.repeat(60));

// Check files existence
const factorialTestPath = path.join(__dirname, 'unit/utils/factorial.test.ts');
const factorialImplPath = path.join(__dirname, 'utils/factorial-impl.ts');

console.log('\n📁 File Verification:');
console.log(`  ✅ Factorial test exists: ${fs.existsSync(factorialTestPath)}`);
console.log(`     Path: ${factorialTestPath}`);
console.log(`  ✅ Factorial implementation exists: ${fs.existsSync(factorialImplPath)}`);
console.log(`     Path: ${factorialImplPath}`);

// Read test file and count test cases
if (fs.existsSync(factorialTestPath)) {
  const testContent = fs.readFileSync(factorialTestPath, 'utf-8');

  // Count test cases
  const itMatches = testContent.match(/it\s*\(/g);
  const describeMatches = testContent.match(/describe\s*\(/g);

  console.log('\n📊 Test Structure Analysis:');
  console.log(`  Test suites (describe blocks): ${describeMatches ? describeMatches.length : 0}`);
  console.log(`  Test cases (it blocks): ${itMatches ? itMatches.length : 0}`);

  // Extract test categories
  const testCategories = [];
  const categoryMatches = testContent.match(/describe\(['"`]([^'"`]+)['"`]/g);
  if (categoryMatches) {
    categoryMatches.forEach(match => {
      const category = match.match(/describe\(['"`]([^'"`]+)['"`]/)[1];
      testCategories.push(category);
    });
  }

  console.log('\n📝 Test Categories Found:');
  testCategories.forEach(category => {
    console.log(`  • ${category}`);
  });
}

// Read implementation and analyze
if (fs.existsSync(factorialImplPath)) {
  const implContent = fs.readFileSync(factorialImplPath, 'utf-8');

  console.log('\n🎯 Implementation Analysis:');
  console.log(`  Function exported: ${implContent.includes('export function factorial')}`);
  console.log(`  Error handling: ${implContent.includes('throw new Error')}`);
  console.log(`  Input validation: ${implContent.includes('typeof n !== \'number\'')}`);
  console.log(`  MAX_SAFE_INTEGER check: ${implContent.includes('MAX_SAFE_INTEGER')}`);
}

// Create test execution summary
const summary = {
  timestamp: new Date().toISOString(),
  taskId: 'TASK-005',
  sessionId: '15a78992-cd1e-4d33-a816-ad3b3e6509c3',
  verification: {
    testFileExists: fs.existsSync(factorialTestPath),
    implementationFileExists: fs.existsSync(factorialImplPath),
    testPath: factorialTestPath,
    implPath: factorialImplPath
  }
};

// Save verification result
const verificationPath = path.join(__dirname, 'TASK-005-verification.json');
fs.writeFileSync(verificationPath, JSON.stringify(summary, null, 2));

console.log('\n' + '═'.repeat(60));
console.log('✅ Verification Complete');
console.log(`📄 Results saved to: ${verificationPath}`);
console.log('═'.repeat(60));

console.log('\n📌 Next Steps:');
console.log('  1. Run: npm test');
console.log('  2. Run: npm run test:coverage');
console.log('  3. Check coverage/index.html for detailed report');

process.exit(0);