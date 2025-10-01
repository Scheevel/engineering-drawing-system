/**
 * Schema Validation Hook
 *
 * Centralized validation logic for schema forms across the application.
 * Provides reusable validation schemas, real-time validation functions,
 * and uniqueness checking for schema names.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as yup from 'yup';
import { useProjectSchemas } from '../../services/schemaQueries.ts';
import { ComponentSchema } from '../../services/api.ts';

/**
 * Utility function to detect and list invalid characters in a schema name
 * Returns a specific error message listing the invalid characters found
 */
export const getInvalidCharactersError = (name: string): string | null => {
  if (!name) return null;

  const invalidChars = new Set<string>();
  const validPattern = /^[a-zA-Z0-9_-]$/;

  // Check each character
  for (const char of name) {
    if (!validPattern.test(char)) {
      invalidChars.add(char === ' ' ? 'space' : char);
    }
  }

  if (invalidChars.size > 0) {
    const charList = Array.from(invalidChars)
      .map(c => c === 'space' ? '(space)' : `"${c}"`)
      .join(', ');
    return `Invalid characters: ${charList}. Allowed: letters, numbers, hyphens (-), underscores (_)`;
  }

  return null;
};

// Base validation schema for schema name field
export const schemaNameValidationSchema = yup
  .string()
  .required('Schema name is required')
  .min(3, 'Minimum 3 characters required')
  .max(100, 'Schema name must be less than 100 characters')
  .test('no-leading-trailing-spaces', 'Schema name cannot have leading or trailing spaces', (value) => {
    if (!value) return true;
    return value === value.trim();
  })
  .matches(
    /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/,
    {
      message: 'Schema name must start with a letter or number and can only contain letters, numbers, hyphens (-), and underscores (_)',
      excludeEmptyString: true,
    }
  )
  .test('no-spaces', 'Schema name cannot contain spaces. Use hyphens (-) or underscores (_) instead', (value) => {
    if (!value) return true;
    return !value.includes(' ');
  });

// Base validation schema for description field
export const schemaDescriptionValidationSchema = yup
  .string()
  .max(500, 'Description must be less than 500 characters');

// Schema creation validation schema
export const schemaCreateValidationSchema = yup.object({
  name: schemaNameValidationSchema,
  description: schemaDescriptionValidationSchema,
  project_id: yup
    .string()
    .when('isGlobal', {
      is: false,
      then: (schema) => schema.required('Project selection is required for project-specific schemas'),
      otherwise: (schema) => schema.notRequired(),
    }),
  isGlobal: yup.boolean(),
  is_default: yup.boolean(),
});

// Schema edit validation schema
export const schemaEditValidationSchema = yup.object({
  name: schemaNameValidationSchema,
  description: schemaDescriptionValidationSchema,
});

export interface SchemaValidationOptions {
  projectId?: string;
  excludeSchemaId?: string; // For edit mode - exclude current schema from uniqueness check
  includeGlobal?: boolean;
  debounceMs?: number;
}

export interface SchemaValidationHookResult {
  // Validation schemas
  createValidationSchema: yup.ObjectSchema<any>;
  editValidationSchema: yup.ObjectSchema<any>;
  nameValidationSchema: yup.StringSchema;
  descriptionValidationSchema: yup.StringSchema;

  // Name uniqueness validation
  isCheckingUniqueness: boolean;
  isNameUnique: boolean | null;
  nameUniquenessError: string | null;
  checkNameUniqueness: (name: string) => Promise<boolean>;

  // Real-time validation functions
  validateName: (name: string) => Promise<string | null>;
  validateDescription: (description: string) => string | null;

  // Validation helpers
  getValidationSchema: (mode: 'create' | 'edit') => yup.ObjectSchema<any>;
  validateSchemaForm: (data: any, mode: 'create' | 'edit') => Promise<Record<string, string>>;
}

export const useSchemaValidation = (options: SchemaValidationOptions = {}): SchemaValidationHookResult => {
  const {
    projectId,
    excludeSchemaId,
    includeGlobal = true,
    debounceMs = 500,
  } = options;

  const [isCheckingUniqueness, setIsCheckingUniqueness] = useState(false);
  const [isNameUnique, setIsNameUnique] = useState<boolean | null>(null);
  const [nameUniquenessError, setNameUniquenessError] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Fetch existing schemas for uniqueness checking
  const { data: schemasData } = useProjectSchemas(
    projectId || '',
    includeGlobal,
    { enabled: !!projectId }
  );

  const existingSchemas = useMemo(() => {
    return schemasData?.schemas || [];
  }, [schemasData]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  // Name uniqueness checking function
  const checkNameUniqueness = useCallback(async (name: string): Promise<boolean> => {
    if (!name.trim() || !projectId) {
      setIsNameUnique(null);
      setNameUniquenessError(null);
      return true;
    }

    const trimmedName = name.trim();

    // Check against existing schemas in the same project scope
    const conflictingSchema = existingSchemas.find(schema => {
      // Skip the current schema being edited
      if (excludeSchemaId && schema.id === excludeSchemaId) {
        return false;
      }

      // Case-insensitive name comparison
      return schema.name.toLowerCase() === trimmedName.toLowerCase();
    });

    const isUnique = !conflictingSchema;

    setIsNameUnique(isUnique);
    setNameUniquenessError(
      isUnique ? null : `A schema named "${trimmedName}" already exists in this project`
    );

    return isUnique;
  }, [projectId, existingSchemas, excludeSchemaId]);

  // Debounced name uniqueness checking
  const checkNameUniquenessDebounced = useCallback((name: string) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    setIsCheckingUniqueness(true);

    const timer = setTimeout(async () => {
      await checkNameUniqueness(name);
      setIsCheckingUniqueness(false);
    }, debounceMs);

    setDebounceTimer(timer);
  }, [checkNameUniqueness, debounceMs, debounceTimer]);

  // Real-time name validation
  const validateName = useCallback(async (name: string): Promise<string | null> => {
    try {
      // First check for invalid characters and provide specific feedback
      const invalidCharsError = getInvalidCharactersError(name);
      if (invalidCharsError) {
        return invalidCharsError;
      }

      // Then validate against yup schema
      await schemaNameValidationSchema.validate(name);

      // Finally check uniqueness if we have project context
      if (projectId) {
        const isUnique = await checkNameUniqueness(name);
        if (!isUnique) {
          return nameUniquenessError;
        }
      }

      return null;
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        return error.message;
      }
      return 'Invalid schema name';
    }
  }, [projectId, checkNameUniqueness, nameUniquenessError]);

  // Real-time description validation
  const validateDescription = useCallback((description: string): string | null => {
    try {
      schemaDescriptionValidationSchema.validateSync(description);
      return null;
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        return error.message;
      }
      return 'Invalid description';
    }
  }, []);

  // Get validation schema based on mode
  const getValidationSchema = useCallback((mode: 'create' | 'edit') => {
    return mode === 'create' ? schemaCreateValidationSchema : schemaEditValidationSchema;
  }, []);

  // Validate entire form
  const validateSchemaForm = useCallback(async (
    data: any,
    mode: 'create' | 'edit'
  ): Promise<Record<string, string>> => {
    const schema = getValidationSchema(mode);
    const errors: Record<string, string> = {};

    try {
      await schema.validate(data, { abortEarly: false });

      // Additional uniqueness check for name field
      if (data.name && projectId) {
        const nameError = await validateName(data.name);
        if (nameError) {
          errors.name = nameError;
        }
      }

    } catch (error) {
      if (error instanceof yup.ValidationError) {
        error.inner.forEach((err) => {
          if (err.path) {
            errors[err.path] = err.message;
          }
        });
      }
    }

    return errors;
  }, [getValidationSchema, projectId, validateName]);

  // Enhanced validation schemas with uniqueness checking
  const createValidationSchemaWithUniqueness = useMemo(() => {
    return schemaCreateValidationSchema.shape({
      name: schemaNameValidationSchema.test(
        'unique-name',
        'Schema name must be unique within the project',
        async function(value) {
          if (!value || !projectId) return true;
          return await checkNameUniqueness(value);
        }
      ),
    });
  }, [projectId, checkNameUniqueness]);

  const editValidationSchemaWithUniqueness = useMemo(() => {
    return schemaEditValidationSchema.shape({
      name: schemaNameValidationSchema.test(
        'unique-name',
        'Schema name must be unique within the project',
        async function(value) {
          if (!value || !projectId) return true;
          return await checkNameUniqueness(value);
        }
      ),
    });
  }, [projectId, checkNameUniqueness]);

  return {
    // Validation schemas
    createValidationSchema: createValidationSchemaWithUniqueness,
    editValidationSchema: editValidationSchemaWithUniqueness,
    nameValidationSchema: schemaNameValidationSchema,
    descriptionValidationSchema: schemaDescriptionValidationSchema,

    // Name uniqueness validation
    isCheckingUniqueness,
    isNameUnique,
    nameUniquenessError,
    checkNameUniqueness,

    // Real-time validation functions
    validateName,
    validateDescription,

    // Validation helpers
    getValidationSchema,
    validateSchemaForm,
  };
};