/**
 * Calculates the factorial of a non-negative integer.
 *
 * @param n - The non-negative integer to calculate factorial for
 * @returns The factorial of n
 * @throws {Error} If n is negative, non-integer, NaN, or would exceed MAX_SAFE_INTEGER
 */
export function factorial(n: number): number {
  // Check for NaN, null, undefined, or non-number types
  if (typeof n !== 'number' || isNaN(n)) {
    throw new Error('Input must be a valid number');
  }

  // Check for negative numbers first (including negative decimals)
  if (n < 0) {
    // Check if it's an integer or decimal
    if (!Number.isInteger(n)) {
      throw new Error('Factorial is only defined for non-negative integers');
    }
    throw new Error('Factorial is not defined for negative numbers');
  }

  // Check for non-integer positive numbers
  if (!Number.isInteger(n)) {
    throw new Error('Factorial is only defined for non-negative integers');
  }

  // Check for numbers that would exceed MAX_SAFE_INTEGER
  // Factorial of 21 is the first to exceed MAX_SAFE_INTEGER
  if (n > 20) {
    throw new Error(`Factorial of ${n} exceeds JavaScript's MAX_SAFE_INTEGER`);
  }

  // Calculate factorial
  if (n === 0 || n === 1) {
    return 1;
  }

  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }

  return result;
}