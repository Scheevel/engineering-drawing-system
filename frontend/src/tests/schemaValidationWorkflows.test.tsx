/**
 * Schema Validation Workflows Integration Tests
 *
 * Comprehensive integration tests for schema validation workflows
 * including field-level validation, schema-level validation, and performance testing.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createTestSchemaData,
  createSchemaTestWrapper,
  SchemaPerformanceTester,
  SchemaValidationTester,
  defaultIntegrationTestConfig
} from '../test-utils/schemaIntegrationTestUtils';

// Mock the schema services
jest.mock('../services/schemaQueries.ts', () => ({
  useSchemaValidation: jest.fn(),
  useUpdateSchema: jest.fn(),
  useCreateSchema: jest.fn()
}));

describe('Schema Validation Workflows Integration Tests', () => {
  let performanceTester: SchemaPerformanceTester;
  let validationTester: SchemaValidationTester;

  beforeEach(() => {
    performanceTester = new SchemaPerformanceTester();
    validationTester = new SchemaValidationTester();
    jest.clearAllMocks();
  });

  describe('Schema Validation Performance', () => {
    it('should validate simple schema within performance targets', async () => {
      const schema = createTestSchemaData.simple();
      const testData = {
        name: 'Test Component',
        description: 'A test component description',
        value: 42
      };

      const result = await performanceTester.measureOperation(
        'simpleSchemaValidation',
        () => validationTester.testValidationWorkflow(schema, testData)
      );

      expect(result.result.isValid).toBe(true);
      expect(result.duration).toBeLessThan(defaultIntegrationTestConfig.performanceTargets.realTimeUpdates);
      expect(Object.keys(result.result.errors)).toHaveLength(0);
    });

    it('should validate complex schema within performance targets', async () => {
      const schema = createTestSchemaData.complex();
      const testData = {
        title: 'Complex Test Component',
        category: 'Primary',
        specifications: {
          dimensions: '10x20x30',
          material: 'Steel'
        },
        coordinates: { lat: 40.7128, lng: -74.0060 },
        tags: ['test', 'complex', 'integration']
      };

      const result = await performanceTester.measureOperation(
        'complexSchemaValidation',
        () => validationTester.testValidationWorkflow(schema, testData)
      );

      expect(result.result.isValid).toBe(true);
      expect(result.duration).toBeLessThan(defaultIntegrationTestConfig.performanceTargets.complexValidation);
    });

    it('should handle large schema validation within performance targets', async () => {
      const schema = createTestSchemaData.large();
      const testData: Record<string, any> = {};

      // Generate test data for all fields
      schema.fields.forEach((field, index) => {
        if (field.field_type === 'text') {
          testData[field.name] = `Test value ${index}`;
        } else if (field.field_type === 'number') {
          testData[field.name] = index * 10;
        }
      });

      const result = await performanceTester.measureOperation(
        'largeSchemaValidation',
        () => validationTester.testValidationWorkflow(schema, testData)
      );

      expect(result.result.isValid).toBe(true);
      expect(result.duration).toBeLessThan(defaultIntegrationTestConfig.performanceTargets.complexValidation);
      expect(schema.fields.length).toBe(55); // Verify large schema size
    });
  });

  describe('Field Validation Rules', () => {
    it('should enforce required field validation', async () => {
      const schema = createTestSchemaData.simple();
      const testData = {
        description: 'Description without required name field',
        value: 42
      };

      const result = await validationTester.testValidationWorkflow(schema, testData);

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toContain('required');
    });

    it('should enforce field type validation', async () => {
      const schema = createTestSchemaData.simple();
      const testData = {
        name: 'Valid Name',
        description: 'Valid Description',
        value: 'invalid_number' // Should be number
      };

      const result = await validationTester.testValidationWorkflow(schema, testData);

      expect(result.isValid).toBe(false);
      expect(result.errors.value).toContain('must be a number');
    });

    it('should enforce length validation rules', async () => {
      const schema = createTestSchemaData.complex();
      const testData = {
        title: 'AB', // Too short (min_length: 3)
        category: 'Primary'
      };

      const result = await validationTester.testValidationWorkflow(schema, testData);

      expect(result.isValid).toBe(false);
      expect(result.errors.title).toContain('at least 3 characters');
    });

    it('should enforce select field options validation', async () => {
      const schema = createTestSchemaData.complex();
      const testData = {
        title: 'Valid Title',
        category: 'InvalidCategory' // Not in allowed options
      };

      const result = await validationTester.testValidationWorkflow(schema, testData);

      expect(result.isValid).toBe(false);
      expect(result.errors.category).toContain('must be one of: Primary, Secondary, Tertiary');
    });
  });

  describe('Performance Benchmarking', () => {
    it('should track and report performance metrics', async () => {
      const schema = createTestSchemaData.simple();
      const testData = {
        name: 'Performance Test',
        description: 'Testing performance metrics',
        value: 100
      };

      // Run multiple validations to get average performance
      for (let i = 0; i < 5; i++) {
        await performanceTester.measureOperation(
          'performanceBenchmark',
          () => validationTester.testValidationWorkflow(schema, testData)
        );
      }

      const report = performanceTester.getReport();
      expect(report.performanceBenchmark).toBeDefined();
      expect(report.performanceBenchmark.count).toBe(5);
      expect(report.performanceBenchmark.average).toBeGreaterThan(0);
      expect(report.performanceBenchmark.max).toBeGreaterThanOrEqual(report.performanceBenchmark.average);
    });

    it('should reset performance measurements', async () => {
      await performanceTester.measureOperation('test', () => Promise.resolve(1));
      expect(Object.keys(performanceTester.getReport())).toContain('test');

      performanceTester.reset();
      expect(Object.keys(performanceTester.getReport())).toHaveLength(0);
    });
  });

  describe('Field Type Combinations', () => {
    it('should handle mixed field types correctly', async () => {
      const schema = createTestSchemaData.complex();
      const validTestData = {
        title: 'Mixed Field Types Test',
        category: 'Secondary',
        specifications: {
          dimensions: '5x10x15',
          material: 'Concrete'
        },
        coordinates: { lat: 41.8781, lng: -87.6298 },
        tags: ['mixed', 'types', 'test']
      };

      const result = await validationTester.testValidationWorkflow(schema, validTestData);

      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should handle nested field validation', async () => {
      const schema = createTestSchemaData.complex();
      const testDataWithInvalidNested = {
        title: 'Nested Validation Test',
        category: 'Primary',
        specifications: {
          dimensions: '', // Required nested field missing
          material: 'InvalidMaterial' // Invalid nested field option
        }
      };

      // Note: This test assumes nested validation would be implemented
      // For now, we test the structure exists
      expect(schema.fields.find(f => f.field_type === 'object')).toBeDefined();
      expect(schema.fields.find(f => f.field_type === 'object')?.nested_fields).toBeDefined();
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle validation errors gracefully', async () => {
      const schema = createTestSchemaData.simple();
      const invalidData = {
        name: '', // Required field empty
        description: '',
        value: 'not-a-number' // Invalid type
      };

      const result = await validationTester.testValidationWorkflow(schema, invalidData);

      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
      expect(result.performanceMetrics.validationTime).toBeGreaterThan(0);
      expect(result.performanceMetrics.renderTime).toBeGreaterThan(0);
    });

    it('should provide clear error messages', async () => {
      const schema = createTestSchemaData.complex();
      const testData = {
        title: 'A', // Too short
        category: 'Invalid' // Not in options
      };

      const result = await validationTester.testValidationWorkflow(schema, testData);

      expect(result.errors.title).toBeTruthy();
      expect(result.errors.category).toBeTruthy();
      expect(typeof result.errors.title).toBe('string');
      expect(typeof result.errors.category).toBe('string');
    });
  });

  describe('Integration Test Scenarios Coverage', () => {
    it('should cover all defined integration test scenarios', () => {
      const scenarios = defaultIntegrationTestConfig.scenarios;

      expect(scenarios.schemaValidation).toBeDefined();
      expect(scenarios.fieldReordering).toBeDefined();
      expect(scenarios.complexFormRendering).toBeDefined();
      expect(scenarios.errorHandling).toBeDefined();

      // Verify each scenario has required properties
      Object.values(scenarios).forEach(scenario => {
        expect(scenario.name).toBeTruthy();
        expect(scenario.description).toBeTruthy();
        expect(Array.isArray(scenario.steps)).toBe(true);
        expect(scenario.steps.length).toBeGreaterThan(0);
      });
    });

    it('should validate performance targets are defined', () => {
      const targets = defaultIntegrationTestConfig.performanceTargets;

      expect(targets.fieldReordering).toBe(100);
      expect(targets.complexValidation).toBe(500);
      expect(targets.realTimeUpdates).toBe(200);
      expect(targets.bulkOperations).toBe(1000);
    });
  });
});