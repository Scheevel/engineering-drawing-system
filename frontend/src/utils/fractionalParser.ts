/**
 * Fractional Input Parser Utility
 *
 * Story 6.1: Dimension and Specification Management UI
 * Parses fractional and decimal input formats for WYSIWYG dimension entry
 *
 * Supported formats:
 * - "15 3/4" (space-separated)
 * - "15-3/4" (hyphen-separated)
 * - "3/4" (simple fraction)
 * - "15.75" (decimal)
 * - "15" (whole number)
 */

export interface ParsedFractionalInput {
  decimalValue: number;
  displayFormat: 'decimal' | 'fraction';
  originalInput: string;
}

/**
 * Calculate Greatest Common Divisor using Euclidean algorithm
 */
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);

  if (b === 0) return a;
  return gcd(b, a % b);
}

/**
 * Simplify a fraction using GCD
 */
export function simplifyFraction(
  numerator: number,
  denominator: number
): { numerator: number; denominator: number } {
  const divisor = gcd(numerator, denominator);
  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  };
}

/**
 * Parse fractional or decimal input and return decimal value with display format
 */
export function parseFractionalInput(input: string): ParsedFractionalInput {
  const trimmedInput = input.trim();
  const originalInput = trimmedInput;

  // Validation: empty string
  if (trimmedInput === '') {
    throw new Error('Input cannot be empty');
  }

  // Validation: negative values
  if (trimmedInput.startsWith('-')) {
    throw new Error('Negative values not allowed');
  }

  // Pattern 1: Whole number with space-separated fraction (e.g., "15 3/4")
  const spacePattern = /^(\d+)\s+(\d+)\/(\d+)$/;
  const spaceMatch = trimmedInput.match(spacePattern);
  if (spaceMatch) {
    const whole = parseInt(spaceMatch[1], 10);
    const numerator = parseInt(spaceMatch[2], 10);
    const denominator = parseInt(spaceMatch[3], 10);

    if (denominator === 0) {
      throw new Error('Division by zero');
    }

    const decimalValue = whole + numerator / denominator;
    return {
      decimalValue,
      displayFormat: 'fraction',
      originalInput,
    };
  }

  // Pattern 2: Whole number with hyphen-separated fraction (e.g., "15-3/4")
  const hyphenPattern = /^(\d+)-(\d+)\/(\d+)$/;
  const hyphenMatch = trimmedInput.match(hyphenPattern);
  if (hyphenMatch) {
    const whole = parseInt(hyphenMatch[1], 10);
    const numerator = parseInt(hyphenMatch[2], 10);
    const denominator = parseInt(hyphenMatch[3], 10);

    if (denominator === 0) {
      throw new Error('Division by zero');
    }

    const decimalValue = whole + numerator / denominator;
    return {
      decimalValue,
      displayFormat: 'fraction',
      originalInput,
    };
  }

  // Pattern 3: Simple fraction (e.g., "3/4")
  const fractionPattern = /^(\d+)\/(\d+)$/;
  const fractionMatch = trimmedInput.match(fractionPattern);
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1], 10);
    const denominator = parseInt(fractionMatch[2], 10);

    if (denominator === 0) {
      throw new Error('Division by zero');
    }

    const decimalValue = numerator / denominator;
    return {
      decimalValue,
      displayFormat: 'fraction',
      originalInput,
    };
  }

  // Pattern 4: Decimal or whole number (e.g., "15.75", "15", ".75")
  const decimalPattern = /^(\d*\.?\d+)$/;
  const decimalMatch = trimmedInput.match(decimalPattern);
  if (decimalMatch) {
    const decimalValue = parseFloat(decimalMatch[1]);

    if (isNaN(decimalValue)) {
      throw new Error('Invalid input format');
    }

    return {
      decimalValue,
      displayFormat: 'decimal',
      originalInput,
    };
  }

  // If no patterns match, throw error
  throw new Error('Invalid input format');
}

/**
 * Format a decimal value as a simplified fraction
 *
 * @param value - The decimal value to convert
 * @param maxDenominator - Maximum denominator to use (default: 64 for 1/64" precision)
 * @returns Formatted fraction string (e.g., "15 3/4", "3/4", "15")
 */
export function formatDecimalToFraction(
  value: number,
  maxDenominator: number = 64
): string {
  // Handle zero
  if (value === 0) {
    return '0';
  }

  // Extract whole number part
  const whole = Math.floor(value);
  const fractionalPart = value - whole;

  // If no fractional part, return whole number
  if (fractionalPart < 0.0001) {
    return whole.toString();
  }

  // Find best fraction approximation
  let bestNumerator = 0;
  let bestDenominator = 1;
  let minError = Math.abs(fractionalPart);

  for (let denominator = 2; denominator <= maxDenominator; denominator++) {
    const numerator = Math.round(fractionalPart * denominator);
    const error = Math.abs(fractionalPart - numerator / denominator);

    if (error < minError) {
      bestNumerator = numerator;
      bestDenominator = denominator;
      minError = error;

      // If exact match, stop searching
      if (error < 0.0001) {
        break;
      }
    }
  }

  // Simplify the fraction
  const simplified = simplifyFraction(bestNumerator, bestDenominator);

  // Format output
  if (whole === 0) {
    return `${simplified.numerator}/${simplified.denominator}`;
  } else {
    return `${whole} ${simplified.numerator}/${simplified.denominator}`;
  }
}

/**
 * Convert a fraction string back to displayable format
 * Useful for reformatting user input to standard notation
 */
export function normalizeFractionDisplay(input: string): string {
  try {
    const parsed = parseFractionalInput(input);

    if (parsed.displayFormat === 'decimal') {
      return parsed.decimalValue.toString();
    } else {
      return formatDecimalToFraction(parsed.decimalValue);
    }
  } catch (error) {
    // If parsing fails, return original input
    return input;
  }
}
