import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useMutation, useQueryClient } from 'react-query';
import { createComponent, ComponentCreateRequest } from '../../services/api.ts';

interface ComponentCreationDialogProps {
  open: boolean;
  onClose: () => void;
  drawingId: string;
  position: { x: number; y: number } | null;
  onComponentCreated: (component: any) => void;
}

interface ComponentFormData {
  piece_mark: string;
  component_type: string;
  description: string;
  quantity: number;
  material_type: string;
}

const ComponentCreationDialog: React.FC<ComponentCreationDialogProps> = ({
  open,
  onClose,
  drawingId,
  position,
  onComponentCreated,
}) => {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<ComponentFormData>({
    piece_mark: '',
    component_type: '',
    description: '',
    quantity: 1,
    material_type: '',
  });
  
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const componentTypes = [
    { value: 'wide_flange', label: 'Wide Flange (W)' },
    { value: 'hss', label: 'HSS' },
    { value: 'angle', label: 'Angle (L)' },
    { value: 'channel', label: 'Channel (C)' },
    { value: 'plate', label: 'Plate (PL)' },
    { value: 'tube', label: 'Tube' },
    { value: 'beam', label: 'Beam' },
    { value: 'column', label: 'Column' },
    { value: 'brace', label: 'Brace' },
    { value: 'girder', label: 'Girder' },
    { value: 'truss', label: 'Truss' },
    { value: 'generic', label: 'Generic' },
  ];

  // Create component mutation
  const createMutation = useMutation(
    (componentData: ComponentCreateRequest) => createComponent(componentData),
    {
      onSuccess: (newComponent) => {
        queryClient.invalidateQueries(['drawing-components', drawingId]);
        queryClient.invalidateQueries(['search']);
        onComponentCreated(newComponent);
        handleClose();
      },
      onError: (error: any) => {
        const errorMessage = error?.response?.data?.detail || 'Failed to create component';
        if (typeof errorMessage === 'string') {
          setValidationErrors([errorMessage]);
        } else if (Array.isArray(errorMessage)) {
          setValidationErrors(errorMessage.map((err: any) => err.msg || String(err)));
        } else {
          setValidationErrors(['An unexpected error occurred']);
        }
      }
    }
  );

  const handleFieldChange = (field: keyof ComponentFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const handleSubmit = () => {
    // Basic client-side validation
    const errors: string[] = [];
    
    if (!formData.piece_mark.trim()) {
      errors.push('Piece mark is required');
    }
    
    if (!formData.component_type) {
      errors.push('Component type is required');
    }
    
    if (formData.quantity < 1) {
      errors.push('Quantity must be at least 1');
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (!position) {
      setValidationErrors(['Position not available']);
      return;
    }

    // Prepare component data for creation
    const componentData: ComponentCreateRequest = {
      drawing_id: drawingId,
      piece_mark: formData.piece_mark.trim().toUpperCase(),
      component_type: formData.component_type,
      description: formData.description.trim() || undefined,
      quantity: formData.quantity,
      material_type: formData.material_type.trim() || undefined,
      location_x: position.x,
      location_y: position.y,
      manual_creation: true,
      confidence_score: 1.0, // Manual creation gets full confidence
      review_status: 'pending',
    };

    createMutation.mutate(componentData);
  };

  const handleClose = () => {
    setFormData({
      piece_mark: '',
      component_type: '',
      description: '',
      quantity: 1,
      material_type: '',
    });
    setValidationErrors([]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Create New Component</Typography>
          {position && (
            <Typography variant="caption" color="text.secondary">
              Position: ({Math.round(position.x)}, {Math.round(position.y)})
            </Typography>
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Piece Mark"
              value={formData.piece_mark}
              onChange={(e) => handleFieldChange('piece_mark', e.target.value)}
              required
              autoFocus
              placeholder="e.g., W21x68, HSS12x12x1/2"
              helperText="Unique identifier for this component"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Component Type</InputLabel>
              <Select
                value={formData.component_type}
                onChange={(e) => handleFieldChange('component_type', e.target.value)}
                label="Component Type"
              >
                {componentTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              multiline
              rows={2}
              placeholder="Optional description of the component..."
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => handleFieldChange('quantity', parseInt(e.target.value) || 1)}
              inputProps={{ min: 1 }}
              required
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Material Type"
              value={formData.material_type}
              onChange={(e) => handleFieldChange('material_type', e.target.value)}
              placeholder="e.g., A36, A572 Gr50, A992"
              helperText="Steel grade or material specification"
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Manual Creation Notes:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • This component will be marked as manually created
                • It will receive a confidence score of 100%
                • Review status will be set to "pending"
                • You can add dimensions and specifications after creation
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={createMutation.isLoading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={createMutation.isLoading || !formData.piece_mark.trim() || !formData.component_type}
          startIcon={createMutation.isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {createMutation.isLoading ? 'Creating...' : 'Create Component'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ComponentCreationDialog;