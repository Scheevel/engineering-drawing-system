/**
 * Field Reorder Interface Component
 *
 * Provides drag-and-drop interface for field reordering with visual feedback,
 * touch support, and keyboard accessibility.
 */

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from '@dnd-kit/modifiers';
import {
  Box,
  Paper,
  Typography,
  List,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import {
  Undo as UndoIcon,
  Redo as RedoIcon,
} from '@mui/icons-material';
import { ComponentSchemaField } from '../../types/schema';
import { DraggableFieldItem } from './DraggableFieldItem';
import { SchemaFormPreview } from './SchemaFormPreview';
import { FieldSelectionManager } from './FieldSelectionManager';
import { useFieldReordering } from '../../hooks/schema/useFieldReordering';
import { useFieldOrderHistory } from '../../hooks/schema/useFieldOrderHistory';
import { useFieldSelection } from '../../hooks/schema/useFieldSelection';

interface FieldReorderInterfaceProps {
  schemaId: string;
  fields: ComponentSchemaField[];
  isReorderEnabled?: boolean;
  isOtherOperationInProgress?: boolean;
  nonDraggableFieldIds?: string[];
  showFormPreview?: boolean;
  enableUndo?: boolean;
  onReorderStart?: () => void;
  onReorderEnd?: () => void;
  onReorderError?: (error: string) => void;
  // Selection properties
  enableSelection?: boolean;
  onSelectionChange?: (selectedFieldIds: string[]) => void;
  maxSelections?: number;
}

export const FieldReorderInterface: React.FC<FieldReorderInterfaceProps> = ({
  schemaId,
  fields,
  isReorderEnabled = true,
  isOtherOperationInProgress = false,
  nonDraggableFieldIds = [],
  showFormPreview = true,
  enableUndo = true,
  onReorderStart,
  onReorderEnd,
  onReorderError,
  enableSelection = false,
  onSelectionChange,
  maxSelections,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localFields, setLocalFields] = useState<ComponentSchemaField[]>(fields);
  const [conflicts, setConflicts] = useState<Array<{ fieldId: string; conflict: string }> | null>(null);
  const [lastFailedOrder, setLastFailedOrder] = useState<string[] | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(enableSelection);

  // Field selection state
  const {
    selectedFieldIds,
    isFieldSelected,
    toggleFieldSelection,
    selectAllFields,
    clearSelection,
    selectedCount,
    canSelectMore,
    isAllSelected,
    isPartiallySelected,
  } = useFieldSelection({
    fields: localFields,
    onSelectionChange,
    enableKeyboardShortcuts: isSelectionMode,
    maxSelections,
    disabledFieldIds: nonDraggableFieldIds,
  });

  // History management for undo functionality
  const {
    pushToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useFieldOrderHistory(fields, { enableRedo: enableUndo });

  const {
    handleDragEnd: handleReorderDragEnd,
    forceRetry,
    isLoading,
    error,
    updateSchemaVersion,
  } = useFieldReordering(schemaId, {
    onMutate: () => onReorderStart?.(),
    onSuccess: (hasConflicts) => {
      if (!hasConflicts) {
        onReorderEnd?.();
        setConflicts(null);
        setLastFailedOrder(null);
      }
    },
    onError: (err) => onReorderError?.(err.message),
    onConflict: (detectedConflicts) => {
      setConflicts(detectedConflicts);
      setShowConflictDialog(true);
    },
    debounceMs: 300, // Batch rapid operations
  });

  // Determine if reordering should be disabled
  const isReorderingDisabled = !isReorderEnabled || isOtherOperationInProgress || isLoading;

  // Configure sensors for accessibility and touch support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Auto-scroll functionality during drag operations
  const handleAutoScroll = React.useCallback((event: MouseEvent | TouchEvent) => {
    if (!activeId) return;

    const container = document.querySelector('[role="list"]');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    const scrollZone = 100; // pixels from edge to start scrolling
    const scrollSpeed = 10;

    if (clientY < rect.top + scrollZone) {
      // Scroll up
      container.scrollTop = Math.max(0, container.scrollTop - scrollSpeed);
    } else if (clientY > rect.bottom - scrollZone) {
      // Scroll down
      container.scrollTop = Math.min(
        container.scrollHeight - container.clientHeight,
        container.scrollTop + scrollSpeed
      );
    }
  }, [activeId]);

  // Set up auto-scroll event listeners
  React.useEffect(() => {
    if (activeId) {
      const handleMouseMove = (e: MouseEvent) => handleAutoScroll(e);
      const handleTouchMove = (e: TouchEvent) => handleAutoScroll(e);

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleTouchMove);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('touchmove', handleTouchMove);
      };
    }
  }, [activeId, handleAutoScroll]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    // Prevent reordering if disabled or no valid drop target
    if (!over || active.id === over.id || isReorderingDisabled) {
      return;
    }

    // Check if the dragged field is allowed to be moved
    if (nonDraggableFieldIds.includes(active.id as string)) {
      return;
    }

    const oldIndex = localFields.findIndex(field => field.id === active.id);
    const newIndex = localFields.findIndex(field => field.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      // Save current state to history before making changes
      if (enableUndo) {
        pushToHistory(localFields);
      }

      const reorderedFields = arrayMove(localFields, oldIndex, newIndex);
      setLocalFields(reorderedFields);

      const fieldOrder = reorderedFields.map(field => field.id);
      setLastFailedOrder(fieldOrder); // Store for potential retry

      handleReorderDragEnd({
        schemaId,
        fieldOrder,
      });
    }
  };

  // Handle force retry when conflicts are detected
  const handleForceRetry = () => {
    if (lastFailedOrder) {
      forceRetry(lastFailedOrder);
      setShowConflictDialog(false);
      setConflicts(null);
      setLastFailedOrder(null);
    }
  };

  // Handle conflict dialog dismissal
  const handleConflictCancel = () => {
    setShowConflictDialog(false);
    // Revert to server state by refreshing
    updateSchemaVersion();
  };

  // Handle undo operation
  const handleUndo = () => {
    const previousFields = undo();
    if (previousFields) {
      setLocalFields(previousFields);
      handleReorderDragEnd({
        schemaId,
        fieldOrder: previousFields.map(field => field.id),
      });
    }
  };

  // Handle redo operation
  const handleRedo = () => {
    const nextFields = redo();
    if (nextFields) {
      setLocalFields(nextFields);
      handleReorderDragEnd({
        schemaId,
        fieldOrder: nextFields.map(field => field.id),
      });
    }
  };

  const activeField = activeId ? localFields.find(field => field.id === activeId) : null;

  // Sync local state when fields prop changes
  React.useEffect(() => {
    setLocalFields(fields);
  }, [fields]);

  if (isReorderingDisabled) {
    let alertMessage = 'Field reordering is currently disabled.';
    if (isOtherOperationInProgress) {
      alertMessage = 'Field reordering is disabled while other operations are in progress.';
    } else if (isLoading) {
      alertMessage = 'Field reordering is disabled while saving changes.';
    } else if (!isReorderEnabled) {
      alertMessage = 'Field reordering is currently disabled. Complete other operations first.';
    }

    return (
      <Box>
        <Alert severity="info" sx={{ mb: 2 }}>
          {alertMessage}
        </Alert>
        <List role="list">
          {fields.map((field) => (
            <DraggableFieldItem
              key={field.id}
              field={field}
              isDragDisabled={true}
              isNonDraggable={nonDraggableFieldIds.includes(field.id)}
              showSelection={isSelectionMode}
              isSelected={isFieldSelected(field.id)}
              onSelectionToggle={toggleFieldSelection}
              isSelectionDisabled={!field.is_active || nonDraggableFieldIds.includes(field.id)}
            />
          ))}
        </List>
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={
          error.includes('modified by another user') ? (
            <Button size="small" onClick={() => updateSchemaVersion()}>
              Refresh
            </Button>
          ) : undefined
        }>
          {error.includes('modified by another user') ? (
            <>
              <strong>Conflict Detected:</strong> Schema was modified by another user.
              Please refresh to see the latest changes.
            </>
          ) : (
            <>Reorder failed: {error}</>
          )}
        </Alert>
      )}

      {isLoading && (
        <Card sx={{ mb: 2, bgcolor: 'action.hover' }}>
          <CardContent sx={{ py: 1.5 }}>
            <Box display="flex" alignItems="center" gap={2}>
              <CircularProgress size={20} />
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  Saving field order...
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Processing batch operations for optimal performance
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {conflicts && conflicts.length > 0 && !showConflictDialog && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            {conflicts.length} field conflict{conflicts.length > 1 ? 's' : ''} detected.
            Some fields may have been modified or removed by another user.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {conflicts.slice(0, 3).map((conflict, index) => (
              <Chip
                key={index}
                label={conflict.fieldId}
                size="small"
                color="warning"
                variant="outlined"
              />
            ))}
            {conflicts.length > 3 && (
              <Chip
                label={`+${conflicts.length - 3} more`}
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
          </Stack>
        </Alert>
      )}

      {/* Field Selection Manager */}
      {enableSelection && (
        <FieldSelectionManager
          fields={localFields}
          selectedCount={selectedCount}
          totalSelectableCount={localFields.filter(f => f.is_active && !nonDraggableFieldIds.includes(f.id)).length}
          isAllSelected={isAllSelected}
          isPartiallySelected={isPartiallySelected}
          canSelectMore={canSelectMore}
          maxSelections={maxSelections}
          onSelectAll={selectAllFields}
          onClearSelection={clearSelection}
          onSelectionModeToggle={setIsSelectionMode}
          isSelectionMode={isSelectionMode}
          disabled={isReorderingDisabled}
        />
      )}

      {/* Undo/Redo Controls */}
      {enableUndo && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                startIcon={<UndoIcon />}
                onClick={handleUndo}
                disabled={!canUndo || isReorderingDisabled}
                size="small"
                variant="outlined"
              >
                Undo
              </Button>
              <Button
                startIcon={<RedoIcon />}
                onClick={handleRedo}
                disabled={!canRedo || isReorderingDisabled}
                size="small"
                variant="outlined"
              >
                Redo
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                Drag fields to reorder • Use undo/redo to manage changes
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* Field Reordering Interface */}
        <Grid item xs={12} md={showFormPreview ? 6 : 12}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Field Order Management
            </Typography>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
            >
              <SortableContext
                items={localFields.map(field => field.id)}
                strategy={verticalListSortingStrategy}
              >
                <List role="list" sx={{ maxHeight: '60vh', overflow: 'auto' }}>
                  {localFields.map((field) => (
                    <DraggableFieldItem
                      key={field.id}
                      field={field}
                      isDragDisabled={isReorderingDisabled}
                      isNonDraggable={nonDraggableFieldIds.includes(field.id)}
                      showSelection={isSelectionMode}
                      isSelected={isFieldSelected(field.id)}
                      onSelectionToggle={toggleFieldSelection}
                      isSelectionDisabled={!field.is_active || nonDraggableFieldIds.includes(field.id)}
                    />
                  ))}
                </List>
              </SortableContext>

              <DragOverlay>
                {activeField ? (
                  <Paper elevation={8}>
                    <DraggableFieldItem
                      field={activeField}
                      isDragDisabled={false}
                      isOverlay={true}
                    />
                  </Paper>
                ) : null}
              </DragOverlay>
            </DndContext>
          </Paper>
        </Grid>

        {/* Form Preview */}
        {showFormPreview && (
          <Grid item xs={12} md={6}>
            <SchemaFormPreview
              fields={localFields}
              title="Live Form Preview"
            />
          </Grid>
        )}
      </Grid>

      {/* Conflict Resolution Dialog */}
      <Dialog
        open={showConflictDialog}
        onClose={handleConflictCancel}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Schema Conflict Detected
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            The schema has been modified while you were reordering fields. The following conflicts were detected:
          </Typography>

          {conflicts && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              {conflicts.map((conflict, index) => (
                <Alert key={index} severity="warning" variant="outlined">
                  <Typography variant="body2">
                    <strong>Field:</strong> {conflict.fieldId}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Issue:</strong> {conflict.conflict}
                  </Typography>
                </Alert>
              ))}
            </Stack>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            You can either:
          </Typography>
          <Typography variant="body2" component="ul" sx={{ mt: 1, pl: 2 }}>
            <li><strong>Force Apply:</strong> Override conflicts and apply your reordering</li>
            <li><strong>Cancel:</strong> Discard your changes and refresh to see the latest schema</li>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConflictCancel} color="inherit">
            Cancel & Refresh
          </Button>
          <Button
            onClick={handleForceRetry}
            variant="contained"
            color="warning"
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={20} /> : 'Force Apply Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};