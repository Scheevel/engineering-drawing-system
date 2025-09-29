/**
 * React Context Providers
 *
 * Context providers for global state management,
 * including schema configuration and application state.
 */

// Schema editing context for complex state management
export {
  SchemaEditingProvider,
  useSchemaEditing,
  type SchemaEditingState,
  type SchemaEditingAction,
  type FieldEditState,
  type EditOperation,
  createEditOperation,
  generateFieldId,
} from './SchemaEditingContext';