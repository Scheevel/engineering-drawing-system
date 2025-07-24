import React from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useQuery } from 'react-query';
import { getComponentHistory } from '../../services/api.ts';

interface ComponentHistoryProps {
  componentId: string;
}

const ComponentHistory: React.FC<ComponentHistoryProps> = ({ componentId }) => {
  const { data: history, isLoading, error } = useQuery(
    ['component-history', componentId],
    () => getComponentHistory(componentId),
    { enabled: !!componentId }
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load component history.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Change History
      </Typography>

      {!history || history.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No change history available for this component.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Changes will appear here once the component is modified.
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <List>
            {history.map((change, index) => (
              <ListItem key={index} divider={index < history.length - 1}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1">
                        {change.action || 'Component updated'}
                      </Typography>
                      <Chip
                        label={change.action || 'update'}
                        size="small"
                        color={
                          change.action === 'created' ? 'success' :
                          change.action === 'deleted' ? 'error' : 'default'
                        }
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {change.timestamp ? new Date(change.timestamp).toLocaleString() : 'Unknown time'}
                      </Typography>
                      {change.field_name && (
                        <Typography variant="body2" color="text.secondary">
                          Field: {change.field_name}
                          {change.old_value && change.new_value && (
                            <>
                              <br />
                              Changed from "{change.old_value}" to "{change.new_value}"
                            </>
                          )}
                        </Typography>
                      )}
                      {change.changed_by && (
                        <Typography variant="body2" color="text.secondary">
                          By: {change.changed_by}
                        </Typography>
                      )}
                      {change.change_reason && (
                        <Typography variant="body2" color="text.secondary">
                          Reason: {change.change_reason}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default ComponentHistory;