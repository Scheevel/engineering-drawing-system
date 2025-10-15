# Testing Patterns for Schema Management and Field Operations

**Author**: Claude (AI-generated documentation, Epic 3 deliverable)
**Created**: September 2025

## Overview

This document outlines comprehensive testing patterns and best practices for schema management and field operations in the Engineering Drawing Index System. These patterns should be followed for all future field management features to ensure consistency, reliability, and performance.

## Testing Architecture

### Test Organization Structure

```
frontend/src/
├── test-utils/
│   ├── schemaIntegrationTestUtils.ts    # Core integration testing utilities
│   ├── mockSchemaData.ts               # Test data generators
│   └── performanceTestHelpers.ts        # Performance measurement utilities
├── tests/
│   ├── schemaValidationWorkflows.test.tsx  # Integration test suites
│   ├── fieldManagement.test.tsx           # Field operation tests
│   └── performanceBenchmarks.test.tsx     # Performance validation tests
└── components/schema-management/
    ├── Component.tsx
    └── Component.test.tsx                  # Unit tests co-located with components
```

## Core Testing Patterns

### 1. Schema Integration Testing Pattern

**Purpose**: Test complete workflows from schema creation to field validation

**Implementation**:
```typescript
import { createTestSchemaData, SchemaValidationTester } from '../test-utils/schemaIntegrationTestUtils';

describe('Schema Workflow Integration', () => {
  let validationTester: SchemaValidationTester;

  beforeEach(() => {
    validationTester = new SchemaValidationTester();
  });

  it('should complete full validation workflow', async () => {
    const schema = createTestSchemaData.complex();
    const testData = { /* valid test data */ };

    const result = await validationTester.testValidationWorkflow(schema, testData);

    expect(result.isValid).toBe(true);
    expect(result.performanceMetrics.validationTime).toBeLessThan(500);
  });
});
```

### 2. Performance Testing Pattern

**Purpose**: Ensure all operations meet defined performance targets

**Targets**:
- Field Reordering: < 100ms
- Complex Validation (50+ fields): < 500ms
- Real-time Updates: < 200ms
- Bulk Operations: < 1000ms

**Implementation**:
```typescript
import { SchemaPerformanceTester } from '../test-utils/schemaIntegrationTestUtils';

describe('Performance Validation', () => {
  let performanceTester: SchemaPerformanceTester;

  beforeEach(() => {
    performanceTester = new SchemaPerformanceTester();
  });

  it('should meet performance targets for field operations', async () => {
    const result = await performanceTester.measureOperation(
      'fieldOperation',
      () => performFieldOperation()
    );

    expect(result.duration).toBeLessThan(PERFORMANCE_TARGET);
  });
});
```

### 3. Field Type Testing Pattern

**Purpose**: Validate all field types work correctly with validation rules

**Required Field Types**:
- text, textarea, number, select, checkbox, radio
- date, datetime, time, location, object, array

**Implementation**:
```typescript
describe('Field Type Validation', () => {
  const fieldTypes = ['text', 'number', 'select', 'date', 'location'];

  fieldTypes.forEach(fieldType => {
    it(`should validate ${fieldType} field correctly`, async () => {
      const field = createTestField('test', fieldType, {
        required: true,
        validation_rules: getValidationRulesForType(fieldType)
      });

      const validData = getValidDataForType(fieldType);
      const invalidData = getInvalidDataForType(fieldType);

      expect(await validateField(field, validData)).toBe(true);
      expect(await validateField(field, invalidData)).toBe(false);
    });
  });
});
```

### 4. Error Handling Testing Pattern

**Purpose**: Ensure graceful handling of all error scenarios

**Error Categories**:
- Validation errors
- Network errors
- API errors
- Drag-and-drop failures

**Implementation**:
```typescript
describe('Error Handling', () => {
  it('should handle API errors gracefully', async () => {
    // Mock API failure
    mockApiError('NETWORK_ERROR');

    const result = await performSchemaOperation();

    expect(result.error).toBeTruthy();
    expect(result.error.message).toContain('user-friendly message');
    expect(result.error.recoverable).toBe(true);
  });

  it('should provide clear validation error messages', async () => {
    const invalidData = createInvalidTestData();
    const result = await validateData(invalidData);

    expect(result.errors).toBeTruthy();
    Object.values(result.errors).forEach(error => {
      expect(typeof error).toBe('string');
      expect(error.length).toBeGreaterThan(0);
      expect(error).not.toContain('undefined');
    });
  });
});
```

## Test Data Management

### Schema Test Data Categories

1. **Simple Schemas**: 3-5 basic fields for quick testing
2. **Complex Schemas**: 10-15 fields with validation and nested structures
3. **Large Schemas**: 50+ fields for performance testing
4. **Edge Case Schemas**: Empty, single field, or unusual configurations

### Test Data Generation

```typescript
// Use factories for consistent test data
export const SchemaFactory = {
  simple: () => createTestSchemaData.simple(),
  complex: () => createTestSchemaData.complex(),
  large: () => createTestSchemaData.large(),

  // Custom generation
  withFields: (count: number) => generateSchemaWithFieldCount(count),
  withValidation: (rules: ValidationRules) => generateSchemaWithValidation(rules)
};
```

## Performance Benchmarking

### Measurement Standards

1. **Baseline Measurement**: Always establish baseline before changes
2. **Regression Testing**: Compare against previous performance
3. **Target Validation**: Ensure all operations meet defined targets
4. **Load Testing**: Test with realistic data volumes

### Implementation

```typescript
class PerformanceBenchmark {
  async runBenchmarkSuite() {
    const results = {
      fieldReordering: await this.benchmarkFieldReordering(),
      validation: await this.benchmarkValidation(),
      rendering: await this.benchmarkRendering()
    };

    this.validateAgainstTargets(results);
    return results;
  }
}
```

## Integration Test Scenarios

### Core Scenarios (Must Test)

1. **Schema Creation Workflow**
   - Create schema → Add fields → Set validation → Save
   - Performance: < 1000ms end-to-end

2. **Field Management Workflow**
   - Add field → Configure → Reorder → Validate → Save
   - Performance: < 500ms per operation

3. **Validation Workflow**
   - Load schema → Validate data → Display errors → Correct → Re-validate
   - Performance: < 200ms for real-time validation

4. **Error Recovery Workflow**
   - Trigger error → Display message → Provide recovery → Retry
   - UX: Clear messaging and actionable recovery options

### Advanced Scenarios (Should Test)

1. **Complex Form Interaction**
   - Load large schema → Navigate fields → Validate → Submit
   - Performance: < 100ms for 55+ fields initial render

2. **Concurrent Operations**
   - Multiple users editing → Conflict detection → Resolution
   - Reliability: No data loss or corruption

3. **Accessibility Compliance**
   - Keyboard navigation → Screen reader compatibility → Focus management
   - Standard: WCAG 2.1 AA compliance

## Test Execution Strategy

### Development Workflow

1. **Unit Tests**: Run on every file change
2. **Integration Tests**: Run on component changes
3. **Performance Tests**: Run on performance-sensitive changes
4. **Full Regression**: Run before pull request

### Continuous Integration

```yaml
# Example CI configuration
test_stages:
  - name: unit_tests
    command: npm test -- --testPathPattern="\.test\.(ts|tsx)$"

  - name: integration_tests
    command: npm test -- --testPathPattern="workflows\.test\.tsx$"

  - name: performance_tests
    command: npm test -- --testPathPattern="performance\.test\.tsx$"
    threshold: 500ms
```

## Quality Gates

### Test Coverage Requirements

- **Unit Tests**: 80% minimum coverage
- **Integration Tests**: All critical workflows covered
- **Performance Tests**: All operations benchmarked
- **Error Scenarios**: All error types tested

### Performance Gates

- All operations must meet defined performance targets
- No regression in performance metrics
- Load testing with realistic data volumes
- Memory leak detection for long-running operations

### Accessibility Gates

- WCAG 2.1 AA compliance verified
- Keyboard navigation tested
- Screen reader compatibility validated
- Focus management verified

## Best Practices

### 1. Test Naming Conventions

```typescript
// Good: Descriptive and specific
it('should validate required text field and show error message when empty')

// Bad: Vague and unclear
it('should work correctly')
```

### 2. Test Data Management

```typescript
// Good: Use factories and meaningful data
const schema = SchemaFactory.withValidation({
  required: true,
  minLength: 3
});

// Bad: Inline magic values
const schema = { name: 'test', required: true, min: 3 };
```

### 3. Async Testing

```typescript
// Good: Proper async/await usage
it('should complete validation workflow', async () => {
  await waitFor(() => {
    expect(validationResult).toBe(true);
  });
});

// Bad: Missing async handling
it('should work', () => {
  performAsyncOperation(); // Missing await
  expect(result).toBe(true); // Will fail
});
```

### 4. Performance Testing

```typescript
// Good: Measure actual performance impact
const { duration } = await measureOperation(() => performOperation());
expect(duration).toBeLessThan(TARGET_MS);

// Bad: No performance validation
performOperation(); // No measurement
```

## Maintenance Guidelines

### Regular Maintenance Tasks

1. **Update Performance Baselines**: Monthly review and update
2. **Review Test Data**: Ensure test data reflects current usage patterns
3. **Validate Targets**: Adjust performance targets based on user feedback
4. **Clean Up Tests**: Remove obsolete tests and update deprecated patterns

### Documentation Updates

1. Update this document when new patterns emerge
2. Document new field types and their testing requirements
3. Update performance targets when requirements change
4. Maintain examples and best practices

## Conclusion

Following these testing patterns ensures:

- **Reliability**: All field management features work consistently
- **Performance**: Operations meet user experience requirements
- **Maintainability**: Tests are clear, consistent, and easy to update
- **Quality**: High-quality user experience with proper error handling

These patterns should be the foundation for all future field management development and testing efforts.