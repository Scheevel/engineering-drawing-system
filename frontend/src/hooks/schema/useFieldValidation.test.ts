/**
 * Test: useFieldValidation Hook
 *
 * Tests field validation logic including field names, types, configurations, and business rules
 */

import { renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useFieldValidation } from './useFieldValidation';
import { ComponentSchemaField, SchemaFieldType } from '../../services/api';

const mockExistingFields: ComponentSchemaField[] = [
  {
    id: 'field1',
    field_name: 'Existing Field',
    field_type: 'text',
    field_config: { placeholder: 'Enter text', maxLength: 255 },
    help_text: 'This field exists',
    display_order: 1,
    is_required: true,
    is_active: true,
  },
  {
    id: 'field2',
    field_name: 'Another Field',
    field_type: 'number',
    field_config: { min: 0, max: 100 },
    help_text: 'Number field',
    display_order: 2,
    is_required: false,
    is_active: true,
  },
];

describe('useFieldValidation', () => {
  let hook: ReturnType<typeof useFieldValidation>;

  beforeEach(() => {
    const { result } = renderHook(() => useFieldValidation());
    hook = result.current;
  });

  describe('validateFieldName', () => {
    test('validates required field name', () => {
      const result = hook.validateFieldName('', mockExistingFields);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('FIELD_NAME_REQUIRED');
      expect(result.errors[0].message).toBe('Field name is required');
    });

    test('validates field name length', () => {
      // Too short
      const shortResult = hook.validateFieldName('A', mockExistingFields);
      expect(shortResult.isValid).toBe(false);
      expect(shortResult.errors[0].code).toBe('FIELD_NAME_TOO_SHORT');

      // Too long
      const longName = 'A'.repeat(51);
      const longResult = hook.validateFieldName(longName, mockExistingFields);
      expect(longResult.isValid).toBe(false);
      expect(longResult.errors[0].code).toBe('FIELD_NAME_TOO_LONG');
    });

    test('validates field name format', () => {
      const invalidNames = [
        '123Invalid', // starts with number
        'Field!Name', // contains special character
        'Field@Name', // contains @ symbol
      ];

      invalidNames.forEach((name) => {
        const result = hook.validateFieldName(name, mockExistingFields);
        expect(result.isValid).toBe(false);
        expect(result.errors[0].code).toBe('FIELD_NAME_INVALID_FORMAT');
      });
    });

    test('validates valid field names', () => {
      const validNames = [
        'Valid Field Name',
        'Field_With_Underscores',
        'Field-With-Hyphens',
        'FieldWithNumbers123',
        'Simple',
      ];

      validNames.forEach((name) => {
        const result = hook.validateFieldName(name, mockExistingFields);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('detects duplicate field names', () => {
      const result = hook.validateFieldName('Existing Field', mockExistingFields);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('FIELD_NAME_DUPLICATE');
      expect(result.errors[0].message).toBe('A field with this name already exists');
    });

    test('excludes field from duplicate check when editing', () => {
      const result = hook.validateFieldName('Existing Field', mockExistingFields, {
        excludeFieldId: 'field1',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('provides warnings for potentially confusing names', () => {
      const doubleSpaceResult = hook.validateFieldName('Field  With  Spaces', mockExistingFields);
      expect(doubleSpaceResult.warnings).toContain('Field name contains multiple consecutive spaces');

      const fieldWordResult = hook.validateFieldName('My Field Name', mockExistingFields);
      expect(fieldWordResult.warnings).toContain('Consider avoiding the word "field" in field names');
    });

    test('handles case-insensitive duplicate detection', () => {
      const result = hook.validateFieldName('EXISTING FIELD', mockExistingFields);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('FIELD_NAME_DUPLICATE');
    });
  });

  describe('validateFieldType', () => {
    test('validates supported field types', () => {
      const supportedTypes: SchemaFieldType[] = ['text', 'number', 'select', 'checkbox', 'textarea', 'date'];

      supportedTypes.forEach((type) => {
        const result = hook.validateFieldType(type);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('rejects unsupported field types', () => {
      // @ts-ignore - testing invalid type
      const result = hook.validateFieldType('unsupported');

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('FIELD_TYPE_UNSUPPORTED');
    });

    test('validates field type with configuration', () => {
      const result = hook.validateFieldType('text', { maxLength: 100 });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateFieldConfig', () => {
    test('validates text field configuration', () => {
      // Valid config
      const validResult = hook.validateFieldConfig('text', { maxLength: 255, placeholder: 'Enter text' });
      expect(validResult.isValid).toBe(true);

      // Invalid max length
      const invalidResult = hook.validateFieldConfig('text', { maxLength: -1 });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].code).toBe('INVALID_MAX_LENGTH');
    });

    test('validates number field configuration', () => {
      // Valid config
      const validResult = hook.validateFieldConfig('number', { min: 0, max: 100, precision: 2 });
      expect(validResult.isValid).toBe(true);

      // Invalid range
      const invalidRangeResult = hook.validateFieldConfig('number', { min: 100, max: 50 });
      expect(invalidRangeResult.isValid).toBe(false);
      expect(invalidRangeResult.errors[0].code).toBe('INVALID_NUMBER_RANGE');

      // Invalid precision
      const invalidPrecisionResult = hook.validateFieldConfig('number', { precision: 15 });
      expect(invalidPrecisionResult.isValid).toBe(false);
      expect(invalidPrecisionResult.errors[0].code).toBe('INVALID_PRECISION');
    });

    test('validates select field configuration', () => {
      // Valid config
      const validResult = hook.validateFieldConfig('select', { options: ['Option 1', 'Option 2'] });
      expect(validResult.isValid).toBe(true);

      // Missing options
      const missingOptionsResult = hook.validateFieldConfig('select', {});
      expect(missingOptionsResult.isValid).toBe(false);
      expect(missingOptionsResult.errors[0].code).toBe('MISSING_SELECT_OPTIONS');

      // Empty options
      const emptyOptionsResult = hook.validateFieldConfig('select', { options: [] });
      expect(emptyOptionsResult.isValid).toBe(false);
      expect(emptyOptionsResult.errors[0].code).toBe('EMPTY_SELECT_OPTIONS');
    });

    test('validates textarea field configuration', () => {
      // Valid config
      const validResult = hook.validateFieldConfig('textarea', { rows: 4 });
      expect(validResult.isValid).toBe(true);

      // Invalid rows
      const invalidRowsResult = hook.validateFieldConfig('textarea', { rows: 25 });
      expect(invalidRowsResult.isValid).toBe(false);
      expect(invalidRowsResult.errors[0].code).toBe('INVALID_TEXTAREA_ROWS');
    });

    test('validates date field configuration', () => {
      // Valid config
      const validResult = hook.validateFieldConfig('date', {
        minDate: '2023-01-01',
        maxDate: '2023-12-31',
      });
      expect(validResult.isValid).toBe(true);

      // Invalid date range
      const invalidRangeResult = hook.validateFieldConfig('date', {
        minDate: '2023-12-31',
        maxDate: '2023-01-01',
      });
      expect(invalidRangeResult.isValid).toBe(false);
      expect(invalidRangeResult.errors[0].code).toBe('INVALID_DATE_RANGE');
    });

    test('provides warnings for potential issues', () => {
      // Large max length warning
      const largeMaxLengthResult = hook.validateFieldConfig('text', { maxLength: 15000 });
      expect(largeMaxLengthResult.warnings).toContain('Very large max length may impact performance');

      // Many select options warning
      const manyOptionsResult = hook.validateFieldConfig('select', {
        options: Array.from({ length: 150 }, (_, i) => `Option ${i + 1}`),
      });
      expect(manyOptionsResult.warnings).toContain('Large number of options may impact user experience');
    });
  });

  describe('validateField', () => {
    test('validates complete field object', () => {
      const validField: Partial<ComponentSchemaField> = {
        field_name: 'New Valid Field',
        field_type: 'text',
        field_config: { maxLength: 255 },
        help_text: 'This is a valid field',
        is_required: false,
      };

      const result = hook.validateField(validField, mockExistingFields);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validates field with multiple errors', () => {
      const invalidField: Partial<ComponentSchemaField> = {
        field_name: 'A', // Too short
        field_type: 'text',
        field_config: { maxLength: -1 }, // Invalid config
        help_text: 'A'.repeat(250), // Too long
      };

      const result = hook.validateField(invalidField, mockExistingFields);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    test('applies strict validation rules', () => {
      const field: Partial<ComponentSchemaField> = {
        field_name: '   ', // Empty when trimmed
        is_required: true,
      };

      const result = hook.validateField(field, mockExistingFields, { strictValidation: true });

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'REQUIRED_FIELD_NEEDS_NAME')).toBe(true);
    });

    test('excludes field from validation when editing', () => {
      const fieldUpdate: Partial<ComponentSchemaField> = {
        field_name: 'Existing Field', // This exists but we're editing it
        field_type: 'text',
      };

      const result = hook.validateField(fieldUpdate, mockExistingFields, {
        excludeFieldId: 'field1',
      });

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateFieldDeletion', () => {
    test('allows deletion of unrestricted fields', () => {
      const usageInfo = {
        componentCount: 2,
        hasRequiredUsage: false,
        canSafelyDelete: true,
      };

      const result = hook.validateFieldDeletion(mockExistingFields[0], usageInfo);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Deleting this field will affect 2 components');
    });

    test('prevents deletion of required fields', () => {
      const usageInfo = {
        componentCount: 3,
        hasRequiredUsage: true,
        canSafelyDelete: false,
      };

      const result = hook.validateFieldDeletion(mockExistingFields[0], usageInfo);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('FIELD_REQUIRED_BY_COMPONENTS');
    });

    test('provides warnings for required field deletion', () => {
      const requiredField = { ...mockExistingFields[0], is_required: true };
      const usageInfo = {
        componentCount: 1,
        hasRequiredUsage: false,
        canSafelyDelete: true,
      };

      const result = hook.validateFieldDeletion(requiredField, usageInfo);

      expect(result.warnings).toContain('Deleting a required field may cause validation issues');
    });

    test('handles unused fields', () => {
      const usageInfo = {
        componentCount: 0,
        hasRequiredUsage: false,
        canSafelyDelete: true,
      };

      const result = hook.validateFieldDeletion(mockExistingFields[0], usageInfo);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('edge cases and error handling', () => {
    test('handles empty existing fields array', () => {
      const result = hook.validateFieldName('New Field', []);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('handles malformed field configurations', () => {
      const result = hook.validateFieldConfig('text', { invalid: 'config' });

      expect(result.isValid).toBe(true); // No specific validation for unknown properties
    });

    test('handles null and undefined values gracefully', () => {
      const field: Partial<ComponentSchemaField> = {
        field_name: undefined,
        field_type: 'text',
      };

      const result = hook.validateField(field, mockExistingFields);

      // Should not crash, field_name undefined is handled
      expect(result).toBeDefined();
    });
  });
});