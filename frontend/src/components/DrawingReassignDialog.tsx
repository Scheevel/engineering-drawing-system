import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  TextField,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Description as FileIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Add as AddIcon,
  SwapHoriz as ReassignIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  getProjects, 
  createProject, 
  assignDrawingsToProject,
  type ProjectResponse, 
  type ProjectCreate 
} from '../services/api.ts';

interface DrawingReassignDialogProps {
  open: boolean;
  onClose: () => void;
  drawingIds: string[];
  drawingNames: string[];
}

const DrawingReassignDialog: React.FC<DrawingReassignDialogProps> = ({
  open,
  onClose,
  drawingIds,
  drawingNames,
}) => {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [reassignmentComplete, setReassignmentComplete] = useState(false);
  const [reassignmentResult, setReassignmentResult] = useState<any>(null);

  // Fetch projects for dropdown
  const { data: projects = [], isLoading: loadingProjects } = useQuery<ProjectResponse[]>(
    'projects',
    getProjects,
    {
      enabled: open,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Create project mutation
  const createProjectMutation = useMutation(createProject, {
    onSuccess: (newProject) => {
      queryClient.invalidateQueries('projects');
      setSelectedProjectId(newProject.id);
      setIsCreatingNew(false);
      setNewProjectName('');
      // Automatically reassign to the new project
      assignDrawingsMutation.mutate({
        drawingIds,
        projectId: newProject.id,
        projectName: newProject.name,
      });
    },
  });

  // Reassign drawings mutation
  const assignDrawingsMutation = useMutation(
    ({ drawingIds, projectId }: { drawingIds: string[], projectId?: string, projectName?: string }) =>
      assignDrawingsToProject(drawingIds, projectId),
    {
      onSuccess: (result, variables) => {
        queryClient.invalidateQueries('projects');
        queryClient.invalidateQueries('drawings');
        setReassignmentResult(result);
        setReassignmentComplete(true);
      },
    }
  );

  const handleProjectChange = (value: string) => {
    if (value === 'create-new') {
      setIsCreatingNew(true);
      setSelectedProjectId('');
    } else {
      setIsCreatingNew(false);
      setSelectedProjectId(value);
    }
  };

  const handleCreateNewProject = () => {
    if (newProjectName.trim()) {
      createProjectMutation.mutate({ name: newProjectName.trim() });
    }
  };

  const handleReassignDrawings = () => {
    const projectId = selectedProjectId === 'unassigned' ? undefined : selectedProjectId;
    assignDrawingsMutation.mutate({ drawingIds, projectId });
  };

  const handleClose = () => {
    setSelectedProjectId('');
    setIsCreatingNew(false);
    setNewProjectName('');
    setReassignmentComplete(false);
    setReassignmentResult(null);
    onClose();
  };

  const getProjectDisplayName = (projectId: string) => {
    if (projectId === 'unassigned') return 'Unassigned';
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  const selectedProjectName = getProjectDisplayName(selectedProjectId);

  if (reassignmentComplete) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckIcon color="success" />
            Reassignment Complete
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            Successfully reassigned {drawingIds.length} drawing{drawingIds.length > 1 ? 's' : ''} 
            {selectedProjectId === 'unassigned' 
              ? ' to unassigned status' 
              : ` to "${reassignmentResult?.project_name || selectedProjectName}"`}
          </Alert>
          
          {reassignmentResult && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Action:</strong> {reassignmentResult.action}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Updated:</strong> {reassignmentResult.updated_count} drawing(s)
              </Typography>
            </Box>
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            The drawings have been successfully reassigned and are now available in their new location.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReassignIcon />
          Reassign Drawings
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          Reassign {drawingIds.length} drawing{drawingIds.length > 1 ? 's' : ''} to a different project:
        </Typography>

        {/* Drawing List */}
        <Box sx={{ mb: 3, mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Drawings to reassign:
          </Typography>
          <List 
            dense 
            sx={{ 
              bgcolor: 'background.paper', 
              borderRadius: 1, 
              border: 1, 
              borderColor: 'divider',
              maxHeight: 200,
              overflowY: 'auto'
            }}
          >
            {drawingNames.map((name, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <FileIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary={name} 
                  secondary={`Drawing ${index + 1} of ${drawingNames.length}`}
                />
              </ListItem>
            ))}
          </List>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Project Assignment Options */}
        {isCreatingNew ? (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Create New Project
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <TextField
                label="Project Name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                fullWidth
                required
                placeholder="Enter project name"
                error={!newProjectName.trim() && createProjectMutation.isError}
                helperText={
                  !newProjectName.trim() && createProjectMutation.isError 
                    ? 'Project name is required' 
                    : 'All selected drawings will be reassigned to this new project'
                }
              />
              <Button 
                onClick={() => setIsCreatingNew(false)}
                sx={{ mt: 1 }}
              >
                Cancel
              </Button>
            </Box>

            {createProjectMutation.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {createProjectMutation.error?.message || 'Failed to create project'}
              </Alert>
            )}
          </Box>
        ) : (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Select Target Project
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Choose project</InputLabel>
              <Select
                value={selectedProjectId}
                label="Choose project"
                onChange={(e) => handleProjectChange(e.target.value)}
                disabled={loadingProjects}
              >
                <MenuItem value="unassigned">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FolderOpenIcon sx={{ color: 'text.secondary' }} />
                    Unassigned
                  </Box>
                </MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <FolderIcon color="primary" />
                      <Box sx={{ flexGrow: 1 }}>{project.name}</Box>
                      <Chip 
                        size="small" 
                        label={`${project.drawing_count} drawings`}
                        sx={{ ml: 1 }} 
                      />
                    </Box>
                  </MenuItem>
                ))}
                <MenuItem value="create-new">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                    <AddIcon />
                    Create New Project...
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {selectedProjectId && selectedProjectId !== 'unassigned' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                All selected drawings will be reassigned to: <strong>{getProjectDisplayName(selectedProjectId)}</strong>
              </Alert>
            )}

            {selectedProjectId === 'unassigned' && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Selected drawings will be marked as <strong>unassigned</strong> and removed from any current project.
              </Alert>
            )}
          </Box>
        )}

        {assignDrawingsMutation.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {assignDrawingsMutation.error?.message || 'Failed to reassign drawings'}
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        
        {isCreatingNew ? (
          <Button
            onClick={handleCreateNewProject}
            variant="contained"
            disabled={!newProjectName.trim() || createProjectMutation.isLoading}
            startIcon={
              createProjectMutation.isLoading ? <CircularProgress size={16} /> : <AddIcon />
            }
          >
            {createProjectMutation.isLoading ? 'Creating & Reassigning...' : 'Create & Reassign'}
          </Button>
        ) : (
          <Button
            onClick={handleReassignDrawings}
            variant="contained"
            disabled={!selectedProjectId || assignDrawingsMutation.isLoading}
            startIcon={
              assignDrawingsMutation.isLoading ? <CircularProgress size={16} /> : <ReassignIcon />
            }
          >
            {assignDrawingsMutation.isLoading 
              ? 'Reassigning...' 
              : selectedProjectId === 'unassigned'
                ? 'Mark as Unassigned'
                : 'Reassign to Project'
            }
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DrawingReassignDialog;