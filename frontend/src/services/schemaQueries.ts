/**
 * Schema React Query Configuration
 *
 * React Query hooks and configuration for schema management operations.
 * Provides optimized caching, error handling, and invalidation strategies.
 */

import * as React from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from 'react-query';
import {
  ComponentSchema,
  ComponentSchemaCreate,
  ComponentSchemaUpdate,
  ComponentSchemaField,
  ComponentSchemaFieldCreate,
  ComponentSchemaFieldUpdate,
  ComponentSchemaListResponse,
  FlexibleComponent,
  SchemaValidationResult,
  getProjectSchemas,
  getSchema,
  createSchema,
  updateSchema,
  deactivateSchema,
  getDefaultSchema,
  getGlobalDefaultSchema,
  setDefaultSchema,
  unsetDefaultSchema,
  addSchemaField,
  updateSchemaField,
  removeSchemaField,
  validateDataAgainstSchema,
  getComponentsBySchema,
  validateComponentAgainstSchema,
} from './api.ts';
import { schemaManagementService, SchemaUsageStats, SchemaMetrics, BulkValidationResult } from './schemaManagementService.ts';
import { useSchemaCache } from './schemaCacheService.ts';

// Query key factory for consistent cache management
export const schemaQueryKeys = {
  all: ['schemas'] as const,
  lists: () => [...schemaQueryKeys.all, 'list'] as const,
  list: (projectId: string, includeGlobal?: boolean) =>
    [...schemaQueryKeys.lists(), { projectId, includeGlobal }] as const,
  details: () => [...schemaQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...schemaQueryKeys.details(), id] as const,
  defaults: () => [...schemaQueryKeys.all, 'defaults'] as const,
  projectDefault: (projectId: string) => [...schemaQueryKeys.defaults(), 'project', projectId] as const,
  globalDefault: () => [...schemaQueryKeys.defaults(), 'global'] as const,
  usage: () => [...schemaQueryKeys.all, 'usage'] as const,
  usageStats: (projectId: string) => [...schemaQueryKeys.usage(), 'stats', projectId] as const,
  metrics: (projectId?: string) => [...schemaQueryKeys.usage(), 'metrics', projectId] as const,
  components: () => [...schemaQueryKeys.all, 'components'] as const,
  componentsBySchema: (schemaId: string) => [...schemaQueryKeys.components(), 'by-schema', schemaId] as const,
  validation: () => [...schemaQueryKeys.all, 'validation'] as const,
  validationResult: (schemaId: string, data: Record<string, any>) =>
    [...schemaQueryKeys.validation(), 'result', schemaId, data] as const,
};

// Schema List Queries
export const useProjectSchemas = (
  projectId: string,
  includeGlobal: boolean = true,
  options?: Omit<UseQueryOptions<ComponentSchemaListResponse>, 'queryKey' | 'queryFn'>
) => {
  return useQuery(
    schemaQueryKeys.list(projectId, includeGlobal),
    () => getProjectSchemas(projectId, includeGlobal),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      ...options,
    }
  );
};

// Schema Detail Queries
export const useSchema = (
  schemaId: string,
  options?: Omit<UseQueryOptions<ComponentSchema>, 'queryKey' | 'queryFn'>
) => {
  return useQuery(
    schemaQueryKeys.detail(schemaId),
    () => getSchema(schemaId),
    {
      enabled: !!schemaId,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      ...options,
    }
  );
};

// Default Schema Queries
export const useProjectDefaultSchema = (
  projectId: string,
  options?: Omit<UseQueryOptions<ComponentSchema>, 'queryKey' | 'queryFn'>
) => {
  return useQuery(
    schemaQueryKeys.projectDefault(projectId),
    () => getDefaultSchema(projectId),
    {
      enabled: !!projectId,
      staleTime: 10 * 60 * 1000, // Defaults change infrequently
      cacheTime: 15 * 60 * 1000,
      ...options,
    }
  );
};

export const useGlobalDefaultSchema = (
  options?: Omit<UseQueryOptions<ComponentSchema>, 'queryKey' | 'queryFn'>
) => {
  return useQuery(
    schemaQueryKeys.globalDefault(),
    () => getGlobalDefaultSchema(),
    {
      staleTime: 15 * 60 * 1000, // Global default rarely changes
      cacheTime: 30 * 60 * 1000,
      ...options,
    }
  );
};

// Usage and Analytics Queries
export const useSchemaUsageStats = (
  projectId: string,
  options?: Omit<UseQueryOptions<SchemaUsageStats[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery(
    schemaQueryKeys.usageStats(projectId),
    () => schemaManagementService.getSchemaUsageStats(projectId),
    {
      enabled: !!projectId,
      staleTime: 2 * 60 * 1000, // 2 minutes - usage stats change frequently
      cacheTime: 5 * 60 * 1000,
      ...options,
    }
  );
};

export const useSchemaMetrics = (
  projectId?: string,
  options?: Omit<UseQueryOptions<SchemaMetrics>, 'queryKey' | 'queryFn'>
) => {
  return useQuery(
    schemaQueryKeys.metrics(projectId),
    () => schemaManagementService.getSchemaMetrics(projectId),
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      ...options,
    }
  );
};

// Component-Schema Relationship Queries
export const useComponentsBySchema = (
  schemaId: string,
  options?: Omit<UseQueryOptions<FlexibleComponent[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery(
    schemaQueryKeys.componentsBySchema(schemaId),
    () => getComponentsBySchema(schemaId),
    {
      enabled: !!schemaId,
      staleTime: 2 * 60 * 1000,
      cacheTime: 5 * 60 * 1000,
      ...options,
    }
  );
};

// Validation Queries
export const useSchemaValidation = (
  schemaId: string,
  data: Record<string, any>,
  enabled: boolean = true,
  options?: Omit<UseQueryOptions<SchemaValidationResult>, 'queryKey' | 'queryFn' | 'enabled'>
) => {
  return useQuery(
    schemaQueryKeys.validationResult(schemaId, data),
    () => validateDataAgainstSchema(schemaId, data),
    {
      enabled: enabled && !!schemaId && Object.keys(data).length > 0,
      staleTime: 30 * 1000, // 30 seconds - validation is time-sensitive
      cacheTime: 2 * 60 * 1000,
      retry: 1, // Limited retries for validation
      ...options,
    }
  );
};

// ========================================
// CACHE-ENHANCED QUERY HOOKS
// ========================================

/**
 * Enhanced schema list hook with client-side caching
 */
export const useCachedProjectSchemas = (
  projectId: string,
  includeGlobal: boolean = true,
  options?: Omit<UseQueryOptions<ComponentSchemaListResponse>, 'queryKey' | 'queryFn'>
) => {
  const cache = useSchemaCache();

  return useQuery(
    schemaQueryKeys.list(projectId, includeGlobal),
    async () => {
      const filters = { projectId, includeGlobal };

      // Check cache first
      const cachedSchemas = cache.getCachedSchemas(filters);
      if (cachedSchemas) {
        return { schemas: cachedSchemas, total: cachedSchemas.length };
      }

      // Fetch from API and cache result
      const result = await getProjectSchemas(projectId, includeGlobal);
      cache.cacheSchemas(result.schemas, filters);

      return result;
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      ...options,
    }
  );
};

/**
 * Enhanced schema detail hook with client-side caching
 */
export const useCachedSchema = (
  schemaId: string,
  options?: Omit<UseQueryOptions<ComponentSchema>, 'queryKey' | 'queryFn'>
) => {
  const cache = useSchemaCache();

  return useQuery(
    schemaQueryKeys.detail(schemaId),
    async () => {
      // Check cache first
      const cachedSchema = cache.getCachedSchema(schemaId);
      if (cachedSchema) {
        return cachedSchema;
      }

      // Fetch from API and cache result
      const schema = await getSchema(schemaId);
      cache.cacheSchema(schema);

      return schema;
    },
    {
      enabled: !!schemaId,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      ...options,
    }
  );
};

/**
 * Enhanced validation hook with client-side caching
 */
export const useCachedSchemaValidation = (
  schemaId: string,
  data: Record<string, any>,
  enabled: boolean = true,
  options?: Omit<UseQueryOptions<SchemaValidationResult>, 'queryKey' | 'queryFn' | 'enabled'>
) => {
  const cache = useSchemaCache();

  return useQuery(
    schemaQueryKeys.validationResult(schemaId, data),
    async () => {
      // Check cache first for validation results
      const cachedResult = cache.getCachedValidationResult(schemaId, data);
      if (cachedResult) {
        return cachedResult;
      }

      // Perform validation and cache result
      const result = await validateDataAgainstSchema(schemaId, data);
      cache.cacheValidationResult(schemaId, data, result);

      return result;
    },
    {
      enabled: enabled && !!schemaId && Object.keys(data).length > 0,
      staleTime: 30 * 1000, // 30 seconds - validation is time-sensitive
      cacheTime: 2 * 60 * 1000,
      retry: 1,
      ...options,
    }
  );
};

// Schema Mutations
export const useCreateSchema = (
  options?: UseMutationOptions<ComponentSchema, unknown, ComponentSchemaCreate>
) => {
  const queryClient = useQueryClient();
  const cache = useSchemaCache();

  return useMutation(createSchema, {
    onSuccess: (newSchema) => {
      // Invalidate React Query cache
      queryClient.invalidateQueries(schemaQueryKeys.lists());
      queryClient.setQueryData(schemaQueryKeys.detail(newSchema.id), newSchema);

      // Invalidate client-side cache
      cache.invalidateAllSchemas();
      cache.cacheSchema(newSchema);

      // Invalidate metrics and usage stats
      if (newSchema.project_id) {
        queryClient.invalidateQueries(schemaQueryKeys.usageStats(newSchema.project_id));
        queryClient.invalidateQueries(schemaQueryKeys.metrics(newSchema.project_id));
      }
      queryClient.invalidateQueries(schemaQueryKeys.metrics());
    },
    ...options,
  });
};

export const useUpdateSchema = (
  options?: UseMutationOptions<ComponentSchema, unknown, { schemaId: string; updates: ComponentSchemaUpdate }>
) => {
  const queryClient = useQueryClient();
  const cache = useSchemaCache();

  return useMutation(
    ({ schemaId, updates }) => updateSchema(schemaId, updates),
    {
      onSuccess: (updatedSchema, { schemaId }) => {
        // Update React Query cache
        queryClient.setQueryData(schemaQueryKeys.detail(schemaId), updatedSchema);
        queryClient.invalidateQueries(schemaQueryKeys.lists());
        queryClient.invalidateQueries(schemaQueryKeys.defaults());

        // Update client-side cache
        cache.invalidateSchema(schemaId);
        cache.cacheSchema(updatedSchema);

        // Invalidate usage stats and metrics
        if (updatedSchema.project_id) {
          queryClient.invalidateQueries(schemaQueryKeys.usageStats(updatedSchema.project_id));
          queryClient.invalidateQueries(schemaQueryKeys.metrics(updatedSchema.project_id));
        }
        queryClient.invalidateQueries(schemaQueryKeys.metrics());
      },
      ...options,
    }
  );
};

export const useDeactivateSchema = (
  options?: UseMutationOptions<void, unknown, string>
) => {
  const queryClient = useQueryClient();

  return useMutation(deactivateSchema, {
    onSuccess: (_, schemaId) => {
      // Remove from detail cache
      queryClient.removeQueries(schemaQueryKeys.detail(schemaId));

      // Invalidate all schema-related queries
      queryClient.invalidateQueries(schemaQueryKeys.all);
    },
    ...options,
  });
};

// Schema Field Mutations
export const useAddSchemaField = (
  options?: UseMutationOptions<ComponentSchemaField, unknown, { schemaId: string; fieldData: ComponentSchemaFieldCreate }>
) => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ schemaId, fieldData }) => addSchemaField(schemaId, fieldData),
    {
      onSuccess: (_, { schemaId }) => {
        // Invalidate schema detail to refresh fields
        queryClient.invalidateQueries(schemaQueryKeys.detail(schemaId));

        // Invalidate components using this schema as field changes affect validation
        queryClient.invalidateQueries(schemaQueryKeys.componentsBySchema(schemaId));
      },
      ...options,
    }
  );
};

export const useUpdateSchemaField = (
  options?: UseMutationOptions<ComponentSchemaField, unknown, { fieldId: string; updates: ComponentSchemaFieldUpdate; schemaId?: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ fieldId, updates }) => updateSchemaField(fieldId, updates),
    {
      onSuccess: (_, { schemaId }) => {
        // If schema ID is provided, invalidate specific schema
        if (schemaId) {
          queryClient.invalidateQueries(schemaQueryKeys.detail(schemaId));
          queryClient.invalidateQueries(schemaQueryKeys.componentsBySchema(schemaId));
        } else {
          // Otherwise, invalidate all schema details (less efficient but safe)
          queryClient.invalidateQueries(schemaQueryKeys.details());
        }
      },
      ...options,
    }
  );
};

export const useRemoveSchemaField = (
  options?: UseMutationOptions<void, unknown, { fieldId: string; schemaId?: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ fieldId }) => removeSchemaField(fieldId),
    {
      onSuccess: (_, { schemaId }) => {
        // If schema ID is provided, invalidate specific schema
        if (schemaId) {
          queryClient.invalidateQueries(schemaQueryKeys.detail(schemaId));
          queryClient.invalidateQueries(schemaQueryKeys.componentsBySchema(schemaId));
        } else {
          // Otherwise, invalidate all schema details
          queryClient.invalidateQueries(schemaQueryKeys.details());
        }
      },
      ...options,
    }
  );
};

// Advanced Management Mutations
export const useDuplicateSchema = (
  options?: UseMutationOptions<ComponentSchema, unknown, { sourceSchemaId: string; newName: string; projectId?: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ sourceSchemaId, newName, projectId }) =>
      schemaManagementService.duplicateSchema(sourceSchemaId, newName, projectId),
    {
      onSuccess: (newSchema) => {
        // Invalidate schema lists
        queryClient.invalidateQueries(schemaQueryKeys.lists());

        // Add to detail cache
        queryClient.setQueryData(schemaQueryKeys.detail(newSchema.id), newSchema);

        // Invalidate metrics
        if (newSchema.project_id) {
          queryClient.invalidateQueries(schemaQueryKeys.metrics(newSchema.project_id));
        }
        queryClient.invalidateQueries(schemaQueryKeys.metrics());
      },
      ...options,
    }
  );
};

export const useBulkValidateComponents = (
  options?: UseMutationOptions<BulkValidationResult, unknown, string[]>
) => {
  return useMutation(
    (componentIds) => schemaManagementService.bulkValidateComponents(componentIds),
    {
      retry: 1, // Limited retries for bulk operations
      ...options,
    }
  );
};

// Utility hooks for common patterns
export const useSchemaOptions = (projectId: string, includeGlobal: boolean = true) => {
  const { data: schemas, isLoading, error } = useProjectSchemas(projectId, includeGlobal);

  const options = React.useMemo(() => {
    if (!schemas?.schemas) return [];

    return schemas.schemas
      .filter(schema => schema.is_active)
      .map(schema => ({
        value: schema.id,
        label: schema.name,
        description: schema.description,
        isDefault: schema.is_default,
        fieldCount: schema.fields.length,
      }))
      .sort((a, b) => {
        // Sort by default first, then alphabetically
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return a.label.localeCompare(b.label);
      });
  }, [schemas]);

  return { options, isLoading, error };
};

export const useSchemaInvalidation = () => {
  const queryClient = useQueryClient();

  return React.useCallback((schemaId?: string, projectId?: string) => {
    if (schemaId) {
      // Invalidate specific schema
      queryClient.invalidateQueries(schemaQueryKeys.detail(schemaId));
      queryClient.invalidateQueries(schemaQueryKeys.componentsBySchema(schemaId));
    }

    if (projectId) {
      // Invalidate project-specific queries
      queryClient.invalidateQueries(schemaQueryKeys.list(projectId));
      queryClient.invalidateQueries(schemaQueryKeys.usageStats(projectId));
      queryClient.invalidateQueries(schemaQueryKeys.metrics(projectId));
    }

    // Invalidate general queries
    queryClient.invalidateQueries(schemaQueryKeys.lists());
    queryClient.invalidateQueries(schemaQueryKeys.metrics());
  }, [queryClient]);
};

// Default Schema Management Mutations
export const useSetDefaultSchema = (
  options?: UseMutationOptions<ComponentSchema, unknown, { projectId: string; schemaId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ projectId, schemaId }) => setDefaultSchema(projectId, schemaId),
    {
      onSuccess: (updatedSchema, { projectId, schemaId }) => {
        // Update the schema detail cache to reflect the new default status
        queryClient.setQueryData(
          schemaQueryKeys.detail(schemaId),
          (oldData: ComponentSchema | undefined) => {
            return oldData ? { ...oldData, is_default: true } : updatedSchema;
          }
        );

        // Update project default cache
        queryClient.setQueryData(schemaQueryKeys.projectDefault(projectId), updatedSchema);

        // Invalidate project schema lists to reflect changes
        queryClient.invalidateQueries(schemaQueryKeys.list(projectId));

        // Invalidate other schemas that may have been default before
        queryClient.invalidateQueries(schemaQueryKeys.lists());
        queryClient.invalidateQueries(schemaQueryKeys.defaults());
      },
      ...options,
    }
  );
};

export const useUnsetDefaultSchema = (
  options?: UseMutationOptions<void, unknown, { projectId: string; schemaId: string }>
) => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ projectId, schemaId }) => unsetDefaultSchema(projectId, schemaId),
    {
      onSuccess: (_, { projectId, schemaId }) => {
        // Update the schema detail cache to reflect the removed default status
        queryClient.setQueryData(
          schemaQueryKeys.detail(schemaId),
          (oldData: ComponentSchema | undefined) => {
            return oldData ? { ...oldData, is_default: false } : undefined;
          }
        );

        // Remove project default cache
        queryClient.removeQueries(schemaQueryKeys.projectDefault(projectId));

        // Invalidate project schema lists to reflect changes
        queryClient.invalidateQueries(schemaQueryKeys.list(projectId));

        // Invalidate default-related queries
        queryClient.invalidateQueries(schemaQueryKeys.defaults());
      },
      ...options,
    }
  );
};