/**
 * Test Suite: useSchemaDirtyState Hook
 * Story: 3.13 Phase 2 - FR-3 AC 11-16
 *
 * Tests unified dirty state detection combining React Hook Form state
 * and field-level operations (add, remove, modify, reorder).
 */

import { renderHook, act } from '@testing-library/react';
import { useSchemaDirtyState } from '../useSchemaDirtyState';
import { ComponentSchema, ComponentSchemaField } from '../../../services/api';

describe('useSchemaDirtyState', () => {
  const mockField1: ComponentSchemaField = {
    id: 'field-1',
    schema_id: 'schema-123',
    field_name: 'field_one',
    label: 'Field One',
    field_type: 'text',
    is_required: false,
    is_active: true,
    display_order: 0,
    field_config: {},
    help_text: '',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockField2: ComponentSchemaField = {
    id: 'field-2',
    schema_id: 'schema-123',
    field_name: 'field_two',
    label: 'Field Two',
    field_type: 'number',
    is_required: true,
    is_active: true,
    display_order: 1,
    field_config: {},
    help_text: '',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockInitialSchema: ComponentSchema = {
    id: 'schema-123',
    project_id: 'project-456',
    name: 'Test Schema',
    description: 'Test description',
    is_default: false,
    is_active: true,
    version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    fields: [mockField1, mockField2],
  };

  describe('FR-3 AC 11: Initial clean state', () => {
    it('should return isDirty=false when initialized with unchanged data', () => {
      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: mockInitialSchema,
          formIsDirty: false,
        })
      );

      expect(result.current.isDirty).toBe(false);
      expect(result.current.isFormDirty).toBe(false);
      expect(result.current.areFieldsDirty).toBe(false);
      expect(result.current.fieldChangeCount).toBe(0);
      expect(result.current.changeTypes).toEqual([]);
    });

    it('should return isDirty=false when both form and fields are pristine', () => {
      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: mockInitialSchema,
          formIsDirty: false,
        })
      );

      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('FR-3 AC 12: Form metadata changes trigger dirty state', () => {
    it('should return isDirty=true when formIsDirty is true', () => {
      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: mockInitialSchema,
          formIsDirty: true,
        })
      );

      expect(result.current.isDirty).toBe(true);
      expect(result.current.isFormDirty).toBe(true);
      expect(result.current.areFieldsDirty).toBe(false);
    });

    it('should provide formIsDirty in result', () => {
      const { result, rerender } = renderHook(
        ({ formIsDirty }) =>
          useSchemaDirtyState({
            initialSchema: mockInitialSchema,
            formIsDirty,
          }),
        { initialProps: { formIsDirty: false } }
      );

      expect(result.current.isFormDirty).toBe(false);

      rerender({ formIsDirty: true });
      expect(result.current.isFormDirty).toBe(true);
    });
  });

  describe('FR-3 AC 13: Field addition triggers dirty state', () => {
    it('should detect when a new field is added', () => {
      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: mockInitialSchema,
          formIsDirty: false,
        })
      );

      const newField: ComponentSchemaField = {
        ...mockField1,
        id: 'field-3',
        field_name: 'field_three',
        label: 'Field Three',
        display_order: 2,
      };

      act(() => {
        result.current.updateFieldsSnapshot([mockField1, mockField2, newField]);
      });

      expect(result.current.isDirty).toBe(true);
      expect(result.current.areFieldsDirty).toBe(true);
      expect(result.current.changeTypes).toContain('added');
      expect(result.current.fieldChangeCount).toBeGreaterThan(0);
    });

    it('should count added fields correctly', () => {
      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: mockInitialSchema,
        })
      );

      const newField1: ComponentSchemaField = { ...mockField1, id: 'field-3', display_order: 2 };
      const newField2: ComponentSchemaField = { ...mockField1, id: 'field-4', display_order: 3 };

      act(() => {
        result.current.updateFieldsSnapshot([mockField1, mockField2, newField1, newField2]);
      });

      expect(result.current.changeTypes).toContain('added');
      expect(result.current.isDirty).toBe(true);
    });

    it('should trigger dirty state immediately via markFieldsAsDirty("added")', () => {
      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: mockInitialSchema,
        })
      );

      expect(result.current.isDirty).toBe(false);

      act(() => {
        result.current.markFieldsAsDirty('added');
      });

      expect(result.current.isDirty).toBe(true);
      expect(result.current.changeTypes).toContain('added');
    });
  });

  describe('FR-3 AC 14: Field removal triggers dirty state', () => {
    it('should detect when a field is removed', () => {
      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: mockInitialSchema,
        })
      );

      act(() => {
        result.current.updateFieldsSnapshot([mockField1]);
      });

      expect(result.current.isDirty).toBe(true);
      expect(result.current.changeTypes).toContain('removed');
    });

    it('should handle removal of multiple fields', () => {
      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: mockInitialSchema,
        })
      );

      act(() => {
        result.current.updateFieldsSnapshot([]);
      });

      expect(result.current.isDirty).toBe(true);
      expect(result.current.changeTypes).toContain('removed');
    });

    it('should trigger dirty state immediately via markFieldsAsDirty("removed")', () => {
      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: mockInitialSchema,
        })
      );

      act(() => {
        result.current.markFieldsAsDirty('removed');
      });

      expect(result.current.isDirty).toBe(true);
      expect(result.current.changeTypes).toContain('removed');
    });
  });

  describe('FR-3 AC 15: Field modification triggers dirty state', () => {
    it('should detect when field label is modified', () => {
      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: mockInitialSchema,
        })
      );

      const modifiedField: ComponentSchemaField = {
        ...mockField1,
        label: 'Updated Field One',
      };

      act(() => {
        result.current.updateFieldsSnapshot([modifiedField, mockField2]);
      });

      expect(result.current.isDirty).toBe(true);
      expect(result.current.changeTypes).toContain('modified');
    });

    it('should detect changes to field_type', () => {
      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: mockInitialSchema,
        })
      );

      const modifiedField: ComponentSchemaField = {
        ...mockField1,
        field_type: 'textarea',
      };

      act(() => {
        result.current.updateFieldsSnapshot([modifiedField, mockField2]);
      });

      expect(result.current.isDirty).toBe(true);
      expect(result.current.changeTypes).toContain('modified');
    });

    it('should detect changes to is_required flag', () => {
      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: mockInitialSchema,
        })
      );

      const modifiedField: ComponentSchemaField = {
        ...mockField1,
        is_required: true,
      };

      act(() => {
        result.current.updateFieldsSnapshot([modifiedField, mockField2]);
      });

      expect(result.current.isDirty).toBe(true);
      expect(result.current.changeTypes).toContain('modified');
    });

    it('should detect changes to field_config', () => {
      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: mockInitialSchema,
        })
      );

      const modifiedField: ComponentSchemaField = {
        ...mockField1,
        field_config: { options: ['Option 1', 'Option 2'] },
      };

      act(() => {
        result.current.updateFieldsSnapshot([modifiedField, mockField2]);
      });

      expect(result.current.isDirty).toBe(true);
      expect(result.current.changeTypes).toContain('modified');
    });

    it('should trigger dirty state immediately via markFieldsAsDirty("modified")', () => {
      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: mockInitialSchema,
        })
      );

      act(() => {
        result.current.markFieldsAsDirty('modified');
      });

      expect(result.current.isDirty).toBe(true);
      expect(result.current.changeTypes).toContain('modified');
    });
  });

  describe('FR-3 AC 16: Field reordering triggers dirty state', () => {
    it('should detect when display_order changes', () => {
      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: mockInitialSchema,
        })
      );

      act(() => {
        result.current.updateFieldsSnapshot([mockField2, mockField1]);
      });

      expect(result.current.isDirty).toBe(true);
      expect(result.current.changeTypes).toContain('reordered');
    });

    it('should detect reordering via array position change', () => {
      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: mockInitialSchema,
        })
      );

      const reorderedFields = [mockField2, mockField1];

      act(() => {
        result.current.updateFieldsSnapshot(reorderedFields);
      });

      expect(result.current.isDirty).toBe(true);
      expect(result.current.changeTypes).toContain('reordered');
    });

    it('should trigger dirty state immediately via markFieldsAsDirty("reordered")', () => {
      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: mockInitialSchema,
        })
      );

      act(() => {
        result.current.markFieldsAsDirty('reordered');
      });

      expect(result.current.isDirty).toBe(true);
      expect(result.current.changeTypes).toContain('reordered');
    });
  });

  describe('Edge cases and combined scenarios', () => {
    it('should handle undefined initial schema', () => {
      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: undefined,
          formIsDirty: false,
        })
      );

      expect(result.current.isDirty).toBe(false);
      expect(result.current.fieldChangeCount).toBe(0);
    });

    it('should detect multiple change types simultaneously', () => {
      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: mockInitialSchema,
        })
      );

      const modifiedField: ComponentSchemaField = { ...mockField1, label: 'Modified' };
      const newField: ComponentSchemaField = {
        ...mockField1,
        id: 'field-3',
        display_order: 2,
      };

      act(() => {
        result.current.updateFieldsSnapshot([modifiedField, newField]);
      });

      expect(result.current.isDirty).toBe(true);
      expect(result.current.changeTypes.length).toBeGreaterThan(1);
    });

    it('should reset dirty state when resetDirtyState is called', () => {
      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: mockInitialSchema,
        })
      );

      act(() => {
        result.current.markFieldsAsDirty('added');
      });

      expect(result.current.isDirty).toBe(true);

      act(() => {
        result.current.resetDirtyState();
      });

      expect(result.current.isDirty).toBe(false);
      expect(result.current.changeTypes).toEqual([]);
    });

    it('should combine form and field changes', () => {
      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: mockInitialSchema,
          formIsDirty: true,
        })
      );

      act(() => {
        result.current.markFieldsAsDirty('added');
      });

      expect(result.current.isDirty).toBe(true);
      expect(result.current.isFormDirty).toBe(true);
      expect(result.current.areFieldsDirty).toBe(true);
    });

    it('should call onDirtyChange callback when dirty state changes', () => {
      const onDirtyChange = jest.fn();

      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: mockInitialSchema,
          formIsDirty: false,
          onDirtyChange,
        })
      );

      expect(onDirtyChange).toHaveBeenCalledWith(false);

      act(() => {
        result.current.markFieldsAsDirty('added');
      });

      expect(onDirtyChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Performance', () => {
    it('should efficiently detect changes in large field lists', () => {
      const largeFieldList: ComponentSchemaField[] = Array.from({ length: 50 }, (_, i) => ({
        ...mockField1,
        id: `field-${i}`,
        field_name: `field_${i}`,
        display_order: i,
      }));

      const schemaWithManyFields: ComponentSchema = {
        ...mockInitialSchema,
        fields: largeFieldList,
      };

      const { result } = renderHook(() =>
        useSchemaDirtyState({
          initialSchema: schemaWithManyFields,
        })
      );

      const modifiedField: ComponentSchemaField = {
        ...largeFieldList[25],
        label: 'Modified Field',
      };

      const updatedFields = [...largeFieldList];
      updatedFields[25] = modifiedField;

      const startTime = performance.now();

      act(() => {
        result.current.updateFieldsSnapshot(updatedFields);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.current.isDirty).toBe(true);
      expect(duration).toBeLessThan(100);
    });
  });
});
