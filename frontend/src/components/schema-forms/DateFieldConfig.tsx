/**
 * Date Field Configuration Component
 *
 * Advanced configuration interface for date fields including:
 * - Date format selection (MM/DD/YYYY, DD/MM/YYYY, etc.)
 * - Min/max date constraints for valid ranges
 * - Default date behavior (today, blank, custom date)
 * - Date picker style preferences
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
  Select,
  MenuItem,
  InputLabel,
  FormHelperText,
  Radio,
  RadioGroup,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  DateRange as DateRangeIcon,
  Preview as PreviewIcon,
  Settings as SettingsIcon,
  Today as TodayIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { FieldConfigurationProps, FieldTypeConfig } from '../../types/schema';

// Common date formats used in engineering
const DATE_FORMATS = [
  { value: 'YYYY-MM-DD', label: 'ISO 8601 (2024-01-31)', example: '2024-01-31', description: 'International standard' },
  { value: 'MM/DD/YYYY', label: 'US Format (01/31/2024)', example: '01/31/2024', description: 'American standard' },
  { value: 'DD/MM/YYYY', label: 'European Format (31/01/2024)', example: '31/01/2024', description: 'European standard' },
  { value: 'DD-MM-YYYY', label: 'Hyphenated (31-01-2024)', example: '31-01-2024', description: 'Dash separated' },
  { value: 'MMM DD, YYYY', label: 'Month Name (Jan 31, 2024)', example: 'Jan 31, 2024', description: 'Readable format' },
  { value: 'DD MMM YYYY', label: 'Day Month Year (31 Jan 2024)', example: '31 Jan 2024', description: 'Technical format' },
];

// Engineering date range templates
const DATE_RANGE_TEMPLATES = [
  {
    name: 'Project Lifecycle',
    description: 'Typical construction project dates',
    minDate: new Date(new Date().getFullYear(), 0, 1), // Start of current year
    maxDate: new Date(new Date().getFullYear() + 5, 11, 31), // End of 5 years from now
  },
  {
    name: 'Inspection Window',
    description: 'Standard inspection scheduling',
    minDate: new Date(), // Today
    maxDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
  },
  {
    name: 'Historical Record',
    description: 'Past events and completions',
    minDate: new Date(1900, 0, 1), // Start of 1900
    maxDate: new Date(), // Today
  },
  {
    name: 'Maintenance Schedule',
    description: 'Future maintenance dates',
    minDate: new Date(), // Today
    maxDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
  },
];

// Validation schema for date field configuration
const dateConfigValidationSchema = yup.object({
  format: yup.string().required('Date format is required'),
  minDate: yup.date().nullable(),
  maxDate: yup.date().nullable().min(yup.ref('minDate'), 'Maximum date must be after minimum date'),
  defaultBehavior: yup.string().oneOf(['blank', 'today', 'custom'], 'Invalid default behavior'),
  customDefaultDate: yup.date().nullable(),
  showTime: yup.boolean(),
  helpText: yup.string().max(200, 'Help text must be less than 200 characters'),
});

interface DateFieldConfigData {
  format: string;
  minDate: Date | null;
  maxDate: Date | null;
  defaultBehavior: 'blank' | 'today' | 'custom';
  customDefaultDate: Date | null;
  showTime: boolean;
  helpText: string;
}

const DateFieldConfig: React.FC<FieldConfigurationProps> = ({
  fieldType,
  config,
  onChange,
  errors = [],
  disabled = false,
  showHelp = true,
}) => {
  const [testDate, setTestDate] = useState<Date>(new Date());

  // Initialize form with current config
  const {
    control,
    watch,
    setValue,
    formState: { errors: formErrors },
    trigger,
  } = useForm<DateFieldConfigData>({
    resolver: yupResolver(dateConfigValidationSchema),
    defaultValues: {
      format: config.format || 'YYYY-MM-DD',
      minDate: config.minDate ? new Date(config.minDate) : null,
      maxDate: config.maxDate ? new Date(config.maxDate) : null,
      defaultBehavior: (config.defaultBehavior as any) || 'blank',
      customDefaultDate: config.customDefaultDate ? new Date(config.customDefaultDate) : null,
      showTime: config.showTime || false,
      helpText: config.helpText || '',
    },
    mode: 'onChange',
  });

  const watchedValues = watch();

  // Update parent component when form values change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const newConfig: FieldTypeConfig['date'] = {
        format: watchedValues.format,
        showTime: watchedValues.showTime,
      };

      // Add date constraints if specified
      if (watchedValues.minDate) {
        (newConfig as any).minDate = watchedValues.minDate.toISOString().split('T')[0];
      }
      if (watchedValues.maxDate) {
        (newConfig as any).maxDate = watchedValues.maxDate.toISOString().split('T')[0];
      }

      // Add default behavior
      if (watchedValues.defaultBehavior !== 'blank') {
        (newConfig as any).defaultBehavior = watchedValues.defaultBehavior;
        if (watchedValues.defaultBehavior === 'custom' && watchedValues.customDefaultDate) {
          (newConfig as any).customDefaultDate = watchedValues.customDefaultDate.toISOString().split('T')[0];
        }
      }

      // Add help text if specified
      if (watchedValues.helpText?.trim()) {
        (newConfig as any).helpText = watchedValues.helpText.trim();
      }

      onChange(newConfig);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [watchedValues, onChange]);

  const handleApplyRangeTemplate = (template: typeof DATE_RANGE_TEMPLATES[0]) => {
    setValue('minDate', template.minDate);
    setValue('maxDate', template.maxDate);
    trigger(['minDate', 'maxDate']);
  };

  const handleClearDateRange = () => {
    setValue('minDate', null);
    setValue('maxDate', null);
    trigger(['minDate', 'maxDate']);
  };

  const formatDateForDisplay = (date: Date, format: string): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    switch (format) {
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'DD-MM-YYYY':
        return `${day}-${month}-${year}`;
      case 'MMM DD, YYYY':
        return `${monthNames[date.getMonth()]} ${day}, ${year}`;
      case 'DD MMM YYYY':
        return `${day} ${monthNames[date.getMonth()]} ${year}`;
      default:
        return date.toISOString().split('T')[0];
    }
  };

  const isDateInRange = (date: Date): boolean => {
    const { minDate, maxDate } = watchedValues;
    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;
    return true;
  };

  const getDefaultDateValue = (): string => {
    switch (watchedValues.defaultBehavior) {
      case 'today':
        return formatDateForDisplay(new Date(), watchedValues.format);
      case 'custom':
        return watchedValues.customDefaultDate
          ? formatDateForDisplay(watchedValues.customDefaultDate, watchedValues.format)
          : '';
      default:
        return '';
    }
  };

  return (
    <Box>
      {showHelp && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<DateRangeIcon />}>
          <Typography variant="body2">
            Configure date input fields with format validation, range constraints, and default behaviors.
            Essential for project timelines, inspection dates, and engineering milestones.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Date Format Configuration */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Date Format & Display
            </Typography>

            <Grid container spacing={2}>
              {/* Format Selection */}
              <Grid item xs={12}>
                <Controller
                  name="format"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Date Format</InputLabel>
                      <Select
                        {...field}
                        disabled={disabled}
                        label="Date Format"
                        error={!!formErrors.format}
                      >
                        {DATE_FORMATS.map((format) => (
                          <MenuItem key={format.value} value={format.value}>
                            <Box>
                              <Typography variant="body2" fontWeight={500}>
                                {format.label}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {format.description}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText error={!!formErrors.format}>
                        {formErrors.format?.message || 'Choose how dates will be displayed and entered'}
                      </FormHelperText>
                    </FormControl>
                  )}
                />
              </Grid>

              {/* Show Time Toggle */}
              <Grid item xs={12}>
                <Controller
                  name="showTime"
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
                            Include Time Selection
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {field.value ? 'Date and time picker' : 'Date only picker'}
                          </Typography>
                        </Box>
                      }
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
                        'Additional guidance for date selection'
                      }
                      placeholder="e.g., Select the project completion date"
                      inputProps={{ maxLength: 200 }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Default Value Configuration */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Default Value Behavior
            </Typography>

            <Grid container spacing={2}>
              {/* Default Behavior Selection */}
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Default Date
                    </Typography>
                  </FormLabel>
                  <Controller
                    name="defaultBehavior"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup
                        {...field}
                        row={false}
                      >
                        <FormControlLabel
                          value="blank"
                          control={<Radio disabled={disabled} />}
                          label={
                            <Box>
                              <Typography variant="body2">No Default (Blank)</Typography>
                              <Typography variant="caption" color="text.secondary">
                                User must select a date
                              </Typography>
                            </Box>
                          }
                        />
                        <FormControlLabel
                          value="today"
                          control={<Radio disabled={disabled} />}
                          label={
                            <Box>
                              <Typography variant="body2">Today's Date</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Automatically set to current date
                              </Typography>
                            </Box>
                          }
                        />
                        <FormControlLabel
                          value="custom"
                          control={<Radio disabled={disabled} />}
                          label={
                            <Box>
                              <Typography variant="body2">Custom Date</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Set a specific default date
                              </Typography>
                            </Box>
                          }
                        />
                      </RadioGroup>
                    )}
                  />
                </FormControl>
              </Grid>

              {/* Custom Default Date */}
              {watchedValues.defaultBehavior === 'custom' && (
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="customDefaultDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Custom Default Date"
                        type="date"
                        fullWidth
                        disabled={disabled}
                        value={field.value ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : null;
                          field.onChange(date);
                        }}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        helperText="The default date to pre-select"
                      />
                    )}
                  />
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* Date Range Configuration */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={1}>
                <SettingsIcon color="primary" />
                <Typography variant="h6">Date Range Constraints</Typography>
                {(watchedValues.minDate || watchedValues.maxDate) && (
                  <Chip label="Range Set" color="primary" size="small" />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                {/* Range Templates */}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Engineering Date Range Templates
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                    {DATE_RANGE_TEMPLATES.map((template) => (
                      <Button
                        key={template.name}
                        variant="outlined"
                        size="small"
                        onClick={() => handleApplyRangeTemplate(template)}
                        disabled={disabled}
                      >
                        {template.name}
                      </Button>
                    ))}
                    <Button
                      variant="outlined"
                      size="small"
                      color="secondary"
                      onClick={handleClearDateRange}
                      disabled={disabled}
                    >
                      Clear Range
                    </Button>
                  </Box>
                </Grid>

                {/* Min/Max Date Inputs */}
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="minDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Minimum Date (Optional)"
                        type="date"
                        fullWidth
                        disabled={disabled}
                        value={field.value ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : null;
                          field.onChange(date);
                        }}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        helperText="Earliest selectable date"
                        error={!!formErrors.minDate}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Controller
                    name="maxDate"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Maximum Date (Optional)"
                        type="date"
                        fullWidth
                        disabled={disabled}
                        value={field.value ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : null;
                          field.onChange(date);
                        }}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        helperText="Latest selectable date"
                        error={!!formErrors.maxDate}
                      />
                    )}
                  />
                </Grid>

                {/* Range Summary */}
                {(watchedValues.minDate || watchedValues.maxDate) && (
                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Date Range Summary
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Valid dates: {' '}
                        {watchedValues.minDate
                          ? formatDateForDisplay(watchedValues.minDate, watchedValues.format)
                          : '∞'
                        } {' → '} {
                          watchedValues.maxDate
                            ? formatDateForDisplay(watchedValues.maxDate, watchedValues.format)
                            : '∞'
                        }
                      </Typography>
                    </Paper>
                  </Grid>
                )}
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
                    label="Sample Date Field"
                    type={watchedValues.showTime ? 'datetime-local' : 'date'}
                    fullWidth
                    value={testDate.toISOString().split('T')[0]}
                    onChange={(e) => setTestDate(new Date(e.target.value))}
                    error={!isDateInRange(testDate)}
                    helperText={
                      <>
                        {watchedValues.helpText && (
                          <span>{watchedValues.helpText}<br /></span>
                        )}
                        Format: {watchedValues.format}
                        {watchedValues.showTime && ' + Time'}
                        {(watchedValues.minDate || watchedValues.maxDate) && (
                          <span><br />Valid range: {
                            watchedValues.minDate
                              ? formatDateForDisplay(watchedValues.minDate, watchedValues.format)
                              : '∞'
                          } → {
                            watchedValues.maxDate
                              ? formatDateForDisplay(watchedValues.maxDate, watchedValues.format)
                              : '∞'
                          }</span>
                        )}
                        {!isDateInRange(testDate) && (
                          <span><br />⚠️ Selected date is outside valid range</span>
                        )}
                      </>
                    }
                    InputLabelProps={{
                      shrink: true,
                    }}
                    inputProps={{
                      min: watchedValues.minDate?.toISOString().split('T')[0],
                      max: watchedValues.maxDate?.toISOString().split('T')[0],
                    }}
                  />
                </Box>

                <Box mt={2}>
                  <Typography variant="body2" color="text.secondary">
                    Formatted Display: {formatDateForDisplay(testDate, watchedValues.format)}
                  </Typography>
                  {getDefaultDateValue() && (
                    <Typography variant="body2" color="text.secondary">
                      Default Value: {getDefaultDateValue()}
                    </Typography>
                  )}
                </Box>

                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary">
                    Configuration Summary:
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                    <Chip
                      label={`Format: ${watchedValues.format}`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={watchedValues.showTime ? 'Date + Time' : 'Date Only'}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`Default: ${watchedValues.defaultBehavior}`}
                      size="small"
                      variant="outlined"
                    />
                    {(watchedValues.minDate || watchedValues.maxDate) && (
                      <Chip
                        label="Range Constrained"
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

export default DateFieldConfig;