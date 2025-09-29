/**
 * Schema Management Hook
 *
 * React hook for basic schema CRUD operations with React Query integration.
 * Provides data fetching, caching, and state management for schema operations.
 */

import { useMemo } from 'react';
import { useQuery } from 'react-query';
import {
  useProjectSchemas,
  useSchemaUsageStats,
  schemaQueryKeys,
} from '../../services/schemaQueries';
import { ComponentSchema } from '../../services/api';
import { SchemaUsageStats } from '../../types/schema';

interface UseSchemaManagementOptions {
  includeGlobal?: boolean;
  includeUsageStats?: boolean;
  enabled?: boolean;
}

interface UseSchemaManagementResult {
  schemas: ComponentSchema[];
  usageStats: Record<string, SchemaUsageStats>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Computed values
  defaultSchema?: ComponentSchema;
  activeSchemas: ComponentSchema[];
  inactiveSchemas: ComponentSchema[];
  schemaCount: {
    total: number;
    active: number;
    inactive: number;
    default: number;
  };
}

export const useSchemaManagement = (
  projectId: string,
  options: UseSchemaManagementOptions = {}
): UseSchemaManagementResult => {
  const {
    includeGlobal = true,
    includeUsageStats = true,
    enabled = true,
  } = options;

  // Fetch project schemas
  const {
    data: schemaResponse,
    isLoading: schemasLoading,
    error: schemasError,
    refetch: refetchSchemas,
  } = useProjectSchemas(projectId, includeGlobal, {
    enabled: enabled && !!projectId,
  });

  // Fetch usage statistics
  const {
    data: usageStatsArray,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useSchemaUsageStats(projectId, {
    enabled: enabled && includeUsageStats && !!projectId,
  });

  // Process and memoize data
  const result = useMemo(() => {
    const schemas = schemaResponse?.schemas || [];

    // Convert usage stats array to record for easy lookup
    const usageStats: Record<string, SchemaUsageStats> = {};
    if (usageStatsArray) {
      usageStatsArray.forEach((stat) => {
        usageStats[stat.schema_id] = stat;
      });
    }

    // Find default schema
    const defaultSchema = schemas.find((schema) => schema.is_default);

    // Categorize schemas
    const activeSchemas = schemas.filter((schema) => schema.is_active);
    const inactiveSchemas = schemas.filter((schema) => !schema.is_active);

    // Calculate counts
    const schemaCount = {
      total: schemas.length,
      active: activeSchemas.length,
      inactive: inactiveSchemas.length,
      default: schemas.filter((schema) => schema.is_default).length,
    };

    return {
      schemas,
      usageStats,
      defaultSchema,
      activeSchemas,
      inactiveSchemas,
      schemaCount,
    };
  }, [schemaResponse, usageStatsArray]);

  // Combine loading states and errors
  const isLoading = schemasLoading || (includeUsageStats && statsLoading);
  const error = schemasError || (includeUsageStats ? statsError : null);

  // Combined refetch function
  const refetch = () => {
    refetchSchemas();
    if (includeUsageStats) {
      refetchStats();
    }
  };

  return {
    ...result,
    isLoading,
    error: error as Error | null,
    refetch,
  };
};

// Additional hook for specific schema operations
export const useSchemaOperations = (projectId: string) => {
  const { schemas, usageStats, refetch } = useSchemaManagement(projectId);

  // Helper functions for common operations
  const getSchemaById = (schemaId: string): ComponentSchema | undefined => {
    return schemas.find((schema) => schema.id === schemaId);
  };

  const getSchemaUsage = (schemaId: string): SchemaUsageStats | undefined => {
    return usageStats[schemaId];
  };

  const getSortedSchemas = (
    sortBy: 'name' | 'created_at' | 'usage_count' = 'name',
    order: 'asc' | 'desc' = 'asc'
  ): ComponentSchema[] => {
    const sorted = [...schemas].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'usage_count':
          const aUsage = usageStats[a.id]?.component_count || 0;
          const bUsage = usageStats[b.id]?.component_count || 0;
          comparison = aUsage - bUsage;
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });

    return sorted;
  };

  const searchSchemas = (searchTerm: string): ComponentSchema[] => {
    if (!searchTerm.trim()) return schemas;

    const term = searchTerm.toLowerCase();
    return schemas.filter(
      (schema) =>
        schema.name.toLowerCase().includes(term) ||
        (schema.description && schema.description.toLowerCase().includes(term))
    );
  };

  return {
    schemas,
    usageStats,
    refetch,
    getSchemaById,
    getSchemaUsage,
    getSortedSchemas,
    searchSchemas,
  };
};

export default useSchemaManagement;