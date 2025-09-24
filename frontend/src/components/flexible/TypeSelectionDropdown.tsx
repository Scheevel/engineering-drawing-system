import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Chip,
  Tooltip,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Star as DefaultIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { ComponentSchema, TypeLockStatus, getAvailableSchemas, unlockComponentType } from '../../services/api.ts';

interface TypeSelectionDropdownProps {
  componentId?: string;
  currentSchemaId?: string;
  projectId?: string;
  availableSchemas?: ComponentSchema[];
  lockStatus?: TypeLockStatus;
  onSchemaChange: (schemaId: string, schema: ComponentSchema) => void;
  onUnlock?: (componentId: string) => void;
  disabled?: boolean;
  showLockDetails?: boolean;
}

interface UnlockDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  lockStatus: TypeLockStatus;
  componentId: string;
}

const UnlockDialog: React.FC<UnlockDialogProps> = ({
  open,
  onClose,
  onConfirm,
  lockStatus,
  componentId
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            <Typography variant="h6">Unlock Component Type</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            This component is currently type-locked because it contains data.
            Unlocking will clear all dynamic field data to allow schema changes.
          </Typography>
        </Alert>

        <Typography variant="subtitle2" gutterBottom>
          Lock Reason:
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {lockStatus.lock_reason}
        </Typography>

        {lockStatus.locked_fields.length > 0 && (
          <>
            <Typography variant="subtitle2" gutterBottom>
              Fields with Data ({lockStatus.locked_fields.length}):
            </Typography>
            <Box sx={{ mb: 2 }}>
              {lockStatus.locked_fields.map((field) => (
                <Chip
                  key={field}
                  label={formatFieldName(field)}
                  size="small"
                  variant="outlined"
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          </>
        )}

        <Alert severity="error" variant="outlined">
          <Typography variant="body2">
            <strong>Warning:</strong> This action cannot be undone. All data in the above fields will be permanently lost.
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} color="warning" variant="contained">
          Clear Data & Unlock
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const TypeSelectionDropdown: React.FC<TypeSelectionDropdownProps> = ({
  componentId,
  currentSchemaId,
  projectId,
  availableSchemas: propSchemas,
  lockStatus: propLockStatus,
  onSchemaChange,
  onUnlock,
  disabled = false,
  showLockDetails = true,
}) => {
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);

  // Fetch available schemas if component ID is provided and schemas not passed as props
  const { data: schemasData } = useQuery(
    ['available-schemas', componentId],
    () => componentId ? getAvailableSchemas(componentId) : Promise.resolve(null),
    {
      enabled: !!componentId && !propSchemas,
    }
  );

  const availableSchemas = propSchemas || schemasData?.available_schemas || [];
  const lockStatus = propLockStatus || {
    is_locked: schemasData?.is_type_locked || false,
    lock_reason: schemasData?.lock_reason,
    locked_fields: [],
    can_unlock: true,
  };
  const isLocked = lockStatus.is_locked;

  const handleSchemaChange = (schemaId: string) => {
    if (isLocked && schemaId !== currentSchemaId) {
      // Show unlock dialog if trying to change schema on locked component
      setUnlockDialogOpen(true);
      return;
    }

    const selectedSchema = availableSchemas.find(s => s.id === schemaId);
    if (selectedSchema) {
      onSchemaChange(schemaId, selectedSchema);
    }
  };

  const handleUnlock = async () => {
    if (componentId && onUnlock) {
      await onUnlock(componentId);
    }
    setUnlockDialogOpen(false);
  };

  const renderSchemaOption = (schema: any) => (
    <MenuItem key={schema.id} value={schema.id}>
      <ListItemIcon>
        {schema.is_default && <DefaultIcon color="primary" fontSize="small" />}
      </ListItemIcon>
      <ListItemText
        primary={schema.name}
        secondary={
          <Box component="span">
            {schema.description && (
              <Typography component="span" variant="caption" display="block">
                {schema.description}
              </Typography>
            )}
            <Typography component="span" variant="caption" color="text.secondary">
              {schema.field_count} field{schema.field_count !== 1 ? 's' : ''}
            </Typography>
          </Box>
        }
      />
    </MenuItem>
  );

  const renderLockStatus = () => {
    if (!showLockDetails) return null;

    return (
      <Box sx={{ mt: 1 }}>
        {isLocked ? (
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title={lockStatus.lock_reason || 'Component is type-locked'}>
              <Chip
                icon={<LockIcon />}
                label="Type Locked"
                color="warning"
                variant="outlined"
                size="small"
              />
            </Tooltip>
            {lockStatus.can_unlock && onUnlock && (
              <Tooltip title="Clear component data to enable schema changes">
                <Button
                  size="small"
                  startIcon={<UnlockIcon />}
                  onClick={() => setUnlockDialogOpen(true)}
                  disabled={disabled}
                >
                  Unlock
                </Button>
              </Tooltip>
            )}
          </Box>
        ) : (
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              icon={<UnlockIcon />}
              label="Unlocked"
              color="success"
              variant="outlined"
              size="small"
            />
            <Typography variant="caption" color="text.secondary">
              Schema can be changed
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  const selectedSchema = availableSchemas.find(s => s.id === currentSchemaId);

  return (
    <Box>
      <FormControl fullWidth variant="outlined" disabled={disabled}>
        <InputLabel>Component Schema</InputLabel>
        <Select
          value={currentSchemaId || ''}
          onChange={(e) => handleSchemaChange(e.target.value)}
          label="Component Schema"
          displayEmpty
        >
          <MenuItem value="">
            <em>No schema selected</em>
          </MenuItem>
          {availableSchemas.map(renderSchemaOption)}
        </Select>
      </FormControl>

      {selectedSchema && (
        <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
            Current Schema: <strong>{selectedSchema.name}</strong>
          </Typography>
          {selectedSchema.description && (
            <Typography variant="caption" color="text.secondary">
              {selectedSchema.description}
            </Typography>
          )}
        </Box>
      )}

      {renderLockStatus()}

      {isLocked && (
        <Alert
          severity="info"
          sx={{ mt: 2 }}
          icon={<InfoIcon />}
          action={
            lockStatus.can_unlock && onUnlock && (
              <Button
                color="inherit"
                size="small"
                onClick={() => setUnlockDialogOpen(true)}
              >
                Unlock
              </Button>
            )
          }
        >
          <Typography variant="body2">
            Component type is locked because it contains data in{' '}
            <strong>{lockStatus.locked_fields.length}</strong> field
            {lockStatus.locked_fields.length !== 1 ? 's' : ''}.
            Clear data to change schema.
          </Typography>
        </Alert>
      )}

      {componentId && (
        <UnlockDialog
          open={unlockDialogOpen}
          onClose={() => setUnlockDialogOpen(false)}
          onConfirm={handleUnlock}
          lockStatus={lockStatus}
          componentId={componentId}
        />
      )}
    </Box>
  );
};

// Helper function to format field names
function formatFieldName(fieldName: string): string {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default TypeSelectionDropdown;