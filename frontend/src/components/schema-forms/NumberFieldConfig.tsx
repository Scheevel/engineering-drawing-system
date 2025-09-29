/**
 * Number Field Configuration Component
 *
 * Advanced configuration interface for number input fields including:
 * - Minimum and maximum value settings with validation
 * - Step increment value (0.1, 1, 10, etc.) for precision control
 * - Integer-only vs decimal options
 * - Unit display (optional suffix like "mm", "lbs", "kN")
 * - Number format options (thousands separator, decimal places)
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
  Slider,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Functions as FunctionsIcon,
  Preview as PreviewIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { FieldConfigurationProps, FieldTypeConfig } from '../../types/schema';

// Common engineering units
const ENGINEERING_UNITS = [
  { category: 'Length', units: ['mm', 'cm', 'm', 'in', 'ft'] },
  { category: 'Weight/Force', units: ['g', 'kg', 'lbs', 'N', 'kN', 'lbf'] },
  { category: 'Pressure', units: ['Pa', 'kPa', 'MPa', 'psi', 'ksi'] },
  { category: 'Area', units: ['mm²', 'cm²', 'm²', 'in²', 'ft²'] },
  { category: 'Volume', units: ['ml', 'L', 'in³', 'ft³', 'gal'] },
  { category: 'Angle', units: ['°', 'rad', 'mrad'] },
  { category: 'Temperature', units: ['°C', '°F', 'K'] },
  { category: 'Percentage', units: ['%'] },
];

// Flatten units for autocomplete
const ALL_UNITS = ENGINEERING_UNITS.flatMap(category =>
  category.units.map(unit => ({
    label: unit,
    category: category.category,
  }))
);

// Step increment presets
const STEP_PRESETS = [
  { label: 'Very Fine (0.01)', value: 0.01 },
  { label: 'Fine (0.1)', value: 0.1 },
  { label: 'Normal (1)', value: 1 },
  { label: 'Coarse (10)', value: 10 },
  { label: 'Very Coarse (100)', value: 100 },
];

// Validation schema for number field configuration
const numberConfigValidationSchema = yup.object({
  min: yup
    .number()
    .nullable()
    .test('min-less-than-max', 'Minimum value must be less than maximum value', function(value) {
      const { max } = this.parent;
      if (!value || !max) return true;
      return value < max;
    }),
  max: yup
    .number()
    .nullable()
    .test('max-greater-than-min', 'Maximum value must be greater than minimum value', function(value) {
      const { min } = this.parent;
      if (!value || !min) return true;
      return value > min;
    }),
  step: yup
    .number()
    .positive('Step value must be positive')
    .max(1000000, 'Step value is too large'),
  unit: yup.string().max(10, 'Unit must be less than 10 characters'),
  decimalPlaces: yup
    .number()
    .min(0, 'Decimal places cannot be negative')
    .max(10, 'Maximum 10 decimal places allowed')
    .integer('Decimal places must be a whole number'),
  integerOnly: yup.boolean(),
  thousandsSeparator: yup.boolean(),
});

interface NumberFieldConfigData {
  min: number | null;
  max: number | null;
  step: number;
  unit: string;
  decimalPlaces: number;
  integerOnly: boolean;
  thousandsSeparator: boolean;
}

const NumberFieldConfig: React.FC<FieldConfigurationProps> = ({
  fieldType,
  config,
  onChange,
  errors = [],
  disabled = false,
  showHelp = true,
}) => {
  const [testValue, setTestValue] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize form with current config
  const {
    control,
    watch,
    setValue,
    formState: { errors: formErrors },
    trigger,
  } = useForm<NumberFieldConfigData>({
    resolver: yupResolver(numberConfigValidationSchema),
    defaultValues: {
      min: config.min ?? null,
      max: config.max ?? null,
      step: config.step || 1,
      unit: config.unit || '',
      decimalPlaces: config.precision || 2,
      integerOnly: config.integerOnly || false,
      thousandsSeparator: config.thousandsSeparator || false,
    },
    mode: 'onChange',
  });

  const watchedValues = watch();

  // Update parent component when form values change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const newConfig: FieldTypeConfig['number'] = {
        min: watchedValues.min,
        max: watchedValues.max,
        step: watchedValues.step,
        unit: watchedValues.unit?.trim() || undefined,
        precision: watchedValues.decimalPlaces,
      };

      // Add additional config properties
      if (watchedValues.integerOnly) {
        (newConfig as any).integerOnly = true;
      }
      if (watchedValues.thousandsSeparator) {
        (newConfig as any).thousandsSeparator = true;
      }

      onChange(newConfig);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [watchedValues, onChange]);

  // Validate test value against current configuration
  useEffect(() => {
    const { min, max, integerOnly } = watchedValues;
    let error = null;

    if (min !== null && testValue < min) {
      error = `Value must be at least ${min}`;
    } else if (max !== null && testValue > max) {
      error = `Value must be at most ${max}`;
    } else if (integerOnly && !Number.isInteger(testValue)) {
      error = 'Value must be a whole number';
    }

    setValidationError(error);
  }, [testValue, watchedValues]);

  const handleStepPresetSelect = (preset: typeof STEP_PRESETS[0] | null) => {
    if (preset) {
      setValue('step', preset.value);
      trigger('step');
    }
  };

  const handleUnitSelect = (selectedUnit: typeof ALL_UNITS[0] | null) => {
    if (selectedUnit) {
      setValue('unit', selectedUnit.label);
      trigger('unit');
    }
  };

  const formatNumber = (value: number): string => {
    const { decimalPlaces, thousandsSeparator, integerOnly } = watchedValues;

    let formatted = integerOnly
      ? Math.round(value).toString()
      : value.toFixed(decimalPlaces);

    if (thousandsSeparator) {
      const parts = formatted.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      formatted = parts.join('.');
    }

    return formatted;
  };

  return (
    <Box>
      {showHelp && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<FunctionsIcon />}>
          <Typography variant="body2">
            Configure numeric input validation, precision, and display formatting.
            Set value ranges, step increments, and units to match engineering requirements.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Value Range Configuration */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Value Range & Validation
            </Typography>

            <Grid container spacing={2}>
              {/* Min/Max Values */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="min"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Minimum Value (Optional)"
                      type="number"
                      fullWidth
                      disabled={disabled}
                      error={!!formErrors.min}
                      helperText={formErrors.min?.message || 'Leave blank for no minimum'}
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === '' ? null : parseFloat(value));
                      }}
                      inputProps={{ step: 'any' }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="max"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Maximum Value (Optional)"
                      type="number"
                      fullWidth
                      disabled={disabled}
                      error={!!formErrors.max}
                      helperText={formErrors.max?.message || 'Leave blank for no maximum'}
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === '' ? null : parseFloat(value));
                      }}
                      inputProps={{ step: 'any' }}
                    />
                  )}
                />
              </Grid>

              {/* Integer Only Toggle */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="integerOnly"
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
                            Integer Only
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {field.value ? 'Only whole numbers allowed' : 'Decimal values allowed'}
                          </Typography>
                        </Box>
                      }
                    />
                  )}
                />
              </Grid>

              {/* Decimal Places (if not integer only) */}
              {!watchedValues.integerOnly && (
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="decimalPlaces"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Decimal Places"
                        type="number"
                        fullWidth
                        disabled={disabled}
                        error={!!formErrors.decimalPlaces}
                        helperText={formErrors.decimalPlaces?.message || 'Number of digits after decimal'}
                        inputProps={{ min: 0, max: 10, step: 1 }}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === '' ? 2 : parseInt(value, 10));
                        }}
                      />
                    )}
                  />
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* Step and Precision Configuration */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={1}>
                <SettingsIcon color="primary" />
                <Typography variant="h6">Step & Precision Control</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                {/* Step Presets */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <FormLabel component="legend" sx={{ mb: 1 }}>
                      Step Increment Presets
                    </FormLabel>
                    <Autocomplete
                      options={STEP_PRESETS}
                      getOptionLabel={(option) => option.label}
                      renderOption={(props, option) => {
                        const { key, ...restProps } = props;
                        return (
                          <Box component="li" key={option.value} {...restProps}>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>
                                {option.label}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Increment by {option.value} per step
                              </Typography>
                            </Box>
                          </Box>
                        );
                      }}
                      value={null}
                      onChange={(_, newValue) => handleStepPresetSelect(newValue)}
                      disabled={disabled}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Select step increment preset..."
                          helperText="Choose common step values or set custom below"
                        />
                      )}
                    />
                  </FormControl>
                </Grid>

                {/* Custom Step */}
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="step"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Step Increment"
                        type="number"
                        fullWidth
                        disabled={disabled}
                        error={!!formErrors.step}
                        helperText={formErrors.step?.message || 'Amount to increment/decrement per step'}
                        inputProps={{ min: 0.001, step: 'any' }}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === '' ? 1 : parseFloat(value));
                        }}
                      />
                    )}
                  />
                </Grid>

                {/* Thousands Separator */}
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="thousandsSeparator"
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
                              Thousands Separator
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {field.value ? 'Display commas (1,234.56)' : 'No formatting (1234.56)'}
                            </Typography>
                          </Box>
                        }
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Unit Configuration */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h6">Unit Display</Typography>
                {watchedValues.unit && (
                  <Chip label={watchedValues.unit} color="primary" size="small" />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                {/* Engineering Units */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <FormLabel component="legend" sx={{ mb: 1 }}>
                      Engineering Units
                    </FormLabel>
                    <Autocomplete
                      options={ALL_UNITS}
                      getOptionLabel={(option) => option.label}
                      groupBy={(option) => option.category}
                      renderOption={(props, option) => {
                        const { key, ...restProps } = props;
                        return (
                          <Box component="li" key={option.label} {...restProps}>
                            <Typography variant="body2">
                              {option.label}
                            </Typography>
                          </Box>
                        );
                      }}
                      value={null}
                      onChange={(_, newValue) => handleUnitSelect(newValue)}
                      disabled={disabled}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Select engineering unit..."
                          helperText="Choose from common engineering units"
                        />
                      )}
                    />
                  </FormControl>
                </Grid>

                {/* Custom Unit */}
                <Grid item xs={12}>
                  <Controller
                    name="unit"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Custom Unit (Optional)"
                        fullWidth
                        disabled={disabled}
                        error={!!formErrors.unit}
                        helperText={
                          formErrors.unit?.message ||
                          'Unit symbol displayed after the number (e.g., "mm", "lbs", "kN")'
                        }
                        placeholder="kg"
                        inputProps={{ maxLength: 10 }}
                        InputProps={{
                          endAdornment: watchedValues.unit && (
                            <Button size="small" onClick={() => setValue('unit', '')}>
                              Clear
                            </Button>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Field Preview */}
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
                    label="Sample Number Field"
                    type="number"
                    fullWidth
                    value={testValue}
                    onChange={(e) => setTestValue(parseFloat(e.target.value) || 0)}
                    error={!!validationError}
                    helperText={
                      validationError || (
                        <>
                          Range: {watchedValues.min ?? '∞'} to {watchedValues.max ?? '∞'}
                          {watchedValues.unit && ` (${watchedValues.unit})`}
                        </>
                      )
                    }
                    inputProps={{
                      min: watchedValues.min || undefined,
                      max: watchedValues.max || undefined,
                      step: watchedValues.step,
                    }}
                    InputProps={{
                      endAdornment: watchedValues.unit && (
                        <Typography variant="body2" color="text.secondary">
                          {watchedValues.unit}
                        </Typography>
                      ),
                    }}
                  />
                </Box>

                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary">
                    Formatted Display: {formatNumber(testValue)}
                    {watchedValues.unit && ` ${watchedValues.unit}`}
                  </Typography>
                </Box>

                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary">
                    Configuration Summary:
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                    <Chip
                      label={watchedValues.integerOnly ? 'Integers Only' : 'Decimals Allowed'}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`Step: ${watchedValues.step}`}
                      size="small"
                      variant="outlined"
                    />
                    {watchedValues.unit && (
                      <Chip
                        label={`Unit: ${watchedValues.unit}`}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    )}
                    {watchedValues.thousandsSeparator && (
                      <Chip
                        label="Thousands Separator"
                        size="small"
                        variant="outlined"
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

export default NumberFieldConfig;