# Export Test Fixtures Guide

**Created**: October 2025
**Stories**: 7.4 (Export Dimension Values), 7.5 (Export Specification Values)
**Purpose**: Guide for using test fixtures in dimension and specification export testing

---

## Overview

This guide explains how to use the comprehensive test fixtures created for Stories 7.4 and 7.5. These fixtures provide realistic test data covering all edge cases, boundary conditions, and integration scenarios documented in the story acceptance criteria.

---

## Fixture Files

### Backend Fixtures (Python/Pytest)

**Location**: `backend/tests/fixtures/`

1. **`dimension_fixtures.py`** - Dimension test data (Story 7.4)
   - Individual dimension fixtures (length, width, height, etc.)
   - Component dimension sets (no dimensions, one dimension, all dimensions)
   - Sparse data scenarios
   - Format conversion test cases
   - Edge cases (fractional, large/small values, unit variations)

2. **`specification_fixtures.py`** - Specification test data (Story 7.5)
   - Individual specification fixtures (material, finish, grade, etc.)
   - Component specification sets
   - CSV escaping test cases
   - Integration fixtures (dimensions + specifications)

### Frontend Fixtures (TypeScript)

**Location**: `frontend/src/test-utils/exportTestFixtures.ts`

- TypeScript interfaces for all data types
- Pre-configured test components with dimensions and specifications
- Complete test datasets for both stories
- Helper functions for creating custom test data
- Mock drawing objects for full workflow testing

---

## Backend Testing (Pytest)

### Basic Usage

```python
# In your test file
from tests.fixtures.dimension_fixtures import (
    dimension_length_decimal,
    component_one_dimension,
    export_test_dataset_dimensions
)

def test_dimension_export_format(dimension_length_decimal):
    """Test dimension formatting logic"""
    result = format_dimension_combined(dimension_length_decimal)
    assert result == "15.75 in ±0.01"

def test_component_with_dimensions(component_one_dimension):
    """Test export with single dimension"""
    csv_row = generate_csv_row(component_one_dimension)
    assert 'Length' in csv_row
```

### Complete Test Dataset

```python
def test_export_with_full_dataset(export_test_dataset_dimensions):
    """Test export with all Story 7.4 test scenarios"""
    # This fixture includes:
    # - 1 component with NO dimensions
    # - 2 components with 1-2 dimensions
    # - 1 component with ALL 9 dimension types
    # - 1 component with fractional values
    # - 1 component with large/small values
    # - 2 components with unit variations
    # - 1 component without tolerance

    csv_output = export_to_csv(export_test_dataset_dimensions)

    # Verify all dimension columns appear
    assert 'Length' in csv_output
    assert 'Width' in csv_output
    # ... etc
```

### Sparse Data Testing

```python
from tests.fixtures.dimension_fixtures import sparse_dimension_dataset

def test_sparse_dimension_columns(sparse_dimension_dataset):
    """Test column generation with sparse data"""
    # Each component has different dimension type
    # Verify all 3 types generate columns
    columns = discover_dimension_columns(sparse_dimension_dataset)

    assert len(columns) == 3
    assert 'Length' in columns
    assert 'Width' in columns
    assert 'Height' in columns
```

### Format Conversion Testing

```python
from tests.fixtures.dimension_fixtures import dimension_format_test_cases

def test_dimension_formats(dimension_format_test_cases):
    """Test both Combined and Value Only formats"""
    for test_case in dimension_format_test_cases:
        input_dim = test_case['input']

        combined = format_dimension_combined(input_dim)
        assert combined == test_case['expected_combined']

        value_only = format_dimension_value_only(input_dim)
        assert value_only == test_case['expected_value_only']
```

### Integration Testing (Dimensions + Specifications)

```python
from tests.fixtures.specification_fixtures import export_test_dataset_complete

def test_full_export_integration(export_test_dataset_complete):
    """Test export with both dimensions and specifications"""
    # This fixture includes:
    # - Component with BOTH dimensions and specifications
    # - Component with specifications only
    # - Component with dimensions only
    # - Component with neither

    csv_output = export_to_csv(export_test_dataset_complete)

    # Verify column ordering: component → dimensions → specifications
    assert column_order_correct(csv_output)
```

---

## Frontend Testing (React Testing Library / Jest)

### Basic Usage

```typescript
import {
  componentOneDimension,
  componentAllDimensions,
  exportTestDatasetDimensions,
  mockDrawingWithDimensions
} from '@/test-utils/exportTestFixtures';

describe('ExportPreview - Dimensions', () => {
  it('renders dimension columns', () => {
    render(<ExportPreview components={[componentOneDimension]} />);

    expect(screen.getByText('Length')).toBeInTheDocument();
    expect(screen.getByText('15.75 in ±0.01')).toBeInTheDocument();
  });

  it('handles all dimension types', () => {
    render(<ExportPreview components={[componentAllDimensions]} />);

    // Verify all 9 dimension types appear as columns
    expect(screen.getByText('Length')).toBeInTheDocument();
    expect(screen.getByText('Width')).toBeInTheDocument();
    expect(screen.getByText('Height')).toBeInTheDocument();
    expect(screen.getByText('Diameter')).toBeInTheDocument();
    expect(screen.getByText('Thickness')).toBeInTheDocument();
    expect(screen.getByText('Radius')).toBeInTheDocument();
    expect(screen.getByText('Depth')).toBeInTheDocument();
    expect(screen.getByText('Spacing')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });
});
```

### Complete Test Dataset

```typescript
import { exportTestDatasetDimensions } from '@/test-utils/exportTestFixtures';

describe('Export Dialog - Full Dataset', () => {
  it('generates correct dimension columns from diverse dataset', () => {
    const { columns } = generateExportFields(exportTestDatasetDimensions);

    // Verify dynamic column discovery
    expect(columns).toContain('Length');
    expect(columns).toContain('Width');
    // Component with no dimensions shouldn't break column generation
    // Component with all dimensions should contribute all types
  });
});
```

### Helper Functions

```typescript
import {
  createComponentWithDimensions,
  createComponentWithSpecifications,
  createIntegratedComponent,
  createMockDrawing
} from '@/test-utils/exportTestFixtures';

describe('Custom Test Scenarios', () => {
  it('creates custom test component', () => {
    const customComponent = createComponentWithDimensions('TEST1', [
      { dimension_type: 'length', nominal_value: 100.0, unit: 'ft', tolerance: '±0.5', display_format: 'decimal' }
    ]);

    expect(customComponent.piece_mark).toBe('TEST1');
    expect(customComponent.dimensions).toHaveLength(1);
  });

  it('creates integrated component', () => {
    const component = createIntegratedComponent(
      'INT1',
      [{ dimension_type: 'length', nominal_value: 15.0, unit: 'in', tolerance: '±0.01', display_format: 'decimal' }],
      [{ specification_type: 'material', value: 'A36 Steel', description: undefined }]
    );

    expect(component.dimensions).toHaveLength(1);
    expect(component.specifications).toHaveLength(1);
  });
});
```

---

## E2E Testing (Playwright)

### Using Drawing Fixtures

```typescript
import { test, expect } from '@playwright/test';
import { mockDrawingComplete } from '../src/test-utils/exportTestFixtures';

test('full export workflow with dimensions and specifications', async ({ page }) => {
  // Mock API to return our test drawing
  await page.route('**/api/export/preview', async route => {
    await route.fulfill({
      json: { drawings: [mockDrawingComplete] }
    });
  });

  await page.goto('/export');

  // Open export dialog
  await page.click('text=Export Components');

  // Verify dimension columns appear
  await expect(page.locator('text=Length')).toBeVisible();
  await expect(page.locator('text=Width')).toBeVisible();

  // Verify specification columns appear
  await expect(page.locator('text=Material')).toBeVisible();
  await expect(page.locator('text=Finish')).toBeVisible();

  // Verify format toggle
  await page.click('[aria-label="Format: Value Only"]');

  // Verify values change to decimal-only format
  await expect(page.locator('text=15.75')).toBeVisible(); // No " in ±0.01"

  // Download CSV
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Download CSV')
  ]);

  const path = await download.path();
  // Verify CSV content...
});
```

---

## Test Coverage Matrix

| Test Scenario | Backend Fixture | Frontend Fixture | Story AC |
|--------------|-----------------|------------------|----------|
| **No dimensions** | `component_no_dimensions` | `componentNoDimensions` | 7.4-AC1 |
| **1-2 dimensions** | `component_one_dimension`, `component_two_dimensions` | `componentOneDimension`, `componentTwoDimensions` | 7.4-AC1 |
| **All 9 dimension types** | `component_all_dimensions` | `componentAllDimensions` | 7.4-AC1 |
| **Fractional values** | `component_fractional_dimensions` | `componentFractionalDimensions` | 7.4-AC3 |
| **Large/small values** | `component_large_small_values` | `componentLargeSmallValues` | Edge case |
| **Unit variations** | `component_unit_variations` | N/A | Edge case |
| **No tolerance** | `component_no_tolerance` | N/A | Edge case |
| **Format options** | `dimension_format_test_cases` | `dimensionFormatTestCases` | 7.4-AC2 |
| **Sparse data** | `sparse_dimension_dataset` | `sparseDimensionDataset` | 7.4-AC4 |
| **No specifications** | `component_no_specifications` | `componentNoSpecifications` | 7.5-AC1 |
| **1-2 specifications** | `component_one_specification`, `component_two_specifications` | `componentOneSpecification`, `componentTwoSpecifications` | 7.5-AC1 |
| **All 7 spec types** | `component_all_specifications` | `componentAllSpecifications` | 7.5-AC1 |
| **Long values (255)** | `component_long_spec_value` | `componentLongSpecValue` | 7.5 edge case |
| **Special characters** | `component_special_characters` | `componentSpecialCharacters` | 7.5 edge case |
| **CSV escaping** | `csv_escaping_test_cases` | `csvEscapingTestCases` | 7.5 edge case |
| **Dimensions + Specs** | `component_dimensions_and_specifications` | `componentDimensionsAndSpecifications` | Integration |
| **Specs only** | `component_specifications_no_dimensions` | `componentSpecificationsNoDimensions` | Integration |
| **Dimensions only** | `component_dimensions_no_specifications` | `componentDimensionsNoSpecifications` | Integration |
| **Complete dataset** | `export_test_dataset_complete` | `exportTestDatasetComplete` | Full workflow |

---

## Creating Custom Test Data

### Backend

```python
from tests.fixtures.dimension_fixtures import create_dimension, create_component_with_dimensions

# Create custom dimension
custom_dim = create_dimension(
    dimension_type='length',
    nominal_value=42.5,
    unit='ft',
    tolerance='±1.0',
    display_format='decimal'
)

# Create custom component
custom_component = create_component_with_dimensions(
    piece_mark='CUSTOM1',
    dimensions=[custom_dim]
)
```

### Frontend

```typescript
import { createIntegratedComponent } from '@/test-utils/exportTestFixtures';

const myTestComponent = createIntegratedComponent(
  'MY1',
  [
    { dimension_type: 'length', nominal_value: 50.0, unit: 'ft', tolerance: '±0.5', display_format: 'decimal' }
  ],
  [
    { specification_type: 'material', value: 'Custom Material', description: undefined }
  ]
);
```

---

## Best Practices

### 1. Use Appropriate Fixtures

- **Unit tests**: Use individual dimension/specification fixtures
- **Integration tests**: Use component fixtures with multiple items
- **E2E tests**: Use complete datasets and drawing fixtures

### 2. Don't Modify Fixtures In Tests

```python
# ❌ Bad - mutates shared fixture
def test_bad(component_one_dimension):
    component_one_dimension['dimensions'][0]['nominal_value'] = 999
    # Other tests will see modified data!

# ✅ Good - create new object
def test_good(component_one_dimension):
    test_component = {**component_one_dimension}
    test_component['dimensions'][0]['nominal_value'] = 999
```

### 3. Test Edge Cases Explicitly

```python
from tests.fixtures.dimension_fixtures import dimension_radius_small

def test_very_small_values(dimension_radius_small):
    """Explicitly test boundary condition"""
    assert dimension_radius_small['nominal_value'] == 0.001
    result = format_dimension(dimension_radius_small)
    # Verify proper precision handling...
```

### 4. Use Helper Functions for Variations

```typescript
import { createComponentWithDimensions } from '@/test-utils/exportTestFixtures';

// Create variations easily
const component1 = createComponentWithDimensions('A1', [lengthDimension]);
const component2 = createComponentWithDimensions('A2', [widthDimension]);
const component3 = createComponentWithDimensions('A3', [lengthDimension, widthDimension]);
```

---

## Troubleshooting

### Fixtures Not Found

```bash
# Backend - ensure fixtures directory is in pytest path
cd backend
pytest --collect-only  # Should show fixture names

# Frontend - check import path
# Use absolute import with @ alias or relative import
```

### Fixture Data Out of Sync

If acceptance criteria change, update fixtures:

1. Check story document for updated test data requirements
2. Update fixture files to match
3. Run full test suite to verify no regressions

### Test Failures

If tests fail after fixture updates:

1. Check if test expectations need updating
2. Verify fixture data matches story ACs
3. Ensure no unintended mutations of shared fixtures

---

## Maintenance

### When to Update Fixtures

- Story acceptance criteria change
- New edge cases discovered during testing
- Bug fixes require new test scenarios
- New dimension/specification types added

### Versioning

Fixtures are tied to story versions:
- **v1.0**: Story 7.4 and 7.5 initial implementation
- **v1.1**: Add any post-release edge cases

Document fixture changes in git commit messages referencing the story.

---

## Related Documentation

- [Story 7.4: Export Dimension Values](../stories/story-7.4-export-dimension-values.md)
- [Story 7.5: Export Specification Values](../stories/story-7.5-export-specification-values.md)
- [Testing Strategy](./testing-strategy.md)
- [E2E Test Guide](./e2e-testing-guide.md)

---

**Document Maintained By**: Mary (Business Analyst) + QA Team
**Last Updated**: October 2025
**Next Review**: After Story 7.4/7.5 implementation complete
