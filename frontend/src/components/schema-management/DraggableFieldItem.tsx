/**
 * Draggable Field Item Component
 *
 * Individual field item that can be dragged and reordered.
 * Provides visual feedback and accessibility features.
 */

import React from 'react';
import {
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip,
  Box,
  alpha,
  useTheme,
  Checkbox,
  Tooltip,
} from '@mui/material';
import {
  DragIndicator as DragIcon,
  Visibility as VisibleIcon,
  VisibilityOff as HiddenIcon,
  LockOutlined as LockIcon,
} from '@mui/icons-material';
import { ComponentSchemaField } from '../../types/schema';

interface DraggableFieldItemProps {
  field: ComponentSchemaField;
  isDragDisabled?: boolean;
  isNonDraggable?: boolean;
  isOverlay?: boolean;
  // Selection properties
  showSelection?: boolean;
  isSelected?: boolean;
  onSelectionToggle?: (fieldId: string, event?: React.MouseEvent) => void;
  isSelectionDisabled?: boolean;
}

export const DraggableFieldItem: React.FC<DraggableFieldItemProps> = ({
  field,
  isDragDisabled = false,
  isNonDraggable = false,
  isOverlay = false,
  showSelection = false,
  isSelected = false,
  onSelectionToggle,
  isSelectionDisabled = false,
}) => {
  const theme = useTheme();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field.id,
    disabled: isDragDisabled || isNonDraggable,
  });

  // Determine the effective drag disabled state
  const isEffectivelyDisabled = isDragDisabled || isNonDraggable;

  // Handle selection click
  const handleSelectionClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onSelectionToggle && !isSelectionDisabled) {
      onSelectionToggle(field.id, event);
    }
  };

  // Handle item click for selection when in selection mode
  const handleItemClick = (event: React.MouseEvent) => {
    if (showSelection && onSelectionToggle && !isSelectionDisabled) {
      // Don't trigger on drag handle or other interactive elements
      const target = event.target as HTMLElement;
      if (!target.closest('[data-drag-handle]') && !target.closest('button')) {
        onSelectionToggle(field.id, event);
      }
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getFieldTypeColor = (type: string) => {
    switch (type) {
      case 'text': return 'primary';
      case 'number': return 'secondary';
      case 'select': return 'success';
      case 'boolean': return 'warning';
      case 'date': return 'info';
      default: return 'default';
    }
  };

  const getSecondaryText = () => {
    const parts = [];
    if (field.is_required) parts.push('Required');
    if (field.help_text) parts.push(field.help_text);
    return parts.join(' • ');
  };

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      onClick={handleItemClick}
      sx={{
        border: isOverlay
          ? `2px solid ${theme.palette.primary.main}`
          : isSelected
            ? `2px solid ${theme.palette.primary.main}`
            : isNonDraggable
              ? `1px solid ${theme.palette.warning.main}`
              : '1px solid transparent',
        borderRadius: 1,
        mb: 0.5,
        backgroundColor: isOverlay
          ? alpha(theme.palette.primary.main, 0.1)
          : isSelected
            ? alpha(theme.palette.primary.main, 0.08)
            : isDragging
              ? alpha(theme.palette.action.hover, 0.5)
              : isNonDraggable
                ? alpha(theme.palette.warning.main, 0.05)
                : 'transparent',
        '&:hover': {
          backgroundColor: isEffectivelyDisabled
            ? undefined
            : isSelected
              ? alpha(theme.palette.primary.main, 0.12)
              : alpha(theme.palette.action.hover, 0.1),
          borderColor: isEffectivelyDisabled
            ? undefined
            : isSelected
              ? theme.palette.primary.main
              : alpha(theme.palette.primary.main, 0.3),
        },
        cursor: showSelection && !isSelectionDisabled
          ? 'pointer'
          : isEffectivelyDisabled
            ? 'not-allowed'
            : 'grab',
        '&:active': {
          cursor: showSelection && !isSelectionDisabled
            ? 'pointer'
            : isEffectivelyDisabled
              ? 'not-allowed'
              : 'grabbing',
        },
        opacity: isNonDraggable ? 0.7 : field.is_active ? 1 : 0.6,
      }}
      {...attributes}
    >
      <ListItemIcon>
        <Box display="flex" alignItems="center" gap={0.5}>
          {/* Selection Checkbox */}
          {showSelection && (
            <Tooltip title={isSelectionDisabled ? 'Selection not available' : 'Select field'}>
              <Checkbox
                checked={isSelected}
                onChange={handleSelectionClick}
                disabled={isSelectionDisabled}
                size="small"
                sx={{
                  padding: 0.5,
                  '&:hover': {
                    backgroundColor: 'transparent',
                  },
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </Tooltip>
          )}

          {/* Drag Handle */}
          <IconButton
            size="small"
            data-drag-handle
            sx={{
              cursor: isEffectivelyDisabled ? 'not-allowed' : 'grab',
              opacity: isEffectivelyDisabled ? 0.5 : 1,
              color: isNonDraggable ? 'warning.main' : 'inherit',
              '&:active': {
                cursor: isEffectivelyDisabled ? 'not-allowed' : 'grabbing',
              }
            }}
            {...listeners}
            disabled={isEffectivelyDisabled}
            title={
              isNonDraggable
                ? 'This field cannot be reordered'
                : isDragDisabled
                  ? 'Reordering is currently disabled'
                  : 'Drag to reorder'
            }
          >
            {isNonDraggable ? <LockIcon /> : <DragIcon />}
          </IconButton>
        </Box>
      </ListItemIcon>

      <ListItemText
        primary={
          <Box display="flex" alignItems="center" gap={1}>
            <span>{field.label}</span>
            <Chip
              label={field.field_type}
              size="small"
              color={getFieldTypeColor(field.field_type) as any}
              variant="outlined"
            />
            {!field.is_active && (
              <HiddenIcon
                fontSize="small"
                color="disabled"
                titleAccess="Field is inactive"
              />
            )}
            {field.is_active && field.is_required && (
              <VisibleIcon
                fontSize="small"
                color="primary"
                titleAccess="Field is active and required"
              />
            )}
          </Box>
        }
        secondary={getSecondaryText()}
        sx={{
          opacity: isNonDraggable ? 0.7 : field.is_active ? 1 : 0.6,
        }}
      />
    </ListItem>
  );
};