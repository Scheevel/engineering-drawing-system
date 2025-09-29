/**
 * Field Order Manager Component
 *
 * Provides drag-and-drop interface for field reordering, bulk operations,
 * and visual field arrangement within schema forms.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Chip,
  Divider,
  Alert,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem as SelectMenuItem,
  FormControlLabel,
  Switch,
  Tooltip,
  Paper,
  Grid,
  Avatar,
  Badge,
} from '@mui/material';
import {
  DragIndicator as DragIcon,
  ArrowUpward as UpIcon,
  ArrowDownward as DownIcon,
  MoreVert as MoreIcon,
  Visibility as VisibleIcon,
  VisibilityOff as HiddenIcon,
  Star as RequiredIcon,
  StarBorder as OptionalIcon,
  Sort as SortIcon,
  SwapVert as SwapIcon,
  SelectAll as SelectAllIcon,
  Clear as ClearIcon,
  PlaylistAdd as BulkIcon,
  AutoFixHigh as AutoOrderIcon,
  Undo as ResetIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { isMobile } from 'react-device-detect';

import { SchemaFieldType } from '../../services/api';

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

export interface FieldDisplaySettings {
  fieldId: string;
  isVisible: boolean;
  displayOrder: number;
  groupId?: string;
  customStyling?: Record<string, any>;
}

export interface BulkOperation {
  type: 'move_to_position' | 'group_together' | 'set_visibility' | 'set_required' | 'auto_order';
  fieldIds: string[];
  parameters: Record<string, any>;
}

export interface FieldOrderManagerProps {
  fields: ComponentSchemaField[];
  onFieldsReorder: (fields: ComponentSchemaField[]) => void;
  onBulkOperation?: (operation: BulkOperation) => void;
  allowGrouping?: boolean;
  showVisibilityControls?: boolean;
  readOnly?: boolean;
}

interface DragItem {
  id: string;
  index: number;
  type: string;
}

interface SortOption {
  value: string;
  label: string;
  description: string;
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'alphabetical', label: 'Alphabetical', description: 'Sort by field name A-Z' },
  { value: 'type', label: 'Field Type', description: 'Group by field type' },
  { value: 'required_first', label: 'Required First', description: 'Required fields at top' },
  { value: 'logical_flow', label: 'Logical Flow', description: 'Smart ordering for data entry flow' },
  { value: 'reset', label: 'Reset to Default', description: 'Restore original order' },
];

const FIELD_TYPE_ORDER = {
  'text': 1,
  'number': 2,
  'select': 3,
  'date': 4,
  'checkbox': 5,
  'textarea': 6,
};

const FIELD_TYPE_ICONS = {
  'text': '📝',
  'number': '🔢',
  'select': '📋',
  'date': '📅',
  'checkbox': '☑️',
  'textarea': '📄',
};

// Draggable Field Item Component
const DraggableFieldItem: React.FC<{
  field: ComponentSchemaField;
  index: number;
  isSelected: boolean;
  onSelect: (fieldId: string) => void;
  onToggleVisibility?: (fieldId: string) => void;
  onToggleRequired?: (fieldId: string) => void;
  onFieldAction?: (fieldId: string, action: string) => void;
  readOnly?: boolean;
}> = ({
  field,
  index,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleRequired,
  onFieldAction,
  readOnly = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);

  const [{ handlerId }, drop] = useDrop({
    accept: 'field',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragItem, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = (clientOffset?.y || 0) - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: 'field',
    item: () => {
      return { id: field.id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0.4 : 1;
  drag(drop(ref));

  const handleActionClick = (event: React.MouseEvent<HTMLElement>) => {
    setActionMenuAnchor(event.currentTarget);
  };

  const handleActionClose = () => {
    setActionMenuAnchor(null);
  };

  const handleAction = (action: string) => {
    if (onFieldAction) {
      onFieldAction(field.id, action);
    }
    handleActionClose();
  };

  return (
    <ListItem
      ref={ref}
      data-handler-id={handlerId}
      sx={{
        opacity,
        cursor: readOnly ? 'default' : 'move',
        bgcolor: isSelected ? 'action.selected' : 'transparent',
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
      onClick={() => onSelect(field.id)}
    >
      <Box display="flex" alignItems="center" width="100%">
        {!readOnly && (
          <Box mr={1}>
            <DragIcon color="action" />
          </Box>
        )}

        <Box display="flex" alignItems="center" mr={2}>
          <Typography variant="h6" component="span" mr={1}>
            {field.display_order}
          </Typography>
          <Box fontSize="1.2rem" mr={1}>
            {FIELD_TYPE_ICONS[field.field_type as keyof typeof FIELD_TYPE_ICONS] || '📋'}
          </Box>
        </Box>

        <Box flexGrow={1}>
          <ListItemText
            primary={
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="subtitle1">
                  {field.field_name}
                </Typography>
                <Chip
                  label={field.field_type}
                  size="small"
                  variant="outlined"
                />
                {field.is_required && (
                  <Chip
                    label="Required"
                    size="small"
                    color="error"
                    variant="outlined"
                    icon={<RequiredIcon />}
                  />
                )}
                {!field.is_active && (
                  <Chip
                    label="Hidden"
                    size="small"
                    color="default"
                    variant="outlined"
                    icon={<HiddenIcon />}
                  />
                )}
              </Box>
            }
            secondary={field.help_text}
          />
        </Box>

        <ListItemSecondaryAction>
          <Box display="flex" alignItems="center" gap={0.5}>
            {!readOnly && onToggleVisibility && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisibility(field.id);
                }}
                color={field.is_active ? 'primary' : 'default'}
              >
                {field.is_active ? <VisibleIcon /> : <HiddenIcon />}
              </IconButton>
            )}

            {!readOnly && onToggleRequired && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleRequired(field.id);
                }}
                color={field.is_required ? 'primary' : 'default'}
              >
                {field.is_required ? <RequiredIcon /> : <OptionalIcon />}
              </IconButton>
            )}

            {!readOnly && (
              <IconButton
                size="small"
                onClick={handleActionClick}
              >
                <MoreIcon />
              </IconButton>
            )}
          </Box>
        </ListItemSecondaryAction>
      </Box>

      {/* Field Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionClose}
      >
        <MenuItem onClick={() => handleAction('move_to_top')}>
          <UpIcon sx={{ mr: 1 }} /> Move to Top
        </MenuItem>
        <MenuItem onClick={() => handleAction('move_to_bottom')}>
          <DownIcon sx={{ mr: 1 }} /> Move to Bottom
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleAction('duplicate')}>
          <SwapIcon sx={{ mr: 1 }} /> Duplicate Field
        </MenuItem>
        <MenuItem onClick={() => handleAction('edit')}>
          <SortIcon sx={{ mr: 1 }} /> Edit Field
        </MenuItem>
      </Menu>
    </ListItem>
  );
};

const FieldOrderManager: React.FC<FieldOrderManagerProps> = ({
  fields,
  onFieldsReorder,
  onBulkOperation,
  allowGrouping = true,
  showVisibilityControls = true,
  readOnly = false,
}) => {
  const [orderedFields, setOrderedFields] = useState<ComponentSchemaField[]>(fields);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkOperationType, setBulkOperationType] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Sort fields by display_order when props change
    const sorted = [...fields].sort((a, b) => a.display_order - b.display_order);
    setOrderedFields(sorted);
    setHasChanges(false);
  }, [fields]);

  const moveField = useCallback((dragIndex: number, hoverIndex: number) => {
    if (readOnly) return;

    const newFields = [...orderedFields];
    const draggedField = newFields[dragIndex];
    newFields.splice(dragIndex, 1);
    newFields.splice(hoverIndex, 0, draggedField);

    // Update display_order for all fields
    const updatedFields = newFields.map((field, index) => ({
      ...field,
      display_order: index + 1,
    }));

    setOrderedFields(updatedFields);
    setHasChanges(true);
  }, [orderedFields, readOnly]);

  const handleFieldSelect = useCallback((fieldId: string) => {
    setSelectedFields(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(fieldId)) {
        newSelection.delete(fieldId);
      } else {
        newSelection.add(fieldId);
      }
      return newSelection;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allFieldIds = new Set(orderedFields.map(f => f.id));
    setSelectedFields(selectedFields.size === orderedFields.length ? new Set() : allFieldIds);
  }, [orderedFields, selectedFields.size]);

  const handleToggleVisibility = useCallback((fieldId: string) => {
    if (readOnly) return;

    const updatedFields = orderedFields.map(field =>
      field.id === fieldId ? { ...field, is_active: !field.is_active } : field
    );
    setOrderedFields(updatedFields);
    setHasChanges(true);
  }, [orderedFields, readOnly]);

  const handleToggleRequired = useCallback((fieldId: string) => {
    if (readOnly) return;

    const updatedFields = orderedFields.map(field =>
      field.id === fieldId ? { ...field, is_required: !field.is_required } : field
    );
    setOrderedFields(updatedFields);
    setHasChanges(true);
  }, [orderedFields, readOnly]);

  const handleFieldAction = useCallback((fieldId: string, action: string) => {
    if (readOnly) return;

    const fieldIndex = orderedFields.findIndex(f => f.id === fieldId);
    if (fieldIndex === -1) return;

    let updatedFields = [...orderedFields];

    switch (action) {
      case 'move_to_top':
        const fieldToTop = updatedFields.splice(fieldIndex, 1)[0];
        updatedFields.unshift(fieldToTop);
        break;

      case 'move_to_bottom':
        const fieldToBottom = updatedFields.splice(fieldIndex, 1)[0];
        updatedFields.push(fieldToBottom);
        break;

      default:
        console.log(`Action ${action} not implemented for field ${fieldId}`);
        return;
    }

    // Update display_order
    updatedFields = updatedFields.map((field, index) => ({
      ...field,
      display_order: index + 1,
    }));

    setOrderedFields(updatedFields);
    setHasChanges(true);
  }, [orderedFields, readOnly]);

  const handleSortFields = useCallback((sortType: string) => {
    if (readOnly) return;

    let sortedFields = [...orderedFields];

    switch (sortType) {
      case 'alphabetical':
        sortedFields.sort((a, b) => a.field_name.localeCompare(b.field_name));
        break;

      case 'type':
        sortedFields.sort((a, b) => {
          const aOrder = FIELD_TYPE_ORDER[a.field_type as keyof typeof FIELD_TYPE_ORDER] || 999;
          const bOrder = FIELD_TYPE_ORDER[b.field_type as keyof typeof FIELD_TYPE_ORDER] || 999;
          return aOrder - bOrder;
        });
        break;

      case 'required_first':
        sortedFields.sort((a, b) => {
          if (a.is_required && !b.is_required) return -1;
          if (!a.is_required && b.is_required) return 1;
          return a.field_name.localeCompare(b.field_name);
        });
        break;

      case 'logical_flow':
        // Smart ordering: identification -> dimensions -> materials -> calculations -> documentation
        const logicalOrder = ['text', 'number', 'select', 'date', 'checkbox', 'textarea'];
        sortedFields.sort((a, b) => {
          const aIndex = logicalOrder.indexOf(a.field_type);
          const bIndex = logicalOrder.indexOf(b.field_type);
          if (aIndex !== bIndex) return aIndex - bIndex;
          if (a.is_required !== b.is_required) return a.is_required ? -1 : 1;
          return a.field_name.localeCompare(b.field_name);
        });
        break;

      case 'reset':
        sortedFields = [...fields].sort((a, b) => a.display_order - b.display_order);
        break;

      default:
        return;
    }

    // Update display_order
    const updatedFields = sortedFields.map((field, index) => ({
      ...field,
      display_order: index + 1,
    }));

    setOrderedFields(updatedFields);
    setHasChanges(true);
  }, [orderedFields, fields, readOnly]);

  const handleBulkOperation = useCallback((operation: BulkOperation) => {
    if (onBulkOperation) {
      onBulkOperation(operation);
    }
    setSelectedFields(new Set());
    setShowBulkDialog(false);
  }, [onBulkOperation]);

  const handleSaveChanges = useCallback(() => {
    onFieldsReorder(orderedFields);
    setHasChanges(false);
  }, [orderedFields, onFieldsReorder]);

  const handleResetChanges = useCallback(() => {
    const sorted = [...fields].sort((a, b) => a.display_order - b.display_order);
    setOrderedFields(sorted);
    setHasChanges(false);
  }, [fields]);

  const backend = isMobile ? TouchBackend : HTML5Backend;

  return (
    <DndProvider backend={backend}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Field Order & Visibility
          </Typography>
          {!readOnly && (
            <Box display="flex" gap={1}>
              {hasChanges && (
                <>
                  <Button
                    startIcon={<ResetIcon />}
                    onClick={handleResetChanges}
                    variant="outlined"
                    size="small"
                  >
                    Reset
                  </Button>
                  <Button
                    startIcon={<SaveIcon />}
                    onClick={handleSaveChanges}
                    variant="contained"
                    size="small"
                  >
                    Save Changes
                  </Button>
                </>
              )}
            </Box>
          )}
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Card variant="outlined">
              <CardHeader
                title={`Field Order (${orderedFields.length} fields)`}
                action={
                  !readOnly && (
                    <Box display="flex" gap={1}>
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Quick Sort</InputLabel>
                        <Select
                          value=""
                          label="Quick Sort"
                          onChange={(e) => handleSortFields(e.target.value)}
                        >
                          {SORT_OPTIONS.map((option) => (
                            <SelectMenuItem key={option.value} value={option.value}>
                              <Box>
                                <Typography variant="body2">{option.label}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {option.description}
                                </Typography>
                              </Box>
                            </SelectMenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        startIcon={<SelectAllIcon />}
                        onClick={handleSelectAll}
                        variant="outlined"
                        size="small"
                      >
                        {selectedFields.size === orderedFields.length ? 'Clear' : 'Select All'}
                      </Button>
                    </Box>
                  )
                }
              />
              <CardContent sx={{ p: 0 }}>
                {orderedFields.length === 0 ? (
                  <Alert severity="info" sx={{ m: 2 }}>
                    No fields to order. Add fields to your schema to manage their display order.
                  </Alert>
                ) : (
                  <List dense>
                    {orderedFields.map((field, index) => (
                      <React.Fragment key={field.id}>
                        <DraggableFieldItem
                          field={field}
                          index={index}
                          isSelected={selectedFields.has(field.id)}
                          onSelect={handleFieldSelect}
                          onToggleVisibility={showVisibilityControls ? handleToggleVisibility : undefined}
                          onToggleRequired={handleToggleRequired}
                          onFieldAction={handleFieldAction}
                          readOnly={readOnly}
                        />
                        {index < orderedFields.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardHeader
                title={`Selection (${selectedFields.size})`}
                action={
                  selectedFields.size > 0 && !readOnly && (
                    <Button
                      startIcon={<BulkIcon />}
                      onClick={() => setShowBulkDialog(true)}
                      variant="outlined"
                      size="small"
                    >
                      Bulk Actions
                    </Button>
                  )
                }
              />
              <CardContent>
                {selectedFields.size === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Select fields to perform bulk operations like reordering, grouping, or visibility changes.
                  </Typography>
                ) : (
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Selected fields:
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      {Array.from(selectedFields).map(fieldId => {
                        const field = orderedFields.find(f => f.id === fieldId);
                        return field ? (
                          <Chip
                            key={fieldId}
                            label={field.field_name}
                            size="small"
                            onDelete={() => handleFieldSelect(fieldId)}
                            variant="outlined"
                          />
                        ) : null;
                      })}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>

            {hasChanges && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                You have unsaved changes to field order. Click "Save Changes" to apply them.
              </Alert>
            )}
          </Grid>
        </Grid>

        {/* Bulk Operations Dialog */}
        <Dialog
          open={showBulkDialog}
          onClose={() => setShowBulkDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Bulk Operations ({selectedFields.size} fields selected)
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              Bulk operations for field management will be available in the next release.
              This will include moving selected fields to specific positions, grouping, and bulk visibility changes.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowBulkDialog(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DndProvider>
  );
};

export default FieldOrderManager;