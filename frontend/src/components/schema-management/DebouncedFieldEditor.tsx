/**
 * Debounced Field Editor Component
 *
 * Optimized field editor with debounced updates, memoization,
 * and lazy loading for performance in complex schema editing workflows.
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Undo as UndoIcon,
} from '@mui/icons-material';
import {
  ComponentSchemaField,
  ComponentSchemaFieldUpdate,
  FieldTypeConfig,
  SchemaFieldType,
} from '../../types/schema';
import {
  useDebounced,
  useDeepMemo,
  useLazyComponent,
  usePerformanceMonitor,
  useCleanupEffect,
} from '../../hooks/schema/usePerformanceOptimizations';
import { useSchemaConfig } from '../../config/schemaConfig';

// ========================================
// INTERFACES
// ========================================

export interface DebouncedFieldEditorProps {
  field: ComponentSchemaField | null;
  onFieldUpdate: (fieldId: string, updates: ComponentSchemaFieldUpdate) => void;
  onFieldSave: (fieldId: string) => void;
  onCancel: () => void;
  validationErrors: string[];
  isLoading?: boolean;
  disabled?: boolean;
  autoSave?: boolean;
  showAdvanced?: boolean;
  compact?: boolean;
}

interface FieldConfigEditorProps {
  fieldType: SchemaFieldType;
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
  errors: string[];
  disabled: boolean;
}

// ========================================
// MEMOIZED FIELD CONFIG EDITOR
// ========================================

const FieldConfigEditor: React.FC<FieldConfigEditorProps> = React.memo(({
  fieldType,
  config,
  onChange,
  errors,
  disabled,
}) => {
  const performanceMonitor = usePerformanceMonitor(`FieldConfigEditor-${fieldType}`);

  useEffect(() => {
    performanceMonitor.start();
    return () => {
      performanceMonitor.end();
    };
  }, [performanceMonitor]);

  // Debounced config change handler
  const [debouncedOnChange] = useDebounced(onChange, 300);

  const handleConfigChange = useCallback(
    (key: string, value: any) => {
      const newConfig = { ...config, [key]: value };
      debouncedOnChange(newConfig);
    },
    [config, debouncedOnChange]
  );

  // Memoized field type-specific configuration
  const configFields = useDeepMemo(() => {
    switch (fieldType) {
      case 'text':
        return (
          <>
            <TextField
              label="Placeholder"
              value={config.placeholder || ''}
              onChange={(e) => handleConfigChange('placeholder', e.target.value)}
              disabled={disabled}
              fullWidth
              margin="normal"
              size="small"
            />
            <TextField
              label="Max Length"
              type="number"
              value={config.maxLength || ''}
              onChange={(e) => handleConfigChange('maxLength', parseInt(e.target.value) || undefined)}
              disabled={disabled}
              fullWidth
              margin="normal"
              size="small"
            />
            <TextField
              label="Min Length"
              type="number"
              value={config.minLength || ''}
              onChange={(e) => handleConfigChange('minLength', parseInt(e.target.value) || undefined)}
              disabled={disabled}
              fullWidth
              margin="normal"
              size="small"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.multiline || false}
                  onChange={(e) => handleConfigChange('multiline', e.target.checked)}
                  disabled={disabled}
                />
              }
              label="Multiline"
            />
            <TextField
              label="Validation Pattern (RegExp)"
              value={config.pattern || ''}
              onChange={(e) => handleConfigChange('pattern', e.target.value)}
              disabled={disabled}
              fullWidth
              margin="normal"
              size="small"
              helperText="Enter a regular expression for validation"
            />
          </>
        );

      case 'number':
        return (
          <>
            <TextField
              label="Minimum Value"
              type="number"
              value={config.min || ''}
              onChange={(e) => handleConfigChange('min', parseFloat(e.target.value) || undefined)}
              disabled={disabled}
              fullWidth
              margin="normal"
              size="small"
            />
            <TextField
              label="Maximum Value"
              type="number"
              value={config.max || ''}
              onChange={(e) => handleConfigChange('max', parseFloat(e.target.value) || undefined)}
              disabled={disabled}
              fullWidth
              margin="normal"
              size="small"
            />
            <TextField
              label="Step"
              type="number"
              value={config.step || ''}
              onChange={(e) => handleConfigChange('step', parseFloat(e.target.value) || undefined)}
              disabled={disabled}
              fullWidth
              margin="normal"
              size="small"
            />
            <TextField
              label="Unit"
              value={config.unit || ''}
              onChange={(e) => handleConfigChange('unit', e.target.value)}
              disabled={disabled}
              fullWidth
              margin="normal"
              size="small"
              placeholder="e.g., mm, kg, ℃"
            />
            <TextField
              label="Decimal Places"
              type="number"
              value={config.precision || ''}
              onChange={(e) => handleConfigChange('precision', parseInt(e.target.value) || undefined)}
              disabled={disabled}
              fullWidth
              margin="normal"
              size="small"
            />
          </>
        );

      case 'select':
        return (
          <>
            <Typography variant="subtitle2" gutterBottom>
              Options (one per line)
            </Typography>
            <TextField
              multiline
              rows={4}
              value={(config.options || []).map((opt: any) =>
                typeof opt === 'string' ? opt : `${opt.value}:${opt.label}`
              ).join('\n')}
              onChange={(e) => {
                const lines = e.target.value.split('\n').filter(line => line.trim());
                const options = lines.map(line => {
                  if (line.includes(':')) {
                    const [value, label] = line.split(':');
                    return { value: value.trim(), label: label.trim() };
                  }
                  return line.trim();
                });
                handleConfigChange('options', options);
              }}
              disabled={disabled}
              fullWidth
              margin="normal"
              size="small"
              placeholder="Option 1&#10;value:Display Label&#10;Option 3"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.multiple || false}
                  onChange={(e) => handleConfigChange('multiple', e.target.checked)}
                  disabled={disabled}
                />
              }
              label="Allow Multiple Selection"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.allowCustom || false}
                  onChange={(e) => handleConfigChange('allowCustom', e.target.checked)}
                  disabled={disabled}
                />
              }
              label="Allow Custom Values"
            />
          </>
        );

      case 'checkbox':
        return (
          <>
            <TextField
              label="Label for True"
              value={config.trueLabel || 'Yes'}
              onChange={(e) => handleConfigChange('trueLabel', e.target.value)}
              disabled={disabled}
              fullWidth
              margin="normal"
              size="small"
            />
            <TextField
              label="Label for False"
              value={config.falseLabel || 'No'}
              onChange={(e) => handleConfigChange('falseLabel', e.target.value)}
              disabled={disabled}
              fullWidth
              margin="normal"
              size="small"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.indeterminate || false}
                  onChange={(e) => handleConfigChange('indeterminate', e.target.checked)}
                  disabled={disabled}
                />
              }
              label="Allow Indeterminate State"
            />
          </>
        );

      case 'date':
        return (
          <>
            <FormControl fullWidth margin="normal" size="small">
              <InputLabel>Date Format</InputLabel>
              <Select
                value={config.format || 'YYYY-MM-DD'}
                onChange={(e) => handleConfigChange('format', e.target.value)}
                disabled={disabled}
                label="Date Format"
              >
                <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                <MenuItem value="DD-MM-YYYY">DD-MM-YYYY</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Minimum Date"
              type="date"
              value={config.minDate || ''}
              onChange={(e) => handleConfigChange('minDate', e.target.value)}
              disabled={disabled}
              fullWidth
              margin="normal"
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Maximum Date"
              type="date"
              value={config.maxDate || ''}
              onChange={(e) => handleConfigChange('maxDate', e.target.value)}
              disabled={disabled}
              fullWidth
              margin="normal"
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.showTime || false}
                  onChange={(e) => handleConfigChange('showTime', e.target.checked)}
                  disabled={disabled}
                />
              }
              label="Include Time"
            />
          </>
        );

      default:
        return <Typography>No configuration available for this field type.</Typography>;
    }
  }, [fieldType, config, handleConfigChange, disabled]);

  return (
    <Box>
      {errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2">Configuration errors:</Typography>
          <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}
      {configFields}
    </Box>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.fieldType === nextProps.fieldType &&
    JSON.stringify(prevProps.config) === JSON.stringify(nextProps.config) &&
    JSON.stringify(prevProps.errors) === JSON.stringify(nextProps.errors) &&
    prevProps.disabled === nextProps.disabled
  );
});

FieldConfigEditor.displayName = 'FieldConfigEditor';

// ========================================
// LAZY LOADED ADVANCED EDITOR
// ========================================

const LazyAdvancedEditor = React.lazy(() =>
  import('./AdvancedFieldConfigEditor').catch(() => ({
    default: () => <Typography>Advanced editor not available</Typography>
  }))
);

// ========================================
// MAIN DEBOUNCED FIELD EDITOR
// ========================================

const DebouncedFieldEditor: React.FC<DebouncedFieldEditorProps> = ({
  field,
  onFieldUpdate,
  onFieldSave,
  onCancel,
  validationErrors,
  isLoading = false,
  disabled = false,
  autoSave = true,
  showAdvanced = false,
  compact = false,
}) => {
  const { config } = useSchemaConfig();
  const performanceMonitor = usePerformanceMonitor('DebouncedFieldEditor');
  const [localField, setLocalField] = useState<ComponentSchemaField | null>(field);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Performance monitoring
  useEffect(() => {
    performanceMonitor.start();
    return () => {
      performanceMonitor.end();
    };
  }, [performanceMonitor]);

  // Update local state when field prop changes
  useEffect(() => {
    setLocalField(field);
    setHasUnsavedChanges(false);
  }, [field]);

  // Debounced field update function
  const [debouncedUpdate] = useDebounced(
    useCallback(
      (fieldId: string, updates: ComponentSchemaFieldUpdate) => {
        onFieldUpdate(fieldId, updates);
        setHasUnsavedChanges(false);
      },
      [onFieldUpdate]
    ),
    config.performance.debounceDelayMs
  );

  // Auto-save functionality
  useCleanupEffect(() => {
    if (autoSave && hasUnsavedChanges && localField && !isSaving) {
      saveTimeoutRef.current = setTimeout(() => {
        setIsSaving(true);
        debouncedUpdate(localField.id, {
          field_name: localField.field_name,
          field_type: localField.field_type,
          field_config: localField.field_config,
          help_text: localField.help_text,
          is_required: localField.is_required,
          display_order: localField.display_order,
        });
        setTimeout(() => setIsSaving(false), 1000);
      }, config.autoSave.interval);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [autoSave, hasUnsavedChanges, localField, isSaving, debouncedUpdate, config.autoSave.interval]);

  // Handle field changes
  const handleFieldChange = useCallback(
    (updates: Partial<ComponentSchemaField>) => {
      if (!localField) return;

      const updatedField = { ...localField, ...updates };
      setLocalField(updatedField);
      setHasUnsavedChanges(true);

      // Immediate update for non-debounced fields
      if (!config.performance.enableDebouncing) {
        onFieldUpdate(localField.id, {
          field_name: updatedField.field_name,
          field_type: updatedField.field_type,
          field_config: updatedField.field_config,
          help_text: updatedField.help_text,
          is_required: updatedField.is_required,
          display_order: updatedField.display_order,
        });
        setHasUnsavedChanges(false);
      }
    },
    [localField, onFieldUpdate, config.performance.enableDebouncing]
  );

  // Manual save handler
  const handleSave = useCallback(() => {
    if (localField && hasUnsavedChanges) {
      debouncedUpdate(localField.id, {
        field_name: localField.field_name,
        field_type: localField.field_type,
        field_config: localField.field_config,
        help_text: localField.help_text,
        is_required: localField.is_required,
        display_order: localField.display_order,
      });
      onFieldSave(localField.id);
    }
  }, [localField, hasUnsavedChanges, debouncedUpdate, onFieldSave]);

  // Lazy component for advanced editor
  const { LazyWrapper: AdvancedEditorWrapper } = useLazyComponent(
    () => import('./AdvancedFieldConfigEditor'),
    () => <Skeleton variant="rectangular" height={200} />
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
        <Skeleton variant="text" width="40%" height={30} sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (!localField) {
    return (
      <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
        <Typography>Select a field to edit</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: compact ? 1 : 2 }}>
      {/* Header with save status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          Edit Field: {localField.field_name}
        </Typography>

        {hasUnsavedChanges && (
          <Chip
            size="small"
            label="Unsaved"
            color="warning"
            icon={isSaving ? <CircularProgress size={16} /> : <SaveIcon />}
          />
        )}

        {!hasUnsavedChanges && !isSaving && (
          <Chip
            size="small"
            label="Saved"
            color="success"
            icon={<SaveIcon />}
          />
        )}
      </Box>

      {/* Basic field properties */}
      <Box sx={{ mb: 2 }}>
        <TextField
          label="Field Name"
          value={localField.field_name}
          onChange={(e) => handleFieldChange({ field_name: e.target.value })}
          disabled={disabled}
          fullWidth
          margin="normal"
          size={compact ? 'small' : 'medium'}
        />

        <FormControl fullWidth margin="normal" size={compact ? 'small' : 'medium'}>
          <InputLabel>Field Type</InputLabel>
          <Select
            value={localField.field_type}
            onChange={(e) => handleFieldChange({ field_type: e.target.value as SchemaFieldType })}
            disabled={disabled}
            label="Field Type"
          >
            <MenuItem value="text">Text</MenuItem>
            <MenuItem value="number">Number</MenuItem>
            <MenuItem value="select">Select</MenuItem>
            <MenuItem value="checkbox">Checkbox</MenuItem>
            <MenuItem value="date">Date</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Help Text"
          value={localField.help_text || ''}
          onChange={(e) => handleFieldChange({ help_text: e.target.value })}
          disabled={disabled}
          fullWidth
          margin="normal"
          size={compact ? 'small' : 'medium'}
          multiline
          rows={2}
        />

        <FormControlLabel
          control={
            <Switch
              checked={localField.is_required}
              onChange={(e) => handleFieldChange({ is_required: e.target.checked })}
              disabled={disabled}
            />
          }
          label="Required Field"
        />

        <TextField
          label="Display Order"
          type="number"
          value={localField.display_order}
          onChange={(e) => handleFieldChange({ display_order: parseInt(e.target.value) || 0 })}
          disabled={disabled}
          fullWidth
          margin="normal"
          size={compact ? 'small' : 'medium'}
        />
      </Box>

      {/* Field type-specific configuration */}
      <Accordion defaultExpanded={!compact}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Field Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FieldConfigEditor
            fieldType={localField.field_type}
            config={localField.field_config || {}}
            onChange={(config) => handleFieldChange({ field_config: config })}
            errors={validationErrors.filter(error => error.includes('configuration'))}
            disabled={disabled}
          />
        </AccordionDetails>
      </Accordion>

      {/* Advanced configuration (lazy loaded) */}
      {showAdvanced && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1">Advanced Configuration</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <AdvancedEditorWrapper
              field={localField}
              onChange={handleFieldChange}
              disabled={disabled}
            />
          </AccordionDetails>
        </Accordion>
      )}

      {/* Error display */}
      {validationErrors.length > 0 && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="body2">Validation errors:</Typography>
          <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <button
          onClick={handleSave}
          disabled={!hasUnsavedChanges || disabled || isSaving}
          style={{
            padding: '8px 16px',
            border: '1px solid #1976d2',
            borderRadius: '4px',
            backgroundColor: hasUnsavedChanges ? '#1976d2' : 'transparent',
            color: hasUnsavedChanges ? 'white' : '#1976d2',
            cursor: hasUnsavedChanges && !disabled ? 'pointer' : 'not-allowed',
            fontSize: '14px',
          }}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>

        <button
          onClick={onCancel}
          disabled={disabled}
          style={{
            padding: '8px 16px',
            border: '1px solid #666',
            borderRadius: '4px',
            backgroundColor: 'transparent',
            color: '#666',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          Cancel
        </button>

        {hasUnsavedChanges && (
          <button
            onClick={() => {
              setLocalField(field);
              setHasUnsavedChanges(false);
            }}
            disabled={disabled}
            style={{
              padding: '8px 16px',
              border: '1px solid #f44336',
              borderRadius: '4px',
              backgroundColor: 'transparent',
              color: '#f44336',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            Reset
          </button>
        )}
      </Box>
    </Box>
  );
};

export default React.memo(DebouncedFieldEditor);