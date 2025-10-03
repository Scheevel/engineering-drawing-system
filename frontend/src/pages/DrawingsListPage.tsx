import React, { useState, useEffect } from 'react';
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
  Autocomplete,
  TextField,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Description as DrawingIcon,
  Folder as FolderIcon,
  FilterList as FilterIcon,
  Upload as UploadIcon,
  FileDownload as ExportIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  listDrawings,
  getProjects,
  deleteDrawing,
  type DrawingListResponse,
  type ProjectResponse
} from '../services/api.ts';
import DrawingReassignDialog from '../components/DrawingReassignDialog.tsx';
import ExportDialog from '../components/export/ExportDialog.tsx';
import ProjectTags from '../components/ProjectTags.tsx'; // Story 8.1b
import AssignProjectsDialog from '../components/AssignProjectsDialog.tsx'; // Story 8.1b
import BulkActionsToolbar from '../components/BulkActionsToolbar.tsx'; // Story 8.1b Phase 4
import BulkAssignProjectsDialog from '../components/BulkAssignProjectsDialog.tsx'; // Story 8.1b Phase 4
import BulkRemoveProjectsDialog from '../components/BulkRemoveProjectsDialog.tsx'; // Story 8.1b Phase 4

interface DrawingFilters {
  projectIds: string[]; // Story 8.1b Phase 5: Multi-select support
  status: string;
  unassignedOnly: boolean; // Story 8.1b Phase 5: Unassigned filter
}

const DrawingsListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams(); // Story 8.1b Phase 5: URL persistence
  const [selectedDrawings, setSelectedDrawings] = useState<string[]>([]);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Story 8.1b Phase 5: Initialize filters from URL query params
  const [filters, setFilters] = useState<DrawingFilters>(() => {
    const projectIdsParam = searchParams.get('projects');
    const statusParam = searchParams.get('status');
    const unassignedParam = searchParams.get('unassigned');

    return {
      projectIds: projectIdsParam ? projectIdsParam.split(',') : [],
      status: statusParam || 'all',
      unassignedOnly: unassignedParam === 'true',
    };
  });
  const [page, setPage] = useState(1);

  // Story 8.1b Phase 5: Sync filters to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.projectIds.length > 0) params.set('projects', filters.projectIds.join(','));
    if (filters.status !== 'all') params.set('status', filters.status);
    if (filters.unassignedOnly) params.set('unassigned', 'true');
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);
  // Story 8.1b: Assign projects dialog state
  const [assignProjectsDialog, setAssignProjectsDialog] = useState<{
    open: boolean;
    drawingId: string;
    drawingName?: string;
  } | null>(null);
  // Story 8.1b Phase 4: Bulk operation dialogs
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);
  const [bulkRemoveDialogOpen, setBulkRemoveDialogOpen] = useState(false);

  // Fetch drawings with filters (Story 8.1b Phase 5: Updated for multi-select)
  const {
    data: drawingsData,
    isLoading: loadingDrawings,
    error: drawingsError
  } = useQuery<DrawingListResponse>(
    ['drawings', page, filters],
    () => {
      // Handle unassigned filter
      if (filters.unassignedOnly) {
        return listDrawings({
          page,
          limit: 20,
          project_id: null, // null = unassigned
          status: filters.status === 'all' ? undefined : filters.status,
        });
      }

      // Handle multi-project filter (use first project for now, backend may not support multiple)
      const projectId = filters.projectIds.length > 0 ? filters.projectIds[0] : undefined;

      return listDrawings({
        page,
        limit: 20,
        project_id: projectId,
        status: filters.status === 'all' ? undefined : filters.status,
      });
    },
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

  const drawings = drawingsData?.items || [];
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
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={() => setExportDialogOpen(true)}
            disabled={drawings.length === 0}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => navigate('/upload')}
          >
            Upload Drawings
          </Button>
        </Stack>
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
                {/* Story 8.1b: Count drawings with at least one project */}
                {drawings.filter(d => d.projects && d.projects.length > 0).length}
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
                {/* Story 8.1b: Count drawings with no projects */}
                {drawings.filter(d => !d.projects || d.projects.length === 0).length}
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

      {/* Story 8.1b Phase 5: Enhanced Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <FilterIcon color="action" />

          {/* Multi-select Project Filter */}
          <Autocomplete
            multiple
            size="small"
            options={projects}
            getOptionLabel={(option) => option.name}
            value={projects.filter(p => filters.projectIds.includes(p.id))}
            onChange={(event, newValue) => {
              setFilters({ ...filters, projectIds: newValue.map(p => p.id) });
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Filter by Projects"
                placeholder={filters.projectIds.length === 0 ? "All projects" : ""}
                size="small"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option.name}
                  {...getTagProps({ index })}
                  size="small"
                  icon={<FolderIcon />}
                  color="primary"
                />
              ))
            }
            sx={{ minWidth: 250 }}
            disabled={filters.unassignedOnly}
          />

          {/* Status Filter */}
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

          {/* Unassigned Only Toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={filters.unassignedOnly}
                onChange={(e) => setFilters({
                  ...filters,
                  unassignedOnly: e.target.checked,
                  projectIds: e.target.checked ? [] : filters.projectIds, // Clear project filter when unassigned is on
                })}
                color="warning"
              />
            }
            label="Unassigned Only"
          />

          {/* Clear Filters */}
          {(filters.projectIds.length > 0 || filters.status !== 'all' || filters.unassignedOnly) && (
            <Button
              size="small"
              onClick={() => setFilters({ projectIds: [], status: 'all', unassignedOnly: false })}
              variant="outlined"
            >
              Clear Filters
            </Button>
          )}
        </Stack>

        {/* Active Filter Indicators */}
        {(filters.projectIds.length > 0 || filters.unassignedOnly) && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Active filters: {' '}
              {filters.unassignedOnly && <Chip label="Unassigned Only" size="small" color="warning" sx={{ mr: 0.5 }} />}
              {filters.projectIds.length > 0 && (
                <Chip
                  label={`${filters.projectIds.length} project${filters.projectIds.length > 1 ? 's' : ''} selected`}
                  size="small"
                  color="primary"
                  sx={{ mr: 0.5 }}
                />
              )}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Story 8.1b Phase 4: Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedDrawings.length}
        onClearSelection={() => setSelectedDrawings([])}
        onBulkAssign={() => setBulkAssignDialogOpen(true)}
        onBulkRemove={() => setBulkRemoveDialogOpen(true)}
      />

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
                      {/* Story 8.1b: Many-to-many project associations */}
                      <ProjectTags
                        drawingId={drawing.id}
                        projects={drawing.projects}
                        onAssignClick={() => setAssignProjectsDialog({
                          open: true,
                          drawingId: drawing.id,
                          drawingName: drawing.original_name || drawing.file_name,
                        })}
                        compact
                      />
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

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        drawings={drawings}
        onClose={() => setExportDialogOpen(false)}
      />

      {/* Story 8.1b: Assign Projects Dialog */}
      {assignProjectsDialog && (
        <AssignProjectsDialog
          open={assignProjectsDialog.open}
          onClose={() => setAssignProjectsDialog(null)}
          drawingId={assignProjectsDialog.drawingId}
          drawingName={assignProjectsDialog.drawingName}
          currentProjects={drawings.find(d => d.id === assignProjectsDialog.drawingId)?.projects}
        />
      )}

      {/* Story 8.1b Phase 4: Bulk Assign Projects Dialog */}
      <BulkAssignProjectsDialog
        open={bulkAssignDialogOpen}
        onClose={() => {
          setBulkAssignDialogOpen(false);
          setSelectedDrawings([]);
        }}
        drawingIds={selectedDrawings}
        drawingNames={selectedDrawings.map(id => {
          const drawing = drawings.find(d => d.id === id);
          return drawing?.original_name || drawing?.file_name || 'Unknown';
        })}
      />

      {/* Story 8.1b Phase 4: Bulk Remove Projects Dialog */}
      <BulkRemoveProjectsDialog
        open={bulkRemoveDialogOpen}
        onClose={() => {
          setBulkRemoveDialogOpen(false);
          setSelectedDrawings([]);
        }}
        drawingIds={selectedDrawings}
        drawings={drawings}
      />
    </Box>
  );
};

export default DrawingsListPage;