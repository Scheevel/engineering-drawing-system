import Papa from 'papaparse';
import { ExportField } from '../types/export.types';

/**
 * Format a field value based on its type for CSV export
 */
export const formatValue = (value: any, fieldType: string, drawing?: any): string => {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }

  switch (fieldType) {
    case 'date':
      // Convert ISO timestamps to Excel-compatible format
      try {
        const date = new Date(value);
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch (e) {
        return String(value);
      }

    case 'url':
      // Generate Excel HYPERLINK formula for clickable links
      if (drawing) {
        const baseUrl = window.location.origin;
        const url = `${baseUrl}/drawings/${drawing.id}/components/${drawing.id}`;
        const linkText = drawing.file_name || 'View Component';

        // Excel formula: =HYPERLINK("url", "display text")
        // CSV must double-quote internal quotes: =HYPERLINK(""url"", ""text"")
        return `=HYPERLINK("${url}", "${linkText}")`;
      }
      return '';

    case 'number':
      return String(value);

    default:
      return String(value);
  }
};

/**
 * Dynamically discover component data fields from actual drawing data
 * Data-driven approach: export what exists, not what schema defines
 */
export const getComponentDataFields = (drawings: any[]): ExportField[] => {
  const fields: ExportField[] = [];
  const discoveredKeys = new Set<string>();

  // Iterate through all drawings to discover all possible component fields
  drawings.forEach(drawing => {
    if (drawing.components && drawing.components.length > 0) {
      drawing.components.forEach((component: any) => {
        Object.keys(component).forEach(key => {
          // Exclude internal/system keys
          if (
            !discoveredKeys.has(key) &&
            key !== 'id' &&
            key !== 'drawing_id' &&
            key !== 'created_at' &&
            key !== 'updated_at'
          ) {
            discoveredKeys.add(key);
            fields.push({
              key: `component_${key}`,
              label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // "piece_mark" → "Piece Mark"
              type: typeof component[key] === 'number' ? 'number' : 'string',
              group: 'components'
            });
          }
        });
      });
    }
  });

  return fields;
};

/**
 * Generate CSV content from drawings and selected fields
 */
export const generateCSV = (
  drawings: any[],
  selectedFields: ExportField[]
): string => {
  // Map drawings to rows with only selected fields
  const data = drawings.map(drawing => {
    const row: Record<string, string> = {};

    selectedFields.forEach(field => {
      // Extract value from drawing object
      let value: any;

      // Handle component fields (prefixed with 'component_')
      if (field.key.startsWith('component_')) {
        const componentKey = field.key.replace('component_', '');
        if (drawing.components && drawing.components.length > 0) {
          value = drawing.components[0][componentKey];
        }
      } else {
        value = drawing[field.key as keyof typeof drawing];
      }

      // Format value based on field type
      row[field.label] = formatValue(value, field.type, drawing);
    });

    return row;
  });

  // Generate CSV using papaparse
  const csv = Papa.unparse(data, {
    header: true,
    quotes: true,          // Quote all fields to handle commas
    skipEmptyLines: true,
  });

  return csv;
};

/**
 * Trigger browser download of CSV content
 */
export const downloadCSV = (csvContent: string, filename?: string): void => {
  // Generate filename with timestamp if not provided
  const date = new Date();
  const defaultFilename = `drawings-export-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.csv`;
  const finalFilename = filename || defaultFilename;

  // Create Blob with CSV content
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create temporary download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', finalFilename);
  link.style.visibility = 'hidden';

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Safe wrapper for CSV export with error handling
 */
export const safeExportDrawingsToCSV = (
  drawings: any[],
  selectedFields: ExportField[],
  onSuccess?: () => void,
  onError?: (error: Error) => void
): void => {
  try {
    // Validate inputs
    if (!drawings || drawings.length === 0) {
      throw new Error('No drawings to export');
    }

    if (!selectedFields || selectedFields.length === 0) {
      throw new Error('No fields selected for export');
    }

    // Generate CSV
    const csv = generateCSV(drawings, selectedFields);

    // Download CSV
    downloadCSV(csv);

    // Success callback
    if (onSuccess) {
      onSuccess();
    }
  } catch (error) {
    console.error('Error exporting to CSV:', error);

    // Error callback
    if (onError && error instanceof Error) {
      onError(error);
    }
  }
};
