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
  Checkbox,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Description as DrawingIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  SwapHoriz as ReassignIcon,
  FilterList as FilterIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { 
  listDrawings, 
  getProjects,
  deleteDrawing,
  type DrawingListResponse,
  type ProjectResponse 
} from '../services/api.ts';
import DrawingReassignDialog from '../components/DrawingReassignDialog.tsx';

interface DrawingFilters {
  projectId: string;
  status: string;
}

const DrawingsListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDrawings, setSelectedDrawings] = useState<string[]>([]);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [filters, setFilters] = useState<DrawingFilters>({
    projectId: 'all',
    status: 'all',
  });
  const [page, setPage] = useState(1);

  // Fetch drawings with filters
  const { 
    data: drawingsData, 
    isLoading: loadingDrawings, 
    error: drawingsError 
  } = useQuery<DrawingListResponse>(
    ['drawings', page, filters],
    () => listDrawings({
      page,
      limit: 20,
      project_id: filters.projectId === 'all' ? undefined : 
                  filters.projectId === 'unassigned' ? null : 
                  filters.projectId,
      status: filters.status === 'all' ? undefined : filters.status,
    }),
    {
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  // Fetch projects for filter dropdown
  const { data: projects = [] } = useQuery<ProjectResponse[]>(
    'projects',
    getProjects,
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  // Delete drawing mutation
  const deleteMutation = useMutation(deleteDrawing, {
    onSuccess: () => {
      queryClient.invalidateQueries('drawings');
      queryClient.invalidateQueries('projects');
    },
  });

  const drawings = drawingsData?.drawings || [];
  const totalDrawings = drawingsData?.total || 0;
  const totalPages = Math.ceil(totalDrawings / 20);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDrawings(drawings.map(d => d.id));
    } else {
      setSelectedDrawings([]);
    }
  };

  const handleSelectDrawing = (drawingId: string, checked: boolean) => {
    if (checked) {
      setSelectedDrawings(prev => [...prev, drawingId]);
    } else {
      setSelectedDrawings(prev => prev.filter(id => id !== drawingId));
    }
  };

  const handleReassignSelected = () => {
    if (selectedDrawings.length > 0) {
      setReassignDialogOpen(true);
    }
  };

  const handleReassignComplete = () => {
    setReassignDialogOpen(false);
    setSelectedDrawings([]);
    queryClient.invalidateQueries('drawings');
    queryClient.invalidateQueries('projects');
  };

  const handleDeleteDrawing = (drawingId: string) => {
    if (window.confirm('Are you sure you want to delete this drawing? This action cannot be undone.')) {
      deleteMutation.mutate(drawingId);
    }
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return 'Unassigned';
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const getStatusChip = (status: string, processingProgress?: number) => {
    switch (status) {
      case 'pending':
        return <Chip label="Pending" size="small" color="default" />;
      case 'processing':
        return (
          <Chip 
            label={`Processing ${processingProgress || 0}%`} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
        );
      case 'completed':
        return <Chip label="Completed" size="small" color="success" />;
      case 'failed':
        return <Chip label="Failed" size="small" color="error" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loadingDrawings && page === 1) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (drawingsError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load drawings. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Drawings
        </Typography>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => navigate('/upload')}
        >
          Upload Drawings
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Drawings
              </Typography>
              <Typography variant="h4">
                {totalDrawings}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Assigned
              </Typography>
              <Typography variant="h4" color="success.main">
                {drawings.filter(d => d.project_id).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Unassigned
              </Typography>
              <Typography variant="h4" color="warning.main">
                {drawings.filter(d => !d.project_id).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Processing
              </Typography>
              <Typography variant="h4" color="primary.main">
                {drawings.filter(d => d.processing_status === 'processing').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <FilterIcon color="action" />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Project</InputLabel>
            <Select
              value={filters.projectId}
              label="Filter by Project"
              onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
            >
              <MenuItem value="all">All Projects</MenuItem>
              <MenuItem value="unassigned">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FolderOpenIcon sx={{ color: 'text.secondary' }} />
                  Unassigned
                </Box>
              </MenuItem>
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FolderIcon color="primary" />
                    {project.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filter by Status</InputLabel>
            <Select
              value={filters.status}
              label="Filter by Status"
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Selection Actions */}
      {selectedDrawings.length > 0 && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<ReassignIcon />}
              onClick={handleReassignSelected}
            >
              Reassign ({selectedDrawings.length})
            </Button>
          }
        >
          {selectedDrawings.length} drawing{selectedDrawings.length > 1 ? 's' : ''} selected
        </Alert>
      )}

      {/* Drawings Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={
                      selectedDrawings.length > 0 && 
                      selectedDrawings.length < drawings.length
                    }
                    checked={
                      drawings.length > 0 && 
                      selectedDrawings.length === drawings.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell>File Name</TableCell>
                <TableCell>Project</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Upload Date</TableCell>
                <TableCell>Components</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {drawings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                      <DrawingIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                      <Typography variant="h6" color="text.secondary">
                        No drawings found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Upload your first drawing to get started
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<UploadIcon />}
                        onClick={() => navigate('/upload')}
                      >
                        Upload Drawings
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                drawings.map((drawing) => (
                  <TableRow key={drawing.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedDrawings.includes(drawing.id)}
                        onChange={(e) => handleSelectDrawing(drawing.id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DrawingIcon color="primary" />
                        <Box>
                          <Typography variant="subtitle2">
                            {drawing.original_name || drawing.file_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {drawing.file_name}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {drawing.project_id ? (
                          <>
                            <FolderIcon color="primary" fontSize="small" />
                            {getProjectName(drawing.project_id)}
                          </>
                        ) : (
                          <>
                            <FolderOpenIcon sx={{ color: 'text.secondary' }} fontSize="small" />
                            <Typography color="text.secondary">Unassigned</Typography>
                          </>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {getStatusChip(drawing.processing_status, drawing.processing_progress)}
                    </TableCell>
                    <TableCell>{formatFileSize(drawing.file_size)}</TableCell>
                    <TableCell>
                      {new Date(drawing.upload_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={drawing.components_extracted || 0}
                        size="small"
                        variant="outlined"
                        color={drawing.components_extracted > 0 ? 'primary' : 'default'}
                      />
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
                      <Tooltip title="Delete Drawing">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteDrawing(drawing.id)}
                          color="error"
                          disabled={deleteMutation.isLoading}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Stack direction="row" spacing={1}>
            {Array.from({ length: totalPages }, (_, index) => (
              <Button
                key={index + 1}
                variant={page === index + 1 ? 'contained' : 'outlined'}
                onClick={() => setPage(index + 1)}
                disabled={loadingDrawings}
              >
                {index + 1}
              </Button>
            ))}
          </Stack>
        </Box>
      )}

      {/* Reassign Dialog */}
      <DrawingReassignDialog
        open={reassignDialogOpen}
        onClose={handleReassignComplete}
        drawingIds={selectedDrawings}
        drawingNames={selectedDrawings.map(id => {
          const drawing = drawings.find(d => d.id === id);
          return drawing?.original_name || drawing?.file_name || 'Unknown';
        })}
      />
    </Box>
  );
};

export default DrawingsListPage;