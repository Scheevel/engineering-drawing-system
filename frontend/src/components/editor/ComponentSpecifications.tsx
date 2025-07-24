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
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { Specification } from '../../services/api.ts';

interface ComponentSpecificationsProps {
  componentId: string;
  specifications: Specification[];
  editMode: boolean;
  onUpdate: () => void;
}

const ComponentSpecifications: React.FC<ComponentSpecificationsProps> = ({
  componentId,
  specifications,
  editMode,
  onUpdate,
}) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Specifications ({specifications.length})
        </Typography>
        {editMode && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              // TODO: Open add specification dialog
              console.log('Add specification for component:', componentId);
            }}
          >
            Add Specification
          </Button>
        )}
      </Box>

      {specifications.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No specifications found for this component.
          </Typography>
          {editMode && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Click "Add Specification" to create the first specification.
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
                <TableCell>Description</TableCell>
                <TableCell>Confidence</TableCell>
                {editMode && <TableCell>Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {specifications.map((specification) => (
                <TableRow key={specification.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {specification.specification_type}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" fontWeight="bold">
                      {specification.value}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {specification.description || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {specification.confidence_score !== null && specification.confidence_score !== undefined && (
                      <Chip
                        label={`${Math.round(specification.confidence_score * 100)}%`}
                        size="small"
                        color={specification.confidence_score > 0.8 ? 'success' : 'warning'}
                      />
                    )}
                  </TableCell>
                  {editMode && (
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          // TODO: Open edit specification dialog
                          console.log('Edit specification:', specification.id);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          // TODO: Confirm and delete specification
                          console.log('Delete specification:', specification.id);
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

export default ComponentSpecifications;