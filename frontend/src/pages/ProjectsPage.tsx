import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  Description as DrawingIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  getProjects, 
  createProject, 
  updateProject, 
  deleteProject,
  ProjectResponse,
  ProjectCreate,
  ProjectUpdate 
} from '../services/api.ts';

interface ProjectDialogData {
  name: string;
  client: string;
  location: string;
  description: string;
}

const ProjectsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectResponse | null>(null);
  const [dialogData, setDialogData] = useState<ProjectDialogData>({
    name: '',
    client: '',
    location: '',
    description: ''
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectResponse | null>(null);

  // Fetch projects
  const { data: projects, isLoading, error } = useQuery<ProjectResponse[]>(
    'projects',
    getProjects,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Create project mutation
  const createMutation = useMutation(createProject, {
    onSuccess: () => {
      queryClient.invalidateQueries('projects');
      closeDialog();
    },
  });

  // Update project mutation
  const updateMutation = useMutation(
    (data: { id: string; project: ProjectUpdate }) => updateProject(data.id, data.project),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('projects');
        closeDialog();
      },
    }
  );

  // Delete project mutation
  const deleteMutation = useMutation(deleteProject, {
    onSuccess: () => {
      queryClient.invalidateQueries('projects');
      setDeleteConfirmOpen(false);
      setProjectToDelete(null);
    },
  });

  const openCreateDialog = () => {
    setEditingProject(null);
    setDialogData({ name: '', client: '', location: '', description: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (project: ProjectResponse) => {
    setEditingProject(project);
    setDialogData({
      name: project.name,
      client: project.client || '',
      location: project.location || '',
      description: project.description || ''
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingProject(null);
    setDialogData({ name: '', client: '', location: '', description: '' });
  };

  const handleSubmit = () => {
    if (!dialogData.name.trim()) {
      return;
    }

    const projectData = {
      name: dialogData.name.trim(),
      client: dialogData.client.trim() || undefined,
      location: dialogData.location.trim() || undefined,
      description: dialogData.description.trim() || undefined
    };

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, project: projectData });
    } else {
      createMutation.mutate(projectData as ProjectCreate);
    }
  };

  const handleDeleteClick = (project: ProjectResponse) => {
    setProjectToDelete(project);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (projectToDelete) {
      deleteMutation.mutate(projectToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load projects. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Projects
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
        >
          New Project
        </Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Project Name</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Location</TableCell>
                <TableCell align="center">Drawings</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projects?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                      <FolderIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                      <Typography variant="h6" color="text.secondary">
                        No projects found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Create your first project to organize your drawings
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                projects?.map((project) => (
                  <TableRow key={project.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <FolderIcon color="primary" />
                        <Typography variant="subtitle2">{project.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{project.client || '-'}</TableCell>
                    <TableCell>{project.location || '-'}</TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={<DrawingIcon />}
                        label={project.drawing_count}
                        size="small"
                        variant="outlined"
                        color={project.drawing_count > 0 ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(project.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit Project">
                        <IconButton
                          size="small"
                          onClick={() => openEditDialog(project)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Project">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(project)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create/Edit Project Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={closeDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingProject ? 'Edit Project' : 'Create New Project'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              label="Project Name"
              value={dialogData.name}
              onChange={(e) => setDialogData({ ...dialogData, name: e.target.value })}
              fullWidth
              required
              error={!dialogData.name.trim() && (createMutation.isError || updateMutation.isError)}
              helperText={!dialogData.name.trim() ? 'Project name is required' : ''}
            />
            <TextField
              label="Client"
              value={dialogData.client}
              onChange={(e) => setDialogData({ ...dialogData, client: e.target.value })}
              fullWidth
            />
            <TextField
              label="Location"
              value={dialogData.location}
              onChange={(e) => setDialogData({ ...dialogData, location: e.target.value })}
              fullWidth
            />
            <TextField
              label="Description"
              value={dialogData.description}
              onChange={(e) => setDialogData({ ...dialogData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
          
          {(createMutation.isError || updateMutation.isError) && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {createMutation.error?.message || updateMutation.error?.message || 'Failed to save project'}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!dialogData.name.trim() || createMutation.isLoading || updateMutation.isLoading}
          >
            {createMutation.isLoading || updateMutation.isLoading ? (
              <CircularProgress size={20} />
            ) : (
              editingProject ? 'Update' : 'Create'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{projectToDelete?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will unassign all drawings from this project, but the drawings themselves will not be deleted.
          </Typography>
          
          {deleteMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteMutation.error?.message || 'Failed to delete project'}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={deleteMutation.isLoading}
          >
            {deleteMutation.isLoading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectsPage;