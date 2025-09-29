/**
 * Auto-Save Hook Tests
 *
 * Tests for auto-save functionality including conflict detection,
 * recovery mechanisms, and exponential backoff retry logic.
 */

import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import React from 'react';
import {
  useAutoSave,
  type AutoSaveConfig,
  type AutoSaveHookReturn,
} from './useAutoSave';
import { ComponentSchema } from '../../types/schema';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock schema mutation
const mockSaveSchema = jest.fn();
const mockGetSchema = jest.fn();

jest.mock('./useSchemaQueries', () => ({
  useUpdateSchemaMutation: () => ({
    mutateAsync: mockSaveSchema,
    isLoading: false,
  }),
  useSchemaQuery: () => ({
    data: mockGetSchema(),
    refetch: mockGetSchema,
  }),
}));

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

const updatedSchema: ComponentSchema = {
  ...mockSchema,
  name: 'Updated Schema',
  updated_at: '2024-01-01T01:00:00Z',
};

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

describe('useAutoSave Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    mockLocalStorage.clear();
    mockSaveSchema.mockResolvedValue({ success: true });
    mockGetSchema.mockReturnValue(mockSchema);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Auto-Save Functionality', () => {
    it('should initialize with idle status', () => {
      const { result } = renderHook(
        () => useAutoSave('schema-123', mockSchema),
        { wrapper: TestWrapper }
      );

      expect(result.current.status).toBe('idle');
      expect(result.current.lastSaved).toBeNull();
      expect(result.current.conflictData).toBeNull();
    });

    it('should trigger auto-save after delay', async () => {
      const config: AutoSaveConfig = {
        enabled: true,
        intervalMs: 2000,
        maxRetries: 3,
        retryDelayMs: 1000,
      };

      const { result } = renderHook(
        () => useAutoSave('schema-123', updatedSchema, config),
        { wrapper: TestWrapper }
      );

      // Fast-forward past the auto-save interval
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Wait for async operation
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockSaveSchema).toHaveBeenCalledWith(updatedSchema);
      expect(result.current.status).toBe('saved');
    });

    it('should not auto-save when disabled', () => {
      const config: AutoSaveConfig = {
        enabled: false,
        intervalMs: 1000,
      };

      renderHook(
        () => useAutoSave('schema-123', updatedSchema, config),
        { wrapper: TestWrapper }
      );

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockSaveSchema).not.toHaveBeenCalled();
    });

    it('should debounce multiple rapid changes', async () => {
      const { result, rerender } = renderHook(
        ({ data }) => useAutoSave('schema-123', data, { enabled: true, intervalMs: 1000 }),
        {
          wrapper: TestWrapper,
          initialProps: { data: mockSchema }
        }
      );

      // Rapidly change data multiple times
      const changes = [
        { ...mockSchema, name: 'Change 1' },
        { ...mockSchema, name: 'Change 2' },
        { ...mockSchema, name: 'Change 3' },
      ];

      changes.forEach(change => {
        rerender({ data: change });
      });

      // Should only trigger one save after the interval
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockSaveSchema).toHaveBeenCalledTimes(1);
      expect(mockSaveSchema).toHaveBeenCalledWith(changes[2]); // Last change
    });
  });

  describe('Manual Save', () => {
    it('should perform manual save', async () => {
      const { result } = renderHook(
        () => useAutoSave('schema-123', updatedSchema),
        { wrapper: TestWrapper }
      );

      await act(async () => {
        const success = await result.current.manualSave();
        expect(success).toBe(true);
      });

      expect(mockSaveSchema).toHaveBeenCalledWith(updatedSchema);
      expect(result.current.status).toBe('saved');
    });

    it('should handle manual save failure', async () => {
      mockSaveSchema.mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(
        () => useAutoSave('schema-123', updatedSchema),
        { wrapper: TestWrapper }
      );

      await act(async () => {
        const success = await result.current.manualSave();
        expect(success).toBe(false);
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toBeDefined();
    });

    it('should cancel auto-save when manual save is triggered', async () => {
      const { result } = renderHook(
        () => useAutoSave('schema-123', updatedSchema, { enabled: true, intervalMs: 2000 }),
        { wrapper: TestWrapper }
      );

      // Start auto-save timer
      act(() => {
        jest.advanceTimersByTime(1000); // Halfway through
      });

      // Trigger manual save
      await act(async () => {
        await result.current.manualSave();
      });

      // Continue timer - should not trigger additional save
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockSaveSchema).toHaveBeenCalledTimes(1); // Only the manual save
    });
  });

  describe('Conflict Detection', () => {
    it('should detect conflicts when server data is newer', async () => {
      const serverSchema = {
        ...mockSchema,
        updated_at: '2024-01-01T02:00:00Z', // Newer than updatedSchema
        name: 'Server Updated Name',
      };

      mockGetSchema.mockReturnValue(serverSchema);

      const { result } = renderHook(
        () => useAutoSave('schema-123', updatedSchema),
        { wrapper: TestWrapper }
      );

      await act(async () => {
        await result.current.manualSave();
      });

      expect(result.current.status).toBe('conflict');
      expect(result.current.conflictData).toEqual({
        local: updatedSchema,
        server: serverSchema,
        lastChecked: expect.any(Number),
      });
    });

    it('should not detect conflicts when local data is newer', async () => {
      const serverSchema = {
        ...mockSchema,
        updated_at: '2023-12-31T23:00:00Z', // Older than updatedSchema
      };

      mockGetSchema.mockReturnValue(serverSchema);

      const { result } = renderHook(
        () => useAutoSave('schema-123', updatedSchema),
        { wrapper: TestWrapper }
      );

      await act(async () => {
        const success = await result.current.manualSave();
        expect(success).toBe(true);
      });

      expect(result.current.status).toBe('saved');
      expect(result.current.conflictData).toBeNull();
    });

    it('should resolve conflicts by keeping local data', async () => {
      const serverSchema = {
        ...mockSchema,
        updated_at: '2024-01-01T02:00:00Z',
        name: 'Server Updated Name',
      };

      mockGetSchema.mockReturnValue(serverSchema);

      const { result } = renderHook(
        () => useAutoSave('schema-123', updatedSchema),
        { wrapper: TestWrapper }
      );

      // Trigger conflict
      await act(async () => {
        await result.current.manualSave();
      });

      expect(result.current.status).toBe('conflict');

      // Resolve by keeping local
      await act(async () => {
        const success = await result.current.resolveConflict('keep_local');
        expect(success).toBe(true);
      });

      expect(mockSaveSchema).toHaveBeenCalledWith(updatedSchema);
      expect(result.current.status).toBe('saved');
      expect(result.current.conflictData).toBeNull();
    });

    it('should resolve conflicts by keeping server data', async () => {
      const serverSchema = {
        ...mockSchema,
        updated_at: '2024-01-01T02:00:00Z',
        name: 'Server Updated Name',
      };

      mockGetSchema.mockReturnValue(serverSchema);

      const { result } = renderHook(
        () => useAutoSave('schema-123', updatedSchema),
        { wrapper: TestWrapper }
      );

      // Trigger conflict
      await act(async () => {
        await result.current.manualSave();
      });

      // Resolve by keeping server
      await act(async () => {
        const success = await result.current.resolveConflict('keep_server');
        expect(success).toBe(true);
      });

      expect(result.current.status).toBe('saved');
      expect(result.current.conflictData).toBeNull();
    });

    it('should handle merge conflict resolution', async () => {
      const serverSchema = {
        ...mockSchema,
        updated_at: '2024-01-01T02:00:00Z',
        name: 'Server Updated Name',
        description: 'Server description',
      };

      mockGetSchema.mockReturnValue(serverSchema);

      const { result } = renderHook(
        () => useAutoSave('schema-123', updatedSchema),
        { wrapper: TestWrapper }
      );

      // Trigger conflict
      await act(async () => {
        await result.current.manualSave();
      });

      // Resolve by merging
      await act(async () => {
        const success = await result.current.resolveConflict('merge');
        expect(success).toBe(true);
      });

      // Should save merged data
      const mergedData = {
        ...serverSchema,
        name: updatedSchema.name, // Keep local name
      };

      expect(mockSaveSchema).toHaveBeenCalledWith(mergedData);
      expect(result.current.status).toBe('saved');
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should retry failed saves with exponential backoff', async () => {
      mockSaveSchema
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true });

      const config: AutoSaveConfig = {
        enabled: true,
        intervalMs: 1000,
        maxRetries: 3,
        retryDelayMs: 500,
      };

      const { result } = renderHook(
        () => useAutoSave('schema-123', updatedSchema, config),
        { wrapper: TestWrapper }
      );

      // Trigger auto-save
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // First retry after 500ms
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Second retry after 1000ms (exponential backoff)
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockSaveSchema).toHaveBeenCalledTimes(3);
      expect(result.current.status).toBe('saved');
    });

    it('should fail after max retries exceeded', async () => {
      mockSaveSchema.mockRejectedValue(new Error('Persistent error'));

      const config: AutoSaveConfig = {
        enabled: true,
        intervalMs: 1000,
        maxRetries: 2,
        retryDelayMs: 100,
      };

      const { result } = renderHook(
        () => useAutoSave('schema-123', updatedSchema, config),
        { wrapper: TestWrapper }
      );

      // Trigger auto-save and wait for all retries
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      act(() => {
        jest.advanceTimersByTime(100); // First retry
      });

      act(() => {
        jest.advanceTimersByTime(200); // Second retry (exponential backoff)
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockSaveSchema).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(result.current.status).toBe('error');
      expect(result.current.error?.message).toBe('Persistent error');
    });

    it('should handle network errors differently from validation errors', async () => {
      const networkError = new Error('Network timeout');
      (networkError as any).code = 'NETWORK_ERROR';

      mockSaveSchema.mockRejectedValue(networkError);

      const { result } = renderHook(
        () => useAutoSave('schema-123', updatedSchema, { maxRetries: 2 }),
        { wrapper: TestWrapper }
      );

      await act(async () => {
        const success = await result.current.manualSave();
        expect(success).toBe(false);
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe(networkError);
    });
  });

  describe('Local Storage Recovery', () => {
    const recoveryKey = 'auto_save_schema-123';

    it('should save data to local storage during auto-save', async () => {
      const { result } = renderHook(
        () => useAutoSave('schema-123', updatedSchema, { enabled: true, intervalMs: 1000 }),
        { wrapper: TestWrapper }
      );

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const stored = mockLocalStorage.getItem(recoveryKey);
      expect(stored).toBeDefined();

      const parsedData = JSON.parse(stored!);
      expect(parsedData.data).toEqual(updatedSchema);
      expect(parsedData.timestamp).toBeDefined();
    });

    it('should recover auto-saved data from local storage', () => {
      const autoSavedData = {
        data: updatedSchema,
        timestamp: Date.now() - 30000, // 30 seconds ago
      };

      mockLocalStorage.setItem(recoveryKey, JSON.stringify(autoSavedData));

      const { result } = renderHook(
        () => useAutoSave('schema-123', mockSchema),
        { wrapper: TestWrapper }
      );

      const recovered = result.current.recoverAutoSavedData();
      expect(recovered).toEqual(updatedSchema);
    });

    it('should not recover stale auto-saved data', () => {
      const staleData = {
        data: updatedSchema,
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
      };

      mockLocalStorage.setItem(recoveryKey, JSON.stringify(staleData));

      const { result } = renderHook(
        () => useAutoSave('schema-123', mockSchema),
        { wrapper: TestWrapper }
      );

      const recovered = result.current.recoverAutoSavedData();
      expect(recovered).toBeNull();
    });

    it('should clean up local storage after successful save', async () => {
      mockLocalStorage.setItem(recoveryKey, JSON.stringify({
        data: updatedSchema,
        timestamp: Date.now(),
      }));

      const { result } = renderHook(
        () => useAutoSave('schema-123', updatedSchema),
        { wrapper: TestWrapper }
      );

      await act(async () => {
        await result.current.manualSave();
      });

      expect(mockLocalStorage.getItem(recoveryKey)).toBeNull();
    });
  });

  describe('Enable/Disable Auto-Save', () => {
    it('should enable auto-save dynamically', () => {
      const { result } = renderHook(
        () => useAutoSave('schema-123', updatedSchema, { enabled: false }),
        { wrapper: TestWrapper }
      );

      expect(result.current.isEnabled).toBe(false);

      act(() => {
        result.current.enableAutoSave();
      });

      expect(result.current.isEnabled).toBe(true);

      // Should start auto-saving
      act(() => {
        jest.advanceTimersByTime(5000); // Default interval
      });

      expect(mockSaveSchema).toHaveBeenCalled();
    });

    it('should disable auto-save dynamically', () => {
      const { result } = renderHook(
        () => useAutoSave('schema-123', updatedSchema, { enabled: true, intervalMs: 1000 }),
        { wrapper: TestWrapper }
      );

      expect(result.current.isEnabled).toBe(true);

      act(() => {
        result.current.disableAutoSave();
      });

      expect(result.current.isEnabled).toBe(false);

      // Should not auto-save
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockSaveSchema).not.toHaveBeenCalled();
    });
  });

  describe('Status and Progress Tracking', () => {
    it('should track save progress', async () => {
      let saveResolve: Function;
      const savePromise = new Promise(resolve => {
        saveResolve = resolve;
      });

      mockSaveSchema.mockReturnValue(savePromise);

      const { result } = renderHook(
        () => useAutoSave('schema-123', updatedSchema),
        { wrapper: TestWrapper }
      );

      // Start manual save
      const savePromiseResult = result.current.manualSave();

      // Should be in saving state
      expect(result.current.status).toBe('saving');

      // Complete the save
      act(() => {
        saveResolve!({ success: true });
      });

      await act(async () => {
        await savePromiseResult;
      });

      expect(result.current.status).toBe('saved');
      expect(result.current.lastSaved).toBeDefined();
    });

    it('should provide retry count during failures', async () => {
      mockSaveSchema
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce({ success: true });

      const { result } = renderHook(
        () => useAutoSave('schema-123', updatedSchema, {
          enabled: true,
          intervalMs: 1000,
          maxRetries: 3,
          retryDelayMs: 100,
        }),
        { wrapper: TestWrapper }
      );

      // Trigger auto-save
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.retryCount).toBe(0);

      // First retry
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.retryCount).toBe(1);

      // Second retry
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(result.current.retryCount).toBe(2);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.status).toBe('saved');
      expect(result.current.retryCount).toBe(0); // Reset after success
    });
  });
});