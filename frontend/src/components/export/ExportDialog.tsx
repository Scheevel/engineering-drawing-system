/**
 * ExportDialog - Component-centric CSV export dialog
 *
 * Main export interface implementing component-centric data model (Story 7.1.1):
 * - Export button shows component count: "Export CSV (X components, Y fields)"
 * - Validates component availability (not just drawing count)
 * - Success message references component count
 * - Integrates with FieldGroupSelector (Component Data primary, Drawing Context secondary)
 * - Displays real-time preview via ExportPreview component
 */
import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  Divider,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  FileDownload as ExportIcon,
} from '@mui/icons-material';
import FieldGroupSelector from './FieldGroupSelector.tsx';
import ExportPreview from './ExportPreview.tsx';
import { EXPORT_FIELD_GROUPS } from '../../config/exportFields.ts';
import { ExportField } from '../../types/export.types';
import { safeExportDrawingsToCSV, getComponentDataFields } from '../../services/exportService.ts';

interface ExportDialogProps {
  open: boolean;
  drawings: any[];
  onClose: () => void;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  drawings,
  onClose,
}) => {
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

  // Calculate total component count (component-centric model)
  const componentCount = useMemo(() => {
    return drawings.reduce((sum, drawing) => sum + (drawing.components?.length || 0), 0);
  }, [drawings]);

  // Combine static fields with dynamic component fields
  const allFields = useMemo(() => {
    const dynamicComponentFields = getComponentDataFields(drawings);
    const staticFields = EXPORT_FIELD_GROUPS.flatMap(g => g.fields);
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
        // Close dialog after successful export
        setTimeout(() => {
          onClose();
        }, 1000);
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

  // Handle dialog close
  const handleClose = () => {
    setSelectedFieldKeys([]);
    onClose();
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Determine if export button should be disabled (component-centric validation)
  const exportDisabled = drawings.length === 0 || componentCount === 0 || selectedFields.length === 0;

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: '90vh',
          },
        }}
      >
        {/* Dialog Title */}
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" component="div">
              Export Components to CSV
            </Typography>
            <IconButton
              edge="end"
              onClick={handleClose}
              aria-label="close"
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <Divider />

        {/* Dialog Content */}
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Field Selection Section */}
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Select Fields to Export
            </Typography>
            <FieldGroupSelector
              drawings={drawings}
              selectedFields={selectedFieldKeys}
              onFieldsChange={setSelectedFieldKeys}
            />
          </Box>

          {/* Preview Section */}
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Preview
            </Typography>
            <ExportPreview
              drawings={drawings}
              selectedFields={selectedFields}
            />
          </Box>
        </DialogContent>

        {/* Dialog Actions */}
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            size="large"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            variant="contained"
            size="large"
            startIcon={<ExportIcon />}
            disabled={exportDisabled}
          >
            Export CSV ({componentCount} components, {selectedFields.length} fields)
          </Button>
        </DialogActions>
      </Dialog>

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
    </>
  );
};

export default ExportDialog;
