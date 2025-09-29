/**
 * Field Deletion Dialog Component
 *
 * Handles field deletion with impact analysis, warnings, and soft/hard delete options.
 * Provides comprehensive user feedback about deletion consequences.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Widgets as ComponentIcon,
  Visibility as ActiveIcon,
  VisibilityOff as InactiveIcon,
} from '@mui/icons-material';

import {
  ComponentSchemaField,
  SchemaFieldType,
} from '../../services/api.ts';
import {
  FIELD_TYPE_LABELS,
} from '../../types/schema.ts';

interface FieldUsageInfo {
  componentCount: number;
  componentNames: string[];
  hasRequiredUsage: boolean;
  canSafelyDelete: boolean;
  warnings: string[];
}

interface FieldDeletionDialogProps {
  open: boolean;
  onClose: () => void;
  onDelete: (fieldId: string, deleteType: 'soft' | 'hard') => void;
  field: ComponentSchemaField | null;
  usageInfo: FieldUsageInfo | null;
  loading?: boolean;
}

type DeletionType = 'soft' | 'hard';

const FieldDeletionDialog: React.FC<FieldDeletionDialogProps> = ({
  open,
  onClose,
  onDelete,
  field,
  usageInfo,
  loading = false,
}) => {
  const [deletionType, setDeletionType] = useState<DeletionType>('soft');
  const [showDetails, setShowDetails] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open && usageInfo) {
      // Default to soft delete if field is in use, hard delete if not in use
      setDeletionType(usageInfo.componentCount > 0 ? 'soft' : 'hard');
      setShowDetails(false);
    }
  }, [open, usageInfo]);

  if (!field) return null;

  const handleDelete = () => {
    onDelete(field.id!, deletionType);
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const getDeletionSeverity = () => {
    if (!usageInfo) return 'info';
    if (usageInfo.hasRequiredUsage) return 'error';
    if (usageInfo.componentCount > 0) return 'warning';
    return 'info';
  };

  const getDeletionTitle = () => {
    if (!usageInfo) return 'Delete Field';
    if (usageInfo.componentCount === 0) return 'Delete Unused Field';
    if (usageInfo.canSafelyDelete) return 'Delete Field with Caution';
    return 'Cannot Safely Delete Field';
  };

  const renderUsageImpact = () => {
    if (!usageInfo) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Impact Analysis
        </Typography>

        {/* Usage Summary */}
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <ComponentIcon color={usageInfo.componentCount > 0 ? 'warning' : 'success'} />
              <Box>
                <Typography variant="body1" fontWeight={600}>
                  {usageInfo.componentCount === 0
                    ? 'No components using this field'
                    : `${usageInfo.componentCount} component${usageInfo.componentCount > 1 ? 's' : ''} using this field`
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {usageInfo.componentCount === 0
                    ? 'This field can be safely deleted'
                    : 'Deletion will affect these components'
                  }
                </Typography>
              </Box>
            </Box>

            {/* Component List */}
            {usageInfo.componentCount > 0 && (
              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="component-list-content"
                  id="component-list-header"
                >
                  <Typography variant="body2">
                    View affected components ({usageInfo.componentCount})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {usageInfo.componentNames.slice(0, 10).map((componentName, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <ComponentIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={componentName}
                          secondary="Will lose data for this field"
                        />
                      </ListItem>
                    ))}
                    {usageInfo.componentNames.length > 10 && (
                      <ListItem>
                        <ListItemText
                          primary={
                            <Typography variant="body2" color="text.secondary">
                              ... and {usageInfo.componentNames.length - 10} more components
                            </Typography>
                          }
                        />
                      </ListItem>
                    )}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Warnings */}
        {usageInfo.warnings.length > 0 && (
          <Box mb={2}>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Warnings:
            </Typography>
            {usageInfo.warnings.map((warning, index) => (
              <Alert
                key={index}
                severity="warning"
                variant="outlined"
                sx={{ mb: 1 }}
                icon={<WarningIcon />}
              >
                <Typography variant="body2">{warning}</Typography>
              </Alert>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  const renderDeletionOptions = () => {
    if (!usageInfo || usageInfo.componentCount === 0) {
      return (
        <Alert severity="info" variant="outlined">
          <Typography variant="body2">
            This field is not being used by any components and can be safely deleted.
          </Typography>
        </Alert>
      );
    }

    return (
      <Box>
        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend">
            <Typography variant="body1" fontWeight={600} gutterBottom>
              Deletion Options
            </Typography>
          </FormLabel>

          <RadioGroup
            value={deletionType}
            onChange={(e) => setDeletionType(e.target.value as DeletionType)}
          >
            {/* Soft Delete Option */}
            <Card
              variant="outlined"
              sx={{
                mb: 2,
                border: deletionType === 'soft' ? '2px solid' : '1px solid',
                borderColor: deletionType === 'soft' ? 'primary.main' : 'divider'
              }}
            >
              <CardContent>
                <FormControlLabel
                  value="soft"
                  control={<Radio />}
                  label={
                    <Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <InactiveIcon fontSize="small" />
                        <Typography variant="body1" fontWeight={600}>
                          Deactivate Field (Recommended)
                        </Typography>
                        <Chip label="Safe" size="small" color="success" variant="outlined" />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Hide the field from new components but preserve existing data.
                        Field can be reactivated later if needed.
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start', mb: 0 }}
                />
              </CardContent>
            </Card>

            {/* Hard Delete Option */}
            <Card
              variant="outlined"
              sx={{
                border: deletionType === 'hard' ? '2px solid' : '1px solid',
                borderColor: deletionType === 'hard' ? 'error.main' : 'divider'
              }}
            >
              <CardContent>
                <FormControlLabel
                  value="hard"
                  control={<Radio />}
                  disabled={usageInfo.hasRequiredUsage}
                  label={
                    <Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <DeleteIcon fontSize="small" />
                        <Typography variant="body1" fontWeight={600}>
                          Permanently Delete Field
                        </Typography>
                        <Chip
                          label={usageInfo.hasRequiredUsage ? "Blocked" : "Destructive"}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {usageInfo.hasRequiredUsage
                          ? 'Cannot delete: Field is required by existing components'
                          : 'Completely remove the field and all associated data. This action cannot be undone.'
                        }
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start', mb: 0 }}
                />
              </CardContent>
            </Card>
          </RadioGroup>
        </FormControl>
      </Box>
    );
  };

  const canProceed = !usageInfo?.hasRequiredUsage || deletionType === 'soft';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <DeleteIcon color="error" />
            <Typography variant="h6" component="div">
              {getDeletionTitle()}
            </Typography>
          </Box>
          <Button
            onClick={handleClose}
            size="small"
            sx={{ minWidth: 'auto', p: 0.5 }}
            disabled={loading}
          >
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {/* Field Information */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Field Information
          </Typography>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Box>
                  <Typography variant="h6">
                    {field.field_name}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mt={1}>
                    <Chip
                      label={FIELD_TYPE_LABELS[field.field_type]}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                    {field.is_required && (
                      <Chip
                        label="Required"
                        size="small"
                        variant="outlined"
                        color="error"
                      />
                    )}
                    <Chip
                      label={field.is_active ? "Active" : "Inactive"}
                      size="small"
                      variant="outlined"
                      color={field.is_active ? "success" : "default"}
                    />
                  </Box>
                </Box>
              </Box>
              {field.help_text && (
                <Typography variant="body2" color="text.secondary">
                  {field.help_text}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Main Warning */}
        <Alert
          severity={getDeletionSeverity()}
          variant="outlined"
          sx={{ mb: 3 }}
        >
          <Typography variant="body2">
            {usageInfo?.componentCount === 0
              ? 'This field is not being used and can be safely deleted.'
              : usageInfo?.hasRequiredUsage
                ? 'This field cannot be permanently deleted because it is required by existing components.'
                : 'This field is being used by components. Consider the impact before proceeding.'
            }
          </Typography>
        </Alert>

        {/* Impact Analysis */}
        {renderUsageImpact()}

        {/* Deletion Options */}
        {renderDeletionOptions()}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          color="inherit"
        >
          Cancel
        </Button>
        <LoadingButton
          onClick={handleDelete}
          variant="contained"
          color={deletionType === 'hard' ? 'error' : 'warning'}
          loading={loading}
          disabled={!canProceed}
          startIcon={deletionType === 'hard' ? <DeleteIcon /> : <InactiveIcon />}
        >
          {deletionType === 'hard' ? 'Delete Permanently' : 'Deactivate Field'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};

export default FieldDeletionDialog;