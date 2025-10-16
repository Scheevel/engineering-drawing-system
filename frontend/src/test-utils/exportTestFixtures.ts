/**
 * Test fixtures for export functionality (Stories 7.4 and 7.5)
 *
 * Provides comprehensive test data for:
 * - Dimension export testing (Story 7.4)
 * - Specification export testing (Story 7.5)
 * - Integrated dimension + specification export testing
 * - CSV column generation and formatting
 * - Sparse data handling
 * - Edge cases and boundary conditions
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface Dimension {
  id?: string;
  dimension_type: 'length' | 'width' | 'height' | 'diameter' | 'thickness' | 'radius' | 'depth' | 'spacing' | 'other';
  nominal_value: number;
  unit: 'in' | 'ft' | 'mm' | 'cm' | 'm' | 'yd';
  tolerance?: string;
  display_format: 'decimal' | 'fraction';
  location_x?: number;
  location_y?: number;
}

export interface Specification {
  id?: string;
  specification_type: 'material' | 'finish' | 'grade' | 'coating' | 'treatment' | 'standard' | 'other';
  value: string;
  description?: string;
  confidence_score?: number;
}

export interface ComponentWithData {
  id: string;
  piece_mark: string;
  component_type: string;
  description?: string;
  dimensions?: Dimension[];
  specifications?: Specification[];
}

export interface Drawing {
  id: string;
  file_name: string;
  original_name: string;
  project_name?: string;
  upload_date: string;
  processing_status: string;
  components: ComponentWithData[];
}

// ============================================================================
// Dimension Fixtures
// ============================================================================

export const dimensionLengthDecimal: Dimension = {
  dimension_type: 'length',
  nominal_value: 15.75,
  unit: 'in',
  tolerance: '±0.01',
  display_format: 'decimal'
};

export const dimensionWidthFractional: Dimension = {
  dimension_type: 'width',
  nominal_value: 11.75, // 11 3/4
  unit: 'in',
  tolerance: '±0.015',
  display_format: 'fraction'
};

export const dimensionHeightNoTolerance: Dimension = {
  dimension_type: 'height',
  nominal_value: 8.5,
  unit: 'ft',
  tolerance: undefined,
  display_format: 'decimal'
};

export const dimensionDiameterMetric: Dimension = {
  dimension_type: 'diameter',
  nominal_value: 25.4,
  unit: 'mm',
  tolerance: '±0.1',
  display_format: 'decimal'
};

export const dimensionThicknessLarge: Dimension = {
  dimension_type: 'thickness',
  nominal_value: 10000.5,
  unit: 'mm',
  tolerance: '±1.0',
  display_format: 'decimal'
};

export const dimensionRadiusSmall: Dimension = {
  dimension_type: 'radius',
  nominal_value: 0.001,
  unit: 'in',
  tolerance: '±0.0001',
  display_format: 'decimal'
};

export const allDimensionTypes: Dimension[] = [
  { dimension_type: 'length', nominal_value: 15.75, unit: 'in', tolerance: '±0.01', display_format: 'decimal' },
  { dimension_type: 'width', nominal_value: 11.75, unit: 'in', tolerance: '±0.01', display_format: 'decimal' },
  { dimension_type: 'height', nominal_value: 8.5, unit: 'in', tolerance: '±0.01', display_format: 'decimal' },
  { dimension_type: 'diameter', nominal_value: 25.4, unit: 'mm', tolerance: '±0.1', display_format: 'decimal' },
  { dimension_type: 'thickness', nominal_value: 0.5, unit: 'in', tolerance: '±0.01', display_format: 'decimal' },
  { dimension_type: 'radius', nominal_value: 2.5, unit: 'in', tolerance: '±0.01', display_format: 'decimal' },
  { dimension_type: 'depth', nominal_value: 3.25, unit: 'in', tolerance: '±0.01', display_format: 'decimal' },
  { dimension_type: 'spacing', nominal_value: 12.0, unit: 'in', tolerance: '±0.125', display_format: 'decimal' },
  { dimension_type: 'other', nominal_value: 45.0, unit: 'in', tolerance: undefined, display_format: 'decimal' },
];

// ============================================================================
// Specification Fixtures
// ============================================================================

export const specificationMaterial: Specification = {
  specification_type: 'material',
  value: 'A36 Steel',
  description: 'Standard structural steel'
};

export const specificationFinish: Specification = {
  specification_type: 'finish',
  value: 'Hot-Dip Galvanized',
  description: 'ASTM A123 galvanizing specification'
};

export const specificationGrade: Specification = {
  specification_type: 'grade',
  value: 'ASTM A572 Grade 50',
  description: undefined
};

export const specificationCoating: Specification = {
  specification_type: 'coating',
  value: 'Powder Coated Black',
  description: 'RAL 9005 finish'
};

export const specificationTreatment: Specification = {
  specification_type: 'treatment',
  value: 'Heat Treated',
  description: 'Normalized and tempered'
};

export const specificationStandard: Specification = {
  specification_type: 'standard',
  value: 'AISC 360-16',
  description: 'Specification for Structural Steel Buildings'
};

export const specificationOther: Specification = {
  specification_type: 'other',
  value: 'Custom Fabrication Required',
  description: undefined
};

export const specificationLongValue: Specification = {
  specification_type: 'standard',
  value: 'A'.repeat(250) + 'B'.repeat(5), // Exactly 255 characters
  description: 'Testing maximum length'
};

export const specificationSpecialCharacters: Specification = {
  specification_type: 'material',
  value: 'A36, Grade "A", 36 ksi', // Commas and quotes
  description: 'Testing CSV special character handling'
};

export const allSpecificationTypes: Specification[] = [
  { specification_type: 'material', value: 'A36 Steel', description: undefined },
  { specification_type: 'finish', value: 'Hot-Dip Galvanized', description: undefined },
  { specification_type: 'grade', value: 'ASTM A572 Grade 50', description: undefined },
  { specification_type: 'coating', value: 'Powder Coated Black', description: undefined },
  { specification_type: 'treatment', value: 'Heat Treated', description: undefined },
  { specification_type: 'standard', value: 'AISC 360-16', description: undefined },
  { specification_type: 'other', value: 'Custom Fabrication', description: undefined },
];

// ============================================================================
// Component Fixtures (Story 7.4 - Dimensions)
// ============================================================================

export const componentNoDimensions: ComponentWithData = {
  id: '11111111-1111-1111-1111-111111111111',
  piece_mark: 'G1',
  component_type: 'girder',
  dimensions: []
};

export const componentOneDimension: ComponentWithData = {
  id: '22222222-2222-2222-2222-222222222222',
  piece_mark: 'B1',
  component_type: 'beam',
  dimensions: [dimensionLengthDecimal]
};

export const componentTwoDimensions: ComponentWithData = {
  id: '33333333-3333-3333-3333-333333333333',
  piece_mark: 'C1',
  component_type: 'column',
  dimensions: [dimensionLengthDecimal, dimensionWidthFractional]
};

export const componentAllDimensions: ComponentWithData = {
  id: '44444444-4444-4444-4444-444444444444',
  piece_mark: 'P1',
  component_type: 'plate',
  dimensions: allDimensionTypes
};

export const componentFractionalDimensions: ComponentWithData = {
  id: '55555555-5555-5555-5555-555555555555',
  piece_mark: 'BR1',
  component_type: 'brace',
  dimensions: [
    { dimension_type: 'length', nominal_value: 15.75, unit: 'in', tolerance: '±0.01', display_format: 'fraction' },
    { dimension_type: 'width', nominal_value: 0.75, unit: 'in', tolerance: '±0.01', display_format: 'fraction' },
  ]
};

export const componentLargeSmallValues: ComponentWithData = {
  id: '66666666-6666-6666-6666-666666666666',
  piece_mark: 'T1',
  component_type: 'truss',
  dimensions: [dimensionThicknessLarge, dimensionRadiusSmall]
};

// ============================================================================
// Component Fixtures (Story 7.5 - Specifications)
// ============================================================================

export const componentNoSpecifications: ComponentWithData = {
  id: 'spec-11111111-1111-1111-1111-111111111111',
  piece_mark: 'G10',
  component_type: 'girder',
  specifications: []
};

export const componentOneSpecification: ComponentWithData = {
  id: 'spec-22222222-2222-2222-2222-222222222222',
  piece_mark: 'B10',
  component_type: 'beam',
  specifications: [specificationMaterial]
};

export const componentTwoSpecifications: ComponentWithData = {
  id: 'spec-33333333-3333-3333-3333-333333333333',
  piece_mark: 'C10',
  component_type: 'column',
  specifications: [specificationMaterial, specificationFinish]
};

export const componentAllSpecifications: ComponentWithData = {
  id: 'spec-44444444-4444-4444-4444-444444444444',
  piece_mark: 'P10',
  component_type: 'plate',
  specifications: allSpecificationTypes
};

export const componentLongSpecValue: ComponentWithData = {
  id: 'spec-55555555-5555-5555-5555-555555555555',
  piece_mark: 'BR10',
  component_type: 'brace',
  specifications: [specificationLongValue]
};

export const componentSpecialCharacters: ComponentWithData = {
  id: 'spec-66666666-6666-6666-6666-666666666666',
  piece_mark: 'T10',
  component_type: 'truss',
  specifications: [specificationSpecialCharacters]
};

// ============================================================================
// Integration Fixtures (Dimensions + Specifications)
// ============================================================================

export const componentDimensionsAndSpecifications: ComponentWithData = {
  id: 'integrated-77777777-7777-7777-7777-777777777777',
  piece_mark: 'G20',
  component_type: 'girder',
  dimensions: [
    { dimension_type: 'length', nominal_value: 20.0, unit: 'ft', tolerance: '±0.125', display_format: 'decimal' },
    { dimension_type: 'width', nominal_value: 12.0, unit: 'in', tolerance: '±0.01', display_format: 'decimal' },
    { dimension_type: 'height', nominal_value: 24.0, unit: 'in', tolerance: '±0.01', display_format: 'decimal' },
  ],
  specifications: [
    { specification_type: 'material', value: 'A572 Grade 50', description: undefined },
    { specification_type: 'finish', value: 'Primed', description: undefined },
  ]
};

export const componentSpecificationsNoDimensions: ComponentWithData = {
  id: 'spec-only-88888888-8888-8888-8888-888888888888',
  piece_mark: 'C20',
  component_type: 'column',
  dimensions: [],
  specifications: [
    { specification_type: 'material', value: 'A36 Steel', description: undefined },
    { specification_type: 'coating', value: 'Fireproofing Required', description: undefined },
  ]
};

export const componentDimensionsNoSpecifications: ComponentWithData = {
  id: 'dim-only-99999999-9999-9999-9999-999999999999',
  piece_mark: 'B20',
  component_type: 'beam',
  dimensions: [
    { dimension_type: 'length', nominal_value: 15.5, unit: 'ft', tolerance: '±0.125', display_format: 'decimal' },
  ],
  specifications: []
};

// ============================================================================
// Complete Test Datasets
// ============================================================================

/**
 * Complete test dataset for Story 7.4 (Export Dimension Values)
 *
 * Covers all test data requirements:
 * - Components with NO dimensions (sparse data)
 * - Components with 1-2 dimensions (common case)
 * - Component with ALL 9 dimension types (edge case)
 * - Component with fractional dimensions
 * - Component with very large/small values
 */
export const exportTestDatasetDimensions: ComponentWithData[] = [
  componentNoDimensions,
  componentOneDimension,
  componentTwoDimensions,
  componentAllDimensions,
  componentFractionalDimensions,
  componentLargeSmallValues,
];

/**
 * Complete test dataset for Story 7.5 (Export Specification Values)
 *
 * Covers all test data requirements:
 * - Components with NO specifications (sparse data)
 * - Components with 1-2 specifications (common case)
 * - Component with ALL 7 specification types (edge case)
 * - Component with long specification values
 * - Component with special characters in values
 */
export const exportTestDatasetSpecifications: ComponentWithData[] = [
  componentNoSpecifications,
  componentOneSpecification,
  componentTwoSpecifications,
  componentAllSpecifications,
  componentLongSpecValue,
  componentSpecialCharacters,
];

/**
 * Complete integrated test dataset (Dimensions + Specifications)
 *
 * Tests the full export feature with components having:
 * - Both dimensions AND specifications
 * - Only specifications (no dimensions)
 * - Only dimensions (no specifications)
 * - Neither (sparse data edge case)
 */
export const exportTestDatasetComplete: ComponentWithData[] = [
  componentDimensionsAndSpecifications,
  componentSpecificationsNoDimensions,
  componentDimensionsNoSpecifications,
  {
    id: 'neither-00000000-0000-0000-0000-000000000000',
    piece_mark: 'EMPTY',
    component_type: 'other',
    dimensions: [],
    specifications: []
  }
];

// ============================================================================
// Sparse Data Test Datasets
// ============================================================================

/**
 * Sparse dimension dataset where each component has different dimension types
 *
 * Expected CSV columns: Length, Width, Height (all 3 appear despite sparsity)
 */
export const sparseDimensionDataset: ComponentWithData[] = [
  {
    id: 'sparse-a',
    piece_mark: 'A1',
    component_type: 'beam',
    dimensions: [{ dimension_type: 'length', nominal_value: 10.0, unit: 'in', tolerance: '±0.01', display_format: 'decimal' }]
  },
  {
    id: 'sparse-b',
    piece_mark: 'B1',
    component_type: 'beam',
    dimensions: [{ dimension_type: 'width', nominal_value: 8.0, unit: 'in', tolerance: '±0.01', display_format: 'decimal' }]
  },
  {
    id: 'sparse-c',
    piece_mark: 'C1',
    component_type: 'beam',
    dimensions: [{ dimension_type: 'height', nominal_value: 6.0, unit: 'in', tolerance: '±0.01', display_format: 'decimal' }]
  },
];

/**
 * Sparse specification dataset where each component has different specification types
 *
 * Expected CSV columns: Material, Finish, Grade (all 3 appear despite sparsity)
 */
export const sparseSpecificationDataset: ComponentWithData[] = [
  {
    id: 'sparse-spec-a',
    piece_mark: 'A10',
    component_type: 'beam',
    specifications: [{ specification_type: 'material', value: 'A36 Steel', description: undefined }]
  },
  {
    id: 'sparse-spec-b',
    piece_mark: 'B10',
    component_type: 'beam',
    specifications: [{ specification_type: 'finish', value: 'Galvanized', description: undefined }]
  },
  {
    id: 'sparse-spec-c',
    piece_mark: 'C10',
    component_type: 'beam',
    specifications: [{ specification_type: 'grade', value: 'Grade 50', description: undefined }]
  },
];

// ============================================================================
// Drawing Fixtures (for full export workflow testing)
// ============================================================================

export const mockDrawingWithDimensions: Drawing = {
  id: 'drawing-1',
  file_name: 'bridge-section-a.pdf',
  original_name: 'Bridge Section A.pdf',
  project_name: 'Test Bridge Project',
  upload_date: '2025-10-15T10:00:00Z',
  processing_status: 'completed',
  components: exportTestDatasetDimensions
};

export const mockDrawingWithSpecifications: Drawing = {
  id: 'drawing-2',
  file_name: 'bridge-section-b.pdf',
  original_name: 'Bridge Section B.pdf',
  project_name: 'Test Bridge Project',
  upload_date: '2025-10-15T11:00:00Z',
  processing_status: 'completed',
  components: exportTestDatasetSpecifications
};

export const mockDrawingComplete: Drawing = {
  id: 'drawing-3',
  file_name: 'bridge-section-complete.pdf',
  original_name: 'Bridge Section Complete.pdf',
  project_name: 'Test Bridge Project',
  upload_date: '2025-10-15T12:00:00Z',
  processing_status: 'completed',
  components: exportTestDatasetComplete
};

// ============================================================================
// Format Conversion Test Cases
// ============================================================================

export interface DimensionFormatTestCase {
  input: Dimension;
  expectedCombined: string;
  expectedValueOnly: string;
}

export const dimensionFormatTestCases: DimensionFormatTestCase[] = [
  {
    input: dimensionLengthDecimal,
    expectedCombined: '15.75 in ±0.01',
    expectedValueOnly: '15.75'
  },
  {
    input: dimensionWidthFractional,
    expectedCombined: '11.75 in ±0.015',
    expectedValueOnly: '11.75'
  },
  {
    input: dimensionHeightNoTolerance,
    expectedCombined: '8.50 ft',
    expectedValueOnly: '8.50'
  },
  {
    input: dimensionDiameterMetric,
    expectedCombined: '25.40 mm ±0.1',
    expectedValueOnly: '25.40'
  },
];

// ============================================================================
// CSV Escaping Test Cases
// ============================================================================

export interface CSVEscapingTestCase {
  input: string;
  expectedCSV: string;
  description: string;
}

export const csvEscapingTestCases: CSVEscapingTestCase[] = [
  {
    input: 'A36, Grade "A", 36 ksi',
    expectedCSV: '"A36, Grade ""A"", 36 ksi"',
    description: 'Commas and quotes'
  },
  {
    input: 'Material with\nnewline',
    expectedCSV: '"Material with\nnewline"',
    description: 'Newline character'
  },
  {
    input: 'Simple value',
    expectedCSV: 'Simple value',
    description: 'No special characters'
  },
  {
    input: 'Value with "quotes" only',
    expectedCSV: '"Value with ""quotes"" only"',
    description: 'Quotes only'
  },
  {
    input: 'ASTM A123, A153, A307',
    expectedCSV: '"ASTM A123, A153, A307"',
    description: 'Multiple commas'
  },
];

// ============================================================================
// Helper Functions for Tests
// ============================================================================

/**
 * Create a mock component with specified dimensions
 */
export function createComponentWithDimensions(
  pieceMark: string,
  dimensions: Dimension[]
): ComponentWithData {
  return {
    id: `mock-${pieceMark.toLowerCase()}-${Date.now()}`,
    piece_mark: pieceMark,
    component_type: 'beam',
    dimensions
  };
}

/**
 * Create a mock component with specified specifications
 */
export function createComponentWithSpecifications(
  pieceMark: string,
  specifications: Specification[]
): ComponentWithData {
  return {
    id: `mock-${pieceMark.toLowerCase()}-${Date.now()}`,
    piece_mark: pieceMark,
    component_type: 'beam',
    specifications
  };
}

/**
 * Create a mock component with both dimensions and specifications
 */
export function createIntegratedComponent(
  pieceMark: string,
  dimensions: Dimension[] = [],
  specifications: Specification[] = []
): ComponentWithData {
  return {
    id: `mock-${pieceMark.toLowerCase()}-${Date.now()}`,
    piece_mark: pieceMark,
    component_type: 'beam',
    dimensions,
    specifications
  };
}

/**
 * Create a mock drawing with specified components
 */
export function createMockDrawing(
  fileName: string,
  components: ComponentWithData[]
): Drawing {
  return {
    id: `mock-drawing-${Date.now()}`,
    file_name: fileName,
    original_name: fileName,
    project_name: 'Test Project',
    upload_date: new Date().toISOString(),
    processing_status: 'completed',
    components
  };
}
