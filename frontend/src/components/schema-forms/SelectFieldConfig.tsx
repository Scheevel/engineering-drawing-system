/**
 * Select Field Configuration Component
 *
 * Advanced configuration interface for dropdown/select fields including:
 * - Option management interface (add, edit, remove, reorder options)
 * - Allow custom values toggle for user-defined entries
 * - Default selection configuration
 * - Option grouping capabilities for large option sets
 * - Import options from existing schemas or templates
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
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  InputLabel,
  FormHelperText,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  List as ListIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragHandle as DragHandleIcon,
  Preview as PreviewIcon,
  GetApp as ImportIcon,
  Save as SaveIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { FieldConfigurationProps, FieldTypeConfig } from '../../types/schema';

// Engineering option templates
const ENGINEERING_OPTION_TEMPLATES = [
  {
    name: 'Material Types',
    category: 'Engineering',
    options: [
      { value: 'steel', label: 'Steel', group: 'Metals' },
      { value: 'aluminum', label: 'Aluminum', group: 'Metals' },
      { value: 'concrete', label: 'Concrete', group: 'Composites' },
      { value: 'timber', label: 'Timber', group: 'Natural' },
      { value: 'composite', label: 'Composite', group: 'Composites' },
    ],
  },
  {
    name: 'Steel Grades',
    category: 'Materials',
    options: [
      { value: 'a36', label: 'ASTM A36', group: 'Structural' },
      { value: 'a572', label: 'ASTM A572', group: 'Structural' },
      { value: 'a992', label: 'ASTM A992', group: 'Structural' },
      { value: 'a588', label: 'ASTM A588 (Weathering)', group: 'Weathering' },
      { value: 'a709', label: 'ASTM A709', group: 'Bridge' },
    ],
  },
  {
    name: 'Load Types',
    category: 'Analysis',
    options: [
      { value: 'dead', label: 'Dead Load', group: 'Permanent' },
      { value: 'live', label: 'Live Load', group: 'Variable' },
      { value: 'wind', label: 'Wind Load', group: 'Environmental' },
      { value: 'seismic', label: 'Seismic Load', group: 'Environmental' },
      { value: 'thermal', label: 'Thermal Load', group: 'Environmental' },
    ],
  },
  {
    name: 'Connection Types',
    category: 'Details',
    options: [
      { value: 'bolted', label: 'Bolted Connection', group: 'Mechanical' },
      { value: 'welded', label: 'Welded Connection', group: 'Fusion' },
      { value: 'riveted', label: 'Riveted Connection', group: 'Mechanical' },
      { value: 'pinned', label: 'Pinned Connection', group: 'Mechanical' },
    ],
  },
];

// Validation schema for select field configuration
const selectConfigValidationSchema = yup.object({
  options: yup
    .array()
    .of(
      yup.object({
        value: yup
          .string()
          .required('Option value is required')
          .matches(
            /^[a-zA-Z0-9_-]+$/,
            'Option value must contain only letters, numbers, hyphens, and underscores'
          ),
        label: yup.string().required('Option label is required').max(100, 'Label too long'),
        group: yup.string().max(50, 'Group name too long'),
        disabled: yup.boolean(),
      })
    )
    .min(1, 'At least one option is required')
    .test('unique-values', 'Option values must be unique', function(options) {
      if (!options) return true;
      const values = options.map(opt => opt.value);
      return values.length === new Set(values).size;
    }),
  multiple: yup.boolean(),
  allowCustom: yup.boolean(),
  defaultValue: yup.mixed(),
});

interface SelectOption {
  value: string;
  label: string;
  group?: string;
  disabled?: boolean;
}

interface SelectFieldConfigData {
  options: SelectOption[];
  multiple: boolean;
  allowCustom: boolean;
  defaultValue: string | string[];
}

const SelectFieldConfig: React.FC<FieldConfigurationProps> = ({
  fieldType,
  config,
  onChange,
  errors = [],
  disabled = false,
  showHelp = true,
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<SelectOption | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  // Initialize form with current config
  const {
    control,
    watch,
    setValue,
    formState: { errors: formErrors },
    trigger,
  } = useForm<SelectFieldConfigData>({
    resolver: yupResolver(selectConfigValidationSchema),
    defaultValues: {
      options: config.options || [{ value: 'option1', label: 'Option 1' }],
      multiple: config.multiple || false,
      allowCustom: config.allowCustom || false,
      defaultValue: config.defaultValue || (config.multiple ? [] : ''),
    },
    mode: 'onChange',
  });

  const { fields, append, remove, update, move } = useFieldArray({
    control,
    name: 'options',
  });

  const watchedValues = watch();

  // Update parent component when form values change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const newConfig: FieldTypeConfig['select'] = {
        options: watchedValues.options,
        multiple: watchedValues.multiple,
        allowCustom: watchedValues.allowCustom,
      };

      // Add default value if specified
      if (watchedValues.multiple) {
        if (Array.isArray(watchedValues.defaultValue) && watchedValues.defaultValue.length > 0) {
          (newConfig as any).defaultValue = watchedValues.defaultValue;
        }
      } else {
        if (typeof watchedValues.defaultValue === 'string' && watchedValues.defaultValue.trim()) {
          (newConfig as any).defaultValue = watchedValues.defaultValue.trim();
        }
      }

      onChange(newConfig);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [watchedValues, onChange]);

  const handleAddOption = () => {
    const newOption: SelectOption = {
      value: `option${fields.length + 1}`,
      label: `Option ${fields.length + 1}`,
    };
    append(newOption);
  };

  const handleEditOption = (index: number) => {
    setEditingOption(watchedValues.options[index]);
    setEditingIndex(index);
    setEditDialogOpen(true);
  };

  const handleDeleteOption = (index: number) => {
    remove(index);
  };

  const handleMoveOptionUp = (index: number) => {
    if (index > 0) {
      move(index, index - 1);
    }
  };

  const handleMoveOptionDown = (index: number) => {
    if (index < fields.length - 1) {
      move(index, index + 1);
    }
  };

  const handleSaveOption = (option: SelectOption) => {
    if (editingIndex >= 0) {
      update(editingIndex, option);
    } else {
      append(option);
    }
    setEditDialogOpen(false);
    setEditingOption(null);
    setEditingIndex(-1);
    trigger('options');
  };

  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingOption(null);
    setEditingIndex(-1);
  };

  const handleImportTemplate = (template: typeof ENGINEERING_OPTION_TEMPLATES[0]) => {
    // Replace existing options with template options
    setValue('options', template.options);
    setTemplateDialogOpen(false);
    trigger('options');
  };

  const getOptionGroups = () => {
    const groups = new Set(watchedValues.options.map(opt => opt.group).filter(Boolean));
    return Array.from(groups);
  };

  return (
    <Box>
      {showHelp && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<ListIcon />}>
          <Typography variant="body2">
            Configure dropdown/select fields with custom options, grouping, and validation.
            Perfect for standardized engineering choices like material types, load cases, and connection details.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Basic Configuration */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Selection Configuration
            </Typography>

            <Grid container spacing={2}>
              {/* Multiple Selection Toggle */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="multiple"
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
                            Multiple Selection
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {field.value ? 'Allow selecting multiple options' : 'Single selection only'}
                          </Typography>
                        </Box>
                      }
                    />
                  )}
                />
              </Grid>

              {/* Allow Custom Values Toggle */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="allowCustom"
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
                            Allow Custom Values
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {field.value ? 'Users can add custom options' : 'Restricted to defined options'}
                          </Typography>
                        </Box>
                      }
                    />
                  )}
                />
              </Grid>

              {/* Default Value */}
              <Grid item xs={12}>
                <Controller
                  name="defaultValue"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Default Selection (Optional)</InputLabel>
                      <Select
                        {...field}
                        disabled={disabled}
                        label="Default Selection (Optional)"
                      >
                        <MenuItem value="">
                          <em>No default selection</em>
                        </MenuItem>
                        {watchedValues.options.map((option) => (
                          <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
                            {option.label}
                            {option.group && (
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                ({option.group})
                              </Typography>
                            )}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>Pre-selected option when field is first displayed</FormHelperText>
                    </FormControl>
                  )}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Option Management */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Option Management ({fields.length} options)
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  startIcon={<ImportIcon />}
                  onClick={() => setTemplateDialogOpen(true)}
                  disabled={disabled}
                  size="small"
                >
                  Import Template
                </Button>
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddOption}
                  disabled={disabled}
                  variant="contained"
                  size="small"
                >
                  Add Option
                </Button>
              </Box>
            </Box>

            {/* Options List */}
            <List>
              {fields.map((field, index) => {
                const option = watchedValues.options[index];
                return (
                  <React.Fragment key={field.id}>
                    <ListItem>
                      <Box display="flex" alignItems="center" gap={1} flexGrow={1}>
                        <IconButton
                          size="small"
                          disabled={disabled}
                          sx={{ cursor: disabled ? 'default' : 'grab' }}
                        >
                          <DragHandleIcon />
                        </IconButton>
                        <Box flexGrow={1}>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body1" fontWeight={500}>
                                  {option?.label}
                                </Typography>
                                <Chip
                                  label={option?.value}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontFamily: 'monospace' }}
                                />
                                {option?.group && (
                                  <Chip
                                    label={option.group}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                )}
                                {option?.disabled && (
                                  <Chip
                                    label="Disabled"
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            }
                            secondary={`Value: ${option?.value}`}
                          />
                        </Box>
                      </Box>
                      <ListItemSecondaryAction>
                        <Box display="flex" gap={0.5}>
                          <IconButton
                            size="small"
                            onClick={() => handleMoveOptionUp(index)}
                            disabled={disabled || index === 0}
                          >
                            ↑
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleMoveOptionDown(index)}
                            disabled={disabled || index === fields.length - 1}
                          >
                            ↓
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleEditOption(index)}
                            disabled={disabled}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteOption(index)}
                            disabled={disabled || fields.length <= 1}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < fields.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>

            {/* Option Validation Errors */}
            {formErrors.options && (
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  {typeof formErrors.options.message === 'string'
                    ? formErrors.options.message
                    : 'Please fix option configuration errors'}
                </Typography>
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Option Groups Summary */}
        {getOptionGroups().length > 0 && (
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                Option Groups ({getOptionGroups().length})
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {getOptionGroups().map((group) => (
                  <Chip
                    key={group}
                    label={group}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                ))}
              </Box>
            </Paper>
          </Grid>
        )}

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
                  <FormControl fullWidth>
                    <InputLabel>Sample Select Field</InputLabel>
                    <Select
                      value={watchedValues.multiple ? (Array.isArray(watchedValues.defaultValue) ? watchedValues.defaultValue : []) : (watchedValues.defaultValue || '')}
                      label="Sample Select Field"
                      multiple={watchedValues.multiple}
                    >
                      {watchedValues.options.map((option) => (
                        <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
                          {option.label}
                          {option.group && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                              ({option.group})
                            </Typography>
                          )}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      {watchedValues.multiple ? 'Multiple selections allowed' : 'Single selection only'}
                      {watchedValues.allowCustom && ' • Custom values permitted'}
                    </FormHelperText>
                  </FormControl>
                </Box>

                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary">
                    Configuration Summary:
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                    <Chip
                      label={`${watchedValues.options.length} options`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={watchedValues.multiple ? 'Multiple' : 'Single'}
                      size="small"
                      variant="outlined"
                    />
                    {watchedValues.allowCustom && (
                      <Chip
                        label="Custom Values"
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    )}
                    {getOptionGroups().length > 0 && (
                      <Chip
                        label={`${getOptionGroups().length} groups`}
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

      {/* Option Edit Dialog */}
      <OptionEditDialog
        open={editDialogOpen}
        option={editingOption}
        onSave={handleSaveOption}
        onCancel={handleCancelEdit}
        existingValues={watchedValues.options.map(opt => opt.value).filter((_, i) => i !== editingIndex)}
      />

      {/* Template Import Dialog */}
      <TemplateImportDialog
        open={templateDialogOpen}
        onImport={handleImportTemplate}
        onClose={() => setTemplateDialogOpen(false)}
      />
    </Box>
  );
};

// Option Edit Dialog Component
interface OptionEditDialogProps {
  open: boolean;
  option: SelectOption | null;
  onSave: (option: SelectOption) => void;
  onCancel: () => void;
  existingValues: string[];
}

const OptionEditDialog: React.FC<OptionEditDialogProps> = ({
  open,
  option,
  onSave,
  onCancel,
  existingValues,
}) => {
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [group, setGroup] = useState('');
  const [isDisabled, setIsDisabled] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (option) {
      setValue(option.value);
      setLabel(option.label);
      setGroup(option.group || '');
      setIsDisabled(option.disabled || false);
    } else {
      setValue('');
      setLabel('');
      setGroup('');
      setIsDisabled(false);
    }
    setErrors([]);
  }, [option, open]);

  const handleSave = () => {
    const newErrors: string[] = [];

    if (!value.trim()) {
      newErrors.push('Value is required');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(value.trim())) {
      newErrors.push('Value must contain only letters, numbers, hyphens, and underscores');
    } else if (existingValues.includes(value.trim())) {
      newErrors.push('Value must be unique');
    }

    if (!label.trim()) {
      newErrors.push('Label is required');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      value: value.trim(),
      label: label.trim(),
      group: group.trim() || undefined,
      disabled: isDisabled,
    });
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        {option ? 'Edit Option' : 'Add Option'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              fullWidth
              required
              error={errors.some(e => e.includes('Value'))}
              helperText="Used internally (e.g., 'steel_grade_a36')"
              placeholder="option_value"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              fullWidth
              required
              error={errors.some(e => e.includes('Label'))}
              helperText="Displayed to users"
              placeholder="Option Label"
            />
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField
              label="Group (Optional)"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              fullWidth
              helperText="Group options together (e.g., 'Materials', 'Loads')"
              placeholder="Group Name"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={isDisabled}
                  onChange={(e) => setIsDisabled(e.target.checked)}
                />
              }
              label="Disabled"
              sx={{ mt: 1 }}
            />
          </Grid>
        </Grid>

        {errors.length > 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} startIcon={<CloseIcon />}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" startIcon={<SaveIcon />}>
          Save Option
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Template Import Dialog Component
interface TemplateImportDialogProps {
  open: boolean;
  onImport: (template: typeof ENGINEERING_OPTION_TEMPLATES[0]) => void;
  onClose: () => void;
}

const TemplateImportDialog: React.FC<TemplateImportDialogProps> = ({
  open,
  onImport,
  onClose,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Import Option Template
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Select a pre-defined template to quickly populate your dropdown options.
          This will replace your current options.
        </Typography>

        <Grid container spacing={2}>
          {ENGINEERING_OPTION_TEMPLATES.map((template) => (
            <Grid item xs={12} sm={6} key={template.name}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
                onClick={() => onImport(template)}
              >
                <Typography variant="h6" gutterBottom>
                  {template.name}
                </Typography>
                <Chip
                  label={template.category}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {template.options.length} options
                </Typography>
                <Box>
                  {template.options.slice(0, 3).map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                  {template.options.length > 3 && (
                    <Typography variant="caption" color="text.secondary">
                      +{template.options.length - 3} more
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} startIcon={<CloseIcon />}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SelectFieldConfig;