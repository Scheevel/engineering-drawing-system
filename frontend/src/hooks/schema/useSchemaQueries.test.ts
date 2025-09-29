/**
 * Schema Queries Hook Tests
 *
 * Tests for React Query hooks with optimistic mutations, caching,
 * error handling, and background refetching.
 */

import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import React from 'react';
import {
  useSchemaQuery,
  useSchemasQuery,
  useCreateSchemaMutation,
  useUpdateSchemaMutation,
  useDeleteSchemaMutation,
  useFieldsQuery,
  useCreateFieldMutation,
  useUpdateFieldMutation,
  useDeleteFieldMutation,
  useReorderFieldsMutation,
  useBatchUpdateFieldsMutation,
  useSchemaValidationQuery,
  useSchemaExportMutation,
  useSchemaImportMutation,
} from './useSchemaQueries';
import { ComponentSchema, ComponentSchemaField } from '../../types/schema';

// Mock API service
const mockApi = {
  getSchema: jest.fn(),
  getSchemas: jest.fn(),
  createSchema: jest.fn(),
  updateSchema: jest.fn(),
  deleteSchema: jest.fn(),
  getFields: jest.fn(),
  createField: jest.fn(),
  updateField: jest.fn(),
  deleteField: jest.fn(),
  reorderFields: jest.fn(),
  batchUpdateFields: jest.fn(),
  validateSchema: jest.fn(),
  exportSchema: jest.fn(),
  importSchema: jest.fn(),
};

jest.mock('../../services/api', () => mockApi);

// Test data
const mockSchema: ComponentSchema = {
  id: 'schema-123',
  name: 'Test Schema',
  description: 'Test description',
  project_id: 'project-456',
  version: 1,
  fields: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  is_active: true,
};

const mockField: ComponentSchemaField = {
  id: 'field-123',
  schema_id: 'schema-123',
  field_name: 'test_field',
  field_type: 'text',
  display_order: 1,
  is_required: false,
  help_text: 'Test help text',
  validation_rules: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useSchemaQueries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query Hooks', () => {
    describe('useSchemaQuery', () => {
      it('should fetch schema data', async () => {
        mockApi.getSchema.mockResolvedValue(mockSchema);

        const { result, waitFor } = renderHook(
          () => useSchemaQuery('schema-123'),
          { wrapper: TestWrapper }
        );

        expect(result.current.isLoading).toBe(true);

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.data).toEqual(mockSchema);
        expect(mockApi.getSchema).toHaveBeenCalledWith('schema-123');
      });

      it('should handle query errors', async () => {
        const error = new Error('Schema not found');
        mockApi.getSchema.mockRejectedValue(error);

        const { result, waitFor } = renderHook(
          () => useSchemaQuery('schema-123'),
          { wrapper: TestWrapper }
        );

        await waitFor(() => {
          expect(result.current.isError).toBe(true);
        });

        expect(result.current.error).toBe(error);
      });

      it('should not fetch when schema ID is not provided', () => {
        renderHook(
          () => useSchemaQuery(null),
          { wrapper: TestWrapper }
        );

        expect(mockApi.getSchema).not.toHaveBeenCalled();
      });

      it('should refetch when schema ID changes', async () => {
        mockApi.getSchema.mockResolvedValue(mockSchema);

        const { result, rerender, waitFor } = renderHook(
          ({ schemaId }: { schemaId: string }) => useSchemaQuery(schemaId),
          {
            wrapper: TestWrapper,
            initialProps: { schemaId: 'schema-123' },
          }
        );

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockApi.getSchema).toHaveBeenCalledWith('schema-123');

        // Change schema ID
        rerender({ schemaId: 'schema-456' });

        await waitFor(() => {
          expect(mockApi.getSchema).toHaveBeenCalledWith('schema-456');
        });

        expect(mockApi.getSchema).toHaveBeenCalledTimes(2);
      });
    });

    describe('useSchemasQuery', () => {
      it('should fetch schemas list', async () => {
        const schemas = [mockSchema];
        mockApi.getSchemas.mockResolvedValue(schemas);

        const { result, waitFor } = renderHook(
          () => useSchemasQuery('project-456'),
          { wrapper: TestWrapper }
        );

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(schemas);
        expect(mockApi.getSchemas).toHaveBeenCalledWith('project-456');
      });

      it('should handle filters and sorting', async () => {
        const schemas = [mockSchema];
        mockApi.getSchemas.mockResolvedValue(schemas);

        const filters = { is_active: true };
        const sort = { field: 'name', direction: 'asc' as const };

        renderHook(
          () => useSchemasQuery('project-456', { filters, sort }),
          { wrapper: TestWrapper }
        );

        expect(mockApi.getSchemas).toHaveBeenCalledWith('project-456', { filters, sort });
      });
    });

    describe('useFieldsQuery', () => {
      it('should fetch schema fields', async () => {
        const fields = [mockField];
        mockApi.getFields.mockResolvedValue(fields);

        const { result, waitFor } = renderHook(
          () => useFieldsQuery('schema-123'),
          { wrapper: TestWrapper }
        );

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(fields);
        expect(mockApi.getFields).toHaveBeenCalledWith('schema-123');
      });

      it('should invalidate fields when schema changes', async () => {
        const queryClient = new QueryClient();
        const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

        const { result, waitFor } = renderHook(
          () => useFieldsQuery('schema-123'),
          {
            wrapper: ({ children }) =>
              React.createElement(QueryClientProvider, { client: queryClient }, children),
          }
        );

        // Simulate schema update that should invalidate fields
        act(() => {
          queryClient.setQueryData(['schema', 'schema-123'], {
            ...mockSchema,
            updated_at: '2024-01-02T00:00:00Z',
          });
        });

        expect(invalidateSpy).toHaveBeenCalledWith(['fields', 'schema-123']);
      });
    });

    describe('useSchemaValidationQuery', () => {
      it('should validate schema', async () => {
        const validationResult = {
          isValid: true,
          errors: [],
          warnings: [],
        };

        mockApi.validateSchema.mockResolvedValue(validationResult);

        const { result, waitFor } = renderHook(
          () => useSchemaValidationQuery('schema-123'),
          { wrapper: TestWrapper }
        );

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(validationResult);
        expect(mockApi.validateSchema).toHaveBeenCalledWith('schema-123');
      });

      it('should handle validation errors', async () => {
        const validationResult = {
          isValid: false,
          errors: ['Field name is required'],
          warnings: ['Consider adding help text'],
        };

        mockApi.validateSchema.mockResolvedValue(validationResult);

        const { result, waitFor } = renderHook(
          () => useSchemaValidationQuery('schema-123'),
          { wrapper: TestWrapper }
        );

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.isValid).toBe(false);
        expect(result.current.data?.errors).toEqual(['Field name is required']);
      });
    });
  });

  describe('Mutation Hooks', () => {
    describe('useCreateSchemaMutation', () => {
      it('should create schema', async () => {
        const newSchema = { ...mockSchema, id: 'new-schema' };
        mockApi.createSchema.mockResolvedValue(newSchema);

        const { result } = renderHook(
          () => useCreateSchemaMutation(),
          { wrapper: TestWrapper }
        );

        await act(async () => {
          const createdSchema = await result.current.mutateAsync({
            name: 'New Schema',
            description: 'New description',
            project_id: 'project-456',
          });

          expect(createdSchema).toEqual(newSchema);
        });

        expect(mockApi.createSchema).toHaveBeenCalledWith({
          name: 'New Schema',
          description: 'New description',
          project_id: 'project-456',
        });
      });

      it('should invalidate related queries on success', async () => {
        const queryClient = new QueryClient();
        const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

        mockApi.createSchema.mockResolvedValue(mockSchema);

        const { result } = renderHook(
          () => useCreateSchemaMutation(),
          {
            wrapper: ({ children }) =>
              React.createElement(QueryClientProvider, { client: queryClient }, children),
          }
        );

        await act(async () => {
          await result.current.mutateAsync({
            name: 'New Schema',
            project_id: 'project-456',
          });
        });

        expect(invalidateSpy).toHaveBeenCalledWith(['schemas', 'project-456']);
      });
    });

    describe('useUpdateSchemaMutation', () => {
      it('should update schema', async () => {
        const updatedSchema = { ...mockSchema, name: 'Updated Schema' };
        mockApi.updateSchema.mockResolvedValue(updatedSchema);

        const { result } = renderHook(
          () => useUpdateSchemaMutation(),
          { wrapper: TestWrapper }
        );

        await act(async () => {
          const updated = await result.current.mutateAsync(updatedSchema);
          expect(updated).toEqual(updatedSchema);
        });

        expect(mockApi.updateSchema).toHaveBeenCalledWith(updatedSchema);
      });

      it('should update cache optimistically', async () => {
        const queryClient = new QueryClient();
        const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData');

        mockApi.updateSchema.mockResolvedValue(mockSchema);

        // Pre-populate cache
        queryClient.setQueryData(['schema', 'schema-123'], mockSchema);

        const { result } = renderHook(
          () => useUpdateSchemaMutation(),
          {
            wrapper: ({ children }) =>
              React.createElement(QueryClientProvider, { client: queryClient }, children),
          }
        );

        const updatedSchema = { ...mockSchema, name: 'Updated Schema' };

        await act(async () => {
          await result.current.mutateAsync(updatedSchema);
        });

        expect(setQueryDataSpy).toHaveBeenCalledWith(
          ['schema', 'schema-123'],
          updatedSchema
        );
      });
    });

    describe('useDeleteSchemaMutation', () => {
      it('should delete schema', async () => {
        mockApi.deleteSchema.mockResolvedValue({ success: true });

        const { result } = renderHook(
          () => useDeleteSchemaMutation(),
          { wrapper: TestWrapper }
        );

        await act(async () => {
          const result_val = await result.current.mutateAsync('schema-123');
          expect(result_val).toEqual({ success: true });
        });

        expect(mockApi.deleteSchema).toHaveBeenCalledWith('schema-123');
      });

      it('should remove from cache on success', async () => {
        const queryClient = new QueryClient();
        const removeQueriesSpy = jest.spyOn(queryClient, 'removeQueries');

        mockApi.deleteSchema.mockResolvedValue({ success: true });

        queryClient.setQueryData(['schema', 'schema-123'], mockSchema);

        const { result } = renderHook(
          () => useDeleteSchemaMutation(),
          {
            wrapper: ({ children }) =>
              React.createElement(QueryClientProvider, { client: queryClient }, children),
          }
        );

        await act(async () => {
          await result.current.mutateAsync('schema-123');
        });

        expect(removeQueriesSpy).toHaveBeenCalledWith(['schema', 'schema-123']);
      });
    });

    describe('Field Mutations', () => {
      describe('useCreateFieldMutation', () => {
        it('should create field', async () => {
          const newField = { ...mockField, id: 'new-field' };
          mockApi.createField.mockResolvedValue(newField);

          const { result } = renderHook(
            () => useCreateFieldMutation(),
            { wrapper: TestWrapper }
          );

          await act(async () => {
            const created = await result.current.mutateAsync({
              schema_id: 'schema-123',
              field_name: 'new_field',
              field_type: 'text',
              display_order: 1,
            });

            expect(created).toEqual(newField);
          });

          expect(mockApi.createField).toHaveBeenCalledWith({
            schema_id: 'schema-123',
            field_name: 'new_field',
            field_type: 'text',
            display_order: 1,
          });
        });

        it('should add field to cache optimistically', async () => {
          const queryClient = new QueryClient();
          const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData');

          mockApi.createField.mockResolvedValue(mockField);

          // Pre-populate cache with empty fields
          queryClient.setQueryData(['fields', 'schema-123'], []);

          const { result } = renderHook(
            () => useCreateFieldMutation(),
            {
              wrapper: ({ children }) =>
                React.createElement(QueryClientProvider, { client: queryClient }, children),
            }
          );

          await act(async () => {
            await result.current.mutateAsync({
              schema_id: 'schema-123',
              field_name: 'new_field',
              field_type: 'text',
              display_order: 1,
            });
          });

          expect(setQueryDataSpy).toHaveBeenCalledWith(
            ['fields', 'schema-123'],
            [mockField]
          );
        });
      });

      describe('useUpdateFieldMutation', () => {
        it('should update field', async () => {
          const updatedField = { ...mockField, field_name: 'updated_field' };
          mockApi.updateField.mockResolvedValue(updatedField);

          const { result } = renderHook(
            () => useUpdateFieldMutation(),
            { wrapper: TestWrapper }
          );

          await act(async () => {
            const updated = await result.current.mutateAsync(updatedField);
            expect(updated).toEqual(updatedField);
          });

          expect(mockApi.updateField).toHaveBeenCalledWith(updatedField);
        });
      });

      describe('useDeleteFieldMutation', () => {
        it('should delete field', async () => {
          mockApi.deleteField.mockResolvedValue({ success: true });

          const { result } = renderHook(
            () => useDeleteFieldMutation(),
            { wrapper: TestWrapper }
          );

          await act(async () => {
            const result_val = await result.current.mutateAsync('field-123');
            expect(result_val).toEqual({ success: true });
          });

          expect(mockApi.deleteField).toHaveBeenCalledWith('field-123');
        });

        it('should remove field from cache', async () => {
          const queryClient = new QueryClient();
          const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData');

          mockApi.deleteField.mockResolvedValue({ success: true });

          // Pre-populate cache with field
          queryClient.setQueryData(['fields', 'schema-123'], [mockField]);

          const { result } = renderHook(
            () => useDeleteFieldMutation(),
            {
              wrapper: ({ children }) =>
                React.createElement(QueryClientProvider, { client: queryClient }, children),
            }
          );

          await act(async () => {
            await result.current.mutateAsync('field-123');
          });

          expect(setQueryDataSpy).toHaveBeenCalledWith(['fields', 'schema-123'], []);
        });
      });

      describe('useReorderFieldsMutation', () => {
        it('should reorder fields', async () => {
          const reorderData = {
            schemaId: 'schema-123',
            fieldOrder: [
              { id: 'field-2', display_order: 1 },
              { id: 'field-1', display_order: 2 },
            ],
          };

          mockApi.reorderFields.mockResolvedValue({ success: true });

          const { result } = renderHook(
            () => useReorderFieldsMutation(),
            { wrapper: TestWrapper }
          );

          await act(async () => {
            const result_val = await result.current.mutateAsync(reorderData);
            expect(result_val).toEqual({ success: true });
          });

          expect(mockApi.reorderFields).toHaveBeenCalledWith(reorderData);
        });

        it('should update field order in cache', async () => {
          const queryClient = new QueryClient();
          const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData');

          const field1 = { ...mockField, id: 'field-1', display_order: 1 };
          const field2 = { ...mockField, id: 'field-2', display_order: 2 };

          mockApi.reorderFields.mockResolvedValue({ success: true });

          // Pre-populate cache
          queryClient.setQueryData(['fields', 'schema-123'], [field1, field2]);

          const { result } = renderHook(
            () => useReorderFieldsMutation(),
            {
              wrapper: ({ children }) =>
                React.createElement(QueryClientProvider, { client: queryClient }, children),
            }
          );

          await act(async () => {
            await result.current.mutateAsync({
              schemaId: 'schema-123',
              fieldOrder: [
                { id: 'field-2', display_order: 1 },
                { id: 'field-1', display_order: 2 },
              ],
            });
          });

          expect(setQueryDataSpy).toHaveBeenCalledWith(
            ['fields', 'schema-123'],
            [
              { ...field2, display_order: 1 },
              { ...field1, display_order: 2 },
            ]
          );
        });
      });

      describe('useBatchUpdateFieldsMutation', () => {
        it('should batch update fields', async () => {
          const updates = [
            { ...mockField, field_name: 'updated_1' },
            { ...mockField, id: 'field-2', field_name: 'updated_2' },
          ];

          mockApi.batchUpdateFields.mockResolvedValue({ success: true, updated: updates });

          const { result } = renderHook(
            () => useBatchUpdateFieldsMutation(),
            { wrapper: TestWrapper }
          );

          await act(async () => {
            const result_val = await result.current.mutateAsync(updates);
            expect(result_val).toEqual({ success: true, updated: updates });
          });

          expect(mockApi.batchUpdateFields).toHaveBeenCalledWith(updates);
        });

        it('should update multiple fields in cache', async () => {
          const queryClient = new QueryClient();
          const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData');

          const field1 = { ...mockField, id: 'field-1' };
          const field2 = { ...mockField, id: 'field-2' };

          mockApi.batchUpdateFields.mockResolvedValue({ success: true });

          // Pre-populate cache
          queryClient.setQueryData(['fields', 'schema-123'], [field1, field2]);

          const { result } = renderHook(
            () => useBatchUpdateFieldsMutation(),
            {
              wrapper: ({ children }) =>
                React.createElement(QueryClientProvider, { client: queryClient }, children),
            }
          );

          const updates = [
            { ...field1, field_name: 'updated_1' },
            { ...field2, field_name: 'updated_2' },
          ];

          await act(async () => {
            await result.current.mutateAsync(updates);
          });

          expect(setQueryDataSpy).toHaveBeenCalledWith(['fields', 'schema-123'], updates);
        });
      });
    });

    describe('Import/Export Mutations', () => {
      describe('useSchemaExportMutation', () => {
        it('should export schema', async () => {
          const exportData = {
            schema: mockSchema,
            fields: [mockField],
            format: 'json' as const,
          };

          mockApi.exportSchema.mockResolvedValue(exportData);

          const { result } = renderHook(
            () => useSchemaExportMutation(),
            { wrapper: TestWrapper }
          );

          await act(async () => {
            const exported = await result.current.mutateAsync({
              schemaId: 'schema-123',
              format: 'json',
              includeFields: true,
            });

            expect(exported).toEqual(exportData);
          });

          expect(mockApi.exportSchema).toHaveBeenCalledWith({
            schemaId: 'schema-123',
            format: 'json',
            includeFields: true,
          });
        });
      });

      describe('useSchemaImportMutation', () => {
        it('should import schema', async () => {
          const importResult = {
            schema: mockSchema,
            fieldsCreated: 5,
            warnings: [],
          };

          mockApi.importSchema.mockResolvedValue(importResult);

          const { result } = renderHook(
            () => useSchemaImportMutation(),
            { wrapper: TestWrapper }
          );

          const importData = {
            projectId: 'project-456',
            data: { schema: mockSchema, fields: [mockField] },
            options: { overwriteExisting: false },
          };

          await act(async () => {
            const imported = await result.current.mutateAsync(importData);
            expect(imported).toEqual(importResult);
          });

          expect(mockApi.importSchema).toHaveBeenCalledWith(importData);
        });

        it('should invalidate related queries after import', async () => {
          const queryClient = new QueryClient();
          const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

          mockApi.importSchema.mockResolvedValue({
            schema: mockSchema,
            fieldsCreated: 5,
            warnings: [],
          });

          const { result } = renderHook(
            () => useSchemaImportMutation(),
            {
              wrapper: ({ children }) =>
                React.createElement(QueryClientProvider, { client: queryClient }, children),
            }
          );

          await act(async () => {
            await result.current.mutateAsync({
              projectId: 'project-456',
              data: { schema: mockSchema, fields: [mockField] },
              options: { overwriteExisting: false },
            });
          });

          expect(invalidateSpy).toHaveBeenCalledWith(['schemas', 'project-456']);
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockApi.getSchema.mockRejectedValue(networkError);

      const { result, waitFor } = renderHook(
        () => useSchemaQuery('schema-123'),
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(networkError);
    });

    it('should handle mutation errors', async () => {
      const validationError = new Error('Validation failed');
      mockApi.createSchema.mockRejectedValue(validationError);

      const { result } = renderHook(
        () => useCreateSchemaMutation(),
        { wrapper: TestWrapper }
      );

      await act(async () => {
        try {
          await result.current.mutateAsync({
            name: 'Invalid Schema',
            project_id: 'project-456',
          });
        } catch (error) {
          expect(error).toBe(validationError);
        }
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(validationError);
    });

    it('should rollback optimistic updates on error', async () => {
      const queryClient = new QueryClient();
      const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData');

      const error = new Error('Update failed');
      mockApi.updateSchema.mockRejectedValue(error);

      // Pre-populate cache
      queryClient.setQueryData(['schema', 'schema-123'], mockSchema);

      const { result } = renderHook(
        () => useUpdateSchemaMutation(),
        {
          wrapper: ({ children }) =>
            React.createElement(QueryClientProvider, { client: queryClient }, children),
        }
      );

      const updatedSchema = { ...mockSchema, name: 'Updated Schema' };

      await act(async () => {
        try {
          await result.current.mutateAsync(updatedSchema);
        } catch (err) {
          // Expected to fail
        }
      });

      // Should rollback to original data
      expect(setQueryDataSpy).toHaveBeenCalledWith(['schema', 'schema-123'], mockSchema);
    });
  });

  describe('Background Refetching', () => {
    it('should refetch stale queries in background', async () => {
      mockApi.getSchema.mockResolvedValue(mockSchema);

      const { result, waitFor } = renderHook(
        () => useSchemaQuery('schema-123', { staleTime: 0 }),
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Clear mock to track refetch
      mockApi.getSchema.mockClear();

      // Trigger background refetch by accessing the query again
      await act(async () => {
        result.current.refetch();
      });

      expect(mockApi.getSchema).toHaveBeenCalledTimes(1);
    });

    it('should handle background refetch errors gracefully', async () => {
      mockApi.getSchema
        .mockResolvedValueOnce(mockSchema)
        .mockRejectedValueOnce(new Error('Background fetch failed'));

      const { result, waitFor } = renderHook(
        () => useSchemaQuery('schema-123'),
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Trigger background refetch
      await act(async () => {
        await result.current.refetch();
      });

      // Should still have the previous data
      expect(result.current.data).toEqual(mockSchema);
      expect(result.current.isError).toBe(true);
    });
  });

  describe('Cache Management', () => {
    it('should invalidate dependent queries', async () => {
      const queryClient = new QueryClient();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      mockApi.updateSchema.mockResolvedValue(mockSchema);

      const { result } = renderHook(
        () => useUpdateSchemaMutation(),
        {
          wrapper: ({ children }) =>
            React.createElement(QueryClientProvider, { client: queryClient }, children),
        }
      );

      await act(async () => {
        await result.current.mutateAsync(mockSchema);
      });

      expect(invalidateSpy).toHaveBeenCalledWith(['schemas', mockSchema.project_id]);
      expect(invalidateSpy).toHaveBeenCalledWith(['fields', mockSchema.id]);
    });

    it('should prefetch related data', async () => {
      const queryClient = new QueryClient();
      const prefetchSpy = jest.spyOn(queryClient, 'prefetchQuery');

      mockApi.getSchema.mockResolvedValue(mockSchema);

      const { waitFor } = renderHook(
        () => useSchemaQuery('schema-123', { prefetchFields: true }),
        {
          wrapper: ({ children }) =>
            React.createElement(QueryClientProvider, { client: queryClient }, children),
        }
      );

      await waitFor(() => {
        expect(prefetchSpy).toHaveBeenCalledWith(['fields', 'schema-123'], expect.any(Function));
      });
    });
  });
});