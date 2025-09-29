/**
 * Field Dependencies Hook
 *
 * Provides React hook for managing field dependencies, conditional visibility,
 * dynamic requirements, and auto-calculated values in schema forms.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ValidationRule,
  FieldValue,
  ComponentSchemaField,
  validateFieldDependencies,
  validateAllFieldDependencies,
  isFieldVisible,
  isFieldRequired,
  getCalculatedFieldValue,
  DependencyCondition,
  ValidationResult,
} from '../../utils/validation/crossFieldValidation';
import { SchemaFieldType } from '../../services/api';

export interface FieldDependencyState {
  isVisible: boolean;
  isRequired: boolean;
  isDisabled: boolean;
  calculatedValue?: any;
  validationResult: ValidationResult;
  dependentFields: string[];
  affectedByFields: string[];
}

export interface DependencyConfiguration {
  fieldId: string;
  rules: ValidationRule[];
  autoCalculate: boolean;
  refreshOnChange: string[];
}

export interface UseFieldDependenciesOptions {
  schema: ComponentSchemaField[];
  rules: ValidationRule[];
  debounceMs?: number;
  enableAutoCalculation?: boolean;
  onFieldVisibilityChange?: (fieldId: string, isVisible: boolean) => void;
  onFieldRequiredChange?: (fieldId: string, isRequired: boolean) => void;
  onCalculatedValueChange?: (fieldId: string, value: any) => void;
}

export interface UseFieldDependenciesReturn {
  // Field state management
  getFieldState: (fieldId: string) => FieldDependencyState;
  updateFieldValue: (fieldId: string, value: any) => void;
  updateMultipleFields: (updates: Record<string, any>) => void;

  // Dependency queries
  getVisibleFields: () => string[];
  getRequiredFields: () => string[];
  getDependentFields: (fieldId: string) => string[];
  getFieldsAffecting: (fieldId: string) => string[];

  // Validation
  validateField: (fieldId: string) => ValidationResult;
  validateAllFields: () => Record<string, ValidationResult>;
  hasValidationErrors: () => boolean;

  // State
  fieldValues: Record<string, any>;
  dependencyStates: Record<string, FieldDependencyState>;
  isProcessing: boolean;

  // Actions
  refreshDependencies: () => void;
  resetField: (fieldId: string) => void;
  resetAllFields: () => void;
}

/**
 * Hook for managing field dependencies and conditional logic
 */
export function useFieldDependencies(
  initialValues: Record<string, any> = {},
  options: UseFieldDependenciesOptions
): UseFieldDependenciesReturn {
  const {
    schema,
    rules,
    debounceMs = 300,
    enableAutoCalculation = true,
    onFieldVisibilityChange,
    onFieldRequiredChange,
    onCalculatedValueChange,
  } = options;

  const [fieldValues, setFieldValues] = useState<Record<string, any>>(initialValues);
  const [dependencyStates, setDependencyStates] = useState<Record<string, FieldDependencyState>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  // Create field value objects for validation
  const fieldValueObjects = useMemo<FieldValue[]>(() => {
    return schema.map(field => ({
      fieldId: field.id,
      fieldName: field.field_name,
      value: fieldValues[field.id],
      type: field.field_type,
    }));
  }, [schema, fieldValues]);

  // Build dependency graph
  const dependencyGraph = useMemo(() => {
    const graph: Record<string, { dependents: string[]; affects: string[] }> = {};

    schema.forEach(field => {
      graph[field.id] = { dependents: [], affects: [] };
    });

    rules.forEach(rule => {
      if (rule.type === 'dependency' && rule.isActive) {
        const sourceFieldId = rule.config.sourceField;
        const targetFields = rule.config.targetFields || schema.map(f => f.id);

        targetFields.forEach((targetFieldId: string) => {
          if (sourceFieldId && graph[sourceFieldId] && graph[targetFieldId]) {
            graph[sourceFieldId].affects.push(targetFieldId);
            graph[targetFieldId].dependents.push(sourceFieldId);
          }
        });
      }
    });

    return graph;
  }, [schema, rules]);

  // Calculate field state based on dependencies
  const calculateFieldState = useCallback((fieldId: string): FieldDependencyState => {
    const field = schema.find(f => f.id === fieldId);
    if (!field) {
      return {
        isVisible: false,
        isRequired: false,
        isDisabled: false,
        validationResult: { isValid: false, errors: ['Field not found'], warnings: [] },
        dependentFields: [],
        affectedByFields: [],
      };
    }

    const currentFieldValue = fieldValueObjects.find(fv => fv.fieldId === fieldId);
    if (!currentFieldValue) {
      return {
        isVisible: true,
        isRequired: field.is_required,
        isDisabled: false,
        validationResult: { isValid: true, errors: [], warnings: [] },
        dependentFields: dependencyGraph[fieldId]?.dependents || [],
        affectedByFields: dependencyGraph[fieldId]?.affects || [],
      };
    }

    // Calculate visibility
    const visible = isFieldVisible(fieldId, fieldValueObjects, rules);

    // Calculate required status
    const required = isFieldRequired(fieldId, field.is_required, fieldValueObjects, rules);

    // Calculate auto-calculated value
    let calculatedValue: any = undefined;
    if (enableAutoCalculation) {
      calculatedValue = getCalculatedFieldValue(fieldId, fieldValueObjects, rules);
    }

    // Validate field with dependencies
    const validationResult = validateFieldDependencies({
      currentField: currentFieldValue,
      allFields: fieldValueObjects,
      schema,
      rules,
    });

    // Check if field should be disabled based on dependency rules
    const disableRules = rules.filter(
      rule => rule.type === 'dependency' &&
               rule.isActive &&
               rule.config.action === 'disabled' &&
               rule.config.targetFields?.includes(fieldId)
    );

    let isDisabled = false;
    for (const rule of disableRules) {
      const sourceField = fieldValueObjects.find(fv => fv.fieldId === rule.config.sourceField);
      if (sourceField) {
        const condition: DependencyCondition = {
          type: rule.config.condition || 'equals',
          value: rule.config.value,
        };

        // Simple condition evaluation - could be enhanced with the full evaluateDependencyCondition
        if (condition.type === 'equals' && sourceField.value === condition.value) {
          isDisabled = true;
          break;
        }
      }
    }

    return {
      isVisible: visible,
      isRequired: required,
      isDisabled,
      calculatedValue,
      validationResult,
      dependentFields: dependencyGraph[fieldId]?.dependents || [],
      affectedByFields: dependencyGraph[fieldId]?.affects || [],
    };
  }, [schema, fieldValueObjects, rules, dependencyGraph, enableAutoCalculation]);

  // Recalculate all dependency states
  const recalculateDependencies = useCallback(() => {
    setIsProcessing(true);

    const newStates: Record<string, FieldDependencyState> = {};
    const previousStates = dependencyStates;

    schema.forEach(field => {
      const newState = calculateFieldState(field.id);
      newStates[field.id] = newState;

      // Check for state changes and trigger callbacks
      const previousState = previousStates[field.id];

      if (previousState) {
        // Visibility change
        if (previousState.isVisible !== newState.isVisible && onFieldVisibilityChange) {
          onFieldVisibilityChange(field.id, newState.isVisible);
        }

        // Required status change
        if (previousState.isRequired !== newState.isRequired && onFieldRequiredChange) {
          onFieldRequiredChange(field.id, newState.isRequired);
        }

        // Calculated value change
        if (previousState.calculatedValue !== newState.calculatedValue &&
            newState.calculatedValue !== undefined &&
            onCalculatedValueChange) {
          onCalculatedValueChange(field.id, newState.calculatedValue);
        }
      }
    });

    setDependencyStates(newStates);
    setIsProcessing(false);
  }, [schema, calculateFieldState, dependencyStates, onFieldVisibilityChange, onFieldRequiredChange, onCalculatedValueChange]);

  // Debounced dependency recalculation
  useEffect(() => {
    const timer = setTimeout(() => {
      recalculateDependencies();
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [fieldValues, lastUpdateTime, debounceMs, recalculateDependencies]);

  // Update field value and trigger dependency recalculation
  const updateFieldValue = useCallback((fieldId: string, value: any) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldId]: value,
    }));
    setLastUpdateTime(Date.now());
  }, []);

  // Update multiple field values at once
  const updateMultipleFields = useCallback((updates: Record<string, any>) => {
    setFieldValues(prev => ({
      ...prev,
      ...updates,
    }));
    setLastUpdateTime(Date.now());
  }, []);

  // Get current field state
  const getFieldState = useCallback((fieldId: string): FieldDependencyState => {
    return dependencyStates[fieldId] || {
      isVisible: true,
      isRequired: false,
      isDisabled: false,
      validationResult: { isValid: true, errors: [], warnings: [] },
      dependentFields: [],
      affectedByFields: [],
    };
  }, [dependencyStates]);

  // Get visible fields
  const getVisibleFields = useCallback((): string[] => {
    return Object.entries(dependencyStates)
      .filter(([_, state]) => state.isVisible)
      .map(([fieldId]) => fieldId);
  }, [dependencyStates]);

  // Get required fields
  const getRequiredFields = useCallback((): string[] => {
    return Object.entries(dependencyStates)
      .filter(([_, state]) => state.isRequired && state.isVisible)
      .map(([fieldId]) => fieldId);
  }, [dependencyStates]);

  // Get fields that depend on a specific field
  const getDependentFields = useCallback((fieldId: string): string[] => {
    return dependencyGraph[fieldId]?.affects || [];
  }, [dependencyGraph]);

  // Get fields that affect a specific field
  const getFieldsAffecting = useCallback((fieldId: string): string[] => {
    return dependencyGraph[fieldId]?.dependents || [];
  }, [dependencyGraph]);

  // Validate a specific field
  const validateField = useCallback((fieldId: string): ValidationResult => {
    const fieldState = getFieldState(fieldId);
    return fieldState.validationResult;
  }, [getFieldState]);

  // Validate all fields
  const validateAllFields = useCallback((): Record<string, ValidationResult> => {
    return validateAllFieldDependencies(fieldValueObjects, schema, rules);
  }, [fieldValueObjects, schema, rules]);

  // Check if there are any validation errors
  const hasValidationErrors = useCallback((): boolean => {
    return Object.values(dependencyStates).some(state => !state.validationResult.isValid);
  }, [dependencyStates]);

  // Refresh dependencies manually
  const refreshDependencies = useCallback(() => {
    setLastUpdateTime(Date.now());
  }, []);

  // Reset a specific field
  const resetField = useCallback((fieldId: string) => {
    const field = schema.find(f => f.id === fieldId);
    if (field) {
      const defaultValue = field.field_config?.defaultValue || '';
      updateFieldValue(fieldId, defaultValue);
    }
  }, [schema, updateFieldValue]);

  // Reset all fields
  const resetAllFields = useCallback(() => {
    const defaultValues: Record<string, any> = {};
    schema.forEach(field => {
      defaultValues[field.id] = field.field_config?.defaultValue || '';
    });
    setFieldValues(defaultValues);
    setLastUpdateTime(Date.now());
  }, [schema]);

  // Initialize dependency states on mount
  useEffect(() => {
    recalculateDependencies();
  }, []); // Only run on mount

  return {
    // Field state management
    getFieldState,
    updateFieldValue,
    updateMultipleFields,

    // Dependency queries
    getVisibleFields,
    getRequiredFields,
    getDependentFields,
    getFieldsAffecting,

    // Validation
    validateField,
    validateAllFields,
    hasValidationErrors,

    // State
    fieldValues,
    dependencyStates,
    isProcessing,

    // Actions
    refreshDependencies,
    resetField,
    resetAllFields,
  };
}

/**
 * Hook for managing field dependencies in a form context
 * Simplified version for basic use cases
 */
export function useSimpleFieldDependencies(
  schema: ComponentSchemaField[],
  rules: ValidationRule[],
  initialValues: Record<string, any> = {}
) {
  const dependencies = useFieldDependencies(initialValues, {
    schema,
    rules,
    enableAutoCalculation: true,
  });

  // Simplified interface for basic dependency management
  return {
    values: dependencies.fieldValues,
    setValue: dependencies.updateFieldValue,
    setValues: dependencies.updateMultipleFields,

    isVisible: (fieldId: string) => dependencies.getFieldState(fieldId).isVisible,
    isRequired: (fieldId: string) => dependencies.getFieldState(fieldId).isRequired,
    isDisabled: (fieldId: string) => dependencies.getFieldState(fieldId).isDisabled,

    validate: dependencies.validateAllFields,
    hasErrors: dependencies.hasValidationErrors,

    reset: dependencies.resetAllFields,
  };
}

/**
 * Engineering-specific dependency hooks
 */
export const useEngineeringDependencies = {
  /**
   * Hook for managing load calculation dependencies
   */
  useLoadCalculations: (
    schema: ComponentSchemaField[],
    rules: ValidationRule[],
    initialValues: Record<string, any> = {}
  ) => {
    const dependencies = useFieldDependencies(initialValues, {
      schema,
      rules,
      enableAutoCalculation: true,
      onCalculatedValueChange: (fieldId, value) => {
        console.log(`Load calculation updated for ${fieldId}:`, value);
      },
    });

    const calculateTotalLoad = useCallback(() => {
      const deadLoad = dependencies.fieldValues.deadLoad || 0;
      const liveLoad = dependencies.fieldValues.liveLoad || 0;
      const windLoad = dependencies.fieldValues.windLoad || 0;

      return deadLoad + liveLoad + windLoad;
    }, [dependencies.fieldValues]);

    const calculateLoadFactor = useCallback((loadType: string) => {
      const factorMap = {
        'deadLoad': 1.2,
        'liveLoad': 1.6,
        'windLoad': 1.0,
      };
      return factorMap[loadType as keyof typeof factorMap] || 1.0;
    }, []);

    return {
      ...dependencies,
      calculateTotalLoad,
      calculateLoadFactor,
      totalLoad: calculateTotalLoad(),
    };
  },

  /**
   * Hook for managing dimensional consistency
   */
  useDimensionalDependencies: (
    schema: ComponentSchemaField[],
    rules: ValidationRule[],
    initialValues: Record<string, any> = {}
  ) => {
    const dependencies = useFieldDependencies(initialValues, {
      schema,
      rules,
      enableAutoCalculation: true,
    });

    const checkDimensionalConsistency = useCallback(() => {
      const length = dependencies.fieldValues.length || 0;
      const width = dependencies.fieldValues.width || 0;
      const diagonal = dependencies.fieldValues.diagonal || 0;

      if (length && width && diagonal) {
        const calculatedDiagonal = Math.sqrt(length * length + width * width);
        const tolerance = 0.1;

        return Math.abs(diagonal - calculatedDiagonal) <= tolerance;
      }

      return true;
    }, [dependencies.fieldValues]);

    return {
      ...dependencies,
      checkDimensionalConsistency,
      isDimensionallyConsistent: checkDimensionalConsistency(),
    };
  },
};

export default useFieldDependencies;