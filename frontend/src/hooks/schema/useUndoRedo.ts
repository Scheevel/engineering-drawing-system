/**
 * Undo/Redo Hook for Schema Editing
 *
 * Provides comprehensive undo/redo functionality with operation tracking,
 * visual indicators, and memory management for schema editing operations.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSchemaEditing, EditOperation } from '../../contexts/SchemaEditingContext';
import { ComponentSchemaField } from '../../types/schema';
import { createEditOperation } from '../../utils/schemaOperations';

// ========================================
// INTERFACES
// ========================================

export interface UndoRedoOptions {
  maxStackSize?: number;
  groupDelayMs?: number;
  enableKeyboardShortcuts?: boolean;
}

export interface UndoRedoStatus {
  canUndo: boolean;
  canRedo: boolean;
  undoStackSize: number;
  redoStackSize: number;
  lastOperation: EditOperation | null;
  nextUndoOperation: EditOperation | null;
  nextRedoOperation: EditOperation | null;
}

export interface UndoRedoHookReturn {
  status: UndoRedoStatus;
  undo: () => boolean;
  redo: () => boolean;
  addOperation: (operation: Omit<EditOperation, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  groupOperations: (operations: Array<Omit<EditOperation, 'id' | 'timestamp'>>, description: string) => void;
  startOperationGroup: (description: string) => void;
  endOperationGroup: () => void;
}

// ========================================
// OPERATION EXECUTORS
// ========================================

interface OperationExecutors {
  [key: string]: {
    undo: (undoData: any) => void;
    redo: (data: any) => void;
  };
}

// ========================================
// UNDO/REDO HOOK IMPLEMENTATION
// ========================================

export const useUndoRedo = (
  options: UndoRedoOptions = {}
): UndoRedoHookReturn => {
  const {
    maxStackSize = 50,
    groupDelayMs = 1000,
    enableKeyboardShortcuts = true,
  } = options;

  const { state, dispatch } = useSchemaEditing();

  // Local state to track grouping for re-renders
  const [isCurrentlyGrouping, setIsCurrentlyGrouping] = useState(false);

  // Refs for operation grouping
  const operationGroupRef = useRef<{
    operations: Array<Omit<EditOperation, 'id' | 'timestamp'>>;
    description: string;
    timer: NodeJS.Timeout | null;
  } | null>(null);

  // ========================================
  // OPERATION EXECUTORS
  // ========================================

  const operationExecutors: OperationExecutors = {
    field_add: {
      undo: (undoData) => {
        // Remove the field that was added
        const { fieldId } = undoData;
        dispatch({ type: 'DELETE_FIELD', payload: { fieldId } });
      },
      redo: (data) => {
        // Re-add the field
        const { field, afterFieldId } = data;
        dispatch({ type: 'ADD_FIELD', payload: { field, afterFieldId } });
      },
    },

    field_edit: {
      undo: (undoData) => {
        // Restore the previous field state
        const { fieldId, previousField } = undoData;
        dispatch({ type: 'UPDATE_FIELD', payload: { fieldId, field: previousField } });
      },
      redo: (data) => {
        // Re-apply the field changes
        const { fieldId, newField } = data;
        dispatch({ type: 'UPDATE_FIELD', payload: { fieldId, field: newField } });
      },
    },

    field_delete: {
      undo: (undoData) => {
        // Restore the deleted field
        const { field, afterFieldId } = undoData;
        dispatch({ type: 'ADD_FIELD', payload: { field, afterFieldId } });
      },
      redo: (data) => {
        // Re-delete the field
        const { fieldId } = data;
        dispatch({ type: 'DELETE_FIELD', payload: { fieldId } });
      },
    },

    field_reorder: {
      undo: (undoData) => {
        // Restore the previous field order
        const { previousOrder } = undoData;
        dispatch({ type: 'REORDER_FIELDS', payload: { fieldIds: previousOrder } });
      },
      redo: (data) => {
        // Re-apply the new field order
        const { newOrder } = data;
        dispatch({ type: 'REORDER_FIELDS', payload: { fieldIds: newOrder } });
      },
    },

    schema_edit: {
      undo: (undoData) => {
        // Restore previous schema properties
        const { previousSchema } = undoData;
        dispatch({ type: 'SET_ACTIVE_SCHEMA', payload: { schema: previousSchema } });
      },
      redo: (data) => {
        // Re-apply schema changes
        const { newSchema } = data;
        dispatch({ type: 'SET_ACTIVE_SCHEMA', payload: { schema: newSchema } });
      },
    },
  };

  // ========================================
  // OPERATION GROUP MANAGEMENT
  // ========================================

  const flushOperationGroup = useCallback(() => {
    if (!operationGroupRef.current) return;

    const { operations, description } = operationGroupRef.current;

    if (operations.length === 1) {
      // Single operation, add directly
      const operation = createEditOperation(
        operations[0].type,
        operations[0].data,
        operations[0].undoData,
        operations[0].description
      );
      dispatch({ type: 'ADD_OPERATION', payload: { operation } });
    } else if (operations.length > 1) {
      // Multiple operations, group them
      const groupedOperation = createEditOperation(
        'grouped_operation' as any,
        { operations },
        { operations: operations.map(op => ({ ...op, undoData: op.data, data: op.undoData })) },
        description
      );
      dispatch({ type: 'ADD_OPERATION', payload: { operation: groupedOperation } });
    }

    operationGroupRef.current = null;
    setIsCurrentlyGrouping(false);
  }, [dispatch]);

  const startOperationGroup = useCallback((description: string) => {
    // Flush any existing group
    flushOperationGroup();

    operationGroupRef.current = {
      operations: [],
      description,
      timer: null,
    };
    setIsCurrentlyGrouping(true);
  }, [flushOperationGroup]);

  const endOperationGroup = useCallback(() => {
    flushOperationGroup();
    setIsCurrentlyGrouping(false);
  }, [flushOperationGroup]);

  // ========================================
  // MAIN UNDO/REDO FUNCTIONS
  // ========================================

  const undo = useCallback((): boolean => {
    if (state.undoStack.length === 0) return false;

    const operation = state.undoStack[state.undoStack.length - 1];

    try {
      if (operation.type === 'grouped_operation') {
        // Undo grouped operations in reverse order
        const { operations } = operation.undoData;
        for (let i = operations.length - 1; i >= 0; i--) {
          const executor = operationExecutors[operations[i].type];
          if (executor) {
            executor.undo(operations[i].undoData);
          }
        }
      } else {
        // Undo single operation
        const executor = operationExecutors[operation.type];
        if (executor) {
          executor.undo(operation.undoData);
        }
      }

      dispatch({ type: 'UNDO_OPERATION' });
      dispatch({ type: 'MARK_DIRTY', payload: { changeId: `undo-${Date.now()}` } });

      return true;
    } catch (error) {
      console.error('Undo operation failed:', error);
      return false;
    }
  }, [state.undoStack, operationExecutors, dispatch]);

  const redo = useCallback((): boolean => {
    if (state.redoStack.length === 0) return false;

    const operation = state.redoStack[state.redoStack.length - 1];

    try {
      if (operation.type === 'grouped_operation') {
        // Redo grouped operations in original order
        const { operations } = operation.data;
        for (const groupedOp of operations) {
          const executor = operationExecutors[groupedOp.type];
          if (executor) {
            executor.redo(groupedOp.data);
          }
        }
      } else {
        // Redo single operation
        const executor = operationExecutors[operation.type];
        if (executor) {
          executor.redo(operation.data);
        }
      }

      dispatch({ type: 'REDO_OPERATION' });
      dispatch({ type: 'MARK_DIRTY', payload: { changeId: `redo-${Date.now()}` } });

      return true;
    } catch (error) {
      console.error('Redo operation failed:', error);
      return false;
    }
  }, [state.redoStack, operationExecutors, dispatch]);

  // ========================================
  // OPERATION MANAGEMENT
  // ========================================

  const addOperation = useCallback((
    operation: Omit<EditOperation, 'id' | 'timestamp'>
  ) => {
    if (operationGroupRef.current) {
      // Add to current group
      operationGroupRef.current.operations.push(operation);

      // Reset group timer
      if (operationGroupRef.current.timer) {
        clearTimeout(operationGroupRef.current.timer);
      }

      operationGroupRef.current.timer = setTimeout(() => {
        flushOperationGroup();
      }, groupDelayMs);
    } else {
      // Add as individual operation
      const fullOperation = createEditOperation(
        operation.type,
        operation.data,
        operation.undoData,
        operation.description
      );
      dispatch({ type: 'ADD_OPERATION', payload: { operation: fullOperation } });
    }
  }, [flushOperationGroup, groupDelayMs, dispatch]);

  const groupOperations = useCallback((
    operations: Array<Omit<EditOperation, 'id' | 'timestamp'>>,
    description: string
  ) => {
    const groupedOperation = createEditOperation(
      'grouped_operation' as any,
      { operations },
      { operations: operations.map(op => ({ ...op, undoData: op.data, data: op.undoData })) },
      description
    );
    dispatch({ type: 'ADD_OPERATION', payload: { operation: groupedOperation } });
  }, [dispatch]);

  const clearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_UNDO_STACK' });
  }, [dispatch]);

  // ========================================
  // CONVENIENCE FUNCTIONS
  // ========================================

  const addFieldUpdateOperation = useCallback((
    fieldId: string,
    oldField: ComponentSchemaField,
    newField: ComponentSchemaField,
    description: string
  ) => {
    addOperation({
      type: 'field_edit',
      data: { fieldId, field: newField },
      undoData: { fieldId, previousField: oldField },
      description,
    });
  }, [addOperation]);

  const addFieldCreationOperation = useCallback((
    fieldId: string,
    field: ComponentSchemaField,
    description: string
  ) => {
    addOperation({
      type: 'field_add',
      data: { field, afterFieldId: null },
      undoData: { fieldId },
      description,
    });
  }, [addOperation]);

  const addFieldDeletionOperation = useCallback((
    fieldId: string,
    field: ComponentSchemaField,
    description: string
  ) => {
    addOperation({
      type: 'field_delete',
      data: { fieldId },
      undoData: { fieldId, field },
      description,
    });
  }, [addOperation]);

  const addFieldReorderOperation = useCallback((
    fieldIds: string[],
    fromIndices: number[],
    toIndices: number[],
    description: string
  ) => {
    addOperation({
      type: 'field_reorder',
      data: { fieldIds, toIndices },
      undoData: { fieldIds, fromIndices },
      description,
    });
  }, [addOperation]);

  const addCustomOperation = useCallback((
    operation: Omit<EditOperation, 'id' | 'timestamp'>
  ) => {
    addOperation(operation);
  }, [addOperation]);

  const getLastOperationDescription = useCallback((): string | null => {
    if (state.undoStack.length === 0) return null;
    return state.undoStack[state.undoStack.length - 1].description;
  }, [state.undoStack]);

  const getNextRedoOperationDescription = useCallback((): string | null => {
    if (state.redoStack.length === 0) return null;
    return state.redoStack[state.redoStack.length - 1].description;
  }, [state.redoStack]);

  const getOperationHistory = useCallback((limit?: number): Array<{
    description: string;
    timestamp: number;
    type: 'undo' | 'redo';
  }> => {
    const history = [
      ...state.undoStack.map(op => ({
        description: op.description,
        timestamp: op.timestamp,
        type: 'undo' as const,
      })),
      ...state.redoStack.map(op => ({
        description: op.description,
        timestamp: op.timestamp,
        type: 'redo' as const,
      })),
    ].sort((a, b) => b.timestamp - a.timestamp);

    return limit ? history.slice(0, limit) : history;
  }, [state.undoStack, state.redoStack]);

  // ========================================
  // KEYBOARD SHORTCUTS
  // ========================================

  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      switch (event.key.toLowerCase()) {
        case 'z':
          if (event.shiftKey) {
            // Ctrl+Shift+Z or Cmd+Shift+Z for redo
            event.preventDefault();
            redo();
          } else {
            // Ctrl+Z or Cmd+Z for undo
            event.preventDefault();
            undo();
          }
          break;
        case 'y':
          // Ctrl+Y or Cmd+Y for redo (alternative)
          event.preventDefault();
          redo();
          break;
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [enableKeyboardShortcuts, undo, redo]);

  // ========================================
  // CLEANUP EFFECTS
  // ========================================

  useEffect(() => {
    return () => {
      // Clear any pending operation group timer
      if (operationGroupRef.current?.timer) {
        clearTimeout(operationGroupRef.current.timer);
      }
    };
  }, []);

  // ========================================
  // STATUS CALCULATION
  // ========================================

  const status: UndoRedoStatus = {
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
    undoStackSize: state.undoStack.length,
    redoStackSize: state.redoStack.length,
    lastOperation: state.undoStack.length > 0 ? state.undoStack[state.undoStack.length - 1] : null,
    nextUndoOperation: state.undoStack.length > 0 ? state.undoStack[state.undoStack.length - 1] : null,
    nextRedoOperation: state.redoStack.length > 0 ? state.redoStack[state.redoStack.length - 1] : null,
  };

  return {
    // Status properties (both nested and flat for compatibility)
    status,
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
    undoCount: state.undoStack.length,
    redoCount: state.redoStack.length,
    isGrouping: isCurrentlyGrouping,
    currentGroupDescription: operationGroupRef.current?.description || null,

    // Core operations
    undo,
    redo,
    addOperation,
    clearHistory,

    // Convenience functions
    addFieldUpdateOperation,
    addFieldCreationOperation,
    addFieldDeletionOperation,
    addFieldReorderOperation,
    addCustomOperation,

    // Operation grouping
    groupOperations,
    startOperationGroup,
    endOperationGroup,

    // History access
    getLastOperationDescription,
    getNextRedoOperationDescription,
    getOperationHistory,
  };
};

export default useUndoRedo;