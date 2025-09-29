/**
 * useSchemaValidation Hook Tests
 *
 * Tests for the useSchemaValidation hook including:
 * - Validation schema generation for create/edit modes
 * - Real-time name uniqueness checking with debouncing
 * - Field-level validation functions
 * - Error message handling and states
 * - Integration with React Query for schema data
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useSchemaValidation } from './useSchemaValidation';

// Mock the schema queries
jest.mock('../../services/schemaQueries.ts', () => ({
  useProjectSchemas: jest.fn(),
}));

const { useProjectSchemas } = require('../../services/schemaQueries.ts');

// Mock data
const mockExistingSchemas = [
  {
    id: 'schema-1',
    name: 'Existing Schema',
    description: 'An existing schema',
    version: '1.0.0',
    is_active: true,
    is_default: false,
    project_id: 'project-1',
    fields: [],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 'schema-2',
    name: 'Another Schema',
    description: 'Another schema',
    version: '1.0.0',
    is_active: true,
    is_default: true,
    project_id: 'project-1',
    fields: [],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSchemaValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for useProjectSchemas
    useProjectSchemas.mockReturnValue({
      data: { schemas: mockExistingSchemas },
      isLoading: false,
      error: null,
    });
  });

  describe('Validation Schema Generation', () => {
    it('returns create validation schema', () => {
      const { result } = renderHook(() => useSchemaValidation(), {
        wrapper: createWrapper(),
      });

      const createSchema = result.current.getValidationSchema('create');
      expect(createSchema).toBeDefined();

      // Should include fields specific to creation
      expect(createSchema.fields).toHaveProperty('name');
      expect(createSchema.fields).toHaveProperty('description');
      expect(createSchema.fields).toHaveProperty('project_id');
      expect(createSchema.fields).toHaveProperty('isGlobal');
      expect(createSchema.fields).toHaveProperty('is_default');
    });

    it('returns edit validation schema', () => {
      const { result } = renderHook(() => useSchemaValidation(), {
        wrapper: createWrapper(),
      });

      const editSchema = result.current.getValidationSchema('edit');
      expect(editSchema).toBeDefined();

      // Should only include fields for editing
      expect(editSchema.fields).toHaveProperty('name');
      expect(editSchema.fields).toHaveProperty('description');
      expect(editSchema.fields).not.toHaveProperty('project_id');
      expect(editSchema.fields).not.toHaveProperty('isGlobal');
    });

    it('provides individual field validation schemas', () => {
      const { result } = renderHook(() => useSchemaValidation(), {
        wrapper: createWrapper(),
      });

      expect(result.current.nameValidationSchema).toBeDefined();
      expect(result.current.descriptionValidationSchema).toBeDefined();
    });
  });

  describe('Name Uniqueness Validation', () => {
    it('identifies non-unique names correctly', async () => {
      const { result } = renderHook(() => useSchemaValidation({ projectId: 'project-1' }), {
        wrapper: createWrapper(),
      });

      let isUnique: boolean;
      await act(async () => {
        isUnique = await result.current.checkNameUniqueness('Existing Schema');
      });

      expect(isUnique!).toBe(false);
    });

    it('identifies unique names correctly', async () => {
      const { result } = renderHook(() => useSchemaValidation({ projectId: 'project-1' }), {
        wrapper: createWrapper(),
      });

      let isUnique: boolean;
      await act(async () => {
        isUnique = await result.current.checkNameUniqueness('Unique Schema Name');
      });

      expect(isUnique!).toBe(true);
    });

    it('excludes current schema in edit mode', async () => {
      const { result } = renderHook(() =>
        useSchemaValidation({
          projectId: 'project-1',
          excludeSchemaId: 'schema-1'
        }), {
        wrapper: createWrapper(),
      });

      let isUnique: boolean;
      await act(async () => {
        // Should be unique since we're excluding the current schema
        isUnique = await result.current.checkNameUniqueness('Existing Schema');
      });

      expect(isUnique!).toBe(true);
    });

    it('handles case-insensitive name matching', async () => {
      const { result } = renderHook(() => useSchemaValidation({ projectId: 'project-1' }), {
        wrapper: createWrapper(),
      });

      let isUnique: boolean;
      await act(async () => {
        isUnique = await result.current.checkNameUniqueness('EXISTING SCHEMA');
      });

      expect(isUnique!).toBe(false);
    });

    it('shows loading state during uniqueness check', async () => {
      const { result } = renderHook(() => useSchemaValidation({ projectId: 'project-1' }), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.checkNameUniqueness('Test Name');
      });

      expect(result.current.isCheckingUniqueness).toBe(true);

      await waitFor(() => {
        expect(result.current.isCheckingUniqueness).toBe(false);
      });
    });
  });

  describe('Real-time Field Validation', () => {
    it('validates name field with all constraints', async () => {
      const { result } = renderHook(() => useSchemaValidation({ projectId: 'project-1' }), {
        wrapper: createWrapper(),
      });

      // Test empty name
      let error: string | null;
      await act(async () => {
        error = await result.current.validateName('');
      });
      expect(error).toContain('required');

      // Test short name
      await act(async () => {
        error = await result.current.validateName('AB');
      });
      expect(error).toContain('at least 3 characters');

      // Test long name
      await act(async () => {
        error = await result.current.validateName('A'.repeat(101));
      });
      expect(error).toContain('less than 100 characters');

      // Test invalid characters
      await act(async () => {
        error = await result.current.validateName('Invalid@Name!');
      });
      expect(error).toContain('can only contain');

      // Test non-unique name
      await act(async () => {
        error = await result.current.validateName('Existing Schema');
      });
      expect(error).toContain('already exists');

      // Test valid unique name
      await act(async () => {
        error = await result.current.validateName('Valid Unique Name');
      });
      expect(error).toBeNull();
    });

    it('validates description field', () => {
      const { result } = renderHook(() => useSchemaValidation(), {
        wrapper: createWrapper(),
      });

      // Test valid description
      let error = result.current.validateDescription('Valid description');
      expect(error).toBeNull();

      // Test empty description (should be valid)
      error = result.current.validateDescription('');
      expect(error).toBeNull();

      // Test long description
      error = result.current.validateDescription('A'.repeat(501));
      expect(error).toContain('less than 500 characters');
    });

    it('debounces uniqueness checks', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() =>
        useSchemaValidation({ projectId: 'project-1', debounceMs: 300 }), {
        wrapper: createWrapper(),
      });

      // Make multiple rapid calls
      act(() => {
        result.current.validateName('Test1');
        result.current.validateName('Test2');
        result.current.validateName('Test3');
      });

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.isCheckingUniqueness).toBe(false);
      });

      jest.useRealTimers();
    });
  });

  describe('Form Validation', () => {
    it('validates complete create form data', async () => {
      const { result } = renderHook(() => useSchemaValidation({ projectId: 'project-1' }), {
        wrapper: createWrapper(),
      });

      const formData = {
        name: 'Valid Schema Name',
        description: 'Valid description',
        project_id: 'project-1',
        isGlobal: false,
        is_default: false,
      };

      let errors: Record<string, string>;
      await act(async () => {
        errors = await result.current.validateSchemaForm(formData, 'create');
      });

      expect(Object.keys(errors!)).toHaveLength(0);
    });

    it('validates complete edit form data', async () => {
      const { result } = renderHook(() => useSchemaValidation({ projectId: 'project-1' }), {
        wrapper: createWrapper(),
      });

      const formData = {
        name: 'Updated Schema Name',
        description: 'Updated description',
      };

      let errors: Record<string, string>;
      await act(async () => {
        errors = await result.current.validateSchemaForm(formData, 'edit');
      });

      expect(Object.keys(errors!)).toHaveLength(0);
    });

    it('returns validation errors for invalid form data', async () => {
      const { result } = renderHook(() => useSchemaValidation({ projectId: 'project-1' }), {
        wrapper: createWrapper(),
      });

      const invalidFormData = {
        name: '', // Invalid - required
        description: 'A'.repeat(501), // Invalid - too long
        project_id: '', // Invalid for non-global
        isGlobal: false,
        is_default: false,
      };

      let errors: Record<string, string>;
      await act(async () => {
        errors = await result.current.validateSchemaForm(invalidFormData, 'create');
      });

      expect(errors!.name).toContain('required');
      expect(errors!.description).toContain('less than 500 characters');
      expect(errors!.project_id).toContain('required');
    });
  });

  describe('Error State Management', () => {
    it('manages uniqueness error state correctly', async () => {
      const { result } = renderHook(() => useSchemaValidation({ projectId: 'project-1' }), {
        wrapper: createWrapper(),
      });

      // Initially no error
      expect(result.current.nameUniquenessError).toBeNull();

      // Check non-unique name
      await act(async () => {
        await result.current.validateName('Existing Schema');
      });

      expect(result.current.nameUniquenessError).toContain('already exists');
      expect(result.current.isNameUnique).toBe(false);

      // Check unique name
      await act(async () => {
        await result.current.validateName('Unique Name');
      });

      expect(result.current.nameUniquenessError).toBeNull();
      expect(result.current.isNameUnique).toBe(true);
    });

    it('clears error state when schemas are loading', () => {
      useProjectSchemas.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      const { result } = renderHook(() => useSchemaValidation({ projectId: 'project-1' }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isNameUnique).toBeNull();
      expect(result.current.nameUniquenessError).toBeNull();
    });
  });

  describe('Options Configuration', () => {
    it('handles missing projectId gracefully', async () => {
      const { result } = renderHook(() => useSchemaValidation(), {
        wrapper: createWrapper(),
      });

      // Should still work without projectId
      let isUnique: boolean;
      await act(async () => {
        isUnique = await result.current.checkNameUniqueness('Any Name');
      });

      expect(isUnique!).toBe(true); // No schemas to compare against
    });

    it('respects includeGlobal option', () => {
      const { result } = renderHook(() =>
        useSchemaValidation({
          projectId: 'project-1',
          includeGlobal: true
        }), {
        wrapper: createWrapper(),
      });

      // Should call useProjectSchemas with includeGlobal=true
      expect(useProjectSchemas).toHaveBeenCalledWith('project-1', true);
    });

    it('respects custom debounce timing', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() =>
        useSchemaValidation({ debounceMs: 500 }), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.validateName('Test Name');
      });

      // Should still be checking after 300ms
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(result.current.isCheckingUniqueness).toBe(true);

      // Should complete after 500ms
      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(result.current.isCheckingUniqueness).toBe(false);
      });

      jest.useRealTimers();
    });
  });

  describe('Edge Cases', () => {
    it('handles schema query errors gracefully', async () => {
      useProjectSchemas.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to load schemas'),
      });

      const { result } = renderHook(() => useSchemaValidation({ projectId: 'project-1' }), {
        wrapper: createWrapper(),
      });

      let isUnique: boolean;
      await act(async () => {
        isUnique = await result.current.checkNameUniqueness('Test Name');
      });

      // Should return true when unable to check (safe default)
      expect(isUnique!).toBe(true);
    });

    it('handles empty schema list', async () => {
      useProjectSchemas.mockReturnValue({
        data: { schemas: [] },
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useSchemaValidation({ projectId: 'project-1' }), {
        wrapper: createWrapper(),
      });

      let isUnique: boolean;
      await act(async () => {
        isUnique = await result.current.checkNameUniqueness('Any Name');
      });

      expect(isUnique!).toBe(true);
    });

    it('handles whitespace in name comparison', async () => {
      const { result } = renderHook(() => useSchemaValidation({ projectId: 'project-1' }), {
        wrapper: createWrapper(),
      });

      let isUnique: boolean;
      await act(async () => {
        isUnique = await result.current.checkNameUniqueness('  Existing Schema  ');
      });

      expect(isUnique!).toBe(false); // Should trim and match
    });
  });
});