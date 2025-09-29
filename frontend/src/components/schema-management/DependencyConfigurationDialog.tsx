/**
 * Dependency Configuration Dialog
 *
 * Provides a visual interface for configuring field dependencies,
 * conditional visibility, and automatic calculations between fields.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Star as RequiredIcon,
  Calculate as CalculateIcon,
  Block as DisabledIcon,
  Link as LinkIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { SchemaFieldType } from '../../services/api';
import { ValidationRule } from '../schema-management/FieldValidationBuilder';
import { DependencyCondition } from '../../utils/validation/crossFieldValidation';

export interface ComponentSchemaField {
  id: string;
  field_name: string;
  field_type: SchemaFieldType;
  field_config: Record<string, any>;
  help_text?: string;
  is_required: boolean;
  is_active: boolean;
  display_order: number;
}

export interface DependencyRule {
  id: string;
  name: string;
  description: string;
  sourceFieldId: string;
  targetFieldIds: string[];
  condition: DependencyCondition;
  action: 'show' | 'hide' | 'require' | 'disable' | 'calculate';
  calculationConfig?: {
    formula: string;
    parameters: Record<string, any>;
  };
  isActive: boolean;
  priority: number;
}

export interface DependencyConfigurationDialogProps {
  open: boolean;
  fields: ComponentSchemaField[];
  existingRules: DependencyRule[];
  onSave: (rules: DependencyRule[]) => void;
  onClose: () => void;
  readOnly?: boolean;
}

const DEPENDENCY_CONDITIONS = [
  { value: 'equals', label: 'Equals', description: 'Field value equals specific value' },
  { value: 'not_equals', label: 'Not Equals', description: 'Field value does not equal specific value' },
  { value: 'greater_than', label: 'Greater Than', description: 'Numeric field is greater than value' },
  { value: 'less_than', label: 'Less Than', description: 'Numeric field is less than value' },
  { value: 'contains', label: 'Contains', description: 'Text field contains specific text' },
  { value: 'empty', label: 'Is Empty', description: 'Field has no value' },
  { value: 'not_empty', label: 'Is Not Empty', description: 'Field has any value' },
  { value: 'in_range', label: 'In Range', description: 'Numeric field is within range' },
  { value: 'regex', label: 'Matches Pattern', description: 'Field matches regular expression' },
];

const DEPENDENCY_ACTIONS = [
  { value: 'show', label: 'Show Field', icon: <VisibilityIcon />, description: 'Make target field visible' },
  { value: 'hide', label: 'Hide Field', icon: <VisibilityOffIcon />, description: 'Hide target field' },
  { value: 'require', label: 'Make Required', icon: <RequiredIcon />, description: 'Make target field required' },
  { value: 'disable', label: 'Disable Field', icon: <DisabledIcon />, description: 'Disable target field input' },
  { value: 'calculate', label: 'Calculate Value', icon: <CalculateIcon />, description: 'Auto-calculate target field value' },
];

const CALCULATION_TEMPLATES = {
  'copy_value': {
    name: 'Copy Value',
    formula: '${sourceField}',
    description: 'Copy the source field value directly',
  },
  'multiply': {
    name: 'Multiply',
    formula: '${sourceField} * ${factor}',
    description: 'Multiply source field by a factor',
    parameters: { factor: 1 },
  },
  'add_percentage': {
    name: 'Add Percentage',
    formula: '${sourceField} * (1 + ${percentage} / 100)',
    description: 'Add percentage to source field',
    parameters: { percentage: 10 },
  },
  'load_combination': {
    name: 'Load Combination',
    formula: '${deadLoad} * 1.2 + ${liveLoad} * 1.6',
    description: 'Engineering load combination (1.2D + 1.6L)',
    parameters: { deadLoad: '${deadLoad}', liveLoad: '${liveLoad}' },
  },
  'area_calculation': {
    name: 'Area Calculation',
    formula: '${length} * ${width}',
    description: 'Calculate area from length and width',
    parameters: { length: '${length}', width: '${width}' },
  },
};

const ruleSchema = yup.object({
  name: yup.string().required('Rule name is required').max(100),
  description: yup.string().max(500),
  sourceFieldId: yup.string().required('Source field is required'),
  targetFieldIds: yup.array().of(yup.string()).min(1, 'At least one target field is required'),
  action: yup.string().oneOf(['show', 'hide', 'require', 'disable', 'calculate']).required(),
  condition: yup.object().required(),
  priority: yup.number().min(1).max(100),
  isActive: yup.boolean(),
});

const DependencyConfigurationDialog: React.FC<DependencyConfigurationDialogProps> = ({
  open,
  fields,
  existingRules,
  onSave,
  onClose,
  readOnly = false,
}) => {
  const [rules, setRules] = useState<DependencyRule[]>(existingRules);
  const [editingRule, setEditingRule] = useState<DependencyRule | null>(null);
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    setRules(existingRules);
  }, [existingRules]);

  const handleAddRule = useCallback(() => {
    const newRule: DependencyRule = {
      id: `dep_rule_${Date.now()}`,
      name: '',
      description: '',
      sourceFieldId: '',
      targetFieldIds: [],
      condition: { type: 'equals', value: '' },
      action: 'show',
      isActive: true,
      priority: rules.length + 1,
    };
    setEditingRule(newRule);
    setShowRuleEditor(true);
  }, [rules.length]);

  const handleEditRule = useCallback((rule: DependencyRule) => {
    setEditingRule({ ...rule });
    setShowRuleEditor(true);
  }, []);

  const handleSaveRule = useCallback((rule: DependencyRule) => {
    const existingIndex = rules.findIndex(r => r.id === rule.id);
    let updatedRules;

    if (existingIndex >= 0) {
      updatedRules = [...rules];
      updatedRules[existingIndex] = rule;
    } else {
      updatedRules = [...rules, rule];
    }

    setRules(updatedRules);
    setShowRuleEditor(false);
    setEditingRule(null);
  }, [rules]);

  const handleDeleteRule = useCallback((ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId));
  }, []);

  const handleToggleRule = useCallback((ruleId: string) => {
    setRules(prev => prev.map(r =>
      r.id === ruleId ? { ...r, isActive: !r.isActive } : r
    ));
  }, []);

  const getFieldName = useCallback((fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    return field ? field.field_name : 'Unknown Field';
  }, [fields]);

  const getActionIcon = (action: string) => {
    const actionConfig = DEPENDENCY_ACTIONS.find(a => a.value === action);
    return actionConfig?.icon || <LinkIcon />;
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'show': return 'success';
      case 'hide': return 'warning';
      case 'require': return 'error';
      case 'disable': return 'default';
      case 'calculate': return 'info';
      default: return 'default';
    }
  };

  const renderRulesList = () => (
    <Card variant="outlined">
      <CardHeader
        title={`Dependency Rules (${rules.filter(r => r.isActive).length}/${rules.length} active)`}
        action={
          !readOnly && (
            <Box display="flex" gap={1}>
              <Button
                startIcon={<PreviewIcon />}
                onClick={() => setPreviewMode(!previewMode)}
                variant={previewMode ? 'contained' : 'outlined'}
                size="small"
              >
                Preview
              </Button>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddRule}
                variant="contained"
                size="small"
              >
                Add Rule
              </Button>
            </Box>
          )
        }
      />
      <CardContent>
        {rules.length === 0 ? (
          <Alert severity="info">
            No dependency rules configured. Add rules to create dynamic field behavior based on user input.
          </Alert>
        ) : (
          <List>
            {rules.map((rule, index) => (
              <React.Fragment key={rule.id}>
                <ListItem>
                  <Box display="flex" alignItems="center" width="100%">
                    <Box display="flex" alignItems="center" mr={2}>
                      <Typography variant="h6" component="span" mr={1}>
                        {rule.priority}
                      </Typography>
                      <Box mr={1}>
                        {getActionIcon(rule.action)}
                      </Box>
                    </Box>

                    <Box flexGrow={1}>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1">
                              {rule.name || `${rule.action} rule`}
                            </Typography>
                            <Chip
                              label={rule.action}
                              size="small"
                              color={getActionColor(rule.action) as any}
                              variant="outlined"
                            />
                            {!rule.isActive && (
                              <Chip label="Disabled" size="small" color="default" variant="outlined" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box mt={1}>
                            <Typography variant="body2" color="text.secondary">
                              When <strong>{getFieldName(rule.sourceFieldId)}</strong> {rule.condition.type} {rule.condition.value}
                              {' → '} {rule.action} <strong>{rule.targetFieldIds.map(getFieldName).join(', ')}</strong>
                            </Typography>
                            {rule.description && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {rule.description}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </Box>

                    <ListItemSecondaryAction>
                      <Box display="flex" alignItems="center" gap={1}>
                        {!readOnly && (
                          <>
                            <Switch
                              checked={rule.isActive}
                              onChange={() => handleToggleRule(rule.id)}
                              size="small"
                            />
                            <IconButton
                              size="small"
                              onClick={() => handleEditRule(rule)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteRule(rule.id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </ListItemSecondaryAction>
                  </Box>
                </ListItem>
                {index < rules.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' },
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <LinkIcon />
            Field Dependency Configuration
          </Box>
        </DialogTitle>

        <DialogContent>
          {renderRulesList()}

          {previewMode && (
            <Card variant="outlined" sx={{ mt: 2 }}>
              <CardHeader title="Dependency Preview" />
              <CardContent>
                <Alert severity="info">
                  Preview functionality will show how dependencies affect field visibility and behavior in real-time.
                  This will be implemented in the next phase.
                </Alert>
              </CardContent>
            </Card>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => onSave(rules)}
          >
            Save Dependencies
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rule Editor Dialog */}
      {showRuleEditor && editingRule && (
        <DependencyRuleEditor
          open={showRuleEditor}
          rule={editingRule}
          fields={fields}
          onSave={handleSaveRule}
          onClose={() => {
            setShowRuleEditor(false);
            setEditingRule(null);
          }}
        />
      )}
    </>
  );
};

// Dependency Rule Editor Sub-component
interface DependencyRuleEditorProps {
  open: boolean;
  rule: DependencyRule;
  fields: ComponentSchemaField[];
  onSave: (rule: DependencyRule) => void;
  onClose: () => void;
}

const DependencyRuleEditor: React.FC<DependencyRuleEditorProps> = ({
  open,
  rule,
  fields,
  onSave,
  onClose,
}) => {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DependencyRule>({
    resolver: yupResolver(ruleSchema),
    defaultValues: rule,
  });

  const watchedAction = watch('action');
  const watchedSourceField = watch('sourceFieldId');

  const getAvailableTargetFields = useCallback(() => {
    return fields.filter(field => field.id !== watchedSourceField);
  }, [fields, watchedSourceField]);

  const renderConditionConfig = () => {
    return (
      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Condition Configuration
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Controller
                name="condition.type"
                control={control}
                defaultValue="equals"
                render={({ field }) => (
                  <FormControl fullWidth size="small">
                    <InputLabel>Condition Type</InputLabel>
                    <Select {...field} label="Condition Type">
                      {DEPENDENCY_CONDITIONS.map((condition) => (
                        <MenuItem key={condition.value} value={condition.value}>
                          <Box>
                            <Typography variant="body2">{condition.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {condition.description}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="condition.value"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Comparison Value"
                    size="small"
                    fullWidth
                    helperText="Value to compare against"
                  />
                )}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  const renderCalculationConfig = () => {
    if (watchedAction !== 'calculate') return null;

    return (
      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Calculation Configuration
          </Typography>

          <Box mb={2}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Calculation Templates:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {Object.entries(CALCULATION_TEMPLATES).map(([key, template]) => (
                <Chip
                  key={key}
                  label={template.name}
                  size="small"
                  onClick={() => setValue('calculationConfig.formula', template.formula)}
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>

          <Controller
            name="calculationConfig.formula"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <TextField
                {...field}
                label="Calculation Formula"
                fullWidth
                multiline
                rows={2}
                placeholder="${sourceField} * 1.2"
                helperText="Use ${fieldName} to reference field values"
              />
            )}
          />
        </CardContent>
      </Card>
    );
  };

  const onSubmit = (data: DependencyRule) => {
    onSave(data);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Edit Dependency Rule
      </DialogTitle>

      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Rule Name"
                    fullWidth
                    required
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="action"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth required>
                    <InputLabel>Action</InputLabel>
                    <Select {...field} label="Action" error={!!errors.action}>
                      {DEPENDENCY_ACTIONS.map((action) => (
                        <MenuItem key={action.value} value={action.value}>
                          <Box display="flex" alignItems="center" gap={1}>
                            {action.icon}
                            <Box>
                              <Typography variant="body2">{action.label}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {action.description}
                              </Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
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
                    label="Description"
                    fullWidth
                    multiline
                    rows={2}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="sourceFieldId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth required>
                    <InputLabel>Source Field (When)</InputLabel>
                    <Select {...field} label="Source Field (When)" error={!!errors.sourceFieldId}>
                      {fields.map((f) => (
                        <MenuItem key={f.id} value={f.id}>
                          {f.field_name} ({f.field_type})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="targetFieldIds"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth required>
                    <InputLabel>Target Fields (Then)</InputLabel>
                    <Select
                      {...field}
                      multiple
                      label="Target Fields (Then)"
                      error={!!errors.targetFieldIds}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as string[]).map((value) => {
                            const fieldName = fields.find(f => f.id === value)?.field_name || 'Unknown';
                            return <Chip key={value} label={fieldName} size="small" />;
                          })}
                        </Box>
                      )}
                    >
                      {getAvailableTargetFields().map((f) => (
                        <MenuItem key={f.id} value={f.id}>
                          {f.field_name} ({f.field_type})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>
          </Grid>

          {renderConditionConfig()}
          {renderCalculationConfig()}

          <Box mt={3}>
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
        </form>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit(onSubmit)}
        >
          Save Rule
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DependencyConfigurationDialog;