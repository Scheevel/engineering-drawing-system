/**
 * Batch Operations Service Tests
 *
 * Comprehensive tests for batch field operations including
 * queuing, processing, rollback, and performance validation.
 */

import { renderHook, act } from '@testing-library/react';
import { useBatchOperations } from './batchOperationsService';
import { ComponentSchemaFieldCreate, ComponentSchemaFieldUpdate } from './api';

// Mock the configuration
jest.mock('../config/schemaConfig', () => ({
  getCurrentConfig: jest.fn(() => ({
    performance: {
      batchSize: 5,
      batchDelayMs: 100,
      maxCacheSize: 10,
      cacheTTLMs: 5000,
      enableDebouncing: true,
      debounceDelayMs: 300,
    },
  })),
}));

// Mock the performance optimization hooks
jest.mock('../hooks/schema/usePerformanceOptimizations', () => ({
  useBatchedUpdates: jest.fn(() => ({
    addToBatch: jest.fn(),
    setBatchHandler: jest.fn(),
    flush: jest.fn(),
  })),
}));

describe('useBatchOperations Hook', () => {
  const mockSchemaId = 'test-schema-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Operation Management', () => {
    it('should add create operations to queue', () => {
      const { result } = renderHook(() => useBatchOperations(mockSchemaId));

      const createData: ComponentSchemaFieldCreate = {
        field_name: 'Test Field',
        field_type: 'text',
        is_required: true,
        field_config: { placeholder: 'Enter text' },
      };

      act(() => {
        const operationId = result.current.addCreateOperation(createData, 1);
        expect(operationId).toBeTruthy();
        expect(typeof operationId).toBe('string');
      });

      expect(result.current.queueStatus.pendingCount).toBe(1);
      expect(result.current.queueStatus.operations).toHaveLength(1);
      expect(result.current.queueStatus.operations[0].type).toBe('create');
      expect(result.current.hasOperations).toBe(true);
    });

    it('should add update operations to queue', () => {
      const { result } = renderHook(() => useBatchOperations(mockSchemaId));

      const updateData: ComponentSchemaFieldUpdate = {
        field_name: 'Updated Field Name',
        help_text: 'Updated help text',
      };

      act(() => {
        const operationId = result.current.addUpdateOperation('field-123', updateData);
        expect(operationId).toBeTruthy();
      });

      expect(result.current.queueStatus.pendingCount).toBe(1);
      expect(result.current.queueStatus.operations[0].type).toBe('update');
      expect(result.current.queueStatus.operations[0].fieldId).toBe('field-123');
    });

    it('should add delete operations to queue', () => {
      const { result } = renderHook(() => useBatchOperations(mockSchemaId));

      act(() => {
        const operationId = result.current.addDeleteOperation('field-to-delete');
        expect(operationId).toBeTruthy();
      });

      expect(result.current.queueStatus.pendingCount).toBe(1);
      expect(result.current.queueStatus.operations[0].type).toBe('delete');
      expect(result.current.queueStatus.operations[0].fieldId).toBe('field-to-delete');
    });

    it('should add reorder operations to queue', () => {
      const { result } = renderHook(() => useBatchOperations(mockSchemaId));

      act(() => {
        const operationId = result.current.addReorderOperation('field-reorder', 5);
        expect(operationId).toBeTruthy();
      });

      expect(result.current.queueStatus.pendingCount).toBe(1);
      expect(result.current.queueStatus.operations[0].type).toBe('reorder');
      expect(result.current.queueStatus.operations[0].fieldId).toBe('field-reorder');
      expect(result.current.queueStatus.operations[0].displayOrder).toBe(5);
    });

    it('should remove operations from queue', () => {
      const { result } = renderHook(() => useBatchOperations(mockSchemaId));

      let operationId: string;

      act(() => {
        operationId = result.current.addCreateOperation({
          field_name: 'Test Field',
          field_type: 'text',
          is_required: false,
          field_config: {},
        });
      });

      expect(result.current.queueStatus.pendingCount).toBe(1);

      act(() => {
        const removed = result.current.removeOperation(operationId);
        expect(removed).toBe(true);
      });

      expect(result.current.queueStatus.pendingCount).toBe(0);
      expect(result.current.hasOperations).toBe(false);
    });

    it('should clear all operations', () => {
      const { result } = renderHook(() => useBatchOperations(mockSchemaId));

      // Add multiple operations
      act(() => {
        result.current.addCreateOperation({
          field_name: 'Field 1',
          field_type: 'text',
          is_required: false,
          field_config: {},
        });
        result.current.addUpdateOperation('field-2', {
          field_name: 'Updated Field 2',
        });
        result.current.addDeleteOperation('field-3');
      });

      expect(result.current.queueStatus.pendingCount).toBe(3);

      act(() => {
        result.current.clearOperations();
      });

      expect(result.current.queueStatus.pendingCount).toBe(0);
      expect(result.current.hasOperations).toBe(false);
    });
  });

  describe('Batch Processing', () => {
    it('should process batch operations successfully', async () => {
      const { result } = renderHook(() => useBatchOperations(mockSchemaId));

      // Add operations to queue
      act(() => {
        result.current.addCreateOperation({
          field_name: 'New Field',
          field_type: 'text',
          is_required: true,
          field_config: { placeholder: 'Enter value' },
        });
        result.current.addUpdateOperation('existing-field', {
          field_name: 'Updated Field',
        });
        result.current.addDeleteOperation('old-field');
      });

      expect(result.current.queueStatus.pendingCount).toBe(3);
      expect(result.current.canProcess).toBe(true);

      // Process batch
      await act(async () => {
        const results = await result.current.processBatch();
        expect(results).toHaveLength(3);
        expect(results.every(r => r.success)).toBe(true);
      });

      expect(result.current.results).toHaveLength(3);
      expect(result.current.isProcessing).toBe(false);
    });

    it('should handle processing options', async () => {
      const { result } = renderHook(() => useBatchOperations(mockSchemaId));

      // Add operations
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.addCreateOperation({
            field_name: `Field ${i}`,
            field_type: 'text',
            is_required: false,
            field_config: {},
          });
        }
      });

      const processingOptions = {
        batchSize: 3,
        delayMs: 50,
        validateBefore: true,
        optimisticUpdates: false,
        rollbackOnFailure: true,
      };

      await act(async () => {
        const results = await result.current.processBatch(processingOptions);
        expect(results).toHaveLength(10);
      });

      expect(result.current.results).toHaveLength(10);
    });

    it('should prevent processing when already processing', async () => {
      const { result } = renderHook(() => useBatchOperations(mockSchemaId));

      act(() => {
        result.current.addCreateOperation({
          field_name: 'Test Field',
          field_type: 'text',
          is_required: false,
          field_config: {},
        });
      });

      // Start first processing
      const firstProcessPromise = act(async () => {
        return result.current.processBatch();
      });

      expect(result.current.isProcessing).toBe(true);
      expect(result.current.canProcess).toBe(false);

      // Attempt second processing while first is running
      await act(async () => {
        await expect(result.current.processBatch()).rejects.toThrow(
          'Batch processing already in progress'
        );
      });

      await firstProcessPromise;
      expect(result.current.isProcessing).toBe(false);
    });

    it('should return empty results for empty queue', async () => {
      const { result } = renderHook(() => useBatchOperations(mockSchemaId));

      await act(async () => {
        const results = await result.current.processBatch();
        expect(results).toHaveLength(0);
      });

      expect(result.current.canProcess).toBe(false);
    });
  });

  describe('Queue Status Tracking', () => {
    it('should track queue status correctly', () => {
      const { result } = renderHook(() => useBatchOperations(mockSchemaId));

      // Initial state
      expect(result.current.queueStatus.status).toBe('completed');
      expect(result.current.queueStatus.pendingCount).toBe(0);
      expect(result.current.queueStatus.processedCount).toBe(0);

      // Add operations
      act(() => {
        result.current.addCreateOperation({
          field_name: 'Field 1',
          field_type: 'text',
          is_required: false,
          field_config: {},
        });
        result.current.addUpdateOperation('field-2', {
          field_name: 'Updated Field',
        });
      });

      expect(result.current.queueStatus.status).toBe('idle');
      expect(result.current.queueStatus.pendingCount).toBe(2);
      expect(result.current.queueStatus.operations).toHaveLength(2);
    });

    it('should update status during processing', async () => {
      const { result } = renderHook(() => useBatchOperations(mockSchemaId));

      act(() => {
        result.current.addCreateOperation({
          field_name: 'Processing Test',
          field_type: 'text',
          is_required: false,
          field_config: {},
        });
      });

      // Process and check status updates
      await act(async () => {
        const processPromise = result.current.processBatch();
        expect(result.current.queueStatus.status).toBe('processing');
        await processPromise;
      });

      expect(result.current.queueStatus.status).toBe('completed');
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('Operation Types and Validation', () => {
    it('should handle different field types in create operations', () => {
      const { result } = renderHook(() => useBatchOperations(mockSchemaId));

      const fieldTypes = ['text', 'number', 'select', 'checkbox', 'date'] as const;

      act(() => {
        fieldTypes.forEach((fieldType, index) => {
          result.current.addCreateOperation({
            field_name: `${fieldType} Field`,
            field_type: fieldType,
            is_required: index % 2 === 0,
            field_config: getFieldConfig(fieldType),
          });
        });
      });

      expect(result.current.queueStatus.pendingCount).toBe(fieldTypes.length);
      expect(result.current.queueStatus.operations.every(op => op.type === 'create')).toBe(true);
    });

    it('should handle complex update operations', () => {
      const { result } = renderHook(() => useBatchOperations(mockSchemaId));

      const complexUpdate: ComponentSchemaFieldUpdate = {
        field_name: 'Complex Updated Field',
        help_text: 'This is a complex field with extensive configuration',
        is_required: true,
        field_config: {
          placeholder: 'Enter complex data',
          validation: {
            minLength: 5,
            maxLength: 100,
            pattern: '^[A-Za-z0-9]+$',
          },
          ui: {
            rows: 4,
            autoFocus: true,
          },
        },
      };

      act(() => {
        result.current.addUpdateOperation('complex-field', complexUpdate);
      });

      const operation = result.current.queueStatus.operations[0];
      expect(operation.type).toBe('update');
      expect(operation.data).toEqual(complexUpdate);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large batch operations efficiently', async () => {
      const { result } = renderHook(() => useBatchOperations(mockSchemaId));

      const startTime = performance.now();

      // Add 50 operations
      act(() => {
        for (let i = 0; i < 50; i++) {
          result.current.addCreateOperation({
            field_name: `Performance Field ${i}`,
            field_type: 'text',
            is_required: i % 3 === 0,
            field_config: { placeholder: `Field ${i} placeholder` },
          }, i);
        }
      });

      const addTime = performance.now() - startTime;
      expect(addTime).toBeLessThan(1000); // Should add quickly

      expect(result.current.queueStatus.pendingCount).toBe(50);

      // Process efficiently
      const processStart = performance.now();
      await act(async () => {
        const results = await result.current.processBatch({ batchSize: 10 });
        expect(results).toHaveLength(50);
      });

      const processTime = performance.now() - processStart;
      expect(processTime).toBeLessThan(10000); // Should process within 10 seconds
    });

    it('should handle mixed operation types', async () => {
      const { result } = renderHook(() => useBatchOperations(mockSchemaId));

      act(() => {
        // Mix of different operation types
        result.current.addCreateOperation({
          field_name: 'New Field',
          field_type: 'text',
          is_required: true,
          field_config: {},
        });
        result.current.addUpdateOperation('existing-1', {
          field_name: 'Updated Field 1',
        });
        result.current.addDeleteOperation('to-delete-1');
        result.current.addReorderOperation('to-reorder-1', 10);
        result.current.addCreateOperation({
          field_name: 'Another New Field',
          field_type: 'number',
          is_required: false,
          field_config: { min: 0, max: 100 },
        });
        result.current.addUpdateOperation('existing-2', {
          is_required: true,
        });
        result.current.addDeleteOperation('to-delete-2');
      });

      expect(result.current.queueStatus.pendingCount).toBe(7);

      await act(async () => {
        const results = await result.current.processBatch();
        expect(results).toHaveLength(7);
        expect(results.every(r => r.success)).toBe(true);
      });

      // Verify operation types in results
      const operationTypes = result.current.queueStatus.operations.map(op => op.type);
      expect(operationTypes).toContain('create');
      expect(operationTypes).toContain('update');
      expect(operationTypes).toContain('delete');
      expect(operationTypes).toContain('reorder');
    });

    it('should maintain operation order within types', () => {
      const { result } = renderHook(() => useBatchOperations(mockSchemaId));

      const operationIds: string[] = [];

      act(() => {
        // Add operations in specific order
        operationIds.push(result.current.addCreateOperation({
          field_name: 'First Create',
          field_type: 'text',
          is_required: false,
          field_config: {},
        }));
        operationIds.push(result.current.addCreateOperation({
          field_name: 'Second Create',
          field_type: 'text',
          is_required: false,
          field_config: {},
        }));
        operationIds.push(result.current.addUpdateOperation('field-1', {
          field_name: 'First Update',
        }));
        operationIds.push(result.current.addUpdateOperation('field-2', {
          field_name: 'Second Update',
        }));
      });

      const operations = result.current.queueStatus.operations;
      expect(operations).toHaveLength(4);

      // Verify IDs match expected order
      expect(operations.map(op => op.id)).toEqual(operationIds);
    });
  });
});

// Helper function for test field configurations
function getFieldConfig(fieldType: string): Record<string, any> {
  switch (fieldType) {
    case 'text':
      return { placeholder: 'Enter text', maxLength: 100 };
    case 'number':
      return { min: 0, max: 1000, step: 1 };
    case 'select':
      return { options: ['Option 1', 'Option 2', 'Option 3'] };
    case 'checkbox':
      return { trueLabel: 'Yes', falseLabel: 'No' };
    case 'date':
      return { format: 'YYYY-MM-DD', showTime: false };
    default:
      return {};
  }
}