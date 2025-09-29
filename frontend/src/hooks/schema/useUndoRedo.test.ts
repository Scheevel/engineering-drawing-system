/**
 * Undo/Redo Hook Tests
 *
 * Tests for undo/redo functionality including operation grouping,
 * keyboard shortcuts, and operation execution/rollback.
 */

import { renderHook, act } from '@testing-library/react';
import { useUndoRedo, UndoRedoOptions } from './useUndoRedo';
import { ComponentSchemaField } from '../../types/schema';
import { SchemaTestProvider, createMockField } from '../../test-utils/schemaTestUtils';

// Mock schema editing context
const mockDispatch = jest.fn();
const mockState = {
  undoStack: [],
  redoStack: [],
  editingFields: {},
  selectedFields: new Set(),
  activeSchemaId: null,
  activeSchema: null,
  maxUndoStackSize: 50,
  isDirty: false,
  lastSaveTimestamp: null,
  unsavedChanges: new Set(),
  autoSaveStatus: 'idle' as const,
  autoSaveEnabled: true,
  autoSaveInterval: 30000,
  autoSaveLastAttempt: null,
  autoSaveError: null,
  isLoading: false,
  showUnsavedChangesDialog: false,
  fieldRenderCache: new Map(),
  lastUserActivity: Date.now(),
};

jest.mock('../../contexts/SchemaEditingContext', () => ({
  useSchemaEditing: () => ({
    state: mockState,
    dispatch: mockDispatch,
  }),
  SchemaEditingProvider: ({ children }: any) => children,
}));

// Test data
const mockField: ComponentSchemaField = createMockField();

const updatedField: ComponentSchemaField = {
  ...mockField,
  field_name: 'updated_field',
  updated_at: '2024-01-01T01:00:00Z',
};

describe('useUndoRedo Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.undoStack = [];
    mockState.redoStack = [];
    mockState.editingFields = {};
  });

  const renderUndoRedoHook = (options?: UndoRedoOptions) => {
    return renderHook(() => useUndoRedo(options), {
      wrapper: SchemaTestProvider,
    });
  };

  describe('Basic Undo/Redo Operations', () => {
    it('should initialize with no operations available', () => {
      const { result } = renderUndoRedoHook();

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
      expect(result.current.undoCount).toBe(0);
      expect(result.current.redoCount).toBe(0);
    });

    it('should add field update operation', () => {
      const { result } = renderUndoRedoHook();

      act(() => {
        result.current.addFieldUpdateOperation(
          mockField.id,
          mockField,
          updatedField,
          'Update field name'
        );
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ADD_OPERATION',
        payload: {
          operation: expect.objectContaining({
            type: 'field_edit',
            data: { fieldId: mockField.id, field: updatedField },
            undoData: { fieldId: mockField.id, previousField: mockField },
            description: 'Update field name',
          }),
        },
      });
    });

    it('should add field creation operation', () => {
      const { result } = renderUndoRedoHook();

      act(() => {
        result.current.addFieldCreationOperation(
          mockField.id,
          mockField,
          'Create new field'
        );
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ADD_OPERATION',
        payload: {
          operation: expect.objectContaining({
            type: 'field_add',
            data: { field: mockField, afterFieldId: null },
            undoData: { fieldId: mockField.id },
            description: 'Create new field',
          }),
        },
      });
    });

    it('should add field deletion operation', () => {
      const { result } = renderUndoRedoHook();

      act(() => {
        result.current.addFieldDeletionOperation(
          mockField.id,
          mockField,
          'Delete field'
        );
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ADD_OPERATION',
        payload: {
          operation: expect.objectContaining({
            type: 'field_delete',
            data: { fieldId: mockField.id },
            undoData: { fieldId: mockField.id, field: mockField },
            description: 'Delete field',
          }),
        },
      });
    });

    it('should add field reorder operation', () => {
      const { result } = renderUndoRedoHook();

      act(() => {
        result.current.addFieldReorderOperation(
          [mockField.id, 'field-456'],
          [2, 1],
          [1, 2],
          'Reorder fields'
        );
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ADD_OPERATION',
        payload: {
          operation: expect.objectContaining({
            type: 'field_reorder',
            data: { fieldIds: [mockField.id, 'field-456'], toIndices: [1, 2] },
            undoData: { fieldIds: [mockField.id, 'field-456'], fromIndices: [2, 1] },
            description: 'Reorder fields',
          }),
        },
      });
    });

    it('should perform undo operation', () => {
      // Add operation to undo stack first
      mockState.undoStack = [{
        id: 'op-1',
        type: 'field_edit',
        timestamp: Date.now(),
        description: 'Test operation',
        data: {},
        undoData: {},
      }];

      const { result } = renderUndoRedoHook();

      act(() => {
        result.current.undo();
      });

      expect(mockDispatch).toHaveBeenCalledWith({ type: 'UNDO_OPERATION' });
    });

    it('should perform redo operation', () => {
      // Add operation to redo stack first
      mockState.redoStack = [{
        id: 'redo-op-1',
        type: 'field_edit',
        timestamp: Date.now(),
        description: 'Test redo operation',
        data: {},
        undoData: {},
      }];

      const { result } = renderUndoRedoHook();

      act(() => {
        result.current.redo();
      });

      expect(mockDispatch).toHaveBeenCalledWith({ type: 'REDO_OPERATION' });
    });
  });

  describe('Operation Grouping', () => {
    it('should start operation group', () => {
      const { result } = renderUndoRedoHook();

      act(() => {
        result.current.startOperationGroup('Bulk field update');
      });

      expect(result.current.isGrouping).toBe(true);
      expect(result.current.currentGroupDescription).toBe('Bulk field update');
    });

    it('should end operation group and create grouped operation', () => {
      const { result } = renderUndoRedoHook();

      act(() => {
        result.current.startOperationGroup('Bulk field update');

        // Add individual operations
        result.current.addFieldUpdateOperation(
          'field-1',
          { ...mockField, id: 'field-1' },
          { ...updatedField, id: 'field-1' },
          'Update field 1'
        );

        result.current.addFieldUpdateOperation(
          'field-2',
          { ...mockField, id: 'field-2' },
          { ...updatedField, id: 'field-2' },
          'Update field 2'
        );

        result.current.endOperationGroup();
      });

      expect(result.current.isGrouping).toBe(false);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ADD_OPERATION',
        payload: {
          operation: expect.objectContaining({
            type: 'grouped_operation',
            description: 'Bulk field update',
            data: expect.objectContaining({
              operations: expect.arrayContaining([
                expect.objectContaining({ type: 'field_edit' }),
                expect.objectContaining({ type: 'field_edit' }),
              ]),
            }),
          }),
        },
      });
    });

    it('should group multiple operations', () => {
      const { result } = renderUndoRedoHook();

      const operations = [
        {
          type: 'field_edit' as const,
          data: { fieldId: 'field-1', field: updatedField },
          undoData: { fieldId: 'field-1', previousField: mockField },
          description: 'Update field 1',
        },
        {
          type: 'field_edit' as const,
          data: { fieldId: 'field-2', field: updatedField },
          undoData: { fieldId: 'field-2', previousField: mockField },
          description: 'Update field 2',
        },
      ];

      act(() => {
        result.current.groupOperations(operations, 'Bulk field update');
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ADD_OPERATION',
        payload: {
          operation: expect.objectContaining({
            type: 'grouped_operation',
            description: 'Bulk field update',
            data: expect.objectContaining({
              operations,
            }),
          }),
        },
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      // Mock addEventListener and removeEventListener
      global.addEventListener = jest.fn();
      global.removeEventListener = jest.fn();
    });

    it('should register keyboard shortcuts by default', () => {
      renderUndoRedoHook();

      expect(global.addEventListener).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
    });

    it('should not register keyboard shortcuts when disabled', () => {
      const options: UndoRedoOptions = {
        enableKeyboardShortcuts: false,
      };

      renderUndoRedoHook(options);

      expect(global.addEventListener).not.toHaveBeenCalled();
    });

    it('should cleanup event listeners on unmount', () => {
      const { unmount } = renderUndoRedoHook();

      unmount();

      expect(global.removeEventListener).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
    });
  });

  describe('Stack Management', () => {
    it('should respect maximum stack size', () => {
      const options: UndoRedoOptions = {
        maxStackSize: 2,
      };

      const { result } = renderUndoRedoHook(options);

      // Add more operations than the limit
      act(() => {
        result.current.addFieldUpdateOperation(
          'field-1',
          mockField,
          { ...mockField, field_name: 'update-1' },
          'Operation 1'
        );

        result.current.addFieldUpdateOperation(
          'field-2',
          mockField,
          { ...mockField, field_name: 'update-2' },
          'Operation 2'
        );

        result.current.addFieldUpdateOperation(
          'field-3',
          mockField,
          { ...mockField, field_name: 'update-3' },
          'Operation 3'
        );
      });

      // Should dispatch all operations (reducer handles stack size limit)
      expect(mockDispatch).toHaveBeenCalledTimes(3);
    });

    it('should clear undo/redo history', () => {
      const { result } = renderUndoRedoHook();

      act(() => {
        result.current.clearHistory();
      });

      expect(mockDispatch).toHaveBeenCalledWith({ type: 'CLEAR_UNDO_STACK' });
    });
  });

  describe('Operation History', () => {
    beforeEach(() => {
      mockState.undoStack = [
        {
          id: 'op-1',
          type: 'field_edit',
          timestamp: Date.now() - 3000,
          description: 'Update field 1',
          data: {},
          undoData: {},
        },
        {
          id: 'op-2',
          type: 'field_add',
          timestamp: Date.now() - 2000,
          description: 'Create field 2',
          data: {},
          undoData: {},
        },
        {
          id: 'op-3',
          type: 'field_delete',
          timestamp: Date.now() - 1000,
          description: 'Delete field 3',
          data: {},
          undoData: {},
        },
      ];

      mockState.redoStack = [
        {
          id: 'redo-op-1',
          type: 'field_edit',
          timestamp: Date.now() - 500,
          description: 'Undone operation',
          data: {},
          undoData: {},
        },
      ];
    });

    it('should provide operation history', () => {
      const { result } = renderUndoRedoHook();

      expect(result.current.undoCount).toBe(3);
      expect(result.current.redoCount).toBe(1);
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(true);
    });

    it('should get last operation description', () => {
      const { result } = renderUndoRedoHook();

      expect(result.current.getLastOperationDescription()).toBe('Delete field 3');
    });

    it('should get next redo operation description', () => {
      const { result } = renderUndoRedoHook();

      expect(result.current.getNextRedoOperationDescription()).toBe('Undone operation');
    });

    it('should return null for empty stacks', () => {
      mockState.undoStack = [];
      mockState.redoStack = [];

      const { result } = renderUndoRedoHook();

      expect(result.current.getLastOperationDescription()).toBeNull();
      expect(result.current.getNextRedoOperationDescription()).toBeNull();
    });

    it('should get operation history with timestamps', () => {
      const { result } = renderUndoRedoHook();

      const history = result.current.getOperationHistory(5);

      expect(history).toHaveLength(4); // 3 undo + 1 redo
      expect(history[0]).toEqual({
        description: 'Undone operation',
        timestamp: expect.any(Number),
        type: 'redo',
      });
    });

    it('should limit history results', () => {
      const { result } = renderUndoRedoHook();

      const history = result.current.getOperationHistory(2);

      expect(history).toHaveLength(2);
    });
  });

  describe('Custom Operations', () => {
    it('should add custom operation', () => {
      const { result } = renderUndoRedoHook();

      const customOperation = {
        type: 'custom_operation' as any,
        data: { customField: 'value' },
        undoData: { customField: 'oldValue' },
        description: 'Custom operation',
      };

      act(() => {
        result.current.addCustomOperation(customOperation);
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ADD_OPERATION',
        payload: {
          operation: expect.objectContaining({
            type: 'custom_operation',
            description: 'Custom operation',
            data: { customField: 'value' },
            undoData: { customField: 'oldValue' },
          }),
        },
      });
    });
  });

  describe('Status and State', () => {
    it('should provide correct status information', () => {
      const { result } = renderUndoRedoHook();

      expect(result.current.status).toEqual({
        canUndo: false,
        canRedo: false,
        undoStackSize: 0,
        redoStackSize: 0,
        lastOperation: null,
        nextUndoOperation: null,
        nextRedoOperation: null,
      });
    });

    it('should indicate when grouping operations', () => {
      const { result } = renderUndoRedoHook();

      act(() => {
        result.current.startOperationGroup('Test group');
      });

      expect(result.current.isGrouping).toBe(true);
      expect(result.current.currentGroupDescription).toBe('Test group');

      act(() => {
        result.current.endOperationGroup();
      });

      expect(result.current.isGrouping).toBe(false);
      expect(result.current.currentGroupDescription).toBeNull();
    });
  });
});