/**
 * Schema Management Card Component
 *
 * Simplified version for displaying schema information in card format.
 * Shows basic schema details and provides view/edit actions.
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  IconButton,
  Box,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Schema as SchemaIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
} from '@mui/icons-material';
import { ComponentSchema } from '../../services/api';

// Temporary interface until we create the full types file
interface SchemaUsageStats {
  component_count: number;
  last_used?: string;
  total_usage?: number;
}

interface SchemaManagementCardProps {
  schema: ComponentSchema;
  usageStats?: SchemaUsageStats;
  onEdit?: (schema: ComponentSchema) => void;
  onView?: (schema: ComponentSchema) => void;
  onDelete?: (schema: ComponentSchema) => void;
  onDuplicate?: (schema: ComponentSchema) => void;
  compact?: boolean;
}

const SchemaManagementCard: React.FC<SchemaManagementCardProps> = ({
  schema,
  usageStats,
  onEdit,
  onView,
  onDelete,
  onDuplicate,
  compact = false,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // FR-6 AC 29: Prevent editing default schemas
    if (onEdit && schema.is_active && !schema.is_default) {
      onEdit(schema);
    }
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onView) {
      onView(schema);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // FR-6 AC 30: Prevent deleting default schemas
    if (onDelete && !schema.is_default) {
      onDelete(schema);
    }
  };

  const handleDuplicateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDuplicate) {
      onDuplicate(schema);
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-2px)',
        },
        ...(compact && {
          minHeight: 120,
        }),
      }}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* Header with name and status */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box display="flex" alignItems="center" gap={1} flex={1}>
            <SchemaIcon color="primary" fontSize="small" />
            <Typography
              variant={compact ? "body1" : "h6"}
              component="h3"
              fontWeight={500}
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {schema.name}
            </Typography>
          </Box>
          <Chip
            label={schema.is_active ? 'Active' : 'Inactive'}
            size="small"
            color={schema.is_active ? 'success' : 'default'}
            variant="outlined"
          />
        </Box>

        {/* Default schema indicator (FR-6 AC 28) */}
        {schema.is_default && (
          <Box mb={1}>
            <Chip
              label="System Default"
              size="small"
              color="primary"
              variant="filled"
            />
          </Box>
        )}

        {/* Description */}
        {schema.description && !compact && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {schema.description}
          </Typography>
        )}

        {/* Schema details */}
        <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Fields
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {schema.fields.length}
            </Typography>
          </Box>

          {usageStats && (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Components
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {usageStats.component_count || 0}
              </Typography>
            </Box>
          )}

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Version
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              v{schema.version}
            </Typography>
          </Box>
        </Stack>

        {/* Created date */}
        <Typography variant="caption" color="text.secondary">
          Created {formatDate(schema.created_at)}
        </Typography>
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
        <Box display="flex" justifyContent="flex-end" width="100%" gap={1}>
          {onView && (
            <Tooltip title={`View schema: ${schema.name}`}>
              <IconButton
                size="small"
                onClick={handleViewClick}
                aria-label={`View schema ${schema.name}`}
              >
                <ViewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {onDuplicate && (
            <Tooltip title={schema.is_default ? "Duplicate system default schema to create editable copy" : `Duplicate schema: ${schema.name}`}>
              <IconButton
                size="small"
                onClick={handleDuplicateClick}
                aria-label={`Duplicate schema ${schema.name}`}
              >
                <DuplicateIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {onEdit && (
            <Tooltip
              title={
                !schema.is_active
                  ? 'Schema must be active to edit'
                  : schema.is_default
                  ? 'Cannot modify system default schema. Please duplicate this schema to create an editable copy.'
                  : `Edit schema: ${schema.name}`
              }
            >
              <span>
                <IconButton
                  size="small"
                  disabled={!schema.is_active || schema.is_default}
                  onClick={handleEditClick}
                  color="primary"
                  aria-label={`Edit schema ${schema.name}${!schema.is_active ? ' (disabled - schema inactive)' : schema.is_default ? ' (disabled - system default)' : ''}`}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}

          {onDelete && (
            <Tooltip
              title={
                schema.is_default
                  ? 'Cannot delete system default schema. Default schemas are protected from deletion.'
                  : `Delete schema: ${schema.name}`
              }
            >
              <span>
                <IconButton
                  size="small"
                  disabled={schema.is_default}
                  onClick={handleDeleteClick}
                  color="error"
                  aria-label={`Delete schema ${schema.name}${schema.is_default ? ' (disabled - system default)' : ''}`}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      </CardActions>
    </Card>
  );
};

export default SchemaManagementCard;