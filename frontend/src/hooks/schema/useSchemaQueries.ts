/**
 * Schema-Specific React Query Hooks
 *
 * Provides optimized React Query hooks with intelligent caching,
 * background refetching, and error recovery specifically for schema operations.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from 'react-query';
import { useCallback, useEffect, useRef } from 'react';
import {
  ComponentSchema,
  ComponentSchemaCreate,
  ComponentSchemaUpdate,
  ComponentSchemaField,
  ComponentSchemaFieldCreate,
  ComponentSchemaFieldUpdate,
  SchemaUsageStats,
  SchemaMetrics,
  BulkValidationResult,
} from '../../types/schema';
import {
  getSchemas,
  getSchema,
  createSchema,
  updateSchema,
  deleteSchema,
  getSchemaFields,
  createSchemaField,
  updateSchemaField,
  deleteSchemaField,
  reorderSchemaFields,
  validateSchemaData,
  getSchemaUsageStats,
  getSchemaMetrics,
  bulkValidateComponents,
} from '../../services/api';
import { BackgroundRefetchManager } from '../../config/schemaQueryClient';

// ========================================
// SCHEMA LIST QUERIES
// ========================================

export const useSchemas = (
  projectId?: string,
  options?: UseQueryOptions<ComponentSchema[], Error>
) => {
  const queryClient = useQueryClient();
  const refetchManagerRef = useRef<BackgroundRefetchManager | null>(null);

  const queryKey = projectId ? ['schemas', 'project', projectId] : ['schemas'];

  const query = useQuery(
    queryKey,
    () => getSchemas(projectId),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      keepPreviousData: true,
      notifyOnChangeProps: 'tracked',
      ...options,
    }
  );

  // Setup background refetching
  useEffect(() => {
    if (!refetchManagerRef.current) {
      refetchManagerRef.current = new BackgroundRefetchManager(queryClient);
    }

    const manager = refetchManagerRef.current;

    // Start background refetch for schema list (every 2 minutes)
    manager.startBackgroundRefetch(queryKey, 2 * 60 * 1000);

    return () => {
      manager.stopBackgroundRefetch(queryKey);
    };
  }, [queryKey, queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refetchManagerRef.current) {
        refetchManagerRef.current.destroy();
      }
    };
  }, []);

  return query;
};

// ========================================
// INDIVIDUAL SCHEMA QUERIES
// ========================================

export const useSchema = (
  schemaId: string | null,
  options?: UseQueryOptions<ComponentSchema, Error>
) => {
  const queryClient = useQueryClient();
  const refetchManagerRef = useRef<BackgroundRefetchManager | null>(null);

  const queryKey = ['schema', schemaId];

  const query = useQuery(
    queryKey,
    () => {
      if (!schemaId) throw new Error('Schema ID is required');
      return getSchema(schemaId);
    },
    {
      enabled: Boolean(schemaId),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 15 * 60 * 1000, // 15 minutes for individual schemas
      keepPreviousData: true,
      notifyOnChangeProps: 'tracked',
      ...options,
    }
  );

  // Setup background refetching for active schema
  useEffect(() => {
    if (!schemaId) return;

    if (!refetchManagerRef.current) {
      refetchManagerRef.current = new BackgroundRefetchManager(queryClient);
    }

    const manager = refetchManagerRef.current;

    // Start background refetch for active schema (every 1 minute)
    manager.startBackgroundRefetch(queryKey, 60 * 1000);

    return () => {
      manager.stopBackgroundRefetch(queryKey);
    };
  }, [queryKey, queryClient, schemaId]);

  return query;
};

// ========================================
// SCHEMA FIELDS QUERIES
// ========================================

export const useSchemaFields = (
  schemaId: string | null,
  options?: UseQueryOptions<ComponentSchemaField[], Error>
) => {
  const queryKey = ['schema-fields', schemaId];

  return useQuery(
    queryKey,
    () => {
      if (!schemaId) throw new Error('Schema ID is required');
      return getSchemaFields(schemaId);
    },
    {
      enabled: Boolean(schemaId),
      staleTime: 3 * 60 * 1000, // 3 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      keepPreviousData: true,
      ...options,
    }
  );
};

// ========================================
// SCHEMA USAGE AND METRICS
// ========================================

export const useSchemaUsageStats = (
  schemaId?: string,
  options?: UseQueryOptions<SchemaUsageStats[], Error>
) => {
  const queryKey = schemaId ? ['schema-usage', schemaId] : ['schema-usage'];

  return useQuery(
    queryKey,
    () => getSchemaUsageStats(schemaId),
    {
      staleTime: 10 * 60 * 1000, // 10 minutes - usage stats change less frequently
      cacheTime: 30 * 60 * 1000, // 30 minutes
      keepPreviousData: true,
      refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes for stats
      ...options,
    }
  );
};

export const useSchemaMetrics = (
  options?: UseQueryOptions<SchemaMetrics, Error>
) => {
  return useQuery(
    ['schema-metrics'],
    getSchemaMetrics,
    {
      staleTime: 15 * 60 * 1000, // 15 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      keepPreviousData: true,
      refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
      ...options,
    }
  );
};

// ========================================
// SCHEMA VALIDATION QUERIES
// ========================================

export const useSchemaValidation = (
  schemaId: string | null,
  data: Record<string, any>,
  options?: UseQueryOptions<any, Error>
) => {
  return useQuery(
    ['schema-validation', schemaId, data],
    () => {
      if (!schemaId) throw new Error('Schema ID is required');
      return validateSchemaData(schemaId, data);
    },
    {
      enabled: Boolean(schemaId && data && Object.keys(data).length > 0),
      staleTime: 1 * 60 * 1000, // 1 minute - validation should be fresh
      cacheTime: 5 * 60 * 1000, // 5 minutes
      keepPreviousData: false, // Always get fresh validation
      ...options,
    }
  );
};

export const useBulkValidation = (
  schemaId: string | null,
  componentIds: string[],
  options?: UseQueryOptions<BulkValidationResult, Error>
) => {
  return useQuery(
    ['bulk-validation', schemaId, componentIds],
    () => {
      if (!schemaId) throw new Error('Schema ID is required');
      return bulkValidateComponents(schemaId, componentIds);
    },
    {
      enabled: Boolean(schemaId && componentIds.length > 0),
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      keepPreviousData: true,
      ...options,
    }
  );
};

// ========================================
// SCHEMA MUTATIONS WITH OPTIMISTIC UPDATES
// ========================================

export const useCreateSchema = (
  options?: UseMutationOptions<ComponentSchema, Error, ComponentSchemaCreate>
) => {
  const queryClient = useQueryClient();

  return useMutation(createSchema, {
    onMutate: async (newSchema) => {
      // Cancel any outgoing refetches for schema lists
      await queryClient.cancelQueries(['schemas']);

      // Snapshot the previous value
      const previousSchemas = queryClient.getQueryData<ComponentSchema[]>(['schemas']);

      // Optimistically update schema list
      const optimisticSchema: ComponentSchema = {
        id: `temp-${Date.now()}`,
        ...newSchema,
        fields: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData(['schemas'], (old: ComponentSchema[] | undefined) => {
        return old ? [...old, optimisticSchema] : [optimisticSchema];
      });

      return { previousSchemas, optimisticSchema };
    },

    onError: (error, newSchema, context) => {
      // Rollback optimistic update
      if (context?.previousSchemas) {
        queryClient.setQueryData(['schemas'], context.previousSchemas);
      }
    },

    onSuccess: (data, variables, context) => {
      // Replace optimistic data with real data
      queryClient.setQueryData(['schemas'], (old: ComponentSchema[] | undefined) => {
        if (!old) return [data];
        return old.map(schema =>
          schema.id === context?.optimisticSchema.id ? data : schema
        );
      });

      // Cache the new schema individually
      queryClient.setQueryData(['schema', data.id], data);
    },

    onSettled: () => {
      // Invalidate and refetch schema list
      queryClient.invalidateQueries(['schemas']);
      queryClient.invalidateQueries(['schema-metrics']);
    },

    ...options,
  });
};

export const useUpdateSchema = (
  schemaId: string,
  options?: UseMutationOptions<ComponentSchema, Error, ComponentSchemaUpdate>
) => {
  const queryClient = useQueryClient();

  return useMutation(
    (updates) => updateSchema(schemaId, updates),
    {
      onMutate: async (updates) => {
        // Cancel queries
        await queryClient.cancelQueries(['schema', schemaId]);
        await queryClient.cancelQueries(['schemas']);

        // Get previous data
        const previousSchema = queryClient.getQueryData<ComponentSchema>(['schema', schemaId]);

        if (!previousSchema) {
          throw new Error('Schema not found in cache');
        }

        // Apply optimistic update
        const optimisticSchema: ComponentSchema = {
          ...previousSchema,
          ...updates,
          updated_at: new Date().toISOString(),
        };

        queryClient.setQueryData(['schema', schemaId], optimisticSchema);

        // Update in schemas list
        queryClient.setQueryData(['schemas'], (old: ComponentSchema[] | undefined) => {
          if (!old) return undefined;
          return old.map(schema =>
            schema.id === schemaId ? optimisticSchema : schema
          );
        });

        return { previousSchema };
      },

      onError: (error, updates, context) => {
        // Rollback
        if (context?.previousSchema) {
          queryClient.setQueryData(['schema', schemaId], context.previousSchema);

          queryClient.setQueryData(['schemas'], (old: ComponentSchema[] | undefined) => {
            if (!old) return undefined;
            return old.map(schema =>
              schema.id === schemaId ? context.previousSchema : schema
            );
          });
        }
      },

      onSuccess: (data) => {
        // Update with server data
        queryClient.setQueryData(['schema', schemaId], data);

        queryClient.setQueryData(['schemas'], (old: ComponentSchema[] | undefined) => {
          if (!old) return undefined;
          return old.map(schema =>
            schema.id === schemaId ? data : schema
          );
        });
      },

      onSettled: () => {
        queryClient.invalidateQueries(['schema', schemaId]);
        queryClient.invalidateQueries(['schemas']);
        queryClient.invalidateQueries(['schema-usage']);
      },

      ...options,
    }
  );
};

export const useDeleteSchema = (
  options?: UseMutationOptions<void, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation(deleteSchema, {
    onMutate: async (schemaId) => {
      await queryClient.cancelQueries(['schemas']);

      const previousSchemas = queryClient.getQueryData<ComponentSchema[]>(['schemas']);

      // Optimistically remove from list
      queryClient.setQueryData(['schemas'], (old: ComponentSchema[] | undefined) => {
        return old ? old.filter(schema => schema.id !== schemaId) : undefined;
      });

      // Remove individual cache entry
      queryClient.removeQueries(['schema', schemaId]);

      return { previousSchemas, deletedSchemaId: schemaId };
    },

    onError: (error, schemaId, context) => {
      // Rollback
      if (context?.previousSchemas) {
        queryClient.setQueryData(['schemas'], context.previousSchemas);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries(['schemas']);
      queryClient.invalidateQueries(['schema-metrics']);
    },

    ...options,
  });
};

// ========================================
// FIELD MUTATIONS
// ========================================

export const useCreateSchemaField = (
  schemaId: string,
  options?: UseMutationOptions<ComponentSchemaField, Error, ComponentSchemaFieldCreate>
) => {
  const queryClient = useQueryClient();

  return useMutation(
    (field) => createSchemaField(schemaId, field),
    {
      onMutate: async (newField) => {
        await queryClient.cancelQueries(['schema', schemaId]);

        const previousSchema = queryClient.getQueryData<ComponentSchema>(['schema', schemaId]);

        if (previousSchema) {
          const optimisticField: ComponentSchemaField = {
            id: `temp-${Date.now()}`,
            ...newField,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const optimisticSchema: ComponentSchema = {
            ...previousSchema,
            fields: [...previousSchema.fields, optimisticField].sort(
              (a, b) => a.display_order - b.display_order
            ),
          };

          queryClient.setQueryData(['schema', schemaId], optimisticSchema);

          return { previousSchema, optimisticField };
        }

        return {};
      },

      onError: (error, newField, context) => {
        if (context?.previousSchema) {
          queryClient.setQueryData(['schema', schemaId], context.previousSchema);
        }
      },

      onSuccess: (data, variables, context) => {
        queryClient.setQueryData(['schema', schemaId], (old: ComponentSchema | undefined) => {
          if (!old) return old;
          return {
            ...old,
            fields: old.fields.map(field =>
              field.id === context?.optimisticField?.id ? data : field
            ).sort((a, b) => a.display_order - b.display_order),
          };
        });
      },

      onSettled: () => {
        queryClient.invalidateQueries(['schema', schemaId]);
        queryClient.invalidateQueries(['schema-fields', schemaId]);
      },

      ...options,
    }
  );
};

export const useUpdateSchemaField = (
  schemaId: string,
  fieldId: string,
  options?: UseMutationOptions<ComponentSchemaField, Error, ComponentSchemaFieldUpdate>
) => {
  const queryClient = useQueryClient();

  return useMutation(
    (updates) => updateSchemaField(schemaId, fieldId, updates),
    {
      onMutate: async (updates) => {
        await queryClient.cancelQueries(['schema', schemaId]);

        const previousSchema = queryClient.getQueryData<ComponentSchema>(['schema', schemaId]);

        if (previousSchema) {
          const optimisticSchema: ComponentSchema = {
            ...previousSchema,
            fields: previousSchema.fields.map(field =>
              field.id === fieldId
                ? { ...field, ...updates, updated_at: new Date().toISOString() }
                : field
            ),
          };

          queryClient.setQueryData(['schema', schemaId], optimisticSchema);

          return { previousSchema };
        }

        return {};
      },

      onError: (error, updates, context) => {
        if (context?.previousSchema) {
          queryClient.setQueryData(['schema', schemaId], context.previousSchema);
        }
      },

      onSuccess: (data) => {
        queryClient.setQueryData(['schema', schemaId], (old: ComponentSchema | undefined) => {
          if (!old) return old;
          return {
            ...old,
            fields: old.fields.map(field =>
              field.id === fieldId ? data : field
            ),
          };
        });
      },

      onSettled: () => {
        queryClient.invalidateQueries(['schema', schemaId]);
        queryClient.invalidateQueries(['schema-fields', schemaId]);
      },

      ...options,
    }
  );
};

export const useDeleteSchemaField = (
  schemaId: string,
  options?: UseMutationOptions<void, Error, string>
) => {
  const queryClient = useQueryClient();

  return useMutation(
    (fieldId) => deleteSchemaField(schemaId, fieldId),
    {
      onMutate: async (fieldId) => {
        await queryClient.cancelQueries(['schema', schemaId]);

        const previousSchema = queryClient.getQueryData<ComponentSchema>(['schema', schemaId]);

        if (previousSchema) {
          const optimisticSchema: ComponentSchema = {
            ...previousSchema,
            fields: previousSchema.fields.filter(field => field.id !== fieldId),
          };

          queryClient.setQueryData(['schema', schemaId], optimisticSchema);

          return { previousSchema, deletedFieldId: fieldId };
        }

        return {};
      },

      onError: (error, fieldId, context) => {
        if (context?.previousSchema) {
          queryClient.setQueryData(['schema', schemaId], context.previousSchema);
        }
      },

      onSettled: () => {
        queryClient.invalidateQueries(['schema', schemaId]);
        queryClient.invalidateQueries(['schema-fields', schemaId]);
      },

      ...options,
    }
  );
};

export const useReorderSchemaFields = (
  schemaId: string,
  options?: UseMutationOptions<ComponentSchemaField[], Error, string[]>
) => {
  const queryClient = useQueryClient();

  return useMutation(
    (fieldIds) => reorderSchemaFields(schemaId, fieldIds),
    {
      onMutate: async (fieldIds) => {
        await queryClient.cancelQueries(['schema', schemaId]);

        const previousSchema = queryClient.getQueryData<ComponentSchema>(['schema', schemaId]);

        if (previousSchema) {
          const reorderedFields = fieldIds.map((id, index) => {
            const field = previousSchema.fields.find(f => f.id === id);
            if (!field) throw new Error(`Field ${id} not found`);
            return { ...field, display_order: index };
          });

          const optimisticSchema: ComponentSchema = {
            ...previousSchema,
            fields: reorderedFields,
          };

          queryClient.setQueryData(['schema', schemaId], optimisticSchema);

          return { previousSchema };
        }

        return {};
      },

      onError: (error, fieldIds, context) => {
        if (context?.previousSchema) {
          queryClient.setQueryData(['schema', schemaId], context.previousSchema);
        }
      },

      onSuccess: (data) => {
        queryClient.setQueryData(['schema', schemaId], (old: ComponentSchema | undefined) => {
          if (!old) return old;
          return { ...old, fields: data };
        });
      },

      onSettled: () => {
        queryClient.invalidateQueries(['schema', schemaId]);
        queryClient.invalidateQueries(['schema-fields', schemaId]);
      },

      ...options,
    }
  );
};

// ========================================
// UTILITY HOOKS
// ========================================

export const useInvalidateSchemaQueries = () => {
  const queryClient = useQueryClient();

  return useCallback((schemaId?: string) => {
    if (schemaId) {
      queryClient.invalidateQueries(['schema', schemaId]);
      queryClient.invalidateQueries(['schema-fields', schemaId]);
      queryClient.invalidateQueries(['schema-usage', schemaId]);
    } else {
      queryClient.invalidateQueries(['schemas']);
      queryClient.invalidateQueries(['schema-metrics']);
      queryClient.invalidateQueries(['schema-usage']);
    }
  }, [queryClient]);
};

export const usePrefetchSchema = () => {
  const queryClient = useQueryClient();

  return useCallback((schemaId: string) => {
    queryClient.prefetchQuery(['schema', schemaId], () => getSchema(schemaId), {
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);
};