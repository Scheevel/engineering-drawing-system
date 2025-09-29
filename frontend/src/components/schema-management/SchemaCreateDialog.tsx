/**
 * Schema Create Dialog Component
 *
 * Modal dialog for creating new component schemas with form validation,
 * project context handling, and real-time feedback.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Typography,
  FormHelperText,
  Alert,
  Divider,
  Checkbox,
  FormControlLabel,
  useTheme,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  Close as CloseIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useQuery } from 'react-query';

import { ComponentSchemaCreate, getProjects, ProjectResponse } from '../../services/api.ts';
import { useCreateSchema } from '../../services/schemaQueries.ts';
import {
  useAriaLive,
  generateAriaId,
  focusIndicatorStyles,
  trapFocus,
} from '../../utils/accessibility.ts';

// Validation schema
const schemaValidationSchema = yup.object({
  name: yup
    .string()
    .required('Schema name is required')
    .min(3, 'Schema name must be at least 3 characters')
    .max(100, 'Schema name must be less than 100 characters')
    .matches(
      /^[a-zA-Z0-9\s\-_\.]+$/,
      'Schema name can only contain letters, numbers, spaces, hyphens, underscores, and periods'
    ),
  description: yup
    .string()
    .max(500, 'Description must be less than 500 characters'),
  project_id: yup
    .string()
    .when('isGlobal', {
      is: false,
      then: (schema) => schema.required('Project selection is required for project-specific schemas'),
      otherwise: (schema) => schema.notRequired(),
    }),
  isGlobal: yup.boolean(),
  is_default: yup.boolean(),
});

interface SchemaCreateFormData {
  name: string;
  description: string;
  project_id?: string;
  isGlobal: boolean;
  is_default: boolean;
}

interface SchemaCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (schema: any) => void;
  projectId?: string; // Pre-selected project for project context
  defaultToGlobal?: boolean;
}

const SchemaCreateDialog: React.FC<SchemaCreateDialogProps> = ({
  open,
  onClose,
  onSuccess,
  projectId,
  defaultToGlobal = false,
}) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const theme = useTheme();

  // Accessibility hooks and refs
  const { announce } = useAriaLive();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = generateAriaId('schema-create-title');
  const descriptionId = generateAriaId('schema-create-description');

  // Form setup
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid, isDirty },
    setValue,
  } = useForm<SchemaCreateFormData>({
    resolver: yupResolver(schemaValidationSchema),
    defaultValues: {
      name: '',
      description: '',
      project_id: projectId || '',
      isGlobal: defaultToGlobal,
      is_default: false,
    },
    mode: 'onChange',
  });

  const isGlobal = watch('isGlobal');
  const nameValue = watch('name');

  // Load projects for selection
  const { data: projects = [], isLoading: projectsLoading } = useQuery<ProjectResponse[]>(
    'projects',
    getProjects,
    {
      enabled: open, // Only load when dialog is open
    }
  );

  // Schema creation mutation
  const createSchemaMutation = useCreateSchema({
    onSuccess: (newSchema) => {
      setSubmitError(null);
      onSuccess?.(newSchema);
      handleClose();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail ||
                          error?.message ||
                          'Failed to create schema. Please try again.';
      setSubmitError(errorMessage);
    },
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      reset({
        name: '',
        description: '',
        project_id: projectId || '',
        isGlobal: defaultToGlobal,
        is_default: false,
      });
      setSubmitError(null);
      announce('Schema creation dialog opened', 'polite');
    }
  }, [open, reset, projectId, defaultToGlobal, announce]);

  // Focus management
  useEffect(() => {
    if (open && dialogRef.current) {
      const cleanup = trapFocus(dialogRef.current);
      return cleanup;
    }
  }, [open]);

  // Handle project context changes
  useEffect(() => {
    if (projectId && !isGlobal) {
      setValue('project_id', projectId);
    }
  }, [projectId, isGlobal, setValue]);

  const handleClose = () => {
    if (!createSchemaMutation.isLoading) {
      reset();
      setSubmitError(null);
      onClose();
    }
  };

  const onSubmit = (data: SchemaCreateFormData) => {
    const schemaData: ComponentSchemaCreate = {
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
      project_id: data.isGlobal ? undefined : data.project_id,
      fields: [], // Start with empty fields - will be added in field management
      is_default: data.is_default,
    };

    announce('Creating schema...', 'assertive');
    createSchemaMutation.mutate(schemaData);
  };

  const getContextLabel = () => {
    if (isGlobal) {
      return 'Global Schema';
    }
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      return project ? `Project: ${project.name}` : 'Project Schema';
    }
    return 'Project Schema';
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      PaperProps={{
        ref: dialogRef,
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle id={titleId}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <AddIcon color="primary" aria-hidden="true" />
            <Typography variant="h6" component="h1">
              Create New Schema
            </Typography>
          </Box>
          <Button
            onClick={handleClose}
            size="small"
            sx={{ minWidth: 'auto', p: 0.5, ...focusIndicatorStyles(theme) }}
            disabled={createSchemaMutation.isLoading}
            aria-label="Close dialog"
            title="Close schema creation dialog"
          >
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>

      <Divider />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent sx={{ pt: 3 }}>
          <Typography id={descriptionId} variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create a new component schema to define the structure and validation rules for your engineering components.
          </Typography>

          {/* Context Indicator */}
          <Alert
            severity="info"
            sx={{ mb: 3 }}
            variant="outlined"
            role="status"
            aria-live="polite"
          >
            <Typography variant="body2">
              <strong>Schema Type:</strong> {getContextLabel()}
              {!isGlobal && !projectId && (
                <span> - Select a project below</span>
              )}
            </Typography>
          </Alert>

          {/* Schema Name */}
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Schema Name"
                fullWidth
                required
                error={!!errors.name}
                margin="normal"
                autoFocus
                placeholder="Enter a descriptive name for this schema"
                inputProps={{
                  maxLength: 100,
                  'aria-describedby': 'schema-name-help',
                }}
                sx={focusIndicatorStyles(theme)}
                FormHelperTextProps={{
                  sx: { display: 'flex', justifyContent: 'space-between' }
                }}
                helperText={
                  <Box display="flex" justifyContent="space-between" width="100%" id="schema-name-help">
                    <span>{errors.name?.message || 'Use letters, numbers, spaces, and common punctuation'}</span>
                    <span aria-label={`${nameValue?.length || 0} characters out of 100 maximum`}>
                      {nameValue?.length || 0}/100
                    </span>
                  </Box>
                }
              />
            )}
          />

          {/* Project Selection (when not global and not pre-selected) */}
          {!isGlobal && !projectId && (
            <Controller
              name="project_id"
              control={control}
              render={({ field }) => (
                <FormControl
                  fullWidth
                  margin="normal"
                  error={!!errors.project_id}
                  required
                >
                  <InputLabel>Project</InputLabel>
                  <Select
                    {...field}
                    label="Project"
                    disabled={projectsLoading}
                  >
                    {projectsLoading ? (
                      <MenuItem disabled>Loading projects...</MenuItem>
                    ) : projects.length === 0 ? (
                      <MenuItem disabled>No projects available</MenuItem>
                    ) : (
                      projects.map((project) => (
                        <MenuItem key={project.id} value={project.id}>
                          {project.name}
                          {project.client && ` (${project.client})`}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  {errors.project_id && (
                    <FormHelperText>{errors.project_id.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
          )}

          {/* Description */}
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
                    <span>{errors.description?.message || 'Describe the purpose and use case for this schema'}</span>
                    <span>{field.value?.length || 0}/500</span>
                  </Box>
                }
                margin="normal"
                placeholder="Describe when and how this schema should be used..."
                inputProps={{
                  maxLength: 500,
                }}
                FormHelperTextProps={{
                  sx: { display: 'flex', justifyContent: 'space-between' }
                }}
              />
            )}
          />

          {/* Default Schema Option */}
          {!isGlobal && (
            <Controller
              name="is_default"
              control={control}
              render={({ field }) => (
                <FormControl margin="normal" sx={focusIndicatorStyles(theme)}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        sx={focusIndicatorStyles(theme)}
                        inputProps={{
                          'aria-describedby': 'default-schema-help',
                        }}
                      />
                    }
                    label={
                      <Typography variant="body2">
                        Set as default schema for this project
                      </Typography>
                    }
                  />
                  <FormHelperText id="default-schema-help">
                    The default schema will be automatically selected when creating new components
                  </FormHelperText>
                </FormControl>
              )}
            />
          )}

          {/* Submit Error */}
          {submitError && (
            <Alert
              severity="error"
              sx={{ mt: 2 }}
              role="alert"
              aria-live="assertive"
            >
              {submitError}
            </Alert>
          )}
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={handleClose}
            disabled={createSchemaMutation.isLoading}
            color="inherit"
            sx={focusIndicatorStyles(theme)}
            aria-label="Cancel schema creation"
          >
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            variant="contained"
            loading={createSchemaMutation.isLoading}
            disabled={!isValid || !isDirty}
            startIcon={<AddIcon />}
            sx={focusIndicatorStyles(theme)}
            aria-label="Create new schema"
            aria-describedby={!isValid ? 'form-validation-status' : undefined}
          >
            Create Schema
          </LoadingButton>
          <Typography
            id="form-validation-status"
            variant="caption"
            sx={{ display: 'none' }}
          >
            {!isValid ? 'Form has validation errors' : 'Form is valid and ready to submit'}
          </Typography>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SchemaCreateDialog;