/**
 * Field Selection Hook
 *
 * Manages multi-select state for bulk field operations with keyboard shortcuts,
 * selection persistence, and accessibility features.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ComponentSchemaField } from '../../types/schema';

interface UseFieldSelectionOptions {
  fields: ComponentSchemaField[];
  onSelectionChange?: (selectedIds: string[]) => void;
  enableKeyboardShortcuts?: boolean;
  maxSelections?: number;
  disabledFieldIds?: string[];
}

interface UseFieldSelectionReturn {
  selectedFieldIds: Set<string>;
  isFieldSelected: (fieldId: string) => boolean;
  toggleFieldSelection: (fieldId: string, event?: React.MouseEvent) => void;
  selectAllFields: () => void;
  clearSelection: () => void;
  selectFieldRange: (startFieldId: string, endFieldId: string) => void;
  selectedCount: number;
  canSelectMore: boolean;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
}

export const useFieldSelection = (
  options: UseFieldSelectionOptions
): UseFieldSelectionReturn => {
  const {
    fields,
    onSelectionChange,
    enableKeyboardShortcuts = true,
    maxSelections,
    disabledFieldIds = [],
  } = options;

  const [selectedFieldIds, setSelectedFieldIds] = useState<Set<string>>(new Set());
  const lastSelectedIdRef = useRef<string | null>(null);

  // Get selectable fields (active and not disabled)
  const selectableFields = fields.filter(
    field => field.is_active && !disabledFieldIds.includes(field.id)
  );

  const selectableFieldIds = selectableFields.map(field => field.id);

  // Derived state
  const selectedCount = selectedFieldIds.size;
  const canSelectMore = !maxSelections || selectedCount < maxSelections;
  const isAllSelected = selectableFieldIds.length > 0 &&
    selectableFieldIds.every(id => selectedFieldIds.has(id));
  const isPartiallySelected = selectedCount > 0 && !isAllSelected;

  // Check if a field is selected
  const isFieldSelected = useCallback((fieldId: string) => {
    return selectedFieldIds.has(fieldId);
  }, [selectedFieldIds]);

  // Toggle individual field selection
  const toggleFieldSelection = useCallback((
    fieldId: string,
    event?: React.MouseEvent
  ) => {
    if (disabledFieldIds.includes(fieldId)) {
      return;
    }

    setSelectedFieldIds(prev => {
      const newSelection = new Set(prev);

      // Handle shift-click for range selection
      if (event?.shiftKey && lastSelectedIdRef.current) {
        const startIndex = selectableFieldIds.indexOf(lastSelectedIdRef.current);
        const endIndex = selectableFieldIds.indexOf(fieldId);

        if (startIndex !== -1 && endIndex !== -1) {
          const rangeStart = Math.min(startIndex, endIndex);
          const rangeEnd = Math.max(startIndex, endIndex);

          // Add all fields in range if we can select more
          for (let i = rangeStart; i <= rangeEnd; i++) {
            const id = selectableFieldIds[i];
            if (canSelectMore || newSelection.has(id)) {
              newSelection.add(id);
            }
          }

          return newSelection;
        }
      }

      // Regular toggle
      if (newSelection.has(fieldId)) {
        newSelection.delete(fieldId);
      } else if (canSelectMore) {
        newSelection.add(fieldId);
        lastSelectedIdRef.current = fieldId;
      }

      return newSelection;
    });
  }, [selectableFieldIds, disabledFieldIds, canSelectMore]);

  // Select all selectable fields
  const selectAllFields = useCallback(() => {
    const fieldsToSelect = maxSelections
      ? selectableFieldIds.slice(0, maxSelections)
      : selectableFieldIds;

    const newSelection = new Set(fieldsToSelect);
    setSelectedFieldIds(newSelection);

    if (fieldsToSelect.length > 0) {
      lastSelectedIdRef.current = fieldsToSelect[fieldsToSelect.length - 1];
    }
  }, [selectableFieldIds, maxSelections]);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedFieldIds(new Set());
    lastSelectedIdRef.current = null;
  }, []);

  // Select a range of fields
  const selectFieldRange = useCallback((startFieldId: string, endFieldId: string) => {
    const startIndex = selectableFieldIds.indexOf(startFieldId);
    const endIndex = selectableFieldIds.indexOf(endFieldId);

    if (startIndex === -1 || endIndex === -1) {
      return;
    }

    const rangeStart = Math.min(startIndex, endIndex);
    const rangeEnd = Math.max(startIndex, endIndex);

    setSelectedFieldIds(prev => {
      const newSelection = new Set(prev);

      for (let i = rangeStart; i <= rangeEnd; i++) {
        const id = selectableFieldIds[i];
        if (canSelectMore || newSelection.has(id)) {
          newSelection.add(id);
        }
      }

      return newSelection;
    });
  }, [selectableFieldIds, canSelectMore]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+A (Cmd+A on Mac) - Select All
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        const activeElement = document.activeElement;

        // Only handle if focus is on our component area, not in input fields
        if (activeElement &&
            !['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)) {
          event.preventDefault();
          selectAllFields();
        }
      }

      // Escape - Clear Selection
      if (event.key === 'Escape' && selectedCount > 0) {
        clearSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableKeyboardShortcuts, selectAllFields, clearSelection, selectedCount]);

  // Call onSelectionChange when selection changes
  useEffect(() => {
    onSelectionChange?.(Array.from(selectedFieldIds));
  }, [selectedFieldIds, onSelectionChange]);

  // Clear selection when fields change significantly
  useEffect(() => {
    const validSelectedIds = Array.from(selectedFieldIds).filter(id =>
      selectableFieldIds.includes(id)
    );

    if (validSelectedIds.length !== selectedFieldIds.size) {
      setSelectedFieldIds(new Set(validSelectedIds));
    }
  }, [selectableFieldIds, selectedFieldIds]);

  return {
    selectedFieldIds,
    isFieldSelected,
    toggleFieldSelection,
    selectAllFields,
    clearSelection,
    selectFieldRange,
    selectedCount,
    canSelectMore,
    isAllSelected,
    isPartiallySelected,
  };
};