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
} from '@mui/material';
import { Folder as FolderIcon } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  assignDrawingToProjects,
  getProjects,
  type ProjectResponse,
  type ProjectSummary
} from '../services/api.ts';
import { useSnackbar } from '../contexts/SnackbarContext.tsx';

interface AssignProjectsDialogProps {
  open: boolean;
  onClose: () => void;
  drawingId: string;
  drawingName?: string;
  currentProjects?: ProjectSummary[];
}

const AssignProjectsDialog: React.FC<AssignProjectsDialogProps> = ({
  open,
  onClose,
  drawingId,
  drawingName,
  currentProjects = [],
}) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();
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

  // Assign mutation
  const assignMutation = useMutation(
    () => assignDrawingToProjects(drawingId, selectedProjects.map(p => p.id)),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('drawings');
        queryClient.invalidateQueries('projects');
        const count = selectedProjects.length;
        const projectNames = selectedProjects.length <= 2
          ? selectedProjects.map(p => p.name).join(' and ')
          : `${count} projects`;
        showSuccess(`Drawing assigned to ${projectNames}`);
        handleClose();
      },
      onError: (error: any) => {
        showError(error?.message || 'Failed to assign projects. Please try again.');
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

  // Filter out projects that are already assigned
  const currentProjectIds = currentProjects.map(p => p.id);
  const availableProjects = projects.filter(p => !currentProjectIds.includes(p.id));

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Assign to Projects
        {drawingName && (
          <Box component="div" sx={{ fontSize: '0.875rem', color: 'text.secondary', mt: 0.5 }}>
            {drawingName}
          </Box>
        )}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Autocomplete
            multiple
            options={availableProjects}
            getOptionLabel={(option) => option.name}
            value={selectedProjects}
            onChange={(event, newValue) => setSelectedProjects(newValue)}
            loading={loadingProjects}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Projects"
                placeholder={selectedProjects.length === 0 ? "Choose one or more projects" : ""}
                helperText={`${availableProjects.length} projects available`}
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

          {currentProjects.length > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Currently assigned to: {currentProjects.map(p => p.name).join(', ')}
            </Alert>
          )}

          {assignMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to assign projects. Please try again.
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
          {assignMutation.isLoading ? 'Assigning...' : `Assign to ${selectedProjects.length} Project${selectedProjects.length !== 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignProjectsDialog;
