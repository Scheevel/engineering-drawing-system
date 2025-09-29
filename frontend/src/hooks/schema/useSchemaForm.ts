/**
 * Schema Form Hook
 *
 * Centralized form state management for schema creation and editing forms.
 * Integrates React Hook Form with schema validation and provides optimized
 * performance with debounced validation and proper cleanup.
 */

import { useEffect, useCallback, useMemo } from 'react';
import { useForm, UseFormReturn, FieldValues, DefaultValues } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { ComponentSchema, ComponentSchemaCreate, ComponentSchemaUpdate } from '../../services/api.ts';
import { useCreateSchema, useUpdateSchema } from '../../services/schemaQueries.ts';
import { useSchemaValidation } from './useSchemaValidation.ts';

// Form data interfaces
export interface SchemaCreateFormData {
  name: string;
  description: string;
  project_id?: string;
  isGlobal: boolean;
  is_default: boolean;
}

export interface SchemaEditFormData {
  name: string;
  description: string;
}

export type SchemaFormMode = 'create' | 'edit';

export interface UseSchemaFormOptions<T extends FieldValues> {
  mode: SchemaFormMode;
  projectId?: string;
  schema?: ComponentSchema; // For edit mode
  defaultValues?: Partial<T>;
  autoReset?: boolean;
  validateOnChange?: boolean;
  debounceMs?: number;
  onSuccess?: (schema: ComponentSchema, formData: T) => void;
  onError?: (error: Error, formData: T) => void;
  onValidationChange?: (isValid: boolean, errors: Record<string, string>) => void;
}

export interface UseSchemaFormResult<T extends FieldValues> {
  // Form instance
  form: UseFormReturn<T>;

  // Form state
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  errors: Record<string, string>;
  formData: T;

  // Validation state
  isValidating: boolean;
  validationErrors: Record<string, string>;

  // Real-time field validation
  nameError: string | null;
  descriptionError: string | null;
  isCheckingUniqueness: boolean;

  // Actions
  handleSubmit: (data: T) => void;
  handleReset: (values?: Partial<T>) => void;
  handleCancel: () => void;
  validateField: (fieldName: keyof T, value: any) => Promise<string | null>;

  // Mutation state
  mutation: ReturnType<typeof useCreateSchema> | ReturnType<typeof useUpdateSchema>;

  // Form helpers
  getFieldProps: (fieldName: keyof T) => {
    error: boolean;
    helperText: string;
    onChange: (value: any) => void;
    value: any;
  };

  // Performance optimization
  optimizedWatch: (fieldNames?: (keyof T) | (keyof T)[]) => any;
}

export const useSchemaForm = <T extends FieldValues = SchemaCreateFormData>(
  options: UseSchemaFormOptions<T>
): UseSchemaFormResult<T> => {
  const {
    mode,
    projectId,
    schema,
    defaultValues,
    autoReset = true,
    validateOnChange = true,
    debounceMs = 300,
    onSuccess,
    onError,
    onValidationChange,
  } = options;

  // Schema validation hook
  const schemaValidation = useSchemaValidation({
    projectId,
    excludeSchemaId: mode === 'edit' ? schema?.id : undefined,
    debounceMs,
  });

  // Get appropriate validation schema
  const validationSchema = schemaValidation.getValidationSchema(mode);

  // Set up default values based on mode
  const formDefaultValues = useMemo(() => {
    const base = defaultValues || {};

    if (mode === 'create') {
      return {
        name: '',
        description: '',
        project_id: projectId || '',
        isGlobal: !projectId,
        is_default: false,
        ...base,
      } as DefaultValues<T>;
    } else {
      return {
        name: schema?.name || '',
        description: schema?.description || '',
        ...base,
      } as DefaultValues<T>;
    }
  }, [mode, defaultValues, projectId, schema]);

  // Form setup
  const form = useForm<T>({
    resolver: yupResolver(validationSchema),
    defaultValues: formDefaultValues,
    mode: validateOnChange ? 'onChange' : 'onSubmit',
  });

  const {
    control,
    handleSubmit: rhfHandleSubmit,
    watch,
    reset,
    formState: { errors, isValid, isDirty, isSubmitting },
    trigger,
    setError,
    clearErrors,
  } = form;

  // Watch form data for validation
  const formData = watch();
  const nameValue = watch('name' as keyof T);
  const descriptionValue = watch('description' as keyof T);

  // Create mutations based on mode
  const createMutation = useCreateSchema({
    onSuccess: (newSchema) => {
      if (autoReset) reset();
      onSuccess?.(newSchema, formData);
    },
    onError: (error: Error) => {
      onError?.(error, formData);
    },
  });

  const updateMutation = useUpdateSchema({
    onSuccess: (updatedSchema) => {
      if (autoReset) reset();
      onSuccess?.(updatedSchema, formData);
    },
    onError: (error: Error) => {
      onError?.(error, formData);
    },
  });

  const mutation = mode === 'create' ? createMutation : updateMutation;

  // Real-time validation state
  const nameError = useMemo(() => {
    if (errors.name) return errors.name.message || 'Invalid name';
    return schemaValidation.nameUniquenessError;
  }, [errors.name, schemaValidation.nameUniquenessError]);

  const descriptionError = useMemo(() => {
    return errors.description?.message || null;
  }, [errors.description]);

  // Validation change callback
  useEffect(() => {
    const validationErrors: Record<string, string> = {};

    Object.entries(errors).forEach(([key, error]) => {
      if (error?.message) {
        validationErrors[key] = error.message;
      }
    });

    if (nameError) validationErrors.name = nameError;
    if (descriptionError) validationErrors.description = descriptionError;

    onValidationChange?.(isValid && !nameError, validationErrors);
  }, [isValid, errors, nameError, descriptionError, onValidationChange]);

  // Real-time field validation
  const validateField = useCallback(async (fieldName: keyof T, value: any): Promise<string | null> => {
    if (fieldName === 'name') {
      return await schemaValidation.validateName(value);
    } else if (fieldName === 'description') {
      return schemaValidation.validateDescription(value);
    }

    // Trigger form validation for other fields
    await trigger(fieldName);
    const fieldError = errors[fieldName];
    return fieldError?.message || null;
  }, [schemaValidation, trigger, errors]);

  // Form submission
  const handleSubmit = useCallback((data: T) => {
    if (mode === 'create') {
      const createData = data as unknown as SchemaCreateFormData;
      const schemaData: ComponentSchemaCreate = {
        name: createData.name.trim(),
        description: createData.description?.trim() || undefined,
        project_id: createData.isGlobal ? undefined : createData.project_id,
        fields: [],
        is_default: createData.is_default,
      };

      createMutation.mutate(schemaData);
    } else {
      const editData = data as unknown as SchemaEditFormData;
      const updateData: ComponentSchemaUpdate = {
        name: editData.name.trim(),
        description: editData.description?.trim() || undefined,
      };

      if (!schema?.id) return;

      updateMutation.mutate({
        schemaId: schema.id,
        updates: updateData,
      });
    }
  }, [mode, createMutation, updateMutation, schema]);

  // Form reset
  const handleReset = useCallback((values?: Partial<T>) => {
    const resetValues = values || formDefaultValues;
    reset(resetValues as DefaultValues<T>);
    clearErrors();
  }, [reset, clearErrors, formDefaultValues]);

  // Form cancel (with unsaved changes check)
  const handleCancel = useCallback(() => {
    if (isDirty) {
      // Parent component should handle confirmation dialog
      return;
    }
    handleReset();
  }, [isDirty, handleReset]);

  // Field props helper for Material-UI integration
  const getFieldProps = useCallback((fieldName: keyof T) => {
    const fieldError = errors[fieldName];
    const isNameField = fieldName === 'name';
    const actualError = isNameField ? nameError : fieldError?.message;

    return {
      error: !!actualError,
      helperText: actualError || '',
      onChange: (value: any) => {
        form.setValue(fieldName, value);
        if (validateOnChange) {
          trigger(fieldName);
        }
      },
      value: watch(fieldName),
    };
  }, [errors, nameError, form, validateOnChange, trigger, watch]);

  // Optimized watch for performance
  const optimizedWatch = useCallback((fieldNames?: (keyof T) | (keyof T)[]) => {
    if (!fieldNames) return watch();
    if (Array.isArray(fieldNames)) {
      return watch(fieldNames);
    }
    return watch(fieldNames);
  }, [watch]);

  // Reset form when schema changes (for edit mode)
  useEffect(() => {
    if (mode === 'edit' && schema) {
      handleReset({
        name: schema.name,
        description: schema.description || '',
      } as Partial<T>);
    }
  }, [mode, schema, handleReset]);

  return {
    // Form instance
    form,

    // Form state
    isValid: isValid && !nameError,
    isDirty,
    isSubmitting: mutation.isLoading,
    errors: Object.fromEntries(
      Object.entries(errors).map(([key, error]) => [key, error?.message || ''])
    ),
    formData,

    // Validation state
    isValidating: schemaValidation.isCheckingUniqueness,
    validationErrors: {
      ...Object.fromEntries(
        Object.entries(errors).map(([key, error]) => [key, error?.message || ''])
      ),
      ...(nameError ? { name: nameError } : {}),
    },

    // Real-time field validation
    nameError,
    descriptionError,
    isCheckingUniqueness: schemaValidation.isCheckingUniqueness,

    // Actions
    handleSubmit: rhfHandleSubmit(handleSubmit),
    handleReset,
    handleCancel,
    validateField,

    // Mutation state
    mutation,

    // Form helpers
    getFieldProps,
    optimizedWatch,
  };
};