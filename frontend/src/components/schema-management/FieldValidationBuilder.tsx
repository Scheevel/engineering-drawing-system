/**
 * Field Validation Builder Component
 *
 * Provides a visual interface for building complex validation rules including
 * pattern matching, range validation, cross-field dependencies, and custom rules.
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  BugReport as TestIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material';

import { SchemaFieldType } from '../../services/api';
import ValidationRuleEditor from './ValidationRuleEditor';

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

export interface ValidationTest {
  value: any;
  expectedResult: boolean;
  description: string;
}

export interface FieldValidationBuilderProps {
  fieldType: SchemaFieldType;
  existingRules: ValidationRule[];
  availableFields: Array<{ id: string; name: string; type: SchemaFieldType }>;
  onRulesChange: (rules: ValidationRule[]) => void;
  onTestRules?: (rules: ValidationRule[], testValue: any) => Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  readOnly?: boolean;
}

const VALIDATION_RULE_TEMPLATES: Partial<ValidationRule>[] = [
  {
    type: 'pattern',
    name: 'Email Format',
    description: 'Validates email address format',
    config: { pattern: '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$' },
    errorMessage: 'Please enter a valid email address',
    fieldTypes: ['text'],
    isBuiltIn: true,
  },
  {
    type: 'pattern',
    name: 'Phone Number',
    description: 'Validates US phone number format',
    config: { pattern: '^\\+?1?[-\\s\\.]?\\(?[0-9]{3}\\)?[-\\s\\.]?[0-9]{3}[-\\s\\.]?[0-9]{4}$' },
    errorMessage: 'Please enter a valid phone number',
    fieldTypes: ['text'],
    isBuiltIn: true,
  },
  {
    type: 'range',
    name: 'Positive Number',
    description: 'Ensures number is greater than zero',
    config: { min: 0, exclusive: true },
    errorMessage: 'Value must be greater than zero',
    fieldTypes: ['number'],
    isBuiltIn: true,
  },
  {
    type: 'length',
    name: 'Standard Text Length',
    description: 'Standard text field length limits',
    config: { min: 2, max: 100 },
    errorMessage: 'Text must be between 2 and 100 characters',
    fieldTypes: ['text', 'textarea'],
    isBuiltIn: true,
  },
  {
    type: 'pattern',
    name: 'Engineering Drawing Number',
    description: 'Validates engineering drawing number format',
    config: { pattern: '^[A-Z]{2,3}-\\d{4,6}(-[A-Z]\\d*)?$' },
    errorMessage: 'Please enter a valid drawing number (e.g., DRG-123456 or DRG-123456-A1)',
    fieldTypes: ['text'],
    isBuiltIn: true,
  },
];

const FieldValidationBuilder: React.FC<FieldValidationBuilderProps> = ({
  fieldType,
  existingRules,
  availableFields,
  onRulesChange,
  onTestRules,
  readOnly = false,
}) => {
  const [rules, setRules] = useState<ValidationRule[]>(existingRules);
  const [editingRule, setEditingRule] = useState<ValidationRule | null>(null);
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [testValue, setTestValue] = useState<any>('');
  const [testResults, setTestResults] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);
  const [isTestingRules, setIsTestingRules] = useState(false);

  // Filter templates for current field type
  const availableTemplates = VALIDATION_RULE_TEMPLATES.filter(template =>
    template.fieldTypes?.includes(fieldType)
  );

  const handleAddRule = useCallback(() => {
    const newRule: ValidationRule = {
      id: `rule_${Date.now()}`,
      type: 'pattern',
      name: '',
      description: '',
      config: {},
      errorMessage: '',
      priority: rules.length + 1,
      isActive: true,
      fieldTypes: [fieldType],
      isBuiltIn: false,
    };
    setEditingRule(newRule);
    setShowRuleEditor(true);
  }, [rules.length, fieldType]);

  const handleEditRule = useCallback((rule: ValidationRule) => {
    setEditingRule({ ...rule });
    setShowRuleEditor(true);
  }, []);

  const handleSaveRule = useCallback((rule: ValidationRule) => {
    const updatedRules = editingRule?.id && rules.find(r => r.id === editingRule.id)
      ? rules.map(r => r.id === rule.id ? rule : r)
      : [...rules, rule];

    setRules(updatedRules);
    onRulesChange(updatedRules);
    setShowRuleEditor(false);
    setEditingRule(null);
  }, [rules, editingRule, onRulesChange]);

  const handleDeleteRule = useCallback((ruleId: string) => {
    const updatedRules = rules.filter(r => r.id !== ruleId);
    setRules(updatedRules);
    onRulesChange(updatedRules);
  }, [rules, onRulesChange]);

  const handleToggleRule = useCallback((ruleId: string) => {
    const updatedRules = rules.map(r =>
      r.id === ruleId ? { ...r, isActive: !r.isActive } : r
    );
    setRules(updatedRules);
    onRulesChange(updatedRules);
  }, [rules, onRulesChange]);

  const handleAddTemplate = useCallback((template: Partial<ValidationRule>) => {
    const newRule: ValidationRule = {
      ...template,
      id: `rule_${Date.now()}`,
      priority: rules.length + 1,
      isActive: true,
      isBuiltIn: false,
    } as ValidationRule;

    const updatedRules = [...rules, newRule];
    setRules(updatedRules);
    onRulesChange(updatedRules);
    setShowTemplateDialog(false);
  }, [rules, onRulesChange]);

  const handleTestRules = useCallback(async () => {
    if (!onTestRules) return;

    setIsTestingRules(true);
    try {
      const activeRules = rules.filter(r => r.isActive);
      const results = await onTestRules(activeRules, testValue);
      setTestResults(results);
    } catch (error) {
      setTestResults({
        isValid: false,
        errors: ['Test failed: ' + (error instanceof Error ? error.message : 'Unknown error')],
        warnings: [],
      });
    } finally {
      setIsTestingRules(false);
    }
  }, [rules, testValue, onTestRules]);

  const handleReorderRule = useCallback((ruleId: string, direction: 'up' | 'down') => {
    const ruleIndex = rules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return;

    const newIndex = direction === 'up' ? ruleIndex - 1 : ruleIndex + 1;
    if (newIndex < 0 || newIndex >= rules.length) return;

    const updatedRules = [...rules];
    const [movedRule] = updatedRules.splice(ruleIndex, 1);
    updatedRules.splice(newIndex, 0, movedRule);

    // Update priorities
    updatedRules.forEach((rule, index) => {
      rule.priority = index + 1;
    });

    setRules(updatedRules);
    onRulesChange(updatedRules);
  }, [rules, onRulesChange]);

  const getRuleTypeIcon = (type: ValidationRule['type']) => {
    switch (type) {
      case 'pattern': return '🔤';
      case 'range': return '📊';
      case 'length': return '📏';
      case 'dependency': return '🔗';
      case 'custom': return '⚙️';
      default: return '📋';
    }
  };

  const getRuleTypeColor = (type: ValidationRule['type']) => {
    switch (type) {
      case 'pattern': return 'primary';
      case 'range': return 'secondary';
      case 'length': return 'info';
      case 'dependency': return 'warning';
      case 'custom': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Validation Rules for {fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} Field
        </Typography>
        {!readOnly && (
          <Box display="flex" gap={1}>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setShowTemplateDialog(true)}
              variant="outlined"
            >
              From Template
            </Button>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddRule}
              variant="contained"
            >
              Custom Rule
            </Button>
          </Box>
        )}
      </Box>

      {/* Rules List */}
      <Card variant="outlined">
        <CardHeader
          title={`Active Rules (${rules.filter(r => r.isActive).length}/${rules.length})`}
          action={
            onTestRules && (
              <Button
                size="small"
                startIcon={<TestIcon />}
                onClick={handleTestRules}
                disabled={isTestingRules || rules.filter(r => r.isActive).length === 0}
                variant="outlined"
              >
                Test Rules
              </Button>
            )
          }
        />
        <CardContent>
          {rules.length === 0 ? (
            <Alert severity="info">
              No validation rules configured. Add rules to enforce data quality and business logic.
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
                        <Box fontSize="1.2rem" mr={1}>
                          {getRuleTypeIcon(rule.type)}
                        </Box>
                      </Box>
                      <Box flexGrow={1}>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="subtitle1">
                                {rule.name || `${rule.type} rule`}
                              </Typography>
                              <Chip
                                label={rule.type}
                                size="small"
                                color={getRuleTypeColor(rule.type) as any}
                                variant="outlined"
                              />
                              {rule.isBuiltIn && (
                                <Chip label="Built-in" size="small" color="success" variant="outlined" />
                              )}
                              {!rule.isActive && (
                                <Chip label="Disabled" size="small" color="default" variant="outlined" />
                              )}
                            </Box>
                          }
                          secondary={rule.description || rule.errorMessage}
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
                                onClick={() => handleReorderRule(rule.id, 'up')}
                                disabled={index === 0}
                              >
                                ⬆️
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleReorderRule(rule.id, 'down')}
                                disabled={index === rules.length - 1}
                              >
                                ⬇️
                              </IconButton>
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

      {/* Rule Testing */}
      {onTestRules && (
        <Card variant="outlined" sx={{ mt: 2 }}>
          <CardHeader
            title="Rule Testing"
            action={
              <PreviewIcon color="action" />
            }
          />
          <CardContent>
            <Box display="flex" gap={2} mb={2}>
              <FormControl fullWidth>
                <InputLabel>Test Value</InputLabel>
                <input
                  type="text"
                  value={testValue}
                  onChange={(e) => setTestValue(e.target.value)}
                  placeholder={`Enter a ${fieldType} value to test...`}
                  style={{
                    padding: '12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                />
              </FormControl>
              <Button
                variant="contained"
                onClick={handleTestRules}
                disabled={isTestingRules || !testValue}
                startIcon={<TestIcon />}
              >
                Test
              </Button>
            </Box>

            {testResults && (
              <Box>
                <Alert
                  severity={testResults.isValid ? 'success' : 'error'}
                  icon={testResults.isValid ? <CheckIcon /> : <WarningIcon />}
                >
                  <Typography variant="subtitle2">
                    Validation {testResults.isValid ? 'Passed' : 'Failed'}
                  </Typography>
                </Alert>

                {testResults.errors.length > 0 && (
                  <Box mt={1}>
                    <Typography variant="body2" color="error" fontWeight="bold">
                      Errors:
                    </Typography>
                    {testResults.errors.map((error, index) => (
                      <Typography key={index} variant="body2" color="error">
                        • {error}
                      </Typography>
                    ))}
                  </Box>
                )}

                {testResults.warnings.length > 0 && (
                  <Box mt={1}>
                    <Typography variant="body2" color="warning.main" fontWeight="bold">
                      Warnings:
                    </Typography>
                    {testResults.warnings.map((warning, index) => (
                      <Typography key={index} variant="body2" color="warning.main">
                        • {warning}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rule Editor Dialog */}
      {showRuleEditor && editingRule && (
        <ValidationRuleEditor
          open={showRuleEditor}
          rule={editingRule}
          fieldType={fieldType}
          availableFields={availableFields}
          onSave={handleSaveRule}
          onClose={() => {
            setShowRuleEditor(false);
            setEditingRule(null);
          }}
        />
      )}

      {/* Template Selection Dialog */}
      <Dialog
        open={showTemplateDialog}
        onClose={() => setShowTemplateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Choose Validation Rule Template</DialogTitle>
        <DialogContent>
          <List>
            {availableTemplates.map((template, index) => (
              <ListItem key={index}>
                <Box display="flex" width="100%">
                  <Box mr={2} fontSize="1.2rem">
                    {getRuleTypeIcon(template.type!)}
                  </Box>
                  <ListItemText
                    primary={template.name}
                    secondary={template.description}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleAddTemplate(template)}
                  >
                    Add
                  </Button>
                </Box>
              </ListItem>
            ))}
          </List>
          {availableTemplates.length === 0 && (
            <Alert severity="info">
              No templates available for {fieldType} fields.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTemplateDialog(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FieldValidationBuilder;