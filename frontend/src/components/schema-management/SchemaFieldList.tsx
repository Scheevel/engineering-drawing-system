/**
 * Schema Field List Component
 *
 * Displays existing schema fields in organized, editable list format.
 * Shows field name, type, required status, and provides activation toggle.
 */

import React, { useState } from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Box,
  Typography,
  Chip,
  IconButton,
  Switch,
  Tooltip,
  Skeleton,
  Divider,
  Card,
  CardContent,
  Badge,
} from '@mui/material';
import {
  TextFields as TextFieldsIcon,
  Numbers as NumbersIcon,
  CheckBox as CheckBoxIcon,
  CalendarToday as CalendarIcon,
  Subject as TextAreaIcon,
  ArrowDropDown as SelectIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Visibility as ActiveIcon,
  VisibilityOff as InactiveIcon,
} from '@mui/icons-material';
import { ComponentSchemaField, SchemaFieldType } from '../../services/api';

interface SchemaFieldListProps {
  fields: ComponentSchemaField[];
  loading?: boolean;
  onFieldEdit?: (field: ComponentSchemaField) => void;
  onFieldDelete?: (fieldId: string) => void;
  onFieldToggleActive?: (fieldId: string, isActive: boolean) => void;
  disabled?: boolean;
  showReorderHandles?: boolean;
}

const SchemaFieldList: React.FC<SchemaFieldListProps> = ({
  fields,
  loading = false,
  onFieldEdit,
  onFieldDelete,
  onFieldToggleActive,
  disabled = false,
  showReorderHandles = false,
}) => {
  const [togglingFields, setTogglingFields] = useState<Set<string>>(new Set());

  // Get appropriate icon for field type
  const getFieldTypeIcon = (fieldType: SchemaFieldType) => {
    const iconProps = { fontSize: 'small' as const };

    switch (fieldType) {
      case 'text':
        return <TextFieldsIcon {...iconProps} />;
      case 'number':
        return <NumbersIcon {...iconProps} />;
      case 'select':
        return <SelectIcon {...iconProps} />;
      case 'checkbox':
        return <CheckBoxIcon {...iconProps} />;
      case 'textarea':
        return <TextAreaIcon {...iconProps} />;
      case 'date':
        return <CalendarIcon {...iconProps} />;
      default:
        return <TextFieldsIcon {...iconProps} />;
    }
  };

  // Get field type display name
  const getFieldTypeDisplayName = (fieldType: SchemaFieldType): string => {
    const typeNames: Record<SchemaFieldType, string> = {
      text: 'Text',
      number: 'Number',
      select: 'Select',
      checkbox: 'Checkbox',
      textarea: 'Text Area',
      date: 'Date',
    };
    return typeNames[fieldType] || 'Unknown';
  };

  // Handle field activation toggle
  const handleToggleActive = async (fieldId: string, currentActive: boolean) => {
    if (!onFieldToggleActive || togglingFields.has(fieldId)) return;

    setTogglingFields(prev => new Set(prev).add(fieldId));

    try {
      await onFieldToggleActive(fieldId, !currentActive);
    } catch (error) {
      console.error('Failed to toggle field active status:', error);
    } finally {
      setTogglingFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(fieldId);
        return newSet;
      });
    }
  };

  // Render loading skeleton
  if (loading) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Fields
          </Typography>
          <List>
            {[1, 2, 3].map((index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <Skeleton variant="circular" width={24} height={24} />
                </ListItemIcon>
                <ListItemText
                  primary={<Skeleton variant="text" width={120} />}
                  secondary={<Skeleton variant="text" width={80} />}
                />
                <ListItemSecondaryAction>
                  <Skeleton variant="rectangular" width={60} height={32} />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    );
  }

  // Render empty state
  if (fields.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            py={4}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Fields Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Add fields to define the data structure for components using this schema.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Fields
          </Typography>
          <Badge badgeContent={fields.length} color="primary">
            <Typography variant="body2" color="text.secondary">
              Total
            </Typography>
          </Badge>
        </Box>

        <List disablePadding>
          {fields.map((field, index) => {
            const isActive = field.is_active !== false; // Default to true if undefined
            const isToggling = togglingFields.has(field.id || '');
            const fieldId = field.id || '';

            return (
              <React.Fragment key={fieldId || index}>
                <ListItem
                  sx={{
                    opacity: isActive ? 1 : 0.6,
                    transition: 'opacity 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                  disabled={disabled}
                >
                  {/* Reorder Handle */}
                  {showReorderHandles && (
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Tooltip title="Drag to reorder">
                        <IconButton size="small" sx={{ cursor: 'grab' }}>
                          <DragIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemIcon>
                  )}

                  {/* Field Type Icon */}
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Box
                      sx={{
                        color: isActive ? 'primary.main' : 'action.disabled',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {getFieldTypeIcon(field.field_type)}
                    </Box>
                  </ListItemIcon>

                  {/* Field Info */}
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: field.is_required ? 600 : 400,
                            color: isActive ? 'text.primary' : 'text.disabled',
                          }}
                        >
                          {field.field_name}
                        </Typography>
                        {field.is_required && (
                          <Chip
                            label="Required"
                            size="small"
                            color="error"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.75rem' }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                        <Chip
                          label={getFieldTypeDisplayName(field.field_type)}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.75rem' }}
                        />
                        {field.help_text && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 200,
                            }}
                          >
                            {field.help_text}
                          </Typography>
                        )}
                      </Box>
                    }
                  />

                  {/* Field Actions */}
                  <ListItemSecondaryAction>
                    <Box display="flex" alignItems="center" gap={1}>
                      {/* Active/Inactive Toggle */}
                      <Tooltip
                        title={isActive ? 'Deactivate field' : 'Activate field'}
                      >
                        <Box>
                          <Switch
                            checked={isActive}
                            onChange={() => handleToggleActive(fieldId, isActive)}
                            disabled={disabled || isToggling || !onFieldToggleActive}
                            size="small"
                            color="primary"
                          />
                        </Box>
                      </Tooltip>

                      {/* Edit Button */}
                      <Tooltip title="Edit field">
                        <IconButton
                          size="small"
                          onClick={() => onFieldEdit?.(field)}
                          disabled={disabled || !onFieldEdit}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* Delete Button */}
                      <Tooltip title="Delete field">
                        <IconButton
                          size="small"
                          onClick={() => onFieldDelete?.(fieldId)}
                          disabled={disabled || !onFieldDelete}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>

                {/* Divider between items (except last) */}
                {index < fields.length - 1 && <Divider component="li" />}
              </React.Fragment>
            );
          })}
        </List>
      </CardContent>
    </Card>
  );
};

export default SchemaFieldList;