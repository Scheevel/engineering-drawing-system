/**
 * Default Schema Toggle Hook
 *
 * Manages default schema state, mutations, and confirmation dialogs.
 * Provides centralized business logic for setting/unsetting default schemas
 * with proper error handling and UI state management.
 */

import { useState, useCallback, useMemo } from 'react';
import { ComponentSchema } from '../../services/api.ts';
import { useSetDefaultSchema, useUnsetDefaultSchema } from '../../services/schemaQueries.ts';

export interface UseDefaultSchemaToggleOptions {
  projectId?: string;
  onDefaultChange?: (newDefaultSchema: ComponentSchema | null) => void;
  onError?: (error: Error, action: 'set' | 'unset') => void;
  onSuccess?: (updatedSchema: ComponentSchema | null, action: 'set' | 'unset') => void;
}

export interface UseDefaultSchemaToggleResult {
  // State
  isCurrentDefault: boolean;
  hasExistingDefault: boolean;
  isLoading: boolean;
  canToggle: boolean;

  // Dialog state
  showSetDefaultDialog: boolean;
  showUnsetDefaultDialog: boolean;
  setShowSetDefaultDialog: (show: boolean) => void;
  setShowUnsetDefaultDialog: (show: boolean) => void;

  // Actions
  handleToggleClick: () => void;
  handleSetDefault: () => void;
  handleUnsetDefault: () => void;
  handleCancelDialog: () => void;

  // Error state
  setDefaultError: Error | null;
  unsetDefaultError: Error | null;
  hasError: boolean;
  clearErrors: () => void;

  // Mutation state
  setDefaultMutation: ReturnType<typeof useSetDefaultSchema>;
  unsetDefaultMutation: ReturnType<typeof useUnsetDefaultSchema>;
}

export const useDefaultSchemaToggle = (
  schema: ComponentSchema | null | undefined,
  currentDefaultSchema?: ComponentSchema | null,
  options: UseDefaultSchemaToggleOptions = {}
): UseDefaultSchemaToggleResult => {
  const { projectId, onDefaultChange, onError, onSuccess } = options;

  // Dialog state
  const [showSetDefaultDialog, setShowSetDefaultDialog] = useState(false);
  const [showUnsetDefaultDialog, setShowUnsetDefaultDialog] = useState(false);

  // Computed state
  const isCurrentDefault = useMemo(() => {
    if (!schema) return false;
    return schema.is_default || currentDefaultSchema?.id === schema.id;
  }, [schema?.is_default, schema?.id, currentDefaultSchema?.id]);

  const hasExistingDefault = useMemo(() => {
    if (!schema) return false;
    return currentDefaultSchema && currentDefaultSchema.id !== schema.id;
  }, [currentDefaultSchema, schema?.id]);

  const canToggle = useMemo(() => {
    if (!schema) return false;
    return schema.is_active && !!projectId;
  }, [schema?.is_active, projectId]);

  // Set default mutation
  const setDefaultMutation = useSetDefaultSchema({
    onSuccess: (updatedSchema) => {
      setShowSetDefaultDialog(false);
      onDefaultChange?.(updatedSchema);
      onSuccess?.(updatedSchema, 'set');
    },
    onError: (error: Error) => {
      onError?.(error, 'set');
      // Keep dialog open on error so user can retry
    },
  });

  // Unset default mutation
  const unsetDefaultMutation = useUnsetDefaultSchema({
    onSuccess: () => {
      setShowUnsetDefaultDialog(false);
      onDefaultChange?.(null);
      onSuccess?.(null, 'unset');
    },
    onError: (error: Error) => {
      onError?.(error, 'unset');
      // Keep dialog open on error so user can retry
    },
  });

  // Loading state
  const isLoading = setDefaultMutation.isLoading || unsetDefaultMutation.isLoading;

  // Error state
  const setDefaultError = setDefaultMutation.error as Error | null;
  const unsetDefaultError = unsetDefaultMutation.error as Error | null;
  const hasError = !!setDefaultError || !!unsetDefaultError;

  // Actions
  const handleToggleClick = useCallback(() => {
    if (!canToggle) return;

    if (isCurrentDefault) {
      setShowUnsetDefaultDialog(true);
    } else {
      setShowSetDefaultDialog(true);
    }
  }, [canToggle, isCurrentDefault]);

  const handleSetDefault = useCallback(() => {
    if (!projectId || !schema?.id) return;

    setDefaultMutation.mutate({
      projectId,
      schemaId: schema.id,
    });
  }, [projectId, schema?.id, setDefaultMutation]);

  const handleUnsetDefault = useCallback(() => {
    if (!projectId || !schema?.id) return;

    unsetDefaultMutation.mutate({
      projectId,
      schemaId: schema.id,
    });
  }, [projectId, schema?.id, unsetDefaultMutation]);

  const handleCancelDialog = useCallback(() => {
    if (isLoading) return; // Prevent canceling during mutation

    setShowSetDefaultDialog(false);
    setShowUnsetDefaultDialog(false);
  }, [isLoading]);

  const clearErrors = useCallback(() => {
    // Reset mutation errors by re-initializing the mutations
    setDefaultMutation.reset?.();
    unsetDefaultMutation.reset?.();
  }, [setDefaultMutation, unsetDefaultMutation]);

  return {
    // State
    isCurrentDefault,
    hasExistingDefault,
    isLoading,
    canToggle,

    // Dialog state
    showSetDefaultDialog,
    showUnsetDefaultDialog,
    setShowSetDefaultDialog,
    setShowUnsetDefaultDialog,

    // Actions
    handleToggleClick,
    handleSetDefault,
    handleUnsetDefault,
    handleCancelDialog,

    // Error state
    setDefaultError,
    unsetDefaultError,
    hasError,
    clearErrors,

    // Mutation state
    setDefaultMutation,
    unsetDefaultMutation,
  };
};

/**
 * Utility hook for managing default schema status across multiple schemas
 * in a list or collection. Provides bulk operations and consistency checking.
 */
export interface UseDefaultSchemaManagerOptions {
  projectId?: string;
  onDefaultChange?: (newDefaultSchema: ComponentSchema | null, previousDefault?: ComponentSchema | null) => void;
}

export interface UseDefaultSchemaManagerResult {
  currentDefaultSchema: ComponentSchema | null;
  setCurrentDefaultSchema: (schema: ComponentSchema | null) => void;
  isSchemaDefault: (schemaId: string) => boolean;
  getDefaultToggleProps: (schema: ComponentSchema) => {
    isCurrentDefault: boolean;
    hasExistingDefault: boolean;
    canToggle: boolean;
  };
  handleDefaultChange: (schema: ComponentSchema | null, previousDefault?: ComponentSchema | null) => void;
}

export const useDefaultSchemaManager = (
  schemas: ComponentSchema[],
  options: UseDefaultSchemaManagerOptions = {}
): UseDefaultSchemaManagerResult => {
  const { projectId, onDefaultChange } = options;

  // Find current default schema from the list
  const currentDefaultSchema = useMemo(() => {
    return schemas.find(schema => schema.is_default) || null;
  }, [schemas]);

  const [localDefaultSchema, setLocalDefaultSchema] = useState<ComponentSchema | null>(currentDefaultSchema);

  // Sync local state with computed default
  const effectiveDefaultSchema = localDefaultSchema || currentDefaultSchema;

  const isSchemaDefault = useCallback((schemaId: string) => {
    return effectiveDefaultSchema?.id === schemaId;
  }, [effectiveDefaultSchema]);

  const getDefaultToggleProps = useCallback((schema: ComponentSchema) => {
    const isCurrentDefault = isSchemaDefault(schema.id);
    const hasExistingDefault = effectiveDefaultSchema && effectiveDefaultSchema.id !== schema.id;
    const canToggle = schema.is_active && !!projectId;

    return {
      isCurrentDefault,
      hasExistingDefault: !!hasExistingDefault,
      canToggle,
    };
  }, [isSchemaDefault, effectiveDefaultSchema, projectId]);

  const handleDefaultChange = useCallback((
    newDefaultSchema: ComponentSchema | null,
    previousDefault?: ComponentSchema | null
  ) => {
    const actualPrevious = previousDefault || effectiveDefaultSchema;
    setLocalDefaultSchema(newDefaultSchema);
    onDefaultChange?.(newDefaultSchema, actualPrevious);
  }, [effectiveDefaultSchema, onDefaultChange]);

  return {
    currentDefaultSchema: effectiveDefaultSchema,
    setCurrentDefaultSchema: setLocalDefaultSchema,
    isSchemaDefault,
    getDefaultToggleProps,
    handleDefaultChange,
  };
};