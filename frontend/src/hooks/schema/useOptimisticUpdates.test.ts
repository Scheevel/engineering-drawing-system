/**
 * Optimistic Updates Hook Tests
 *
 * Tests for React Query optimistic mutations with rollback mechanisms,
 * visual feedback, and error handling.
 */

import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import React from 'react';
import {
  useOptimisticUpdates,
  useOptimisticFieldUpdate,
  useOptimisticSchemaUpdate,
  useOptimisticFieldDelete,
  useOptimisticFieldReorder,
  type OptimisticUpdateConfig,
} from './useOptimisticUpdates';
import { ComponentSchema, ComponentSchemaField } from '../../types/schema';

// Mock the schema queries hooks
const mockUpdateField = jest.fn();
const mockUpdateSchema = jest.fn();
const mockDeleteField = jest.fn();
const mockReorderFields = jest.fn();
const mockQueryClient = {
  getQueryData: jest.fn(),
  setQueryData: jest.fn(),
  invalidateQueries: jest.fn(),
  cancelQueries: jest.fn(),
};

jest.mock('./useSchemaQueries', () => ({
  useUpdateFieldMutation: () => ({
    mutateAsync: mockUpdateField,
    isLoading: false,
  }),
  useUpdateSchemaMutation: () => ({
    mutateAsync: mockUpdateSchema,
    isLoading: false,
  }),
  useDeleteFieldMutation: () => ({
    mutateAsync: mockDeleteField,
    isLoading: false,
  }),
  useReorderFieldsMutation: () => ({
    mutateAsync: mockReorderFields,
    isLoading: false,
  }),
}));

jest.mock('react-query', () => ({
  ...jest.requireActual('react-query'),
  useQueryClient: () => mockQueryClient,
}));

// Test data
const mockSchema: ComponentSchema = {
  id: 'schema-123',
  name: 'Test Schema',
  description: 'Test description',
  project_id: 'project-456',
  version: 1,
  fields: [
    {
      id: 'field-1',
      schema_id: 'schema-123',
      field_name: 'field_1',
      field_type: 'text',
      display_order: 1,
      is_required: false,
      help_text: null,
      validation_rules: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'field-2',
      schema_id: 'schema-123',
      field_name: 'field_2',
      field_type: 'number',
      display_order: 2,
      is_required: true,
      help_text: null,
      validation_rules: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  is_active: true,
};

const mockField = mockSchema.fields[0];

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false },
    },
  });

  return React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useOptimisticUpdates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Setup default successful responses
    mockUpdateField.mockResolvedValue({ success: true });
    mockUpdateSchema.mockResolvedValue({ success: true });
    mockDeleteField.mockResolvedValue({ success: true });
    mockReorderFields.mockResolvedValue({ success: true });

    // Setup default query data
    mockQueryClient.getQueryData.mockReturnValue(mockSchema);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('useOptimisticUpdates Hook', () => {
    it('should initialize with default config', () => {
      const { result } = renderHook(() => useOptimisticUpdates(), {
        wrapper: TestWrapper,
      });

      expect(result.current.isOptimisticUpdate).toBe(false);
      expect(result.current.optimisticOperations).toEqual([]);
      expect(result.current.rollbackCount).toBe(0);
    });

    it('should start optimistic update', () => {
      const { result } = renderHook(() => useOptimisticUpdates(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.startOptimisticUpdate('field-update', 'field-1');
      });

      expect(result.current.isOptimisticUpdate).toBe(true);
      expect(result.current.optimisticOperations).toHaveLength(1);
      expect(result.current.optimisticOperations[0]).toEqual({
        id: expect.any(String),
        type: 'field-update',
        entityId: 'field-1',
        timestamp: expect.any(Number),
        status: 'pending',
      });
    });

    it('should end optimistic update on success', () => {
      const { result } = renderHook(() => useOptimisticUpdates(), {
        wrapper: TestWrapper,
      });

      let operationId: string;

      act(() => {
        operationId = result.current.startOptimisticUpdate('field-update', 'field-1');
      });

      act(() => {
        result.current.endOptimisticUpdate(operationId, true);
      });

      expect(result.current.isOptimisticUpdate).toBe(false);
      expect(result.current.optimisticOperations).toHaveLength(0);
    });

    it('should handle optimistic update failure with rollback', () => {
      const rollbackFn = jest.fn();
      const { result } = renderHook(() => useOptimisticUpdates(), {
        wrapper: TestWrapper,
      });

      let operationId: string;

      act(() => {
        operationId = result.current.startOptimisticUpdate('field-update', 'field-1', rollbackFn);
      });

      act(() => {
        result.current.endOptimisticUpdate(operationId, false, new Error('Update failed'));
      });

      expect(result.current.isOptimisticUpdate).toBe(false);
      expect(result.current.rollbackCount).toBe(1);
      expect(rollbackFn).toHaveBeenCalled();
    });

    it('should auto-timeout optimistic updates', () => {
      const rollbackFn = jest.fn();
      const config: OptimisticUpdateConfig = {
        timeoutMs: 5000,
        maxConcurrentUpdates: 10,
        enableVisualFeedback: true,
      };

      const { result } = renderHook(() => useOptimisticUpdates(config), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.startOptimisticUpdate('field-update', 'field-1', rollbackFn);
      });

      expect(result.current.isOptimisticUpdate).toBe(true);

      // Fast-forward past timeout
      act(() => {
        jest.advanceTimersByTime(6000);
      });

      expect(result.current.isOptimisticUpdate).toBe(false);
      expect(result.current.rollbackCount).toBe(1);
      expect(rollbackFn).toHaveBeenCalled();
    });

    it('should limit concurrent optimistic updates', () => {
      const config: OptimisticUpdateConfig = {
        maxConcurrentUpdates: 2,
      };

      const { result } = renderHook(() => useOptimisticUpdates(config), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.startOptimisticUpdate('field-update', 'field-1');
        result.current.startOptimisticUpdate('field-update', 'field-2');
        result.current.startOptimisticUpdate('field-update', 'field-3'); // Should be rejected
      });

      expect(result.current.optimisticOperations).toHaveLength(2);
    });

    it('should provide visual feedback during optimistic updates', () => {
      const config: OptimisticUpdateConfig = {
        enableVisualFeedback: true,
      };

      const { result } = renderHook(() => useOptimisticUpdates(config), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.startOptimisticUpdate('field-update', 'field-1');
      });

      expect(result.current.getVisualFeedback('field-1')).toEqual({
        isOptimistic: true,
        type: 'field-update',
        timestamp: expect.any(Number),
        status: 'pending',
      });
    });
  });

  describe('useOptimisticFieldUpdate', () => {
    it('should perform optimistic field update', async () => {
      const { result } = renderHook(() => useOptimisticFieldUpdate(), {
        wrapper: TestWrapper,
      });

      const updatedField = { ...mockField, field_name: 'updated_field' };

      await act(async () => {
        await result.current.updateField(updatedField);
      });

      // Should update cache optimistically
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['schema', mockField.schema_id],
        expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({ field_name: 'updated_field' })
          ])
        })
      );

      // Should call actual mutation
      expect(mockUpdateField).toHaveBeenCalledWith(updatedField);
    });

    it('should rollback on field update failure', async () => {
      mockUpdateField.mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useOptimisticFieldUpdate(), {
        wrapper: TestWrapper,
      });

      const updatedField = { ...mockField, field_name: 'updated_field' };

      await act(async () => {
        try {
          await result.current.updateField(updatedField);
        } catch (error) {
          // Expected to fail
        }
      });

      // Should rollback cache changes
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['schema', mockField.schema_id],
        mockSchema // Original data
      );
    });

    it('should batch multiple field updates', async () => {
      const { result } = renderHook(() => useOptimisticFieldUpdate(), {
        wrapper: TestWrapper,
      });

      const field1 = { ...mockSchema.fields[0], field_name: 'updated_1' };
      const field2 = { ...mockSchema.fields[1], field_name: 'updated_2' };

      await act(async () => {
        await result.current.batchUpdateFields([field1, field2]);
      });

      // Should update cache with both changes
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['schema', mockField.schema_id],
        expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({ field_name: 'updated_1' }),
            expect.objectContaining({ field_name: 'updated_2' })
          ])
        })
      );
    });

    it('should handle partial batch update failures', async () => {
      mockUpdateField
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Second update failed'));

      const { result } = renderHook(() => useOptimisticFieldUpdate(), {
        wrapper: TestWrapper,
      });

      const field1 = { ...mockSchema.fields[0], field_name: 'updated_1' };
      const field2 = { ...mockSchema.fields[1], field_name: 'updated_2' };

      await act(async () => {
        try {
          await result.current.batchUpdateFields([field1, field2]);
        } catch (error) {
          // Expected to fail
        }
      });

      // Should rollback only failed changes
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['schema', mockField.schema_id],
        expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({ field_name: 'updated_1' }), // Success
            expect.objectContaining({ field_name: 'field_2' })    // Rollback
          ])
        })
      );
    });
  });

  describe('useOptimisticSchemaUpdate', () => {
    it('should perform optimistic schema update', async () => {
      const { result } = renderHook(() => useOptimisticSchemaUpdate(), {
        wrapper: TestWrapper,
      });

      const updatedSchema = { ...mockSchema, name: 'Updated Schema' };

      await act(async () => {
        await result.current.updateSchema(updatedSchema);
      });

      // Should update cache optimistically
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['schema', mockSchema.id],
        expect.objectContaining({ name: 'Updated Schema' })
      );

      // Should call actual mutation
      expect(mockUpdateSchema).toHaveBeenCalledWith(updatedSchema);
    });

    it('should rollback schema update on failure', async () => {
      mockUpdateSchema.mockRejectedValue(new Error('Schema update failed'));

      const { result } = renderHook(() => useOptimisticSchemaUpdate(), {
        wrapper: TestWrapper,
      });

      const updatedSchema = { ...mockSchema, name: 'Updated Schema' };

      await act(async () => {
        try {
          await result.current.updateSchema(updatedSchema);
        } catch (error) {
          // Expected to fail
        }
      });

      // Should rollback cache changes
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['schema', mockSchema.id],
        mockSchema // Original data
      );
    });

    it('should update schema metadata optimistically', async () => {
      const { result } = renderHook(() => useOptimisticSchemaUpdate(), {
        wrapper: TestWrapper,
      });

      const metadata = {
        name: 'New Name',
        description: 'New Description',
        version: 2,
      };

      await act(async () => {
        await result.current.updateSchemaMetadata(mockSchema.id, metadata);
      });

      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['schema', mockSchema.id],
        expect.objectContaining(metadata)
      );
    });
  });

  describe('useOptimisticFieldDelete', () => {
    it('should perform optimistic field deletion', async () => {
      const { result } = renderHook(() => useOptimisticFieldDelete(), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await result.current.deleteField(mockField.id, mockField.schema_id);
      });

      // Should remove field from cache optimistically
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['schema', mockField.schema_id],
        expect.objectContaining({
          fields: expect.not.arrayContaining([
            expect.objectContaining({ id: mockField.id })
          ])
        })
      );

      // Should call actual deletion
      expect(mockDeleteField).toHaveBeenCalledWith(mockField.id);
    });

    it('should rollback field deletion on failure', async () => {
      mockDeleteField.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useOptimisticFieldDelete(), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        try {
          await result.current.deleteField(mockField.id, mockField.schema_id);
        } catch (error) {
          // Expected to fail
        }
      });

      // Should restore field in cache
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['schema', mockField.schema_id],
        mockSchema // Original data with field restored
      );
    });

    it('should handle soft delete', async () => {
      const { result } = renderHook(() => useOptimisticFieldDelete(), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await result.current.softDeleteField(mockField.id, mockField.schema_id);
      });

      // Should mark field as inactive optimistically
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['schema', mockField.schema_id],
        expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({
              id: mockField.id,
              is_active: false
            })
          ])
        })
      );
    });

    it('should batch delete multiple fields', async () => {
      const { result } = renderHook(() => useOptimisticFieldDelete(), {
        wrapper: TestWrapper,
      });

      const fieldIds = ['field-1', 'field-2'];

      await act(async () => {
        await result.current.batchDeleteFields(fieldIds, mockSchema.id);
      });

      // Should remove all fields from cache
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['schema', mockSchema.id],
        expect.objectContaining({
          fields: []
        })
      );
    });
  });

  describe('useOptimisticFieldReorder', () => {
    it('should perform optimistic field reordering', async () => {
      const { result } = renderHook(() => useOptimisticFieldReorder(), {
        wrapper: TestWrapper,
      });

      const newOrder = [
        { id: 'field-2', display_order: 1 },
        { id: 'field-1', display_order: 2 },
      ];

      await act(async () => {
        await result.current.reorderFields(mockSchema.id, newOrder);
      });

      // Should update field order in cache optimistically
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['schema', mockSchema.id],
        expect.objectContaining({
          fields: [
            expect.objectContaining({ id: 'field-2', display_order: 1 }),
            expect.objectContaining({ id: 'field-1', display_order: 2 }),
          ]
        })
      );

      // Should call actual reorder mutation
      expect(mockReorderFields).toHaveBeenCalledWith({
        schemaId: mockSchema.id,
        fieldOrder: newOrder,
      });
    });

    it('should rollback field reordering on failure', async () => {
      mockReorderFields.mockRejectedValue(new Error('Reorder failed'));

      const { result } = renderHook(() => useOptimisticFieldReorder(), {
        wrapper: TestWrapper,
      });

      const newOrder = [
        { id: 'field-2', display_order: 1 },
        { id: 'field-1', display_order: 2 },
      ];

      await act(async () => {
        try {
          await result.current.reorderFields(mockSchema.id, newOrder);
        } catch (error) {
          // Expected to fail
        }
      });

      // Should restore original order
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['schema', mockSchema.id],
        mockSchema // Original order
      );
    });

    it('should handle single field move', async () => {
      const { result } = renderHook(() => useOptimisticFieldReorder(), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await result.current.moveField(mockSchema.id, 'field-1', 2);
      });

      // Should update only the moved field's order
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['schema', mockSchema.id],
        expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({ id: 'field-1', display_order: 2 })
          ])
        })
      );
    });

    it('should swap two fields optimistically', async () => {
      const { result } = renderHook(() => useOptimisticFieldReorder(), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await result.current.swapFields(mockSchema.id, 'field-1', 'field-2');
      });

      // Should swap the display orders
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['schema', mockSchema.id],
        expect.objectContaining({
          fields: [
            expect.objectContaining({ id: 'field-1', display_order: 2 }),
            expect.objectContaining({ id: 'field-2', display_order: 1 }),
          ]
        })
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing cache data gracefully', async () => {
      mockQueryClient.getQueryData.mockReturnValue(null);

      const { result } = renderHook(() => useOptimisticFieldUpdate(), {
        wrapper: TestWrapper,
      });

      const updatedField = { ...mockField, field_name: 'updated_field' };

      await act(async () => {
        await result.current.updateField(updatedField);
      });

      // Should not crash and still call mutation
      expect(mockUpdateField).toHaveBeenCalledWith(updatedField);
    });

    it('should handle network timeouts', async () => {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Network timeout')), 100);
      });

      mockUpdateField.mockReturnValue(timeoutPromise);

      const { result } = renderHook(() => useOptimisticFieldUpdate(), {
        wrapper: TestWrapper,
      });

      const updatedField = { ...mockField, field_name: 'updated_field' };

      await act(async () => {
        try {
          await result.current.updateField(updatedField);
        } catch (error) {
          expect(error.message).toBe('Network timeout');
        }
      });

      // Should rollback optimistic changes
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        ['schema', mockField.schema_id],
        mockSchema
      );
    });

    it('should prevent duplicate optimistic updates', async () => {
      const { result } = renderHook(() => useOptimisticFieldUpdate(), {
        wrapper: TestWrapper,
      });

      const updatedField = { ...mockField, field_name: 'updated_field' };

      // Start two updates for the same field simultaneously
      const promise1 = result.current.updateField(updatedField);
      const promise2 = result.current.updateField(updatedField);

      await act(async () => {
        await Promise.all([promise1, promise2]);
      });

      // Should only call mutation once
      expect(mockUpdateField).toHaveBeenCalledTimes(1);
    });

    it('should clean up optimistic operations on unmount', () => {
      const { result, unmount } = renderHook(() => useOptimisticUpdates(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.startOptimisticUpdate('field-update', 'field-1');
      });

      expect(result.current.optimisticOperations).toHaveLength(1);

      unmount();

      // Operations should be cleaned up
      // (This would be verified by checking that timeouts are cleared)
    });
  });

  describe('Performance Optimizations', () => {
    it('should cancel previous queries before optimistic updates', async () => {
      const { result } = renderHook(() => useOptimisticFieldUpdate(), {
        wrapper: TestWrapper,
      });

      const updatedField = { ...mockField, field_name: 'updated_field' };

      await act(async () => {
        await result.current.updateField(updatedField);
      });

      expect(mockQueryClient.cancelQueries).toHaveBeenCalledWith(['schema', mockField.schema_id]);
    });

    it('should debounce rapid optimistic updates', async () => {
      const { result } = renderHook(() => useOptimisticFieldUpdate(), {
        wrapper: TestWrapper,
      });

      const field1 = { ...mockField, field_name: 'update_1' };
      const field2 = { ...mockField, field_name: 'update_2' };
      const field3 = { ...mockField, field_name: 'update_3' };

      await act(async () => {
        // Rapid updates
        result.current.updateField(field1);
        result.current.updateField(field2);
        await result.current.updateField(field3);
      });

      // Should batch or debounce updates
      expect(mockUpdateField).toHaveBeenCalledTimes(1);
      expect(mockUpdateField).toHaveBeenCalledWith(field3); // Last update
    });

    it('should invalidate related queries after successful updates', async () => {
      const { result } = renderHook(() => useOptimisticFieldUpdate(), {
        wrapper: TestWrapper,
      });

      const updatedField = { ...mockField, field_name: 'updated_field' };

      await act(async () => {
        await result.current.updateField(updatedField);
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith(['schemas', mockField.schema_id]);
    });
  });
});