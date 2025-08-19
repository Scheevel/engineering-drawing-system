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

interface ProjectOrganizationDialogProps {
  open: boolean;
  onClose: () => void;
  drawingIds: string[];
  drawingNames: string[];
}

const ProjectOrganizationDialog: React.FC<ProjectOrganizationDialogProps> = ({
  open,
  onClose,
  drawingIds,
  drawingNames,
}) => {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('unassigned');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [assignmentComplete, setAssignmentComplete] = useState(false);

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
      // Automatically assign to the new project
      assignDrawingsMutation.mutate({
        drawingIds,
        projectId: newProject.id,
        projectName: newProject.name,
      });
    },
  });

  // Assign drawings mutation
  const assignDrawingsMutation = useMutation(
    ({ drawingIds, projectId }: { drawingIds: string[], projectId?: string, projectName?: string }) =>
      assignDrawingsToProject(drawingIds, projectId),
    {
      onSuccess: (result, variables) => {
        queryClient.invalidateQueries('projects');
        setAssignmentComplete(true);
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

  const handleAssignDrawings = () => {
    const projectId = selectedProjectId === 'unassigned' ? undefined : selectedProjectId;
    assignDrawingsMutation.mutate({ drawingIds, projectId });
  };

  const handleClose = () => {
    setSelectedProjectId('unassigned');
    setIsCreatingNew(false);
    setNewProjectName('');
    setAssignmentComplete(false);
    onClose();
  };

  const getProjectDisplayName = (projectId: string) => {
    if (projectId === 'unassigned') return 'Unassigned';
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  const selectedProjectName = assignmentComplete 
    ? getProjectDisplayName(selectedProjectId)
    : getProjectDisplayName(selectedProjectId);

  if (assignmentComplete) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckIcon color="success" />
            Organization Complete
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            Successfully organized {drawingIds.length} drawing{drawingIds.length > 1 ? 's' : ''} 
            {selectedProjectId === 'unassigned' 
              ? ' as unassigned' 
              : ` into "${selectedProjectName}"`}
          </Alert>
          
          <Typography variant="body2" color="text.secondary">
            Your drawings are now organized and ready for use. You can always reassign them later 
            from the Projects page or individual drawing management.
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
      <DialogTitle>Organize Uploaded Drawings</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          You've successfully uploaded {drawingIds.length} drawing{drawingIds.length > 1 ? 's' : ''}. 
          Choose how to organize them:
        </Typography>

        {/* Drawing List */}
        <Box sx={{ mb: 3, mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Drawings to organize:
          </Typography>
          <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
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
                    : 'All drawings will be assigned to this new project'
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
              Assign to Project
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
                    Leave Unassigned
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
                All drawings will be assigned to: <strong>{getProjectDisplayName(selectedProjectId)}</strong>
              </Alert>
            )}
          </Box>
        )}

        {assignDrawingsMutation.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {assignDrawingsMutation.error?.message || 'Failed to assign drawings'}
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>
          Skip Organization
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
            {createProjectMutation.isLoading ? 'Creating & Assigning...' : 'Create & Assign'}
          </Button>
        ) : (
          <Button
            onClick={handleAssignDrawings}
            variant="contained"
            disabled={assignDrawingsMutation.isLoading}
            startIcon={
              assignDrawingsMutation.isLoading ? <CircularProgress size={16} /> : undefined
            }
          >
            {assignDrawingsMutation.isLoading 
              ? 'Organizing...' 
              : selectedProjectId === 'unassigned'
                ? 'Leave Unassigned'
                : 'Assign to Project'
            }
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ProjectOrganizationDialog;