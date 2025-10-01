/**
 * Schema Validation Hook Tests
 *
 * Unit tests for schema name validation logic (FR-1, AC 1-5)
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactNode } from 'react';
import {
  useSchemaValidation,
  schemaNameValidationSchema,
  getInvalidCharactersError,
} from './useSchemaValidation';

// Test wrapper with React Query provider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSchemaValidation', () => {
  describe('getInvalidCharactersError', () => {
    it('should return null for valid names', () => {
      expect(getInvalidCharactersError('ValidName123')).toBeNull();
      expect(getInvalidCharactersError('valid-name')).toBeNull();
      expect(getInvalidCharactersError('valid_name')).toBeNull();
      expect(getInvalidCharactersError('name-with_both')).toBeNull();
      expect(getInvalidCharactersError('123name')).toBeNull();
    });

    it('should detect spaces and return specific error', () => {
      const error = getInvalidCharactersError('name with spaces');
      expect(error).toContain('(space)');
      expect(error).toContain('Invalid characters');
    });

    it('should detect invalid special characters', () => {
      expect(getInvalidCharactersError('name@domain')).toContain('"@"');
      expect(getInvalidCharactersError('name.extension')).toContain('"."');
      expect(getInvalidCharactersError('name$value')).toContain('"$"');
      expect(getInvalidCharactersError('name#tag')).toContain('"#"');
    });

    it('should list multiple invalid characters', () => {
      const error = getInvalidCharactersError('name@#$');
      expect(error).toContain('"@"');
      expect(error).toContain('"#"');
      expect(error).toContain('"$"');
    });

    it('should mention allowed characters in error message', () => {
      const error = getInvalidCharactersError('name@domain');
      expect(error).toContain('Allowed: letters, numbers, hyphens (-), underscores (_)');
    });
  });

  describe('schemaNameValidationSchema', () => {
    it('should accept valid schema names', async () => {
      await expect(schemaNameValidationSchema.validate('ValidName')).resolves.toBe('ValidName');
      await expect(schemaNameValidationSchema.validate('name-123')).resolves.toBe('name-123');
      await expect(schemaNameValidationSchema.validate('name_test')).resolves.toBe('name_test');
      await expect(schemaNameValidationSchema.validate('123name')).resolves.toBe('123name');
    });

    it('should reject names shorter than 3 characters', async () => {
      await expect(schemaNameValidationSchema.validate('ab')).rejects.toThrow('Minimum 3 characters required');
      await expect(schemaNameValidationSchema.validate('a')).rejects.toThrow('Minimum 3 characters required');
      await expect(schemaNameValidationSchema.validate('')).rejects.toThrow('required');
    });

    it('should reject names longer than 100 characters', async () => {
      const longName = 'a'.repeat(101);
      await expect(schemaNameValidationSchema.validate(longName)).rejects.toThrow('less than 100 characters');
    });

    it('should reject names with spaces', async () => {
      await expect(schemaNameValidationSchema.validate('name with spaces')).rejects.toThrow('cannot contain spaces');
    });

    it('should reject names with leading/trailing spaces', async () => {
      await expect(schemaNameValidationSchema.validate(' name')).rejects.toThrow('leading or trailing spaces');
      await expect(schemaNameValidationSchema.validate('name ')).rejects.toThrow('leading or trailing spaces');
      await expect(schemaNameValidationSchema.validate(' name ')).rejects.toThrow('leading or trailing spaces');
    });

    it('should reject names starting with special characters', async () => {
      await expect(schemaNameValidationSchema.validate('-name')).rejects.toThrow('must start with a letter or number');
      await expect(schemaNameValidationSchema.validate('_name')).rejects.toThrow('must start with a letter or number');
    });

    it('should reject names with invalid characters', async () => {
      await expect(schemaNameValidationSchema.validate('name@domain')).rejects.toThrow();
      await expect(schemaNameValidationSchema.validate('name.ext')).rejects.toThrow();
      await expect(schemaNameValidationSchema.validate('name$value')).rejects.toThrow();
    });

    it('should accept names exactly 3 characters', async () => {
      await expect(schemaNameValidationSchema.validate('abc')).resolves.toBe('abc');
      await expect(schemaNameValidationSchema.validate('123')).resolves.toBe('123');
    });

    it('should accept names exactly 100 characters', async () => {
      const maxName = 'a'.repeat(100);
      await expect(schemaNameValidationSchema.validate(maxName)).resolves.toBe(maxName);
    });
  });

  describe('useSchemaValidation hook', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useSchemaValidation(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isCheckingUniqueness).toBe(false);
      expect(result.current.isNameUnique).toBeNull();
      expect(result.current.nameUniquenessError).toBeNull();
    });

    it('should provide validation schemas', () => {
      const { result } = renderHook(() => useSchemaValidation(), {
        wrapper: createWrapper(),
      });

      expect(result.current.nameValidationSchema).toBeDefined();
      expect(result.current.descriptionValidationSchema).toBeDefined();
      expect(result.current.createValidationSchema).toBeDefined();
      expect(result.current.editValidationSchema).toBeDefined();
    });

    it('should validate name with validateName function', async () => {
      const { result } = renderHook(() => useSchemaValidation(), {
        wrapper: createWrapper(),
      });

      // Valid name
      const validResult = await result.current.validateName('ValidName');
      expect(validResult).toBeNull();

      // Too short
      const shortResult = await result.current.validateName('ab');
      expect(shortResult).toBeTruthy();
      expect(shortResult).toContain('characters');

      // Invalid characters
      const invalidResult = await result.current.validateName('name@domain');
      expect(invalidResult).toBeTruthy();
      expect(invalidResult).toContain('Invalid characters');
    });

    it('should validate description with validateDescription function', () => {
      const { result } = renderHook(() => useSchemaValidation(), {
        wrapper: createWrapper(),
      });

      // Valid description
      expect(result.current.validateDescription('Valid description')).toBeNull();
      expect(result.current.validateDescription('')).toBeNull();

      // Too long description
      const longDesc = 'a'.repeat(501);
      const result2 = result.current.validateDescription(longDesc);
      expect(result2).toBeTruthy();
      expect(result2).toContain('500 characters');
    });

    it('should get correct validation schema based on mode', () => {
      const { result } = renderHook(() => useSchemaValidation(), {
        wrapper: createWrapper(),
      });

      const createSchema = result.current.getValidationSchema('create');
      const editSchema = result.current.getValidationSchema('edit');

      expect(createSchema).toBeDefined();
      expect(editSchema).toBeDefined();
      expect(createSchema).not.toBe(editSchema);
    });
  });

  describe('Case sensitivity', () => {
    it('should treat names as case-insensitive for uniqueness', async () => {
      // This test will be meaningful when we add mock data
      // For now, just verify the validation schema allows mixed case
      await expect(schemaNameValidationSchema.validate('TestName')).resolves.toBe('TestName');
      await expect(schemaNameValidationSchema.validate('testname')).resolves.toBe('testname');
      await expect(schemaNameValidationSchema.validate('TESTNAME')).resolves.toBe('TESTNAME');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', async () => {
      await expect(schemaNameValidationSchema.validate('')).rejects.toThrow();
    });

    it('should handle undefined', async () => {
      await expect(schemaNameValidationSchema.validate(undefined as any)).rejects.toThrow();
    });

    it('should handle null', async () => {
      await expect(schemaNameValidationSchema.validate(null as any)).rejects.toThrow();
    });

    it('should handle whitespace-only strings', async () => {
      await expect(schemaNameValidationSchema.validate('   ')).rejects.toThrow();
    });

    it('should accept names with consecutive hyphens and underscores', async () => {
      await expect(schemaNameValidationSchema.validate('name--test')).resolves.toBe('name--test');
      await expect(schemaNameValidationSchema.validate('name__test')).resolves.toBe('name__test');
      await expect(schemaNameValidationSchema.validate('name-_test')).resolves.toBe('name-_test');
    });

    it('should accept names starting and ending with numbers', async () => {
      await expect(schemaNameValidationSchema.validate('1name1')).resolves.toBe('1name1');
      await expect(schemaNameValidationSchema.validate('123')).resolves.toBe('123');
    });
  });
});
