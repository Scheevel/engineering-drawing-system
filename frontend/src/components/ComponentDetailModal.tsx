import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Box,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Autocomplete,
} from '@mui/material';
import {
  Close as CloseIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { getComponentBasicInfo, updateComponent, ComponentUpdateRequest } from '../services/api.ts';

interface ComponentDetailModalProps {
  componentId: string;
  open: boolean;
  onClose: () => void;
}

interface ComponentFormData {
  piece_mark: string;
  component_type: string;
  description: string;
  quantity: number;
  material_type: string;
  review_status: string;
}

// Component type options
const COMPONENT_TYPES = [
  { value: 'wide_flange', label: 'Wide Flange' },
  { value: 'hss', label: 'HSS' },
  { value: 'angle', label: 'Angle' },
  { value: 'channel', label: 'Channel' },
  { value: 'plate', label: 'Plate' },
  { value: 'tube', label: 'Tube' },
  { value: 'beam', label: 'Beam' },
  { value: 'column', label: 'Column' },
  { value: 'brace', label: 'Brace' },
  { value: 'girder', label: 'Girder' },
  { value: 'truss', label: 'Truss' },
  { value: 'generic', label: 'Generic' },
];

// Review status options
const REVIEW_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'warning' as const },
  { value: 'reviewed', label: 'Reviewed', color: 'info' as const },
  { value: 'approved', label: 'Approved', color: 'success' as const },
];

// Common material types for autocomplete
const MATERIAL_TYPES = [
  'A36 Steel',
  'A572 Grade 50',
  'A992 Steel',
  'A500 Grade B',
  'Aluminum',
  'Stainless Steel',
  'Galvanized Steel',
];

const ComponentDetailModal: React.FC<ComponentDetailModalProps> = ({ 
  componentId, 
  open, 
  onClose 
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditMode, setIsEditMode] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  
  const { data: component, isLoading, error } = useQuery(
    ['component', componentId],
    () => getComponentBasicInfo(componentId),
    {
      enabled: open && !!componentId,
    }
  );

  const form = useForm<ComponentFormData>({
    defaultValues: {
      piece_mark: '',
      component_type: '',
      description: '',
      quantity: 1,
      material_type: '',
      review_status: 'pending',
    },
  });

  const { control, handleSubmit, reset, formState: { isDirty } } = form;

  // Update form when component data loads
  useEffect(() => {
    if (component) {
      reset({
        piece_mark: component.piece_mark || '',
        component_type: component.component_type || '',
        description: component.description || '',
        quantity: component.quantity || 1,
        material_type: component.material_type || '',
        review_status: component.review_status || 'pending',
      });
    }
  }, [component, reset]);

  // Reset edit mode when modal closes
  useEffect(() => {
    if (!open) {
      setIsEditMode(false);
      setShowUnsavedWarning(false);
    }
  }, [open]);

  const updateMutation = useMutation(
    (updateData: ComponentUpdateRequest) => updateComponent(componentId, updateData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['component', componentId]);
        setIsEditMode(false);
        // You could add a success toast here
      },
      onError: (error) => {
        console.error('Failed to update component:', error);
        // You could add an error toast here
      },
    }
  );

  const handleViewDrawing = () => {
    if (!component) return;
    
    // Navigate to drawing viewer with component highlighted
    navigate(`/drawing-viewer/${component.drawing_id}?highlight=${component.id}`);
    onClose(); // Close modal after navigation
  };

  const handleEditToggle = () => {
    if (isEditMode && isDirty) {
      setShowUnsavedWarning(true);
    } else {
      setIsEditMode(!isEditMode);
      if (!isEditMode && component) {
        // Reset form to current component values when entering edit mode
        reset({
          piece_mark: component.piece_mark || '',
          component_type: component.component_type || '',
          description: component.description || '',
          quantity: component.quantity || 1,
          material_type: component.material_type || '',
          review_status: component.review_status || 'pending',
        });
      }
    }
  };

  const handleSave = handleSubmit((data) => {
    const updateData: ComponentUpdateRequest = {};
    
    // Only include changed fields
    if (data.piece_mark !== component?.piece_mark) updateData.piece_mark = data.piece_mark;
    if (data.component_type !== component?.component_type) updateData.component_type = data.component_type;
    if (data.description !== component?.description) updateData.description = data.description;
    if (data.quantity !== component?.quantity) updateData.quantity = data.quantity;
    if (data.material_type !== component?.material_type) updateData.material_type = data.material_type;
    if (data.review_status !== component?.review_status) updateData.review_status = data.review_status;

    updateMutation.mutate(updateData);
  });

  const handleCancel = () => {
    if (isDirty) {
      setShowUnsavedWarning(true);
    } else {
      setIsEditMode(false);
    }
  };

  const handleConfirmCancel = () => {
    setIsEditMode(false);
    setShowUnsavedWarning(false);
    if (component) {
      reset({
        piece_mark: component.piece_mark || '',
        component_type: component.component_type || '',
        description: component.description || '',
        quantity: component.quantity || 1,
        material_type: component.material_type || '',
        review_status: component.review_status || 'pending',
      });
    }
  };

  const handleCloseModal = () => {
    if (isEditMode && isDirty) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onClose={handleCloseModal} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">
              Component Details: {component?.piece_mark || componentId}
            </Typography>
            {isEditMode && (
              <Chip 
                label="Editing" 
                color="primary" 
                size="small" 
                icon={<EditIcon />}
              />
            )}
          </Box>
          <IconButton onClick={handleCloseModal} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
      
      <DialogContent dividers>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load component details
          </Alert>
        )}

        {component && (
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Basic Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Piece Mark
                      </Typography>
                      {isEditMode ? (
                        <Controller
                          name="piece_mark"
                          control={control}
                          rules={{ required: 'Piece mark is required' }}
                          render={({ field, fieldState: { error } }) => (
                            <TextField
                              {...field}
                              size="small"
                              fullWidth
                              error={!!error}
                              helperText={error?.message}
                              placeholder="Enter piece mark"
                            />
                          )}
                        />
                      ) : (
                        <Typography variant="body1" fontWeight="bold">
                          {component.piece_mark}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Type
                      </Typography>
                      {isEditMode ? (
                        <Controller
                          name="component_type"
                          control={control}
                          render={({ field }) => (
                            <FormControl size="small" fullWidth>
                              <Select {...field} displayEmpty>
                                <MenuItem value="">
                                  <em>Select type</em>
                                </MenuItem>
                                {COMPONENT_TYPES.map((type) => (
                                  <MenuItem key={type.value} value={type.value}>
                                    {type.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}
                        />
                      ) : (
                        <Typography variant="body1">
                          {COMPONENT_TYPES.find(t => t.value === component.component_type)?.label || component.component_type || 'N/A'}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Quantity
                      </Typography>
                      {isEditMode ? (
                        <Controller
                          name="quantity"
                          control={control}
                          rules={{ required: 'Quantity is required', min: { value: 1, message: 'Quantity must be at least 1' } }}
                          render={({ field, fieldState: { error } }) => (
                            <TextField
                              {...field}
                              type="number"
                              size="small"
                              fullWidth
                              error={!!error}
                              helperText={error?.message}
                              inputProps={{ min: 1 }}
                            />
                          )}
                        />
                      ) : (
                        <Typography variant="body1">
                          {component.quantity}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Material
                      </Typography>
                      {isEditMode ? (
                        <Controller
                          name="material_type"
                          control={control}
                          render={({ field }) => (
                            <Autocomplete
                              {...field}
                              options={MATERIAL_TYPES}
                              freeSolo
                              size="small"
                              onChange={(_, value) => field.onChange(value || '')}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  placeholder="Enter or select material"
                                />
                              )}
                            />
                          )}
                        />
                      ) : (
                        <Typography variant="body1">
                          {component.material_type || 'N/A'}
                        </Typography>
                      )}
                    </Grid>
                    {component.confidence_score !== null && component.confidence_score !== undefined && (
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Confidence
                        </Typography>
                        <Chip
                          label={`${Math.round(component.confidence_score * 100)}%`}
                          size="small"
                          color={component.confidence_score > 0.8 ? 'success' : 'warning'}
                        />
                      </Grid>
                    )}
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Review Status
                      </Typography>
                      {isEditMode ? (
                        <Controller
                          name="review_status"
                          control={control}
                          render={({ field }) => (
                            <FormControl size="small" fullWidth>
                              <Select {...field}>
                                {REVIEW_STATUS_OPTIONS.map((status) => (
                                  <MenuItem key={status.value} value={status.value}>
                                    {status.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}
                        />
                      ) : (
                        <Chip
                          label={REVIEW_STATUS_OPTIONS.find(s => s.value === component.review_status)?.label || component.review_status}
                          size="small"
                          color={REVIEW_STATUS_OPTIONS.find(s => s.value === component.review_status)?.color || 'default'}
                        />
                      )}
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Description
                    </Typography>
                    {isEditMode ? (
                      <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            multiline
                            rows={3}
                            size="small"
                            fullWidth
                            placeholder="Enter description"
                          />
                        )}
                      />
                    ) : (
                      <Typography variant="body1">
                        {component.description || 'No description'}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Drawing Information */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Drawing Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Drawing File
                      </Typography>
                      <Typography variant="body1">
                        {component.drawing_file_name}
                      </Typography>
                    </Grid>
                    {component.sheet_number && (
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Sheet Number
                        </Typography>
                        <Typography variant="body1">
                          {component.sheet_number}
                        </Typography>
                      </Grid>
                    )}
                    {component.drawing_type && (
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Drawing Type
                        </Typography>
                        <Typography variant="body1">
                          {component.drawing_type}
                        </Typography>
                      </Grid>
                    )}
                    {component.project_name && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Project
                        </Typography>
                        <Typography variant="body1">
                          {component.project_name}
                        </Typography>
                      </Grid>
                    )}
                    {(component.location_x !== null && component.location_y !== null) && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Location on Drawing
                        </Typography>
                        <Typography variant="body1">
                          X: {Math.round(component.location_x || 0)}, Y: {Math.round(component.location_y || 0)}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Dimensions */}
            {component.dimensions && component.dimensions.length > 0 && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Dimensions
                    </Typography>
                    <List dense>
                      {component.dimensions.map((dim, index) => (
                        <ListItem key={index} divider>
                          <ListItemText
                            primary={`${dim.type}: ${dim.value}${dim.unit}`}
                            secondary={dim.tolerance ? `Tolerance: ${dim.tolerance}` : undefined}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Specifications */}
            {component.specifications && component.specifications.length > 0 && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Specifications
                    </Typography>
                    <List dense>
                      {component.specifications.map((spec, index) => (
                        <ListItem key={index} divider>
                          <ListItemText
                            primary={`${spec.type}: ${spec.value}`}
                            secondary={spec.description}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Metadata */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Metadata
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Created
                      </Typography>
                      <Typography variant="body1">
                        {new Date(component.created_at).toLocaleDateString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Last Updated
                      </Typography>
                      <Typography variant="body1">
                        {new Date(component.updated_at).toLocaleDateString()}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </DialogContent>

        <DialogActions>
          {isEditMode ? (
            <>
              <Button
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={!component || updateMutation.isLoading}
                variant="contained"
                color="primary"
              >
                {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                disabled={updateMutation.isLoading}
                variant="outlined"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                startIcon={<ViewIcon />}
                onClick={handleViewDrawing}
                disabled={!component}
                variant="outlined"
              >
                View Drawing
              </Button>
              <Button
                startIcon={<EditIcon />}
                onClick={handleEditToggle}
                disabled={!component}
                variant="outlined"
                color="primary"
              >
                Edit Details
              </Button>
              <Button onClick={handleCloseModal} variant="contained">
                Close
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Unsaved Changes Warning Dialog */}
      <Dialog open={showUnsavedWarning} onClose={() => setShowUnsavedWarning(false)}>
        <DialogTitle>Unsaved Changes</DialogTitle>
        <DialogContent>
          <Typography>
            You have unsaved changes. Are you sure you want to discard them?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUnsavedWarning(false)}>
            Continue Editing
          </Button>
          <Button 
            onClick={() => {
              handleConfirmCancel();
              onClose();
            }} 
            color="error" 
            variant="contained"
          >
            Discard Changes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ComponentDetailModal;