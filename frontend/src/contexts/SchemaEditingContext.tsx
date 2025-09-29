/**
 * Schema Editing Context
 *
 * Provides state management for complex schema editing operations including
 * field operations, undo/redo functionality, dirty state tracking, and auto-save.
 * This context wraps schema editing components and pages to provide unified state.
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { ComponentSchema, ComponentSchemaField, SchemaFieldType } from '../types/schema';
import { createEditOperation, generateFieldId } from '../utils/schemaOperations';

// ========================================
// STATE INTERFACES
// ========================================

export interface FieldEditState {
  fieldId: string;
  originalField: ComponentSchemaField;
  currentField: ComponentSchemaField;
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  validationErrors: string[];
}

export interface EditOperation {
  id: string;
  type: 'field_add' | 'field_edit' | 'field_delete' | 'field_reorder' | 'schema_edit';
  timestamp: number;
  data: any;
  undoData: any;
  description: string;
}

export interface SchemaEditingState {
  // Core schema state
  activeSchemaId: string | null;
  activeSchema: ComponentSchema | null;

  // Field editing state
  editingFields: Record<string, FieldEditState>;
  selectedFields: Set<string>;

  // Undo/redo functionality
  undoStack: EditOperation[];
  redoStack: EditOperation[];
  maxUndoStackSize: number;

  // Dirty state tracking
  isDirty: boolean;
  lastSaveTimestamp: number | null;
  unsavedChanges: Set<string>;

  // Auto-save state
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  autoSaveLastAttempt: number | null;
  autoSaveError: string | null;

  // UI state
  isLoading: boolean;
  showUnsavedChangesDialog: boolean;

  // Performance state
  fieldRenderCache: Map<string, any>;
  lastUserActivity: number;
}

// ========================================
// ACTION TYPES
// ========================================

export type SchemaEditingAction =
  // Schema management
  | { type: 'SET_ACTIVE_SCHEMA'; payload: { schema: ComponentSchema | null } }
  | { type: 'SCHEMA_LOADING_START' }
  | { type: 'SCHEMA_LOADING_END' }

  // Field operations
  | { type: 'START_FIELD_EDIT'; payload: { fieldId: string; field: ComponentSchemaField } }
  | { type: 'UPDATE_FIELD'; payload: { fieldId: string; field: ComponentSchemaField } }
  | { type: 'BULK_UPDATE_FIELDS'; payload: { updates: Record<string, ComponentSchemaField> } }
  | { type: 'CANCEL_FIELD_EDIT'; payload: { fieldId: string } }
  | { type: 'SAVE_FIELD_EDIT'; payload: { fieldId: string } }
  | { type: 'DELETE_FIELD'; payload: { fieldId: string } }
  | { type: 'ADD_FIELD'; payload: { field: ComponentSchemaField; afterFieldId?: string } }
  | { type: 'REORDER_FIELDS'; payload: { fieldIds: string[] } }

  // Field selection
  | { type: 'SELECT_FIELD'; payload: { fieldId: string; multiSelect?: boolean } }
  | { type: 'SELECT_FIELDS'; payload: { fieldIds: string[] } }
  | { type: 'DESELECT_FIELD'; payload: { fieldId: string } }
  | { type: 'SELECT_ALL_FIELDS' }
  | { type: 'CLEAR_FIELD_SELECTION' }

  // Undo/redo operations
  | { type: 'ADD_OPERATION'; payload: { operation: EditOperation } }
  | { type: 'UNDO_OPERATION' }
  | { type: 'REDO_OPERATION' }
  | { type: 'CLEAR_UNDO_STACK' }

  // Dirty state management
  | { type: 'MARK_DIRTY'; payload: { changeId: string } }
  | { type: 'MARK_CLEAN'; payload: { changeId?: string } }
  | { type: 'SET_LAST_SAVE_TIMESTAMP'; payload: { timestamp: number } }

  // Auto-save management
  | { type: 'AUTO_SAVE_START' }
  | { type: 'AUTO_SAVE_SUCCESS' }
  | { type: 'AUTO_SAVE_ERROR'; payload: { error: string } }
  | { type: 'SET_AUTO_SAVE_ENABLED'; payload: { enabled: boolean } }
  | { type: 'SET_AUTO_SAVE_INTERVAL'; payload: { interval: number } }

  // UI state
  | { type: 'SHOW_UNSAVED_CHANGES_DIALOG'; payload: { show: boolean } }
  | { type: 'UPDATE_USER_ACTIVITY' }

  // Performance optimizations
  | { type: 'UPDATE_FIELD_CACHE'; payload: { fieldId: string; data: any } }
  | { type: 'CLEAR_FIELD_CACHE' }

  // Validation
  | { type: 'SET_FIELD_VALIDATION_ERRORS'; payload: { fieldId: string; errors: string[] } }

  // Reset and cleanup
  | { type: 'RESET_STATE' }
  | { type: 'CLEANUP_EXPIRED_OPERATIONS' };

// ========================================
// INITIAL STATE
// ========================================

const initialState: SchemaEditingState = {
  activeSchemaId: null,
  activeSchema: null,
  editingFields: {},
  selectedFields: new Set(),
  undoStack: [],
  redoStack: [],
  maxUndoStackSize: 50,
  isDirty: false,
  lastSaveTimestamp: null,
  unsavedChanges: new Set(),
  autoSaveStatus: 'idle',
  autoSaveEnabled: true,
  autoSaveInterval: 30000, // 30 seconds
  autoSaveLastAttempt: null,
  autoSaveError: null,
  isLoading: false,
  showUnsavedChangesDialog: false,
  fieldRenderCache: new Map(),
  lastUserActivity: Date.now(),
};

// ========================================
// REDUCER IMPLEMENTATION
// ========================================

export const schemaEditingReducer = (state: SchemaEditingState, action: SchemaEditingAction): SchemaEditingState => {
  switch (action.type) {
    case 'SET_ACTIVE_SCHEMA': {
      const { schema } = action.payload;
      return {
        ...state,
        activeSchemaId: schema?.id || null,
        activeSchema: schema,
        editingFields: {},
        selectedFields: new Set(),
        undoStack: [],
        redoStack: [],
        isDirty: false,
        unsavedChanges: new Set(),
        fieldRenderCache: new Map(),
      };
    }

    case 'SCHEMA_LOADING_START':
      return { ...state, isLoading: true };

    case 'SCHEMA_LOADING_END':
      return { ...state, isLoading: false };

    case 'START_FIELD_EDIT': {
      const { fieldId, field } = action.payload;
      return {
        ...state,
        editingFields: {
          ...state.editingFields,
          [fieldId]: {
            fieldId,
            originalField: field,
            currentField: { ...field },
            isEditing: true,
            hasUnsavedChanges: false,
            validationErrors: [],
          },
        },
        lastUserActivity: Date.now(),
      };
    }

    case 'UPDATE_FIELD': {
      const { fieldId, field } = action.payload;
      const existingEdit = state.editingFields[fieldId];
      if (!existingEdit) return state;

      const hasChanges = JSON.stringify(existingEdit.originalField) !== JSON.stringify(field);

      return {
        ...state,
        editingFields: {
          ...state.editingFields,
          [fieldId]: {
            ...existingEdit,
            currentField: field,
            hasUnsavedChanges: hasChanges,
          },
        },
        isDirty: hasChanges || state.isDirty,
        unsavedChanges: hasChanges
          ? new Set([...state.unsavedChanges, fieldId])
          : state.unsavedChanges,
        lastUserActivity: Date.now(),
      };
    }

    case 'BULK_UPDATE_FIELDS': {
      const { updates } = action.payload;
      const newEditingFields = { ...state.editingFields };
      const newUnsavedChanges = new Set(state.unsavedChanges);
      let hasAnyChanges = false;

      Object.entries(updates).forEach(([fieldId, field]) => {
        const existingEdit = newEditingFields[fieldId];
        if (existingEdit) {
          const hasChanges = JSON.stringify(existingEdit.originalField) !== JSON.stringify(field);
          newEditingFields[fieldId] = {
            ...existingEdit,
            currentField: field,
            hasUnsavedChanges: hasChanges,
          };
          if (hasChanges) {
            newUnsavedChanges.add(fieldId);
            hasAnyChanges = true;
          }
        }
      });

      return {
        ...state,
        editingFields: newEditingFields,
        isDirty: hasAnyChanges || state.isDirty,
        unsavedChanges: newUnsavedChanges,
        lastUserActivity: Date.now(),
      };
    }

    case 'CANCEL_FIELD_EDIT': {
      const { fieldId } = action.payload;
      const { [fieldId]: removedField, ...remainingFields } = state.editingFields;
      const newUnsavedChanges = new Set(state.unsavedChanges);
      newUnsavedChanges.delete(fieldId);

      return {
        ...state,
        editingFields: remainingFields,
        unsavedChanges: newUnsavedChanges,
        isDirty: newUnsavedChanges.size > 0,
      };
    }

    case 'SAVE_FIELD_EDIT': {
      const { fieldId } = action.payload;
      const fieldEdit = state.editingFields[fieldId];
      if (!fieldEdit) return state;

      const { [fieldId]: savedField, ...remainingFields } = state.editingFields;
      const newUnsavedChanges = new Set(state.unsavedChanges);
      newUnsavedChanges.delete(fieldId);

      return {
        ...state,
        editingFields: remainingFields,
        unsavedChanges: newUnsavedChanges,
        isDirty: newUnsavedChanges.size > 0,
        lastSaveTimestamp: Date.now(),
      };
    }

    case 'SELECT_FIELD': {
      const { fieldId, multiSelect = false } = action.payload;
      const newSelection = new Set(multiSelect ? state.selectedFields : []);
      newSelection.add(fieldId);

      return {
        ...state,
        selectedFields: newSelection,
        lastUserActivity: Date.now(),
      };
    }

    case 'SELECT_FIELDS': {
      const { fieldIds } = action.payload;
      return {
        ...state,
        selectedFields: new Set(fieldIds),
        lastUserActivity: Date.now(),
      };
    }

    case 'DESELECT_FIELD': {
      const { fieldId } = action.payload;
      const newSelection = new Set(state.selectedFields);
      newSelection.delete(fieldId);

      return {
        ...state,
        selectedFields: newSelection,
      };
    }

    case 'SELECT_ALL_FIELDS': {
      const allFieldIds = state.activeSchema?.fields?.map(f => f.id) || [];
      return {
        ...state,
        selectedFields: new Set(allFieldIds),
      };
    }

    case 'CLEAR_FIELD_SELECTION':
      return {
        ...state,
        selectedFields: new Set(),
      };

    case 'ADD_OPERATION': {
      const { operation } = action.payload;
      const newUndoStack = [...state.undoStack, operation];

      // Limit undo stack size
      if (newUndoStack.length > state.maxUndoStackSize) {
        newUndoStack.shift();
      }

      return {
        ...state,
        undoStack: newUndoStack,
        redoStack: [], // Clear redo stack when new operation is added
        lastUserActivity: Date.now(),
      };
    }

    case 'UNDO_OPERATION': {
      if (state.undoStack.length === 0) return state;

      const [operation, ...remainingUndo] = state.undoStack.slice().reverse();
      const newRedoStack = [...state.redoStack, operation];

      return {
        ...state,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: newRedoStack,
        isDirty: true,
        lastUserActivity: Date.now(),
      };
    }

    case 'REDO_OPERATION': {
      if (state.redoStack.length === 0) return state;

      const [operation, ...remainingRedo] = state.redoStack.slice().reverse();
      const newUndoStack = [...state.undoStack, operation];

      return {
        ...state,
        undoStack: newUndoStack,
        redoStack: state.redoStack.slice(0, -1),
        isDirty: true,
        lastUserActivity: Date.now(),
      };
    }

    case 'CLEAR_UNDO_STACK':
      return {
        ...state,
        undoStack: [],
        redoStack: [],
      };

    case 'MARK_DIRTY': {
      const { changeId } = action.payload;
      return {
        ...state,
        isDirty: true,
        unsavedChanges: new Set([...state.unsavedChanges, changeId]),
        lastUserActivity: Date.now(),
      };
    }

    case 'MARK_CLEAN': {
      const { changeId } = action.payload || {};
      if (changeId) {
        const newUnsavedChanges = new Set(state.unsavedChanges);
        newUnsavedChanges.delete(changeId);
        return {
          ...state,
          unsavedChanges: newUnsavedChanges,
          isDirty: newUnsavedChanges.size > 0,
        };
      }
      return {
        ...state,
        isDirty: false,
        unsavedChanges: new Set(),
      };
    }

    case 'SET_LAST_SAVE_TIMESTAMP': {
      const { timestamp } = action.payload;
      return {
        ...state,
        lastSaveTimestamp: timestamp,
        autoSaveStatus: 'saved',
      };
    }

    case 'AUTO_SAVE_START':
      return {
        ...state,
        autoSaveStatus: 'saving',
        autoSaveLastAttempt: Date.now(),
        autoSaveError: null,
      };

    case 'AUTO_SAVE_SUCCESS':
      return {
        ...state,
        autoSaveStatus: 'saved',
        lastSaveTimestamp: Date.now(),
        autoSaveError: null,
      };

    case 'AUTO_SAVE_ERROR': {
      const { error } = action.payload;
      return {
        ...state,
        autoSaveStatus: 'error',
        autoSaveError: error,
      };
    }

    case 'SET_AUTO_SAVE_ENABLED': {
      const { enabled } = action.payload;
      return {
        ...state,
        autoSaveEnabled: enabled,
        autoSaveStatus: enabled ? state.autoSaveStatus : 'idle',
      };
    }

    case 'SET_AUTO_SAVE_INTERVAL': {
      const { interval } = action.payload;
      return {
        ...state,
        autoSaveInterval: Math.max(5000, interval), // Minimum 5 seconds
      };
    }

    case 'SHOW_UNSAVED_CHANGES_DIALOG': {
      const { show } = action.payload;
      return {
        ...state,
        showUnsavedChangesDialog: show,
      };
    }

    case 'UPDATE_USER_ACTIVITY':
      return {
        ...state,
        lastUserActivity: Date.now(),
      };

    case 'UPDATE_FIELD_CACHE': {
      const { fieldId, data } = action.payload;
      const newCache = new Map(state.fieldRenderCache);
      newCache.set(fieldId, data);
      return {
        ...state,
        fieldRenderCache: newCache,
      };
    }

    case 'CLEAR_FIELD_CACHE':
      return {
        ...state,
        fieldRenderCache: new Map(),
      };

    case 'SET_FIELD_VALIDATION_ERRORS': {
      const { fieldId, errors } = action.payload;
      const existingEdit = state.editingFields[fieldId];
      if (!existingEdit) return state;

      return {
        ...state,
        editingFields: {
          ...state.editingFields,
          [fieldId]: {
            ...existingEdit,
            validationErrors: errors,
          },
        },
      };
    }

    case 'RESET_STATE':
      return {
        ...initialState,
        autoSaveEnabled: state.autoSaveEnabled,
        autoSaveInterval: state.autoSaveInterval,
      };

    case 'CLEANUP_EXPIRED_OPERATIONS': {
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      return {
        ...state,
        undoStack: state.undoStack.filter(op => op.timestamp > oneHourAgo),
      };
    }

    default:
      return state;
  }
};

// ========================================
// CONTEXT IMPLEMENTATION
// ========================================

interface SchemaEditingContextValue {
  state: SchemaEditingState;
  dispatch: React.Dispatch<SchemaEditingAction>;
  // Helper functions
  canUndo: boolean;
  canRedo: boolean;
  hasUnsavedChanges: boolean;
  selectedFieldCount: number;
  isFieldEditing: (fieldId: string) => boolean;
  getFieldEditState: (fieldId: string) => FieldEditState | null;

  // Action functions
  setActiveSchema: (schema: ComponentSchema) => void;
  startFieldEdit: (fieldId: string, field: ComponentSchemaField) => void;
  updateFieldValue: (fieldId: string, field: ComponentSchemaField) => void;
  saveFieldChanges: (fieldId: string) => void;
  cancelFieldEdit: (fieldId: string) => void;
  selectFields: (fieldIds: string[]) => void;
  deselectField: (fieldId: string) => void;
  clearFieldSelection: () => void;
  bulkUpdateFields: (updates: Record<string, ComponentSchemaField>) => void;
  undo: () => void;
  redo: () => void;
}

const SchemaEditingContext = createContext<SchemaEditingContextValue | null>(null);

// ========================================
// PROVIDER COMPONENT
// ========================================

interface SchemaEditingProviderProps {
  children: ReactNode;
  autoSaveEnabled?: boolean;
  autoSaveInterval?: number;
  maxUndoStackSize?: number;
}

export const SchemaEditingProvider: React.FC<SchemaEditingProviderProps> = ({
  children,
  autoSaveEnabled = true,
  autoSaveInterval = 30000,
  maxUndoStackSize = 50,
}) => {
  const [state, dispatch] = useReducer(schemaEditingReducer, {
    ...initialState,
    autoSaveEnabled,
    autoSaveInterval,
    maxUndoStackSize,
  });

  // Auto-save effect
  useEffect(() => {
    if (!state.autoSaveEnabled || !state.isDirty || state.autoSaveStatus === 'saving') {
      return;
    }

    // Don't auto-save if user is actively typing (within 2 seconds)
    const timeSinceLastActivity = Date.now() - state.lastUserActivity;
    if (timeSinceLastActivity < 2000) {
      return;
    }

    const autoSaveTimer = setTimeout(() => {
      dispatch({ type: 'AUTO_SAVE_START' });

      // This would be replaced with actual save logic in implementation
      // For now, simulate save operation
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90% success rate for demo
          dispatch({ type: 'AUTO_SAVE_SUCCESS' });
          dispatch({ type: 'MARK_CLEAN', payload: {} });
        } else {
          dispatch({ type: 'AUTO_SAVE_ERROR', payload: { error: 'Network timeout' } });
        }
      }, 1000);
    }, state.autoSaveInterval);

    return () => clearTimeout(autoSaveTimer);
  }, [state.isDirty, state.autoSaveEnabled, state.autoSaveInterval, state.lastUserActivity, state.autoSaveStatus]);

  // Cleanup expired operations effect
  useEffect(() => {
    const cleanupTimer = setInterval(() => {
      dispatch({ type: 'CLEANUP_EXPIRED_OPERATIONS' });
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(cleanupTimer);
  }, []);

  // Keyboard shortcuts effect
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey)) {
        switch (event.key.toLowerCase()) {
          case 'z':
            if (event.shiftKey) {
              // Ctrl+Shift+Z or Cmd+Shift+Z for redo
              event.preventDefault();
              if (state.redoStack.length > 0) {
                dispatch({ type: 'REDO_OPERATION' });
              }
            } else {
              // Ctrl+Z or Cmd+Z for undo
              event.preventDefault();
              if (state.undoStack.length > 0) {
                dispatch({ type: 'UNDO_OPERATION' });
              }
            }
            break;
          case 'y':
            // Ctrl+Y or Cmd+Y for redo (alternative)
            event.preventDefault();
            if (state.redoStack.length > 0) {
              dispatch({ type: 'REDO_OPERATION' });
            }
            break;
          case 's':
            // Ctrl+S or Cmd+S for manual save
            event.preventDefault();
            if (state.isDirty) {
              // Trigger manual save - this would be implemented with actual save logic
              console.log('Manual save triggered');
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [state.undoStack.length, state.redoStack.length, state.isDirty]);

  // Action functions
  const setActiveSchema = useCallback((schema: ComponentSchema) => {
    dispatch({ type: 'SET_ACTIVE_SCHEMA', payload: { schema } });
  }, [dispatch]);

  const startFieldEdit = useCallback((fieldId: string, field: ComponentSchemaField) => {
    dispatch({ type: 'START_FIELD_EDIT', payload: { fieldId, field } });
  }, [dispatch]);

  const updateFieldValue = useCallback((fieldId: string, field: ComponentSchemaField) => {
    dispatch({ type: 'UPDATE_FIELD', payload: { fieldId, field } });
  }, [dispatch]);

  const saveFieldChanges = useCallback((fieldId: string) => {
    dispatch({ type: 'SAVE_FIELD_EDIT', payload: { fieldId } });
  }, [dispatch]);

  const cancelFieldEdit = useCallback((fieldId: string) => {
    dispatch({ type: 'CANCEL_FIELD_EDIT', payload: { fieldId } });
  }, [dispatch]);

  const selectFields = useCallback((fieldIds: string[]) => {
    dispatch({ type: 'SELECT_FIELDS', payload: { fieldIds } });
  }, [dispatch]);

  const deselectField = useCallback((fieldId: string) => {
    dispatch({ type: 'DESELECT_FIELD', payload: { fieldId } });
  }, [dispatch]);

  const clearFieldSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_FIELD_SELECTION' });
  }, [dispatch]);

  const bulkUpdateFields = useCallback((updates: Record<string, ComponentSchemaField>) => {
    dispatch({ type: 'BULK_UPDATE_FIELDS', payload: { updates } });
  }, [dispatch]);

  const undo = useCallback(() => {
    if (state.undoStack.length > 0) {
      dispatch({ type: 'UNDO_OPERATION' });
    }
  }, [dispatch, state.undoStack.length]);

  const redo = useCallback(() => {
    if (state.redoStack.length > 0) {
      dispatch({ type: 'REDO_OPERATION' });
    }
  }, [dispatch, state.redoStack.length]);

  // Helper values
  const contextValue: SchemaEditingContextValue = {
    state,
    dispatch,
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
    hasUnsavedChanges: state.isDirty,
    selectedFieldCount: state.selectedFields.size,
    isFieldEditing: (fieldId: string) => Boolean(state.editingFields[fieldId]?.isEditing),
    getFieldEditState: (fieldId: string) => state.editingFields[fieldId] || null,

    // Action functions
    setActiveSchema,
    startFieldEdit,
    updateFieldValue,
    saveFieldChanges,
    cancelFieldEdit,
    selectFields,
    deselectField,
    clearFieldSelection,
    bulkUpdateFields,
    undo,
    redo,
  };

  return (
    <SchemaEditingContext.Provider value={contextValue}>
      {children}
    </SchemaEditingContext.Provider>
  );
};

// ========================================
// HOOK FOR CONSUMING CONTEXT
// ========================================

export const useSchemaEditing = (): SchemaEditingContextValue => {
  const context = useContext(SchemaEditingContext);
  if (!context) {
    throw new Error('useSchemaEditing must be used within a SchemaEditingProvider');
  }
  return context;
};


export default SchemaEditingContext;