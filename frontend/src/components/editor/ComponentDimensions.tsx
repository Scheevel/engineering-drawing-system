import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { getComponentDimensions, deleteDimension } from '../../services/api.ts';
import { DimensionFormDialog } from '../dimensions/DimensionFormDialog.tsx';
import { useSnackbar } from '../../contexts/SnackbarContext.tsx';

interface ComponentDimensionsProps {
  componentId: string;
  editMode?: boolean;
  onUpdate?: () => void;
}

const ComponentDimensions: React.FC<ComponentDimensionsProps> = ({
  componentId,
  editMode = false,
  onUpdate,
}) => {
  const { data: dimensions = [], isLoading, error } = useQuery(
    ['component-dimensions', componentId],
    () => getComponentDimensions(componentId),
    { enabled: !!componentId }
  );

  // Dialog state management
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDimension, setEditingDimension] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dimensionToDelete, setDimensionToDelete] = useState<string | null>(null);

  // Snackbar for notifications
  const { showSuccess, showError } = useSnackbar();

  // Event handlers
  const handleAddClick = () => {
    setEditingDimension(null); // null = add mode
    setDialogOpen(true);
  };

  const handleEditClick = (dimension: any) => {
    setEditingDimension(dimension); // set = edit mode
    setDialogOpen(true);
  };

  const handleDeleteClick = (dimensionId: string) => {
    setDimensionToDelete(dimensionId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (dimensionToDelete) {
      try {
        await deleteDimension(dimensionToDelete);
        setDeleteDialogOpen(false);
        setDimensionToDelete(null);
        onUpdate?.(); // Trigger parent to refetch data
        showSuccess('Dimension deleted successfully');
      } catch (error) {
        showError('Failed to delete dimension');
        console.error('Delete dimension error:', error);
      }
    }
  };

  const handleSave = () => {
    setDialogOpen(false);
    onUpdate?.(); // Trigger parent to refetch data
    showSuccess(editingDimension ? 'Dimension updated successfully' : 'Dimension created successfully');
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load component dimensions.
      </Alert>
    );
  }
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Dimensions ({dimensions.length})
        </Typography>
        {editMode && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
          >
            Add Dimension
          </Button>
        )}
      </Box>

      {dimensions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No dimensions found for this component.
          </Typography>
          {editMode && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Click "Add Dimension" to create the first dimension.
            </Typography>
          )}
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell>Tolerance</TableCell>
                <TableCell>Confidence</TableCell>
                {editMode && <TableCell>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {dimensions.map((dimension) => (
                <TableRow key={dimension.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {dimension.dimension_type}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" fontWeight="bold">
                      {dimension.nominal_value}
                    </Typography>
                  </TableCell>
                  <TableCell>{dimension.unit}</TableCell>
                  <TableCell>{dimension.tolerance || 'N/A'}</TableCell>
                  <TableCell>
                    {dimension.confidence_score !== null && dimension.confidence_score !== undefined && (
                      <Chip
                        label={`${Math.round(dimension.confidence_score * 100)}%`}
                        size="small"
                        color={dimension.confidence_score > 0.8 ? 'success' : 'warning'}
                      />
                    )}
                  </TableCell>
                  {editMode && (
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleEditClick(dimension)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(dimension.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dimension Form Dialog */}
      <DimensionFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        componentId={componentId}
        dimension={editingDimension}
        onSave={handleSave}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Dimension?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this dimension? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComponentDimensions;