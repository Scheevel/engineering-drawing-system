import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Description as DrawingIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getProject,
  getProjectDrawings,
  removeDrawingFromProject,
  type ProjectResponse,
  type Drawing,
} from '../services/api.ts';
import ProjectTags from '../components/ProjectTags.tsx';
import AddDrawingsToProjectDialog from '../components/AddDrawingsToProjectDialog.tsx';
import { useSnackbar } from '../contexts/SnackbarContext.tsx';
import ConfirmDialog from '../components/ConfirmDialog.tsx';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`project-tabpanel-${index}`}
      aria-labelledby={`project-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ProjectDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useSnackbar();
  const [currentTab, setCurrentTab] = useState(0);
  const [addDrawingsDialogOpen, setAddDrawingsDialogOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<{drawingId: string; drawingName: string} | null>(null);

  // Fetch project details
  const { data: project, isLoading: loadingProject, error: projectError } = useQuery<ProjectResponse>(
    ['project', id],
    () => {
      if (!id) throw new Error('No project ID');
      return getProject(id);
    },
    {
      enabled: !!id,
      staleTime: 2 * 60 * 1000,
    }
  );

  // Fetch project drawings (Story 8.1b Phase 6)
  const { data: drawingsData, isLoading: loadingDrawings } = useQuery(
    ['project-drawings', id],
    () => {
      if (!id) throw new Error('No project ID');
      return getProjectDrawings(id);
    },
    {
      enabled: !!id && currentTab === 0, // Only load when Drawings tab is active
      staleTime: 2 * 60 * 1000,
    }
  );

  // Backend returns array directly (not paginated), handle both formats
  const drawings = Array.isArray(drawingsData) ? drawingsData : (drawingsData?.items || []);

  // Remove drawing mutation
  const removeMutation = useMutation(
    ({ drawingId }: { drawingId: string }) => {
      if (!id) throw new Error('No project ID');
      return removeDrawingFromProject(drawingId, id);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['project-drawings', id]);
        queryClient.invalidateQueries(['project', id]);
        queryClient.invalidateQueries('drawings');
        const drawingName = confirmRemove?.drawingName || 'Drawing';
        showSuccess(`${drawingName} removed from project`);
        setConfirmRemove(null);
      },
      onError: (error: any) => {
        showError(error?.message || 'Failed to remove drawing from project');
        setConfirmRemove(null);
      },
    }
  );

  const handleRemoveDrawing = (drawingId: string, drawingName: string) => {
    setConfirmRemove({ drawingId, drawingName });
  };

  const handleConfirmRemove = () => {
    if (confirmRemove) {
      removeMutation.mutate({ drawingId: confirmRemove.drawingId });
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  if (loadingProject) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (projectError || !project) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load project. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate('/projects')} sx={{ mr: 2 }}>
          <BackIcon />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h4" component="h1">
            <FolderIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
            {project.name}
          </Typography>
          {project.client && (
            <Typography variant="body2" color="text.secondary">
              Client: {project.client}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Drawings
              </Typography>
              <Typography variant="h4">{project.drawing_count || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Created
              </Typography>
              <Typography variant="h6">
                {new Date(project.created_at).toLocaleDateString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Location
              </Typography>
              <Typography variant="h6">{project.location || 'Not specified'}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="project tabs">
          <Tab label={`Drawings (${project.drawing_count || 0})`} id="project-tab-0" />
          <Tab label="Details" id="project-tab-1" />
        </Tabs>

        {/* Drawings Tab */}
        <TabPanel value={currentTab} index={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Project Drawings</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddDrawingsDialogOpen(true)}
            >
              Add Drawings
            </Button>
          </Box>

          {loadingDrawings ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : drawings.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={4}>
              <DrawingIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
              <Typography variant="h6" color="text.secondary">
                No drawings in this project
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click "Add Drawings" to assign drawings to this project
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>File Name</TableCell>
                    <TableCell>Projects</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Components</TableCell>
                    <TableCell>Upload Date</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {drawings.map((drawing) => (
                    <TableRow key={drawing.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <DrawingIcon color="primary" />
                          <Typography variant="subtitle2">
                            {drawing.original_name || drawing.file_name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <ProjectTags
                          drawingId={drawing.id}
                          projects={drawing.projects}
                          onAssignClick={() => {}}
                          compact
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={drawing.processing_status}
                          size="small"
                          color={drawing.processing_status === 'completed' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={drawing.components_extracted || 0}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(drawing.upload_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Drawing">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/drawings/${drawing.id}`)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove from Project">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              handleRemoveDrawing(
                                drawing.id,
                                drawing.original_name || drawing.file_name
                              )
                            }
                            disabled={removeMutation.isLoading}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Details Tab */}
        <TabPanel value={currentTab} index={1}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Project Name
              </Typography>
              <Typography variant="body1" gutterBottom>
                {project.name}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Client
              </Typography>
              <Typography variant="body1" gutterBottom>
                {project.client || 'Not specified'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Location
              </Typography>
              <Typography variant="body1" gutterBottom>
                {project.location || 'Not specified'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Created
              </Typography>
              <Typography variant="body1" gutterBottom>
                {new Date(project.created_at).toLocaleString()}
              </Typography>
            </Grid>
            {project.description && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body1">{project.description}</Typography>
              </Grid>
            )}
          </Grid>
        </TabPanel>
      </Paper>

      {/* Add Drawings Dialog */}
      {project && (
        <AddDrawingsToProjectDialog
          open={addDrawingsDialogOpen}
          onClose={() => setAddDrawingsDialogOpen(false)}
          projectId={project.id}
          projectName={project.name}
        />
      )}

      {/* Confirm Remove Dialog */}
      <ConfirmDialog
        open={!!confirmRemove}
        title="Remove Drawing from Project?"
        message={`Are you sure you want to remove "${confirmRemove?.drawingName}" from this project?`}
        confirmText="Remove"
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmRemove(null)}
        loading={removeMutation.isLoading}
        severity="error"
      />
    </Box>
  );
};

export default ProjectDetailPage;
