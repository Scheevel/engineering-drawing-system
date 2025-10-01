/**
 * Schema Dirty State Hook
 *
 * Unified dirty state tracking for both schema metadata and field operations.
 * Solves FR-3 (AC 11-16) by detecting changes to fields (add, edit, remove, reorder)
 * in addition to schema name/description changes.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ComponentSchema, ComponentSchemaField } from '../../services/api.ts';

export interface SchemaDirtyStateOptions {
  /** Initial schema state (when page loads) */
  initialSchema?: ComponentSchema | null;
  /** Current form dirty state from React Hook Form */
  formIsDirty?: boolean;
  /** Callback when dirty state changes */
  onDirtyChange?: (isDirty: boolean) => void;
}

export interface SchemaDirtyStateResult {
  /** Combined dirty state (form + fields) */
  isDirty: boolean;
  /** Dirty state from form fields only (name, description) */
  isFormDirty: boolean;
  /** Dirty state from field operations only (add, edit, remove, reorder) */
  areFieldsDirty: boolean;
  /** Number of field changes detected */
  fieldChangeCount: number;
  /** List of change types detected */
  changeTypes: ('added' | 'removed' | 'modified' | 'reordered')[];
  /** Reset dirty state (call after save) */
  resetDirtyState: () => void;
  /** Manually mark fields as dirty */
  markFieldsAsDirty: (changeType: 'added' | 'removed' | 'modified' | 'reordered') => void;
  /** Update the current fields snapshot */
  updateFieldsSnapshot: (fields: ComponentSchemaField[]) => void;
}

/**
 * Compare two field arrays to detect changes
 */
const detectFieldChanges = (
  initialFields: ComponentSchemaField[] | undefined,
  currentFields: ComponentSchemaField[] | undefined
): {
  isDirty: boolean;
  changeCount: number;
  changeTypes: ('added' | 'removed' | 'modified' | 'reordered')[];
} => {
  if (!initialFields || !currentFields) {
    return { isDirty: false, changeCount: 0, changeTypes: [] };
  }

  const changeTypes: Set<'added' | 'removed' | 'modified' | 'reordered'> = new Set();
  let changeCount = 0;

  // Check for added or removed fields
  if (currentFields.length !== initialFields.length) {
    if (currentFields.length > initialFields.length) {
      changeTypes.add('added');
    } else {
      changeTypes.add('removed');
    }
    changeCount++;
  }

  // Build maps by field ID for comparison
  const initialMap = new Map(initialFields.map(f => [f.id, f]));
  const currentMap = new Map(currentFields.map(f => [f.id, f]));

  // Check for removed fields
  initialFields.forEach(field => {
    if (!currentMap.has(field.id)) {
      changeTypes.add('removed');
      changeCount++;
    }
  });

  // Check for added or modified fields
  currentFields.forEach((currentField, index) => {
    const initialField = initialMap.get(currentField.id);

    if (!initialField) {
      // New field
      changeTypes.add('added');
      changeCount++;
    } else {
      // Check if field properties changed
      const fieldsChanged =
        currentField.field_name !== initialField.field_name ||
        currentField.label !== initialField.label ||
        currentField.field_type !== initialField.field_type ||
        currentField.is_required !== initialField.is_required ||
        currentField.is_active !== initialField.is_active ||
        currentField.help_text !== initialField.help_text ||
        JSON.stringify(currentField.field_config) !== JSON.stringify(initialField.field_config);

      if (fieldsChanged) {
        changeTypes.add('modified');
        changeCount++;
      }

      // Check if order changed
      const initialIndex = initialFields.findIndex(f => f.id === currentField.id);
      if (initialIndex !== index) {
        changeTypes.add('reordered');
        changeCount++;
      }
    }
  });

  return {
    isDirty: changeTypes.size > 0,
    changeCount,
    changeTypes: Array.from(changeTypes),
  };
};

export const useSchemaDirtyState = (
  options: SchemaDirtyStateOptions
): SchemaDirtyStateResult => {
  const { initialSchema, formIsDirty = false, onDirtyChange } = options;

  // Store initial fields snapshot
  const [initialFieldsSnapshot, setInitialFieldsSnapshot] = useState<
    ComponentSchemaField[] | undefined
  >(initialSchema?.fields);

  // Track current fields state
  const [currentFields, setCurrentFields] = useState<
    ComponentSchemaField[] | undefined
  >(initialSchema?.fields);

  // Track manual dirty marks from field operations
  const [manualDirtyMarks, setManualDirtyMarks] = useState<
    Set<'added' | 'removed' | 'modified' | 'reordered'>
  >(new Set());

  // Update snapshots when initial schema changes
  useEffect(() => {
    if (initialSchema?.fields && !initialFieldsSnapshot) {
      setInitialFieldsSnapshot(initialSchema.fields);
      setCurrentFields(initialSchema.fields);
    }
  }, [initialSchema, initialFieldsSnapshot]);

  // Detect field changes
  const fieldChanges = useMemo(
    () => detectFieldChanges(initialFieldsSnapshot, currentFields),
    [initialFieldsSnapshot, currentFields]
  );

  // Combine automatic detection with manual marks
  const areFieldsDirty = fieldChanges.isDirty || manualDirtyMarks.size > 0;
  const changeTypes = [
    ...new Set([...fieldChanges.changeTypes, ...Array.from(manualDirtyMarks)]),
  ];

  // Combined dirty state
  const isDirty = formIsDirty || areFieldsDirty;

  // Notify on dirty state change
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Reset dirty state
  const resetDirtyState = useCallback(() => {
    if (currentFields) {
      setInitialFieldsSnapshot([...currentFields]);
    }
    setManualDirtyMarks(new Set());
  }, [currentFields]);

  // Manually mark fields as dirty
  const markFieldsAsDirty = useCallback(
    (changeType: 'added' | 'removed' | 'modified' | 'reordered') => {
      setManualDirtyMarks(prev => new Set([...prev, changeType]));
    },
    []
  );

  // Update current fields snapshot
  const updateFieldsSnapshot = useCallback((fields: ComponentSchemaField[]) => {
    setCurrentFields([...fields]);
  }, []);

  return {
    isDirty,
    isFormDirty: formIsDirty,
    areFieldsDirty,
    fieldChangeCount: fieldChanges.changeCount + manualDirtyMarks.size,
    changeTypes,
    resetDirtyState,
    markFieldsAsDirty,
    updateFieldsSnapshot,
  };
};
