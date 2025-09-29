/**
 * Field CRUD Operations Hook
 *
 * Provides comprehensive Create, Read, Update, Delete operations for schema fields
 * with React Query integration, optimistic updates, and error handling.
 */

import { useMutation, useQueryClient } from 'react-query';
import { useCallback } from 'react';
import {
  ComponentSchemaField,
  ComponentSchemaFieldCreate,
  ComponentSchemaFieldUpdate,
  addSchemaField,
  updateSchemaField,
  removeSchemaField,
} from '../../services/api.ts';
import { useFieldValidation, FieldValidationOptions } from './useFieldValidation.ts';

export interface FieldOperationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  skipValidation?: boolean;
  optimisticUpdate?: boolean;
}

export interface FieldUsageInfo {
  componentCount: number;
  componentNames: string[];
  hasRequiredUsage: boolean;
  canSafelyDelete: boolean;
  warnings: string[];
}

export interface UseFieldCRUDReturn {
  // Create operations
  createField: {
    mutate: (data: {
      schemaId: string;
      fieldData: ComponentSchemaFieldCreate;
      existingFields: ComponentSchemaField[];
      options?: FieldOperationOptions & FieldValidationOptions;
    }) => void;
    mutateAsync: (data: {
      schemaId: string;
      fieldData: ComponentSchemaFieldCreate;
      existingFields: ComponentSchemaField[];
      options?: FieldOperationOptions & FieldValidationOptions;
    }) => Promise<ComponentSchemaField>;
    isLoading: boolean;
    error: Error | null;
    isError: boolean;
    isSuccess: boolean;
  };

  // Update operations
  updateField: {
    mutate: (data: {
      fieldId: string;
      updates: ComponentSchemaFieldUpdate;
      existingFields: ComponentSchemaField[];
      options?: FieldOperationOptions & FieldValidationOptions;
    }) => void;
    mutateAsync: (data: {
      fieldId: string;
      updates: ComponentSchemaFieldUpdate;
      existingFields: ComponentSchemaField[];
      options?: FieldOperationOptions & FieldValidationOptions;
    }) => Promise<ComponentSchemaField>;
    isLoading: boolean;
    error: Error | null;
    isError: boolean;
    isSuccess: boolean;
  };

  // Delete operations
  deleteField: {
    mutate: (data: {
      fieldId: string;
      deleteType: 'soft' | 'hard';
      usageInfo?: FieldUsageInfo;
      options?: FieldOperationOptions;
    }) => void;
    mutateAsync: (data: {
      fieldId: string;
      deleteType: 'soft' | 'hard';
      usageInfo?: FieldUsageInfo;
      options?: FieldOperationOptions;
    }) => Promise<void>;
    isLoading: boolean;
    error: Error | null;
    isError: boolean;
    isSuccess: boolean;
  };

  // Toggle active status
  toggleFieldActive: {
    mutate: (data: {
      fieldId: string;
      isActive: boolean;
      options?: FieldOperationOptions;
    }) => void;
    mutateAsync: (data: {
      fieldId: string;
      isActive: boolean;
      options?: FieldOperationOptions;
    }) => Promise<ComponentSchemaField>;
    isLoading: boolean;
    error: Error | null;
    isError: boolean;
    isSuccess: boolean;
  };

  // Validation utilities
  validateFieldForOperation: (
    field: Partial<ComponentSchemaField>,
    existingFields: ComponentSchemaField[],
    options?: FieldValidationOptions
  ) => {
    isValid: boolean;
    errors: Array<{ field: string; message: string; code: string }>;
    warnings: string[];
  };
}

/**
 * Custom hook for field CRUD operations with React Query integration
 */
export const useFieldCRUD = (): UseFieldCRUDReturn => {
  const queryClient = useQueryClient();
  const {
    validateField,
    validateFieldDeletion,
  } = useFieldValidation();

  /**
   * Helper function to invalidate related queries
   */
  const invalidateSchemaQueries = useCallback(
    (schemaId?: string) => {
      if (schemaId) {
        queryClient.invalidateQueries(['schema', schemaId]);
        queryClient.invalidateQueries(['schemaFields', schemaId]);
      }
      queryClient.invalidateQueries(['schemas']);
    },
    [queryClient]
  );

  /**
   * Helper function to perform optimistic updates
   */
  const performOptimisticUpdate = useCallback(
    (
      queryKey: string[],
      updater: (oldData: any) => any,
      options: FieldOperationOptions = {}
    ) => {
      if (options.optimisticUpdate !== false) {
        queryClient.setQueryData(queryKey, updater);
      }
    },
    [queryClient]
  );

  /**
   * Create field mutation
   */
  const createFieldMutation = useMutation<
    ComponentSchemaField,
    Error,
    {
      schemaId: string;
      fieldData: ComponentSchemaFieldCreate;
      existingFields: ComponentSchemaField[];
      options?: FieldOperationOptions & FieldValidationOptions;
    }
  >(
    async ({ schemaId, fieldData, existingFields, options = {} }) => {
      // Validation
      if (!options.skipValidation) {
        const validation = validateField(fieldData, existingFields, options);
        if (!validation.isValid) {
          throw new Error(
            `Validation failed: ${validation.errors.map((e) => e.message).join(', ')}`
          );
        }
      }

      // Call API
      return addSchemaField(schemaId, fieldData);
    },
    {
      onMutate: async ({ schemaId, fieldData, options = {} }) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries(['schemaFields', schemaId]);

        // Snapshot previous value
        const previousFields = queryClient.getQueryData(['schemaFields', schemaId]);

        // Optimistically update
        if (options.optimisticUpdate !== false) {
          queryClient.setQueryData(['schemaFields', schemaId], (old: any) => {
            if (!old) return old;
            const newField: ComponentSchemaField = {
              id: `temp-${Date.now()}`,
              ...fieldData,
              display_order: old.length,
              is_active: true,
            };
            return [...old, newField];
          });
        }

        return { previousFields };
      },
      onError: (error, { schemaId }, context) => {
        // Rollback on error
        if (context?.previousFields) {
          queryClient.setQueryData(['schemaFields', schemaId], context.previousFields);
        }
      },
      onSuccess: (data, { schemaId, options = {} }) => {
        // Invalidate and refetch
        invalidateSchemaQueries(schemaId);
        options.onSuccess?.(data);
      },
      onSettled: (data, error, { options = {} }) => {
        if (error) {
          options.onError?.(error);
        }
      },
    }
  );

  /**
   * Update field mutation
   */
  const updateFieldMutation = useMutation<
    ComponentSchemaField,
    Error,
    {
      fieldId: string;
      updates: ComponentSchemaFieldUpdate;
      existingFields: ComponentSchemaField[];
      options?: FieldOperationOptions & FieldValidationOptions;
    }
  >(
    async ({ fieldId, updates, existingFields, options = {} }) => {
      // Find current field for validation
      const currentField = existingFields.find((f) => f.id === fieldId);
      if (!currentField && !options.skipValidation) {
        throw new Error('Field not found for update validation');
      }

      // Validation
      if (!options.skipValidation && currentField) {
        const mergedField = { ...currentField, ...updates };
        const validation = validateField(mergedField, existingFields, {
          ...options,
          excludeFieldId: fieldId,
        });
        if (!validation.isValid) {
          throw new Error(
            `Validation failed: ${validation.errors.map((e) => e.message).join(', ')}`
          );
        }
      }

      // Call API
      return updateSchemaField(fieldId, updates);
    },
    {
      onMutate: async ({ fieldId, updates, options = {} }) => {
        // Get schema ID from existing fields to cancel queries
        const allQueries = queryClient.getQueriesData(['schemaFields']);
        let targetSchemaId: string | undefined;

        for (const [key, data] of allQueries) {
          if (Array.isArray(data)) {
            const field = (data as ComponentSchemaField[]).find((f) => f.id === fieldId);
            if (field) {
              targetSchemaId = (key as string[])[1];
              break;
            }
          }
        }

        if (targetSchemaId) {
          await queryClient.cancelQueries(['schemaFields', targetSchemaId]);
        }

        // Snapshot previous value
        const previousFields = targetSchemaId
          ? queryClient.getQueryData(['schemaFields', targetSchemaId])
          : null;

        // Optimistically update
        if (options.optimisticUpdate !== false && targetSchemaId) {
          queryClient.setQueryData(['schemaFields', targetSchemaId], (old: any) => {
            if (!old) return old;
            return (old as ComponentSchemaField[]).map((field) =>
              field.id === fieldId ? { ...field, ...updates } : field
            );
          });
        }

        return { previousFields, targetSchemaId };
      },
      onError: (error, variables, context) => {
        // Rollback on error
        if (context?.previousFields && context?.targetSchemaId) {
          queryClient.setQueryData(
            ['schemaFields', context.targetSchemaId],
            context.previousFields
          );
        }
      },
      onSuccess: (data, { options = {} }, context) => {
        // Invalidate and refetch
        if (context?.targetSchemaId) {
          invalidateSchemaQueries(context.targetSchemaId);
        }
        options.onSuccess?.(data);
      },
      onSettled: (data, error, { options = {} }) => {
        if (error) {
          options.onError?.(error);
        }
      },
    }
  );

  /**
   * Delete field mutation
   */
  const deleteFieldMutation = useMutation<
    void,
    Error,
    {
      fieldId: string;
      deleteType: 'soft' | 'hard';
      usageInfo?: FieldUsageInfo;
      options?: FieldOperationOptions;
    }
  >(
    async ({ fieldId, deleteType, usageInfo, options = {} }) => {
      // Validation for deletion constraints
      if (usageInfo && !options.skipValidation) {
        // For hard delete, check if it's safe
        if (deleteType === 'hard' && usageInfo.hasRequiredUsage) {
          throw new Error('Cannot permanently delete field required by existing components');
        }
      }

      // Perform deletion based on type
      if (deleteType === 'soft') {
        // Soft delete = deactivate
        return updateSchemaField(fieldId, { is_active: false });
      } else {
        // Hard delete = remove
        return removeSchemaField(fieldId);
      }
    },
    {
      onMutate: async ({ fieldId, deleteType, options = {} }) => {
        // Find schema ID and cancel queries
        const allQueries = queryClient.getQueriesData(['schemaFields']);
        let targetSchemaId: string | undefined;
        let fieldToDelete: ComponentSchemaField | undefined;

        for (const [key, data] of allQueries) {
          if (Array.isArray(data)) {
            const field = (data as ComponentSchemaField[]).find((f) => f.id === fieldId);
            if (field) {
              targetSchemaId = (key as string[])[1];
              fieldToDelete = field;
              break;
            }
          }
        }

        if (targetSchemaId) {
          await queryClient.cancelQueries(['schemaFields', targetSchemaId]);
        }

        const previousFields = targetSchemaId
          ? queryClient.getQueryData(['schemaFields', targetSchemaId])
          : null;

        // Optimistically update
        if (options.optimisticUpdate !== false && targetSchemaId) {
          queryClient.setQueryData(['schemaFields', targetSchemaId], (old: any) => {
            if (!old) return old;
            if (deleteType === 'soft') {
              // Soft delete: mark as inactive
              return (old as ComponentSchemaField[]).map((field) =>
                field.id === fieldId ? { ...field, is_active: false } : field
              );
            } else {
              // Hard delete: remove from list
              return (old as ComponentSchemaField[]).filter((field) => field.id !== fieldId);
            }
          });
        }

        return { previousFields, targetSchemaId, fieldToDelete };
      },
      onError: (error, variables, context) => {
        // Rollback on error
        if (context?.previousFields && context?.targetSchemaId) {
          queryClient.setQueryData(
            ['schemaFields', context.targetSchemaId],
            context.previousFields
          );
        }
      },
      onSuccess: (data, { options = {} }, context) => {
        // Invalidate and refetch
        if (context?.targetSchemaId) {
          invalidateSchemaQueries(context.targetSchemaId);
        }
        options.onSuccess?.(data);
      },
      onSettled: (data, error, { options = {} }) => {
        if (error) {
          options.onError?.(error);
        }
      },
    }
  );

  /**
   * Toggle field active status mutation
   */
  const toggleFieldActiveMutation = useMutation<
    ComponentSchemaField,
    Error,
    {
      fieldId: string;
      isActive: boolean;
      options?: FieldOperationOptions;
    }
  >(
    async ({ fieldId, isActive }) => {
      return toggleFieldActive(fieldId, isActive);
    },
    {
      onMutate: async ({ fieldId, isActive, options = {} }) => {
        // Find schema and cancel queries
        const allQueries = queryClient.getQueriesData(['schemaFields']);
        let targetSchemaId: string | undefined;

        for (const [key, data] of allQueries) {
          if (Array.isArray(data)) {
            const field = (data as ComponentSchemaField[]).find((f) => f.id === fieldId);
            if (field) {
              targetSchemaId = (key as string[])[1];
              break;
            }
          }
        }

        if (targetSchemaId) {
          await queryClient.cancelQueries(['schemaFields', targetSchemaId]);
        }

        const previousFields = targetSchemaId
          ? queryClient.getQueryData(['schemaFields', targetSchemaId])
          : null;

        // Optimistically update
        if (options.optimisticUpdate !== false && targetSchemaId) {
          queryClient.setQueryData(['schemaFields', targetSchemaId], (old: any) => {
            if (!old) return old;
            return (old as ComponentSchemaField[]).map((field) =>
              field.id === fieldId ? { ...field, is_active: isActive } : field
            );
          });
        }

        return { previousFields, targetSchemaId };
      },
      onError: (error, variables, context) => {
        // Rollback on error
        if (context?.previousFields && context?.targetSchemaId) {
          queryClient.setQueryData(
            ['schemaFields', context.targetSchemaId],
            context.previousFields
          );
        }
      },
      onSuccess: (data, { options = {} }, context) => {
        // Invalidate and refetch
        if (context?.targetSchemaId) {
          invalidateSchemaQueries(context.targetSchemaId);
        }
        options.onSuccess?.(data);
      },
      onSettled: (data, error, { options = {} }) => {
        if (error) {
          options.onError?.(error);
        }
      },
    }
  );

  /**
   * Validation utility function
   */
  const validateFieldForOperation = useCallback(
    (
      field: Partial<ComponentSchemaField>,
      existingFields: ComponentSchemaField[],
      options: FieldValidationOptions = {}
    ) => {
      return validateField(field, existingFields, options);
    },
    [validateField]
  );

  return {
    createField: {
      mutate: createFieldMutation.mutate,
      mutateAsync: createFieldMutation.mutateAsync,
      isLoading: createFieldMutation.isLoading,
      error: createFieldMutation.error,
      isError: createFieldMutation.isError,
      isSuccess: createFieldMutation.isSuccess,
    },
    updateField: {
      mutate: updateFieldMutation.mutate,
      mutateAsync: updateFieldMutation.mutateAsync,
      isLoading: updateFieldMutation.isLoading,
      error: updateFieldMutation.error,
      isError: updateFieldMutation.isError,
      isSuccess: updateFieldMutation.isSuccess,
    },
    deleteField: {
      mutate: deleteFieldMutation.mutate,
      mutateAsync: deleteFieldMutation.mutateAsync,
      isLoading: deleteFieldMutation.isLoading,
      error: deleteFieldMutation.error,
      isError: deleteFieldMutation.isError,
      isSuccess: deleteFieldMutation.isSuccess,
    },
    toggleFieldActive: {
      mutate: toggleFieldActiveMutation.mutate,
      mutateAsync: toggleFieldActiveMutation.mutateAsync,
      isLoading: toggleFieldActiveMutation.isLoading,
      error: toggleFieldActiveMutation.error,
      isError: toggleFieldActiveMutation.isError,
      isSuccess: toggleFieldActiveMutation.isSuccess,
    },
    validateFieldForOperation,
  };
};

export default useFieldCRUD;