/**
 * Test Utilities Export
 *
 * Central export point for all schema management testing utilities
 */

// Test Wrappers
export {
  SchemaTestWrapper,
  MinimalTestWrapper,
  HookTestWrapper,
  type SchemaTestWrapperProps,
  type SchemaEditingState,
} from './SchemaTestWrapper';

// Mock Data Generators
export {
  createMockSchema,
  createMockField,
  createMockFieldCreate,
  createMockSchemaCreate,
  createMockSchemas,
  createMockFlexibleComponent,
  createEdgeCaseSchemas,
  createMockApiResponses,
  createMockFormData,
  getDefaultFieldConfig,
  resetMockIdCounter,
  MOCK_SCHEMAS,
  MOCK_EDGE_CASE_SCHEMAS,
  MOCK_API_RESPONSES,
} from './mockSchemaData';

// Test Helper Functions
export {
  schemaTestHelpers,
  customMatchers,
  setupTest,
  cleanupTest,
} from './schemaTestHelpers';

// Accessibility Helpers
export {
  accessibilityHelpers,
  runAccessibilityTestSuite,
  EXPECTED_ARIA_ROLES,
  REQUIRED_ARIA_ATTRIBUTES,
} from './accessibilityHelpers';

// Re-export default helpers
export { default as SchemaTestWrapper } from './SchemaTestWrapper';
export { default as schemaTestHelpers } from './schemaTestHelpers';
export { default as accessibilityHelpers } from './accessibilityHelpers';