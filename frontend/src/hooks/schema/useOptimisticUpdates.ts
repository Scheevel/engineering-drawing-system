/**
 * Optimistic Updates Hook for Schema Management
 *
 * Provides optimistic update functionality with React Query integration,
 * rollback capabilities, and visual feedback for schema operations.
 */

import { useCallback, useRef, useState } from 'react';
import { useMutation, useQueryClient, UseMutationOptions } from 'react-query';
import { useSchemaEditing } from '../../contexts/SchemaEditingContext';
import {
  ComponentSchema,
  ComponentSchemaUpdate,
  ComponentSchemaField,
  ComponentSchemaFieldCreate,
  ComponentSchemaFieldUpdate,
} from '../../types/schema';
import {
  updateSchema,
  createSchemaField,
  updateSchemaField,
  deleteSchemaField,
  reorderSchemaFields,
} from '../../services/api';

// ========================================
// INTERFACES
// ========================================

export interface OptimisticUpdateOptions {
  enableVisualFeedback?: boolean;
  rollbackDelayMs?: number;
  retryAttempts?: number;
  showErrorNotifications?: boolean;
}

export interface OptimisticUpdateStatus {
  isPending: boolean;
  operationCount: number;
  lastOperation: string | null;
  lastError: string | null;
  rollbacksInProgress: number;
}

export interface OptimisticOperationContext {
  operationId: string;
  type: string;
  timestamp: number;
  rollbackData: any;
  visualElement?: HTMLElement;
}

export interface OptimisticUpdatesHookReturn {
  status: OptimisticUpdateStatus;

  // Schema operations
  updateSchemaOptimistic: (
    schemaId: string,
    updates: ComponentSchemaUpdate,
    options?: OptimisticUpdateOptions
  ) => Promise<ComponentSchema>;

  // Field operations
  createFieldOptimistic: (
    schemaId: string,
    field: ComponentSchemaFieldCreate,
    options?: OptimisticUpdateOptions
  ) => Promise<ComponentSchemaField>;

  updateFieldOptimistic: (
    schemaId: string,
    fieldId: string,
    updates: ComponentSchemaFieldUpdate,
    options?: OptimisticUpdateOptions
  ) => Promise<ComponentSchemaField>;

  deleteFieldOptimistic: (
    schemaId: string,
    fieldId: string,
    options?: OptimisticUpdateOptions
  ) => Promise<void>;

  reorderFieldsOptimistic: (
    schemaId: string,
    fieldIds: string[],
    options?: OptimisticUpdateOptions
  ) => Promise<ComponentSchemaField[]>;

  // Utility functions
  rollbackOperation: (operationId: string) => void;
  rollbackAllOperations: () => void;
  clearOperationHistory: () => void;
}

// ========================================
// OPTIMISTIC UPDATES HOOK
// ========================================

export const useOptimisticUpdates = (
  defaultOptions: OptimisticUpdateOptions = {}
): OptimisticUpdatesHookReturn => {
  const {
    enableVisualFeedback = true,
    rollbackDelayMs = 100,
    retryAttempts = 2,
    showErrorNotifications = true,
  } = defaultOptions;

  const queryClient = useQueryClient();
  const { state, dispatch } = useSchemaEditing();

  // State management
  const [pendingOperations, setPendingOperations] = useState<Map<string, OptimisticOperationContext>>(new Map());
  const [rollbacksInProgress, setRollbacksInProgress] = useState(0);
  const operationIdRef = useRef(0);

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  const generateOperationId = useCallback((): string => {
    return `op-${Date.now()}-${++operationIdRef.current}`;
  }, []);

  const addVisualFeedback = useCallback((element: HTMLElement, type: 'success' | 'error' | 'pending') => {
    if (!enableVisualFeedback) return;

    element.style.transition = 'opacity 0.2s ease';

    switch (type) {
      case 'pending':
        element.style.opacity = '0.7';
        element.style.pointerEvents = 'none';
        break;
      case 'success':
        element.style.opacity = '1';
        element.style.pointerEvents = 'auto';
        element.style.backgroundColor = '#e8f5e8';
        setTimeout(() => {
          element.style.backgroundColor = '';
        }, 1000);
        break;
      case 'error':
        element.style.opacity = '1';
        element.style.pointerEvents = 'auto';
        element.style.backgroundColor = '#fee';
        setTimeout(() => {
          element.style.backgroundColor = '';
        }, 2000);
        break;
    }
  }, [enableVisualFeedback]);

  const performRollback = useCallback(async (context: OptimisticOperationContext) => {
    setRollbacksInProgress(prev => prev + 1);

    try {
      // Add visual feedback for rollback
      if (context.visualElement) {
        addVisualFeedback(context.visualElement, 'error');
      }

      // Restore previous data in query cache
      const { rollbackData } = context;

      switch (context.type) {
        case 'schema_update':
          queryClient.setQueryData(['schema', rollbackData.schemaId], rollbackData.previousSchema);
          queryClient.setQueryData(['schemas'], (old: any) => {
            if (!old) return old;
            return {
              ...old,
              schemas: old.schemas.map((schema: ComponentSchema) =>
                schema.id === rollbackData.schemaId ? rollbackData.previousSchema : schema
              ),
            };
          });
          break;

        case 'field_create':
          queryClient.setQueryData(['schema', rollbackData.schemaId], (old: ComponentSchema | undefined) => {
            if (!old) return old;
            return {
              ...old,
              fields: old.fields.filter(f => f.id !== rollbackData.fieldId),
            };
          });
          break;

        case 'field_update':
          queryClient.setQueryData(['schema', rollbackData.schemaId], (old: ComponentSchema | undefined) => {
            if (!old) return old;
            return {
              ...old,
              fields: old.fields.map(f =>
                f.id === rollbackData.fieldId ? rollbackData.previousField : f
              ),
            };
          });
          break;

        case 'field_delete':
          queryClient.setQueryData(['schema', rollbackData.schemaId], (old: ComponentSchema | undefined) => {
            if (!old) return old;
            return {
              ...old,
              fields: [...old.fields, rollbackData.deletedField].sort((a, b) => a.display_order - b.display_order),
            };
          });
          break;

        case 'field_reorder':
          queryClient.setQueryData(['schema', rollbackData.schemaId], (old: ComponentSchema | undefined) => {
            if (!old) return old;
            return {
              ...old,
              fields: rollbackData.previousOrder,
            };
          });
          break;
      }

      // Update context state if needed
      if (rollbackData.schemaId === state.activeSchemaId) {
        switch (context.type) {
          case 'schema_update':
            dispatch({ type: 'SET_ACTIVE_SCHEMA', payload: { schema: rollbackData.previousSchema } });
            break;
        }
      }

      // Wait for rollback delay
      await new Promise(resolve => setTimeout(resolve, rollbackDelayMs));

    } finally {
      setRollbacksInProgress(prev => prev - 1);
    }
  }, [queryClient, state.activeSchemaId, dispatch, rollbackDelayMs, addVisualFeedback]);

  // ========================================
  // SCHEMA OPERATIONS
  // ========================================

  const updateSchemaOptimistic = useCallback(async (
    schemaId: string,
    updates: ComponentSchemaUpdate,
    options: OptimisticUpdateOptions = {}
  ): Promise<ComponentSchema> => {
    const operationId = generateOperationId();
    const mergedOptions = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      const mutation = useMutation(
        () => updateSchema(schemaId, updates),
        {
          onMutate: async () => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries(['schema', schemaId]);

            // Snapshot the previous value
            const previousSchema = queryClient.getQueryData<ComponentSchema>(['schema', schemaId]);

            if (!previousSchema) {
              throw new Error('Schema not found in cache');
            }

            // Optimistically update the cache
            const optimisticSchema: ComponentSchema = {
              ...previousSchema,
              ...updates,
              updated_at: new Date().toISOString(),
            };

            queryClient.setQueryData(['schema', schemaId], optimisticSchema);

            // Update schemas list cache
            queryClient.setQueryData(['schemas'], (old: any) => {
              if (!old) return old;
              return {
                ...old,
                schemas: old.schemas.map((schema: ComponentSchema) =>
                  schema.id === schemaId ? optimisticSchema : schema
                ),
              };
            });

            // Update context state
            if (schemaId === state.activeSchemaId) {
              dispatch({ type: 'SET_ACTIVE_SCHEMA', payload: { schema: optimisticSchema } });
            }

            // Store operation context
            const context: OptimisticOperationContext = {
              operationId,
              type: 'schema_update',
              timestamp: Date.now(),
              rollbackData: { schemaId, previousSchema },
            };

            setPendingOperations(prev => new Map(prev).set(operationId, context));

            return { previousSchema, optimisticSchema };
          },

          onError: async (error, variables, context) => {
            // Rollback optimistic update
            if (context?.previousSchema) {
              await performRollback({
                operationId,
                type: 'schema_update',
                timestamp: Date.now(),
                rollbackData: { schemaId, previousSchema: context.previousSchema },
              });
            }

            if (mergedOptions.showErrorNotifications) {
              console.error('Schema update failed:', error);
            }

            setPendingOperations(prev => {
              const newMap = new Map(prev);
              newMap.delete(operationId);
              return newMap;
            });

            reject(error);
          },

          onSuccess: (data, variables, context) => {
            // Update cache with server response
            queryClient.setQueryData(['schema', schemaId], data);

            // Update context state
            if (schemaId === state.activeSchemaId) {
              dispatch({ type: 'SET_ACTIVE_SCHEMA', payload: { schema: data } });
            }

            setPendingOperations(prev => {
              const newMap = new Map(prev);
              newMap.delete(operationId);
              return newMap;
            });

            resolve(data);
          },

          onSettled: () => {
            // Invalidate related queries
            queryClient.invalidateQueries(['schema', schemaId]);
            queryClient.invalidateQueries(['schemas']);
          },
        }
      );

      mutation.mutate();
    });
  }, [generateOperationId, defaultOptions, queryClient, state.activeSchemaId, dispatch, performRollback]);

  // ========================================
  // FIELD OPERATIONS
  // ========================================

  const createFieldOptimistic = useCallback(async (
    schemaId: string,
    field: ComponentSchemaFieldCreate,
    options: OptimisticUpdateOptions = {}
  ): Promise<ComponentSchemaField> => {
    const operationId = generateOperationId();
    const mergedOptions = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      const mutation = useMutation(
        () => createSchemaField(schemaId, field),
        {
          onMutate: async () => {
            await queryClient.cancelQueries(['schema', schemaId]);

            const previousSchema = queryClient.getQueryData<ComponentSchema>(['schema', schemaId]);
            if (!previousSchema) {
              throw new Error('Schema not found in cache');
            }

            // Create optimistic field
            const optimisticField: ComponentSchemaField = {
              id: `temp-${Date.now()}`,
              ...field,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            // Update cache
            const optimisticSchema: ComponentSchema = {
              ...previousSchema,
              fields: [...previousSchema.fields, optimisticField].sort((a, b) => a.display_order - b.display_order),
            };

            queryClient.setQueryData(['schema', schemaId], optimisticSchema);

            const context: OptimisticOperationContext = {
              operationId,
              type: 'field_create',
              timestamp: Date.now(),
              rollbackData: { schemaId, fieldId: optimisticField.id },
            };

            setPendingOperations(prev => new Map(prev).set(operationId, context));

            return { previousSchema, optimisticField };
          },

          onError: async (error, variables, context) => {
            if (context?.optimisticField) {
              await performRollback({
                operationId,
                type: 'field_create',
                timestamp: Date.now(),
                rollbackData: { schemaId, fieldId: context.optimisticField.id },
              });
            }

            setPendingOperations(prev => {
              const newMap = new Map(prev);
              newMap.delete(operationId);
              return newMap;
            });

            reject(error);
          },

          onSuccess: (data) => {
            // Replace temporary field with real field
            queryClient.setQueryData(['schema', schemaId], (old: ComponentSchema | undefined) => {
              if (!old) return old;
              return {
                ...old,
                fields: old.fields.map(f =>
                  f.id.startsWith('temp-') ? data : f
                ).sort((a, b) => a.display_order - b.display_order),
              };
            });

            setPendingOperations(prev => {
              const newMap = new Map(prev);
              newMap.delete(operationId);
              return newMap;
            });

            resolve(data);
          },

          onSettled: () => {
            queryClient.invalidateQueries(['schema', schemaId]);
          },
        }
      );

      mutation.mutate();
    });
  }, [generateOperationId, defaultOptions, queryClient, performRollback]);

  const updateFieldOptimistic = useCallback(async (
    schemaId: string,
    fieldId: string,
    updates: ComponentSchemaFieldUpdate,
    options: OptimisticUpdateOptions = {}
  ): Promise<ComponentSchemaField> => {
    const operationId = generateOperationId();

    return new Promise((resolve, reject) => {
      const mutation = useMutation(
        () => updateSchemaField(schemaId, fieldId, updates),
        {
          onMutate: async () => {
            await queryClient.cancelQueries(['schema', schemaId]);

            const previousSchema = queryClient.getQueryData<ComponentSchema>(['schema', schemaId]);
            if (!previousSchema) {
              throw new Error('Schema not found');
            }

            const previousField = previousSchema.fields.find(f => f.id === fieldId);
            if (!previousField) {
              throw new Error('Field not found');
            }

            const optimisticField: ComponentSchemaField = {
              ...previousField,
              ...updates,
              updated_at: new Date().toISOString(),
            };

            queryClient.setQueryData(['schema', schemaId], {
              ...previousSchema,
              fields: previousSchema.fields.map(f => f.id === fieldId ? optimisticField : f),
            });

            const context: OptimisticOperationContext = {
              operationId,
              type: 'field_update',
              timestamp: Date.now(),
              rollbackData: { schemaId, fieldId, previousField },
            };

            setPendingOperations(prev => new Map(prev).set(operationId, context));

            return { previousField, optimisticField };
          },

          onError: async (error, variables, context) => {
            if (context?.previousField) {
              await performRollback({
                operationId,
                type: 'field_update',
                timestamp: Date.now(),
                rollbackData: { schemaId, fieldId, previousField: context.previousField },
              });
            }

            setPendingOperations(prev => {
              const newMap = new Map(prev);
              newMap.delete(operationId);
              return newMap;
            });

            reject(error);
          },

          onSuccess: (data) => {
            queryClient.setQueryData(['schema', schemaId], (old: ComponentSchema | undefined) => {
              if (!old) return old;
              return {
                ...old,
                fields: old.fields.map(f => f.id === fieldId ? data : f),
              };
            });

            setPendingOperations(prev => {
              const newMap = new Map(prev);
              newMap.delete(operationId);
              return newMap;
            });

            resolve(data);
          },

          onSettled: () => {
            queryClient.invalidateQueries(['schema', schemaId]);
          },
        }
      );

      mutation.mutate();
    });
  }, [generateOperationId, queryClient, performRollback]);

  const deleteFieldOptimistic = useCallback(async (
    schemaId: string,
    fieldId: string,
    options: OptimisticUpdateOptions = {}
  ): Promise<void> => {
    const operationId = generateOperationId();

    return new Promise((resolve, reject) => {
      const mutation = useMutation(
        () => deleteSchemaField(schemaId, fieldId),
        {
          onMutate: async () => {
            await queryClient.cancelQueries(['schema', schemaId]);

            const previousSchema = queryClient.getQueryData<ComponentSchema>(['schema', schemaId]);
            if (!previousSchema) {
              throw new Error('Schema not found');
            }

            const deletedField = previousSchema.fields.find(f => f.id === fieldId);
            if (!deletedField) {
              throw new Error('Field not found');
            }

            queryClient.setQueryData(['schema', schemaId], {
              ...previousSchema,
              fields: previousSchema.fields.filter(f => f.id !== fieldId),
            });

            const context: OptimisticOperationContext = {
              operationId,
              type: 'field_delete',
              timestamp: Date.now(),
              rollbackData: { schemaId, deletedField },
            };

            setPendingOperations(prev => new Map(prev).set(operationId, context));

            return { deletedField };
          },

          onError: async (error, variables, context) => {
            if (context?.deletedField) {
              await performRollback({
                operationId,
                type: 'field_delete',
                timestamp: Date.now(),
                rollbackData: { schemaId, deletedField: context.deletedField },
              });
            }

            setPendingOperations(prev => {
              const newMap = new Map(prev);
              newMap.delete(operationId);
              return newMap;
            });

            reject(error);
          },

          onSuccess: () => {
            setPendingOperations(prev => {
              const newMap = new Map(prev);
              newMap.delete(operationId);
              return newMap;
            });

            resolve();
          },

          onSettled: () => {
            queryClient.invalidateQueries(['schema', schemaId]);
          },
        }
      );

      mutation.mutate();
    });
  }, [generateOperationId, queryClient, performRollback]);

  const reorderFieldsOptimistic = useCallback(async (
    schemaId: string,
    fieldIds: string[],
    options: OptimisticUpdateOptions = {}
  ): Promise<ComponentSchemaField[]> => {
    const operationId = generateOperationId();

    return new Promise((resolve, reject) => {
      const mutation = useMutation(
        () => reorderSchemaFields(schemaId, fieldIds),
        {
          onMutate: async () => {
            await queryClient.cancelQueries(['schema', schemaId]);

            const previousSchema = queryClient.getQueryData<ComponentSchema>(['schema', schemaId]);
            if (!previousSchema) {
              throw new Error('Schema not found');
            }

            const previousOrder = [...previousSchema.fields];
            const reorderedFields = fieldIds.map((id, index) => {
              const field = previousSchema.fields.find(f => f.id === id);
              if (!field) throw new Error(`Field ${id} not found`);
              return { ...field, display_order: index };
            });

            queryClient.setQueryData(['schema', schemaId], {
              ...previousSchema,
              fields: reorderedFields,
            });

            const context: OptimisticOperationContext = {
              operationId,
              type: 'field_reorder',
              timestamp: Date.now(),
              rollbackData: { schemaId, previousOrder },
            };

            setPendingOperations(prev => new Map(prev).set(operationId, context));

            return { previousOrder, reorderedFields };
          },

          onError: async (error, variables, context) => {
            if (context?.previousOrder) {
              await performRollback({
                operationId,
                type: 'field_reorder',
                timestamp: Date.now(),
                rollbackData: { schemaId, previousOrder: context.previousOrder },
              });
            }

            setPendingOperations(prev => {
              const newMap = new Map(prev);
              newMap.delete(operationId);
              return newMap;
            });

            reject(error);
          },

          onSuccess: (data) => {
            queryClient.setQueryData(['schema', schemaId], (old: ComponentSchema | undefined) => {
              if (!old) return old;
              return { ...old, fields: data };
            });

            setPendingOperations(prev => {
              const newMap = new Map(prev);
              newMap.delete(operationId);
              return newMap;
            });

            resolve(data);
          },

          onSettled: () => {
            queryClient.invalidateQueries(['schema', schemaId]);
          },
        }
      );

      mutation.mutate();
    });
  }, [generateOperationId, queryClient, performRollback]);

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  const rollbackOperation = useCallback((operationId: string) => {
    const context = pendingOperations.get(operationId);
    if (context) {
      performRollback(context);
      setPendingOperations(prev => {
        const newMap = new Map(prev);
        newMap.delete(operationId);
        return newMap;
      });
    }
  }, [pendingOperations, performRollback]);

  const rollbackAllOperations = useCallback(() => {
    Array.from(pendingOperations.values()).forEach(context => {
      performRollback(context);
    });
    setPendingOperations(new Map());
  }, [pendingOperations, performRollback]);

  const clearOperationHistory = useCallback(() => {
    setPendingOperations(new Map());
  }, []);

  // ========================================
  // STATUS CALCULATION
  // ========================================

  const status: OptimisticUpdateStatus = {
    isPending: pendingOperations.size > 0,
    operationCount: pendingOperations.size,
    lastOperation: pendingOperations.size > 0 ?
      Array.from(pendingOperations.values())[pendingOperations.size - 1].type : null,
    lastError: null, // This would be tracked separately in a real implementation
    rollbacksInProgress,
  };

  return {
    status,
    updateSchemaOptimistic,
    createFieldOptimistic,
    updateFieldOptimistic,
    deleteFieldOptimistic,
    reorderFieldsOptimistic,
    rollbackOperation,
    rollbackAllOperations,
    clearOperationHistory,
  };
};

export default useOptimisticUpdates;