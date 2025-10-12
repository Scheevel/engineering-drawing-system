import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Tooltip,
  Alert,
  IconButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  Star as DefaultIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from 'react-query';
import { ComponentSchema, getAvailableSchemas } from '../../services/api.ts';
import { useSchemaChangeListener } from '../../hooks/schema/useSchemaChangeListener.ts';

interface TypeSelectionDropdownProps {
  componentId?: string;
  currentSchemaId?: string;
  projectId?: string;
  availableSchemas?: ComponentSchema[];
  onSchemaChange: (schemaId: string, schema: ComponentSchema) => void;
  disabled?: boolean;
}

const TypeSelectionDropdown: React.FC<TypeSelectionDropdownProps> = ({
  componentId,
  currentSchemaId,
  projectId,
  availableSchemas: propSchemas,
  onSchemaChange,
  disabled = false,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Fetch available schemas if component ID is provided and schemas not passed as props
  const { data: schemasData, refetch: refetchSchemas, isFetching } = useQuery(
    ['available-schemas', componentId],
    () => componentId ? getAvailableSchemas(componentId) : Promise.resolve(null),
    {
      enabled: !!componentId && !propSchemas,
    }
  );

  // Real-time schema change listener
  useSchemaChangeListener({
    projectId,
    onSchemaChange: async (event) => {
      setIsRefreshing(true);
      try {
        // Invalidate and refetch schemas when changes occur
        if (componentId && !propSchemas) {
          await refetchSchemas();
        }
        // If the current schema was deleted, notify parent
        if (event.type === 'schema_deleted' && event.schemaId === currentSchemaId) {
          // Parent component will handle schema switching
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    autoInvalidateCache: true,
  });

  const availableSchemas = propSchemas || schemasData?.available_schemas || [];

  const handleSchemaChange = (schemaId: string) => {
    const selectedSchema = availableSchemas.find(s => s.id === schemaId);
    if (selectedSchema) {
      onSchemaChange(schemaId, selectedSchema);
    }
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

  const selectedSchema = availableSchemas.find(s => s.id === currentSchemaId);

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <FormControl fullWidth variant="outlined" disabled={disabled || isRefreshing}>
          <InputLabel>Component Schema</InputLabel>
          <Select
            value={currentSchemaId || ''}
            onChange={(e) => handleSchemaChange(e.target.value)}
            label="Component Schema"
            displayEmpty
            endAdornment={
              (isFetching || isRefreshing) && (
                <CircularProgress size={20} sx={{ mr: 2 }} />
              )
            }
          >
            <MenuItem value="">
              <em>No schema selected</em>
            </MenuItem>
            {availableSchemas.map(renderSchemaOption)}
          </Select>
        </FormControl>

        {/* Manual refresh button */}
        {componentId && !propSchemas && (
          <Tooltip title="Refresh available schemas">
            <IconButton
              onClick={() => {
                setIsRefreshing(true);
                refetchSchemas().finally(() => setIsRefreshing(false));
              }}
              disabled={disabled || isFetching || isRefreshing}
              size="small"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Real-time update indicator */}
      {(isFetching || isRefreshing) && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <CircularProgress size={16} />
            <Typography variant="body2">
              {isRefreshing ? 'Refreshing schemas...' : 'Loading schemas...'}
            </Typography>
          </Box>
        </Alert>
      )}

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
    </Box>
  );
};

export default TypeSelectionDropdown;