/**
 * Field Edit Form Component
 *
 * Modal dialog for editing existing schema fields with validation,
 * usage checking, help text preview, and save/cancel functionality.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormLabel,
  Button,
  Box,
  Typography,
  FormHelperText,
  Alert,
  Divider,
  FormControlLabel,
  Checkbox,
  Grid,
  Chip,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Warning as WarningIcon,
  Preview as PreviewIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import {
  ComponentSchemaField,
  ComponentSchemaFieldUpdate,
  SchemaFieldType,
} from '../../services/api.ts';
import {
  FIELD_TYPE_LABELS,
  FIELD_TYPE_DESCRIPTIONS,
  DEFAULT_FIELD_CONFIG,
} from '../../types/schema.ts';
import FieldTypeSelector from './FieldTypeSelector.tsx';

// Validation schema for field editing
const fieldEditValidationSchema = yup.object({
  field_name: yup
    .string()
    .required('Field name is required')
    .min(2, 'Field name must be at least 2 characters')
    .max(50, 'Field name must be less than 50 characters')
    .matches(
      /^[a-zA-Z][a-zA-Z0-9\s\-_]*$/,
      'Field name must start with a letter and contain only letters, numbers, spaces, hyphens, and underscores'
    ),
  field_type: yup
    .string()
    .required('Field type is required')
    .oneOf(['text', 'number', 'select', 'checkbox', 'textarea', 'date'], 'Invalid field type'),
  help_text: yup
    .string()
    .max(200, 'Help text must be less than 200 characters'),
  is_required: yup.boolean(),
  field_config: yup.object(),
});

interface FieldEditFormData {
  field_name: string;
  field_type: SchemaFieldType;
  help_text: string;
  is_required: boolean;
  field_config: Record<string, any>;
}

interface FieldEditFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (fieldId: string, updates: ComponentSchemaFieldUpdate) => void;
  field: ComponentSchemaField | null;
  existingFieldNames: string[];
  loading?: boolean;
  isFieldInUse?: boolean;
  usageWarning?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`field-edit-tabpanel-${index}`}
      aria-labelledby={`field-edit-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const FieldEditForm: React.FC<FieldEditFormProps> = ({
  open,
  onClose,
  onSave,
  field,
  existingFieldNames,
  loading = false,
  isFieldInUse = false,
  usageWarning,
}) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldNameError, setFieldNameError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Form setup
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid, isDirty },
    setValue,
    trigger,
  } = useForm<FieldEditFormData>({
    resolver: yupResolver(fieldEditValidationSchema),
    defaultValues: {
      field_name: field?.field_name || '',
      field_type: field?.field_type || 'text',
      help_text: field?.help_text || '',
      is_required: field?.is_required || false,
      field_config: field?.field_config || DEFAULT_FIELD_CONFIG[field?.field_type || 'text'],
    },
    mode: 'onChange',
  });

  const fieldType = watch('field_type');
  const fieldName = watch('field_name');
  const helpText = watch('help_text');

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(isDirty);
  }, [isDirty]);

  // Real-time field name validation against existing fields (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (fieldName && fieldName.trim() && fieldName !== field?.field_name) {
        const normalizedName = fieldName.trim().toLowerCase();
        const isDuplicate = existingFieldNames.some(
          name => name.toLowerCase() === normalizedName && name !== field?.field_name
        );

        setFieldNameError(isDuplicate ? 'A field with this name already exists' : null);
      } else {
        setFieldNameError(null);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [fieldName, existingFieldNames, field?.field_name]);

  // Update field config when field type changes
  useEffect(() => {
    if (fieldType && fieldType !== field?.field_type) {
      setValue('field_config', { ...DEFAULT_FIELD_CONFIG[fieldType] });
      trigger('field_config');
    }
  }, [fieldType, setValue, trigger, field?.field_type]);

  // Reset form when dialog opens/closes or field changes
  useEffect(() => {
    if (open && field) {
      reset({
        field_name: field.field_name || '',
        field_type: field.field_type || 'text',
        help_text: field.help_text || '',
        is_required: field.is_required || false,
        field_config: field.field_config || DEFAULT_FIELD_CONFIG[field.field_type || 'text'],
      });
      setSubmitError(null);
      setFieldNameError(null);
      setCurrentTab(0);
      setHasUnsavedChanges(false);
    }
  }, [open, field, reset]);

  const handleClose = () => {
    if (!loading) {
      if (hasUnsavedChanges) {
        if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
          reset();
          setSubmitError(null);
          setFieldNameError(null);
          setHasUnsavedChanges(false);
          onClose();
        }
      } else {
        onClose();
      }
    }
  };

  const onSubmit = (data: FieldEditFormData) => {
    // Check for duplicate field name one more time
    if (fieldNameError) {
      setSubmitError('Please fix the field name error before continuing');
      return;
    }

    try {
      const updates: ComponentSchemaFieldUpdate = {
        field_name: data.field_name.trim(),
        field_type: data.field_type,
        field_config: data.field_config,
        help_text: data.help_text?.trim() || undefined,
        is_required: data.is_required,
      };

      setSubmitError(null);
      onSave(field?.id!, updates);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update field. Please try again.';
      setSubmitError(errorMessage);
    }
  };

  const handleFieldTypeChange = (newFieldType: SchemaFieldType) => {
    setValue('field_type', newFieldType);
    setValue('field_config', { ...DEFAULT_FIELD_CONFIG[newFieldType] });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const renderHelpTextPreview = () => {
    if (!helpText?.trim()) {
      return (
        <Typography variant="body2" color="text.secondary" fontStyle="italic">
          No help text provided
        </Typography>
      );
    }

    return (
      <Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Help text preview:
        </Typography>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            backgroundColor: 'grey.50',
            border: '1px dashed',
            borderColor: 'grey.300',
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
            {helpText}
          </Typography>
        </Paper>
      </Box>
    );
  };

  const isFormValid = isValid && !fieldNameError && isDirty;
  const canEditFieldType = !isFieldInUse; // Prevent type changes if field is in use

  // Return null if field is not provided
  if (!field) {
    return null;
  }

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
            <EditIcon color="primary" />
            <Typography variant="h6" component="div">
              Edit Field: {field?.field_name || 'Unknown Field'}
            </Typography>
            <Chip
              label={FIELD_TYPE_LABELS[field?.field_type || 'text']}
              size="small"
              variant="outlined"
              color="primary"
            />
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

      {/* Usage Warning */}
      {isFieldInUse && (
        <Box sx={{ p: 2, pb: 0 }}>
          <Alert
            severity="warning"
            icon={<WarningIcon />}
            variant="outlined"
          >
            <Typography variant="body2">
              <strong>Field In Use:</strong> {usageWarning || 'This field is currently being used by components. Some changes may be restricted.'}
            </Typography>
          </Alert>
        </Box>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 2 }}>
          {/* Tabs for Edit vs Preview */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={currentTab} onChange={handleTabChange}>
              <Tab label="Edit Field" icon={<EditIcon />} />
              <Tab label="Preview" icon={<PreviewIcon />} />
            </Tabs>
          </Box>

          {/* Edit Tab */}
          <TabPanel value={currentTab} index={0}>
            <Grid container spacing={3}>
              {/* Field Name */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="field_name"
                  control={control}
                  render={({ field: fieldProps }) => (
                    <TextField
                      {...fieldProps}
                      label="Field Name"
                      fullWidth
                      required
                      error={!!errors.field_name || !!fieldNameError}
                      helperText={
                        <>
                          <Box display="flex" justifyContent="space-between" width="100%">
                            <span>
                              {errors.field_name?.message ||
                               fieldNameError ||
                               'Choose a unique, descriptive name for this field'}
                            </span>
                            <span>{fieldProps.value?.length || 0}/50</span>
                          </Box>
                        </>
                      }
                      placeholder="e.g., Component Weight, Material Grade"
                      inputProps={{
                        maxLength: 50,
                      }}
                    />
                  )}
                />
              </Grid>

              {/* Required Checkbox */}
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="center" height="100%">
                  <Controller
                    name="is_required"
                    control={control}
                    render={({ field: fieldProps }) => (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={fieldProps.value}
                            onChange={(e) => fieldProps.onChange(e.target.checked)}
                            color="primary"
                            disabled={isFieldInUse}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              Required Field
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {isFieldInUse ? 'Cannot change for fields in use' : 'Users must provide a value for this field'}
                            </Typography>
                          </Box>
                        }
                      />
                    )}
                  />
                </Box>
              </Grid>

              {/* Field Type Selection */}
              <Grid item xs={12}>
                <Controller
                  name="field_type"
                  control={control}
                  render={({ field: fieldProps }) => (
                    <FormControl fullWidth>
                      <FormLabel component="legend" sx={{ mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          Field Type
                          {!canEditFieldType && (
                            <Chip
                              label="Cannot change - field in use"
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Typography>
                      </FormLabel>
                      {canEditFieldType ? (
                        <FieldTypeSelector
                          selectedType={fieldProps.value}
                          onTypeChange={handleFieldTypeChange}
                          error={errors.field_type?.message}
                        />
                      ) : (
                        <Alert severity="info" variant="outlined">
                          <Typography variant="body2">
                            <strong>Current Type:</strong> {FIELD_TYPE_LABELS[field?.field_type || 'text']}
                            <br />
                            {FIELD_TYPE_DESCRIPTIONS[field?.field_type || 'text']}
                          </Typography>
                        </Alert>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>

              {/* Help Text */}
              <Grid item xs={12}>
                <Controller
                  name="help_text"
                  control={control}
                  render={({ field: fieldProps }) => (
                    <TextField
                      {...fieldProps}
                      label="Help Text (Optional)"
                      fullWidth
                      multiline
                      rows={3}
                      error={!!errors.help_text}
                      helperText={
                        <>
                          <Box display="flex" justifyContent="space-between" width="100%">
                            <span>
                              {errors.help_text?.message ||
                               'Provide guidance to help users understand what to enter'}
                            </span>
                            <span>{fieldProps.value?.length || 0}/200</span>
                          </Box>
                        </>
                      }
                      placeholder="e.g., Enter the weight in kilograms, including decimal values"
                      inputProps={{
                        maxLength: 200,
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Preview Tab */}
          <TabPanel value={currentTab} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Field Preview
                </Typography>
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {fieldName || field?.field_name || 'Unknown Field'}
                    </Typography>
                    {watch('is_required') && (
                      <Chip
                        label="Required"
                        size="small"
                        color="error"
                        variant="outlined"
                      />
                    )}
                    <Chip
                      label={FIELD_TYPE_LABELS[fieldType]}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  </Box>

                  {renderHelpTextPreview()}

                  <Box mt={2}>
                    <Typography variant="body2" color="text.secondary">
                      Field Type: {FIELD_TYPE_DESCRIPTIONS[fieldType]}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Submit Error */}
          {submitError && (
            <Alert severity="error" sx={{ mt: 3 }}>
              {submitError}
            </Alert>
          )}
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
            type="submit"
            variant="contained"
            loading={loading}
            disabled={!isFormValid}
            startIcon={<SaveIcon />}
          >
            Save Changes
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default FieldEditForm;