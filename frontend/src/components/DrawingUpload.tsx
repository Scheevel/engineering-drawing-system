import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Description as FileIcon,
  Folder as FolderIcon,
  Add as AddIcon,
  FolderOpen,
  AccountTree as OrganizeIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { uploadDrawing, getProjects, createProject, type ProjectResponse, type ProjectCreate } from '../services/api.ts';
import ProjectOrganizationDialog from './ProjectOrganizationDialog.tsx';

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  drawingId?: string;
  isDuplicate?: boolean;
}

const DrawingUpload: React.FC = () => {
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]); // Story 8.1b: Many-to-many support
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showOrganizeDialog, setShowOrganizeDialog] = useState(false);
  
  // Fetch projects for dropdown
  const { data: projects = [], isLoading: loadingProjects } = useQuery<ProjectResponse[]>(
    'projects',
    getProjects,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
  
  // Create project mutation
  const createProjectMutation = useMutation(createProject, {
    onSuccess: (newProject) => {
      queryClient.invalidateQueries('projects');
      // Story 8.1b: Add new project to selection
      setSelectedProjectIds(prev => [...prev, newProject.id]);
      setCreateProjectDialogOpen(false);
      setNewProjectName('');
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending' as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const uploadFile = async (uploadFile: UploadFile) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f
      )
    );

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id && f.status === 'uploading'
              ? { ...f, progress: Math.min(f.progress + 20, 90) }
              : f
          )
        );
      }, 200);

      // Story 8.1b: Pass projectIds array for many-to-many support
      const result = await uploadDrawing(
        uploadFile.file,
        undefined, // Legacy projectId parameter (not used)
        selectedProjectIds.length > 0 ? selectedProjectIds : undefined
      );

      clearInterval(progressInterval);

      // Check if this is a duplicate
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { 
                ...f, 
                status: 'success', 
                progress: 100, 
                drawingId: result.id,
                isDuplicate: result.is_duplicate,
                error: result.is_duplicate ? 'Duplicate file - existing drawing returned' : undefined
              }
            : f
        )
      );
    } catch (error: any) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: 'error',
                progress: 0,
                error: error.response?.data?.detail || error.message || 'Upload failed',
              }
            : f
        )
      );
    }
  };

  const uploadAll = () => {
    files
      .filter((f) => f.status === 'pending')
      .forEach((f) => uploadFile(f));
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== 'success'));
  };
  
  const handleCreateNewProject = () => {
    if (newProjectName.trim()) {
      createProjectMutation.mutate({ name: newProjectName.trim() });
    }
  };

  const handleOrganizeDrawings = () => {
    setShowOrganizeDialog(true);
  };

  const handleOrganizeComplete = () => {
    setShowOrganizeDialog(false);
    // Optionally clear completed files after organization
    clearCompleted();
  };

  const getSuccessfulDrawingNames = () => {
    return files
      .filter(f => f.status === 'success')
      .map(f => f.file.name);
  };

  // Story 8.1b: Get selected project names for display
  const getSelectedProjectNames = () => {
    return selectedProjectIds
      .map(id => projects.find(p => p.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const getFileIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <FileIcon color="action" />;
    }
  };

  const getStatusChip = (file: UploadFile) => {
    switch (file.status) {
      case 'pending':
        return <Chip label="Pending" size="small" />;
      case 'uploading':
        return <Chip label="Uploading" size="small" color="primary" />;
      case 'success':
        return file.isDuplicate 
          ? <Chip label="Duplicate" size="small" color="warning" />
          : <Chip label="Success" size="small" color="success" />;
      case 'error':
        return <Chip label="Failed" size="small" color="error" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const uploadingCount = files.filter((f) => f.status === 'uploading').length;
  const successCount = files.filter((f) => f.status === 'success').length;
  const successfulDrawingIds = files.filter((f) => f.status === 'success' && f.drawingId).map(f => f.drawingId!);

  return (
    <Box>
      {/* Story 8.1b: Project Selection - Multi-select Support */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Project Assignment
        </Typography>
        <Stack spacing={2}>
          <Autocomplete
            multiple
            options={projects}
            getOptionLabel={(option) => option.name}
            value={projects.filter(p => selectedProjectIds.includes(p.id))}
            onChange={(event, newValue) => {
              setSelectedProjectIds(newValue.map(p => p.id));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Assign to Projects (optional)"
                placeholder="Select one or more projects"
                helperText="Leave empty to upload without project assignment"
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
                  <Chip size="small" label={option.drawing_count} sx={{ ml: 'auto' }} />
                )}
              </Box>
            )}
            loading={loadingProjects}
            disabled={loadingProjects}
          />

          <Button
            startIcon={<AddIcon />}
            onClick={() => setCreateProjectDialogOpen(true)}
            variant="outlined"
            size="small"
            sx={{ alignSelf: 'flex-start' }}
          >
            Create New Project
          </Button>
        </Stack>

        {selectedProjectIds.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            All uploaded drawings will be assigned to: <strong>{getSelectedProjectNames()}</strong>
          </Alert>
        )}
      </Paper>
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          mb: 3,
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragActive
            ? 'action.hover'
            : isDragReject
            ? 'error.light'
            : 'background.paper',
          border: '2px dashed',
          borderColor: isDragActive
            ? 'primary.main'
            : isDragReject
            ? 'error.main'
            : 'divider',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon sx={{ fontSize: 48, color: 'action.active', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive
            ? 'Drop files here'
            : isDragReject
            ? 'File type not supported'
            : 'Drag & drop drawings here'}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          or click to select files
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Supported formats: PDF, JPEG, PNG (Max 50MB)
        </Typography>
      </Paper>

      {files.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Upload Queue ({files.length})</Typography>
            <Stack direction="row" spacing={1}>
              {pendingCount > 0 && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={uploadAll}
                  disabled={uploadingCount > 0}
                  startIcon={<CloudUploadIcon />}
                >
                  Upload All ({pendingCount})
                </Button>
              )}
              {successCount > 0 && (
                <Button 
                  size="small" 
                  onClick={handleOrganizeDrawings}
                  startIcon={<OrganizeIcon />}
                  variant="outlined"
                  color="primary"
                >
                  Organize Drawings ({successCount})
                </Button>
              )}
              {files.some((f) => f.status === 'success') && (
                <Button size="small" onClick={clearCompleted} color="secondary">
                  Clear Completed
                </Button>
              )}
            </Stack>
          </Stack>

          <List>
            {files.map((file) => (
              <ListItem key={file.id} divider>
                <Box sx={{ mr: 2 }}>{getFileIcon(file.status)}</Box>
                <ListItemText
                  primary={file.file.name}
                  secondary={
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="caption">
                        {formatFileSize(file.file.size)}
                      </Typography>
                      {getStatusChip(file)}
                      {file.error && (
                        <Typography variant="caption" color="error">
                          {file.error}
                        </Typography>
                      )}
                    </Stack>
                  }
                />
                {file.status === 'uploading' && (
                  <Box sx={{ width: 100, mr: 2 }}>
                    <LinearProgress variant="determinate" value={file.progress} />
                  </Box>
                )}
                <ListItemSecondaryAction>
                  {file.status === 'pending' && (
                    <Button
                      size="small"
                      onClick={() => uploadFile(file)}
                      disabled={uploadingCount > 0}
                    >
                      Upload
                    </Button>
                  )}
                  <IconButton
                    edge="end"
                    onClick={() => removeFile(file.id)}
                    disabled={file.status === 'uploading'}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {files.length === 0 && (
        <Alert severity="info">
          No files selected. Drag and drop drawing files or click the area above to select.
        </Alert>
      )}
      
      {/* Create New Project Dialog */}
      <Dialog 
        open={createProjectDialogOpen} 
        onClose={() => setCreateProjectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Project Name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              fullWidth
              required
              placeholder="Enter project name"
              error={!newProjectName.trim() && createProjectMutation.isError}
              helperText={!newProjectName.trim() && createProjectMutation.isError ? 'Project name is required' : ''}
            />
          </Box>
          
          {createProjectMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {createProjectMutation.error?.message || 'Failed to create project'}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateProjectDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateNewProject}
            variant="contained"
            disabled={!newProjectName.trim() || createProjectMutation.isLoading}
            startIcon={createProjectMutation.isLoading ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {createProjectMutation.isLoading ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Project Organization Dialog */}
      <ProjectOrganizationDialog
        open={showOrganizeDialog}
        onClose={handleOrganizeComplete}
        drawingIds={successfulDrawingIds}
        drawingNames={getSuccessfulDrawingNames()}
      />
    </Box>
  );
};

export default DrawingUpload;