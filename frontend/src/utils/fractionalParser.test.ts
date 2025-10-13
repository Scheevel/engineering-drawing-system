/**
 * Tests for fractional input parser utility
 *
 * Story 6.1: Dimension and Specification Management UI
 * Tests the WYSIWYG fractional input parsing behavior
 */

import { parseFractionalInput, formatDecimalToFraction, simplifyFraction, gcd } from './fractionalParser';

describe('fractionalParser', () => {
  describe('parseFractionalInput', () => {
    describe('Fractional input patterns', () => {
      it('should parse whole number with space-separated fraction "15 3/4"', () => {
        const result = parseFractionalInput('15 3/4');
        expect(result.decimalValue).toBeCloseTo(15.75, 4);
        expect(result.displayFormat).toBe('fraction');
        expect(result.originalInput).toBe('15 3/4');
      });

      it('should parse whole number with hyphen-separated fraction "15-3/4"', () => {
        const result = parseFractionalInput('15-3/4');
        expect(result.decimalValue).toBeCloseTo(15.75, 4);
        expect(result.displayFormat).toBe('fraction');
        expect(result.originalInput).toBe('15-3/4');
      });

      it('should parse simple fraction "3/4"', () => {
        const result = parseFractionalInput('3/4');
        expect(result.decimalValue).toBeCloseTo(0.75, 4);
        expect(result.displayFormat).toBe('fraction');
        expect(result.originalInput).toBe('3/4');
      });

      it('should parse improper fraction "9/4"', () => {
        const result = parseFractionalInput('9/4');
        expect(result.decimalValue).toBeCloseTo(2.25, 4);
        expect(result.displayFormat).toBe('fraction');
        expect(result.originalInput).toBe('9/4');
      });

      it('should handle fractional input with extra whitespace', () => {
        const result = parseFractionalInput('  15   3/4  ');
        expect(result.decimalValue).toBeCloseTo(15.75, 4);
        expect(result.displayFormat).toBe('fraction');
      });
    });

    describe('Decimal input patterns', () => {
      it('should parse decimal "15.75"', () => {
        const result = parseFractionalInput('15.75');
        expect(result.decimalValue).toBeCloseTo(15.75, 4);
        expect(result.displayFormat).toBe('decimal');
        expect(result.originalInput).toBe('15.75');
      });

      it('should parse whole number "15"', () => {
        const result = parseFractionalInput('15');
        expect(result.decimalValue).toBe(15);
        expect(result.displayFormat).toBe('decimal');
        expect(result.originalInput).toBe('15');
      });

      it('should parse decimal starting with dot ".75"', () => {
        const result = parseFractionalInput('.75');
        expect(result.decimalValue).toBeCloseTo(0.75, 4);
        expect(result.displayFormat).toBe('decimal');
      });

      it('should handle decimal with extra whitespace', () => {
        const result = parseFractionalInput('  15.75  ');
        expect(result.decimalValue).toBeCloseTo(15.75, 4);
        expect(result.displayFormat).toBe('decimal');
      });
    });

    describe('Error handling', () => {
      it('should throw error for empty string', () => {
        expect(() => parseFractionalInput('')).toThrow('Input cannot be empty');
      });

      it('should throw error for invalid format', () => {
        expect(() => parseFractionalInput('abc')).toThrow('Invalid input format');
      });

      it('should throw error for division by zero "3/0"', () => {
        expect(() => parseFractionalInput('3/0')).toThrow('Division by zero');
      });

      it('should throw error for negative values', () => {
        expect(() => parseFractionalInput('-15.75')).toThrow('Negative values not allowed');
      });
    });

    describe('Edge cases', () => {
      it('should handle zero', () => {
        const result = parseFractionalInput('0');
        expect(result.decimalValue).toBe(0);
        expect(result.displayFormat).toBe('decimal');
      });

      it('should handle very small fractions "1/64"', () => {
        const result = parseFractionalInput('1/64');
        expect(result.decimalValue).toBeCloseTo(0.015625, 6);
        expect(result.displayFormat).toBe('fraction');
      });

      it('should handle large numbers "1000 1/2"', () => {
        const result = parseFractionalInput('1000 1/2');
        expect(result.decimalValue).toBeCloseTo(1000.5, 4);
        expect(result.displayFormat).toBe('fraction');
      });
    });
  });

  describe('formatDecimalToFraction', () => {
    it('should format 0.75 as "3/4"', () => {
      expect(formatDecimalToFraction(0.75)).toBe('3/4');
    });

    it('should format 15.75 as "15 3/4"', () => {
      expect(formatDecimalToFraction(15.75)).toBe('15 3/4');
    });

    it('should format 0.5 as "1/2"', () => {
      expect(formatDecimalToFraction(0.5)).toBe('1/2');
    });

    it('should format 2.25 as "2 1/4"', () => {
      expect(formatDecimalToFraction(2.25)).toBe('2 1/4');
    });

    it('should format whole numbers without fraction', () => {
      expect(formatDecimalToFraction(15)).toBe('15');
    });

    it('should simplify fractions using GCD', () => {
      // 0.5 = 32/64 but should simplify to 1/2
      expect(formatDecimalToFraction(0.5, 64)).toBe('1/2');
    });

    it('should use denominator 16 by default for common fractions', () => {
      // 0.0625 = 1/16
      expect(formatDecimalToFraction(0.0625)).toBe('1/16');
    });

    it('should handle zero', () => {
      expect(formatDecimalToFraction(0)).toBe('0');
    });
  });

  describe('simplifyFraction', () => {
    it('should simplify 8/64 to 1/8', () => {
      const result = simplifyFraction(8, 64);
      expect(result).toEqual({ numerator: 1, denominator: 8 });
    });

    it('should simplify 16/64 to 1/4', () => {
      const result = simplifyFraction(16, 64);
      expect(result).toEqual({ numerator: 1, denominator: 4 });
    });

    it('should not change already simplified fraction 3/4', () => {
      const result = simplifyFraction(3, 4);
      expect(result).toEqual({ numerator: 3, denominator: 4 });
    });

    it('should simplify 12/16 to 3/4', () => {
      const result = simplifyFraction(12, 16);
      expect(result).toEqual({ numerator: 3, denominator: 4 });
    });
  });

  describe('gcd (Greatest Common Divisor)', () => {
    it('should calculate gcd(8, 64) = 8', () => {
      expect(gcd(8, 64)).toBe(8);
    });

    it('should calculate gcd(12, 16) = 4', () => {
      expect(gcd(12, 16)).toBe(4);
    });

    it('should calculate gcd(3, 4) = 1', () => {
      expect(gcd(3, 4)).toBe(1);
    });

    it('should handle gcd(0, 5) = 5', () => {
      expect(gcd(0, 5)).toBe(5);
    });

    it('should handle gcd(5, 0) = 5', () => {
      expect(gcd(5, 0)).toBe(5);
    });
  });
});
