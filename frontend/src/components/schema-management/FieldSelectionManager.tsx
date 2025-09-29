/**
 * Field Selection Manager Component
 *
 * Provides selection controls and indicators for bulk field operations.
 * Includes select all/clear functionality, selection count display, and bulk operation buttons.
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  Chip,
  Tooltip,
  IconButton,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  SelectAll as SelectAllIcon,
  ClearAll as ClearAllIcon,
  Info as InfoIcon,
  Delete as DeleteIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  Star as RequiredIcon,
  StarBorder as OptionalIcon,
} from '@mui/icons-material';
import { ComponentSchemaField } from '../../types/schema';
import { BulkDeleteConfirmationDialog } from './BulkDeleteConfirmationDialog';
import { BulkDeactivateConfirmationDialog } from './BulkDeactivateConfirmationDialog';
import { BulkRequiredToggleConfirmationDialog } from './BulkRequiredToggleConfirmationDialog';
import { useBulkOperations } from '../../hooks/schema/useBulkOperations';

interface FieldSelectionManagerProps {
  fields: ComponentSchemaField[];
  selectedFields: ComponentSchemaField[];
  selectedCount: number;
  totalSelectableCount: number;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  canSelectMore: boolean;
  maxSelections?: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onSelectionModeToggle?: (enabled: boolean) => void;
  isSelectionMode?: boolean;
  disabled?: boolean;
  schemaId: string;
  onSuccess?: (message: string) => void;
  onError?: (error: Error) => void;
}

export const FieldSelectionManager: React.FC<FieldSelectionManagerProps> = ({
  fields,
  selectedFields,
  selectedCount,
  totalSelectableCount,
  isAllSelected,
  isPartiallySelected,
  canSelectMore,
  maxSelections,
  onSelectAll,
  onClearSelection,
  onSelectionModeToggle,
  isSelectionMode = true,
  disabled = false,
  schemaId,
  onSuccess,
  onError,
}) => {
  const hasSelection = selectedCount > 0;
  const isMaxSelection = maxSelections && selectedCount >= maxSelections;

  // Local state for bulk operations
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showDeactivateConfirmation, setShowDeactivateConfirmation] = useState(false);
  const [showRequiredToggleConfirmation, setShowRequiredToggleConfirmation] = useState(false);
  const [pendingRequiredStatus, setPendingRequiredStatus] = useState<boolean>(false);

  // Initialize bulk operations hook
  const {
    bulkDeleteFields,
    bulkActivateFields,
    bulkToggleRequired,
    isBulkDeleting,
    isBulkActivating,
    isBulkTogglingRequired,
    deleteProgress,
    activateProgress,
    requiredProgress,
    getImpactAnalysis,
    getDeactivationImpactAnalysis,
    getRequiredToggleImpactAnalysis,
    isAnyBulkOperation,
  } = useBulkOperations({
    schemaId,
    onSuccess,
    onError,
  });

  // Get selection status text
  const getSelectionStatus = () => {
    if (selectedCount === 0) {
      return 'No fields selected';
    }

    const base = `${selectedCount} field${selectedCount > 1 ? 's' : ''} selected`;

    if (maxSelections) {
      return `${base} (max ${maxSelections})`;
    }

    return base;
  };

  // Get selection progress color
  const getProgressColor = () => {
    if (selectedCount === 0) return 'default';
    if (isMaxSelection) return 'warning';
    return 'primary';
  };

  // Bulk operation handlers
  const handleBulkDelete = () => {
    if (selectedCount === 0) return;
    setShowDeleteConfirmation(true);
  };

  const handleDeleteConfirm = async (fieldsToDelete: string[]) => {
    try {
      await bulkDeleteFields(fieldsToDelete, { enableOptimisticUpdates: true });
      onClearSelection();
      setShowDeleteConfirmation(false);
    } catch (error) {
      // Error handled by the hook's onError callback
    }
  };

  const handleBulkActivate = async (activate: boolean) => {
    if (selectedCount === 0) return;

    // Show confirmation dialog for deactivation only
    if (!activate) {
      setShowDeactivateConfirmation(true);
      return;
    }

    // For activation, proceed directly (no confirmation needed)
    try {
      const selectedIds = selectedFields.map(field => field.id);
      await bulkActivateFields(selectedIds, activate);
      onClearSelection();
    } catch (error) {
      // Error handled by the hook's onError callback
    }
  };

  const handleDeactivateConfirm = async (fieldIds: string[]) => {
    try {
      await bulkActivateFields(fieldIds, false);
      onClearSelection();
      setShowDeactivateConfirmation(false);
    } catch (error) {
      // Error handled by the hook's onError callback
    }
  };

  const handleBulkToggleRequired = async (required: boolean) => {
    if (selectedCount === 0) return;

    // Show confirmation dialog for all required/optional changes
    setPendingRequiredStatus(required);
    setShowRequiredToggleConfirmation(true);
  };

  const handleRequiredToggleConfirm = async (fieldIds: string[]) => {
    try {
      await bulkToggleRequired(fieldIds, pendingRequiredStatus);
      onClearSelection();
      setShowRequiredToggleConfirmation(false);
    } catch (error) {
      // Error handled by the hook's onError callback
    }
  };

  // Check if all selected fields have the same status
  const getSelectedFieldsStatus = () => {
    if (selectedFields.length === 0) return { allActive: false, allRequired: false, allInactive: false, allOptional: false };

    const allActive = selectedFields.every(field => field.is_active);
    const allInactive = selectedFields.every(field => !field.is_active);
    const allRequired = selectedFields.every(field => field.is_required);
    const allOptional = selectedFields.every(field => !field.is_required);

    return { allActive, allRequired, allInactive, allOptional };
  };

  const { allActive, allRequired, allInactive, allOptional } = getSelectedFieldsStatus();

  if (!isSelectionMode) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              startIcon={<SelectAllIcon />}
              onClick={() => onSelectionModeToggle?.(true)}
              size="small"
              variant="outlined"
              disabled={disabled || totalSelectableCount === 0}
            >
              Enable Selection Mode
            </Button>
            <Typography variant="body2" color="text.secondary">
              Select multiple fields for bulk operations
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ py: 1.5 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            {/* Select All Checkbox */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isPartiallySelected}
                  onChange={isAllSelected ? onClearSelection : onSelectAll}
                  disabled={disabled || totalSelectableCount === 0}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" fontWeight="medium">
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </Typography>
              }
            />

            {/* Quick Action Buttons */}
            <Stack direction="row" spacing={1}>
              <Tooltip title="Select all selectable fields">
                <IconButton
                  onClick={onSelectAll}
                  disabled={disabled || isAllSelected || totalSelectableCount === 0}
                  size="small"
                >
                  <SelectAllIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Clear selection">
                <IconButton
                  onClick={onClearSelection}
                  disabled={disabled || selectedCount === 0}
                  size="small"
                >
                  <ClearAllIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {/* Selection Status and Controls */}
          <Stack direction="row" spacing={2} alignItems="center">
            {/* Selection Count Chip */}
            <Chip
              label={getSelectionStatus()}
              color={getProgressColor()}
              size="small"
              variant={selectedCount > 0 ? 'filled' : 'outlined'}
            />

            {/* Selection Limits Info */}
            {maxSelections && (
              <Tooltip title={`Maximum ${maxSelections} fields can be selected for bulk operations`}>
                <IconButton size="small">
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {/* Exit Selection Mode */}
            {onSelectionModeToggle && (
              <Button
                onClick={() => onSelectionModeToggle(false)}
                size="small"
                variant="text"
                disabled={disabled}
              >
                Exit Selection
              </Button>
            )}
          </Stack>
        </Stack>

        {/* Bulk Operations Toolbar */}
        {hasSelection && (
          <>
            <Divider sx={{ mt: 2, mb: 1.5 }} />
            <Stack spacing={2}>
              <Typography variant="subtitle2" color="text.primary">
                Bulk Operations
              </Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {/* Bulk Delete */}
                <Button
                  size="small"
                  color="error"
                  variant="contained"
                  startIcon={<DeleteIcon />}
                  onClick={handleBulkDelete}
                  disabled={disabled || isAnyBulkOperation}
                >
                  Delete Selected
                </Button>

                {/* Bulk Activate/Deactivate */}
                {!allActive && (
                  <Button
                    size="small"
                    color="success"
                    variant="outlined"
                    startIcon={<ToggleOnIcon />}
                    onClick={() => handleBulkActivate(true)}
                    disabled={disabled || isAnyBulkOperation}
                  >
                    Activate
                  </Button>
                )}

                {!allInactive && (
                  <Button
                    size="small"
                    color="warning"
                    variant="outlined"
                    startIcon={<ToggleOffIcon />}
                    onClick={() => handleBulkActivate(false)}
                    disabled={disabled || isAnyBulkOperation}
                  >
                    Deactivate
                  </Button>
                )}

                {/* Bulk Required/Optional Toggle */}
                {!allRequired && (
                  <Button
                    size="small"
                    color="primary"
                    variant="outlined"
                    startIcon={<RequiredIcon />}
                    onClick={() => handleBulkToggleRequired(true)}
                    disabled={disabled || isAnyBulkOperation}
                  >
                    Mark Required
                  </Button>
                )}

                {!allOptional && (
                  <Button
                    size="small"
                    color="default"
                    variant="outlined"
                    startIcon={<OptionalIcon />}
                    onClick={() => handleBulkToggleRequired(false)}
                    disabled={disabled || isAnyBulkOperation}
                  >
                    Mark Optional
                  </Button>
                )}
              </Stack>

              {/* Progress Indicators */}
              {(deleteProgress || activateProgress || requiredProgress) && (
                <Box>
                  {deleteProgress && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Deleting fields... {deleteProgress.completed} of {deleteProgress.total}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={(deleteProgress.completed / deleteProgress.total) * 100}
                        color="error"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  )}
                  {activateProgress && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Updating field status... {activateProgress.completed} of {activateProgress.total}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={(activateProgress.completed / activateProgress.total) * 100}
                        color="primary"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  )}
                  {requiredProgress && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Updating required status... {requiredProgress.completed} of {requiredProgress.total}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={(requiredProgress.completed / requiredProgress.total) * 100}
                        color="primary"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  )}
                </Box>
              )}
            </Stack>
          </>
        )}

        {/* Keyboard Shortcuts Help */}
        {isSelectionMode && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 1 }}
          >
            <strong>Keyboard shortcuts:</strong> Ctrl+A (Select All) • Escape (Clear) • Shift+Click (Range Select)
          </Typography>
        )}

        {/* Selection Constraints Warning */}
        {!canSelectMore && maxSelections && (
          <Typography
            variant="caption"
            color="warning.main"
            sx={{ display: 'block', mt: 1 }}
          >
            <strong>Selection limit reached:</strong> Maximum {maxSelections} fields can be selected simultaneously
          </Typography>
        )}
      </CardContent>

      {/* Bulk Delete Confirmation Dialog */}
      <BulkDeleteConfirmationDialog
        open={showDeleteConfirmation}
        selectedFields={selectedFields}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirmation(false)}
        isDeleting={isBulkDeleting}
        getImpactAnalysis={getImpactAnalysis}
      />

      {/* Bulk Deactivate Confirmation Dialog */}
      <BulkDeactivateConfirmationDialog
        open={showDeactivateConfirmation}
        selectedFields={selectedFields}
        onConfirm={handleDeactivateConfirm}
        onCancel={() => setShowDeactivateConfirmation(false)}
        isDeactivating={isBulkActivating}
        getImpactAnalysis={getDeactivationImpactAnalysis}
      />

      {/* Bulk Required Toggle Confirmation Dialog */}
      <BulkRequiredToggleConfirmationDialog
        open={showRequiredToggleConfirmation}
        selectedFields={selectedFields}
        requiredStatus={pendingRequiredStatus}
        onConfirm={handleRequiredToggleConfirm}
        onCancel={() => setShowRequiredToggleConfirmation(false)}
        isProcessing={isBulkTogglingRequired}
        getImpactAnalysis={getRequiredToggleImpactAnalysis}
      />
    </Card>
  );
};