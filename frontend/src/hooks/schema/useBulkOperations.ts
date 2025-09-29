/**
 * Bulk Operations Hook
 *
 * Manages bulk field operations including delete, activate/deactivate,
 * and required/optional toggles with optimistic updates and progress tracking.
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { ComponentSchemaField } from '../../types/schema';
import { removeSchemaField, updateSchemaField } from '../../services/api';

export interface BulkDeleteResult {
  succeeded: string[];
  failed: Array<{ fieldId: string; error: string }>;
  totalProcessed: number;
}

export interface BulkOperationProgress {
  total: number;
  completed: number;
  failed: number;
  currentField?: string;
  isComplete: boolean;
}

interface BulkOperationOptions {
  batchSize?: number;
  enableProgress?: boolean;
  enableOptimisticUpdates?: boolean;
}

interface UseBulkOperationsOptions {
  schemaId: string;
  onSuccess?: (message: string) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: BulkOperationProgress) => void;
}

interface UseBulkOperationsReturn {
  // Delete operations
  bulkDeleteFields: (fieldIds: string[], options?: BulkOperationOptions) => Promise<BulkDeleteResult>;
  isBulkDeleting: boolean;
  deleteProgress: BulkOperationProgress | null;

  // Status operations
  bulkActivateFields: (fieldIds: string[], active: boolean, options?: BulkOperationOptions) => Promise<BulkDeleteResult>;
  isBulkActivating: boolean;
  activateProgress: BulkOperationProgress | null;

  // Required status operations
  bulkToggleRequired: (fieldIds: string[], required: boolean, options?: BulkOperationOptions) => Promise<BulkDeleteResult>;
  isBulkTogglingRequired: boolean;
  requiredProgress: BulkOperationProgress | null;

  // Impact analysis
  getImpactAnalysis: (fieldIds: string[]) => Promise<any>;
  getDeactivationImpactAnalysis: (fieldIds: string[]) => Promise<any>;
  getRequiredToggleImpactAnalysis: (fieldIds: string[], requiredStatus: boolean) => Promise<any>;

  // General state
  isAnyBulkOperation: boolean;
}

export const useBulkOperations = (options: UseBulkOperationsOptions): UseBulkOperationsReturn => {
  const { schemaId, onSuccess, onError, onProgress } = options;
  const queryClient = useQueryClient();

  // Progress tracking state
  const [deleteProgress, setDeleteProgress] = useState<BulkOperationProgress | null>(null);
  const [activateProgress, setActivateProgress] = useState<BulkOperationProgress | null>(null);
  const [requiredProgress, setRequiredProgress] = useState<BulkOperationProgress | null>(null);

  // Helper function to create progress tracker
  const createProgressTracker = (
    total: number,
    setProgress: (progress: BulkOperationProgress | null) => void
  ) => {
    let completed = 0;
    let failed = 0;

    const updateProgress = (currentField?: string) => {
      const progress: BulkOperationProgress = {
        total,
        completed,
        failed,
        currentField,
        isComplete: completed + failed === total,
      };
      setProgress(progress);
      onProgress?.(progress);

      if (progress.isComplete) {
        // Clear progress after 2 seconds
        setTimeout(() => setProgress(null), 2000);
      }
    };

    return {
      incrementCompleted: (currentField?: string) => {
        completed++;
        updateProgress(currentField);
      },
      incrementFailed: (currentField?: string) => {
        failed++;
        updateProgress(currentField);
      },
      reset: () => setProgress(null),
    };
  };

  // Helper function to process fields in batches
  const processBatch = async <T>(
    fieldIds: string[],
    operation: (fieldId: string) => Promise<T>,
    options: BulkOperationOptions = {},
    progressTracker?: any
  ): Promise<{ succeeded: string[]; failed: Array<{ fieldId: string; error: string }> }> => {
    const { batchSize = 5 } = options;
    const succeeded: string[] = [];
    const failed: Array<{ fieldId: string; error: string }> = [];

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < fieldIds.length; i += batchSize) {
      const batch = fieldIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async (fieldId) => {
        try {
          await operation(fieldId);
          succeeded.push(fieldId);
          progressTracker?.incrementCompleted(`Processing ${fieldId}`);
          return { fieldId, success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          failed.push({ fieldId, error: errorMessage });
          progressTracker?.incrementFailed(`Failed ${fieldId}`);
          return { fieldId, success: false, error: errorMessage };
        }
      });

      await Promise.all(batchPromises);
    }

    return { succeeded, failed };
  };

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ fieldIds, options }: { fieldIds: string[]; options?: BulkOperationOptions }) => {
      const progressTracker = createProgressTracker(fieldIds.length, setDeleteProgress);

      // Optimistic update if enabled
      if (options?.enableOptimisticUpdates) {
        const previousSchema = queryClient.getQueryData(['schema', schemaId]);
        queryClient.setQueryData(['schema', schemaId], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            fields: old.fields.filter((field: ComponentSchemaField) => !fieldIds.includes(field.id))
          };
        });
      }

      try {
        const result = await processBatch(
          fieldIds,
          (fieldId) => removeSchemaField(fieldId),
          options,
          progressTracker
        );

        return {
          ...result,
          totalProcessed: fieldIds.length,
        };
      } catch (error) {
        // Rollback optimistic update on error
        if (options?.enableOptimisticUpdates) {
          queryClient.invalidateQueries(['schema', schemaId]);
        }
        throw error;
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['schema', schemaId]);

      if (result.failed.length === 0) {
        onSuccess?.(`Successfully deleted ${result.succeeded.length} fields`);
      } else {
        onSuccess?.(`Deleted ${result.succeeded.length} fields. ${result.failed.length} failed.`);
      }
    },
    onError: (error) => {
      onError?.(error instanceof Error ? error : new Error('Bulk delete failed'));
    },
  });

  // Bulk activate/deactivate mutation
  const bulkActivateMutation = useMutation({
    mutationFn: async ({ fieldIds, active, options }: { fieldIds: string[]; active: boolean; options?: BulkOperationOptions }) => {
      const progressTracker = createProgressTracker(fieldIds.length, setActivateProgress);

      const result = await processBatch(
        fieldIds,
        (fieldId) => updateSchemaField(fieldId, { is_active: active }),
        options,
        progressTracker
      );

      return {
        ...result,
        totalProcessed: fieldIds.length,
      };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries(['schema', schemaId]);

      const action = variables.active ? 'activated' : 'deactivated';
      if (result.failed.length === 0) {
        onSuccess?.(`Successfully ${action} ${result.succeeded.length} fields`);
      } else {
        onSuccess?.(`${action} ${result.succeeded.length} fields. ${result.failed.length} failed.`);
      }
    },
    onError: (error) => {
      onError?.(error instanceof Error ? error : new Error('Bulk activation failed'));
    },
  });

  // Bulk required toggle mutation
  const bulkRequiredMutation = useMutation({
    mutationFn: async ({ fieldIds, required, options }: { fieldIds: string[]; required: boolean; options?: BulkOperationOptions }) => {
      const progressTracker = createProgressTracker(fieldIds.length, setRequiredProgress);

      const result = await processBatch(
        fieldIds,
        (fieldId) => updateSchemaField(fieldId, { is_required: required }),
        options,
        progressTracker
      );

      return {
        ...result,
        totalProcessed: fieldIds.length,
      };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries(['schema', schemaId]);

      const action = variables.required ? 'marked as required' : 'marked as optional';
      if (result.failed.length === 0) {
        onSuccess?.(`Successfully ${action} ${result.succeeded.length} fields`);
      } else {
        onSuccess?.(`${action} ${result.succeeded.length} fields. ${result.failed.length} failed.`);
      }
    },
    onError: (error) => {
      onError?.(error instanceof Error ? error : new Error('Bulk required toggle failed'));
    },
  });

  // Impact analysis function (placeholder - would integrate with actual API)
  const getImpactAnalysis = useCallback(async (fieldIds: string[]) => {
    // This would call an actual API endpoint to analyze impact
    // For now, return mock data structure
    const analysis = {
      totalFields: fieldIds.length,
      totalComponentsAffected: Math.floor(Math.random() * 20),
      fieldsWithData: Math.floor(fieldIds.length * 0.6),
      requiredFields: Math.floor(fieldIds.length * 0.3),
      fieldImpacts: fieldIds.map(fieldId => ({
        fieldId,
        fieldName: `Field ${fieldId}`,
        componentsUsingField: [],
        isRequired: Math.random() > 0.7,
        dependentFields: [],
      })),
      hasSignificantImpact: Math.random() > 0.5,
      riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
      warnings: fieldIds.length > 3 ? ['Large number of fields selected for deletion'] : [],
    };

    return analysis;
  }, []);

  // Deactivation impact analysis function (placeholder - would integrate with actual API)
  const getDeactivationImpactAnalysis = useCallback(async (fieldIds: string[]) => {
    // This would call an actual API endpoint to analyze deactivation impact
    // For now, return mock data structure
    const requiredFieldCount = Math.floor(fieldIds.length * 0.4);
    const affectedComponentCount = Math.floor(Math.random() * 15) + 1;

    const analysis = {
      totalFields: fieldIds.length,
      requiredFields: requiredFieldCount,
      fieldsUsedInComponents: Math.floor(fieldIds.length * 0.7),
      affectedComponents: Array.from({ length: affectedComponentCount }, (_, i) => ({
        componentId: `comp_${i + 1}`,
        pieceMark: `C${i + 1}`,
        fieldsUsed: fieldIds.slice(0, Math.floor(Math.random() * fieldIds.length) + 1),
      })),
      warnings: [
        ...(requiredFieldCount > 0 ? [`${requiredFieldCount} required fields will be hidden from forms`] : []),
        ...(fieldIds.length > 5 ? ['Large number of fields being deactivated'] : []),
        ...(affectedComponentCount > 10 ? ['Many components will be affected by this change'] : []),
      ],
      riskLevel: (
        requiredFieldCount > 2 ? 'high' :
        requiredFieldCount > 0 || fieldIds.length > 3 ? 'medium' :
        'low'
      ) as 'low' | 'medium' | 'high',
    };
    return analysis;
  }, []);

  // Required toggle impact analysis function (placeholder - would integrate with actual API)
  const getRequiredToggleImpactAnalysis = useCallback(async (fieldIds: string[], requiredStatus: boolean) => {
    // This would call an actual API endpoint to analyze required toggle impact
    // For now, return mock data structure
    const currentlyRequired = Math.floor(fieldIds.length * 0.5);
    const currentlyOptional = fieldIds.length - currentlyRequired;
    const fieldsToChange = requiredStatus ? currentlyOptional : currentlyRequired;
    const affectedComponentCount = Math.floor(Math.random() * 12) + 3;

    // Higher risk when making required fields optional
    const isOptionalOperation = !requiredStatus;
    const hasValidationImpact = fieldsToChange > 0;

    const analysis = {
      totalFields: fieldIds.length,
      currentlyRequiredFields: currentlyRequired,
      currentlyOptionalFields: currentlyOptional,
      componentsWithData: Array.from({ length: affectedComponentCount }, (_, i) => ({
        componentId: `comp_${i + 1}`,
        pieceMark: `C${i + 1}`,
        fieldsAffected: fieldIds.slice(0, Math.floor(Math.random() * fieldIds.length) + 1),
        hasRequiredFieldData: Math.random() > 0.3,
      })),
      validationImpact: {
        formsAffected: Math.floor(fieldIds.length * 1.5) + 1,
        validationRulesChanged: fieldsToChange,
        potentialDataLoss: isOptionalOperation && fieldsToChange > 2,
      },
      warnings: [
        ...(isOptionalOperation && fieldsToChange > 0
          ? [`${fieldsToChange} required fields will become optional, relaxing validation`]
          : []
        ),
        ...(isOptionalOperation && fieldsToChange > 3
          ? ['Many validation rules will be affected']
          : []
        ),
        ...(requiredStatus && fieldsToChange > 0
          ? [`${fieldsToChange} optional fields will become required for new components`]
          : []
        ),
        ...(hasValidationImpact
          ? ['Forms and validation workflows will be updated']
          : []
        ),
      ],
      riskLevel: (
        isOptionalOperation && fieldsToChange > 3 ? 'high' :
        isOptionalOperation && fieldsToChange > 1 ? 'medium' :
        requiredStatus && fieldsToChange > 5 ? 'medium' :
        'low'
      ) as 'low' | 'medium' | 'high',
    };
    return analysis;
  }, []);

  // Wrapper functions for easier use
  const bulkDeleteFields = useCallback(
    (fieldIds: string[], options?: BulkOperationOptions) =>
      bulkDeleteMutation.mutateAsync({ fieldIds, options }),
    [bulkDeleteMutation]
  );

  const bulkActivateFields = useCallback(
    (fieldIds: string[], active: boolean, options?: BulkOperationOptions) =>
      bulkActivateMutation.mutateAsync({ fieldIds, active, options }),
    [bulkActivateMutation]
  );

  const bulkToggleRequired = useCallback(
    (fieldIds: string[], required: boolean, options?: BulkOperationOptions) =>
      bulkRequiredMutation.mutateAsync({ fieldIds, required, options }),
    [bulkRequiredMutation]
  );

  const isAnyBulkOperation = bulkDeleteMutation.isPending ||
                           bulkActivateMutation.isPending ||
                           bulkRequiredMutation.isPending;

  return {
    // Delete operations
    bulkDeleteFields,
    isBulkDeleting: bulkDeleteMutation.isPending,
    deleteProgress,

    // Status operations
    bulkActivateFields,
    isBulkActivating: bulkActivateMutation.isPending,
    activateProgress,

    // Required status operations
    bulkToggleRequired,
    isBulkTogglingRequired: bulkRequiredMutation.isPending,
    requiredProgress,

    // Impact analysis
    getImpactAnalysis,
    getDeactivationImpactAnalysis,
    getRequiredToggleImpactAnalysis,

    // General state
    isAnyBulkOperation,
  };
};