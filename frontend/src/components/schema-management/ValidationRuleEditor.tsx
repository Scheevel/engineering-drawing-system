/**
 * Validation Rule Editor Component
 *
 * Provides a comprehensive interface for creating and editing validation rules
 * with type-specific configuration panels and real-time preview functionality.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Tabs,
  Tab,
  Alert,
  Chip,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Slider,
  Grid,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Help as HelpIcon,
  TestTube as TestIcon,
  Code as CodeIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { SchemaFieldType } from '../../services/api';

export interface ValidationRule {
  id: string;
  type: 'pattern' | 'range' | 'length' | 'dependency' | 'custom';
  name: string;
  description: string;
  config: Record<string, any>;
  errorMessage: string;
  priority: number;
  isActive: boolean;
  fieldTypes: SchemaFieldType[];
  isBuiltIn: boolean;
}

export interface ValidationRuleEditorProps {
  open: boolean;
  rule: ValidationRule;
  fieldType: SchemaFieldType;
  availableFields: Array<{ id: string; name: string; type: SchemaFieldType }>;
  onSave: (rule: ValidationRule) => void;
  onClose: () => void;
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
      id={`validation-rule-tabpanel-${index}`}
      aria-labelledby={`validation-rule-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

const validationRuleSchema = yup.object({
  name: yup.string().required('Rule name is required').max(100, 'Name must be 100 characters or less'),
  description: yup.string().max(500, 'Description must be 500 characters or less'),
  errorMessage: yup.string().required('Error message is required').max(200, 'Error message must be 200 characters or less'),
  type: yup.string().oneOf(['pattern', 'range', 'length', 'dependency', 'custom']).required(),
  priority: yup.number().min(1).max(100).required(),
  isActive: yup.boolean(),
});

const RULE_TYPE_DESCRIPTIONS = {
  pattern: 'Validates text format using regular expressions',
  range: 'Validates numeric values within specified ranges',
  length: 'Validates text length constraints',
  dependency: 'Validates based on other field values',
  custom: 'Custom validation logic',
};

const ENGINEERING_PATTERNS = {
  'Drawing Number': '^[A-Z]{2,3}-\\d{4,6}(-[A-Z]\\d*)?$',
  'Part Number': '^[A-Z0-9]{4,12}$',
  'Material Grade': '^(A36|A572|A992|A588)(-\\w+)?$',
  'Dimension': '^\\d+(\\.\\d+)?"?\\s?(in|ft|mm|cm|m)?$',
  'Load Rating': '^\\d+(\\.\\d+)?\\s?(lb|lbs|kip|kips|kg|ton)$',
};

const ValidationRuleEditor: React.FC<ValidationRuleEditorProps> = ({
  open,
  rule,
  fieldType,
  availableFields,
  onSave,
  onClose,
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [testValue, setTestValue] = useState('');
  const [testResult, setTestResult] = useState<{ isValid: boolean; message: string } | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<ValidationRule>({
    resolver: yupResolver(validationRuleSchema),
    defaultValues: rule,
  });

  const watchedType = watch('type');
  const watchedConfig = watch('config');

  useEffect(() => {
    reset(rule);
    setTestResult(null);
    setTestValue('');
  }, [rule, reset]);

  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  }, []);

  const handlePatternSelect = useCallback((pattern: string) => {
    setValue('config.pattern', pattern, { shouldDirty: true });
  }, [setValue]);

  const handleTestRule = useCallback(() => {
    const currentRule = {
      ...rule,
      type: watchedType,
      config: watchedConfig,
    };

    try {
      let isValid = false;
      let message = '';

      switch (currentRule.type) {
        case 'pattern':
          if (currentRule.config.pattern) {
            const regex = new RegExp(currentRule.config.pattern);
            isValid = regex.test(testValue);
            message = isValid ? 'Pattern matches' : 'Pattern does not match';
          } else {
            message = 'No pattern defined';
          }
          break;

        case 'range':
          const numValue = parseFloat(testValue);
          if (isNaN(numValue)) {
            message = 'Invalid number';
            break;
          }
          const { min, max, exclusive } = currentRule.config;
          isValid = true;
          if (min !== undefined) {
            isValid = exclusive ? numValue > min : numValue >= min;
          }
          if (max !== undefined && isValid) {
            isValid = exclusive ? numValue < max : numValue <= max;
          }
          message = isValid ? 'Value within range' : 'Value outside range';
          break;

        case 'length':
          const { min: minLen, max: maxLen } = currentRule.config;
          const length = testValue.length;
          isValid = true;
          if (minLen !== undefined) {
            isValid = length >= minLen;
          }
          if (maxLen !== undefined && isValid) {
            isValid = length <= maxLen;
          }
          message = isValid ? 'Length within limits' : 'Length outside limits';
          break;

        default:
          message = 'Testing not available for this rule type';
      }

      setTestResult({ isValid, message });
    } catch (error) {
      setTestResult({
        isValid: false,
        message: `Test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }, [rule, watchedType, watchedConfig, testValue]);

  const onSubmit = useCallback((data: ValidationRule) => {
    onSave({
      ...data,
      fieldTypes: [fieldType],
      isBuiltIn: false,
    });
  }, [onSave, fieldType]);

  const renderConfigPanel = () => {
    switch (watchedType) {
      case 'pattern':
        return (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Pattern Configuration
              </Typography>

              <Controller
                name="config.pattern"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Regular Expression Pattern"
                    fullWidth
                    margin="normal"
                    placeholder="e.g., ^[A-Z]{2,3}-\d{4,6}$"
                    helperText="Enter a valid JavaScript regular expression"
                    InputProps={{
                      endAdornment: (
                        <Tooltip title="Pattern help">
                          <IconButton size="small">
                            <HelpIcon />
                          </IconButton>
                        </Tooltip>
                      ),
                    }}
                  />
                )}
              />

              <Box mt={2}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Common Engineering Patterns:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {Object.entries(ENGINEERING_PATTERNS).map(([name, pattern]) => (
                    <Chip
                      key={name}
                      label={name}
                      size="small"
                      onClick={() => handlePatternSelect(pattern)}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>

              <Controller
                name="config.flags"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Regex Flags (optional)"
                    margin="normal"
                    placeholder="e.g., i, g, m"
                    helperText="Common flags: i (case-insensitive), g (global), m (multiline)"
                    sx={{ mt: 2, width: '200px' }}
                  />
                )}
              />
            </CardContent>
          </Card>
        );

      case 'range':
        return (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Range Configuration
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Controller
                    name="config.min"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Minimum Value"
                        type="number"
                        fullWidth
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Controller
                    name="config.max"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Maximum Value"
                        type="number"
                        fullWidth
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    )}
                  />
                </Grid>
              </Grid>

              <Controller
                name="config.exclusive"
                control={control}
                defaultValue={false}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch {...field} checked={field.value || false} />}
                    label="Exclusive bounds (< and > instead of ≤ and ≥)"
                    sx={{ mt: 2 }}
                  />
                )}
              />

              <Controller
                name="config.step"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Step Size (optional)"
                    type="number"
                    margin="normal"
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    helperText="Allowed increments (e.g., 0.1 for decimal precision)"
                    sx={{ mt: 2, width: '200px' }}
                  />
                )}
              />
            </CardContent>
          </Card>
        );

      case 'length':
        return (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Length Configuration
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Controller
                    name="config.min"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Minimum Length"
                        type="number"
                        fullWidth
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Controller
                    name="config.max"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Maximum Length"
                        type="number"
                        fullWidth
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    )}
                  />
                </Grid>
              </Grid>

              <Controller
                name="config.trimWhitespace"
                control={control}
                defaultValue={true}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch {...field} checked={field.value !== false} />}
                    label="Trim whitespace before validation"
                    sx={{ mt: 2 }}
                  />
                )}
              />
            </CardContent>
          </Card>
        );

      case 'dependency':
        return (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Dependency Configuration
              </Typography>

              <Controller
                name="config.sourceField"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Source Field</InputLabel>
                    <Select {...field} label="Source Field">
                      {availableFields.map((availableField) => (
                        <MenuItem key={availableField.id} value={availableField.id}>
                          {availableField.name} ({availableField.type})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="config.condition"
                control={control}
                defaultValue="equals"
                render={({ field }) => (
                  <FormControl margin="normal" sx={{ width: '200px', mr: 2 }}>
                    <InputLabel>Condition</InputLabel>
                    <Select {...field} label="Condition">
                      <MenuItem value="equals">Equals</MenuItem>
                      <MenuItem value="not_equals">Not Equals</MenuItem>
                      <MenuItem value="greater_than">Greater Than</MenuItem>
                      <MenuItem value="less_than">Less Than</MenuItem>
                      <MenuItem value="contains">Contains</MenuItem>
                      <MenuItem value="empty">Is Empty</MenuItem>
                      <MenuItem value="not_empty">Is Not Empty</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="config.value"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Comparison Value"
                    margin="normal"
                    sx={{ width: '200px' }}
                    helperText="Value to compare against"
                  />
                )}
              />
            </CardContent>
          </Card>
        );

      case 'custom':
        return (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Custom Rule Configuration
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                Custom rules require JavaScript function implementation. Contact your administrator to set up custom validation logic.
              </Alert>

              <Controller
                name="config.functionName"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Validation Function Name"
                    fullWidth
                    margin="normal"
                    placeholder="e.g., validateEngineeringDrawingNumber"
                    helperText="Name of the custom validation function"
                  />
                )}
              />

              <Controller
                name="config.parameters"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Parameters (JSON)"
                    fullWidth
                    multiline
                    rows={3}
                    margin="normal"
                    placeholder='{"param1": "value1", "param2": "value2"}'
                    helperText="JSON object with parameters for the validation function"
                  />
                )}
              />
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '80vh' },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <SettingsIcon />
          Edit Validation Rule
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab label="Basic Settings" />
            <Tab label="Configuration" />
            <Tab label="Test Rule" />
          </Tabs>
        </Box>

        <form onSubmit={handleSubmit(onSubmit)}>
          <TabPanel value={currentTab} index={0}>
            <Box display="flex" flexDirection="column" gap={2}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Rule Name"
                    required
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    InputProps={{
                      endAdornment: (
                        <Typography variant="caption" color="text.secondary">
                          {field.value?.length || 0}/100
                        </Typography>
                      ),
                    }}
                  />
                )}
              />

              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description"
                    multiline
                    rows={2}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                    InputProps={{
                      endAdornment: (
                        <Typography variant="caption" color="text.secondary">
                          {field.value?.length || 0}/500
                        </Typography>
                      ),
                    }}
                  />
                )}
              />

              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <FormControl required>
                    <InputLabel>Rule Type</InputLabel>
                    <Select {...field} label="Rule Type" error={!!errors.type}>
                      {Object.entries(RULE_TYPE_DESCRIPTIONS).map(([type, description]) => (
                        <MenuItem key={type} value={type}>
                          <Box>
                            <Typography variant="body1">{type}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {description}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="errorMessage"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Error Message"
                    required
                    error={!!errors.errorMessage}
                    helperText={errors.errorMessage?.message}
                    InputProps={{
                      endAdornment: (
                        <Typography variant="caption" color="text.secondary">
                          {field.value?.length || 0}/200
                        </Typography>
                      ),
                    }}
                  />
                )}
              />

              <Box>
                <Typography gutterBottom>Priority (1 = highest, 100 = lowest)</Typography>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <Slider
                      {...field}
                      min={1}
                      max={100}
                      step={1}
                      marks={[
                        { value: 1, label: '1' },
                        { value: 25, label: '25' },
                        { value: 50, label: '50' },
                        { value: 75, label: '75' },
                        { value: 100, label: '100' },
                      ]}
                      valueLabelDisplay="on"
                    />
                  )}
                />
              </Box>

              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch {...field} checked={field.value} />}
                    label="Rule is active"
                  />
                )}
              />
            </Box>
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            {renderConfigPanel()}
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Test Validation Rule
                </Typography>

                <Box display="flex" gap={2} mb={2}>
                  <TextField
                    label={`Test ${fieldType} value`}
                    value={testValue}
                    onChange={(e) => setTestValue(e.target.value)}
                    placeholder={`Enter a ${fieldType} value to test...`}
                    fullWidth
                  />
                  <Button
                    variant="contained"
                    onClick={handleTestRule}
                    startIcon={<TestIcon />}
                    disabled={!testValue.trim()}
                  >
                    Test
                  </Button>
                </Box>

                {testResult && (
                  <Alert
                    severity={testResult.isValid ? 'success' : 'error'}
                    sx={{ mt: 2 }}
                  >
                    {testResult.message}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabPanel>
        </form>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          disabled={!isDirty}
        >
          Save Rule
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ValidationRuleEditor;