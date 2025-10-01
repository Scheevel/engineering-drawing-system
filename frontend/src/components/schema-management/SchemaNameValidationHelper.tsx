/**
 * Schema Name Validation Helper Component
 *
 * Displays validation rules, real-time feedback, and visual indicators
 * for schema name input. Implements FR-1 acceptance criteria (AC 1-5).
 */

import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

export interface ValidationRule {
  id: string;
  label: string;
  isValid: boolean | null; // null = not yet validated
  errorMessage?: string;
}

export interface SchemaNameValidationHelperProps {
  /** Current schema name value */
  name: string;
  /** Overall validation error message */
  error?: string | null;
  /** Whether validation is currently running */
  isValidating?: boolean;
  /** Show validation rules list */
  showRules?: boolean;
  /** Compact mode - hide rule details */
  compact?: boolean;
}

/**
 * Validates individual rules for schema name
 */
const validateRules = (name: string): ValidationRule[] => {
  const trimmed = name.trim();

  return [
    {
      id: 'length-min',
      label: 'Minimum 3 characters',
      isValid: name.length === 0 ? null : name.length >= 3,
    },
    {
      id: 'length-max',
      label: 'Maximum 100 characters',
      isValid: name.length === 0 ? null : name.length <= 100,
    },
    {
      id: 'start-char',
      label: 'Must start with letter or number',
      isValid: name.length === 0 ? null : /^[a-zA-Z0-9]/.test(name),
    },
    {
      id: 'allowed-chars',
      label: 'Only letters, numbers, hyphens (-), underscores (_)',
      isValid: name.length === 0 ? null : /^[a-zA-Z0-9_-]*$/.test(name),
      errorMessage: name.includes(' ')
        ? 'Schema name cannot contain spaces. Use hyphens (-) or underscores (_) instead'
        : undefined,
    },
    {
      id: 'no-spaces',
      label: 'No leading or trailing spaces',
      isValid: name.length === 0 ? null : name === trimmed,
    },
  ];
};

const SchemaNameValidationHelper: React.FC<SchemaNameValidationHelperProps> = ({
  name,
  error,
  isValidating = false,
  showRules = true,
  compact = false,
}) => {
  const rules = validateRules(name);
  const allValid = rules.every(rule => rule.isValid === true);
  const hasError = error && error.length > 0;

  // Overall status indicator
  const getStatusIcon = () => {
    if (isValidating) {
      return <InfoIcon color="action" fontSize="small" />;
    }
    if (hasError || (name.length > 0 && !allValid)) {
      return <ErrorIcon color="error" fontSize="small" />;
    }
    if (name.length > 0 && allValid) {
      return <CheckIcon color="success" fontSize="small" />;
    }
    return null;
  };

  const getStatusColor = () => {
    if (hasError || (name.length > 0 && !allValid)) return 'error';
    if (name.length > 0 && allValid) return 'success';
    return 'default';
  };

  if (compact) {
    return (
      <Box display="flex" alignItems="center" gap={1} mt={0.5}>
        {getStatusIcon()}
        <Typography variant="caption" color={getStatusColor()}>
          {hasError ? error : allValid && name.length > 0 ? 'Valid schema name' : 'Enter schema name'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Character Counter and Status */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Box display="flex" alignItems="center" gap={1}>
          {getStatusIcon()}
          <Typography variant="caption" color={getStatusColor()}>
            {isValidating ? 'Checking...' : hasError ? error : allValid && name.length > 0 ? 'Valid' : ''}
          </Typography>
        </Box>
        <Chip
          label={`${name.length}/100`}
          size="small"
          color={name.length > 100 ? 'error' : name.length >= 3 ? 'success' : 'default'}
          variant="outlined"
        />
      </Box>

      {/* Validation Rules List */}
      {showRules && (
        <Box mt={1} p={1.5} bgcolor="grey.50" borderRadius={1}>
          <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={1}>
            Schema Name Requirements:
          </Typography>
          <List dense disablePadding>
            {rules.map((rule) => (
              <ListItem key={rule.id} disablePadding sx={{ py: 0.25 }}>
                <ListItemIcon sx={{ minWidth: 28 }}>
                  {rule.isValid === true && (
                    <CheckIcon color="success" sx={{ fontSize: 16 }} />
                  )}
                  {rule.isValid === false && (
                    <ErrorIcon color="error" sx={{ fontSize: 16 }} />
                  )}
                  {rule.isValid === null && (
                    <InfoIcon color="action" sx={{ fontSize: 16 }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={rule.label}
                  primaryTypographyProps={{
                    variant: 'caption',
                    color: rule.isValid === false ? 'error' : 'text.secondary',
                  }}
                />
              </ListItem>
            ))}
          </List>
          {hasError && (
            <Typography variant="caption" color="error" display="block" mt={1}>
              {error}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default SchemaNameValidationHelper;
