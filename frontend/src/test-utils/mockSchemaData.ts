/**
 * Mock Schema Data Generators
 *
 * Generates realistic mock schema data for testing
 * Supports different schema configurations, complexities, and edge cases
 */

import {
  ComponentSchema,
  ComponentSchemaField,
  ComponentSchemaFieldCreate,
  ComponentSchemaCreate,
  SchemaFieldType,
  FlexibleComponent,
} from '../types/schema';

// Counter for unique IDs
let mockIdCounter = 1;

/**
 * Generate a unique mock ID
 */
const generateMockId = (): string => {
  return `mock-${mockIdCounter++}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create a mock schema field with optional overrides
 */
export const createMockField = (
  overrides: Partial<ComponentSchemaField> = {}
): ComponentSchemaField => {
  const fieldTypes: SchemaFieldType[] = ['text', 'number', 'select', 'checkbox', 'textarea', 'date'];
  const defaultType = fieldTypes[Math.floor(Math.random() * fieldTypes.length)];

  const baseField: ComponentSchemaField = {
    id: generateMockId(),
    field_name: `test_field_${mockIdCounter}`,
    field_type: defaultType,
    field_config: getDefaultFieldConfig(defaultType),
    help_text: `Help text for ${defaultType} field`,
    display_order: mockIdCounter,
    is_required: Math.random() > 0.5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };

  return baseField;
};

/**
 * Create a mock schema field for creation (without IDs and timestamps)
 */
export const createMockFieldCreate = (
  overrides: Partial<ComponentSchemaFieldCreate> = {}
): ComponentSchemaFieldCreate => {
  const fieldTypes: SchemaFieldType[] = ['text', 'number', 'select', 'checkbox', 'textarea', 'date'];
  const defaultType = fieldTypes[Math.floor(Math.random() * fieldTypes.length)];

  return {
    field_name: `new_field_${mockIdCounter++}`,
    field_type: defaultType,
    field_config: getDefaultFieldConfig(defaultType),
    help_text: `Help text for new ${defaultType} field`,
    display_order: 0,
    is_required: false,
    is_active: true,
    ...overrides,
  };
};

/**
 * Get default field configuration for a field type
 */
export const getDefaultFieldConfig = (fieldType: SchemaFieldType): Record<string, any> => {
  switch (fieldType) {
    case 'text':
      return {
        placeholder: 'Enter text...',
        maxLength: 255,
        minLength: 0,
      };
    case 'number':
      return {
        min: 0,
        max: 1000,
        step: 1,
        unit: 'units',
      };
    case 'select':
      return {
        options: [
          { value: 'option1', label: 'Option 1' },
          { value: 'option2', label: 'Option 2' },
          { value: 'option3', label: 'Option 3' },
        ],
        multiple: false,
      };
    case 'checkbox':
      return {
        trueLabel: 'Yes',
        falseLabel: 'No',
      };
    case 'textarea':
      return {
        placeholder: 'Enter detailed text...',
        rows: 4,
        maxLength: 1000,
      };
    case 'date':
      return {
        format: 'YYYY-MM-DD',
        showTime: false,
      };
    default:
      return {};
  }
};

/**
 * Create a complete mock schema with optional overrides
 */
export const createMockSchema = (
  overrides: Partial<ComponentSchema> = {}
): ComponentSchema => {
  const fieldCount = overrides.fields?.length ?? Math.floor(Math.random() * 5) + 2;
  const fields = overrides.fields || Array.from({ length: fieldCount }, (_, index) =>
    createMockField({
      field_name: `field_${index + 1}`,
      display_order: index,
    })
  );

  const baseSchema: ComponentSchema = {
    id: generateMockId(),
    project_id: `mock-project-${Math.floor(Math.random() * 3) + 1}`,
    name: `Test Schema ${mockIdCounter}`,
    description: 'A test schema for unit testing',
    version: 1,
    is_default: Math.random() > 0.7,
    is_active: Math.random() > 0.1,
    created_at: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
    updated_at: new Date().toISOString(),
    fields,
    ...overrides,
  };

  return baseSchema;
};

/**
 * Create a mock schema for creation (without IDs and timestamps)
 */
export const createMockSchemaCreate = (
  overrides: Partial<ComponentSchemaCreate> = {}
): ComponentSchemaCreate => {
  return {
    project_id: `mock-project-1`,
    name: `New Test Schema ${mockIdCounter++}`,
    description: 'A new test schema for unit testing',
    is_default: false,
    ...overrides,
  };
};

/**
 * Create multiple mock schemas
 */
export const createMockSchemas = (count: number = 3): ComponentSchema[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockSchema({
      name: `Test Schema ${index + 1}`,
      is_default: index === 0, // First schema is default
    })
  );
};

/**
 * Create a mock flexible component using a schema
 */
export const createMockFlexibleComponent = (
  schema: ComponentSchema,
  overrides: Partial<FlexibleComponent> = {}
): FlexibleComponent => {
  const dynamicData: Record<string, any> = {};

  // Generate mock data for each field in the schema
  schema.fields.forEach((field) => {
    switch (field.field_type) {
      case 'text':
        dynamicData[field.field_name] = `Sample text for ${field.field_name}`;
        break;
      case 'number':
        dynamicData[field.field_name] = Math.floor(Math.random() * 100) + 1;
        break;
      case 'select':
        const options = field.field_config?.options || [];
        if (options.length > 0) {
          dynamicData[field.field_name] = options[0].value;
        }
        break;
      case 'checkbox':
        dynamicData[field.field_name] = Math.random() > 0.5;
        break;
      case 'textarea':
        dynamicData[field.field_name] = `Sample long text content for ${field.field_name}`;
        break;
      case 'date':
        dynamicData[field.field_name] = new Date().toISOString().split('T')[0];
        break;
    }
  });

  return {
    id: generateMockId(),
    name: `Mock Component ${mockIdCounter++}`,
    description: 'A mock flexible component for testing',
    drawing_id: generateMockId(),
    project_id: schema.project_id,
    schema_id: schema.id,
    piece_mark: `PC${mockIdCounter}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    location: { x: Math.random() * 1000, y: Math.random() * 1000 },
    dimensions: { width: Math.random() * 100 + 10, height: Math.random() * 100 + 10 },
    dynamic_data: dynamicData,
    is_active: true,
    ...overrides,
  };
};

/**
 * Create edge case schemas for testing boundary conditions
 */
export const createEdgeCaseSchemas = (): ComponentSchema[] => {
  return [
    // Empty schema (no fields)
    createMockSchema({
      name: 'Empty Schema',
      description: 'Schema with no fields',
      fields: [],
    }),

    // Schema with many fields
    createMockSchema({
      name: 'Complex Schema',
      description: 'Schema with many fields',
      fields: Array.from({ length: 20 }, (_, index) => createMockField({
        field_name: `complex_field_${index + 1}`,
        display_order: index,
      })),
    }),

    // Schema with long names and descriptions
    createMockSchema({
      name: 'A'.repeat(100),
      description: 'B'.repeat(500),
      fields: [
        createMockField({
          field_name: 'c'.repeat(50),
          help_text: 'D'.repeat(200),
        }),
      ],
    }),

    // Inactive schema
    createMockSchema({
      name: 'Inactive Schema',
      description: 'This schema is inactive',
      is_active: false,
    }),

    // Schema with all field types
    createMockSchema({
      name: 'All Field Types Schema',
      description: 'Contains one of each field type',
      fields: [
        createMockField({ field_name: 'text_field', field_type: 'text', display_order: 0 }),
        createMockField({ field_name: 'number_field', field_type: 'number', display_order: 1 }),
        createMockField({ field_name: 'select_field', field_type: 'select', display_order: 2 }),
        createMockField({ field_name: 'checkbox_field', field_type: 'checkbox', display_order: 3 }),
        createMockField({ field_name: 'textarea_field', field_type: 'textarea', display_order: 4 }),
        createMockField({ field_name: 'date_field', field_type: 'date', display_order: 5 }),
      ],
    }),
  ];
};

/**
 * Create mock API responses for different scenarios
 */
export const createMockApiResponses = () => {
  const schemas = createMockSchemas(5);

  return {
    // Success responses
    getProjectSchemas: {
      schemas,
      total: schemas.length,
      page: 1,
      per_page: 10,
    },

    createSchema: schemas[0],

    updateSchema: {
      ...schemas[0],
      name: 'Updated Schema Name',
      updated_at: new Date().toISOString(),
    },

    deleteSchema: { success: true },

    // Error responses
    createSchemaError: {
      error: 'Schema name already exists',
      details: ['A schema with this name already exists in the project'],
    },

    networkError: new Error('Network request failed'),

    validationError: {
      error: 'Validation failed',
      field_errors: {
        name: ['Name is required'],
        fields: ['At least one field is required'],
      },
    },
  };
};

/**
 * Reset the mock ID counter (useful for consistent test results)
 */
export const resetMockIdCounter = (): void => {
  mockIdCounter = 1;
};

/**
 * Create mock form data for testing forms
 */
export const createMockFormData = (schema?: ComponentSchema): Record<string, any> => {
  if (!schema) {
    return {
      name: 'Test Schema',
      description: 'Test description',
      is_default: false,
    };
  }

  const formData: Record<string, any> = {};

  schema.fields.forEach((field) => {
    switch (field.field_type) {
      case 'text':
        formData[field.field_name] = 'Test text value';
        break;
      case 'number':
        formData[field.field_name] = 42;
        break;
      case 'select':
        const options = field.field_config?.options || [];
        formData[field.field_name] = options.length > 0 ? options[0].value : 'test-option';
        break;
      case 'checkbox':
        formData[field.field_name] = true;
        break;
      case 'textarea':
        formData[field.field_name] = 'Test textarea content\nWith multiple lines';
        break;
      case 'date':
        formData[field.field_name] = '2024-01-15';
        break;
    }
  });

  return formData;
};

// Export commonly used mock data sets
export const MOCK_SCHEMAS = createMockSchemas(5);
export const MOCK_EDGE_CASE_SCHEMAS = createEdgeCaseSchemas();
export const MOCK_API_RESPONSES = createMockApiResponses();