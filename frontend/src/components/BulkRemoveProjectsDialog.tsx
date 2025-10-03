import React, { useState, useMemo } from 'react';
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
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { Folder as FolderIcon, Warning as WarningIcon } from '@mui/icons-material';
import { useMutation, useQueryClient } from 'react-query';
import {
  bulkRemoveDrawingsFromProjects,
  type Drawing,
  type ProjectSummary,
} from '../services/api.ts';

interface BulkRemoveProjectsDialogProps {
  open: boolean;
  onClose: () => void;
  drawingIds: string[];
  drawings: Drawing[];
}

const BulkRemoveProjectsDialog: React.FC<BulkRemoveProjectsDialogProps> = ({
  open,
  onClose,
  drawingIds,
  drawings,
}) => {
  const queryClient = useQueryClient();
  const [selectedProjects, setSelectedProjects] = useState<ProjectSummary[]>([]);

  // Find common projects across all selected drawings
  const commonProjects = useMemo(() => {
    if (drawingIds.length === 0) return [];

    const selectedDrawings = drawings.filter(d => drawingIds.includes(d.id));
    if (selectedDrawings.length === 0) return [];

    // Start with projects from the first drawing
    const firstDrawingProjects = selectedDrawings[0].projects || [];

    // Filter to only projects that appear in ALL selected drawings
    return firstDrawingProjects.filter(project =>
      selectedDrawings.every(drawing =>
        (drawing.projects || []).some(p => p.id === project.id)
      )
    );
  }, [drawingIds, drawings]);

  // Bulk remove mutation
  const removeMutation = useMutation(
    () => bulkRemoveDrawingsFromProjects({
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
    removeMutation.reset();
    onClose();
  };

  const handleSubmit = () => {
    if (selectedProjects.length > 0) {
      removeMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Bulk Remove from Projects
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Remove {drawingIds.length} drawing{drawingIds.length !== 1 ? 's' : ''} from projects
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {commonProjects.length === 0 ? (
            <Alert severity="warning" icon={<WarningIcon />}>
              <Typography variant="body2">
                No common projects found across all selected drawings.
              </Typography>
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                Selected drawings must share at least one project to use bulk removal.
              </Typography>
            </Alert>
          ) : (
            <>
              <Autocomplete
                multiple
                options={commonProjects}
                getOptionLabel={(option) => option.name}
                value={selectedProjects}
                onChange={(event, newValue) => setSelectedProjects(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Projects to Remove"
                    placeholder={selectedProjects.length === 0 ? "Choose one or more projects" : ""}
                    helperText={`${commonProjects.length} common project${commonProjects.length !== 1 ? 's' : ''} found`}
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option.name}
                      {...getTagProps({ index })}
                      color="error"
                      size="small"
                      icon={<FolderIcon />}
                    />
                  ))
                }
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <FolderIcon sx={{ mr: 1, color: 'primary.main' }} />
                    {option.name}
                  </Box>
                )}
                disabled={removeMutation.isLoading}
              />

              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Warning:</strong> This will remove the selected project associations from all {drawingIds.length} drawings.
                </Typography>
              </Alert>
            </>
          )}

          {removeMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to remove projects. Please try again.
            </Alert>
          )}

          {removeMutation.isSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Successfully removed {selectedProjects.length} project{selectedProjects.length !== 1 ? 's' : ''} from {drawingIds.length} drawing{drawingIds.length !== 1 ? 's' : ''}!
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={removeMutation.isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="error"
          disabled={selectedProjects.length === 0 || removeMutation.isLoading || commonProjects.length === 0}
          startIcon={removeMutation.isLoading ? <CircularProgress size={16} /> : undefined}
        >
          {removeMutation.isLoading
            ? 'Removing...'
            : `Remove from ${selectedProjects.length} Project${selectedProjects.length !== 1 ? 's' : ''}`
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkRemoveProjectsDialog;
