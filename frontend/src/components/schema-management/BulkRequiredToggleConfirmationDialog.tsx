/**
 * Bulk Required Toggle Confirmation Dialog Component
 *
 * Provides confirmation dialog for bulk field required/optional status changes.
 * Shows special warnings when making required fields optional due to data impact.
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
  Star as RequiredIcon,
  StarBorder as OptionalIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
  Components as ComponentIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { ComponentSchemaField } from '../../types/schema';

interface BulkRequiredToggleConfirmationDialogProps {
  open: boolean;
  selectedFields: ComponentSchemaField[];
  requiredStatus: boolean; // true = making required, false = making optional
  onConfirm: (fieldIds: string[]) => void;
  onCancel: () => void;
  isProcessing?: boolean;
  getImpactAnalysis?: (fieldIds: string[], requiredStatus: boolean) => Promise<RequiredToggleImpactAnalysis>;
}

interface RequiredToggleImpactAnalysis {
  totalFields: number;
  currentlyRequiredFields: number;
  currentlyOptionalFields: number;
  componentsWithData: {
    componentId: string;
    pieceMark: string;
    fieldsAffected: string[];
    hasRequiredFieldData: boolean;
  }[];
  validationImpact: {
    formsAffected: number;
    validationRulesChanged: number;
    potentialDataLoss: boolean;
  };
  warnings: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export const BulkRequiredToggleConfirmationDialog: React.FC<BulkRequiredToggleConfirmationDialogProps> = ({
  open,
  selectedFields,
  requiredStatus,
  onConfirm,
  onCancel,
  isProcessing = false,
  getImpactAnalysis,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [impactAnalysis, setImpactAnalysis] = useState<RequiredToggleImpactAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const fieldCount = selectedFields.length;
  const isOptionalOperation = !requiredStatus; // Making fields optional
  const operationType = requiredStatus ? 'required' : 'optional';
  const actionWord = requiredStatus ? 'Require' : 'Make Optional';

  // Count fields by current status
  const currentlyRequired = selectedFields.filter(field => field.is_required).length;
  const currentlyOptional = selectedFields.filter(field => !field.is_required).length;
  const fieldsToChange = requiredStatus ? currentlyOptional : currentlyRequired;

  // Load impact analysis when dialog opens
  useEffect(() => {
    if (open && getImpactAnalysis && selectedFields.length > 0) {
      setAnalysisLoading(true);
      setAnalysisError(null);

      const fieldIds = selectedFields.map(field => field.id);

      getImpactAnalysis(fieldIds, requiredStatus)
        .then(analysis => {
          setImpactAnalysis(analysis);
        })
        .catch(error => {
          console.error('Failed to analyze required toggle impact:', error);
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
  }, [open, getImpactAnalysis, selectedFields, requiredStatus]);

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

  const getOperationIcon = () => {
    return requiredStatus ? <RequiredIcon color="primary" /> : <OptionalIcon color="action" />;
  };

  const getOperationTitle = () => {
    return requiredStatus
      ? `Mark Fields as Required`
      : `Mark Fields as Optional`;
  };

  const getFieldStatusChip = (field: ComponentSchemaField) => {
    if (field.is_required === requiredStatus) {
      return (
        <Chip
          label={`Already ${operationType}`}
          size="small"
          color="default"
          variant="outlined"
        />
      );
    }
    return (
      <Chip
        label={`Will be ${operationType}`}
        size="small"
        color={requiredStatus ? 'primary' : 'default'}
        variant="filled"
      />
    );
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
          {getOperationIcon()}
          <Box>
            <Typography variant="h6">
              Confirm {getOperationTitle()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {fieldsToChange} field{fieldsToChange > 1 ? 's' : ''} will be changed to {operationType}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* Critical warning for making required fields optional */}
          {isOptionalOperation && currentlyRequired > 0 && (
            <Alert severity="error" icon={<ErrorIcon />}>
              <Typography variant="body2" fontWeight="medium">
                <strong>Data Impact Warning:</strong> Making required fields optional
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {currentlyRequired} currently required field{currentlyRequired > 1 ? 's' : ''} will no longer be mandatory.
                This may result in incomplete component data and affect form validation for future entries.
              </Typography>
            </Alert>
          )}

          {/* Info for making fields required */}
          {requiredStatus && currentlyOptional > 0 && (
            <Alert severity="info" icon={<InfoIcon />}>
              <Typography variant="body2">
                <strong>Validation Enhancement:</strong> Making fields required will improve data quality
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {currentlyOptional} optional field{currentlyOptional > 1 ? 's' : ''} will become mandatory for new component entries.
                Existing components without this data will remain valid.
              </Typography>
            </Alert>
          )}

          {/* Fields to be changed */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Fields to {actionWord.toLowerCase()}:
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
                        {getFieldStatusChip(field)}
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
                Analyzing validation impact...
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
                    getImpactAnalysis(fieldIds, requiredStatus)
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
                  <strong>Validation Impact - {impactAnalysis.riskLevel.toUpperCase()} Risk</strong>
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  This change will affect <strong>{impactAnalysis.validationImpact.formsAffected} form{impactAnalysis.validationImpact.formsAffected > 1 ? 's' : ''}</strong> and
                  modify <strong>{impactAnalysis.validationImpact.validationRulesChanged} validation rule{impactAnalysis.validationImpact.validationRulesChanged > 1 ? 's' : ''}</strong>.
                </Typography>
                {impactAnalysis.validationImpact.potentialDataLoss && isOptionalOperation && (
                  <Typography variant="body2" sx={{ mt: 1, color: 'error.main' }}>
                    <WarningIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                    <strong>Potential impact on data validation workflows.</strong>
                  </Typography>
                )}
              </Alert>

              {/* Warnings */}
              {impactAnalysis.warnings.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                    Important Considerations:
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
                  Detailed Validation Impact
                </Button>

                <Collapse in={showDetails}>
                  <Box sx={{ pl: 2, borderLeft: 2, borderColor: 'divider' }}>
                    {impactAnalysis.componentsWithData.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight="medium" gutterBottom>
                          Components with Existing Data:
                        </Typography>
                        <List dense>
                          {impactAnalysis.componentsWithData.map((component) => (
                            <ListItem key={component.componentId} sx={{ py: 0.5 }}>
                              <ListItemIcon>
                                <ComponentIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText
                                primary={component.pieceMark}
                                secondary={`${component.fieldsAffected.length} field${component.fieldsAffected.length > 1 ? 's' : ''} affected${component.hasRequiredFieldData ? ' (contains data)' : ''}`}
                                secondaryTypographyProps={{ variant: 'caption' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}

                    <Typography variant="body2" color="text.secondary">
                      <InfoIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      {requiredStatus
                        ? 'Making fields required will not affect existing component data, but will enforce validation for new entries.'
                        : 'Making fields optional will relax validation rules and may result in incomplete data for future components.'
                      }
                    </Typography>
                  </Box>
                </Collapse>
              </Box>
            </Box>
          )}

          {/* Summary Information */}
          <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Change Summary:</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • {fieldsToChange} field{fieldsToChange > 1 ? 's' : ''} will be marked as {operationType}
            </Typography>
            {fieldCount - fieldsToChange > 0 && (
              <Typography variant="body2" color="text.secondary">
                • {fieldCount - fieldsToChange} field{fieldCount - fieldsToChange > 1 ? 's are' : ' is'} already {operationType}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              • Changes can be reverted by repeating this operation with opposite status
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onCancel}
          disabled={isProcessing}
          color="inherit"
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={isProcessing || fieldCount === 0}
          color={isOptionalOperation ? 'warning' : 'primary'}
          variant="contained"
          startIcon={isProcessing ? undefined : getOperationIcon()}
        >
          {isProcessing
            ? 'Processing...'
            : `${actionWord} ${fieldsToChange} Field${fieldsToChange > 1 ? 's' : ''}`
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};