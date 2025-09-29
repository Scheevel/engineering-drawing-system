/**
 * Schema Editing Context Tests
 *
 * Comprehensive tests for the Schema Editing Context including
 * state management, undo/redo functionality, and auto-save integration.
 */

import React from 'react';
import React, { act } from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import {
  SchemaEditingProvider,
  useSchemaEditing,
  schemaEditingReducer,
  initialSchemaEditingState,
  type SchemaEditingAction,
  type SchemaEditingState,
  type EditOperation,
} from './SchemaEditingContext';
import { ComponentSchema, ComponentSchemaField } from '../types/schema';

// Test data
const mockSchema: ComponentSchema = {
  id: 'schema-123',
  name: 'Test Schema',
  description: 'Test schema description',
  project_id: 'project-456',
  version: 1,
  fields: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  is_active: true,
};

const mockField: ComponentSchemaField = {
  id: 'field-123',
  schema_id: 'schema-123',
  field_name: 'test_field',
  field_type: 'text',
  display_order: 1,
  is_required: false,
  help_text: 'Test help text',
  validation_rules: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SchemaEditingProvider>{children}</SchemaEditingProvider>
    </QueryClientProvider>
  );
};

describe('SchemaEditingContext', () => {
  describe('schemaEditingReducer', () => {
    let initialState: SchemaEditingState;

    beforeEach(() => {
      initialState = initialSchemaEditingState;
    });

    it('should handle SET_ACTIVE_SCHEMA action', () => {
      const action: SchemaEditingAction = {
        type: 'SET_ACTIVE_SCHEMA',
        schema: mockSchema,
      };

      const newState = schemaEditingReducer(initialState, action);

      expect(newState.activeSchemaId).toBe(mockSchema.id);
      expect(newState.activeSchema).toBe(mockSchema);
      expect(newState.isDirty).toBe(false);
    });

    it('should handle START_FIELD_EDIT action', () => {
      const action: SchemaEditingAction = {
        type: 'START_FIELD_EDIT',
        fieldId: mockField.id,
        initialValue: mockField,
      };

      const newState = schemaEditingReducer(initialState, action);

      expect(newState.editingFields[mockField.id]).toEqual({
        originalValue: mockField,
        currentValue: mockField,
        isValid: true,
        errors: [],
        isDirty: false,
        lastSaved: expect.any(Number),
      });
    });

    it('should handle UPDATE_FIELD_VALUE action', () => {
      const stateWithField = schemaEditingReducer(initialState, {
        type: 'START_FIELD_EDIT',
        fieldId: mockField.id,
        initialValue: mockField,
      });

      const updatedField = { ...mockField, field_name: 'updated_field' };
      const action: SchemaEditingAction = {
        type: 'UPDATE_FIELD_VALUE',
        fieldId: mockField.id,
        value: updatedField,
      };

      const newState = schemaEditingReducer(stateWithField, action);

      expect(newState.editingFields[mockField.id].currentValue).toBe(updatedField);
      expect(newState.editingFields[mockField.id].isDirty).toBe(true);
      expect(newState.isDirty).toBe(true);
    });

    it('should handle ADD_UNDO_OPERATION action', () => {
      const operation: EditOperation = {
        id: 'op-123',
        type: 'field_update',
        timestamp: Date.now(),
        description: 'Update field name',
        execute: jest.fn(),
        undo: jest.fn(),
        fieldId: mockField.id,
        oldValue: mockField,
        newValue: { ...mockField, field_name: 'updated' },
      };

      const action: SchemaEditingAction = {
        type: 'ADD_UNDO_OPERATION',
        operation,
      };

      const newState = schemaEditingReducer(initialState, action);

      expect(newState.undoStack).toHaveLength(1);
      expect(newState.undoStack[0]).toBe(operation);
      expect(newState.redoStack).toHaveLength(0);
    });

    it('should handle UNDO action', () => {
      const operation: EditOperation = {
        id: 'op-123',
        type: 'field_update',
        timestamp: Date.now(),
        description: 'Update field name',
        execute: jest.fn(),
        undo: jest.fn(),
        fieldId: mockField.id,
        oldValue: mockField,
        newValue: { ...mockField, field_name: 'updated' },
      };

      const stateWithUndo = {
        ...initialState,
        undoStack: [operation],
      };

      const action: SchemaEditingAction = { type: 'UNDO' };
      const newState = schemaEditingReducer(stateWithUndo, action);

      expect(newState.undoStack).toHaveLength(0);
      expect(newState.redoStack).toHaveLength(1);
      expect(newState.redoStack[0]).toBe(operation);
      expect(operation.undo).toHaveBeenCalled();
    });

    it('should handle REDO action', () => {
      const operation: EditOperation = {
        id: 'op-123',
        type: 'field_update',
        timestamp: Date.now(),
        description: 'Update field name',
        execute: jest.fn(),
        undo: jest.fn(),
        fieldId: mockField.id,
        oldValue: mockField,
        newValue: { ...mockField, field_name: 'updated' },
      };

      const stateWithRedo = {
        ...initialState,
        redoStack: [operation],
      };

      const action: SchemaEditingAction = { type: 'REDO' };
      const newState = schemaEditingReducer(stateWithRedo, action);

      expect(newState.redoStack).toHaveLength(0);
      expect(newState.undoStack).toHaveLength(1);
      expect(newState.undoStack[0]).toBe(operation);
      expect(operation.execute).toHaveBeenCalled();
    });

    it('should handle SET_AUTO_SAVE_STATUS action', () => {
      const action: SchemaEditingAction = {
        type: 'SET_AUTO_SAVE_STATUS',
        status: 'saving',
      };

      const newState = schemaEditingReducer(initialState, action);

      expect(newState.autoSaveStatus).toBe('saving');
    });

    it('should handle SELECT_FIELDS action', () => {
      const fieldIds = ['field-1', 'field-2'];
      const action: SchemaEditingAction = {
        type: 'SELECT_FIELDS',
        fieldIds,
      };

      const newState = schemaEditingReducer(initialState, action);

      expect(newState.selectedFields).toEqual(new Set(fieldIds));
    });

    it('should handle CLEAR_FIELD_SELECTION action', () => {
      const stateWithSelection = {
        ...initialState,
        selectedFields: new Set(['field-1', 'field-2']),
      };

      const action: SchemaEditingAction = { type: 'CLEAR_FIELD_SELECTION' };
      const newState = schemaEditingReducer(stateWithSelection, action);

      expect(newState.selectedFields.size).toBe(0);
    });

    it('should handle BULK_UPDATE_FIELDS action', () => {
      const updates = [
        { fieldId: 'field-1', value: { ...mockField, id: 'field-1' } },
        { fieldId: 'field-2', value: { ...mockField, id: 'field-2' } },
      ];

      const action: SchemaEditingAction = {
        type: 'BULK_UPDATE_FIELDS',
        updates,
      };

      const newState = schemaEditingReducer(initialState, action);

      expect(newState.bulkOperations.pendingUpdates).toEqual(updates);
      expect(newState.bulkOperations.isActive).toBe(true);
    });

    it('should limit undo stack size', () => {
      let state = initialState;

      // Add more operations than the limit (assuming 50 is the limit)
      for (let i = 0; i < 55; i++) {
        const operation: EditOperation = {
          id: `op-${i}`,
          type: 'field_update',
          timestamp: Date.now() + i,
          description: `Operation ${i}`,
          execute: jest.fn(),
          undo: jest.fn(),
          fieldId: `field-${i}`,
          oldValue: mockField,
          newValue: { ...mockField, id: `field-${i}` },
        };

        const action: SchemaEditingAction = {
          type: 'ADD_UNDO_OPERATION',
          operation,
        };

        state = schemaEditingReducer(state, action);
      }

      expect(state.undoStack.length).toBeLessThanOrEqual(50);
    });
  });

  describe('useSchemaEditing Hook', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should provide initial state', () => {
      const { result } = renderHook(() => useSchemaEditing(), {
        wrapper: TestWrapper,
      });

      expect(result.current.state.activeSchemaId).toBeNull();
      expect(result.current.state.activeSchema).toBeNull();
      expect(result.current.state.isDirty).toBe(false);
      expect(result.current.state.autoSaveStatus).toBe('idle');
    });

    it('should set active schema', () => {
      const { result } = renderHook(() => useSchemaEditing(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setActiveSchema(mockSchema);
      });

      expect(result.current.state.activeSchemaId).toBe(mockSchema.id);
      expect(result.current.state.activeSchema).toBe(mockSchema);
    });

    it('should start field editing', () => {
      const { result } = renderHook(() => useSchemaEditing(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.startFieldEdit(mockField.id, mockField);
      });

      expect(result.current.state.editingFields[mockField.id]).toBeDefined();
      expect(result.current.state.editingFields[mockField.id].originalValue).toBe(mockField);
    });

    it('should update field value', () => {
      const { result } = renderHook(() => useSchemaEditing(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.startFieldEdit(mockField.id, mockField);
      });

      const updatedField = { ...mockField, field_name: 'updated_field' };

      act(() => {
        result.current.updateFieldValue(mockField.id, updatedField);
      });

      expect(result.current.state.editingFields[mockField.id].currentValue).toBe(updatedField);
      expect(result.current.state.editingFields[mockField.id].isDirty).toBe(true);
      expect(result.current.state.isDirty).toBe(true);
    });

    it('should handle field validation', () => {
      const { result } = renderHook(() => useSchemaEditing(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.startFieldEdit(mockField.id, mockField);
      });

      const errors = ['Field name is required'];

      act(() => {
        result.current.setFieldErrors(mockField.id, errors);
      });

      expect(result.current.state.editingFields[mockField.id].errors).toEqual(errors);
      expect(result.current.state.editingFields[mockField.id].isValid).toBe(false);
    });

    it('should perform undo operation', () => {
      const { result } = renderHook(() => useSchemaEditing(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.startFieldEdit(mockField.id, mockField);
      });

      const updatedField = { ...mockField, field_name: 'updated_field' };

      act(() => {
        result.current.updateFieldValue(mockField.id, updatedField);
      });

      // Should have undo operation available
      expect(result.current.state.undoStack.length).toBeGreaterThan(0);

      act(() => {
        result.current.undo();
      });

      expect(result.current.state.undoStack.length).toBe(0);
      expect(result.current.state.redoStack.length).toBeGreaterThan(0);
    });

    it('should perform redo operation', () => {
      const { result } = renderHook(() => useSchemaEditing(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.startFieldEdit(mockField.id, mockField);
      });

      const updatedField = { ...mockField, field_name: 'updated_field' };

      act(() => {
        result.current.updateFieldValue(mockField.id, updatedField);
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.state.redoStack.length).toBeGreaterThan(0);

      act(() => {
        result.current.redo();
      });

      expect(result.current.state.redoStack.length).toBe(0);
      expect(result.current.state.undoStack.length).toBeGreaterThan(0);
    });

    it('should handle field selection', () => {
      const { result } = renderHook(() => useSchemaEditing(), {
        wrapper: TestWrapper,
      });

      const fieldIds = ['field-1', 'field-2'];

      act(() => {
        result.current.selectFields(fieldIds);
      });

      expect(result.current.state.selectedFields).toEqual(new Set(fieldIds));

      act(() => {
        result.current.clearFieldSelection();
      });

      expect(result.current.state.selectedFields.size).toBe(0);
    });

    it('should handle bulk operations', () => {
      const { result } = renderHook(() => useSchemaEditing(), {
        wrapper: TestWrapper,
      });

      const updates = [
        { fieldId: 'field-1', value: { ...mockField, id: 'field-1' } },
        { fieldId: 'field-2', value: { ...mockField, id: 'field-2' } },
      ];

      act(() => {
        result.current.bulkUpdateFields(updates);
      });

      expect(result.current.state.bulkOperations.pendingUpdates).toEqual(updates);
      expect(result.current.state.bulkOperations.isActive).toBe(true);
    });

    it('should save field changes', async () => {
      const { result } = renderHook(() => useSchemaEditing(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.startFieldEdit(mockField.id, mockField);
      });

      const updatedField = { ...mockField, field_name: 'updated_field' };

      act(() => {
        result.current.updateFieldValue(mockField.id, updatedField);
      });

      await act(async () => {
        await result.current.saveFieldChanges(mockField.id);
      });

      expect(result.current.state.editingFields[mockField.id].isDirty).toBe(false);
    });

    it('should reset dirty state after save', async () => {
      const { result } = renderHook(() => useSchemaEditing(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.startFieldEdit(mockField.id, mockField);
      });

      const updatedField = { ...mockField, field_name: 'updated_field' };

      act(() => {
        result.current.updateFieldValue(mockField.id, updatedField);
      });

      expect(result.current.state.isDirty).toBe(true);

      await act(async () => {
        await result.current.saveFieldChanges(mockField.id);
      });

      expect(result.current.state.isDirty).toBe(false);
    });

    it('should handle auto-save status updates', () => {
      const { result } = renderHook(() => useSchemaEditing(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAutoSaveStatus('saving');
      });

      expect(result.current.state.autoSaveStatus).toBe('saving');

      act(() => {
        result.current.setAutoSaveStatus('saved');
      });

      expect(result.current.state.autoSaveStatus).toBe('saved');
    });

    it('should provide keyboard shortcuts', () => {
      const { result } = renderHook(() => useSchemaEditing(), {
        wrapper: TestWrapper,
      });

      expect(result.current.keyboardShortcuts).toBeDefined();
      expect(result.current.keyboardShortcuts.undo).toBe('Ctrl+Z');
      expect(result.current.keyboardShortcuts.redo).toBe('Ctrl+Y');
      expect(result.current.keyboardShortcuts.save).toBe('Ctrl+S');
    });

    it('should check if undo/redo is available', () => {
      const { result } = renderHook(() => useSchemaEditing(), {
        wrapper: TestWrapper,
      });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);

      act(() => {
        result.current.startFieldEdit(mockField.id, mockField);
      });

      const updatedField = { ...mockField, field_name: 'updated_field' };

      act(() => {
        result.current.updateFieldValue(mockField.id, updatedField);
      });

      expect(result.current.canUndo).toBe(true);

      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex editing workflow', () => {
      const { result } = renderHook(() => useSchemaEditing(), {
        wrapper: TestWrapper,
      });

      // Set up initial state
      act(() => {
        result.current.setActiveSchema(mockSchema);
        result.current.startFieldEdit(mockField.id, mockField);
      });

      // Make changes
      const updatedField1 = { ...mockField, field_name: 'updated_1' };
      const updatedField2 = { ...mockField, field_name: 'updated_2' };

      act(() => {
        result.current.updateFieldValue(mockField.id, updatedField1);
      });

      act(() => {
        result.current.updateFieldValue(mockField.id, updatedField2);
      });

      // Verify state
      expect(result.current.state.editingFields[mockField.id].currentValue).toBe(updatedField2);
      expect(result.current.state.isDirty).toBe(true);
      expect(result.current.canUndo).toBe(true);

      // Undo changes
      act(() => {
        result.current.undo();
      });

      expect(result.current.state.editingFields[mockField.id].currentValue).toBe(updatedField1);

      act(() => {
        result.current.undo();
      });

      expect(result.current.state.editingFields[mockField.id].currentValue).toBe(mockField);

      // Redo changes
      act(() => {
        result.current.redo();
      });

      expect(result.current.state.editingFields[mockField.id].currentValue).toBe(updatedField1);
    });

    it('should handle multiple field editing', () => {
      const { result } = renderHook(() => useSchemaEditing(), {
        wrapper: TestWrapper,
      });

      const field1 = { ...mockField, id: 'field-1' };
      const field2 = { ...mockField, id: 'field-2' };

      act(() => {
        result.current.startFieldEdit(field1.id, field1);
        result.current.startFieldEdit(field2.id, field2);
      });

      const updatedField1 = { ...field1, field_name: 'updated_1' };
      const updatedField2 = { ...field2, field_name: 'updated_2' };

      act(() => {
        result.current.updateFieldValue(field1.id, updatedField1);
        result.current.updateFieldValue(field2.id, updatedField2);
      });

      expect(result.current.state.editingFields[field1.id].currentValue).toBe(updatedField1);
      expect(result.current.state.editingFields[field2.id].currentValue).toBe(updatedField2);
      expect(result.current.state.isDirty).toBe(true);
    });
  });
});