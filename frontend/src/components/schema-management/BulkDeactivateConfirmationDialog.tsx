/**
 * Bulk Deactivate Confirmation Dialog Component
 *
 * Provides confirmation dialog for bulk field deactivation operations.
 * Shows affected fields, potential impact on components, and warnings.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Box,
  Stack,
  Alert,
  Collapse,
  IconButton,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  ToggleOff as DeactivateIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
  Components as ComponentIcon,
} from '@mui/icons-material';
import { ComponentSchemaField } from '../../types/schema';

interface BulkDeactivateConfirmationDialogProps {
  open: boolean;
  selectedFields: ComponentSchemaField[];
  onConfirm: (fieldIds: string[]) => void;
  onCancel: () => void;
  isDeactivating?: boolean;
  getImpactAnalysis?: (fieldIds: string[]) => Promise<DeactivationImpactAnalysis>;
}

interface DeactivationImpactAnalysis {
  totalFields: number;
  requiredFields: number;
  fieldsUsedInComponents: number;
  affectedComponents: {
    componentId: string;
    pieceMark: string;
    fieldsUsed: string[];
  }[];
  warnings: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export const BulkDeactivateConfirmationDialog: React.FC<BulkDeactivateConfirmationDialogProps> = ({
  open,
  selectedFields,
  onConfirm,
  onCancel,
  isDeactivating = false,
  getImpactAnalysis,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [impactAnalysis, setImpactAnalysis] = useState<DeactivationImpactAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const fieldCount = selectedFields.length;
  const requiredFieldCount = selectedFields.filter(field => field.is_required).length;
  const activeFieldCount = selectedFields.filter(field => field.is_active).length;

  // Load impact analysis when dialog opens
  useEffect(() => {
    if (open && getImpactAnalysis && selectedFields.length > 0) {
      setAnalysisLoading(true);
      setAnalysisError(null);

      const fieldIds = selectedFields.map(field => field.id);

      getImpactAnalysis(fieldIds)
        .then(analysis => {
          setImpactAnalysis(analysis);
        })
        .catch(error => {
          console.error('Failed to analyze deactivation impact:', error);
          setAnalysisError(error.message || 'Failed to analyze impact');
        })
        .finally(() => {
          setAnalysisLoading(false);
        });
    } else if (!open) {
      // Reset state when dialog closes
      setImpactAnalysis(null);
      setAnalysisError(null);
      setShowDetails(false);
    }
  }, [open, getImpactAnalysis, selectedFields]);

  const handleConfirm = () => {
    const fieldIds = selectedFields.map(field => field.id);
    onConfirm(fieldIds);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onCancel();
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="md"
      fullWidth
      onKeyDown={handleKeyDown}
    >
      <DialogTitle>
        <Stack direction="row" spacing={2} alignItems="center">
          <DeactivateIcon color="warning" />
          <Box>
            <Typography variant="h6">
              Confirm Bulk Field Deactivation
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {fieldCount} field{fieldCount > 1 ? 's' : ''} will be deactivated
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* Warning for required fields */}
          {requiredFieldCount > 0 && (
            <Alert severity="warning" icon={<WarningIcon />}>
              <Typography variant="body2">
                <strong>{requiredFieldCount} required field{requiredFieldCount > 1 ? 's' : ''}</strong> will be deactivated.
                This may cause validation issues for new components and prevent users from creating complete component records.
              </Typography>
            </Alert>
          )}

          {/* Fields to be deactivated */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Fields to deactivate:
            </Typography>
            <List dense sx={{ bgcolor: 'action.hover', borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
              {selectedFields.map((field) => (
                <ListItem key={field.id}>
                  <ListItemIcon>
                    <ComponentIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={field.field_name}
                    secondary={
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Chip
                          label={field.field_type}
                          size="small"
                          variant="outlined"
                        />
                        {field.is_required && (
                          <Chip
                            label="Required"
                            size="small"
                            color="warning"
                          />
                        )}
                        {!field.is_active && (
                          <Chip
                            label="Already Inactive"
                            size="small"
                            color="default"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>

          {/* Impact Analysis */}
          {analysisLoading && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Analyzing deactivation impact...
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {analysisError && (
            <Alert severity="error">
              <Typography variant="body2">
                <strong>Analysis Failed:</strong> {analysisError}
              </Typography>
              <Button
                size="small"
                onClick={() => {
                  setAnalysisError(null);
                  // Trigger re-analysis
                  if (getImpactAnalysis) {
                    const fieldIds = selectedFields.map(field => field.id);
                    setAnalysisLoading(true);
                    getImpactAnalysis(fieldIds)
                      .then(setImpactAnalysis)
                      .catch(error => setAnalysisError(error.message))
                      .finally(() => setAnalysisLoading(false));
                  }
                }}
                sx={{ mt: 1 }}
              >
                Retry Analysis
              </Button>
            </Alert>
          )}

          {impactAnalysis && (
            <Box>
              <Alert
                severity={getRiskColor(impactAnalysis.riskLevel) as any}
                sx={{ mb: 2 }}
              >
                <Typography variant="body2">
                  <strong>Impact Analysis - {impactAnalysis.riskLevel.toUpperCase()} Risk</strong>
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  This deactivation will affect <strong>{impactAnalysis.affectedComponents.length} component{impactAnalysis.affectedComponents.length > 1 ? 's' : ''}</strong>.
                  {impactAnalysis.fieldsUsedInComponents > 0 && (
                    <> <strong>{impactAnalysis.fieldsUsedInComponents} field{impactAnalysis.fieldsUsedInComponents > 1 ? 's' : ''}</strong> are currently used in existing components.</>
                  )}
                </Typography>
              </Alert>

              {/* Warnings */}
              {impactAnalysis.warnings.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                    Warnings:
                  </Typography>
                  <List dense>
                    {impactAnalysis.warnings.map((warning, index) => (
                      <ListItem key={index} sx={{ py: 0 }}>
                        <ListItemText
                          primary={warning}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Alert>
              )}

              {/* Detailed Impact Analysis */}
              <Box>
                <Button
                  startIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  onClick={() => setShowDetails(!showDetails)}
                  size="small"
                  sx={{ mb: 1 }}
                >
                  Detailed Impact Analysis
                </Button>

                <Collapse in={showDetails}>
                  <Box sx={{ pl: 2, borderLeft: 2, borderColor: 'divider' }}>
                    {impactAnalysis.affectedComponents.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight="medium" gutterBottom>
                          Affected Components:
                        </Typography>
                        <List dense>
                          {impactAnalysis.affectedComponents.map((component) => (
                            <ListItem key={component.componentId} sx={{ py: 0.5 }}>
                              <ListItemIcon>
                                <ComponentIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText
                                primary={component.pieceMark}
                                secondary={`Uses ${component.fieldsUsed.length} of the selected fields`}
                                secondaryTypographyProps={{ variant: 'caption' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}

                    <Typography variant="body2" color="text.secondary">
                      <InfoIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      Deactivated fields will be hidden from forms but existing data will be preserved.
                      Fields can be reactivated later without data loss.
                    </Typography>
                  </Box>
                </Collapse>
              </Box>
            </Box>
          )}

          {/* Summary Information */}
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Deactivation Summary:</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • {activeFieldCount} active field{activeFieldCount > 1 ? 's' : ''} will be deactivated
            </Typography>
            {fieldCount - activeFieldCount > 0 && (
              <Typography variant="body2" color="text.secondary">
                • {fieldCount - activeFieldCount} field{fieldCount - activeFieldCount > 1 ? 's are' : ' is'} already inactive
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              • Deactivated fields can be reactivated later without data loss
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onCancel}
          disabled={isDeactivating}
          color="inherit"
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={isDeactivating || fieldCount === 0}
          color="warning"
          variant="contained"
          startIcon={isDeactivating ? undefined : <DeactivateIcon />}
        >
          {isDeactivating ? 'Deactivating...' : `Deactivate ${fieldCount} Field${fieldCount > 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};