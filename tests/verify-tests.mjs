#!/usr/bin/env node

/**
 * Manual test verification script for string-reverse utilities
 * This script directly imports and tests the functions to verify they work
 */

import { reverseString, reverseWords, reverseEachWord } from '../backend/src/utils/string-reverse.js';

console.log('🔍 Manual Test Verification for String Reverse Utilities');
console.log('=' .repeat(60));

let passedTests = 0;
let failedTests = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${description}`);
    passedTests++;
  } catch (error) {
    console.log(`❌ FAIL: ${description}`);
    console.log(`   Error: ${error.message}`);
    failedTests++;
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected "${expected}" but got "${actual}"`);
      }
    }
  };
}

console.log('\n📋 Testing reverseString():');
console.log('-' .repeat(60));

test('reverses a simple string', () => {
  expect(reverseString('hello')).toBe('olleh');
});

test('handles empty string', () => {
  expect(reverseString('')).toBe('');
});

test('handles palindrome', () => {
  expect(reverseString('racecar')).toBe('racecar');
});

test('handles special characters', () => {
  expect(reverseString('Hello, World!')).toBe('!dlroW ,olleH');
});

test('handles Unicode', () => {
  expect(reverseString('café')).toBe('éfac');
});

test('handles emoji', () => {
  expect(reverseString('😀😁😂')).toBe('😂😁😀');
});

console.log('\n📋 Testing reverseWords():');
console.log('-' .repeat(60));

test('reverses word order', () => {
  expect(reverseWords('hello world')).toBe('world hello');
});

test('handles single word', () => {
  expect(reverseWords('hello')).toBe('hello');
});

test('handles multiple words', () => {
  expect(reverseWords('one two three')).toBe('three two one');
});

test('preserves punctuation with words', () => {
  expect(reverseWords('Hello, World!')).toBe('World! Hello,');
});

console.log('\n📋 Testing reverseEachWord():');
console.log('-' .repeat(60));

test('reverses each word individually', () => {
  expect(reverseEachWord('hello world')).toBe('olleh dlrow');
});

test('handles single word', () => {
  expect(reverseEachWord('hello')).toBe('olleh');
});

test('preserves word positions', () => {
  expect(reverseEachWord('one two three')).toBe('eno owt eerht');
});

test('handles punctuation', () => {
  expect(reverseEachWord('Hello, World!')).toBe(',olleH !dlroW');
});

console.log('\n📋 Testing Combined Operations:');
console.log('-' .repeat(60));

test('double reversal returns original', () => {
  const input = 'hello world';
  expect(reverseString(reverseString(input))).toBe(input);
});

test('reverseWords then reverseEachWord', () => {
  const input = 'one two';
  const step1 = reverseWords(input); // 'two one'
  const step2 = reverseEachWord(step1); // 'owt eno'
  expect(step2).toBe('owt eno');
});

console.log('\n' + '=' .repeat(60));
console.log('📊 TEST RESULTS:');
console.log(`   Passed: ${passedTests}`);
console.log(`   Failed: ${failedTests}`);
console.log(`   Total:  ${passedTests + failedTests}`);

if (failedTests === 0) {
  console.log('\n✅ ALL TESTS PASSED! Functions are working correctly.');
} else {
  console.log('\n❌ Some tests failed. Please review the implementation.');
}

console.log('=' .repeat(60));

process.exit(failedTests > 0 ? 1 : 0);