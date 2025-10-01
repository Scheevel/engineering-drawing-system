/**
 * Field Creation Dialog Component
 *
 * Modal dialog for creating new schema fields with type selection,
 * configuration, validation, and real-time feedback.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Typography,
  FormHelperText,
  Alert,
  Divider,
  FormControlLabel,
  Checkbox,
  Grid,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import {
  ComponentSchemaFieldCreate,
  SchemaFieldType,
} from '../../services/api.ts';
import {
  FIELD_TYPE_LABELS,
  FIELD_TYPE_DESCRIPTIONS,
  DEFAULT_FIELD_CONFIG,
  FieldTypeConfig,
} from '../../types/schema.ts';
import FieldTypeSelector from './FieldTypeSelector.tsx';

// Validation schema
const fieldValidationSchema = yup.object({
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
    .oneOf(['text', 'number', 'checkbox', 'textarea', 'date'], 'Invalid field type'),
  help_text: yup
    .string()
    .max(200, 'Help text must be less than 200 characters'),
  is_required: yup.boolean(),
  field_config: yup.object(),
});

interface FieldCreationFormData {
  field_name: string;
  field_type: SchemaFieldType;
  help_text: string;
  is_required: boolean;
  field_config: Record<string, any>;
}

interface FieldCreationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (field: ComponentSchemaFieldCreate) => void;
  existingFieldNames: string[];
  displayOrder: number;
  loading?: boolean;
}

const FieldCreationDialog: React.FC<FieldCreationDialogProps> = ({
  open,
  onClose,
  onSave,
  existingFieldNames,
  displayOrder,
  loading = false,
}) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldNameError, setFieldNameError] = useState<string | null>(null);

  // Form setup
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid, isDirty },
    setValue,
    trigger,
  } = useForm<FieldCreationFormData>({
    resolver: yupResolver(fieldValidationSchema),
    defaultValues: {
      field_name: '',
      field_type: 'text',
      help_text: '',
      is_required: false,
      field_config: DEFAULT_FIELD_CONFIG.text,
    },
    mode: 'onChange',
  });

  const fieldType = watch('field_type');
  const fieldName = watch('field_name');

  // Real-time field name validation against existing fields (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (fieldName && fieldName.trim()) {
        const normalizedName = fieldName.trim().toLowerCase();
        const isDuplicate = existingFieldNames.some(
          name => name.toLowerCase() === normalizedName
        );

        setFieldNameError(isDuplicate ? 'A field with this name already exists' : null);
      } else {
        setFieldNameError(null);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [fieldName, existingFieldNames]);

  // Update field config when field type changes
  useEffect(() => {
    if (fieldType) {
      setValue('field_config', { ...DEFAULT_FIELD_CONFIG[fieldType] });
      trigger('field_config');
    }
  }, [fieldType, setValue, trigger]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      reset({
        field_name: '',
        field_type: 'text',
        help_text: '',
        is_required: false,
        field_config: { ...DEFAULT_FIELD_CONFIG.text },
      });
      setSubmitError(null);
      setFieldNameError(null);
    }
  }, [open, reset]);

  const handleClose = () => {
    if (!loading) {
      reset();
      setSubmitError(null);
      setFieldNameError(null);
      onClose();
    }
  };

  const onSubmit = (data: FieldCreationFormData) => {
    // Check for duplicate field name one more time
    if (fieldNameError) {
      setSubmitError('Please fix the field name error before continuing');
      return;
    }

    try {
      const fieldData: ComponentSchemaFieldCreate = {
        field_name: data.field_name.trim(),
        field_type: data.field_type,
        field_config: data.field_config,
        help_text: data.help_text?.trim() || undefined,
        display_order: displayOrder,
        is_required: data.is_required,
      };

      setSubmitError(null);
      onSave(fieldData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create field. Please try again.';
      setSubmitError(errorMessage);
    }
  };

  const handleFieldTypeChange = (newFieldType: SchemaFieldType) => {
    setValue('field_type', newFieldType);
    setValue('field_config', { ...DEFAULT_FIELD_CONFIG[newFieldType] });
  };

  const isFormValid = isValid && !fieldNameError && isDirty;

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
            <AddIcon color="primary" />
            <Typography variant="h6" component="div">
              Add New Field
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

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            {/* Field Name */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="field_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Field Name"
                    fullWidth
                    required
                    error={!!errors.field_name || !!fieldNameError}
                    helperText={
                      <Box display="flex" justifyContent="space-between" width="100%">
                        <span>
                          {errors.field_name?.message ||
                           fieldNameError ||
                           'Choose a unique, descriptive name for this field'}
                        </span>
                        <span>{field.value?.length || 0}/50</span>
                      </Box>
                    }
                    autoFocus
                    placeholder="e.g., Component Weight, Material Grade"
                    inputProps={{
                      maxLength: 50,
                    }}
                    FormHelperTextProps={{
                      sx: { display: 'flex', justifyContent: 'space-between' }
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
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            Required Field
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Users must provide a value for this field
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
                render={({ field }) => (
                  <FieldTypeSelector
                    selectedType={field.value}
                    onTypeChange={handleFieldTypeChange}
                    error={errors.field_type?.message}
                  />
                )}
              />
            </Grid>

            {/* Help Text */}
            <Grid item xs={12}>
              <Controller
                name="help_text"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Help Text (Optional)"
                    fullWidth
                    multiline
                    rows={2}
                    error={!!errors.help_text}
                    helperText={
                      <Box display="flex" justifyContent="space-between" width="100%">
                        <span>
                          {errors.help_text?.message ||
                           'Provide guidance to help users understand what to enter'}
                        </span>
                        <span>{field.value?.length || 0}/200</span>
                      </Box>
                    }
                    placeholder="e.g., Enter the weight in kilograms, including decimal values"
                    inputProps={{
                      maxLength: 200,
                    }}
                    FormHelperTextProps={{
                      sx: { display: 'flex', justifyContent: 'space-between' }
                    }}
                  />
                )}
              />
            </Grid>

            {/* Field Type Information */}
            <Grid item xs={12}>
              <Alert
                severity="info"
                variant="outlined"
                icon={<InfoIcon />}
                sx={{ mb: 1 }}
              >
                <Typography variant="body2">
                  <strong>{FIELD_TYPE_LABELS[fieldType]}:</strong>{' '}
                  {FIELD_TYPE_DESCRIPTIONS[fieldType]}
                </Typography>
              </Alert>
            </Grid>
          </Grid>

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
            startIcon={<AddIcon />}
          >
            Add Field
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default FieldCreationDialog;