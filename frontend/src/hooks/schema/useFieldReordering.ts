/**
 * Field Reordering Hook
 *
 * Handles drag-and-drop state management, optimistic updates,
 * API integration with batching, and conflict resolution for field reordering operations.
 */

import { useMutation, useQueryClient } from 'react-query';
import { useRef, useCallback } from 'react';
import { ComponentSchemaField } from '../../types/schema';
import { schemaManagementService } from '../../services/schemaManagementService';

interface ReorderFieldsRequest {
  schemaId: string;
  fieldOrder: string[];
  batchSize?: number;
  forceUpdate?: boolean;
}

interface UseFieldReorderingOptions {
  onMutate?: () => void;
  onSuccess?: (hasConflicts?: boolean) => void;
  onError?: (error: Error) => void;
  onConflict?: (conflicts: Array<{ fieldId: string; conflict: string }>) => void;
  debounceMs?: number;
}

export const useFieldReordering = (
  schemaId: string,
  options?: UseFieldReorderingOptions
) => {
  const queryClient = useQueryClient();
  const { debounceMs = 500 } = options || {};

  // Track schema version for conflict detection
  const schemaVersionRef = useRef<string | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingOperationsRef = useRef<ReorderFieldsRequest[]>([]);

  // Update schema version when schema data changes
  const updateSchemaVersion = useCallback(() => {
    const schema = queryClient.getQueryData(['schema', schemaId]) as any;
    if (schema?.updated_at) {
      schemaVersionRef.current = schema.updated_at;
    }
  }, [queryClient, schemaId]);

  const reorderMutation = useMutation<
    {
      fields: ComponentSchemaField[];
      version?: string;
      conflicts?: Array<{ fieldId: string; conflict: string }>;
    },
    Error,
    ReorderFieldsRequest
  >(
    async ({ fieldOrder, batchSize, forceUpdate }) => {
      const response = await schemaManagementService.reorderSchemaFields(
        schemaId,
        fieldOrder,
        {
          batchSize,
          expectedVersion: schemaVersionRef.current || undefined,
          forceUpdate,
        }
      );
      return response;
    },
    {
      onMutate: async ({ fieldOrder }) => {
        options?.onMutate?.();

        // Cancel any outgoing refetches
        await queryClient.cancelQueries(['schema', schemaId]);

        // Snapshot the previous value and update version tracking
        const previousSchema = queryClient.getQueryData(['schema', schemaId]) as any;
        updateSchemaVersion();

        // Optimistically update the field order
        if (previousSchema?.fields) {
          const reorderedFields = reorderFieldsArray(previousSchema.fields, fieldOrder);
          queryClient.setQueryData(['schema', schemaId], {
            ...previousSchema,
            fields: reorderedFields,
          });
        }

        return { previousSchema };
      },
      onError: (error, variables, context) => {
        // Rollback to previous state on error
        if (context?.previousSchema) {
          queryClient.setQueryData(['schema', schemaId], context.previousSchema);
        }

        // Handle conflict errors with specific messaging
        if (error.message.includes('modified by another user')) {
          // Force refresh to get latest state
          queryClient.invalidateQueries(['schema', schemaId]);
        }

        options?.onError?.(error);
      },
      onSuccess: (data) => {
        // Handle conflicts returned from service
        if (data.conflicts && data.conflicts.length > 0) {
          options?.onConflict?.(data.conflicts);
          options?.onSuccess?.(true); // Has conflicts
        } else {
          options?.onSuccess?.(false); // No conflicts
        }

        // Update with server response and version
        queryClient.setQueryData(['schema', schemaId], (old: any) => ({
          ...old,
          fields: data.fields,
          updated_at: data.version || old?.updated_at,
        }));

        // Update version tracking
        if (data.version) {
          schemaVersionRef.current = data.version;
        }
      },
      onSettled: () => {
        // Refetch to ensure consistency
        queryClient.invalidateQueries(['schema', schemaId]);
      },
    }
  );

  // Debounced batch processing for rapid reorder operations
  const debouncedReorder = useCallback((request: ReorderFieldsRequest) => {
    pendingOperationsRef.current.push(request);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const operations = [...pendingOperationsRef.current];
      pendingOperationsRef.current = [];

      if (operations.length > 0) {
        // Use the latest field order from the batch
        const latestOperation = operations[operations.length - 1];
        reorderMutation.mutate({
          ...latestOperation,
          batchSize: Math.max(10, Math.ceil(latestOperation.fieldOrder.length / 5)),
        });
      }
    }, debounceMs);
  }, [debounceMs, reorderMutation]);

  const handleDragEnd = useCallback((request: ReorderFieldsRequest) => {
    if (debounceMs > 0) {
      debouncedReorder(request);
    } else {
      reorderMutation.mutate(request);
    }
  }, [debounceMs, debouncedReorder, reorderMutation]);

  // Force retry with conflict resolution
  const forceRetry = useCallback((fieldOrder: string[]) => {
    reorderMutation.mutate({
      schemaId,
      fieldOrder,
      forceUpdate: true,
      batchSize: Math.max(10, Math.ceil(fieldOrder.length / 5)),
    });
  }, [reorderMutation, schemaId]);

  return {
    handleDragEnd,
    forceRetry,
    isLoading: reorderMutation.isLoading,
    error: reorderMutation.error?.message,
    isError: reorderMutation.isError,
    reset: reorderMutation.reset,
    updateSchemaVersion,
  };
};

/**
 * Utility function to reorder fields array based on field order
 */
function reorderFieldsArray(
  fields: ComponentSchemaField[],
  fieldOrder: string[]
): ComponentSchemaField[] {
  // Create a map for O(1) lookup
  const fieldMap = new Map(fields.map(field => [field.id, field]));

  // Reorder based on the provided order
  const reorderedFields = fieldOrder
    .map(fieldId => fieldMap.get(fieldId))
    .filter((field): field is ComponentSchemaField => field !== undefined);

  // Add any fields not in the order to the end
  const orderedFieldIds = new Set(fieldOrder);
  const remainingFields = fields.filter(field => !orderedFieldIds.has(field.id));

  return [...reorderedFields, ...remainingFields];
}