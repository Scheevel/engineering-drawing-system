/**
 * Field Validation Hook
 *
 * Provides comprehensive validation logic for schema field operations including
 * field name uniqueness, type constraints, configuration validation, and business rules.
 */

import { useMemo } from 'react';
import { ComponentSchemaField, SchemaFieldType } from '../../services/api';
import { FIELD_TYPE_LABELS, DEFAULT_FIELD_CONFIG } from '../../types/schema';

export interface FieldValidationError {
  field: string;
  message: string;
  code: string;
}

export interface FieldValidationOptions {
  excludeFieldId?: string; // Exclude this field ID from duplicate checks (for editing)
  requireFieldConfig?: boolean; // Require valid field configuration
  strictValidation?: boolean; // Enable stricter validation rules
}

export interface FieldValidationResult {
  isValid: boolean;
  errors: FieldValidationError[];
  warnings: string[];
}

export interface UseFieldValidationReturn {
  validateFieldName: (
    fieldName: string,
    existingFields: ComponentSchemaField[],
    options?: FieldValidationOptions
  ) => FieldValidationResult;
  validateFieldType: (
    fieldType: SchemaFieldType,
    fieldConfig?: Record<string, any>
  ) => FieldValidationResult;
  validateFieldConfig: (
    fieldType: SchemaFieldType,
    fieldConfig: Record<string, any>
  ) => FieldValidationResult;
  validateField: (
    field: Partial<ComponentSchemaField>,
    existingFields: ComponentSchemaField[],
    options?: FieldValidationOptions
  ) => FieldValidationResult;
  validateFieldDeletion: (
    field: ComponentSchemaField,
    usageInfo: {
      componentCount: number;
      hasRequiredUsage: boolean;
      canSafelyDelete: boolean;
    }
  ) => FieldValidationResult;
}

/**
 * Custom hook for field validation operations
 */
export const useFieldValidation = (): UseFieldValidationReturn => {
  /**
   * Validate field name for uniqueness and format
   */
  const validateFieldName = useMemo(
    () =>
      (
        fieldName: string,
        existingFields: ComponentSchemaField[],
        options: FieldValidationOptions = {}
      ): FieldValidationResult => {
        const errors: FieldValidationError[] = [];
        const warnings: string[] = [];

        // Basic format validation
        if (!fieldName || !fieldName.trim()) {
          errors.push({
            field: 'field_name',
            message: 'Field name is required',
            code: 'FIELD_NAME_REQUIRED',
          });
          return { isValid: false, errors, warnings };
        }

        const trimmedName = fieldName.trim();

        // Length validation
        if (trimmedName.length < 2) {
          errors.push({
            field: 'field_name',
            message: 'Field name must be at least 2 characters long',
            code: 'FIELD_NAME_TOO_SHORT',
          });
        }

        if (trimmedName.length > 50) {
          errors.push({
            field: 'field_name',
            message: 'Field name must be less than 50 characters',
            code: 'FIELD_NAME_TOO_LONG',
          });
        }

        // Format validation
        const namePattern = /^[a-zA-Z][a-zA-Z0-9\s\-_]*$/;
        if (!namePattern.test(trimmedName)) {
          errors.push({
            field: 'field_name',
            message:
              'Field name must start with a letter and contain only letters, numbers, spaces, hyphens, and underscores',
            code: 'FIELD_NAME_INVALID_FORMAT',
          });
        }

        // Uniqueness validation
        const normalizedName = trimmedName.toLowerCase();
        const duplicateField = existingFields.find(
          (field) =>
            field.field_name.toLowerCase() === normalizedName &&
            field.id !== options.excludeFieldId
        );

        if (duplicateField) {
          errors.push({
            field: 'field_name',
            message: 'A field with this name already exists',
            code: 'FIELD_NAME_DUPLICATE',
          });
        }

        // Warnings for potentially confusing names
        if (trimmedName.includes('  ')) {
          warnings.push('Field name contains multiple consecutive spaces');
        }

        if (trimmedName.toLowerCase().includes('field')) {
          warnings.push('Consider avoiding the word "field" in field names');
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      },
    []
  );

  /**
   * Validate field type and its compatibility
   */
  const validateFieldType = useMemo(
    () =>
      (
        fieldType: SchemaFieldType,
        fieldConfig?: Record<string, any>
      ): FieldValidationResult => {
        const errors: FieldValidationError[] = [];
        const warnings: string[] = [];

        // Check if field type is supported
        const supportedTypes: SchemaFieldType[] = [
          'text',
          'number',
          'select',
          'checkbox',
          'textarea',
          'date',
        ];

        if (!supportedTypes.includes(fieldType)) {
          errors.push({
            field: 'field_type',
            message: `Unsupported field type: ${fieldType}`,
            code: 'FIELD_TYPE_UNSUPPORTED',
          });
          return { isValid: false, errors, warnings };
        }

        // Validate field configuration compatibility
        if (fieldConfig) {
          const configValidation = validateFieldConfig(fieldType, fieldConfig);
          errors.push(...configValidation.errors);
          warnings.push(...configValidation.warnings);
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      },
    []
  );

  /**
   * Validate field configuration for specific field type
   */
  const validateFieldConfig = useMemo(
    () =>
      (
        fieldType: SchemaFieldType,
        fieldConfig: Record<string, any>
      ): FieldValidationResult => {
        const errors: FieldValidationError[] = [];
        const warnings: string[] = [];

        try {
          switch (fieldType) {
            case 'text':
              if (fieldConfig.maxLength !== undefined) {
                if (
                  typeof fieldConfig.maxLength !== 'number' ||
                  fieldConfig.maxLength < 1
                ) {
                  errors.push({
                    field: 'field_config.maxLength',
                    message: 'Max length must be a positive number',
                    code: 'INVALID_MAX_LENGTH',
                  });
                }
                if (fieldConfig.maxLength > 10000) {
                  warnings.push('Very large max length may impact performance');
                }
              }
              break;

            case 'number':
              if (fieldConfig.min !== undefined && fieldConfig.max !== undefined) {
                if (fieldConfig.min >= fieldConfig.max) {
                  errors.push({
                    field: 'field_config',
                    message: 'Minimum value must be less than maximum value',
                    code: 'INVALID_NUMBER_RANGE',
                  });
                }
              }
              if (fieldConfig.precision !== undefined) {
                if (
                  typeof fieldConfig.precision !== 'number' ||
                  fieldConfig.precision < 0 ||
                  fieldConfig.precision > 10
                ) {
                  errors.push({
                    field: 'field_config.precision',
                    message: 'Precision must be between 0 and 10',
                    code: 'INVALID_PRECISION',
                  });
                }
              }
              break;

            case 'select':
              if (!fieldConfig.options || !Array.isArray(fieldConfig.options)) {
                errors.push({
                  field: 'field_config.options',
                  message: 'Select field must have options array',
                  code: 'MISSING_SELECT_OPTIONS',
                });
              } else {
                if (fieldConfig.options.length === 0) {
                  errors.push({
                    field: 'field_config.options',
                    message: 'Select field must have at least one option',
                    code: 'EMPTY_SELECT_OPTIONS',
                  });
                }
                if (fieldConfig.options.length > 100) {
                  warnings.push('Large number of options may impact user experience');
                }
              }
              break;

            case 'textarea':
              if (fieldConfig.rows !== undefined) {
                if (
                  typeof fieldConfig.rows !== 'number' ||
                  fieldConfig.rows < 2 ||
                  fieldConfig.rows > 20
                ) {
                  errors.push({
                    field: 'field_config.rows',
                    message: 'Textarea rows must be between 2 and 20',
                    code: 'INVALID_TEXTAREA_ROWS',
                  });
                }
              }
              break;

            case 'date':
              if (fieldConfig.minDate && fieldConfig.maxDate) {
                try {
                  const minDate = new Date(fieldConfig.minDate);
                  const maxDate = new Date(fieldConfig.maxDate);
                  if (minDate >= maxDate) {
                    errors.push({
                      field: 'field_config',
                      message: 'Minimum date must be before maximum date',
                      code: 'INVALID_DATE_RANGE',
                    });
                  }
                } catch (error) {
                  errors.push({
                    field: 'field_config',
                    message: 'Invalid date format in configuration',
                    code: 'INVALID_DATE_FORMAT',
                  });
                }
              }
              break;
          }
        } catch (error) {
          errors.push({
            field: 'field_config',
            message: 'Invalid field configuration format',
            code: 'INVALID_CONFIG_FORMAT',
          });
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      },
    []
  );

  /**
   * Validate complete field object
   */
  const validateField = useMemo(
    () =>
      (
        field: Partial<ComponentSchemaField>,
        existingFields: ComponentSchemaField[],
        options: FieldValidationOptions = {}
      ): FieldValidationResult => {
        const allErrors: FieldValidationError[] = [];
        const allWarnings: string[] = [];

        // Validate field name
        if (field.field_name !== undefined) {
          const nameValidation = validateFieldName(
            field.field_name,
            existingFields,
            options
          );
          allErrors.push(...nameValidation.errors);
          allWarnings.push(...nameValidation.warnings);
        }

        // Validate field type and config
        if (field.field_type) {
          const typeValidation = validateFieldType(field.field_type, field.field_config);
          allErrors.push(...typeValidation.errors);
          allWarnings.push(...typeValidation.warnings);
        }

        // Validate help text
        if (field.help_text !== undefined && field.help_text.length > 200) {
          allErrors.push({
            field: 'help_text',
            message: 'Help text must be less than 200 characters',
            code: 'HELP_TEXT_TOO_LONG',
          });
        }

        // Business rule validations
        if (options.strictValidation) {
          // In strict mode, check for additional business rules
          if (field.is_required && !field.field_name?.trim()) {
            allErrors.push({
              field: 'field_name',
              message: 'Required fields must have a name',
              code: 'REQUIRED_FIELD_NEEDS_NAME',
            });
          }
        }

        return {
          isValid: allErrors.length === 0,
          errors: allErrors,
          warnings: allWarnings,
        };
      },
    [validateFieldName, validateFieldType]
  );

  /**
   * Validate field deletion constraints
   */
  const validateFieldDeletion = useMemo(
    () =>
      (
        field: ComponentSchemaField,
        usageInfo: {
          componentCount: number;
          hasRequiredUsage: boolean;
          canSafelyDelete: boolean;
        }
      ): FieldValidationResult => {
        const errors: FieldValidationError[] = [];
        const warnings: string[] = [];

        // Cannot hard delete required fields in use
        if (usageInfo.hasRequiredUsage) {
          errors.push({
            field: 'deletion',
            message: 'Cannot permanently delete field required by existing components',
            code: 'FIELD_REQUIRED_BY_COMPONENTS',
          });
        }

        // Warn about data loss
        if (usageInfo.componentCount > 0) {
          warnings.push(
            `Deleting this field will affect ${usageInfo.componentCount} component${
              usageInfo.componentCount > 1 ? 's' : ''
            }`
          );
        }

        // Special validation for required fields
        if (field.is_required && usageInfo.componentCount > 0) {
          warnings.push('Deleting a required field may cause validation issues');
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      },
    []
  );

  return {
    validateFieldName,
    validateFieldType,
    validateFieldConfig,
    validateField,
    validateFieldDeletion,
  };
};

export default useFieldValidation;