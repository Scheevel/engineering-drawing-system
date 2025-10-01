/**
 * Advanced Field Configuration Component
 *
 * Provides sophisticated configuration interfaces for different field types
 * including select options, number formatting, date settings, and more.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Tabs,
  Tab,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  DragIndicator as DragIcon,
  Settings as SettingsIcon,
  Category as CategoryIcon,
  FormatListNumbered as NumberIcon,
  DateRange as DateIcon,
  TextFields as TextIcon,
  CheckBox as CheckboxIcon,
  ArrowUpward as UpIcon,
  ArrowDownward as DownIcon,
  ListAlt as MultiSelectIcon,
  Search as AutocompleteIcon,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { SchemaFieldType } from '../../services/api';

export interface SelectOption {
  id: string;
  value: string;
  label: string;
  description?: string;
  category?: string;
  isDefault?: boolean;
  isDisabled?: boolean;
  metadata?: Record<string, any>;
}

export interface SelectFieldConfig {
  options: SelectOption[];
  allowMultiple: boolean;
  minSelections?: number;
  maxSelections?: number;
  allowCustomValues: boolean;
  placeholder?: string;
  groupByCategory: boolean;
  searchable: boolean;
}

export interface NumberFieldConfig {
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  unit?: string;
  displayFormat?: 'decimal' | 'scientific' | 'currency' | 'percentage';
  currencyCode?: string;
  allowNegative: boolean;
  allowZero: boolean;
  autoCalculation?: {
    formula: string;
    dependentFields: string[];
  };
}

export interface DateFieldConfig {
  minDate?: string;
  maxDate?: string;
  format?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'custom';
  customFormat?: string;
  timezone?: string;
  allowTime: boolean;
  timeFormat?: '12h' | '24h';
  businessDaysOnly: boolean;
  excludeWeekends: boolean;
  holidays?: string[];
}

export interface TextFieldConfig {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  mask?: string;
  transform?: 'uppercase' | 'lowercase' | 'titlecase' | 'none';
  autoComplete?: string[];
  suggestions?: string[];
  multiline: boolean;
  rows?: number;
}

export interface AdvancedFieldConfiguration {
  fieldType: SchemaFieldType;
  config: SelectFieldConfig | NumberFieldConfig | DateFieldConfig | TextFieldConfig | Record<string, any>;
}

export interface AdvancedFieldConfigProps {
  fieldType: SchemaFieldType;
  currentConfig: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
  availableFields?: Array<{ id: string; name: string; type: SchemaFieldType }>;
  readOnly?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`field-config-tabpanel-${index}`}
      aria-labelledby={`field-config-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

const ENGINEERING_UNITS = [
  'in', 'ft', 'mm', 'cm', 'm',
  'lb', 'lbs', 'kip', 'kips', 'kg', 'ton',
  'psi', 'ksi', 'MPa', 'GPa',
  'deg', 'rad', 'percent', '%',
];

const TIMEZONE_OPTIONS = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
];

const ENGINEERING_SELECT_CATEGORIES = {
  'Materials': ['Steel', 'Concrete', 'Composite', 'Timber'],
  'Steel Grades': ['A36', 'A572', 'A992', 'A588', 'A709'],
  'Connection Types': ['Bolted', 'Welded', 'Riveted', 'Pinned'],
  'Load Types': ['Dead Load', 'Live Load', 'Wind Load', 'Seismic Load', 'Impact Load'],
  'Member Types': ['Beam', 'Column', 'Girder', 'Truss', 'Plate', 'Angle', 'Channel'],
};

const AdvancedFieldConfig: React.FC<AdvancedFieldConfigProps> = ({
  fieldType,
  currentConfig,
  onConfigChange,
  availableFields = [],
  readOnly = false,
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [showOptionDialog, setShowOptionDialog] = useState(false);
  const [editingOption, setEditingOption] = useState<SelectOption | null>(null);

  const getTabsForFieldType = (type: SchemaFieldType) => {
    switch (type) {
      case 'select':
      case 'multiselect':
      case 'autocomplete':
        return ['Options', 'Behavior', 'Display'];
      case 'number':
        return ['Range & Format', 'Units & Display', 'Calculations'];
      case 'date':
        return ['Date Range', 'Format & Timezone', 'Business Rules'];
      case 'text':
      case 'textarea':
        return ['Validation', 'Formatting', 'Suggestions'];
      case 'checkbox':
        return ['Display', 'Behavior'];
      default:
        return ['Configuration'];
    }
  };

  const tabs = getTabsForFieldType(fieldType);

  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  }, []);

  const updateConfig = useCallback((updates: Record<string, any>) => {
    const newConfig = { ...currentConfig, ...updates };
    onConfigChange(newConfig);
  }, [currentConfig, onConfigChange]);

  const renderSelectConfiguration = () => {
    const selectConfig = currentConfig as SelectFieldConfig;
    const options = selectConfig.options || [];

    const handleAddOption = () => {
      setEditingOption({
        id: `option_${Date.now()}`,
        value: '',
        label: '',
        category: '',
        isDefault: false,
        isDisabled: false,
      });
      setShowOptionDialog(true);
    };

    const handleEditOption = (option: SelectOption) => {
      setEditingOption(option);
      setShowOptionDialog(true);
    };

    const handleDeleteOption = (optionId: string) => {
      const newOptions = options.filter(opt => opt.id !== optionId);
      updateConfig({ options: newOptions });
    };

    const handleMoveOption = (optionId: string, direction: 'up' | 'down') => {
      const currentIndex = options.findIndex(opt => opt.id === optionId);
      if (currentIndex === -1) return;

      const newOptions = [...options];
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (newIndex >= 0 && newIndex < options.length) {
        [newOptions[currentIndex], newOptions[newIndex]] = [newOptions[newIndex], newOptions[currentIndex]];
        updateConfig({ options: newOptions });
      }
    };

    const handleSaveOption = (option: SelectOption) => {
      const existingIndex = options.findIndex(opt => opt.id === option.id);
      let newOptions;

      if (existingIndex >= 0) {
        newOptions = [...options];
        newOptions[existingIndex] = option;
      } else {
        newOptions = [...options, option];
      }

      updateConfig({ options: newOptions });
      setShowOptionDialog(false);
      setEditingOption(null);
    };

    const addEngineeringCategory = (categoryName: string) => {
      const categoryOptions = ENGINEERING_SELECT_CATEGORIES[categoryName as keyof typeof ENGINEERING_SELECT_CATEGORIES];
      const newOptions = categoryOptions.map((value, index) => ({
        id: `${categoryName.toLowerCase()}_${index}`,
        value: value.toLowerCase().replace(/\s+/g, '_'),
        label: value,
        category: categoryName,
        isDefault: false,
        isDisabled: false,
      }));

      updateConfig({ options: [...options, ...newOptions] });
    };

    return (
      <>
        <TabPanel value={currentTab} index={0}>
          <Card variant="outlined">
            <CardHeader
              title="Select Options"
              action={
                !readOnly && (
                  <Box display="flex" gap={1}>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Add Category</InputLabel>
                      <Select
                        value=""
                        label="Add Category"
                        onChange={(e) => addEngineeringCategory(e.target.value)}
                      >
                        {Object.keys(ENGINEERING_SELECT_CATEGORIES).map((category) => (
                          <MenuItem key={category} value={category}>
                            {category}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={handleAddOption}
                      variant="contained"
                      size="small"
                    >
                      Add Option
                    </Button>
                  </Box>
                )
              }
            />
            <CardContent>
              {options.length === 0 ? (
                <Alert severity="info">
                  No options configured. Add options to make this field functional.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Order</TableCell>
                        <TableCell>Label</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {options.map((option, index) => (
                        <TableRow key={option.id}>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <DragIcon color="action" />
                              {index + 1}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {option.label}
                              {option.isDefault && (
                                <Chip label="Default" size="small" color="primary" />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {option.value}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {option.category && (
                              <Chip label={option.category} size="small" variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={option.isDisabled ? 'Disabled' : 'Active'}
                              size="small"
                              color={option.isDisabled ? 'default' : 'success'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            {!readOnly && (
                              <Box display="flex" gap={0.5}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleMoveOption(option.id, 'up')}
                                  disabled={index === 0}
                                >
                                  <UpIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleMoveOption(option.id, 'down')}
                                  disabled={index === options.length - 1}
                                >
                                  <DownIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditOption(option)}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteOption(option.id)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Selection Behavior
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={selectConfig.allowMultiple || false}
                        onChange={(e) => updateConfig({ allowMultiple: e.target.checked })}
                        disabled={readOnly}
                      />
                    }
                    label="Allow multiple selections"
                  />

                  {selectConfig.allowMultiple && (
                    <Box mt={2}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <TextField
                            label="Minimum Selections"
                            type="number"
                            size="small"
                            value={selectConfig.minSelections || ''}
                            onChange={(e) => updateConfig({
                              minSelections: e.target.value ? parseInt(e.target.value) : undefined
                            })}
                            disabled={readOnly}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            label="Maximum Selections"
                            type="number"
                            size="small"
                            value={selectConfig.maxSelections || ''}
                            onChange={(e) => updateConfig({
                              maxSelections: e.target.value ? parseInt(e.target.value) : undefined
                            })}
                            disabled={readOnly}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  <FormControlLabel
                    control={
                      <Switch
                        checked={selectConfig.allowCustomValues || false}
                        onChange={(e) => updateConfig({ allowCustomValues: e.target.checked })}
                        disabled={readOnly}
                      />
                    }
                    label="Allow custom values (not in list)"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    User Experience
                  </Typography>

                  <TextField
                    label="Placeholder Text"
                    fullWidth
                    size="small"
                    value={selectConfig.placeholder || ''}
                    onChange={(e) => updateConfig({ placeholder: e.target.value })}
                    disabled={readOnly}
                    margin="normal"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={selectConfig.searchable !== false}
                        onChange={(e) => updateConfig({ searchable: e.target.checked })}
                        disabled={readOnly}
                      />
                    }
                    label="Enable search/filtering"
                    sx={{ mt: 1 }}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={selectConfig.groupByCategory || false}
                        onChange={(e) => updateConfig({ groupByCategory: e.target.checked })}
                        disabled={readOnly}
                      />
                    }
                    label="Group options by category"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Display Settings
              </Typography>
              <Alert severity="info">
                Display settings will be available in the Field Display Management module.
              </Alert>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Option Editor Dialog */}
        <Dialog
          open={showOptionDialog}
          onClose={() => setShowOptionDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingOption?.id?.startsWith('option_') ? 'Add Option' : 'Edit Option'}
          </DialogTitle>
          <DialogContent>
            {editingOption && (
              <OptionEditor
                option={editingOption}
                onSave={handleSaveOption}
                onCancel={() => setShowOptionDialog(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  };

  const renderNumberConfiguration = () => {
    const numberConfig = currentConfig as NumberFieldConfig;

    return (
      <>
        <TabPanel value={currentTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Value Range
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        label="Minimum Value"
                        type="number"
                        fullWidth
                        size="small"
                        value={numberConfig.min || ''}
                        onChange={(e) => updateConfig({
                          min: e.target.value ? parseFloat(e.target.value) : undefined
                        })}
                        disabled={readOnly}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Maximum Value"
                        type="number"
                        fullWidth
                        size="small"
                        value={numberConfig.max || ''}
                        onChange={(e) => updateConfig({
                          max: e.target.value ? parseFloat(e.target.value) : undefined
                        })}
                        disabled={readOnly}
                      />
                    </Grid>
                  </Grid>

                  <TextField
                    label="Step Size"
                    type="number"
                    fullWidth
                    size="small"
                    value={numberConfig.step || ''}
                    onChange={(e) => updateConfig({
                      step: e.target.value ? parseFloat(e.target.value) : undefined
                    })}
                    disabled={readOnly}
                    margin="normal"
                    helperText="Increment for number input controls"
                  />

                  <TextField
                    label="Decimal Precision"
                    type="number"
                    fullWidth
                    size="small"
                    value={numberConfig.precision || ''}
                    onChange={(e) => updateConfig({
                      precision: e.target.value ? parseInt(e.target.value) : undefined
                    })}
                    disabled={readOnly}
                    margin="normal"
                    helperText="Number of decimal places"
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Value Constraints
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={numberConfig.allowNegative !== false}
                        onChange={(e) => updateConfig({ allowNegative: e.target.checked })}
                        disabled={readOnly}
                      />
                    }
                    label="Allow negative values"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={numberConfig.allowZero !== false}
                        onChange={(e) => updateConfig({ allowZero: e.target.checked })}
                        disabled={readOnly}
                      />
                    }
                    label="Allow zero value"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Units & Formatting
                  </Typography>

                  <FormControl fullWidth size="small" margin="normal">
                    <InputLabel>Unit of Measurement</InputLabel>
                    <Select
                      value={numberConfig.unit || ''}
                      label="Unit of Measurement"
                      onChange={(e) => updateConfig({ unit: e.target.value })}
                      disabled={readOnly}
                    >
                      <MenuItem value="">No Unit</MenuItem>
                      {ENGINEERING_UNITS.map((unit) => (
                        <MenuItem key={unit} value={unit}>
                          {unit}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small" margin="normal">
                    <InputLabel>Display Format</InputLabel>
                    <Select
                      value={numberConfig.displayFormat || 'decimal'}
                      label="Display Format"
                      onChange={(e) => updateConfig({ displayFormat: e.target.value })}
                      disabled={readOnly}
                    >
                      <MenuItem value="decimal">Decimal (123.45)</MenuItem>
                      <MenuItem value="scientific">Scientific (1.23e+2)</MenuItem>
                      <MenuItem value="currency">Currency ($123.45)</MenuItem>
                      <MenuItem value="percentage">Percentage (12.3%)</MenuItem>
                    </Select>
                  </FormControl>

                  {numberConfig.displayFormat === 'currency' && (
                    <TextField
                      label="Currency Code"
                      size="small"
                      value={numberConfig.currencyCode || 'USD'}
                      onChange={(e) => updateConfig({ currencyCode: e.target.value })}
                      disabled={readOnly}
                      margin="normal"
                      sx={{ width: '150px' }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Auto-Calculation (Advanced)
              </Typography>
              <Alert severity="info">
                Auto-calculation will be available in the Field Dependencies module.
              </Alert>
            </CardContent>
          </Card>
        </TabPanel>
      </>
    );
  };

  const renderDateConfiguration = () => {
    const dateConfig = currentConfig as DateFieldConfig;

    return (
      <>
        <TabPanel value={currentTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Date Range
                  </Typography>

                  <TextField
                    label="Minimum Date"
                    type="date"
                    fullWidth
                    size="small"
                    value={dateConfig.minDate || ''}
                    onChange={(e) => updateConfig({ minDate: e.target.value })}
                    disabled={readOnly}
                    InputLabelProps={{ shrink: true }}
                    margin="normal"
                  />

                  <TextField
                    label="Maximum Date"
                    type="date"
                    fullWidth
                    size="small"
                    value={dateConfig.maxDate || ''}
                    onChange={(e) => updateConfig({ maxDate: e.target.value })}
                    disabled={readOnly}
                    InputLabelProps={{ shrink: true }}
                    margin="normal"
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Format & Display
                  </Typography>

                  <FormControl fullWidth size="small" margin="normal">
                    <InputLabel>Date Format</InputLabel>
                    <Select
                      value={dateConfig.format || 'MM/DD/YYYY'}
                      label="Date Format"
                      onChange={(e) => updateConfig({ format: e.target.value })}
                      disabled={readOnly}
                    >
                      <MenuItem value="MM/DD/YYYY">MM/DD/YYYY (US)</MenuItem>
                      <MenuItem value="DD/MM/YYYY">DD/MM/YYYY (EU)</MenuItem>
                      <MenuItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</MenuItem>
                      <MenuItem value="custom">Custom Format</MenuItem>
                    </Select>
                  </FormControl>

                  {dateConfig.format === 'custom' && (
                    <TextField
                      label="Custom Format"
                      fullWidth
                      size="small"
                      value={dateConfig.customFormat || ''}
                      onChange={(e) => updateConfig({ customFormat: e.target.value })}
                      disabled={readOnly}
                      margin="normal"
                      helperText="Use moment.js format tokens"
                    />
                  )}

                  <FormControl fullWidth size="small" margin="normal">
                    <InputLabel>Timezone</InputLabel>
                    <Select
                      value={dateConfig.timezone || 'UTC'}
                      label="Timezone"
                      onChange={(e) => updateConfig({ timezone: e.target.value })}
                      disabled={readOnly}
                    >
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <MenuItem key={tz} value={tz}>
                          {tz}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Time Settings
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={dateConfig.allowTime || false}
                        onChange={(e) => updateConfig({ allowTime: e.target.checked })}
                        disabled={readOnly}
                      />
                    }
                    label="Include time selection"
                  />

                  {dateConfig.allowTime && (
                    <FormControl size="small" margin="normal" sx={{ ml: 2, minWidth: 120 }}>
                      <InputLabel>Time Format</InputLabel>
                      <Select
                        value={dateConfig.timeFormat || '12h'}
                        label="Time Format"
                        onChange={(e) => updateConfig({ timeFormat: e.target.value })}
                        disabled={readOnly}
                      >
                        <MenuItem value="12h">12 Hour (AM/PM)</MenuItem>
                        <MenuItem value="24h">24 Hour</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Business Rules
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={dateConfig.businessDaysOnly || false}
                    onChange={(e) => updateConfig({ businessDaysOnly: e.target.checked })}
                    disabled={readOnly}
                  />
                }
                label="Business days only (Mon-Fri)"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={dateConfig.excludeWeekends || false}
                    onChange={(e) => updateConfig({ excludeWeekends: e.target.checked })}
                    disabled={readOnly}
                  />
                }
                label="Exclude weekends"
                sx={{ mt: 1 }}
              />

              <Alert severity="info" sx={{ mt: 2 }}>
                Holiday configuration and advanced business rules will be available in a future release.
              </Alert>
            </CardContent>
          </Card>
        </TabPanel>
      </>
    );
  };

  const renderDefaultConfiguration = () => {
    return (
      <TabPanel value={currentTab} index={0}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Basic Configuration
            </Typography>
            <Alert severity="info">
              Advanced configuration options for {fieldType} fields will be added in future releases.
            </Alert>
          </CardContent>
        </Card>
      </TabPanel>
    );
  };

  const renderConfiguration = () => {
    switch (fieldType) {
      case 'select':
      case 'multiselect':
      case 'autocomplete':
        return renderSelectConfiguration();
      case 'number':
        return renderNumberConfiguration();
      case 'date':
        return renderDateConfiguration();
      default:
        return renderDefaultConfiguration();
    }
  };

  const getFieldTypeIcon = (type: SchemaFieldType) => {
    switch (type) {
      case 'select': return <CategoryIcon />;
      case 'multiselect': return <MultiSelectIcon />;
      case 'autocomplete': return <AutocompleteIcon />;
      case 'number': return <NumberIcon />;
      case 'date': return <DateIcon />;
      case 'text': case 'textarea': return <TextIcon />;
      case 'checkbox': return <CheckboxIcon />;
      default: return <SettingsIcon />;
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        {getFieldTypeIcon(fieldType)}
        <Typography variant="h6">
          Advanced {fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} Field Configuration
        </Typography>
      </Box>

      <Card variant="outlined">
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            {tabs.map((tab, index) => (
              <Tab key={index} label={tab} />
            ))}
          </Tabs>
        </Box>

        {renderConfiguration()}
      </Card>
    </Box>
  );
};

// Option Editor Sub-component
interface OptionEditorProps {
  option: SelectOption;
  onSave: (option: SelectOption) => void;
  onCancel: () => void;
}

const OptionEditor: React.FC<OptionEditorProps> = ({ option, onSave, onCancel }) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SelectOption>({
    defaultValues: option,
  });

  return (
    <form onSubmit={handleSubmit(onSave)}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Controller
            name="label"
            control={control}
            rules={{ required: 'Label is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Display Label"
                fullWidth
                error={!!errors.label}
                helperText={errors.label?.message}
              />
            )}
          />
        </Grid>

        <Grid item xs={12}>
          <Controller
            name="value"
            control={control}
            rules={{ required: 'Value is required' }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Internal Value"
                fullWidth
                error={!!errors.value}
                helperText={errors.value?.message || "Value stored in database"}
              />
            )}
          />
        </Grid>

        <Grid item xs={12}>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Description (optional)"
                fullWidth
                multiline
                rows={2}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Category (optional)"
                fullWidth
              />
            )}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Box display="flex" flexDirection="column" gap={1}>
            <Controller
              name="isDefault"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} />}
                  label="Default option"
                />
              )}
            />

            <Controller
              name="isDisabled"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} />}
                  label="Disabled"
                />
              )}
            />
          </Box>
        </Grid>
      </Grid>

      <Box display="flex" justifyContent="flex-end" gap={1} mt={3}>
        <Button onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="contained">
          Save Option
        </Button>
      </Box>
    </form>
  );
};

export default AdvancedFieldConfig;