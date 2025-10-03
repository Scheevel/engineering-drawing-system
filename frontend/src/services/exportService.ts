import Papa from 'papaparse';
import { ExportField } from '../types/export.types';

/**
 * Format a field value based on its type for CSV export
 * @param value - The value to format
 * @param fieldType - The type of field (date, url, number, string)
 * @param context - Optional context object with component and drawing data for URL generation
 */
export const formatValue = (
  value: any,
  fieldType: string,
  context?: { component?: any; drawing?: any }
): string => {
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
      if (context?.component && context?.drawing) {
        const baseUrl = window.location.origin;
        const url = `${baseUrl}/drawings/${context.drawing.id}/components/${context.component.id}`;
        const linkText = context.component.piece_mark || 'View Component';

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
 *
 * @param drawings - Array of drawings with components
 * @param existingFieldKeys - Optional set of existing field keys to exclude (prevents duplicates)
 */
export const getComponentDataFields = (drawings: any[], existingFieldKeys?: Set<string>): ExportField[] => {
  const fields: ExportField[] = [];
  const discoveredKeys = new Set<string>();

  // Iterate through all drawings to discover all possible component fields
  drawings.forEach(drawing => {
    if (drawing.components && drawing.components.length > 0) {
      drawing.components.forEach((component: any) => {
        // Discover top-level component fields
        Object.keys(component).forEach(key => {
          const fieldKey = `component_${key}`;

          // Exclude internal/system keys and fields that already exist in static config
          if (
            !discoveredKeys.has(key) &&
            key !== 'id' &&
            key !== 'drawing_id' &&
            key !== 'created_at' &&
            key !== 'updated_at' &&
            key !== 'dynamic_data' && // Exclude dynamic_data itself (we'll introspect it separately)
            (!existingFieldKeys || !existingFieldKeys.has(fieldKey))
          ) {
            discoveredKeys.add(key);
            fields.push({
              key: fieldKey,
              label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // "piece_mark" → "Piece Mark"
              type: typeof component[key] === 'number' ? 'number' : 'string',
              group: 'components'
            });
          }
        });

        // Discover nested fields from dynamic_data (flexible schema fields)
        // Sparse Matrix Pattern: CSV will contain union of ALL fields discovered across ALL components
        // Components without a field will have empty cells in that column
        if (component.dynamic_data && typeof component.dynamic_data === 'object') {
          Object.keys(component.dynamic_data).forEach(key => {
            const fieldKey = `component_${key}`;

            if (
              !discoveredKeys.has(key) &&
              (!existingFieldKeys || !existingFieldKeys.has(fieldKey))
            ) {
              discoveredKeys.add(key);
              fields.push({
                key: fieldKey,
                label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                type: typeof component.dynamic_data[key] === 'number' ? 'number' : 'string',
                group: 'components'
              });
            }
          });
        }
      });
    }
  });

  return fields;
};

/**
 * Generate CSV content from drawings and selected fields (component-centric)
 * Each component becomes a separate row with drawing context fields
 */
export const generateCSV = (
  drawings: any[],
  selectedFields: ExportField[]
): string => {
  // Flatten components from all drawings (component-centric model)
  // Each component becomes one row with drawing context
  const data = drawings.flatMap(drawing =>
    (drawing.components || []).map((component: any) => {
      const row: Record<string, string> = {};

      selectedFields.forEach(field => {
        let value: any;

        // Handle component fields (primary data)
        if (field.key.startsWith('component_')) {
          const componentKey = field.key.replace('component_', '');
          // Check top-level first, then check dynamic_data (for flexible schema fields)
          value = component[componentKey] || component.dynamic_data?.[componentKey];
        }
        // Handle drawing context fields (prefixed with 'drawing_')
        else if (field.key.startsWith('drawing_')) {
          const drawingKey = field.key.replace('drawing_', '');
          value = drawing[drawingKey];
        }
        // Handle direct fields (backward compatibility)
        else {
          value = component[field.key] || drawing[field.key];
        }

        // Format value based on field type (pass both component and drawing for URL generation)
        row[field.label] = formatValue(value, field.type, { component, drawing });
      });

      return row;
    })
  );

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
 * Safe wrapper for CSV export with error handling (component-centric)
 */
export const safeExportDrawingsToCSV = (
  drawings: any[],
  selectedFields: ExportField[],
  onSuccess?: () => void,
  onError?: (error: Error) => void
): void => {
  try {
    // Calculate total component count
    const componentCount = drawings.reduce(
      (sum, drawing) => sum + (drawing.components?.length || 0),
      0
    );

    // Validate inputs
    if (!drawings || drawings.length === 0 || componentCount === 0) {
      throw new Error('No components to export');
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
