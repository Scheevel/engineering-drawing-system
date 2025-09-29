/**
 * Quick Add Field Buttons Component
 *
 * Provides one-click field creation with smart default configurations.
 * Includes recently used prioritization and contextual suggestions based on schema patterns.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  ButtonGroup,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  Badge,
  Collapse,
} from '@mui/material';
import {
  TextFields as TextIcon,
  Numbers as NumberIcon,
  CheckBox as CheckboxIcon,
  CalendarToday as DateIcon,
  Subject as TextAreaIcon,
  ArrowDropDown as SelectIcon,
  Add as AddIcon,
  Star as StarIcon,
  History as RecentIcon,
  Lightbulb as SuggestionIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

import { SchemaFieldType, ComponentSchemaFieldCreate } from '../../types/schema';
import { ComponentSchemaField } from '../../services/api';

// Field type configurations with smart defaults
export interface QuickFieldConfig {
  type: SchemaFieldType;
  name: string;
  icon: React.ReactElement;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';
  description: string;
  defaultName: string;
  smartDefaults: Partial<ComponentSchemaFieldCreate>;
  usageWeight: number; // Higher = more commonly used
}

const QUICK_FIELD_CONFIGS: Record<SchemaFieldType, QuickFieldConfig> = {
  text: {
    type: 'text',
    name: 'Text',
    icon: <TextIcon />,
    color: 'primary',
    description: 'Single line text input',
    defaultName: 'Text Field',
    smartDefaults: {
      field_config: {
        max_length: 100,
        placeholder: 'Enter text...',
      },
      is_required: false,
    },
    usageWeight: 10,
  },
  number: {
    type: 'number',
    name: 'Number',
    icon: <NumberIcon />,
    color: 'info',
    description: 'Numeric input with validation',
    defaultName: 'Number Field',
    smartDefaults: {
      field_config: {
        min_value: null,
        max_value: null,
        decimal_places: 2,
        unit: '',
      },
      is_required: false,
    },
    usageWeight: 9,
  },
  select: {
    type: 'select',
    name: 'Select',
    icon: <SelectIcon />,
    color: 'secondary',
    description: 'Dropdown selection from options',
    defaultName: 'Select Field',
    smartDefaults: {
      field_config: {
        options: ['Option 1', 'Option 2', 'Option 3'],
        allow_multiple: false,
      },
      is_required: false,
    },
    usageWeight: 8,
  },
  checkbox: {
    type: 'checkbox',
    name: 'Checkbox',
    icon: <CheckboxIcon />,
    color: 'success',
    description: 'True/false or yes/no selection',
    defaultName: 'Checkbox Field',
    smartDefaults: {
      field_config: {
        default_value: false,
      },
      is_required: false,
    },
    usageWeight: 6,
  },
  textarea: {
    type: 'textarea',
    name: 'Text Area',
    icon: <TextAreaIcon />,
    color: 'warning',
    description: 'Multi-line text input',
    defaultName: 'Text Area Field',
    smartDefaults: {
      field_config: {
        rows: 4,
        max_length: 500,
        placeholder: 'Enter detailed text...',
      },
      is_required: false,
    },
    usageWeight: 5,
  },
  date: {
    type: 'date',
    name: 'Date',
    icon: <DateIcon />,
    color: 'error',
    description: 'Date picker input',
    defaultName: 'Date Field',
    smartDefaults: {
      field_config: {
        format: 'YYYY-MM-DD',
        include_time: false,
      },
      is_required: false,
    },
    usageWeight: 4,
  },
};

// Common engineering field suggestions based on naming patterns
const ENGINEERING_SUGGESTIONS = [
  { pattern: /name|title|label/i, suggestions: ['text'] },
  { pattern: /weight|mass|load|force/i, suggestions: ['number'] },
  { pattern: /dimension|length|width|height|depth/i, suggestions: ['number'] },
  { pattern: /material|grade|type|class/i, suggestions: ['select'] },
  { pattern: /date|time|created|updated/i, suggestions: ['date'] },
  { pattern: /active|enabled|visible|valid/i, suggestions: ['checkbox'] },
  { pattern: /description|notes|comments|details/i, suggestions: ['textarea'] },
  { pattern: /status|state|condition/i, suggestions: ['select'] },
];

interface QuickAddFieldButtonsProps {
  existingFields: ComponentSchemaField[];
  onQuickAdd: (fieldData: ComponentSchemaFieldCreate) => void;
  disabled?: boolean;
  maxFields?: number;
  currentFieldCount?: number;
  compact?: boolean;
}

interface FieldUsageStats {
  [key: string]: {
    count: number;
    lastUsed: Date;
    contextualScore: number;
  };
}

export const QuickAddFieldButtons: React.FC<QuickAddFieldButtonsProps> = ({
  existingFields,
  onQuickAdd,
  disabled = false,
  maxFields,
  currentFieldCount = 0,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(!compact);
  const [usageStats, setUsageStats] = useState<FieldUsageStats>({});
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedType, setSelectedType] = useState<SchemaFieldType | null>(null);

  // Calculate contextual suggestions based on existing fields
  const contextualSuggestions = useMemo(() => {
    const fieldNames = existingFields.map(f => f.field_name.toLowerCase());
    const fieldTypes = existingFields.map(f => f.field_type);

    const suggestions: SchemaFieldType[] = [];

    // Analyze existing field names for patterns
    fieldNames.forEach(name => {
      ENGINEERING_SUGGESTIONS.forEach(({ pattern, suggestions: types }) => {
        if (pattern.test(name)) {
          types.forEach(type => {
            if (!suggestions.includes(type as SchemaFieldType)) {
              suggestions.push(type as SchemaFieldType);
            }
          });
        }
      });
    });

    // Suggest missing common field types
    const missingTypes = Object.keys(QUICK_FIELD_CONFIGS).filter(
      type => !fieldTypes.includes(type as SchemaFieldType)
    ) as SchemaFieldType[];

    // Combine and prioritize
    const combined = [...new Set([...suggestions, ...missingTypes])];

    return combined.slice(0, 3); // Top 3 suggestions
  }, [existingFields]);

  // Sort field types by usage and priority
  const sortedFieldTypes = useMemo(() => {
    const types = Object.values(QUICK_FIELD_CONFIGS);

    return types.sort((a, b) => {
      const aStats = usageStats[a.type];
      const bStats = usageStats[b.type];

      // Recently used types get priority
      if (aStats && bStats) {
        const timeDiff = bStats.lastUsed.getTime() - aStats.lastUsed.getTime();
        if (Math.abs(timeDiff) < 86400000) { // Within 24 hours
          return bStats.count - aStats.count;
        }
      }

      // Then by contextual relevance
      const aContextual = contextualSuggestions.includes(a.type) ? 10 : 0;
      const bContextual = contextualSuggestions.includes(b.type) ? 10 : 0;

      if (aContextual !== bContextual) {
        return bContextual - aContextual;
      }

      // Finally by default usage weight
      return b.usageWeight - a.usageWeight;
    });
  }, [usageStats, contextualSuggestions]);

  const handleQuickAdd = useCallback((fieldType: SchemaFieldType) => {
    const config = QUICK_FIELD_CONFIGS[fieldType];
    const existingNames = existingFields.map(f => f.field_name);

    // Generate unique field name
    let fieldName = config.defaultName;
    let counter = 1;
    while (existingNames.includes(fieldName)) {
      fieldName = `${config.defaultName} ${counter}`;
      counter++;
    }

    const fieldData: ComponentSchemaFieldCreate = {
      field_name: fieldName,
      field_type: fieldType,
      display_order: currentFieldCount + 1,
      ...config.smartDefaults,
    };

    // Update usage statistics
    setUsageStats(prev => ({
      ...prev,
      [fieldType]: {
        count: (prev[fieldType]?.count || 0) + 1,
        lastUsed: new Date(),
        contextualScore: contextualSuggestions.includes(fieldType) ? 1 : 0,
      },
    }));

    onQuickAdd(fieldData);
  }, [existingFields, currentFieldCount, contextualSuggestions, onQuickAdd]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, type: SchemaFieldType) => {
    setAnchorEl(event.currentTarget);
    setSelectedType(type);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedType(null);
  };

  const handleMenuAdd = (withCustomization: boolean = false) => {
    if (selectedType) {
      if (withCustomization) {
        // TODO: Open field creation dialog with pre-filled type
        // For now, just do quick add
        handleQuickAdd(selectedType);
      } else {
        handleQuickAdd(selectedType);
      }
    }
    handleMenuClose();
  };

  const canAddFields = !maxFields || currentFieldCount < maxFields;
  const isRecentlyUsed = (type: SchemaFieldType) => {
    const stats = usageStats[type];
    if (!stats) return false;
    const dayAgo = new Date(Date.now() - 86400000);
    return stats.lastUsed > dayAgo;
  };

  if (compact && !expanded) {
    return (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5 }}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Quick Add Fields
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              {contextualSuggestions.slice(0, 2).map(type => (
                <Tooltip key={type} title={`Add ${QUICK_FIELD_CONFIGS[type].name}`}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={QUICK_FIELD_CONFIGS[type].icon}
                    onClick={() => handleQuickAdd(type)}
                    disabled={disabled || !canAddFields}
                    color={QUICK_FIELD_CONFIGS[type].color}
                  >
                    {QUICK_FIELD_CONFIGS[type].name}
                  </Button>
                </Tooltip>
              ))}
              <IconButton
                size="small"
                onClick={() => setExpanded(true)}
                disabled={disabled}
              >
                <ExpandMoreIcon />
              </IconButton>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardHeader
        title={
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">Quick Add Fields</Typography>
            {contextualSuggestions.length > 0 && (
              <Chip
                icon={<SuggestionIcon />}
                label={`${contextualSuggestions.length} suggestions`}
                size="small"
                color="info"
                variant="outlined"
              />
            )}
          </Stack>
        }
        action={
          compact ? (
            <IconButton onClick={() => setExpanded(false)} size="small">
              <ExpandLessIcon />
            </IconButton>
          ) : null
        }
      />

      <CardContent sx={{ pt: 0 }}>
        {!canAddFields && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Field limit reached ({currentFieldCount}/{maxFields}).
            Remove fields to add new ones.
          </Alert>
        )}

        {/* Contextual Suggestions */}
        {contextualSuggestions.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SuggestionIcon fontSize="small" color="primary" />
              Suggested for this schema
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {contextualSuggestions.map(type => {
                const config = QUICK_FIELD_CONFIGS[type];
                return (
                  <Button
                    key={type}
                    variant="contained"
                    size="small"
                    startIcon={config.icon}
                    onClick={() => handleQuickAdd(type)}
                    disabled={disabled || !canAddFields}
                    color={config.color}
                    sx={{ borderRadius: 2 }}
                  >
                    {config.name}
                  </Button>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* All Field Types */}
        <Typography variant="subtitle2" gutterBottom>
          All Field Types
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1 }}>
          {sortedFieldTypes.map(config => {
            const isRecent = isRecentlyUsed(config.type);
            const isSuggested = contextualSuggestions.includes(config.type);

            return (
              <ButtonGroup key={config.type} variant="outlined" size="small">
                <Button
                  startIcon={
                    <Badge
                      variant="dot"
                      color={isRecent ? 'success' : 'default'}
                      invisible={!isRecent}
                    >
                      {config.icon}
                    </Badge>
                  }
                  onClick={() => handleQuickAdd(config.type)}
                  disabled={disabled || !canAddFields}
                  color={isSuggested ? config.color : 'inherit'}
                  variant={isSuggested ? 'contained' : 'outlined'}
                  sx={{
                    minWidth: 120,
                    justifyContent: 'flex-start',
                  }}
                >
                  <Stack>
                    <Typography variant="caption" sx={{ lineHeight: 1 }}>
                      {config.name}
                    </Typography>
                    {isRecent && (
                      <Chip
                        icon={<RecentIcon />}
                        label="Recent"
                        size="small"
                        variant="outlined"
                        sx={{ height: 16, fontSize: '0.6rem' }}
                      />
                    )}
                  </Stack>
                </Button>

                <Button
                  size="small"
                  onClick={(e) => handleMenuOpen(e, config.type)}
                  disabled={disabled || !canAddFields}
                  sx={{ minWidth: 32 }}
                >
                  <ExpandMoreIcon fontSize="small" />
                </Button>
              </ButtonGroup>
            );
          })}
        </Box>

        {/* Field Type Information */}
        <Box sx={{ mt: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon fontSize="small" />
            Click any field type for quick creation with smart defaults.
            Use the dropdown arrow for customization options.
          </Typography>
        </Box>
      </CardContent>

      {/* Customization Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedType && (
          <>
            <MenuItem onClick={() => handleMenuAdd(false)}>
              <ListItemIcon>
                <AddIcon />
              </ListItemIcon>
              <ListItemText
                primary={`Add ${QUICK_FIELD_CONFIGS[selectedType].name}`}
                secondary="With smart defaults"
              />
            </MenuItem>
            <MenuItem onClick={() => handleMenuAdd(true)}>
              <ListItemIcon>
                {QUICK_FIELD_CONFIGS[selectedType].icon}
              </ListItemIcon>
              <ListItemText
                primary="Add with customization"
                secondary="Open configuration dialog"
              />
            </MenuItem>
            <Divider />
            <MenuItem disabled>
              <ListItemText
                primary={QUICK_FIELD_CONFIGS[selectedType].description}
                primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
              />
            </MenuItem>
          </>
        )}
      </Menu>
    </Card>
  );
};

export default QuickAddFieldButtons;