// Export all flexible schema components for easy importing
export { default as SchemaAwareForm } from './SchemaAwareForm';
export { default as TypeSelectionDropdown } from './TypeSelectionDropdown';
export { default as ContextualHelpPanel } from './ContextualHelpPanel';
export { default as FlexibleComponentCard } from './FlexibleComponentCard';

// Re-export types that components might need
export type {
  ComponentSchema,
  ComponentSchemaField,
  FlexibleComponent,
  FlexibleComponentCreate,
  FlexibleComponentUpdate,
  TypeLockStatus,
  SchemaValidationResult,
  SchemaFieldType,
} from '../../services/api.ts';