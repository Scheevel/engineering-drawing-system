/**
 * ExportPage - Dedicated export page with component-inclusive data loading (Story 7.2)
 *
 * Fixes "No components to preview" bug by loading drawings via GET /api/v1/export/drawings
 * which includes all component relationships using SQLAlchemy joinedload().
 *
 * Features:
 * - Loads ALL drawings with components (no pagination)
 * - Real-time component count display
 * - Field selection via FieldGroupSelector
 * - Live preview via ExportPreview
 * - Component-centric CSV export
 */
import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Snackbar,
} from '@mui/material';
import {
  FileDownload as ExportIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { getExportDrawings } from '../services/api.ts';
import FieldGroupSelector from '../components/export/FieldGroupSelector.tsx';
import ExportPreview from '../components/export/ExportPreview.tsx';
import { EXPORT_FIELD_GROUPS } from '../config/exportFields.ts';
import { ExportField } from '../types/export.types';
import { safeExportDrawingsToCSV, getComponentDataFields } from '../services/exportService.ts';

const ExportPage: React.FC = () => {
  const [selectedFieldKeys, setSelectedFieldKeys] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Load drawings with components via new export endpoint (Story 7.2)
  const { data, isLoading, error, refetch } = useQuery(
    'exportDrawings',
    () => getExportDrawings(),
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Extract drawings array and component count from response
  const drawings = useMemo(() => data?.drawings || [], [data]);
  const componentCount = useMemo(() => data?.total_components || 0, [data]);

  // Combine static fields with dynamic component fields
  const allFields = useMemo(() => {
    const staticFields = EXPORT_FIELD_GROUPS.flatMap(g => g.fields);
    const staticFieldKeys = new Set(staticFields.map(f => f.key));
    const dynamicComponentFields = getComponentDataFields(drawings, staticFieldKeys);
    return [...staticFields, ...dynamicComponentFields];
  }, [drawings]);

  // Get ExportField objects for selected keys
  const selectedFields = useMemo(() => {
    return allFields.filter(field => selectedFieldKeys.includes(field.key));
  }, [allFields, selectedFieldKeys]);

  // Handle CSV export (component-centric)
  const handleExport = () => {
    safeExportDrawingsToCSV(
      drawings,
      selectedFields,
      () => {
        // Success callback
        setSnackbar({
          open: true,
          message: `Exported ${componentCount} components successfully`,
          severity: 'success',
        });
      },
      (error) => {
        // Error callback
        setSnackbar({
          open: true,
          message: error.message || 'Export failed. Please try again.',
          severity: 'error',
        });
      }
    );
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Determine if export button should be disabled (component-centric validation)
  const exportDisabled = drawings.length === 0 || componentCount === 0 || selectedFields.length === 0;

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h4" component="h1">
            Export Components to CSV
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
              disabled={isLoading}
              variant="outlined"
            >
              Refresh Data
            </Button>
            <Button
              startIcon={<ExportIcon />}
              onClick={handleExport}
              disabled={exportDisabled || isLoading}
              variant="contained"
              size="large"
            >
              Export CSV ({componentCount} components, {selectedFields.length} fields)
            </Button>
          </Box>
        </Box>

        {/* Status Summary */}
        {data && (
          <Typography variant="body2" color="text.secondary">
            Loaded {data.total_drawings} drawings with {componentCount} components at {new Date(data.timestamp).toLocaleString()}
          </Typography>
        )}
      </Paper>

      {/* Loading State */}
      {isLoading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Loading drawings with components...
          </Typography>
        </Paper>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body1" fontWeight={600}>
            Error loading export data
          </Typography>
          <Typography variant="body2">
            {(error as Error).message || 'Failed to load drawings. Please try again.'}
          </Typography>
        </Alert>
      )}

      {/* No Components State */}
      {!isLoading && !error && componentCount === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body1" fontWeight={600}>
            No components available for export
          </Typography>
          <Typography variant="body2">
            Upload and process some drawings to see components here.
          </Typography>
        </Alert>
      )}

      {/* Main Content - Field Selection and Preview */}
      {!isLoading && !error && componentCount > 0 && (
        <>
          {/* Field Selection Section */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Select Fields to Export
            </Typography>
            <FieldGroupSelector
              drawings={drawings}
              selectedFields={selectedFieldKeys}
              onFieldsChange={setSelectedFieldKeys}
            />
          </Paper>

          {/* Preview Section */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Preview
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <ExportPreview
              drawings={drawings}
              selectedFields={selectedFields}
            />
          </Paper>
        </>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ExportPage;
