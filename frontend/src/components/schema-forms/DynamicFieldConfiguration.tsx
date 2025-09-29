/**
 * Dynamic Field Configuration Component
 *
 * Master configuration interface that dynamically renders the appropriate
 * field-specific configuration component based on field type selection.
 * Provides unified API for all field configuration types.
 */

import React from 'react';
import {
  Box,
  Typography,
  Alert,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

import { FieldConfigurationProps, FieldType } from '../../types/schema';
import TextFieldConfig from './TextFieldConfig';
import NumberFieldConfig from './NumberFieldConfig';
import SelectFieldConfig from './SelectFieldConfig';
import CheckboxFieldConfig from './CheckboxFieldConfig';
import DateFieldConfig from './DateFieldConfig';

interface DynamicFieldConfigurationProps extends Omit<FieldConfigurationProps, 'fieldType'> {
  fieldType: FieldType | undefined;
  onFieldTypeChange?: (fieldType: FieldType) => void;
  allowFieldTypeChange?: boolean;
  title?: string;
  description?: string;
}

// Field type metadata for selection and display
const FIELD_TYPE_OPTIONS = [
  {
    value: 'text' as FieldType,
    label: 'Text Field',
    description: 'Single or multi-line text input with validation patterns',
    icon: '📝',
  },
  {
    value: 'number' as FieldType,
    label: 'Number Field',
    description: 'Numeric input with min/max validation and unit display',
    icon: '🔢',
  },
  {
    value: 'select' as FieldType,
    label: 'Select Field',
    description: 'Dropdown selection with option management',
    icon: '📋',
  },
  {
    value: 'checkbox' as FieldType,
    label: 'Checkbox Field',
    description: 'Boolean checkbox with custom labels',
    icon: '☑️',
  },
  {
    value: 'date' as FieldType,
    label: 'Date Field',
    description: 'Date picker with format and range constraints',
    icon: '📅',
  },
] as const;

const DynamicFieldConfiguration: React.FC<DynamicFieldConfigurationProps> = ({
  fieldType,
  config,
  onChange,
  onFieldTypeChange,
  allowFieldTypeChange = false,
  errors = [],
  disabled = false,
  showHelp = true,
  title = 'Field Configuration',
  description,
}) => {
  const handleFieldTypeChange = (newFieldType: FieldType) => {
    if (onFieldTypeChange) {
      onFieldTypeChange(newFieldType);
    }
  };

  const getFieldTypeOption = (type: FieldType) => {
    return FIELD_TYPE_OPTIONS.find(option => option.value === type);
  };

  const renderFieldConfiguration = () => {
    if (!fieldType) {
      return (
        <Alert severity="info" icon={<SettingsIcon />}>
          <Typography variant="body2">
            Please select a field type to configure its specific properties.
          </Typography>
        </Alert>
      );
    }

    const sharedProps = {
      fieldType,
      config,
      onChange,
      errors,
      disabled,
      showHelp,
    };

    switch (fieldType) {
      case 'text':
        return <TextFieldConfig {...sharedProps} />;
      case 'number':
        return <NumberFieldConfig {...sharedProps} />;
      case 'select':
        return <SelectFieldConfig {...sharedProps} />;
      case 'checkbox':
        return <CheckboxFieldConfig {...sharedProps} />;
      case 'date':
        return <DateFieldConfig {...sharedProps} />;
      default:
        return (
          <Alert severity="warning" icon={<WarningIcon />}>
            <Typography variant="body2">
              Unsupported field type: {fieldType}. Please select a supported field type.
            </Typography>
          </Alert>
        );
    }
  };

  const selectedOption = fieldType ? getFieldTypeOption(fieldType) : null;

  return (
    <Box>
      {/* Header Section */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {title}
        </Typography>

        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
        )}

        {/* Field Type Selection */}
        {allowFieldTypeChange && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="field-type-select-label">Field Type</InputLabel>
            <Select
              labelId="field-type-select-label"
              value={fieldType || ''}
              label="Field Type"
              onChange={(e) => handleFieldTypeChange(e.target.value as FieldType)}
              disabled={disabled}
            >
              {FIELD_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <span>{option.icon}</span>
                    <Box>
                      <Typography variant="body1">{option.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.description}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              Choose the type of field to configure its specific properties
            </FormHelperText>
          </FormControl>
        )}

        {/* Current Field Type Display */}
        {!allowFieldTypeChange && fieldType && selectedOption && (
          <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
            <span style={{ fontSize: '1.2em' }}>{selectedOption.icon}</span>
            <Box>
              <Typography variant="h6">{selectedOption.label}</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedOption.description}
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Dynamic Configuration Content */}
      {renderFieldConfiguration()}

      {/* Global Errors */}
      {errors.length > 0 && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="body2">Configuration errors:</Typography>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}
    </Box>
  );
};

export default DynamicFieldConfiguration;