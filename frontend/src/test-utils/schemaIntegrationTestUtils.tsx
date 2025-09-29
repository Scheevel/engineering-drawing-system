/**
 * Schema Integration Testing Utilities
 *
 * Provides utilities for testing schema-component integration workflows
 * and validating end-to-end schema management operations.
 */

import { ComponentSchema, SchemaField } from '../types/schema';
import React, { act } from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import React from 'react';

// Test data sets for various field type combinations
export const createTestSchemaData = {
  // Simple schema with basic field types
  simple: (): ComponentSchema => ({
    id: 'test-schema-simple',
    name: 'Simple Test Schema',
    description: 'Basic schema for integration testing',
    version: '1.0.0',
    is_active: true,
    is_default: false,
    project_id: 'test-project',
    fields: [
      createTestField('name', 'text', { required: true }),
      createTestField('description', 'textarea', { required: false }),
      createTestField('value', 'number', { required: true })
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),

  // Complex schema with advanced field types and validation
  complex: (): ComponentSchema => ({
    id: 'test-schema-complex',
    name: 'Complex Test Schema',
    description: 'Advanced schema for integration testing with complex validation',
    version: '1.0.0',
    is_active: true,
    is_default: false,
    project_id: 'test-project',
    fields: [
      createTestField('title', 'text', {
        required: true,
        validation_rules: { min_length: 3, max_length: 100 }
      }),
      createTestField('category', 'select', {
        required: true,
        field_options: ['Primary', 'Secondary', 'Tertiary']
      }),
      createTestField('specifications', 'object', {
        required: false,
        nested_fields: [
          createTestField('dimensions', 'text', { required: true }),
          createTestField('material', 'select', {
            required: true,
            field_options: ['Steel', 'Concrete', 'Wood']
          })
        ]
      }),
      createTestField('coordinates', 'location', { required: false }),
      createTestField('tags', 'array', { required: false })
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),

  // Large schema for performance testing
  large: (): ComponentSchema => ({
    id: 'test-schema-large',
    name: 'Large Performance Test Schema',
    description: 'Schema with many fields for performance integration testing',
    version: '1.0.0',
    is_active: true,
    is_default: false,
    project_id: 'test-project',
    fields: Array.from({ length: 55 }, (_, i) =>
      createTestField(`field_${i + 1}`, i % 2 === 0 ? 'text' : 'number', {
        required: i % 3 === 0,
        validation_rules: i % 4 === 0 ? { min_length: 1, max_length: 50 } : undefined
      })
    ),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
};

// Helper function to create test fields
export function createTestField(
  name: string,
  type: SchemaField['field_type'],
  options: Partial<SchemaField> = {}
): SchemaField {
  return {
    id: `field-${name}`,
    name,
    field_type: type,
    label: name.charAt(0).toUpperCase() + name.slice(1),
    required: false,
    help_text: `Help text for ${name}`,
    validation_rules: {},
    field_options: [],
    display_order: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...options
  };
}

// Test wrapper for React Query
export function createSchemaTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Integration test scenarios
export const integrationTestScenarios = {
  // Schema validation workflow test
  schemaValidation: {
    name: 'Schema Validation Workflow',
    description: 'Tests complete schema validation including field-level and schema-level validation',
    steps: [
      'Create schema with validation rules',
      'Add fields with different validation requirements',
      'Test valid data submission',
      'Test invalid data submission',
      'Verify error messages and user feedback'
    ]
  },

  // Field reordering test
  fieldReordering: {
    name: 'Field Reordering Integration',
    description: 'Tests drag-and-drop field reordering with persistence',
    steps: [
      'Create schema with multiple fields',
      'Simulate drag-and-drop reordering',
      'Verify display_order updates',
      'Test persistence across page reload',
      'Verify performance within targets'
    ]
  },

  // Complex form rendering test
  complexFormRendering: {
    name: 'Complex Form Rendering Performance',
    description: 'Tests rendering performance with large schemas',
    steps: [
      'Load schema with 50+ fields',
      'Measure initial render time',
      'Test form interaction responsiveness',
      'Validate field dependencies',
      'Verify accessibility compliance'
    ]
  },

  // Error handling workflow test
  errorHandling: {
    name: 'Error Handling Workflow',
    description: 'Tests error scenarios and recovery procedures',
    steps: [
      'Simulate API failures',
      'Test network connectivity issues',
      'Verify graceful degradation',
      'Test error message clarity',
      'Validate recovery procedures'
    ]
  }
};

// Performance measurement helpers
export class SchemaPerformanceTester {
  private measurements: Record<string, number[]> = {};

  async measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await operation();
    const duration = performance.now() - startTime;

    if (!this.measurements[operationName]) {
      this.measurements[operationName] = [];
    }
    this.measurements[operationName].push(duration);

    return { result, duration };
  }

  getAverageTime(operationName: string): number {
    const times = this.measurements[operationName] || [];
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  getMaxTime(operationName: string): number {
    const times = this.measurements[operationName] || [];
    return times.length > 0 ? Math.max(...times) : 0;
  }

  reset(operationName?: string): void {
    if (operationName) {
      delete this.measurements[operationName];
    } else {
      this.measurements = {};
    }
  }

  getReport(): Record<string, { average: number; max: number; count: number }> {
    const report: Record<string, { average: number; max: number; count: number }> = {};

    for (const [operation, times] of Object.entries(this.measurements)) {
      report[operation] = {
        average: this.getAverageTime(operation),
        max: this.getMaxTime(operation),
        count: times.length
      };
    }

    return report;
  }
}

// Validation workflow tester
export class SchemaValidationTester {
  async testValidationWorkflow(
    schema: ComponentSchema,
    testData: Record<string, any>
  ): Promise<{
    isValid: boolean;
    errors: Record<string, string>;
    performanceMetrics: { validationTime: number; renderTime: number };
  }> {
    const startValidation = performance.now();

    // Simulate validation logic
    const errors: Record<string, string> = {};

    for (const field of schema.fields) {
      const value = testData[field.name];

      // Required field validation
      if (field.required && (!value || value === '')) {
        errors[field.name] = `${field.label} is required`;
        continue;
      }

      // Type-specific validation
      if (value !== undefined && value !== '') {
        switch (field.field_type) {
          case 'text':
            if (typeof value !== 'string') {
              errors[field.name] = `${field.label} must be text`;
            } else if (field.validation_rules?.min_length && value.length < field.validation_rules.min_length) {
              errors[field.name] = `${field.label} must be at least ${field.validation_rules.min_length} characters`;
            } else if (field.validation_rules?.max_length && value.length > field.validation_rules.max_length) {
              errors[field.name] = `${field.label} must be less than ${field.validation_rules.max_length} characters`;
            }
            break;
          case 'number':
            if (typeof value !== 'number' && isNaN(Number(value))) {
              errors[field.name] = `${field.label} must be a number`;
            }
            break;
          case 'select':
            if (field.field_options && !field.field_options.includes(value)) {
              errors[field.name] = `${field.label} must be one of: ${field.field_options.join(', ')}`;
            }
            break;
        }
      }
    }

    const validationTime = performance.now() - startValidation;

    // Simulate render time measurement
    const startRender = performance.now();
    await new Promise(resolve => setTimeout(resolve, 1)); // Minimal async delay
    const renderTime = performance.now() - startRender;

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      performanceMetrics: {
        validationTime,
        renderTime
      }
    };
  }
}

// Export default test configuration
export const defaultIntegrationTestConfig = {
  performanceTargets: {
    fieldReordering: 100, // ms
    complexValidation: 500, // ms for 50+ fields
    realTimeUpdates: 200, // ms for individual field changes
    bulkOperations: 1000 // ms for up to 20 field operations
  },
  testDataSets: createTestSchemaData,
  scenarios: integrationTestScenarios
};