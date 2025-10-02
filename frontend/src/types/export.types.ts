// Export TypeScript type definitions for CSV export functionality

export interface ExportField {
  key: string;                // Field key to extract from Drawing object
  label: string;              // Human-readable label for CSV header
  type: 'string' | 'number' | 'date' | 'url';  // Field type for formatting
  group: 'basic' | 'project' | 'components' | 'metadata';  // Accordion group
}

export interface FieldGroup {
  id: string;                 // Unique group identifier
  label: string;              // Display name for accordion
  icon?: React.ReactNode;     // Optional icon for group
  fields: ExportField[];      // Fields belonging to this group
  defaultExpanded?: boolean;  // Whether accordion starts expanded
}

export interface ExportConfig {
  selectedFields: string[];   // Array of selected field keys
  performanceWarning: boolean; // Show warning for large datasets
}

export interface ExportDialogProps {
  open: boolean;
  drawings: any[];            // Drawings to export (from DrawingsListPage)
  onClose: () => void;
}
