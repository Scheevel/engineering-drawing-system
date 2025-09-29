/**
 * Cross-Field Validation Utilities
 *
 * Provides utilities for validating fields based on values of other fields,
 * enabling complex business rules and dependencies in schema forms.
 */

import { ValidationRule } from '../../components/schema-management/FieldValidationBuilder';
import { SchemaFieldType } from '../../services/api';

export interface ComponentSchemaField {
  id: string;
  field_name: string;
  field_type: SchemaFieldType;
  field_config: Record<string, any>;
  help_text?: string;
  is_required: boolean;
  is_active: boolean;
  display_order: number;
}

export interface FieldValue {
  fieldId: string;
  fieldName: string;
  value: any;
  type: SchemaFieldType;
}

export interface DependencyCondition {
  type: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'empty' | 'not_empty' | 'in_range' | 'regex';
  value?: any;
  values?: any[];
  pattern?: string;
  min?: number;
  max?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: Record<string, any>;
}

export interface CrossFieldValidationContext {
  currentField: FieldValue;
  allFields: FieldValue[];
  schema: ComponentSchemaField[];
  rules: ValidationRule[];
}

/**
 * Evaluates a dependency condition against field values
 */
export function evaluateDependencyCondition(
  condition: DependencyCondition,
  sourceValue: any,
  targetValue: any,
  sourceType: SchemaFieldType
): boolean {
  // Handle empty values
  if (condition.type === 'empty') {
    return sourceValue === null || sourceValue === undefined || sourceValue === '';
  }

  if (condition.type === 'not_empty') {
    return sourceValue !== null && sourceValue !== undefined && sourceValue !== '';
  }

  // For other conditions, if source is empty, dependency fails
  if (sourceValue === null || sourceValue === undefined || sourceValue === '') {
    return false;
  }

  // Convert values based on field type for comparison
  const normalizedSource = normalizeValueForComparison(sourceValue, sourceType);
  const normalizedTarget = normalizeValueForComparison(condition.value, sourceType);

  switch (condition.type) {
    case 'equals':
      return normalizedSource === normalizedTarget;

    case 'not_equals':
      return normalizedSource !== normalizedTarget;

    case 'greater_than':
      if (sourceType === 'number' || sourceType === 'date') {
        return normalizedSource > normalizedTarget;
      }
      if (sourceType === 'text' || sourceType === 'textarea') {
        return String(normalizedSource).length > Number(normalizedTarget);
      }
      return false;

    case 'less_than':
      if (sourceType === 'number' || sourceType === 'date') {
        return normalizedSource < normalizedTarget;
      }
      if (sourceType === 'text' || sourceType === 'textarea') {
        return String(normalizedSource).length < Number(normalizedTarget);
      }
      return false;

    case 'contains':
      return String(normalizedSource).toLowerCase().includes(String(normalizedTarget).toLowerCase());

    case 'in_range':
      if (sourceType === 'number' && condition.min !== undefined && condition.max !== undefined) {
        return normalizedSource >= condition.min && normalizedSource <= condition.max;
      }
      return false;

    case 'regex':
      if (condition.pattern) {
        try {
          const regex = new RegExp(condition.pattern);
          return regex.test(String(normalizedSource));
        } catch (error) {
          console.warn('Invalid regex pattern in dependency condition:', condition.pattern);
          return false;
        }
      }
      return false;

    default:
      return false;
  }
}

/**
 * Normalizes values for comparison based on field type
 */
function normalizeValueForComparison(value: any, fieldType: SchemaFieldType): any {
  if (value === null || value === undefined) {
    return value;
  }

  switch (fieldType) {
    case 'number':
      return typeof value === 'number' ? value : parseFloat(String(value));

    case 'date':
      if (value instanceof Date) {
        return value.getTime();
      }
      return new Date(String(value)).getTime();

    case 'checkbox':
      return Boolean(value);

    case 'select':
      return String(value);

    case 'text':
    case 'textarea':
    default:
      return String(value);
  }
}

/**
 * Validates a field value against dependency rules
 */
export function validateFieldDependencies(
  context: CrossFieldValidationContext
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Find dependency rules for the current field
  const dependencyRules = context.rules.filter(
    rule => rule.type === 'dependency' && rule.isActive
  );

  for (const rule of dependencyRules) {
    const { config } = rule;
    const sourceFieldId = config.sourceField;

    if (!sourceFieldId) {
      warnings.push(`Dependency rule "${rule.name}" is missing source field configuration`);
      continue;
    }

    // Find the source field value
    const sourceField = context.allFields.find(field => field.fieldId === sourceFieldId);
    if (!sourceField) {
      warnings.push(`Source field not found for dependency rule "${rule.name}"`);
      continue;
    }

    // Evaluate the dependency condition
    const condition: DependencyCondition = {
      type: config.condition || 'equals',
      value: config.value,
      pattern: config.pattern,
      min: config.min,
      max: config.max,
    };

    const conditionMet = evaluateDependencyCondition(
      condition,
      sourceField.value,
      context.currentField.value,
      sourceField.type
    );

    // Apply the dependency action
    const action = config.action || 'required';

    switch (action) {
      case 'required':
        if (conditionMet && (context.currentField.value === null ||
                           context.currentField.value === undefined ||
                           context.currentField.value === '')) {
          errors.push(rule.errorMessage || `This field is required when ${sourceField.fieldName} ${condition.type} ${condition.value}`);
        }
        break;

      case 'hidden':
        if (conditionMet) {
          warnings.push(`Field should be hidden based on dependency rule "${rule.name}"`);
        }
        break;

      case 'disabled':
        if (conditionMet) {
          warnings.push(`Field should be disabled based on dependency rule "${rule.name}"`);
        }
        break;

      case 'validate_format':
        if (conditionMet && config.format) {
          try {
            const formatRegex = new RegExp(config.format);
            if (!formatRegex.test(String(context.currentField.value))) {
              errors.push(rule.errorMessage || `Field format is invalid based on dependency rule "${rule.name}"`);
            }
          } catch (error) {
            warnings.push(`Invalid format pattern in dependency rule "${rule.name}"`);
          }
        }
        break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      rulesEvaluated: dependencyRules.length,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Validates all field dependencies in a form
 */
export function validateAllFieldDependencies(
  allFields: FieldValue[],
  schema: ComponentSchemaField[],
  rules: ValidationRule[]
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {};

  for (const field of allFields) {
    const context: CrossFieldValidationContext = {
      currentField: field,
      allFields,
      schema,
      rules,
    };

    results[field.fieldId] = validateFieldDependencies(context);
  }

  return results;
}

/**
 * Determines if a field should be visible based on dependency rules
 */
export function isFieldVisible(
  fieldId: string,
  allFields: FieldValue[],
  rules: ValidationRule[]
): boolean {
  const visibilityRules = rules.filter(
    rule => rule.type === 'dependency' &&
           rule.isActive &&
           rule.config.action === 'hidden'
  );

  for (const rule of visibilityRules) {
    const sourceFieldId = rule.config.sourceField;
    const sourceField = allFields.find(field => field.fieldId === sourceFieldId);

    if (!sourceField) continue;

    const condition: DependencyCondition = {
      type: rule.config.condition || 'equals',
      value: rule.config.value,
    };

    const shouldHide = evaluateDependencyCondition(
      condition,
      sourceField.value,
      null,
      sourceField.type
    );

    if (shouldHide) {
      return false;
    }
  }

  return true;
}

/**
 * Determines if a field should be required based on dependency rules
 */
export function isFieldRequired(
  fieldId: string,
  baseRequired: boolean,
  allFields: FieldValue[],
  rules: ValidationRule[]
): boolean {
  // Start with base requirement
  let isRequired = baseRequired;

  const requiredRules = rules.filter(
    rule => rule.type === 'dependency' &&
           rule.isActive &&
           rule.config.action === 'required'
  );

  for (const rule of requiredRules) {
    const sourceFieldId = rule.config.sourceField;
    const sourceField = allFields.find(field => field.fieldId === sourceFieldId);

    if (!sourceField) continue;

    const condition: DependencyCondition = {
      type: rule.config.condition || 'equals',
      value: rule.config.value,
    };

    const conditionMet = evaluateDependencyCondition(
      condition,
      sourceField.value,
      null,
      sourceField.type
    );

    if (conditionMet) {
      isRequired = true;
    }
  }

  return isRequired;
}

/**
 * Gets auto-calculated value for a field based on dependency rules
 */
export function getCalculatedFieldValue(
  fieldId: string,
  allFields: FieldValue[],
  rules: ValidationRule[]
): any | null {
  const calculationRules = rules.filter(
    rule => rule.type === 'dependency' &&
           rule.isActive &&
           rule.config.action === 'calculate'
  );

  for (const rule of calculationRules) {
    const sourceFieldId = rule.config.sourceField;
    const sourceField = allFields.find(field => field.fieldId === sourceFieldId);

    if (!sourceField) continue;

    const condition: DependencyCondition = {
      type: rule.config.condition || 'equals',
      value: rule.config.value,
    };

    const shouldCalculate = evaluateDependencyCondition(
      condition,
      sourceField.value,
      null,
      sourceField.type
    );

    if (shouldCalculate && rule.config.calculation) {
      try {
        // Simple calculation support
        const calculation = rule.config.calculation;

        if (calculation.type === 'copy') {
          return sourceField.value;
        }

        if (calculation.type === 'multiply' && typeof sourceField.value === 'number') {
          return sourceField.value * (calculation.factor || 1);
        }

        if (calculation.type === 'format' && calculation.template) {
          return calculation.template.replace('${value}', String(sourceField.value));
        }

        // Add more calculation types as needed

      } catch (error) {
        console.warn('Error calculating field value:', error);
      }
    }
  }

  return null;
}

/**
 * Engineering-specific validation helpers
 */
export const engineeringValidation = {
  /**
   * Validates dimension consistency (e.g., length + width < diagonal)
   */
  validateDimensionConsistency(
    length: number,
    width: number,
    diagonal?: number
  ): ValidationResult {
    const errors: string[] = [];

    if (diagonal && Math.sqrt(length * length + width * width) > diagonal + 0.1) {
      errors.push('Diagonal dimension is inconsistent with length and width');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  },

  /**
   * Validates load capacity vs member size
   */
  validateLoadCapacity(
    memberSize: string,
    appliedLoad: number,
    allowableLoad?: number
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (allowableLoad && appliedLoad > allowableLoad) {
      errors.push(`Applied load (${appliedLoad}) exceeds allowable load (${allowableLoad})`);
    }

    if (allowableLoad && appliedLoad > allowableLoad * 0.8) {
      warnings.push('Applied load is approaching maximum capacity');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },

  /**
   * Validates material grade compatibility
   */
  validateMaterialCompatibility(
    primaryMaterial: string,
    secondaryMaterial: string
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Example compatibility rules for common steel grades
    const incompatiblePairs = [
      ['A36', 'A992'], // Example: A36 and A992 may have welding concerns
    ];

    for (const [mat1, mat2] of incompatiblePairs) {
      if ((primaryMaterial === mat1 && secondaryMaterial === mat2) ||
          (primaryMaterial === mat2 && secondaryMaterial === mat1)) {
        warnings.push(`Material combination ${primaryMaterial} and ${secondaryMaterial} may require special considerations`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },
};

export default {
  evaluateDependencyCondition,
  validateFieldDependencies,
  validateAllFieldDependencies,
  isFieldVisible,
  isFieldRequired,
  getCalculatedFieldValue,
  engineeringValidation,
};