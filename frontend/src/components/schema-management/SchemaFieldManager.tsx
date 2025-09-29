/**
 * Schema Field Manager Component
 *
 * Unified interface for managing schema fields including individual creation,
 * template application, and bulk operations. Integrates all field management
 * capabilities into a single coordinated interface.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  Alert,
  Chip,
  Grid,
  ButtonGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  Bookmark as TemplateIcon,
  Reorder as ReorderIcon,
  SelectAll as SelectIcon,
  Info as InfoIcon,
  PlaylistAdd as BulkIcon,
  ContentCopy as ImportIcon,
} from '@mui/icons-material';

import { ComponentSchemaField, ComponentSchemaFieldCreate } from '../../types/schema';
import SchemaFieldList from './SchemaFieldList';
import FieldCreationDialog from './FieldCreationDialog';
import { FieldTemplateSelector } from './FieldTemplateSelector';
import { FieldReorderInterface } from './FieldReorderInterface';
import { FieldSelectionManager } from './FieldSelectionManager';
import { QuickAddFieldButtons } from './QuickAddFieldButtons';
import { FieldGroupSelector } from './FieldGroupSelector';
import { SchemaFieldImporter } from './SchemaFieldImporter';
import { useFieldSelection } from '../../hooks/schema/useFieldSelection';
import { useFieldReordering } from '../../hooks/schema/useFieldReordering';

interface SchemaFieldManagerProps {
  schemaId: string;
  fields: ComponentSchemaField[];
  onFieldCreate?: (field: ComponentSchemaFieldCreate) => Promise<void>;
  onFieldUpdate?: (fieldId: string, updates: Partial<ComponentSchemaField>) => Promise<void>;
  onFieldDelete?: (fieldId: string) => Promise<void>;
  onFieldsReorder?: (fieldIds: string[]) => Promise<void>;
  onTemplateApply?: (fields: ComponentSchemaFieldCreate[]) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  maxFields?: number;
  allowReordering?: boolean;
  allowBulkOperations?: boolean;
  allowTemplates?: boolean;
  allowQuickAdd?: boolean;
  allowFieldGroups?: boolean;
  allowSchemaImport?: boolean;
  availableSchemas?: any[]; // Schema info for import
}

type ViewMode = 'list' | 'reorder' | 'bulk';

export const SchemaFieldManager: React.FC<SchemaFieldManagerProps> = ({
  schemaId,
  fields,
  onFieldCreate,
  onFieldUpdate,
  onFieldDelete,
  onFieldsReorder,
  onTemplateApply,
  loading = false,
  disabled = false,
  maxFields,
  allowReordering = true,
  allowBulkOperations = true,
  allowTemplates = true,
  allowQuickAdd = true,
  allowFieldGroups = true,
  allowSchemaImport = true,
  availableSchemas = [],
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showFieldCreation, setShowFieldCreation] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showSchemaImporter, setShowSchemaImporter] = useState(false);
  const [editingField, setEditingField] = useState<ComponentSchemaField | null>(null);

  // Field selection for bulk operations
  const {
    selectedFields,
    selectedFieldIds,
    selectedCount,
    isAllSelected,
    isPartiallySelected,
    canSelectMore,
    maxSelections,
    handleFieldToggle,
    handleSelectAll,
    handleClearSelection,
    isFieldSelected,
  } = useFieldSelection(fields, { maxSelections: 50 });

  // Field reordering
  const {
    reorderedFields,
    isReordering,
    handleReorderStart,
    handleReorderEnd,
    canReorder,
    hasUnsavedChanges,
    handleSaveOrder,
    handleCancelReorder,
  } = useFieldReordering(schemaId, fields);

  // Get display fields based on current mode
  const displayFields = useMemo(() => {
    switch (viewMode) {
      case 'reorder':
        return reorderedFields || fields;
      default:
        return fields;
    }
  }, [viewMode, reorderedFields, fields]);

  // Field statistics
  const fieldStats = useMemo(() => {
    const total = fields.length;
    const active = fields.filter(f => f.is_active !== false).length;
    const required = fields.filter(f => f.is_required).length;
    const hasMaxLimit = maxFields && total >= maxFields;

    return { total, active, required, hasMaxLimit };
  }, [fields, maxFields]);

  const handleAddField = useCallback(() => {
    setShowFieldCreation(true);
  }, []);

  const handleFieldCreated = useCallback(async (fieldData: ComponentSchemaFieldCreate) => {
    try {
      await onFieldCreate?.(fieldData);
      setShowFieldCreation(false);
    } catch (error) {
      // Error handling is done by the parent component
      console.error('Failed to create field:', error);
    }
  }, [onFieldCreate]);

  const handleTemplateSelected = useCallback(async (templateFields: ComponentSchemaFieldCreate[]) => {
    try {
      await onTemplateApply?.(templateFields);
      setShowTemplateSelector(false);
    } catch (error) {
      console.error('Failed to apply template:', error);
    }
  }, [onTemplateApply]);

  const handleFieldGroupApplied = useCallback(async (groupFields: ComponentSchemaFieldCreate[]) => {
    try {
      await onTemplateApply?.(groupFields);
    } catch (error) {
      console.error('Failed to apply field group:', error);
    }
  }, [onTemplateApply]);

  const handleSchemaImport = useCallback(async (importedFields: ComponentSchemaFieldCreate[]) => {
    try {
      await onTemplateApply?.(importedFields);
      setShowSchemaImporter(false);
    } catch (error) {
      console.error('Failed to import fields from schema:', error);
    }
  }, [onTemplateApply]);

  const handleFieldEdit = useCallback((field: ComponentSchemaField) => {
    setEditingField(field);
    // Field editing would typically open a field edit dialog
    // For now, we'll just show the creation dialog with pre-filled values
  }, []);

  const handleFieldToggleActive = useCallback(async (fieldId: string, isActive: boolean) => {
    try {
      await onFieldUpdate?.(fieldId, { is_active: isActive });
    } catch (error) {
      console.error('Failed to toggle field active status:', error);
    }
  }, [onFieldUpdate]);

  const handleReorderSave = useCallback(async () => {
    if (hasUnsavedChanges && reorderedFields) {
      try {
        const fieldIds = reorderedFields.map(field => field.id).filter(Boolean) as string[];
        await onFieldsReorder?.(fieldIds);
        handleSaveOrder();
      } catch (error) {
        console.error('Failed to save field order:', error);
      }
    }
  }, [hasUnsavedChanges, reorderedFields, onFieldsReorder, handleSaveOrder]);

  const handleModeChange = (newMode: ViewMode) => {
    // Cancel any pending operations when switching modes
    if (viewMode === 'reorder' && hasUnsavedChanges) {
      handleCancelReorder();
    }
    if (viewMode === 'bulk') {
      handleClearSelection();
    }

    setViewMode(newMode);

    // Initialize mode-specific state
    if (newMode === 'reorder' && allowReordering) {
      handleReorderStart();
    }
  };

  const handleSuccess = useCallback((message: string) => {
    // Success feedback would be handled by parent component
    console.log('Operation successful:', message);
  }, []);

  const handleError = useCallback((error: Error) => {
    // Error handling would be handled by parent component
    console.error('Operation failed:', error);
  }, []);

  const getFieldLimitWarning = () => {
    if (!maxFields) return null;

    const remaining = maxFields - fieldStats.total;
    if (remaining <= 0) {
      return `Field limit reached (${fieldStats.total}/${maxFields}). Remove fields to add new ones.`;
    }
    if (remaining <= 3) {
      return `Approaching field limit (${fieldStats.total}/${maxFields}). ${remaining} fields remaining.`;
    }
    return null;
  };

  const warning = getFieldLimitWarning();

  return (
    <Box>
      {/* Field Management Header */}
      <Card sx={{ mb: 2 }}>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">Schema Fields</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={`${fieldStats.total} fields`} size="small" variant="outlined" />
                <Chip label={`${fieldStats.active} active`} size="small" color="success" />
                <Chip label={`${fieldStats.required} required`} size="small" color="warning" />
              </Stack>
            </Box>
          }
          action={
            <Stack direction="row" spacing={1}>
              {/* View Mode Toggle */}
              <ButtonGroup size="small" disabled={disabled || loading}>
                <Tooltip title="List View">
                  <Button
                    variant={viewMode === 'list' ? 'contained' : 'outlined'}
                    onClick={() => handleModeChange('list')}
                    startIcon={<InfoIcon />}
                  >
                    List
                  </Button>
                </Tooltip>
                {allowReordering && (
                  <Tooltip title="Reorder Fields">
                    <Button
                      variant={viewMode === 'reorder' ? 'contained' : 'outlined'}
                      onClick={() => handleModeChange('reorder')}
                      startIcon={<ReorderIcon />}
                      disabled={!canReorder || fieldStats.total < 2}
                    >
                      Reorder
                    </Button>
                  </Tooltip>
                )}
                {allowBulkOperations && (
                  <Tooltip title="Bulk Operations">
                    <Button
                      variant={viewMode === 'bulk' ? 'contained' : 'outlined'}
                      onClick={() => handleModeChange('bulk')}
                      startIcon={<BulkIcon />}
                      disabled={fieldStats.total === 0}
                    >
                      Bulk
                    </Button>
                  </Tooltip>
                )}
              </ButtonGroup>
            </Stack>
          }
        />

        <CardContent sx={{ pt: 0 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {/* Add Individual Field */}
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddField}
              disabled={disabled || loading || fieldStats.hasMaxLimit}
            >
              Add Field
            </Button>

            {/* Apply Template */}
            {allowTemplates && (
              <Button
                variant="outlined"
                startIcon={<TemplateIcon />}
                onClick={() => setShowTemplateSelector(true)}
                disabled={disabled || loading || fieldStats.hasMaxLimit}
              >
                Use Template
              </Button>
            )}

            {/* Import from Schema */}
            {allowSchemaImport && availableSchemas && availableSchemas.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<ImportIcon />}
                onClick={() => setShowSchemaImporter(true)}
                disabled={disabled || loading || fieldStats.hasMaxLimit}
              >
                Import Fields
              </Button>
            )}

            {/* Reorder Save/Cancel (only in reorder mode) */}
            {viewMode === 'reorder' && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleReorderSave}
                  disabled={!hasUnsavedChanges || loading}
                >
                  Save Order
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleCancelReorder}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </>
            )}
          </Stack>

          {/* Field Limit Warning */}
          {warning && (
            <Alert severity={fieldStats.hasMaxLimit ? 'error' : 'warning'} sx={{ mt: 2 }}>
              {warning}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Quick Add Field Buttons */}
      {allowQuickAdd && viewMode === 'list' && (
        <QuickAddFieldButtons
          existingFields={fields}
          onQuickAdd={handleFieldCreated}
          disabled={disabled || loading}
          maxFields={maxFields}
          currentFieldCount={fieldStats.total}
          compact={fieldStats.total > 0}
        />
      )}

      {/* Field Group Selector */}
      {allowFieldGroups && viewMode === 'list' && (
        <FieldGroupSelector
          existingFields={fields}
          onApplyGroup={handleFieldGroupApplied}
          disabled={disabled || loading}
          maxFields={maxFields}
          currentFieldCount={fieldStats.total}
          compact={fieldStats.total > 0}
        />
      )}

      {/* Bulk Operations Manager (only in bulk mode) */}
      {viewMode === 'bulk' && allowBulkOperations && (
        <FieldSelectionManager
          fields={fields}
          selectedFields={selectedFields}
          selectedCount={selectedCount}
          totalSelectableCount={fields.filter(f => f.is_active !== false).length}
          isAllSelected={isAllSelected}
          isPartiallySelected={isPartiallySelected}
          canSelectMore={canSelectMore}
          maxSelections={maxSelections}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          onSelectionModeToggle={(enabled) => setViewMode(enabled ? 'bulk' : 'list')}
          isSelectionMode={true}
          disabled={disabled || loading}
          schemaId={schemaId}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      )}

      {/* Field List */}
      {viewMode === 'list' && (
        <SchemaFieldList
          fields={displayFields}
          loading={loading}
          onFieldEdit={handleFieldEdit}
          onFieldDelete={onFieldDelete}
          onFieldToggleActive={handleFieldToggleActive}
          disabled={disabled}
          showReorderHandles={false}
        />
      )}

      {/* Field Reorder Interface */}
      {viewMode === 'reorder' && allowReordering && (
        <FieldReorderInterface
          schemaId={schemaId}
          fields={displayFields}
          onFieldsReorder={onFieldsReorder}
          disabled={disabled || loading}
          maxSelections={maxSelections}
        />
      )}

      {/* Bulk Operations Field List */}
      {viewMode === 'bulk' && allowBulkOperations && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Select Fields for Bulk Operations
            </Typography>
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {displayFields.map((field) => (
                <Box
                  key={field.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1,
                    borderRadius: 1,
                    cursor: 'pointer',
                    bgcolor: isFieldSelected(field.id) ? 'action.selected' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => handleFieldToggle(field.id, field)}
                >
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      border: 2,
                      borderColor: isFieldSelected(field.id) ? 'primary.main' : 'grey.400',
                      borderRadius: 0.5,
                      mr: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: isFieldSelected(field.id) ? 'primary.main' : 'transparent',
                    }}
                  >
                    {isFieldSelected(field.id) && (
                      <Box sx={{ color: 'white', fontSize: 14 }}>✓</Box>
                    )}
                  </Box>
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {field.field_name}
                  </Typography>
                  <Chip
                    label={field.field_type}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 1 }}
                  />
                  {field.is_required && (
                    <Chip label="Required" size="small" color="error" variant="outlined" />
                  )}
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {fields.length === 0 && !loading && (
        <>
          <Card>
            <CardContent>
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                py={6}
              >
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Fields Defined
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
                  Start building your schema by adding individual fields, using quick actions, or applying a template.
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddField}
                    disabled={disabled}
                  >
                    Add First Field
                  </Button>
                  {allowTemplates && (
                    <Button
                      variant="outlined"
                      startIcon={<TemplateIcon />}
                      onClick={() => setShowTemplateSelector(true)}
                      disabled={disabled}
                    >
                      Start from Template
                    </Button>
                  )}
                  {allowSchemaImport && availableSchemas && availableSchemas.length > 0 && (
                    <Button
                      variant="outlined"
                      startIcon={<ImportIcon />}
                      onClick={() => setShowSchemaImporter(true)}
                      disabled={disabled}
                    >
                      Import from Schema
                    </Button>
                  )}
                </Stack>
              </Box>
            </CardContent>
          </Card>

          {/* Quick Add for empty state */}
          {allowQuickAdd && (
            <QuickAddFieldButtons
              existingFields={fields}
              onQuickAdd={handleFieldCreated}
              disabled={disabled || loading}
              maxFields={maxFields}
              currentFieldCount={fieldStats.total}
              compact={false}
            />
          )}

          {/* Field Groups for empty state */}
          {allowFieldGroups && (
            <FieldGroupSelector
              existingFields={fields}
              onApplyGroup={handleFieldGroupApplied}
              disabled={disabled || loading}
              maxFields={maxFields}
              currentFieldCount={fieldStats.total}
              compact={false}
            />
          )}
        </>
      )}

      {/* Field Creation Dialog */}
      <FieldCreationDialog
        open={showFieldCreation}
        onClose={() => setShowFieldCreation(false)}
        onSave={handleFieldCreated}
        existingFieldNames={fields.map(f => f.field_name)}
        displayOrder={fields.length + 1}
        loading={loading}
      />

      {/* Template Selector Dialog */}
      {allowTemplates && (
        <FieldTemplateSelector
          open={showTemplateSelector}
          onClose={() => setShowTemplateSelector(false)}
          onApplyTemplate={handleTemplateSelected}
          currentFieldCount={fieldStats.total}
          maxFields={maxFields}
          disabled={disabled || loading}
        />
      )}

      {/* Schema Field Importer Dialog */}
      {allowSchemaImport && (
        <SchemaFieldImporter
          open={showSchemaImporter}
          onClose={() => setShowSchemaImporter(false)}
          onImportFields={handleSchemaImport}
          currentSchemaId={schemaId}
          existingFields={fields}
          availableSchemas={availableSchemas || []}
          disabled={disabled || loading}
        />
      )}
    </Box>
  );
};

export default SchemaFieldManager;