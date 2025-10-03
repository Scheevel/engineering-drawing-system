import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Autocomplete,
  TextField,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Typography,
} from '@mui/material';
import { Folder as FolderIcon } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  bulkAssignDrawingsToProjects,
  getProjects,
  type ProjectResponse,
} from '../services/api.ts';

interface BulkAssignProjectsDialogProps {
  open: boolean;
  onClose: () => void;
  drawingIds: string[];
  drawingNames: string[];
}

const BulkAssignProjectsDialog: React.FC<BulkAssignProjectsDialogProps> = ({
  open,
  onClose,
  drawingIds,
  drawingNames,
}) => {
  const queryClient = useQueryClient();
  const [selectedProjects, setSelectedProjects] = useState<ProjectResponse[]>([]);

  // Fetch all projects
  const { data: projects = [], isLoading: loadingProjects } = useQuery<ProjectResponse[]>(
    'projects',
    getProjects,
    {
      enabled: open,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Bulk assign mutation
  const assignMutation = useMutation(
    () => bulkAssignDrawingsToProjects({
      drawing_ids: drawingIds,
      project_ids: selectedProjects.map(p => p.id),
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('drawings');
        queryClient.invalidateQueries('projects');
        handleClose();
      },
    }
  );

  const handleClose = () => {
    setSelectedProjects([]);
    assignMutation.reset();
    onClose();
  };

  const handleSubmit = () => {
    if (selectedProjects.length > 0) {
      assignMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Bulk Assign to Projects
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Assign {drawingIds.length} drawing{drawingIds.length !== 1 ? 's' : ''} to projects
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Autocomplete
            multiple
            options={projects}
            getOptionLabel={(option) => option.name}
            value={selectedProjects}
            onChange={(event, newValue) => setSelectedProjects(newValue)}
            loading={loadingProjects}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Projects"
                placeholder={selectedProjects.length === 0 ? "Choose one or more projects" : ""}
                helperText="Selected drawings will be assigned to these projects"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingProjects ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option.name}
                  {...getTagProps({ index })}
                  color="primary"
                  size="small"
                  icon={<FolderIcon />}
                />
              ))
            }
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <FolderIcon sx={{ mr: 1, color: 'primary.main' }} />
                {option.name}
                {option.drawing_count !== undefined && (
                  <Chip size="small" label={`${option.drawing_count} drawings`} sx={{ ml: 'auto' }} />
                )}
              </Box>
            )}
            disabled={loadingProjects || assignMutation.isLoading}
          />

          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>Note:</strong> This operation will add the selected projects to all {drawingIds.length} drawings.
            Existing project associations will be preserved.
          </Alert>

          {assignMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to assign projects. Please try again.
            </Alert>
          )}

          {assignMutation.isSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Successfully assigned {selectedProjects.length} project{selectedProjects.length !== 1 ? 's' : ''} to {drawingIds.length} drawing{drawingIds.length !== 1 ? 's' : ''}!
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={assignMutation.isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={selectedProjects.length === 0 || assignMutation.isLoading}
          startIcon={assignMutation.isLoading ? <CircularProgress size={16} /> : undefined}
        >
          {assignMutation.isLoading
            ? 'Assigning...'
            : `Assign to ${selectedProjects.length} Project${selectedProjects.length !== 1 ? 's' : ''}`
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkAssignProjectsDialog;
