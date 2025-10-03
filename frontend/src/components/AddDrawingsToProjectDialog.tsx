import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import { Folder as FolderIcon, Description as DrawingIcon } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  listDrawings,
  assignDrawingToProjects,
  type Drawing,
} from '../services/api.ts';
import { useSnackbar } from '../contexts/SnackbarContext.tsx';

interface AddDrawingsToProjectDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

const AddDrawingsToProjectDialog: React.FC<AddDrawingsToProjectDialogProps> = ({
  open,
  onClose,
  projectId,
  projectName,
}) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();
  const [selectedDrawings, setSelectedDrawings] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [unassignedOnly, setUnassignedOnly] = useState(false);

  // Fetch all drawings
  const { data: drawingsData, isLoading } = useQuery(
    ['all-drawings-for-assignment'],
    () => listDrawings({ limit: 1000 }), // Get all drawings
    {
      enabled: open,
      staleTime: 1 * 60 * 1000,
    }
  );

  const allDrawings = drawingsData?.items || [];

  // Filter drawings based on search and unassigned toggle
  const filteredDrawings = useMemo(() => {
    let result = allDrawings;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.file_name.toLowerCase().includes(query) ||
          (d.original_name && d.original_name.toLowerCase().includes(query))
      );
    }

    // Filter by unassigned only
    if (unassignedOnly) {
      result = result.filter((d) => !d.projects || d.projects.length === 0);
    }

    return result;
  }, [allDrawings, searchQuery, unassignedOnly]);

  // Add drawings mutation
  const addMutation = useMutation(
    async () => {
      // Assign each selected drawing to this project
      await Promise.all(
        selectedDrawings.map((drawingId) =>
          assignDrawingToProjects(drawingId, [projectId])
        )
      );
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['project-drawings', projectId]);
        queryClient.invalidateQueries(['project', projectId]);
        queryClient.invalidateQueries('drawings');
        const count = selectedDrawings.length;
        showSuccess(`Added ${count} drawing${count !== 1 ? 's' : ''} to ${projectName}`);
        handleClose();
      },
      onError: (error: any) => {
        showError(error?.message || 'Failed to add drawings to project');
      },
    }
  );

  const handleClose = () => {
    setSelectedDrawings([]);
    setSearchQuery('');
    setUnassignedOnly(false);
    addMutation.reset();
    onClose();
  };

  const handleSubmit = () => {
    if (selectedDrawings.length > 0) {
      addMutation.mutate();
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDrawings(filteredDrawings.map((d) => d.id));
    } else {
      setSelectedDrawings([]);
    }
  };

  const handleSelectDrawing = (drawingId: string, checked: boolean) => {
    if (checked) {
      setSelectedDrawings((prev) => [...prev, drawingId]);
    } else {
      setSelectedDrawings((prev) => prev.filter((id) => id !== drawingId));
    }
  };

  const isDrawingInProject = (drawing: Drawing) => {
    return drawing.projects?.some((p) => p.id === projectId) || false;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Add Drawings to Project
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {projectName}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          {/* Search and Filter Controls */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search drawings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={unassignedOnly}
                  onChange={(e) => setUnassignedOnly(e.target.checked)}
                  color="warning"
                />
              }
              label="Unassigned Only"
            />
          </Box>

          {/* Selection Summary */}
          {selectedDrawings.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {selectedDrawings.length} drawing{selectedDrawings.length !== 1 ? 's' : ''} selected
            </Alert>
          )}

          {/* Drawings Table */}
          {isLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : filteredDrawings.length === 0 ? (
            <Alert severity="info">
              {searchQuery || unassignedOnly
                ? 'No drawings match your search criteria'
                : 'No drawings available'}
            </Alert>
          ) : (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={
                          selectedDrawings.length > 0 &&
                          selectedDrawings.length < filteredDrawings.length
                        }
                        checked={
                          filteredDrawings.length > 0 &&
                          selectedDrawings.length === filteredDrawings.length
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>File Name</TableCell>
                    <TableCell>Current Projects</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDrawings.map((drawing) => {
                    const alreadyInProject = isDrawingInProject(drawing);
                    return (
                      <TableRow
                        key={drawing.id}
                        hover
                        sx={{
                          backgroundColor: alreadyInProject
                            ? 'action.hover'
                            : 'inherit',
                        }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedDrawings.includes(drawing.id)}
                            onChange={(e) =>
                              handleSelectDrawing(drawing.id, e.target.checked)
                            }
                            disabled={alreadyInProject}
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <DrawingIcon fontSize="small" color="primary" />
                            <Typography variant="body2">
                              {drawing.original_name || drawing.file_name}
                            </Typography>
                            {alreadyInProject && (
                              <Chip
                                label="Already in project"
                                size="small"
                                color="success"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {drawing.projects && drawing.projects.length > 0 ? (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {drawing.projects.map((project) => (
                                <Chip
                                  key={project.id}
                                  label={project.name}
                                  size="small"
                                  icon={<FolderIcon />}
                                  color={
                                    project.id === projectId
                                      ? 'success'
                                      : 'default'
                                  }
                                />
                              ))}
                            </Box>
                          ) : (
                            <Chip label="Unassigned" size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={drawing.processing_status}
                            size="small"
                            color={
                              drawing.processing_status === 'completed'
                                ? 'success'
                                : 'default'
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {addMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to add drawings. Please try again.
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={addMutation.isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={selectedDrawings.length === 0 || addMutation.isLoading}
          startIcon={addMutation.isLoading ? <CircularProgress size={16} /> : undefined}
        >
          {addMutation.isLoading
            ? 'Adding...'
            : `Add ${selectedDrawings.length} Drawing${selectedDrawings.length !== 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddDrawingsToProjectDialog;
