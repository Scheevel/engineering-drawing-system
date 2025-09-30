import React, { useEffect } from 'react';
import {
  Grid,
  TextField,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormHelperText,
  Typography,
  Box,
  Autocomplete,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { ComponentSchema, SchemaFieldType, SchemaValidationResult } from '../../services/api.ts';

interface SchemaAwareFormProps {
  schema: ComponentSchema;
  initialValues?: Record<string, any>;
  onValuesChange?: (values: Record<string, any>) => void;
  onValidationChange?: (validation: SchemaValidationResult) => void;
  disabled?: boolean;
  showHelpText?: boolean;
}

interface FormFieldProps {
  field: ComponentSchema['fields'][0];
  control: any;
  disabled?: boolean;
  showHelpText?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({ field, control, disabled, showHelpText }) => {
  const fieldProps = {
    name: field.field_name,
    control,
    rules: {
      required: field.is_required ? `${field.field_name} is required` : false,
      ...getValidationRules(field),
    },
  };

  const renderField = () => {
    switch (field.field_type) {
      case 'text':
        return (
          <Controller
            {...fieldProps}
            render={({ field: formField, fieldState: { error } }) => (
              <TextField
                {...formField}
                label={formatFieldLabel(field.field_name)}
                variant="outlined"
                fullWidth
                disabled={disabled}
                error={!!error}
                helperText={error?.message || (showHelpText && field.help_text ? field.help_text : '')}
                inputProps={{
                  maxLength: field.field_config.max_length || undefined,
                }}
                InputProps={{
                  sx: disabled ? {
                    '& .MuiInputBase-input.Mui-disabled': {
                      WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)', // Black text for better readability
                    }
                  } : undefined
                }}
                InputLabelProps={{
                  sx: disabled ? {
                    '&.Mui-disabled': {
                      color: 'rgba(0, 0, 0, 0.7)', // Darker label for better readability
                      fontSize: '1rem', // Slightly larger label
                    }
                  } : undefined
                }}
              />
            )}
          />
        );

      case 'textarea':
        return (
          <Controller
            {...fieldProps}
            render={({ field: formField, fieldState: { error } }) => (
              <TextField
                {...formField}
                label={formatFieldLabel(field.field_name)}
                variant="outlined"
                fullWidth
                multiline
                rows={field.field_config.rows || 4}
                disabled={disabled}
                error={!!error}
                helperText={error?.message || (showHelpText && field.help_text ? field.help_text : '')}
                inputProps={{
                  maxLength: field.field_config.max_length || undefined,
                }}
                InputProps={{
                  sx: disabled ? {
                    '& .MuiInputBase-input.Mui-disabled': {
                      WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)', // Black text for better readability
                    }
                  } : undefined
                }}
                InputLabelProps={{
                  sx: disabled ? {
                    '&.Mui-disabled': {
                      color: 'rgba(0, 0, 0, 0.7)', // Darker label for better readability
                      fontSize: '1rem', // Slightly larger label
                    }
                  } : undefined
                }}
              />
            )}
          />
        );

      case 'number':
        return (
          <Controller
            {...fieldProps}
            render={({ field: formField, fieldState: { error } }) => (
              <TextField
                {...formField}
                label={formatFieldLabel(field.field_name)}
                variant="outlined"
                fullWidth
                type="number"
                disabled={disabled}
                error={!!error}
                helperText={error?.message || (showHelpText && field.help_text ? field.help_text : '')}
                InputProps={{
                  endAdornment: field.field_config.unit && (
                    <Typography variant="body2" color="text.secondary">
                      {field.field_config.unit}
                    </Typography>
                  ),
                  sx: disabled ? {
                    '& .MuiInputBase-input.Mui-disabled': {
                      WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)', // Black text for better readability
                    }
                  } : undefined
                }}
                InputLabelProps={{
                  sx: disabled ? {
                    '&.Mui-disabled': {
                      color: 'rgba(0, 0, 0, 0.7)', // Darker label for better readability
                      fontSize: '1rem', // Slightly larger label
                    }
                  } : undefined
                }}
                inputProps={{
                  min: field.field_config.min || undefined,
                  max: field.field_config.max || undefined,
                  step: field.field_config.step || undefined,
                }}
                onChange={(e) => {
                  const value = e.target.value === '' ? '' : Number(e.target.value);
                  formField.onChange(value);
                }}
              />
            )}
          />
        );

      case 'select':
        return (
          <Controller
            {...fieldProps}
            render={({ field: formField, fieldState: { error } }) => (
              <FormControl fullWidth variant="outlined" error={!!error} disabled={disabled}>
                <InputLabel
                  sx={disabled ? {
                    '&.Mui-disabled': {
                      color: 'rgba(0, 0, 0, 0.7)', // Darker label for better readability
                      fontSize: '1rem', // Slightly larger label
                    }
                  } : undefined}
                >
                  {formatFieldLabel(field.field_name)}
                </InputLabel>
                <Select
                  {...formField}
                  label={formatFieldLabel(field.field_name)}
                  sx={disabled ? {
                    '& .MuiSelect-select.Mui-disabled': {
                      WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)', // Black text for better readability
                    }
                  } : undefined}
                >
                  {field.field_config.options?.map((option: any) => (
                    <MenuItem key={option.value || option} value={option.value || option}>
                      {option.label || option}
                    </MenuItem>
                  ))}
                  {field.field_config.allow_custom && (
                    <MenuItem value="__custom__">
                      <em>Custom Value...</em>
                    </MenuItem>
                  )}
                </Select>
                {(error?.message || (showHelpText && field.help_text)) && (
                  <FormHelperText>
                    {error?.message || field.help_text}
                  </FormHelperText>
                )}
              </FormControl>
            )}
          />
        );

      case 'checkbox':
        return (
          <Controller
            {...fieldProps}
            render={({ field: formField, fieldState: { error } }) => (
              <FormControl error={!!error} disabled={disabled}>
                <FormControlLabel
                  control={
                    <Checkbox
                      {...formField}
                      checked={!!formField.value}
                      onChange={(e) => formField.onChange(e.target.checked)}
                      sx={disabled ? {
                        '&.Mui-disabled': {
                          color: 'rgba(0, 0, 0, 0.6)', // Darker color for better visibility
                        }
                      } : undefined}
                    />
                  }
                  label={formatFieldLabel(field.field_name)}
                  sx={disabled ? {
                    '& .MuiFormControlLabel-label.Mui-disabled': {
                      color: 'rgba(0, 0, 0, 0.87)', // Black label text
                    }
                  } : undefined}
                />
                {(error?.message || (showHelpText && field.help_text)) && (
                  <FormHelperText>
                    {error?.message || field.help_text}
                  </FormHelperText>
                )}
              </FormControl>
            )}
          />
        );

      case 'date':
        return (
          <Controller
            {...fieldProps}
            render={({ field: formField, fieldState: { error } }) => (
              <TextField
                {...formField}
                label={formatFieldLabel(field.field_name)}
                variant="outlined"
                fullWidth
                type="date"
                disabled={disabled}
                error={!!error}
                helperText={error?.message || (showHelpText && field.help_text ? field.help_text : '')}
                InputLabelProps={{
                  shrink: true,
                  sx: disabled ? {
                    '&.Mui-disabled': {
                      color: 'rgba(0, 0, 0, 0.7)', // Darker label for better readability
                      fontSize: '1rem', // Slightly larger label
                    }
                  } : undefined
                }}
                InputProps={{
                  sx: disabled ? {
                    '& .MuiInputBase-input.Mui-disabled': {
                      WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)', // Black text for better readability
                    }
                  } : undefined
                }}
                onChange={(e) => {
                  const value = e.target.value || null;
                  formField.onChange(value);
                }}
              />
            )}
          />
        );

      case 'autocomplete':
        return (
          <Controller
            {...fieldProps}
            render={({ field: formField, fieldState: { error } }) => (
              <Autocomplete
                {...formField}
                value={formField.value || null}
                onChange={(event, newValue) => {
                  formField.onChange(newValue);
                }}
                options={field.field_config.options || []}
                getOptionLabel={(option: any) => option?.label || option?.toString() || ''}
                isOptionEqualToValue={(option: any, value: any) =>
                  (option?.value || option) === (value?.value || value)
                }
                freeSolo={field.field_config.allow_custom || false}
                disabled={disabled}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={formatFieldLabel(field.field_name)}
                    variant="outlined"
                    error={!!error}
                    helperText={error?.message || (showHelpText && field.help_text ? field.help_text : '')}
                    InputProps={{
                      ...params.InputProps,
                      sx: disabled ? {
                        '& .MuiInputBase-input.Mui-disabled': {
                          WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)', // Black text for better readability
                        }
                      } : undefined
                    }}
                    InputLabelProps={{
                      ...params.InputLabelProps,
                      sx: disabled ? {
                        '&.Mui-disabled': {
                          color: 'rgba(0, 0, 0, 0.7)', // Darker label for better readability
                          fontSize: '1rem', // Slightly larger label
                        }
                      } : undefined
                    }}
                  />
                )}
              />
            )}
          />
        );

      default:
        return (
          <TextField
            label={`Unsupported field type: ${field.field_type}`}
            disabled
            fullWidth
            variant="outlined"
            error
            helperText="This field type is not supported"
          />
        );
    }
  };

  return (
    <Grid item xs={12} sm={6} md={getFieldWidth(field)}>
      {renderField()}
    </Grid>
  );
};

const SchemaAwareForm: React.FC<SchemaAwareFormProps> = ({
  schema,
  initialValues = {},
  onValuesChange,
  onValidationChange,
  disabled = false,
  showHelpText = true,
}) => {
  const { control, watch, formState: { errors, isValid }, getValues, trigger } = useForm({
    mode: 'onChange',
    defaultValues: buildDefaultValues(schema, initialValues),
  });

  // Watch all form values for changes
  const watchedValues = watch();

  // Emit values and validation changes
  useEffect(() => {
    if (onValuesChange) {
      onValuesChange(watchedValues);
    }
  }, [watchedValues, onValuesChange]);

  useEffect(() => {
    if (onValidationChange) {
      const validationResult: SchemaValidationResult = {
        is_valid: isValid,
        errors: Object.entries(errors).map(([field, error]) =>
          `${formatFieldLabel(field)}: ${error?.message || 'Invalid value'}`
        ),
        validated_data: getValues(),
      };
      onValidationChange(validationResult);
    }
  }, [isValid, errors, onValidationChange, getValues]);

  // Sort fields by display order
  const sortedFields = [...schema.fields].sort((a, b) => a.display_order - b.display_order);

  return (
    <Box>
      <Grid container spacing={3}>
        {sortedFields.map((field) => (
          <FormField
            key={field.field_name}
            field={field}
            control={control}
            disabled={disabled}
            showHelpText={showHelpText}
          />
        ))}
      </Grid>
    </Box>
  );
};

// Helper functions
function formatFieldLabel(fieldName: string): string {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function buildDefaultValues(schema: ComponentSchema, initialValues: Record<string, any>): Record<string, any> {
  const defaults: Record<string, any> = {};

  schema.fields.forEach(field => {
    if (initialValues[field.field_name] !== undefined) {
      defaults[field.field_name] = initialValues[field.field_name];
    } else {
      // Set default values based on field type
      switch (field.field_type) {
        case 'text':
        case 'textarea':
          defaults[field.field_name] = field.field_config.default_value || '';
          break;
        case 'number':
          defaults[field.field_name] = field.field_config.default_value || '';
          break;
        case 'select':
          defaults[field.field_name] = field.field_config.default_value || '';
          break;
        case 'checkbox':
          defaults[field.field_name] = field.field_config.default_value || false;
          break;
        case 'date':
          defaults[field.field_name] = field.field_config.default_value || null;
          break;
        case 'autocomplete':
          defaults[field.field_name] = field.field_config.default_value || '';
          break;
        default:
          defaults[field.field_name] = '';
      }
    }
  });

  return defaults;
}

function getValidationRules(field: ComponentSchema['fields'][0]): Record<string, any> {
  const rules: Record<string, any> = {};

  switch (field.field_type) {
    case 'text':
    case 'textarea':
      if (field.field_config.max_length) {
        rules.maxLength = {
          value: field.field_config.max_length,
          message: `Maximum length is ${field.field_config.max_length} characters`,
        };
      }
      if (field.field_config.min_length) {
        rules.minLength = {
          value: field.field_config.min_length,
          message: `Minimum length is ${field.field_config.min_length} characters`,
        };
      }
      if (field.field_config.pattern) {
        rules.pattern = {
          value: new RegExp(field.field_config.pattern),
          message: field.field_config.pattern_message || 'Invalid format',
        };
      }
      break;

    case 'number':
      if (field.field_config.min !== undefined) {
        rules.min = {
          value: field.field_config.min,
          message: `Minimum value is ${field.field_config.min}`,
        };
      }
      if (field.field_config.max !== undefined) {
        rules.max = {
          value: field.field_config.max,
          message: `Maximum value is ${field.field_config.max}`,
        };
      }
      break;

    case 'select':
      if (!field.field_config.allow_custom && field.field_config.options) {
        rules.validate = (value: any) => {
          const validOptions = field.field_config.options.map((opt: any) => opt.value || opt);
          return validOptions.includes(value) || 'Please select a valid option';
        };
      }
      break;

    case 'autocomplete':
      if (!field.field_config.allow_custom && field.field_config.options) {
        rules.validate = (value: any) => {
          if (!value) return true; // Allow empty values unless required
          const validOptions = field.field_config.options.map((opt: any) => opt.value || opt);
          return validOptions.includes(value?.value || value) || 'Please select a valid option';
        };
      }
      break;
  }

  return rules;
}

function getFieldWidth(field: ComponentSchema['fields'][0]): number {
  // Determine grid width based on field type and config
  if (field.field_config.width) {
    return field.field_config.width;
  }

  switch (field.field_type) {
    case 'textarea':
      return 12; // Full width for text areas
    case 'checkbox':
      return 6;  // Half width for checkboxes
    case 'date':
      return 4;  // Third width for dates
    case 'autocomplete':
      return 6;  // Half width for autocomplete fields
    default:
      return 6;  // Half width for most fields
  }
}

export default SchemaAwareForm;