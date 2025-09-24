import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  IconButton,
  Collapse,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Help as HelpIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { ComponentSchema, ComponentSchemaField, SchemaValidationResult } from '../../services/api.ts';

interface ContextualHelpPanelProps {
  schema?: ComponentSchema;
  currentField?: string;
  validationResult?: SchemaValidationResult;
  position?: 'bottom-left' | 'bottom-right' | 'sidebar';
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
  maxWidth?: number;
  maxHeight?: number;
}

interface HelpContentProps {
  schema: ComponentSchema;
  currentField?: string;
  validationResult?: SchemaValidationResult;
}

const HelpContent: React.FC<HelpContentProps> = ({
  schema,
  currentField,
  validationResult
}) => {
  const currentFieldInfo = schema.fields.find(f => f.field_name === currentField);

  return (
    <Box>
      {/* Current Field Help */}
      {currentFieldInfo && (
        <Box mb={2}>
          <Typography variant="subtitle2" gutterBottom>
            {formatFieldName(currentFieldInfo.field_name)}
          </Typography>

          {currentFieldInfo.help_text && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {currentFieldInfo.help_text}
            </Typography>
          )}

          {/* Field Configuration */}
          <Box mt={1}>
            <Chip
              label={currentFieldInfo.field_type.toUpperCase()}
              size="small"
              variant="outlined"
              sx={{ mr: 1 }}
            />
            {currentFieldInfo.is_required && (
              <Chip
                label="Required"
                size="small"
                color="error"
                variant="outlined"
                sx={{ mr: 1 }}
              />
            )}
            {currentFieldInfo.field_config.unit && (
              <Chip
                label={`Unit: ${currentFieldInfo.field_config.unit}`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>

          {/* Field-specific help */}
          {getFieldSpecificHelp(currentFieldInfo) && (
            <Box mt={1}>
              <Typography variant="caption" component="div">
                {getFieldSpecificHelp(currentFieldInfo)}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Validation Results */}
      {validationResult && (
        <Box mb={2}>
          <Typography variant="subtitle2" gutterBottom>
            Validation Status
          </Typography>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            {validationResult.is_valid ? (
              <>
                <CheckCircleIcon color="success" fontSize="small" />
                <Typography variant="body2" color="success.main">
                  All fields are valid
                </Typography>
              </>
            ) : (
              <>
                <ErrorIcon color="error" fontSize="small" />
                <Typography variant="body2" color="error.main">
                  {validationResult.errors.length} validation error{validationResult.errors.length !== 1 ? 's' : ''}
                </Typography>
              </>
            )}
          </Box>

          {validationResult.errors.length > 0 && (
            <List dense>
              {validationResult.errors.map((error, index) => (
                <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <ErrorIcon color="error" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="caption" color="error">
                        {error}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      )}

      {/* Schema Overview */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Schema: {schema.name}
        </Typography>

        {schema.description && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {schema.description}
          </Typography>
        )}

        <Typography variant="caption" color="text.secondary">
          {schema.fields.length} field{schema.fields.length !== 1 ? 's' : ''} •
          Version {schema.version} •
          {schema.is_default && ' Default Schema •'}
          {schema.project_id ? ' Project-specific' : ' Global'}
        </Typography>
      </Box>

      {/* Quick Field Reference */}
      {schema.fields.length > 0 && (
        <Box mt={2}>
          <Typography variant="subtitle2" gutterBottom>
            Quick Reference
          </Typography>
          <List dense>
            {schema.fields
              .sort((a, b) => a.display_order - b.display_order)
              .map((field) => (
                <ListItem
                  key={field.field_name}
                  sx={{
                    py: 0.25,
                    px: 1,
                    bgcolor: field.field_name === currentField ? 'action.selected' : 'transparent',
                    borderRadius: 1,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {getFieldTypeIcon(field.field_type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        variant="caption"
                        fontWeight={field.field_name === currentField ? 'bold' : 'normal'}
                      >
                        {formatFieldName(field.field_name)}
                        {field.is_required && ' *'}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
          </List>
        </Box>
      )}
    </Box>
  );
};

const ContextualHelpPanel: React.FC<ContextualHelpPanelProps> = ({
  schema,
  currentField,
  validationResult,
  position = 'bottom-left',
  collapsed = false,
  onToggleCollapse,
  onClose,
  maxWidth = 320,
  maxHeight = 400,
}) => {
  const theme = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      zIndex: theme.zIndex.drawer - 1,
      maxWidth,
      maxHeight,
    };

    switch (position) {
      case 'bottom-left':
        return {
          ...baseStyles,
          bottom: 16,
          left: 16,
        };
      case 'bottom-right':
        return {
          ...baseStyles,
          bottom: 16,
          right: 16,
        };
      case 'sidebar':
        return {
          ...baseStyles,
          position: 'relative' as const,
          maxHeight: 'none',
        };
      default:
        return baseStyles;
    }
  };

  if (!schema) {
    return null;
  }

  return (
    <Paper
      elevation={4}
      sx={{
        ...getPositionStyles(),
        bgcolor: alpha(theme.palette.background.paper, 0.98),
        backdropFilter: 'blur(8px)',
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <HelpIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2">
            Component Help
          </Typography>
        </Box>
        <Box>
          {onToggleCollapse && (
            <IconButton size="small" onClick={handleToggleCollapse}>
              {isCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
            </IconButton>
          )}
          {onClose && (
            <IconButton size="small" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Content */}
      <Collapse in={!isCollapsed}>
        <Box
          sx={{
            p: 1.5,
            maxHeight: maxHeight - 60, // Account for header
            overflowY: 'auto',
          }}
        >
          <HelpContent
            schema={schema}
            currentField={currentField}
            validationResult={validationResult}
          />
        </Box>
      </Collapse>
    </Paper>
  );
};

// Helper functions
function formatFieldName(fieldName: string): string {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getFieldTypeIcon(fieldType: string) {
  // You can customize these icons based on field types
  switch (fieldType) {
    case 'text':
    case 'textarea':
      return <Typography variant="caption" color="text.secondary">T</Typography>;
    case 'number':
      return <Typography variant="caption" color="text.secondary">#</Typography>;
    case 'select':
      return <Typography variant="caption" color="text.secondary">▼</Typography>;
    case 'checkbox':
      return <Typography variant="caption" color="text.secondary">☑</Typography>;
    case 'date':
      return <Typography variant="caption" color="text.secondary">📅</Typography>;
    default:
      return <InfoIcon fontSize="small" color="disabled" />;
  }
}

function getFieldSpecificHelp(field: ComponentSchemaField): string | null {
  const config = field.field_config;

  switch (field.field_type) {
    case 'text':
    case 'textarea':
      const textConstraints = [];
      if (config.min_length) textConstraints.push(`Min: ${config.min_length} chars`);
      if (config.max_length) textConstraints.push(`Max: ${config.max_length} chars`);
      if (config.pattern) textConstraints.push('Must match pattern');
      return textConstraints.length > 0 ? textConstraints.join(', ') : null;

    case 'number':
      const numberConstraints = [];
      if (config.min !== undefined) numberConstraints.push(`Min: ${config.min}`);
      if (config.max !== undefined) numberConstraints.push(`Max: ${config.max}`);
      if (config.step) numberConstraints.push(`Step: ${config.step}`);
      return numberConstraints.length > 0 ? numberConstraints.join(', ') : null;

    case 'select':
      if (config.options && config.options.length > 0) {
        const optionCount = config.options.length;
        const customAllowed = config.allow_custom ? ' (custom values allowed)' : '';
        return `${optionCount} option${optionCount !== 1 ? 's' : ''} available${customAllowed}`;
      }
      return null;

    default:
      return null;
  }
}

export default ContextualHelpPanel;