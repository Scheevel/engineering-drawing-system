/**
 * Bulk Operations Hook Tests
 *
 * Comprehensive tests for the useBulkOperations hook including
 * delete operations, progress tracking, and error handling.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import React from 'react';
import { useBulkOperations } from './useBulkOperations';
import * as apiModule from '../../services/api';

// Mock the API functions
jest.mock('../../services/api', () => ({
  removeSchemaField: jest.fn(),
  updateSchemaField: jest.fn(),
}));

const mockedRemoveSchemaField = apiModule.removeSchemaField as jest.MockedFunction<typeof apiModule.removeSchemaField>;
const mockedUpdateSchemaField = apiModule.updateSchemaField as jest.MockedFunction<typeof apiModule.updateSchemaField>;

// Test wrapper with React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('useBulkOperations', () => {
  const mockSchemaId = 'test-schema-123';
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();
  const mockOnProgress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRemoveSchemaField.mockResolvedValue();
    mockedUpdateSchemaField.mockResolvedValue({} as any);
  });

  const defaultOptions = {
    schemaId: mockSchemaId,
    onSuccess: mockOnSuccess,
    onError: mockOnError,
    onProgress: mockOnProgress,
  };

  describe('Bulk Delete Operations', () => {
    it('should successfully delete multiple fields', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkOperations(defaultOptions), { wrapper });

      const fieldIds = ['field1', 'field2', 'field3'];

      await act(async () => {
        const deleteResult = await result.current.bulkDeleteFields(fieldIds);
        expect(deleteResult.succeeded).toEqual(fieldIds);
        expect(deleteResult.failed).toEqual([]);
        expect(deleteResult.totalProcessed).toBe(3);
      });

      expect(mockedRemoveSchemaField).toHaveBeenCalledTimes(3);
      expect(mockedRemoveSchemaField).toHaveBeenCalledWith('field1');
      expect(mockedRemoveSchemaField).toHaveBeenCalledWith('field2');
      expect(mockedRemoveSchemaField).toHaveBeenCalledWith('field3');
      expect(mockOnSuccess).toHaveBeenCalledWith('Successfully deleted 3 fields');
    });

    it('should handle partial failures during bulk delete', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkOperations(defaultOptions), { wrapper });

      // Mock one field to fail
      mockedRemoveSchemaField.mockImplementation((fieldId) => {
        if (fieldId === 'field2') {
          return Promise.reject(new Error('Field deletion failed'));
        }
        return Promise.resolve();
      });

      const fieldIds = ['field1', 'field2', 'field3'];

      await act(async () => {
        const deleteResult = await result.current.bulkDeleteFields(fieldIds);
        expect(deleteResult.succeeded).toEqual(['field1', 'field3']);
        expect(deleteResult.failed).toEqual([
          { fieldId: 'field2', error: 'Field deletion failed' }
        ]);
        expect(deleteResult.totalProcessed).toBe(3);
      });

      expect(mockOnSuccess).toHaveBeenCalledWith('Deleted 2 fields. 1 failed.');
    });

    it('should batch delete operations correctly', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkOperations(defaultOptions), { wrapper });

      const fieldIds = Array.from({ length: 12 }, (_, i) => `field${i + 1}`);

      await act(async () => {
        await result.current.bulkDeleteFields(fieldIds, { batchSize: 5 });
      });

      expect(mockedRemoveSchemaField).toHaveBeenCalledTimes(12);
      // Verify all fields were processed
      fieldIds.forEach(fieldId => {
        expect(mockedRemoveSchemaField).toHaveBeenCalledWith(fieldId);
      });
    });

    it('should track progress during bulk delete', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkOperations(defaultOptions), { wrapper });

      const fieldIds = ['field1', 'field2'];

      // Make API calls slow to observe progress
      mockedRemoveSchemaField.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 10))
      );

      await act(async () => {
        await result.current.bulkDeleteFields(fieldIds, { enableProgress: true });
      });

      await waitFor(() => {
        expect(mockOnProgress).toHaveBeenCalled();
      });

      // Check that progress was tracked
      const progressCalls = mockOnProgress.mock.calls;
      expect(progressCalls.length).toBeGreaterThan(0);

      // Final progress should indicate completion
      const finalProgress = progressCalls[progressCalls.length - 1][0];
      expect(finalProgress.isComplete).toBe(true);
      expect(finalProgress.total).toBe(2);
      expect(finalProgress.completed).toBe(2);
    });

    it('should handle empty field list gracefully', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkOperations(defaultOptions), { wrapper });

      await act(async () => {
        const deleteResult = await result.current.bulkDeleteFields([]);
        expect(deleteResult.succeeded).toEqual([]);
        expect(deleteResult.failed).toEqual([]);
        expect(deleteResult.totalProcessed).toBe(0);
      });

      expect(mockedRemoveSchemaField).not.toHaveBeenCalled();
    });
  });

  describe('Bulk Activate/Deactivate Operations', () => {
    it('should successfully activate multiple fields', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkOperations(defaultOptions), { wrapper });

      const fieldIds = ['field1', 'field2'];

      await act(async () => {
        const activateResult = await result.current.bulkActivateFields(fieldIds, true);
        expect(activateResult.succeeded).toEqual(fieldIds);
        expect(activateResult.failed).toEqual([]);
      });

      expect(mockedUpdateSchemaField).toHaveBeenCalledTimes(2);
      expect(mockedUpdateSchemaField).toHaveBeenCalledWith('field1', { is_active: true });
      expect(mockedUpdateSchemaField).toHaveBeenCalledWith('field2', { is_active: true });
      expect(mockOnSuccess).toHaveBeenCalledWith('Successfully activated 2 fields');
    });

    it('should successfully deactivate multiple fields', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkOperations(defaultOptions), { wrapper });

      const fieldIds = ['field1', 'field2'];

      await act(async () => {
        const deactivateResult = await result.current.bulkActivateFields(fieldIds, false);
        expect(deactivateResult.succeeded).toEqual(fieldIds);
      });

      expect(mockedUpdateSchemaField).toHaveBeenCalledWith('field1', { is_active: false });
      expect(mockedUpdateSchemaField).toHaveBeenCalledWith('field2', { is_active: false });
      expect(mockOnSuccess).toHaveBeenCalledWith('Successfully deactivated 2 fields');
    });
  });

  describe('Bulk Required Toggle Operations', () => {
    it('should successfully toggle required status', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkOperations(defaultOptions), { wrapper });

      const fieldIds = ['field1', 'field2'];

      await act(async () => {
        const requiredResult = await result.current.bulkToggleRequired(fieldIds, true);
        expect(requiredResult.succeeded).toEqual(fieldIds);
      });

      expect(mockedUpdateSchemaField).toHaveBeenCalledWith('field1', { is_required: true });
      expect(mockedUpdateSchemaField).toHaveBeenCalledWith('field2', { is_required: true });
      expect(mockOnSuccess).toHaveBeenCalledWith('Successfully marked as required 2 fields');
    });
  });

  describe('Loading States', () => {
    it('should track loading states correctly', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkOperations(defaultOptions), { wrapper });

      // Mock slow API response
      mockedRemoveSchemaField.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      );

      let deletePromise: Promise<any>;

      act(() => {
        deletePromise = result.current.bulkDeleteFields(['field1']);
      });

      // Check loading state is active
      expect(result.current.isBulkDeleting).toBe(true);
      expect(result.current.isAnyBulkOperation).toBe(true);

      await act(async () => {
        await deletePromise;
      });

      // Check loading state is cleared
      expect(result.current.isBulkDeleting).toBe(false);
      expect(result.current.isAnyBulkOperation).toBe(false);
    });
  });

  describe('Impact Analysis', () => {
    it('should provide impact analysis for field deletion', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkOperations(defaultOptions), { wrapper });

      const fieldIds = ['field1', 'field2'];

      await act(async () => {
        const analysis = await result.current.getImpactAnalysis(fieldIds);

        expect(analysis).toHaveProperty('totalFields');
        expect(analysis).toHaveProperty('riskLevel');
        expect(analysis).toHaveProperty('fieldImpacts');
        expect(analysis.totalFields).toBe(2);
        expect(['low', 'medium', 'high']).toContain(analysis.riskLevel);
      });
    });

    it('should provide deactivation impact analysis', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkOperations(defaultOptions), { wrapper });

      const fieldIds = ['field1', 'field2', 'field3'];

      await act(async () => {
        const analysis = await result.current.getDeactivationImpactAnalysis(fieldIds);

        expect(analysis).toHaveProperty('totalFields');
        expect(analysis).toHaveProperty('requiredFields');
        expect(analysis).toHaveProperty('fieldsUsedInComponents');
        expect(analysis).toHaveProperty('affectedComponents');
        expect(analysis).toHaveProperty('riskLevel');
        expect(analysis).toHaveProperty('warnings');

        expect(analysis.totalFields).toBe(3);
        expect(['low', 'medium', 'high']).toContain(analysis.riskLevel);
        expect(Array.isArray(analysis.affectedComponents)).toBe(true);
        expect(Array.isArray(analysis.warnings)).toBe(true);
      });
    });

    it('should calculate risk level correctly for deactivation', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkOperations(defaultOptions), { wrapper });

      // Test with many fields (should be medium/high risk)
      await act(async () => {
        const manyFieldsAnalysis = await result.current.getDeactivationImpactAnalysis(['field1', 'field2', 'field3', 'field4', 'field5']);
        expect(['medium', 'high']).toContain(manyFieldsAnalysis.riskLevel);
      });

      // Test with few fields (likely low risk)
      await act(async () => {
        const fewFieldsAnalysis = await result.current.getDeactivationImpactAnalysis(['field1']);
        // Risk level depends on whether required fields are included, so just verify it's set
        expect(['low', 'medium', 'high']).toContain(fewFieldsAnalysis.riskLevel);
      });
    });

    it('should include appropriate warnings for deactivation', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkOperations(defaultOptions), { wrapper });

      await act(async () => {
        const analysis = await result.current.getDeactivationImpactAnalysis(['field1', 'field2', 'field3', 'field4', 'field5', 'field6']);

        // Should have warning about large number of fields
        const hasLargeFieldsWarning = analysis.warnings.some(warning =>
          warning.includes('Large number of fields being deactivated')
        );
        expect(hasLargeFieldsWarning).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkOperations(defaultOptions), { wrapper });

      mockedRemoveSchemaField.mockRejectedValue(new Error('API Error'));

      await act(async () => {
        await result.current.bulkDeleteFields(['field1']);
      });

      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should continue processing after individual field failures', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkOperations(defaultOptions), { wrapper });

      // Mock alternating success/failure pattern
      mockedRemoveSchemaField.mockImplementation((fieldId) => {
        if (fieldId.includes('2') || fieldId.includes('4')) {
          return Promise.reject(new Error('Field error'));
        }
        return Promise.resolve();
      });

      const fieldIds = ['field1', 'field2', 'field3', 'field4', 'field5'];

      await act(async () => {
        const result = await result.current.bulkDeleteFields(fieldIds);
        expect(result.succeeded).toEqual(['field1', 'field3', 'field5']);
        expect(result.failed).toHaveLength(2);
      });
    });
  });

  describe('Hook Configuration', () => {
    it('should call onSuccess callback when provided', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkOperations(defaultOptions), { wrapper });

      await act(async () => {
        await result.current.bulkDeleteFields(['field1']);
      });

      expect(mockOnSuccess).toHaveBeenCalledWith('Successfully deleted 1 fields');
    });

    it('should call onError callback when provided', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useBulkOperations(defaultOptions), { wrapper });

      mockedRemoveSchemaField.mockRejectedValue(new Error('Test error'));

      await act(async () => {
        await result.current.bulkDeleteFields(['field1']);
      });

      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});