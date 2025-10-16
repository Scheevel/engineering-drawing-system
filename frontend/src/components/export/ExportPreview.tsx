/**
 * ExportPreview - Component-centric CSV export preview
 *
 * Displays a virtualized preview of component data (Story 7.1.1):
 * - Each row represents 1 component (not 1 drawing)
 * - Drawing context fields are available alongside component data
 * - Virtualization: Only ~20-25 visible rows rendered for performance
 * - Performance warning triggers at 300+ components
 */
import React, { useMemo } from 'react';
import { FixedSizeList } from 'react-window';
import {
  Box,
  Paper,
  Typography,
  Alert,
} from '@mui/material';
import { ExportField } from '../../types/export.types';
import { formatValue, formatDimensionValue } from '../../services/exportService.ts';

interface ExportPreviewProps {
  drawings: any[];
  selectedFields: ExportField[];
}

const ExportPreview: React.FC<ExportPreviewProps> = ({
  drawings,
  selectedFields,
}) => {
  const PERFORMANCE_WARNING_THRESHOLD = 300;

  // Calculate total component count
  const componentCount = useMemo(() => {
    return drawings.reduce((sum, drawing) => sum + (drawing.components?.length || 0), 0);
  }, [drawings]);

  // Show performance warning for large datasets (component-centric threshold)
  const showPerformanceWarning = componentCount > PERFORMANCE_WARNING_THRESHOLD;

  // Memoize preview data to avoid recalculation (component-centric: flatten components)
  const previewData = useMemo(() => {
    return drawings.flatMap(drawing =>
      (drawing.components || []).map((component: any) => {
        const row: Record<string, string> = {};

        selectedFields.forEach(field => {
          let value: any;

          // Story 7.4: Handle dimension fields (dimension_length, dimension_width, etc.)
          if (field.key.startsWith('dimension_')) {
            const dimensionType = field.key.replace('dimension_', '');
            // Find dimension of this type for this component
            const dimension = component.dimensions?.find(
              (d: any) => d.dimension_type === dimensionType
            );
            // Format dimension value based on format option (from field.meta)
            const formatOption = field.meta?.formatOption || 'combined';
            value = formatDimensionValue(dimension, formatOption);
            // Store directly (already formatted by formatDimensionValue)
            row[field.key] = value || '';
          }
          // Handle component fields (primary data)
          else if (field.key.startsWith('component_')) {
            const componentKey = field.key.replace('component_', '');
            // Check top-level first, then check dynamic_data (for flexible schema fields)
            value = component[componentKey] || component.dynamic_data?.[componentKey];
            // Format value for display (pass both component and drawing for URL generation)
            row[field.key] = formatValue(value, field.type, { component, drawing });
          }
          // Handle drawing context fields (prefixed with 'drawing_')
          else if (field.key.startsWith('drawing_')) {
            const drawingKey = field.key.replace('drawing_', '');
            value = drawing[drawingKey];
            // Format value for display
            row[field.key] = formatValue(value, field.type, { component, drawing });
          }
          // Handle direct fields (backward compatibility)
          else {
            value = component[field.key] || drawing[field.key];
            // Format value for display
            row[field.key] = formatValue(value, field.type, { component, drawing });
          }
        });

        return row;
      })
    );
  }, [drawings, selectedFields]);

  // Virtualized row component
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const drawing = previewData[index];

    return (
      <Box
        style={style}
        sx={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: index % 2 === 0 ? 'background.default' : 'action.hover',
        }}
      >
        {selectedFields.map((field, colIndex) => {
          const value = drawing[field.key];
          const displayValue = value !== '' ? value : '—';

          return (
            <Box
              key={field.key}
              sx={{
                flex: 1,
                minWidth: 120,
                maxWidth: 200,
                px: 2,
                py: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <Typography variant="body2" noWrap title={displayValue}>
                {displayValue}
              </Typography>
            </Box>
          );
        })}
      </Box>
    );
  };

  // Header row component (sticky)
  const HeaderRow = () => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'primary.main',
        color: 'primary.contrastText',
        position: 'sticky',
        top: 0,
        zIndex: 1,
        height: 52,
        borderBottom: '2px solid',
        borderColor: 'primary.dark',
      }}
    >
      {selectedFields.map(field => (
        <Box
          key={field.key}
          sx={{
            flex: 1,
            minWidth: 120,
            maxWidth: 200,
            px: 2,
            py: 1,
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <Typography variant="subtitle2" noWrap title={field.label}>
            {field.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );

  // Handle empty states
  if (drawings.length === 0 || componentCount === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'action.hover' }}>
        <Typography variant="body2" color="text.secondary">
          No components to preview
        </Typography>
      </Paper>
    );
  }

  if (selectedFields.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'action.hover' }}>
        <Typography variant="body2" color="text.secondary">
          Select at least one field to preview
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Count display (component-centric) */}
      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing all {componentCount} components
        </Typography>
        {showPerformanceWarning && (
          <Alert severity="warning" sx={{ py: 0, '& .MuiAlert-message': { py: 0.5 } }}>
            Large dataset detected ({componentCount} components). Export may take a few seconds.
          </Alert>
        )}
      </Box>

      {/* Preview table with virtualization */}
      <Paper sx={{ height: 400, overflow: 'hidden' }}>
        {/* Sticky header */}
        <HeaderRow />

        {/* Virtualized list (component rows) */}
        <FixedSizeList
          height={348} // 400 - 52 (header height)
          itemCount={previewData.length} // Component count, not drawing count
          itemSize={52} // Match existing table row height for consistency
          width="100%"
          overscanCount={5} // Render 5 extra rows for smooth scrolling
        >
          {Row}
        </FixedSizeList>
      </Paper>
    </Box>
  );
};

export default ExportPreview;
