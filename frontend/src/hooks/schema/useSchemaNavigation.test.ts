/**
 * Tests for Enhanced Schema Navigation Hook
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useSchemaNavigation } from './useSchemaNavigation.ts';

// Mock react-router-dom
const mockNavigate = jest.fn();
const mockLocation = {
  pathname: '/projects/123/components',
  search: '',
  hash: '',
  state: null,
  key: 'default',
};

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  useParams: () => ({ projectId: 'test-project-123' }),
}));

// Mock the API services to avoid axios import issues
jest.mock('../../services/api.ts', () => ({}));

// Create a wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSchemaNavigation', () => {
  const mockProjectId = 'test-project-123';
  const storageKey = 'schemaNavigation_test-project-123';

  beforeEach(() => {
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    // Clean up storage
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Basic Navigation', () => {
    it('should provide navigation functions', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSchemaNavigation(mockProjectId), { wrapper });

      expect(result.current.navigateToSchemas).toBeInstanceOf(Function);
      expect(result.current.navigateToSchemaDetail).toBeInstanceOf(Function);
      expect(result.current.navigateToCreateSchema).toBeInstanceOf(Function);
      expect(result.current.navigateToEditSchema).toBeInstanceOf(Function);
      expect(result.current.navigateBack).toBeInstanceOf(Function);
    });

    it('should navigate to schemas page', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSchemaNavigation(mockProjectId), { wrapper });

      act(() => {
        result.current.navigateToSchemas();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/projects/test-project-123/schemas');
    });

    it('should navigate to schema detail with ID', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSchemaNavigation(mockProjectId), { wrapper });
      const schemaId = 'schema-456';

      act(() => {
        result.current.navigateToSchemaDetail(schemaId);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/projects/test-project-123/schemas/schema-456');
    });

    it('should navigate to create schema page', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSchemaNavigation(mockProjectId), { wrapper });

      act(() => {
        result.current.navigateToCreateSchema();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/projects/test-project-123/schemas/create');
    });

    it('should navigate to edit schema page with ID', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSchemaNavigation(mockProjectId), { wrapper });
      const schemaId = 'schema-789';

      act(() => {
        result.current.navigateToEditSchema(schemaId);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/projects/test-project-123/schemas/schema-789/edit');
    });

    it('should navigate back', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSchemaNavigation(mockProjectId), { wrapper });

      act(() => {
        result.current.navigateBack();
      });

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  describe('State Preservation', () => {
    it('should save navigation state to sessionStorage', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSchemaNavigation(mockProjectId), { wrapper });

      const testState = {
        scrollPosition: 100,
        formData: { name: 'Test Schema' },
        filters: { type: 'component' },
        selectedItems: ['item1', 'item2'],
      };

      act(() => {
        result.current.saveNavigationState(testState);
      });

      const savedState = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
      expect(savedState.scrollPosition).toBe(100);
      expect(savedState.formData).toEqual({ name: 'Test Schema' });
      expect(savedState.filters).toEqual({ type: 'component' });
      expect(savedState.selectedItems).toEqual(['item1', 'item2']);
      expect(savedState.timestamp).toBeDefined();
    });

    it('should restore navigation state from sessionStorage', () => {
      const testState = {
        scrollPosition: 200,
        formData: { description: 'Restored Schema' },
        filters: { status: 'active' },
        selectedItems: ['item3'],
        timestamp: Date.now(),
      };

      sessionStorage.setItem(storageKey, JSON.stringify(testState));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSchemaNavigation(mockProjectId), { wrapper });

      act(() => {
        const restoredState = result.current.restoreNavigationState();
        expect(restoredState).toEqual(testState);
      });
    });

    it('should return null when no stored state exists', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSchemaNavigation(mockProjectId), { wrapper });

      act(() => {
        const restoredState = result.current.restoreNavigationState();
        expect(restoredState).toBeNull();
      });
    });

    it('should clear navigation state', () => {
      const testState = {
        scrollPosition: 300,
        timestamp: Date.now(),
      };

      sessionStorage.setItem(storageKey, JSON.stringify(testState));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSchemaNavigation(mockProjectId), { wrapper });

      act(() => {
        result.current.clearNavigationState();
      });

      expect(sessionStorage.getItem(storageKey)).toBeNull();
    });

    it('should detect if stored state exists', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSchemaNavigation(mockProjectId), { wrapper });

      // Initially no state
      expect(result.current.hasStoredState).toBe(false);

      // Add state
      act(() => {
        result.current.saveNavigationState({ scrollPosition: 100 });
      });

      // Re-render to check updated state
      const { result: newResult } = renderHook(() => useSchemaNavigation(mockProjectId));
      expect(newResult.current.hasStoredState).toBe(true);
    });
  });

  describe('State Expiration', () => {
    it('should ignore expired state (older than 1 hour)', () => {
      const expiredState = {
        scrollPosition: 100,
        timestamp: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
      };

      sessionStorage.setItem(storageKey, JSON.stringify(expiredState));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSchemaNavigation(mockProjectId), { wrapper });

      act(() => {
        const restoredState = result.current.restoreNavigationState();
        expect(restoredState).toBeNull();
      });

      // Should also clean up expired state
      expect(sessionStorage.getItem(storageKey)).toBeNull();
    });

    it('should restore valid state within expiration time', () => {
      const validState = {
        scrollPosition: 100,
        timestamp: Date.now() - (30 * 60 * 1000), // 30 minutes ago
      };

      sessionStorage.setItem(storageKey, JSON.stringify(validState));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSchemaNavigation(mockProjectId), { wrapper });

      act(() => {
        const restoredState = result.current.restoreNavigationState();
        expect(restoredState).toEqual(validState);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in sessionStorage gracefully', () => {
      sessionStorage.setItem(storageKey, 'invalid json');

      const wrapper = createWrapper();
      const { result } = renderHook(() => useSchemaNavigation(mockProjectId), { wrapper });

      act(() => {
        const restoredState = result.current.restoreNavigationState();
        expect(restoredState).toBeNull();
      });

      // Should clean up invalid data
      expect(sessionStorage.getItem(storageKey)).toBeNull();
    });

    it('should handle sessionStorage quota exceeded gracefully', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSchemaNavigation(mockProjectId), { wrapper });

      // Mock sessionStorage.setItem to throw
      const originalSetItem = sessionStorage.setItem;
      sessionStorage.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError');
      });

      act(() => {
        // Should not throw error
        expect(() => {
          result.current.saveNavigationState({ scrollPosition: 100 });
        }).not.toThrow();
      });

      // Restore original method
      sessionStorage.setItem = originalSetItem;
    });
  });

  describe('Project ID Changes', () => {
    it('should use different storage keys for different projects', () => {
      const project1 = 'project-1';
      const project2 = 'project-2';

      const wrapper = createWrapper();
      const { result: result1 } = renderHook(() => useSchemaNavigation(project1), { wrapper });
      const { result: result2 } = renderHook(() => useSchemaNavigation(project2), { wrapper });

      act(() => {
        result1.current.saveNavigationState({ scrollPosition: 100 });
        result2.current.saveNavigationState({ scrollPosition: 200 });
      });

      act(() => {
        const state1 = result1.current.restoreNavigationState();
        const state2 = result2.current.restoreNavigationState();

        expect(state1?.scrollPosition).toBe(100);
        expect(state2?.scrollPosition).toBe(200);
      });
    });
  });

  describe('Navigation with State Preservation', () => {
    it('should navigate to schemas and save current state', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSchemaNavigation(mockProjectId), { wrapper });

      const currentState = {
        scrollPosition: 150,
        formData: { name: 'Current Form' },
      };

      act(() => {
        result.current.navigateToSchemas(currentState);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/projects/test-project-123/schemas');

      // Check if state was saved
      const savedState = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
      expect(savedState.scrollPosition).toBe(150);
      expect(savedState.formData).toEqual({ name: 'Current Form' });
    });

    it('should navigate to schema detail and save current state', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useSchemaNavigation(mockProjectId), { wrapper });

      const currentState = {
        selectedItems: ['item1'],
        filters: { type: 'draft' },
      };

      act(() => {
        result.current.navigateToSchemaDetail('schema-123', currentState);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/projects/test-project-123/schemas/schema-123');

      // Check if state was saved
      const savedState = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
      expect(savedState.selectedItems).toEqual(['item1']);
      expect(savedState.filters).toEqual({ type: 'draft' });
    });
  });
});