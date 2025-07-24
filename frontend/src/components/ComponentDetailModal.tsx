import React from 'react';
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
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { getComponentBasicInfo } from '../services/api.ts';

interface ComponentDetailModalProps {
  componentId: string;
  open: boolean;
  onClose: () => void;
}

const ComponentDetailModal: React.FC<ComponentDetailModalProps> = ({ 
  componentId, 
  open, 
  onClose 
}) => {
  const navigate = useNavigate();
  
  const { data: component, isLoading, error } = useQuery(
    ['component', componentId],
    () => getComponentBasicInfo(componentId),
    {
      enabled: open && !!componentId,
    }
  );

  const handleViewDrawing = () => {
    if (!component) return;
    
    // Navigate to drawing viewer with component highlighted
    navigate(`/drawing-viewer/${component.drawing_id}?highlight=${component.id}`);
    onClose(); // Close modal after navigation
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">
          Component Details: {component?.piece_mark || componentId}
        </Typography>
        <IconButton onClick={onClose} size="small">
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
                      <Typography variant="body2" color="text.secondary">
                        Piece Mark
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {component.piece_mark}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Type
                      </Typography>
                      <Typography variant="body1">
                        {component.component_type || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Quantity
                      </Typography>
                      <Typography variant="body1">
                        {component.quantity}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Material
                      </Typography>
                      <Typography variant="body1">
                        {component.material_type || 'N/A'}
                      </Typography>
                    </Grid>
                    {component.confidence_score !== null && component.confidence_score !== undefined && (
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Confidence
                        </Typography>
                        <Chip
                          label={`${Math.round(component.confidence_score * 100)}%`}
                          size="small"
                          color={component.confidence_score > 0.8 ? 'success' : 'warning'}
                        />
                      </Grid>
                    )}
                  </Grid>
                  
                  {component.description && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Description
                      </Typography>
                      <Typography variant="body1">
                        {component.description}
                      </Typography>
                    </Box>
                  )}
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
        <Button
          startIcon={<ViewIcon />}
          onClick={handleViewDrawing}
          disabled={!component}
          variant="outlined"
        >
          View Drawing
        </Button>
        <Button
          onClick={() => {
            if (component) {
              navigate(`/component/${component.id}`);
              onClose();
            }
          }}
          disabled={!component}
          variant="outlined"
        >
          Open in Editor
        </Button>
        <Button
          startIcon={<DownloadIcon />}
          onClick={() => {
            // TODO: Export component data
            console.log('Export component:', component?.id);
          }}
          disabled={!component}
        >
          Export Data
        </Button>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ComponentDetailModal;