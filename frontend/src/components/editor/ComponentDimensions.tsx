import React from 'react';
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
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { getComponentDimensions } from '../../services/api.ts';

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
            onClick={() => {
              // TODO: Open add dimension dialog
              console.log('Add dimension for component:', componentId);
            }}
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
                        onClick={() => {
                          // TODO: Open edit dimension dialog
                          console.log('Edit dimension:', dimension.id);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          // TODO: Confirm and delete dimension
                          console.log('Delete dimension:', dimension.id);
                        }}
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
    </Box>
  );
};

export default ComponentDimensions;