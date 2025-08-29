import React from 'react';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { ComponentDetails } from '../../services/api.ts';

interface ComponentBasicInfoProps {
  component: ComponentDetails | null;
  editMode: boolean;
  onChange: (component: ComponentDetails) => void;
}

const ComponentBasicInfo: React.FC<ComponentBasicInfoProps> = ({
  component,
  editMode,
  onChange,
}) => {
  if (!component) {
    return (
      <Box>
        <Typography>Loading component data...</Typography>
      </Box>
    );
  }

  const handleFieldChange = (field: string, value: any) => {
    if (!editMode) return;
    
    const updatedComponent = {
      ...component,
      [field]: value,
    };
    onChange(updatedComponent);
  };

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

  const reviewStatuses = [
    { value: 'pending', label: 'Pending Review' },
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'approved', label: 'Approved' },
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Component Information
      </Typography>

      <Grid container spacing={3}>
        {/* Basic Fields */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Identification
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Piece Mark"
                    value={component.piece_mark || ''}
                    onChange={(e) => handleFieldChange('piece_mark', e.target.value)}
                    disabled={!editMode}
                    required
                    error={!component.piece_mark?.trim()}
                    helperText={!component.piece_mark?.trim() && editMode ? 'Piece mark is required' : ''}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Instance Identifier"
                    value={component.instance_identifier || ''}
                    onChange={(e) => handleFieldChange('instance_identifier', e.target.value)}
                    disabled={!editMode}
                    placeholder="e.g., A, B, C"
                    inputProps={{ maxLength: 10 }}
                    helperText="Optional. Use to differentiate multiple instances of the same piece mark."
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth disabled={!editMode}>
                    <InputLabel>Component Type</InputLabel>
                    <Select
                      value={component.component_type || ''}
                      onChange={(e) => handleFieldChange('component_type', e.target.value)}
                      label="Component Type"
                    >
                      <MenuItem value="">
                        <em>Select Type</em>
                      </MenuItem>
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
                    value={component.description || ''}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    disabled={!editMode}
                    multiline
                    rows={3}
                    placeholder="Enter component description..."
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Properties */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Properties
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    type="number"
                    value={component.quantity || 1}
                    onChange={(e) => handleFieldChange('quantity', parseInt(e.target.value) || 1)}
                    disabled={!editMode}
                    inputProps={{ min: 1 }}
                  />
                </Grid>

                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Material Type"
                    value={component.material_type || ''}
                    onChange={(e) => handleFieldChange('material_type', e.target.value)}
                    disabled={!editMode}
                    placeholder="e.g., A36, A572 Gr50"
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth disabled={!editMode}>
                    <InputLabel>Review Status</InputLabel>
                    <Select
                      value={component.review_status || 'pending'}
                      onChange={(e) => handleFieldChange('review_status', e.target.value)}
                      label="Review Status"
                    >
                      {reviewStatuses.map((status) => (
                        <MenuItem key={status.value} value={status.value}>
                          {status.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Drawing Context (Read-only) */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Drawing Context
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Drawing File"
                    value={component.drawing_file_name || ''}
                    disabled
                    variant="filled"
                  />
                </Grid>

                {component.sheet_number && (
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Sheet Number"
                      value={component.sheet_number}
                      disabled
                      variant="filled"
                    />
                  </Grid>
                )}

                {component.drawing_type && (
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Drawing Type"
                      value={component.drawing_type}
                      disabled
                      variant="filled"
                    />
                  </Grid>
                )}

                {component.project_name && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Project"
                      value={component.project_name}
                      disabled
                      variant="filled"
                    />
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Metadata (Read-only) */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Metadata
              </Typography>
              
              <Grid container spacing={2}>
                {component.location_x !== null && component.location_y !== null && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Location on Drawing"
                      value={`X: ${Math.round(component.location_x || 0)}, Y: ${Math.round(component.location_y || 0)}`}
                      disabled
                      variant="filled"
                    />
                  </Grid>
                )}

                {component.confidence_score !== null && component.confidence_score !== undefined && (
                  <Grid item xs={6}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Detection Confidence
                      </Typography>
                      <Chip
                        label={`${Math.round(component.confidence_score * 100)}%`}
                        color={component.confidence_score > 0.8 ? 'success' : 'warning'}
                        size="small"
                      />
                    </Box>
                  </Grid>
                )}

                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Created"
                    value={new Date(component.created_at).toLocaleDateString()}
                    disabled
                    variant="filled"
                  />
                </Grid>

                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Last Updated"
                    value={new Date(component.updated_at).toLocaleDateString()}
                    disabled
                    variant="filled"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ComponentBasicInfo;