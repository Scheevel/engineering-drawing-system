/**
 * Schema Management Type Definitions
 *
 * Comprehensive TypeScript interfaces for schema management,
 * extending the existing API types with management-specific interfaces
 * and React component prop definitions.
 */

import {
  ComponentSchema,
  ComponentSchemaField,
  ComponentSchemaCreate,
  ComponentSchemaUpdate,
  ComponentSchemaFieldCreate,
  ComponentSchemaFieldUpdate,
  FlexibleComponent,
  SchemaFieldType,
  SchemaValidationResult,
} from '../services/api';

// ========================================
// SCHEMA MANAGEMENT EXTENSIONS
// ========================================

// Enhanced management interfaces (extending what's in schemaManagementService)
export interface SchemaUsageStats {
  schema_id: string;
  schema_name: string;
  component_count: number;
  last_used: string | null;
  created_at: string;
  is_active: boolean;
  is_default: boolean;
}

export interface SchemaMigrationPlan {
  source_schema_id: string;
  target_schema_id: string;
  affected_components: number;
  field_mapping: Record<string, string>;
  potential_data_loss: string[];
  migration_warnings: string[];
}

export interface BulkValidationResult {
  total_validated: number;
  valid_count: number;
  invalid_count: number;
  validation_results: Array<{
    component_id: string;
    piece_mark: string;
    is_valid: boolean;
    errors: string[];
  }>;
}

export interface SchemaMetrics {
  total_schemas: number;
  active_schemas: number;
  default_schemas: number;
  field_usage_stats: Array<{
    field_type: string;
    usage_count: number;
    average_per_schema: number;
  }>;
  most_used_schemas: SchemaUsageStats[];
}

// Field configuration validation
export interface FieldConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Schema comparison and diff
export interface SchemaFieldDiff {
  field_name: string;
  change_type: 'added' | 'removed' | 'modified' | 'unchanged';
  old_value?: ComponentSchemaField;
  new_value?: ComponentSchemaField;
  impact_level: 'none' | 'low' | 'medium' | 'high';
}

export interface SchemaDiff {
  schema_info: {
    old_name: string;
    new_name: string;
    old_version: number;
    new_version: number;
  };
  field_changes: SchemaFieldDiff[];
  summary: {
    fields_added: number;
    fields_removed: number;
    fields_modified: number;
    breaking_changes: number;
  };
}

// Schema import/export
export interface SchemaExportData {
  schema: Omit<ComponentSchema, 'id' | 'created_at' | 'updated_at'>;
  metadata: {
    exported_at: string;
    exported_by?: string;
    export_version: string;
    component_count?: number;
  };
}

export interface SchemaImportResult {
  success: boolean;
  imported_schema?: ComponentSchema;
  errors: string[];
  warnings: string[];
  field_mapping?: Record<string, string>;
}

// Schema templates
export interface SchemaTemplate {
  id: string;
  name: string;
  description: string;
  category: 'engineering' | 'construction' | 'manufacturing' | 'general';
  fields: ComponentSchemaFieldCreate[];
  preview_component?: Record<string, any>;
  is_system_template: boolean;
  usage_count: number;
}

export interface SchemaTemplateListResponse {
  templates: SchemaTemplate[];
  categories: string[];
  total: number;
}

// ========================================
// REACT COMPONENT PROP INTERFACES
// ========================================

// Base props for schema management components
export interface BaseSchemaManagementProps {
  projectId?: string;
  onError?: (error: Error) => void;
  onSuccess?: (message: string) => void;
}

// Schema list component props
export interface SchemaListProps extends BaseSchemaManagementProps {
  selectedSchemaId?: string;
  onSchemaSelect: (schema: ComponentSchema) => void;
  onSchemaCreate?: () => void;
  onSchemaEdit?: (schema: ComponentSchema) => void;
  onSchemaDelete?: (schema: ComponentSchema) => void;
  showUsageStats?: boolean;
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  filterOptions?: {
    showInactive?: boolean;
    category?: string;
    searchTerm?: string;
  };
}

// Schema editor component props
export interface SchemaEditorProps extends BaseSchemaManagementProps {
  schema?: ComponentSchema;
  mode: 'create' | 'edit' | 'view';
  open: boolean;
  onClose: () => void;
  onSave?: (schema: ComponentSchema) => void;
  allowFieldReorder?: boolean;
  showAdvancedOptions?: boolean;
  validationOptions?: {
    enableRealTimeValidation?: boolean;
    showFieldPreview?: boolean;
  };
}

// Schema field editor props
export interface SchemaFieldEditorProps {
  field?: ComponentSchemaField;
  fieldType?: SchemaFieldType;
  mode: 'create' | 'edit' | 'view';
  open: boolean;
  onClose: () => void;
  onSave: (field: ComponentSchemaFieldCreate | ComponentSchemaFieldUpdate) => void;
  onDelete?: () => void;
  existingFieldNames: string[];
  displayOrder: number;
  showHelp?: boolean;
  validationOptions?: {
    enableConfigValidation?: boolean;
    showTypeHelp?: boolean;
  };
}

// Field configuration component props
export interface FieldConfigurationProps {
  fieldType: SchemaFieldType;
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
  errors?: string[];
  disabled?: boolean;
  showHelp?: boolean;
}

// Schema selection component props
export interface SchemaSelectionProps {
  projectId: string;
  selectedSchemaId?: string;
  onSchemaChange: (schemaId: string, schema?: ComponentSchema) => void;
  includeGlobal?: boolean;
  allowCreate?: boolean;
  filterActive?: boolean;
  placeholder?: string;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'outlined' | 'filled' | 'standard';
}

// Schema validation component props
export interface SchemaValidationProps {
  schemaId: string;
  data: Record<string, any>;
  onValidationChange?: (result: SchemaValidationResult) => void;
  showErrors?: boolean;
  showWarnings?: boolean;
  realTimeValidation?: boolean;
  debounceMs?: number;
}

// Schema migration component props
export interface SchemaMigrationProps extends BaseSchemaManagementProps {
  sourceSchemaId: string;
  targetSchemaId?: string;
  componentIds: string[];
  open: boolean;
  onClose: () => void;
  onMigrationComplete?: (result: any) => void;
  showPreview?: boolean;
  allowCustomMapping?: boolean;
}

// Schema usage stats component props
export interface SchemaUsageStatsProps extends BaseSchemaManagementProps {
  schemaId?: string;
  showComponentList?: boolean;
  showMetrics?: boolean;
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
  refreshInterval?: number;
}

// Schema comparison component props
export interface SchemaComparisonProps {
  leftSchemaId: string;
  rightSchemaId: string;
  onDiffCalculated?: (diff: SchemaDiff) => void;
  showSideBySide?: boolean;
  highlightChanges?: boolean;
  expandAll?: boolean;
}

// ========================================
// FORM AND UI STATE INTERFACES
// ========================================

// Form state for schema creation/editing
export interface SchemaFormState {
  name: string;
  description: string;
  is_default: boolean;
  fields: Array<ComponentSchemaFieldCreate & { tempId?: string }>;
  validation: {
    name?: string[];
    description?: string[];
    fields?: Record<string, string[]>;
  };
  isDirty: boolean;
  isValid: boolean;
}

// Field form state
export interface FieldFormState {
  field_name: string;
  field_type: SchemaFieldType;
  field_config: Record<string, any>;
  help_text: string;
  display_order: number;
  is_required: boolean;
  validation: {
    field_name?: string[];
    field_config?: string[];
  };
  isDirty: boolean;
  isValid: boolean;
}

// UI state for schema management
export interface SchemaManagementUIState {
  selectedSchemaId?: string;
  activeTab: 'schemas' | 'templates' | 'usage' | 'settings';
  filterState: {
    searchTerm: string;
    showInactive: boolean;
    category?: string;
    sortBy: 'name' | 'created_at' | 'usage_count' | 'component_count';
    sortOrder: 'asc' | 'desc';
  };
  viewMode: 'list' | 'grid' | 'table';
  showAdvanced: boolean;
}

// Drag and drop state for field reordering
export interface FieldDragState {
  draggedField?: ComponentSchemaField;
  dragOverField?: ComponentSchemaField;
  dragDirection?: 'above' | 'below';
  isDragging: boolean;
}

// ========================================
// UTILITY TYPES
// ========================================

// Helper type for optional field creation
export type PartialFieldCreate = Partial<ComponentSchemaFieldCreate> & {
  field_type: SchemaFieldType;
};

// Helper type for field updates with context
export type FieldUpdateWithContext = ComponentSchemaFieldUpdate & {
  fieldId: string;
  schemaId: string;
  previousValue?: ComponentSchemaField;
};

// Schema operation result
export type SchemaOperationResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
};

// Field type configuration schemas
export interface FieldTypeConfig {
  text: {
    placeholder?: string;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    multiline?: boolean;
  };
  number: {
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    precision?: number;
  };
  checkbox: {
    trueLabel?: string;
    falseLabel?: string;
    indeterminate?: boolean;
  };
  textarea: {
    placeholder?: string;
    maxLength?: number;
    minLength?: number;
    rows?: number;
    autoResize?: boolean;
  };
  date: {
    format?: string;
    minDate?: string;
    maxDate?: string;
    showTime?: boolean;
  };
}

// Type guard functions
export const isSchemaField = (obj: any): obj is ComponentSchemaField => {
  return obj && typeof obj.field_name === 'string' && typeof obj.field_type === 'string';
};

export const isFlexibleComponent = (obj: any): obj is FlexibleComponent => {
  return obj && typeof obj.piece_mark === 'string' && typeof obj.dynamic_data === 'object';
};

export const isValidSchemaFieldType = (type: string): type is SchemaFieldType => {
  return ['text', 'number', 'checkbox', 'textarea', 'date'].includes(type);
};

// Default values (FR-5: AC 23)
export const DEFAULT_FIELD_CONFIG: Record<SchemaFieldType, Record<string, any>> = {
  text: { placeholder: '', maxLength: 255 },
  number: { min: 0, step: 1 },
  checkbox: { trueLabel: 'Yes', falseLabel: 'No' },
  textarea: { placeholder: '', rows: 3, maxLength: 1000 },
  date: { format: 'YYYY-MM-DD', showTime: false },
};

export const FIELD_TYPE_LABELS: Record<SchemaFieldType, string> = {
  text: 'Text Input',
  number: 'Number Input',
  checkbox: 'Checkbox',
  textarea: 'Multi-line Text',
  date: 'Date Picker',
};

export const FIELD_TYPE_DESCRIPTIONS: Record<SchemaFieldType, string> = {
  text: 'Single line text input for short text values',
  number: 'Numeric input with optional min/max validation',
  checkbox: 'Boolean checkbox for yes/no values',
  textarea: 'Multi-line text input for longer text content',
  date: 'Date picker with optional time selection',
};