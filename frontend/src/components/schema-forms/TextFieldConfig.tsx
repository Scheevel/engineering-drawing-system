/**
 * Text Field Configuration Component
 *
 * Advanced configuration interface for text input fields including:
 * - Multiline option (textarea vs single-line input)
 * - Maximum length setting with character counter
 * - Pattern validation (regex) with common engineering patterns
 * - Placeholder text configuration
 * - Input format hints for users
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControl,
  FormLabel,
  FormControlLabel,
  Switch,
  Typography,
  Chip,
  Grid,
  Paper,
  Alert,
  Autocomplete,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormHelperText,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Pattern as PatternIcon,
  TextFields as TextFieldsIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { FieldConfigurationProps, FieldTypeConfig } from '../../types/schema';

// Common engineering patterns for text validation
const ENGINEERING_PATTERNS = [
  {
    label: 'Component Mark (ABC-123)',
    pattern: '^[A-Z]+[0-9]+$',
    description: 'Letters followed by numbers (e.g., CG123, AB45)',
    example: 'CG123',
  },
  {
    label: 'Material Grade (A992, A588)',
    pattern: '^A[0-9]{3,4}[A-Z]*$',
    description: 'ASTM material specification format',
    example: 'A992',
  },
  {
    label: 'Drawing Number (DRG-001-REV-A)',
    pattern: '^[A-Z]{2,4}-[0-9]{3}-REV-[A-Z]$',
    description: 'Standard drawing numbering format',
    example: 'DRG-001-REV-A',
  },
  {
    label: 'Station Format (STA 123+45.67)',
    pattern: '^STA\\s+[0-9]+\\+[0-9]{2}\\.[0-9]{2}$',
    description: 'Railway station format',
    example: 'STA 123+45.67',
  },
  {
    label: 'Alphanumeric Code',
    pattern: '^[A-Z0-9-_]+$',
    description: 'Uppercase letters, numbers, hyphens, underscores',
    example: 'ABC-123_XYZ',
  },
];

// Validation schema for text field configuration
const textConfigValidationSchema = yup.object({
  placeholder: yup.string().max(100, 'Placeholder must be less than 100 characters'),
  maxLength: yup
    .number()
    .min(1, 'Maximum length must be at least 1')
    .max(10000, 'Maximum length cannot exceed 10,000')
    .integer('Maximum length must be a whole number'),
  minLength: yup
    .number()
    .min(0, 'Minimum length cannot be negative')
    .integer('Minimum length must be a whole number')
    .test('min-less-than-max', 'Minimum length must be less than maximum length', function(value) {
      const { maxLength } = this.parent;
      if (!value || !maxLength) return true;
      return value < maxLength;
    }),
  pattern: yup.string().test('valid-regex', 'Invalid regular expression pattern', function(value) {
    if (!value) return true;
    try {
      new RegExp(value);
      return true;
    } catch {
      return false;
    }
  }),
  multiline: yup.boolean(),
});

interface TextFieldConfigData {
  placeholder: string;
  maxLength: number;
  minLength: number;
  pattern: string;
  multiline: boolean;
  formatHint: string;
}

const TextFieldConfig: React.FC<FieldConfigurationProps> = ({
  fieldType,
  config,
  onChange,
  errors = [],
  disabled = false,
  showHelp = true,
}) => {
  const [testValue, setTestValue] = useState('');
  const [patternError, setPatternError] = useState<string | null>(null);

  // Initialize form with current config
  const {
    control,
    watch,
    setValue,
    formState: { errors: formErrors },
    trigger,
  } = useForm<TextFieldConfigData>({
    resolver: yupResolver(textConfigValidationSchema),
    defaultValues: {
      placeholder: config.placeholder || '',
      maxLength: config.maxLength || 255,
      minLength: config.minLength || 0,
      pattern: config.pattern || '',
      multiline: config.multiline || false,
      formatHint: config.formatHint || '',
    },
    mode: 'onChange',
  });

  const watchedValues = watch();

  // Update parent component when form values change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const newConfig: FieldTypeConfig['text'] = {
        placeholder: watchedValues.placeholder?.trim() || undefined,
        maxLength: watchedValues.maxLength || 255,
        minLength: watchedValues.minLength || 0,
        pattern: watchedValues.pattern?.trim() || undefined,
        multiline: watchedValues.multiline,
      };

      // Add formatHint if provided
      if (watchedValues.formatHint?.trim()) {
        (newConfig as any).formatHint = watchedValues.formatHint.trim();
      }

      onChange(newConfig);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [watchedValues, onChange]);

  // Test pattern validation with test value
  useEffect(() => {
    if (watchedValues.pattern && testValue) {
      try {
        const regex = new RegExp(watchedValues.pattern);
        const isValid = regex.test(testValue);
        setPatternError(isValid ? null : 'Test value does not match pattern');
      } catch (error) {
        setPatternError('Invalid regular expression');
      }
    } else {
      setPatternError(null);
    }
  }, [watchedValues.pattern, testValue]);

  const handlePatternSelect = (selectedPattern: typeof ENGINEERING_PATTERNS[0] | null) => {
    if (selectedPattern) {
      setValue('pattern', selectedPattern.pattern);
      setValue('formatHint', `Format: ${selectedPattern.description}`);
      setTestValue(selectedPattern.example);
      trigger('pattern');
    }
  };

  const handleClearPattern = () => {
    setValue('pattern', '');
    setValue('formatHint', '');
    setTestValue('');
    setPatternError(null);
  };

  return (
    <Box>
      {showHelp && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<TextFieldsIcon />}>
          <Typography variant="body2">
            Configure how text input fields behave. Set character limits, validation patterns,
            and display options to match your data requirements.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Basic Configuration */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Basic Configuration
            </Typography>

            <Grid container spacing={2}>
              {/* Multiline Toggle */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="multiline"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          disabled={disabled}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            Multiline Text Area
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {field.value ? 'Multiple lines allowed (textarea)' : 'Single line input'}
                          </Typography>
                        </Box>
                      }
                    />
                  )}
                />
              </Grid>

              {/* Character Limits */}
              <Grid item xs={12} sm={3}>
                <Controller
                  name="minLength"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Minimum Length"
                      type="number"
                      fullWidth
                      size="small"
                      disabled={disabled}
                      error={!!formErrors.minLength}
                      helperText={formErrors.minLength?.message}
                      inputProps={{ min: 0, step: 1 }}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === '' ? 0 : parseInt(value, 10) || 0);
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <Controller
                  name="maxLength"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Maximum Length"
                      type="number"
                      fullWidth
                      size="small"
                      disabled={disabled}
                      error={!!formErrors.maxLength}
                      helperText={formErrors.maxLength?.message}
                      inputProps={{ min: 1, step: 1 }}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === '' ? 255 : parseInt(value, 10) || 255);
                      }}
                    />
                  )}
                />
              </Grid>

              {/* Placeholder Text */}
              <Grid item xs={12}>
                <Controller
                  name="placeholder"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Placeholder Text"
                      fullWidth
                      disabled={disabled}
                      error={!!formErrors.placeholder}
                      helperText={
                        formErrors.placeholder?.message ||
                        'Hint text shown when field is empty'
                      }
                      placeholder="e.g., Enter component weight in pounds"
                      inputProps={{ maxLength: 100 }}
                    />
                  )}
                />
              </Grid>

              {/* Format Hint */}
              <Grid item xs={12}>
                <Controller
                  name="formatHint"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Format Hint (Optional)"
                      fullWidth
                      disabled={disabled}
                      helperText="Additional guidance text shown below the field"
                      placeholder="e.g., Format: ABC-123 (letters followed by numbers)"
                      inputProps={{ maxLength: 200 }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Pattern Validation */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={1}>
                <PatternIcon color="primary" />
                <Typography variant="h6">Pattern Validation</Typography>
                {watchedValues.pattern && (
                  <Chip label="Pattern Active" color="primary" size="small" />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                {/* Pattern Selection */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <FormLabel component="legend" sx={{ mb: 1 }}>
                      Engineering Patterns
                    </FormLabel>
                    <Autocomplete
                      options={ENGINEERING_PATTERNS}
                      getOptionLabel={(option) => option.label}
                      renderOption={(props, option) => {
                        const { key, ...restProps } = props;
                        return (
                          <Box component="li" key={option.pattern} {...restProps}>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>
                                {option.label}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {option.description}
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                                Example: {option.example}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      }}
                      value={null} // Always null to allow repeated selections
                      onChange={(_, newValue) => handlePatternSelect(newValue)}
                      disabled={disabled}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Select a common engineering pattern..."
                          helperText="Choose from pre-defined patterns or create custom pattern below"
                        />
                      )}
                    />
                  </FormControl>
                </Grid>

                {/* Custom Pattern */}
                <Grid item xs={12}>
                  <Controller
                    name="pattern"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Custom Pattern (Regular Expression)"
                        fullWidth
                        disabled={disabled}
                        error={!!formErrors.pattern}
                        helperText={
                          formErrors.pattern?.message ||
                          'Use JavaScript regular expression syntax'
                        }
                        placeholder="^[A-Z]+[0-9]+$"
                        InputProps={{
                          style: { fontFamily: 'monospace' },
                          endAdornment: watchedValues.pattern && (
                            <Button size="small" onClick={handleClearPattern}>
                              Clear
                            </Button>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>

                {/* Pattern Testing */}
                {watchedValues.pattern && (
                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Test Pattern
                      </Typography>
                      <TextField
                        label="Test Value"
                        fullWidth
                        size="small"
                        value={testValue}
                        onChange={(e) => setTestValue(e.target.value)}
                        error={!!patternError}
                        helperText={patternError || 'Enter a value to test against the pattern'}
                        sx={{ mb: 1 }}
                      />
                      <Box display="flex" gap={1} flexWrap="wrap">
                        <Chip
                          label={patternError ? 'Invalid' : 'Valid'}
                          color={patternError ? 'error' : 'success'}
                          size="small"
                        />
                        {testValue && (
                          <Chip
                            label={`Length: ${testValue.length}`}
                            variant="outlined"
                            size="small"
                          />
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Configuration Preview */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={1}>
                <PreviewIcon color="primary" />
                <Typography variant="h6">Field Preview</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  How this field will appear to users:
                </Typography>

                <Box mt={2}>
                  <TextField
                    label="Sample Field Name"
                    fullWidth
                    multiline={watchedValues.multiline}
                    rows={watchedValues.multiline ? 3 : 1}
                    placeholder={watchedValues.placeholder || 'Enter value...'}
                    helperText={
                      <>
                        {watchedValues.formatHint && (
                          <span>{watchedValues.formatHint}<br /></span>
                        )}
                        Character limit: {watchedValues.minLength}-{watchedValues.maxLength} characters
                      </>
                    }
                    inputProps={{
                      maxLength: watchedValues.maxLength,
                      pattern: watchedValues.pattern || undefined,
                    }}
                  />
                </Box>

                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary">
                    Configuration Summary:
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                    <Chip
                      label={watchedValues.multiline ? 'Multiline' : 'Single Line'}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`${watchedValues.minLength}-${watchedValues.maxLength} chars`}
                      size="small"
                      variant="outlined"
                    />
                    {watchedValues.pattern && (
                      <Chip
                        label="Pattern Validation"
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    )}
                  </Box>
                </Box>
              </Paper>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>

      {/* Display Errors */}
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

export default TextFieldConfig;