/**
 * Checkbox Field Configuration Component
 *
 * Advanced configuration interface for checkbox fields including:
 * - Default checked state configuration
 * - Custom labels for checked/unchecked states
 * - Help text for boolean choice clarification
 * - Conditional field display based on checkbox state
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
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  Radio,
  RadioGroup,
  FormHelperText,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckBox as CheckBoxIcon,
  Preview as PreviewIcon,
  Settings as SettingsIcon,
  Label as LabelIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { FieldConfigurationProps, FieldTypeConfig } from '../../types/schema';

// Common checkbox label templates for engineering contexts
const CHECKBOX_LABEL_TEMPLATES = [
  {
    category: 'Compliance',
    templates: [
      { trueLabel: 'Compliant', falseLabel: 'Non-Compliant' },
      { trueLabel: 'Approved', falseLabel: 'Pending' },
      { trueLabel: 'Certified', falseLabel: 'Not Certified' },
      { trueLabel: 'Verified', falseLabel: 'Unverified' },
    ],
  },
  {
    category: 'Status',
    templates: [
      { trueLabel: 'Active', falseLabel: 'Inactive' },
      { trueLabel: 'Complete', falseLabel: 'Incomplete' },
      { trueLabel: 'Installed', falseLabel: 'Not Installed' },
      { trueLabel: 'Operational', falseLabel: 'Non-Operational' },
    ],
  },
  {
    category: 'Inspection',
    templates: [
      { trueLabel: 'Pass', falseLabel: 'Fail' },
      { trueLabel: 'Acceptable', falseLabel: 'Requires Attention' },
      { trueLabel: 'Good Condition', falseLabel: 'Needs Repair' },
      { trueLabel: 'Within Tolerance', falseLabel: 'Out of Tolerance' },
    ],
  },
  {
    category: 'Safety',
    templates: [
      { trueLabel: 'Safe', falseLabel: 'Unsafe' },
      { trueLabel: 'Secured', falseLabel: 'Unsecured' },
      { trueLabel: 'Protected', falseLabel: 'Exposed' },
      { trueLabel: 'Authorized', falseLabel: 'Unauthorized' },
    ],
  },
];

// Validation schema for checkbox field configuration
const checkboxConfigValidationSchema = yup.object({
  trueLabel: yup
    .string()
    .max(50, 'True label must be less than 50 characters'),
  falseLabel: yup
    .string()
    .max(50, 'False label must be less than 50 characters'),
  defaultChecked: yup.boolean(),
  indeterminate: yup.boolean(),
  helpText: yup
    .string()
    .max(200, 'Help text must be less than 200 characters'),
});

interface CheckboxFieldConfigData {
  trueLabel: string;
  falseLabel: string;
  defaultChecked: boolean;
  indeterminate: boolean;
  helpText: string;
}

const CheckboxFieldConfig: React.FC<FieldConfigurationProps> = ({
  fieldType,
  config,
  onChange,
  errors = [],
  disabled = false,
  showHelp = true,
}) => {
  const [previewChecked, setPreviewChecked] = useState(false);

  // Initialize form with current config
  const {
    control,
    watch,
    setValue,
    formState: { errors: formErrors },
    trigger,
  } = useForm<CheckboxFieldConfigData>({
    resolver: yupResolver(checkboxConfigValidationSchema),
    defaultValues: {
      trueLabel: config.trueLabel || 'Yes',
      falseLabel: config.falseLabel || 'No',
      defaultChecked: config.defaultChecked || false,
      indeterminate: config.indeterminate || false,
      helpText: config.helpText || '',
    },
    mode: 'onChange',
  });

  const watchedValues = watch();

  // Update parent component when form values change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const newConfig: FieldTypeConfig['checkbox'] = {
        trueLabel: watchedValues.trueLabel?.trim() || 'Yes',
        falseLabel: watchedValues.falseLabel?.trim() || 'No',
      };

      // Add optional properties
      if (watchedValues.defaultChecked) {
        (newConfig as any).defaultChecked = true;
      }
      if (watchedValues.indeterminate) {
        (newConfig as any).indeterminate = true;
      }
      if (watchedValues.helpText?.trim()) {
        (newConfig as any).helpText = watchedValues.helpText.trim();
      }

      onChange(newConfig);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [watchedValues, onChange]);

  // Update preview when default changes
  useEffect(() => {
    setPreviewChecked(watchedValues.defaultChecked);
  }, [watchedValues.defaultChecked]);

  const handleApplyTemplate = (template: { trueLabel: string; falseLabel: string }) => {
    setValue('trueLabel', template.trueLabel);
    setValue('falseLabel', template.falseLabel);
    trigger(['trueLabel', 'falseLabel']);
  };

  const handleResetToDefaults = () => {
    setValue('trueLabel', 'Yes');
    setValue('falseLabel', 'No');
    trigger(['trueLabel', 'falseLabel']);
  };

  return (
    <Box>
      {showHelp && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<CheckBoxIcon />}>
          <Typography variant="body2">
            Configure checkbox fields for boolean values with custom labels and default states.
            Perfect for status indicators, compliance checks, and yes/no decisions in engineering forms.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Basic Configuration */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Checkbox Configuration
            </Typography>

            <Grid container spacing={2}>
              {/* Default State */}
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Default State
                    </Typography>
                  </FormLabel>
                  <Controller
                    name="defaultChecked"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup
                        row
                        value={field.value ? 'checked' : 'unchecked'}
                        onChange={(e) => field.onChange(e.target.value === 'checked')}
                      >
                        <FormControlLabel
                          value="unchecked"
                          control={<Radio disabled={disabled} />}
                          label={
                            <Box>
                              <Typography variant="body2">Unchecked</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Default to false/no
                              </Typography>
                            </Box>
                          }
                        />
                        <FormControlLabel
                          value="checked"
                          control={<Radio disabled={disabled} />}
                          label={
                            <Box>
                              <Typography variant="body2">Checked</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Default to true/yes
                              </Typography>
                            </Box>
                          }
                        />
                      </RadioGroup>
                    )}
                  />
                  <FormHelperText>
                    Initial state when the field is first displayed
                  </FormHelperText>
                </FormControl>
              </Grid>

              {/* Indeterminate State */}
              <Grid item xs={12}>
                <Controller
                  name="indeterminate"
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
                            Allow Indeterminate State
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {field.value ? 'Three-state checkbox (checked, unchecked, indeterminate)' : 'Two-state checkbox (checked, unchecked)'}
                          </Typography>
                        </Box>
                      }
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Label Configuration */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Custom Labels
            </Typography>

            <Grid container spacing={2}>
              {/* True Label */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="trueLabel"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Checked State Label"
                      fullWidth
                      disabled={disabled}
                      error={!!formErrors.trueLabel}
                      helperText={
                        formErrors.trueLabel?.message ||
                        'Text shown when checkbox is checked'
                      }
                      placeholder="Yes"
                      inputProps={{ maxLength: 50 }}
                    />
                  )}
                />
              </Grid>

              {/* False Label */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="falseLabel"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Unchecked State Label"
                      fullWidth
                      disabled={disabled}
                      error={!!formErrors.falseLabel}
                      helperText={
                        formErrors.falseLabel?.message ||
                        'Text shown when checkbox is unchecked'
                      }
                      placeholder="No"
                      inputProps={{ maxLength: 50 }}
                    />
                  )}
                />
              </Grid>

              {/* Help Text */}
              <Grid item xs={12}>
                <Controller
                  name="helpText"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Help Text (Optional)"
                      fullWidth
                      multiline
                      rows={2}
                      disabled={disabled}
                      error={!!formErrors.helpText}
                      helperText={
                        formErrors.helpText?.message ||
                        'Additional guidance text to help users understand the choice'
                      }
                      placeholder="Check this box if the component meets safety requirements"
                      inputProps={{ maxLength: 200 }}
                    />
                  )}
                />
              </Grid>

              {/* Quick Actions */}
              <Grid item xs={12}>
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Button
                    size="small"
                    onClick={handleResetToDefaults}
                    disabled={disabled}
                  >
                    Reset to Yes/No
                  </Button>
                  <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                    Current: "{watchedValues.trueLabel}" / "{watchedValues.falseLabel}"
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Label Templates */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={1}>
                <LabelIcon color="primary" />
                <Typography variant="h6">Engineering Label Templates</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Choose from common engineering label pairs for professional forms and inspections.
              </Typography>

              <Grid container spacing={2}>
                {CHECKBOX_LABEL_TEMPLATES.map((category) => (
                  <Grid item xs={12} sm={6} key={category.category}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        {category.category}
                      </Typography>
                      <Box display="flex" flexDirection="column" gap={1}>
                        {category.templates.map((template, index) => (
                          <Button
                            key={index}
                            variant="outlined"
                            size="small"
                            onClick={() => handleApplyTemplate(template)}
                            disabled={disabled}
                            sx={{ justifyContent: 'flex-start' }}
                          >
                            <Box display="flex" alignItems="center" gap={1}>
                              <Chip
                                label={template.trueLabel}
                                size="small"
                                color="success"
                                variant="outlined"
                              />
                              <Typography variant="caption">/</Typography>
                              <Chip
                                label={template.falseLabel}
                                size="small"
                                color="default"
                                variant="outlined"
                              />
                            </Box>
                          </Button>
                        ))}
                      </Box>
                    </Paper>
                  </Grid>
                ))}
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
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={previewChecked}
                        indeterminate={watchedValues.indeterminate && !previewChecked}
                        onChange={(e) => setPreviewChecked(e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">
                          Sample Checkbox Field
                        </Typography>
                        {watchedValues.helpText && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {watchedValues.helpText}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </Box>

                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary">
                    Current State:
                    <Chip
                      label={previewChecked ? watchedValues.trueLabel : watchedValues.falseLabel}
                      size="small"
                      color={previewChecked ? 'success' : 'default'}
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Box>

                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary">
                    Configuration Summary:
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                    <Chip
                      label={`Default: ${watchedValues.defaultChecked ? watchedValues.trueLabel : watchedValues.falseLabel}`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`Labels: ${watchedValues.trueLabel}/${watchedValues.falseLabel}`}
                      size="small"
                      variant="outlined"
                    />
                    {watchedValues.indeterminate && (
                      <Chip
                        label="Indeterminate"
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    )}
                    {watchedValues.helpText && (
                      <Chip
                        label="Has Help Text"
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>

                {/* Value Examples */}
                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Data Values:
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip
                      label={`Checked: true → "${watchedValues.trueLabel}"`}
                      size="small"
                      variant="outlined"
                      sx={{ fontFamily: 'monospace' }}
                    />
                    <Chip
                      label={`Unchecked: false → "${watchedValues.falseLabel}"`}
                      size="small"
                      variant="outlined"
                      sx={{ fontFamily: 'monospace' }}
                    />
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

export default CheckboxFieldConfig;