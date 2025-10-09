/**
 * Calculates the square of a number
 * @param x - The number to square
 * @returns The square of the input number
 * @throws {TypeError} When input is not a number
 */
export function square(x: number): number {
  if (typeof x !== 'number') {
    throw new TypeError('Input must be a number');
  }

  if (isNaN(x)) {
    return NaN;
  }

  if (!isFinite(x)) {
    return Infinity; // Both +Infinity and -Infinity squared result in +Infinity
  }

  return x * x;
}

export default square;