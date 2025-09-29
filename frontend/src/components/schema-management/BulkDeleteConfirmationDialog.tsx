/**
 * Bulk Delete Confirmation Dialog Component
 *
 * Provides detailed confirmation with impact analysis for bulk field deletion.
 * Shows which components use the selected fields and allows cancellation if impact is significant.
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
  ListItemIcon,
  ListItemText,
  Alert,
  AlertTitle,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  CircularProgress,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { ComponentSchemaField } from '../../types/schema';

interface FieldImpactInfo {
  fieldId: string;
  fieldName: string;
  componentsUsingField: Array<{
    componentId: string;
    pieceMark: string;
    hasData: boolean;
    lastModified: string;
  }>;
  isRequired: boolean;
  dependentFields: string[];
}

interface BulkDeleteImpactAnalysis {
  totalFields: number;
  totalComponentsAffected: number;
  fieldsWithData: number;
  requiredFields: number;
  fieldImpacts: FieldImpactInfo[];
  hasSignificantImpact: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  warnings: string[];
}

interface BulkDeleteConfirmationDialogProps {
  open: boolean;
  selectedFields: ComponentSchemaField[];
  onConfirm: (fieldsToDelete: string[]) => Promise<void>;
  onCancel: () => void;
  isDeleting?: boolean;
  getImpactAnalysis?: (fieldIds: string[]) => Promise<BulkDeleteImpactAnalysis>;
}

export const BulkDeleteConfirmationDialog: React.FC<BulkDeleteConfirmationDialogProps> = ({
  open,
  selectedFields,
  onConfirm,
  onCancel,
  isDeleting = false,
  getImpactAnalysis,
}) => {
  const [impactAnalysis, setImpactAnalysis] = useState<BulkDeleteImpactAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Analyze impact when dialog opens and fields are selected
  useEffect(() => {
    if (open && selectedFields.length > 0 && getImpactAnalysis) {
      performImpactAnalysis();
    }
  }, [open, selectedFields, getImpactAnalysis]);

  const performImpactAnalysis = async () => {
    if (!getImpactAnalysis) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const fieldIds = selectedFields.map(field => field.id);
      const analysis = await getImpactAnalysis(fieldIds);
      setImpactAnalysis(analysis);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Failed to analyze impact');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    if (selectedFields.length === 0) return;

    const fieldsToDelete = selectedFields.map(field => field.id);
    await onConfirm(fieldsToDelete);
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      default: return 'info';
    }
  };

  const getRiskLevelIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return <CheckCircleIcon />;
      case 'medium': return <WarningIcon />;
      case 'high': return <ErrorIcon />;
      default: return <InfoIcon />;
    }
  };

  const canProceed = !isAnalyzing && !analysisError && (
    !impactAnalysis?.hasSignificantImpact ||
    impactAnalysis?.riskLevel !== 'high'
  );

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' }
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={2}>
          <DeleteIcon color="error" />
          <Typography variant="h6" component="div">
            Confirm Bulk Field Deletion
          </Typography>
          <Chip
            label={`${selectedFields.length} field${selectedFields.length > 1 ? 's' : ''}`}
            color="error"
            size="small"
          />
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* Fields to be deleted */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Fields to be deleted:
              </Typography>
              <Box sx={{ maxHeight: '120px', overflow: 'auto' }}>
                <List dense>
                  {selectedFields.map((field) => (
                    <ListItem key={field.id} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: '32px' }}>
                        <DeleteIcon color="error" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={field.field_name}
                        secondary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label={field.field_type} size="small" variant="outlined" />
                            {field.is_required && (
                              <Chip label="Required" size="small" color="warning" />
                            )}
                          </Stack>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </CardContent>
          </Card>

          {/* Impact Analysis */}
          {isAnalyzing && (
            <Box display="flex" alignItems="center" justifyContent="center" py={4}>
              <Stack alignItems="center" spacing={2}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">
                  Analyzing deletion impact...
                </Typography>
              </Stack>
            </Box>
          )}

          {analysisError && (
            <Alert severity="error">
              <AlertTitle>Analysis Failed</AlertTitle>
              {analysisError}
              <Button size="small" onClick={performImpactAnalysis} sx={{ mt: 1 }}>
                Retry Analysis
              </Button>
            </Alert>
          )}

          {impactAnalysis && !isAnalyzing && (
            <>
              {/* Impact Summary */}
              <Alert
                severity={getRiskLevelColor(impactAnalysis.riskLevel) as any}
                icon={getRiskLevelIcon(impactAnalysis.riskLevel)}
              >
                <AlertTitle>
                  Impact Analysis - {impactAnalysis.riskLevel.toUpperCase()} Risk
                </AlertTitle>
                <Typography variant="body2">
                  This deletion will affect <strong>{impactAnalysis.totalComponentsAffected}</strong> components.
                  {impactAnalysis.fieldsWithData > 0 && (
                    <> <strong>{impactAnalysis.fieldsWithData}</strong> fields contain existing data that will be lost.</>
                  )}
                  {impactAnalysis.requiredFields > 0 && (
                    <> <strong>{impactAnalysis.requiredFields}</strong> required fields will be removed.</>
                  )}
                </Typography>
              </Alert>

              {/* Warnings */}
              {impactAnalysis.warnings.length > 0 && (
                <Alert severity="warning">
                  <AlertTitle>Warnings</AlertTitle>
                  <List dense>
                    {impactAnalysis.warnings.map((warning, index) => (
                      <ListItem key={index} sx={{ py: 0 }}>
                        <ListItemText primary={warning} />
                      </ListItem>
                    ))}
                  </List>
                </Alert>
              )}

              {/* Detailed Impact (Expandable) */}
              {impactAnalysis.fieldImpacts.length > 0 && (
                <Accordion expanded={showDetails} onChange={(_, expanded) => setShowDetails(expanded)}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">
                      Detailed Impact Analysis
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      {impactAnalysis.fieldImpacts.map((impact) => (
                        <Card key={impact.fieldId} variant="outlined" sx={{ bgcolor: 'grey.50' }}>
                          <CardContent sx={{ py: 1.5 }}>
                            <Stack spacing={1}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle2" fontWeight="medium">
                                  {impact.fieldName}
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                  {impact.isRequired && (
                                    <Chip label="Required" size="small" color="warning" />
                                  )}
                                  <Chip
                                    label={`${impact.componentsUsingField.length} components`}
                                    size="small"
                                    color="info"
                                  />
                                </Stack>
                              </Stack>

                              {impact.componentsUsingField.length > 0 && (
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Components using this field:
                                  </Typography>
                                  <Box sx={{ maxHeight: '100px', overflow: 'auto', mt: 0.5 }}>
                                    {impact.componentsUsingField.map((component) => (
                                      <Typography
                                        key={component.componentId}
                                        variant="caption"
                                        display="block"
                                        sx={{
                                          color: component.hasData ? 'error.main' : 'text.secondary',
                                          fontWeight: component.hasData ? 'medium' : 'normal',
                                        }}
                                      >
                                        {component.pieceMark}
                                        {component.hasData && ' (contains data)'}
                                      </Typography>
                                    ))}
                                  </Box>
                                </Box>
                              )}

                              {impact.dependentFields.length > 0 && (
                                <Alert severity="warning" sx={{ py: 0.5 }}>
                                  <Typography variant="caption">
                                    <strong>Dependent fields:</strong> {impact.dependentFields.join(', ')}
                                  </Typography>
                                </Alert>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* High Risk Prevention */}
              {impactAnalysis.hasSignificantImpact && impactAnalysis.riskLevel === 'high' && (
                <Alert severity="error">
                  <AlertTitle>Deletion Blocked - High Risk</AlertTitle>
                  This bulk deletion has been blocked due to significant impact on existing data.
                  Consider removing fields individually or backing up affected components first.
                </Alert>
              )}
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={onCancel}
          disabled={isDeleting}
          startIcon={<CancelIcon />}
        >
          Cancel
        </Button>

        <Button
          onClick={handleConfirm}
          color="error"
          variant="contained"
          disabled={!canProceed || isDeleting || selectedFields.length === 0}
          startIcon={isDeleting ? <CircularProgress size={16} /> : <DeleteIcon />}
        >
          {isDeleting ? 'Deleting...' : `Delete ${selectedFields.length} Field${selectedFields.length > 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};