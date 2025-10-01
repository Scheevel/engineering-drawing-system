/**
 * Schema Form Fields Component
 *
 * Reusable form fields for schema creation and editing.
 * Provides consistent field styling, validation, and behavior
 * across different schema forms.
 */

import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  InputLabel,
  FormHelperText,
  Typography,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import { Controller, Control, FieldErrors } from 'react-hook-form';
import { ComponentSchema } from '../../services/api.ts';
import SchemaNameValidationHelper from './SchemaNameValidationHelper.tsx';

export interface SchemaFormFieldsProps {
  control: Control<any>;
  errors: Record<string, string>;
  mode: 'create' | 'edit';
  schema?: ComponentSchema;
  projectId?: string;
  projects?: Array<{ id: string; name: string }>;
  showProjectSelection?: boolean;
  showGlobalToggle?: boolean;
  showDefaultToggle?: boolean;
}

const SchemaFormFields: React.FC<SchemaFormFieldsProps> = ({
  control,
  errors,
  mode,
  schema,
  projectId,
  projects = [],
  showProjectSelection = mode === 'create',
  showGlobalToggle = mode === 'create',
  showDefaultToggle = mode === 'create',
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Basic Information Section */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Basic Information
          </Typography>

          {/* Schema Name */}
          <Box mb={3}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Box>
                  <TextField
                    {...field}
                    label="Schema Name"
                    fullWidth
                    required
                    error={!!errors.name}
                    placeholder="Enter a descriptive name for this schema"
                    inputProps={{ maxLength: 100 }}
                  />
                  <SchemaNameValidationHelper
                    name={field.value || ''}
                    error={errors.name}
                    showRules={true}
                  />
                </Box>
              )}
            />
          </Box>

          {/* Schema Description */}
          <Box mb={3}>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Description (Optional)"
                  fullWidth
                  multiline
                  rows={3}
                  error={!!errors.description}
                  helperText={
                    <Box display="flex" justifyContent="space-between" width="100%">
                      <span>
                        {errors.description || 'Describe the purpose and use case for this schema'}
                      </span>
                      <span>{field.value?.length || 0}/500</span>
                    </Box>
                  }
                  placeholder="Describe what this schema is used for and when to apply it"
                  inputProps={{ maxLength: 500 }}
                  FormHelperTextProps={{
                    sx: { display: 'flex', justifyContent: 'space-between' }
                  }}
                />
              )}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Scope and Context Section (Create Mode Only) */}
      {mode === 'create' && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Scope and Context
            </Typography>

            {/* Global Schema Toggle */}
            {showGlobalToggle && (
              <Box mb={3}>
                <Controller
                  name="isGlobal"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={field.onChange}
                          name="isGlobal"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1">
                            Global Schema
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Global schemas can be used across all projects
                          </Typography>
                        </Box>
                      }
                    />
                  )}
                />
              </Box>
            )}

            {/* Project Selection */}
            {showProjectSelection && (
              <Controller
                name="isGlobal"
                control={control}
                render={({ field: isGlobalField }) => (
                  !isGlobalField.value && (
                    <Box mb={3}>
                      <Controller
                        name="project_id"
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth error={!!errors.project_id}>
                            <InputLabel>Project</InputLabel>
                            <Select
                              {...field}
                              label="Project"
                              disabled={!!projectId} // Disable if project is pre-selected
                            >
                              {projects.map((project) => (
                                <MenuItem key={project.id} value={project.id}>
                                  {project.name}
                                </MenuItem>
                              ))}
                            </Select>
                            {errors.project_id && (
                              <FormHelperText>{errors.project_id}</FormHelperText>
                            )}
                            {!errors.project_id && (
                              <FormHelperText>
                                Select the project this schema belongs to
                              </FormHelperText>
                            )}
                          </FormControl>
                        )}
                      />
                    </Box>
                  )
                )}
              />
            )}

            {/* Default Schema Toggle */}
            {showDefaultToggle && (
              <Controller
                name="isGlobal"
                control={control}
                render={({ field: isGlobalField }) => (
                  !isGlobalField.value && (
                    <Box mb={3}>
                      <Controller
                        name="is_default"
                        control={control}
                        render={({ field }) => (
                          <FormControlLabel
                            control={
                              <Switch
                                checked={field.value}
                                onChange={field.onChange}
                                name="is_default"
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="body1">
                                  Set as Default Schema
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  The default schema is automatically selected for new components
                                </Typography>
                              </Box>
                            }
                          />
                        )}
                      />
                    </Box>
                  )
                )}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Mode Information */}
      {mode === 'edit' && schema && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Schema Information
            </Typography>

            <Box display="flex" flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Version:
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {schema.version}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Fields:
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {schema.fields.length}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Created:
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {new Date(schema.created_at).toLocaleDateString()}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Last Modified:
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {new Date(schema.updated_at).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>

            {schema.project_id?.startsWith('global') && (
              <Alert severity="info" sx={{ mt: 2 }}>
                This is a global schema and can be used across all projects.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Validation Tips */}
      <Card variant="outlined" sx={{ backgroundColor: 'grey.50' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Validation Guidelines
          </Typography>
          <Box component="ul" sx={{ margin: 0, paddingLeft: 2 }}>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Schema names must be 3-100 characters long and unique within the project
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Use descriptive names that clearly identify the schema's purpose
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1 }}>
              Descriptions help other team members understand when to use this schema
            </Typography>
            {mode === 'create' && (
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Only one schema can be set as default per project
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SchemaFormFields;