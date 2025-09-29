/**
 * useSchemaManagement Hook Tests
 *
 * Tests for useSchemaManagement hook including:
 * - Data fetching and processing
 * - Loading and error states
 * - Schema categorization and computed values
 * - Refetch functionality
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useSchemaManagement } from './useSchemaManagement';
import React from 'react';

// Mock schema queries
jest.mock('../../services/schemaQueries.ts', () => ({
  useProjectSchemas: jest.fn(),
  useSchemaUsageStats: jest.fn(),
  schemaQueryKeys: {
    all: () => ['schemas'],
    project: (projectId: string) => ['schemas', projectId],
    schema: (schemaId: string) => ['schemas', 'schema', schemaId],
  },
}));

// Mock data
const mockSchemas = [
  {
    id: 'schema-1',
    name: 'Default Schema',
    description: 'Default component schema',
    version: '1.0.0',
    is_active: true,
    is_default: true,
    project_id: 'test-project-123',
    fields: [{ id: 'field-1', name: 'Field 1', type: 'text' }],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 'schema-2',
    name: 'Custom Schema',
    description: 'Custom component schema',
    version: '1.0.0',
    is_active: true,
    is_default: false,
    project_id: 'test-project-123',
    fields: [
      { id: 'field-2', name: 'Field 2', type: 'text' },
      { id: 'field-3', name: 'Field 3', type: 'number' },
    ],
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
  },
  {
    id: 'schema-3',
    name: 'Inactive Schema',
    description: 'Inactive schema',
    version: '1.0.0',
    is_active: false,
    is_default: false,
    project_id: 'test-project-123',
    fields: [],
    created_at: '2023-01-03T00:00:00Z',
    updated_at: '2023-01-03T00:00:00Z',
  },
];

const mockUsageStats = [
  { schema_id: 'schema-1', component_count: 5, last_used: '2023-01-10T00:00:00Z' },
  { schema_id: 'schema-2', component_count: 3, last_used: '2023-01-09T00:00:00Z' },
  { schema_id: 'schema-3', component_count: 0, last_used: null },
];

describe('useSchemaManagement', () => {
  const mockProjectId = 'test-project-123';

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Fetching', () => {
    it('fetches project schemas correctly', async () => {
      // Mock useProjectSchemas
      const { useProjectSchemas, useSchemaUsageStats } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: { schemas: mockSchemas, total: mockSchemas.length },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      // Mock useSchemaUsageStats
      useSchemaUsageStats.mockReturnValue({
        data: mockUsageStats,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { result } = renderHook(
        () => useSchemaManagement(mockProjectId),
        { wrapper: createWrapper() }
      );

      expect(result.current.schemas).toEqual(mockSchemas);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('handles loading state correctly', async () => {
      const { useProjectSchemas, useSchemaUsageStats } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      useSchemaUsageStats.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { result } = renderHook(
        () => useSchemaManagement(mockProjectId),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.schemas).toEqual([]);
    });

    it('handles error state correctly', async () => {
      const mockError = new Error('Failed to fetch schemas');

      const { useProjectSchemas, useSchemaUsageStats } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
        refetch: jest.fn(),
      });

      useSchemaUsageStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { result } = renderHook(
        () => useSchemaManagement(mockProjectId),
        { wrapper: createWrapper() }
      );

      expect(result.current.error).toBe(mockError);
      expect(result.current.schemas).toEqual([]);
    });

    it('processes usage stats correctly', () => {
      const { useProjectSchemas, useSchemaUsageStats } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: { schemas: mockSchemas, total: mockSchemas.length },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useSchemaUsageStats.mockReturnValue({
        data: mockUsageStats,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { result } = renderHook(
        () => useSchemaManagement(mockProjectId),
        { wrapper: createWrapper() }
      );

      expect(result.current.usageStats['schema-1']).toEqual(mockUsageStats[0]);
      expect(result.current.usageStats['schema-2']).toEqual(mockUsageStats[1]);
      expect(result.current.usageStats['schema-3']).toEqual(mockUsageStats[2]);
    });
  });

  describe('Schema Categorization', () => {
    it('correctly identifies default schema', () => {
      const { useProjectSchemas, useSchemaUsageStats } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: { schemas: mockSchemas, total: mockSchemas.length },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useSchemaUsageStats.mockReturnValue({
        data: mockUsageStats,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { result } = renderHook(
        () => useSchemaManagement(mockProjectId),
        { wrapper: createWrapper() }
      );

      expect(result.current.defaultSchema).toEqual(mockSchemas[0]); // First schema is default
      expect(result.current.defaultSchema?.is_default).toBe(true);
    });

    it('categorizes active and inactive schemas correctly', () => {
      const { useProjectSchemas, useSchemaUsageStats } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: { schemas: mockSchemas, total: mockSchemas.length },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useSchemaUsageStats.mockReturnValue({
        data: mockUsageStats,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { result } = renderHook(
        () => useSchemaManagement(mockProjectId),
        { wrapper: createWrapper() }
      );

      expect(result.current.activeSchemas).toHaveLength(2); // schema-1 and schema-2
      expect(result.current.inactiveSchemas).toHaveLength(1); // schema-3
      expect(result.current.activeSchemas.every(s => s.is_active)).toBe(true);
      expect(result.current.inactiveSchemas.every(s => !s.is_active)).toBe(true);
    });

    it('calculates schema counts correctly', () => {
      const { useProjectSchemas, useSchemaUsageStats } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: { schemas: mockSchemas, total: mockSchemas.length },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useSchemaUsageStats.mockReturnValue({
        data: mockUsageStats,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { result } = renderHook(
        () => useSchemaManagement(mockProjectId),
        { wrapper: createWrapper() }
      );

      expect(result.current.schemaCount.total).toBe(3);
      expect(result.current.schemaCount.active).toBe(2);
      expect(result.current.schemaCount.inactive).toBe(1);
      expect(result.current.schemaCount.default).toBe(1);
    });
  });

  describe('Refetch Functionality', () => {
    it('calls refetch on both underlying queries', () => {
      const mockRefetchSchemas = jest.fn();
      const mockRefetchStats = jest.fn();

      const { useProjectSchemas, useSchemaUsageStats } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: { schemas: mockSchemas, total: mockSchemas.length },
        isLoading: false,
        error: null,
        refetch: mockRefetchSchemas,
      });

      useSchemaUsageStats.mockReturnValue({
        data: mockUsageStats,
        isLoading: false,
        error: null,
        refetch: mockRefetchStats,
      });

      const { result } = renderHook(
        () => useSchemaManagement(mockProjectId),
        { wrapper: createWrapper() }
      );

      result.current.refetch();

      expect(mockRefetchSchemas).toHaveBeenCalled();
      expect(mockRefetchStats).toHaveBeenCalled();
    });

    it('only refetches schemas when usage stats disabled', () => {
      const mockRefetchSchemas = jest.fn();
      const mockRefetchStats = jest.fn();

      const { useProjectSchemas, useSchemaUsageStats } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: { schemas: mockSchemas, total: mockSchemas.length },
        isLoading: false,
        error: null,
        refetch: mockRefetchSchemas,
      });

      useSchemaUsageStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: mockRefetchStats,
      });

      const { result } = renderHook(
        () => useSchemaManagement(mockProjectId, { includeUsageStats: false }),
        { wrapper: createWrapper() }
      );

      result.current.refetch();

      expect(mockRefetchSchemas).toHaveBeenCalled();
      expect(mockRefetchStats).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty project ID gracefully', () => {
      const { useProjectSchemas, useSchemaUsageStats } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useSchemaUsageStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { result } = renderHook(
        () => useSchemaManagement(''),
        { wrapper: createWrapper() }
      );

      expect(result.current.schemas).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('handles malformed schema response gracefully', () => {
      const { useProjectSchemas, useSchemaUsageStats } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: { invalid: 'response' }, // Malformed response
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useSchemaUsageStats.mockReturnValue({
        data: mockUsageStats,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { result } = renderHook(
        () => useSchemaManagement(mockProjectId),
        { wrapper: createWrapper() }
      );

      // Should handle malformed data gracefully
      expect(result.current.schemas).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('handles missing usage stats gracefully', () => {
      const { useProjectSchemas, useSchemaUsageStats } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: { schemas: mockSchemas, total: mockSchemas.length },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useSchemaUsageStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { result } = renderHook(
        () => useSchemaManagement(mockProjectId),
        { wrapper: createWrapper() }
      );

      expect(result.current.schemas).toEqual(mockSchemas);
      expect(result.current.usageStats).toEqual({});
    });
  });

  describe('Hook Options', () => {
    it('respects includeGlobal option', () => {
      const { useProjectSchemas } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: { schemas: mockSchemas, total: mockSchemas.length },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderHook(
        () => useSchemaManagement(mockProjectId, { includeGlobal: false }),
        { wrapper: createWrapper() }
      );

      expect(useProjectSchemas).toHaveBeenCalledWith(mockProjectId, false, expect.any(Object));
    });

    it('respects includeUsageStats option', () => {
      const { useProjectSchemas, useSchemaUsageStats } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: { schemas: mockSchemas, total: mockSchemas.length },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useSchemaUsageStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { result } = renderHook(
        () => useSchemaManagement(mockProjectId, { includeUsageStats: false }),
        { wrapper: createWrapper() }
      );

      expect(useSchemaUsageStats).toHaveBeenCalledWith(mockProjectId, { enabled: false });
      expect(result.current.isLoading).toBe(false); // Should not wait for stats loading
    });

    it('respects enabled option', () => {
      const { useProjectSchemas, useSchemaUsageStats } = require('../../services/schemaQueries.ts');
      useProjectSchemas.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useSchemaUsageStats.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderHook(
        () => useSchemaManagement(mockProjectId, { enabled: false }),
        { wrapper: createWrapper() }
      );

      expect(useProjectSchemas).toHaveBeenCalledWith(mockProjectId, true, { enabled: false });
      expect(useSchemaUsageStats).toHaveBeenCalledWith(mockProjectId, { enabled: false });
    });
  });
});