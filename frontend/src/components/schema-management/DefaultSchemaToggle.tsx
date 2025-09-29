/**
 * Default Schema Toggle Component
 *
 * Manages the default schema status for a project with confirmation dialogs
 * and business logic validation to ensure only one default per project.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { ComponentSchema } from '../../services/api.ts';
import { useSetDefaultSchema, useUnsetDefaultSchema } from '../../services/schemaQueries.ts';

interface DefaultSchemaToggleProps {
  schema: ComponentSchema;
  currentDefaultSchema?: ComponentSchema | null;
  projectId?: string;
  onDefaultChange?: (newDefaultSchema: ComponentSchema | null) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'icon' | 'chip' | 'button';
}

const DefaultSchemaToggle: React.FC<DefaultSchemaToggleProps> = ({
  schema,
  currentDefaultSchema,
  projectId,
  onDefaultChange,
  disabled = false,
  size = 'medium',
  variant = 'icon',
}) => {
  const [showSetDefaultDialog, setShowSetDefaultDialog] = useState(false);
  const [showUnsetDefaultDialog, setShowUnsetDefaultDialog] = useState(false);

  const isCurrentDefault = schema.is_default || currentDefaultSchema?.id === schema.id;
  const hasExistingDefault = currentDefaultSchema && currentDefaultSchema.id !== schema.id;

  // Mutations for default schema management
  const setDefaultMutation = useSetDefaultSchema({
    onSuccess: (updatedSchema) => {
      setShowSetDefaultDialog(false);
      onDefaultChange?.(updatedSchema);
    },
    onError: () => {
      // Error handling is managed by the mutation hook
    },
  });

  const unsetDefaultMutation = useUnsetDefaultSchema({
    onSuccess: () => {
      setShowUnsetDefaultDialog(false);
      onDefaultChange?.(null);
    },
    onError: () => {
      // Error handling is managed by the mutation hook
    },
  });

  const handleToggleClick = () => {
    if (isCurrentDefault) {
      setShowUnsetDefaultDialog(true);
    } else {
      setShowSetDefaultDialog(true);
    }
  };

  const handleSetDefault = () => {
    if (projectId) {
      setDefaultMutation.mutate({
        projectId,
        schemaId: schema.id,
      });
    }
  };

  const handleUnsetDefault = () => {
    if (projectId) {
      unsetDefaultMutation.mutate({
        projectId,
        schemaId: schema.id,
      });
    }
  };

  const isLoading = setDefaultMutation.isLoading || unsetDefaultMutation.isLoading;

  // Render different variants
  const renderToggle = () => {
    switch (variant) {
      case 'chip':
        return (
          <Chip
            icon={isCurrentDefault ? <StarIcon /> : <StarBorderIcon />}
            label={isCurrentDefault ? 'Default Schema' : 'Set as Default'}
            color={isCurrentDefault ? 'primary' : 'default'}
            variant={isCurrentDefault ? 'filled' : 'outlined'}
            size={size === 'large' ? 'medium' : 'small'}
            onClick={handleToggleClick}
            disabled={disabled || isLoading || !schema.is_active}
            clickable
          />
        );

      case 'button':
        return (
          <LoadingButton
            size={size}
            variant={isCurrentDefault ? 'contained' : 'outlined'}
            color={isCurrentDefault ? 'primary' : 'inherit'}
            loading={isLoading}
            disabled={disabled || !schema.is_active}
            onClick={handleToggleClick}
            startIcon={isCurrentDefault ? <StarIcon /> : <StarBorderIcon />}
          >
            {isCurrentDefault ? 'Default Schema' : 'Set as Default'}
          </LoadingButton>
        );

      case 'icon':
      default:
        return (
          <Tooltip title={isCurrentDefault ? 'Remove Default Status' : 'Set as Default Schema'}>
            <IconButton
              size={size}
              color={isCurrentDefault ? 'primary' : 'default'}
              onClick={handleToggleClick}
              disabled={disabled || isLoading || !schema.is_active}
            >
              {isCurrentDefault ? <StarIcon /> : <StarBorderIcon />}
            </IconButton>
          </Tooltip>
        );
    }
  };

  return (
    <>
      {renderToggle()}

      {/* Set Default Confirmation Dialog */}
      <Dialog
        open={showSetDefaultDialog}
        onClose={() => !isLoading && setShowSetDefaultDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <InfoIcon color="info" />
            <Typography variant="h6">
              Set Default Schema
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Set "<strong>{schema.name}</strong>" as the default schema for this project?
          </Typography>

          {hasExistingDefault && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                This will replace "<strong>{currentDefaultSchema?.name}</strong>" as the current default schema.
                The previous default schema will remain active but will no longer be automatically selected.
              </Typography>
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            The default schema is automatically selected when creating new components in this project.
          </Typography>

          {setDefaultMutation.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {setDefaultMutation.error instanceof Error
                ? setDefaultMutation.error.message
                : 'Failed to set default schema. Please try again.'}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowSetDefaultDialog(false)}
            disabled={isLoading}
            color="inherit"
          >
            Cancel
          </Button>
          <LoadingButton
            onClick={handleSetDefault}
            loading={isLoading}
            variant="contained"
            color="primary"
          >
            Set as Default
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Unset Default Confirmation Dialog */}
      <Dialog
        open={showUnsetDefaultDialog}
        onClose={() => !isLoading && setShowUnsetDefaultDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            <Typography variant="h6">
              Remove Default Status
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Remove default status from "<strong>{schema.name}</strong>"?
          </Typography>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              After removing the default status, no schema will be automatically selected when creating new components.
              Users will need to manually select a schema for each new component.
            </Typography>
          </Alert>

          {unsetDefaultMutation.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {unsetDefaultMutation.error instanceof Error
                ? unsetDefaultMutation.error.message
                : 'Failed to remove default status. Please try again.'}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowUnsetDefaultDialog(false)}
            disabled={isLoading}
            color="inherit"
          >
            Cancel
          </Button>
          <LoadingButton
            onClick={handleUnsetDefault}
            loading={isLoading}
            variant="contained"
            color="warning"
          >
            Remove Default
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DefaultSchemaToggle;