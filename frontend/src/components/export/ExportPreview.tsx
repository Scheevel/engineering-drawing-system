import React, { useMemo } from 'react';
import { FixedSizeList } from 'react-window';
import {
  Box,
  Paper,
  Typography,
  Alert,
} from '@mui/material';
import { ExportField } from '../../types/export.types';
import { formatValue } from '../../services/exportService';

interface ExportPreviewProps {
  drawings: any[];
  selectedFields: ExportField[];
}

const ExportPreview: React.FC<ExportPreviewProps> = ({
  drawings,
  selectedFields,
}) => {
  const PERFORMANCE_WARNING_THRESHOLD = 300;

  // Show performance warning for large datasets
  const showPerformanceWarning = drawings.length > PERFORMANCE_WARNING_THRESHOLD;

  // Memoize preview data to avoid recalculation
  const previewData = useMemo(() => {
    return drawings.map(drawing => {
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

        // Format value for display
        row[field.key] = formatValue(value, field.type, drawing);
      });

      return row;
    });
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
  if (drawings.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'action.hover' }}>
        <Typography variant="body2" color="text.secondary">
          No drawings to preview
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
      {/* Count display */}
      <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing all {drawings.length} drawings
        </Typography>
        {showPerformanceWarning && (
          <Alert severity="warning" sx={{ py: 0, '& .MuiAlert-message': { py: 0.5 } }}>
            Large dataset detected. Export may take a few seconds.
          </Alert>
        )}
      </Box>

      {/* Preview table with virtualization */}
      <Paper sx={{ height: 400, overflow: 'hidden' }}>
        {/* Sticky header */}
        <HeaderRow />

        {/* Virtualized list */}
        <FixedSizeList
          height={348} // 400 - 52 (header height)
          itemCount={drawings.length}
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
