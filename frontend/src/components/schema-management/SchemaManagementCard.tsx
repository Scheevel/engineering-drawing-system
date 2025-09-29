/**
 * Schema Management Card Component
 *
 * Displays individual schema information in card format with Material-UI patterns.
 * Shows schema details, usage statistics, default indicators, and edit controls.
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  IconButton,
  Button,
  Tooltip,
  Skeleton,
  useTheme,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Alert,
  alpha,
  Fade,
  Collapse,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Schedule as ScheduleIcon,
  Group as GroupIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ComponentSchema, ComponentSchemaUpdate } from '../../services/api.ts';
import { SchemaUsageStats } from '../../types/schema';
import { useUpdateSchema } from '../../services/schemaQueries.ts';
import DefaultSchemaToggle from './DefaultSchemaToggle.tsx';
import {
  editModeTransition,
  fieldFocusAnimation,
  validationErrorAnimation,
  successAnimation,
  respectReducedMotion,
  optimizeForPerformance,
  ANIMATION_DURATION,
  EASING,
} from '../../utils/animations.ts';
import EnhancedTooltip, { HelpTooltip, InfoTooltip, SchemaTooltips } from '../common/EnhancedTooltip.tsx';
import {
  focusIndicatorStyles,
  touchTargetStyles,
  generateAriaId,
  createFieldAriaLabel,
  useAriaLive,
  describeSchemaState,
} from '../../utils/accessibility.ts';

// Validation schema for editing
const schemaEditValidationSchema = yup.object({
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
});

interface SchemaEditFormData {
  name: string;
  description: string;
}

interface SchemaManagementCardProps {
  schema: ComponentSchema;
  usageStats?: SchemaUsageStats;
  isLoading?: boolean;
  onEdit?: (schema: ComponentSchema) => void;
  onView?: (schema: ComponentSchema) => void;
  onSaveSuccess?: (updatedSchema: ComponentSchema) => void;
  onDefaultChange?: (newDefaultSchema: ComponentSchema | null) => void;
  currentDefaultSchema?: ComponentSchema | null;
  projectId?: string;
  disabled?: boolean;
  compact?: boolean;
  allowInlineEdit?: boolean;
  allowDefaultToggle?: boolean;
}

const SchemaManagementCard: React.FC<SchemaManagementCardProps> = ({
  schema,
  usageStats,
  isLoading = false,
  onEdit,
  onView,
  onSaveSuccess,
  onDefaultChange,
  currentDefaultSchema,
  projectId,
  disabled = false,
  compact = false,
  allowInlineEdit = true,
  allowDefaultToggle = true,
}) => {
  const theme = useTheme();
  const [isEditMode, setIsEditMode] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Accessibility features
  const { announce } = useAriaLive();
  const cardId = generateAriaId('schema-card');
  const nameFieldId = generateAriaId('schema-name');
  const descriptionFieldId = generateAriaId('schema-description');
  const errorRegionId = generateAriaId('error-region');

  // Form setup
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid, isDirty },
  } = useForm<SchemaEditFormData>({
    resolver: yupResolver(schemaEditValidationSchema),
    defaultValues: {
      name: schema?.name || '',
      description: schema?.description || '',
    },
    mode: 'onChange',
  });

  const nameValue = watch('name');
  const descriptionValue = watch('description');

  // Schema update mutation
  const updateSchemaMutation = useUpdateSchema({
    onSuccess: (updatedSchema) => {
      setSubmitError(null);
      setIsEditMode(false);
      onSaveSuccess?.(updatedSchema);

      // Announce success to screen readers
      announce(`Schema "${updatedSchema.name}" updated successfully`, 'assertive');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail ||
                          error?.message ||
                          'Failed to update schema. Please try again.';
      setSubmitError(errorMessage);

      // Announce error to screen readers
      announce(`Error updating schema: ${errorMessage}`, 'assertive');
    },
  });

  // Reset form when schema changes or edit mode toggles
  useEffect(() => {
    if (!isEditMode) {
      reset({
        name: schema?.name || '',
        description: schema?.description || '',
      });
      setSubmitError(null);
    }
  }, [isEditMode, schema, reset]);

  const handleEditToggle = () => {
    if (isEditMode && isDirty) {
      setShowCancelDialog(true);
    } else {
      setIsEditMode(!isEditMode);
    }
  };

  const handleEditClick = () => {
    if (allowInlineEdit) {
      setIsEditMode(true);
    } else if (onEdit) {
      onEdit(schema);
    }
  };

  const handleSave = (data: SchemaEditFormData) => {
    const updateData: ComponentSchemaUpdate = {
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
    };

    if (!schema?.id) return;

    updateSchemaMutation.mutate({
      schemaId: schema.id,
      updates: updateData,
    });
  };

  const handleCancel = () => {
    if (isDirty) {
      setShowCancelDialog(true);
    } else {
      setIsEditMode(false);
    }
  };

  const handleConfirmCancel = () => {
    setIsEditMode(false);
    setShowCancelDialog(false);
    reset();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatLastUsed = (lastUsed: string | null) => {
    if (!lastUsed) return 'Never used';
    const date = new Date(lastUsed);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(lastUsed);
  };

  if (isLoading) {
    return (
      <Card sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box flex={1}>
              <Skeleton variant="text" width="60%" height={32} />
              <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />
            </Box>
            <Skeleton variant="circular" width={40} height={40} />
          </Box>
          <Skeleton variant="text" width="80%" height={20} />
          <Skeleton variant="text" width="50%" height={20} sx={{ mt: 1 }} />
        </CardContent>
      </Card>
    );
  }

  if (!schema) {
    return (
      <Card sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Schema data not available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Enhanced visual state management with schema-specific colors
  const getSchemaVisualState = () => {
    if (isEditMode) {
      return {
        borderColor: theme.palette.schema.editing,
        backgroundColor: theme.palette.background.schemaEditing,
        shadowLevel: 8,
        indicator: 'EDITING',
        indicatorColor: theme.palette.schema.editing,
      };
    }

    if (!schema.is_active) {
      return {
        borderColor: theme.palette.schema.inactive,
        backgroundColor: theme.palette.background.schemaInactive,
        shadowLevel: 2,
        opacity: 0.65,
      };
    }

    if (schema.is_default) {
      return {
        borderColor: theme.palette.schema.default,
        backgroundColor: theme.palette.background.schemaDefault,
        shadowLevel: 6,
        indicator: 'DEFAULT',
        indicatorColor: theme.palette.schema.default,
      };
    }

    if (schema.project_id?.startsWith('global')) {
      return {
        borderColor: theme.palette.schema.global,
        backgroundColor: theme.palette.background.schemaGlobal,
        shadowLevel: 4,
        indicator: 'GLOBAL',
        indicatorColor: theme.palette.schema.global,
      };
    }

    return {
      borderColor: theme.palette.divider,
      backgroundColor: theme.palette.background.paper,
      shadowLevel: 3,
    };
  };

  const visualState = getSchemaVisualState();

  return (
    <>
      <Card
        sx={{
          mb: theme.spacing(2),
          border: '2px solid',
          borderColor: visualState.borderColor,
          backgroundColor: visualState.backgroundColor,
          borderRadius: theme.spacing(1.5), // 12px with 8px grid system
          position: 'relative',
          overflow: 'hidden',
          // Enhanced animation system
          ...optimizeForPerformance,
          ...respectReducedMotion({
            transition: theme.transitions.create(
              ['box-shadow', 'transform', 'border-color', 'background-color'],
              {
                duration: ANIMATION_DURATION.standard,
                easing: EASING.engineering,
              }
            ),
          }),
          // Professional hover animation
          '&:hover': {
            ...(!disabled && !isEditMode && {
              boxShadow: theme.shadows[Math.min(visualState.shadowLevel + 3, 24)],
              transform: 'translateY(-4px) scale(1.01)',
              borderColor: visualState.borderColor === theme.palette.divider
                ? alpha(theme.palette.primary.main, 0.3)
                : alpha(visualState.borderColor, 0.8),
              // Subtle glow effect for interactive feedback
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `linear-gradient(135deg, ${alpha(visualState.borderColor, 0.05)} 0%, transparent 50%)`,
                pointerEvents: 'none',
                zIndex: 0,
              },
            }),
          },
          // Enhanced focus styling for accessibility
          '&:focus-within': {
            outline: `3px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            outlineOffset: '2px',
            boxShadow: `${theme.shadows[4]}, 0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
          },
          // Edit mode animation
          ...(isEditMode && {
            ...respectReducedMotion(editModeTransition),
            boxShadow: theme.shadows[8],
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(45deg, ${alpha(theme.palette.warning.main, 0.03)} 0%, transparent 50%)`,
              pointerEvents: 'none',
              zIndex: 0,
            },
          }),
          opacity: visualState.opacity || 1,
          ...(disabled && {
            filter: 'grayscale(30%)',
            pointerEvents: 'none',
            opacity: 0.6,
          }),
        }}
      >
        {/* Enhanced Status Indicator */}
        {visualState.indicator && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              backgroundColor: visualState.indicatorColor,
              color: theme.palette.getContrastText(visualState.indicatorColor || theme.palette.primary.main),
              px: theme.spacing(1),
              py: theme.spacing(0.5),
              borderRadius: `0 0 0 ${theme.spacing(1)}`, // 8px
              fontSize: theme.typography.caption.fontSize,
              fontWeight: theme.typography.fontWeightBold,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              boxShadow: theme.shadows[2],
              zIndex: 1,
              // Professional gradient overlay
              background: `linear-gradient(135deg, ${visualState.indicatorColor} 0%, ${theme.palette.mode === 'light'
                ? alpha(visualState.indicatorColor || theme.palette.primary.main, 0.8)
                : alpha(visualState.indicatorColor || theme.palette.primary.main, 1.2)} 100%)`,
            }}
          >
            {visualState.indicator}
          </Box>
        )}
      <CardContent
        sx={{
          p: theme.spacing(compact ? 2 : 3),
          pb: theme.spacing(compact ? 2 : 3),
          '&:last-child': { pb: theme.spacing(compact ? 2 : 3) }, // Override Material-UI default
        }}
      >
        {/* Header Section */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
          mb={theme.spacing(2)}
        >
          <Box flex={1}>
            {isEditMode ? (
              /* Edit Mode - Form Fields */
              <form onSubmit={handleSubmit(handleSave)}>
                <Box mb={theme.spacing(2)}>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <HelpTooltip
                        {...SchemaTooltips.schemaName}
                        interactive
                        placement="top"
                      >
                        <TextField
                          {...field}
                          label="Schema Name"
                          fullWidth
                          required
                          error={!!errors.name}
                        helperText={
                          <Box display="flex" justifyContent="space-between" width="100%">
                            <Fade in={true} timeout={ANIMATION_DURATION.fast}>
                              <Typography
                                component="span"
                                variant="caption"
                                color={errors.name ? 'error' : 'text.secondary'}
                                sx={{
                                  ...respectReducedMotion(
                                    errors.name ? validationErrorAnimation : {}
                                  ),
                                }}
                              >
                                {errors.name?.message || 'Use letters, numbers, spaces, and common punctuation'}
                              </Typography>
                            </Fade>
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                              {nameValue?.length || 0}/100
                            </Typography>
                          </Box>
                        }
                        size="small"
                        variant="outlined"
                        inputProps={{ maxLength: 100 }}
                        FormHelperTextProps={{
                          component: 'div',
                          sx: { mt: theme.spacing(0.5) }
                        }}
                        sx={{
                          // Enhanced field focus animation
                          '& .MuiOutlinedInput-root': {
                            ...respectReducedMotion(fieldFocusAnimation),
                            '&:hover': {
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderWidth: '2px',
                                borderColor: alpha(theme.palette.primary.main, 0.4),
                              },
                            },
                            '&.Mui-focused': {
                              boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderWidth: '2px',
                              },
                            },
                            '&.Mui-error': {
                              ...respectReducedMotion(validationErrorAnimation),
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: theme.palette.error.main,
                              },
                            },
                          },
                          '& .MuiInputLabel-root': {
                            ...respectReducedMotion({
                              transition: theme.transitions.create(
                                ['color', 'transform'],
                                {
                                  duration: ANIMATION_DURATION.fast,
                                  easing: EASING.decelerate,
                                }
                              ),
                            }),
                          },
                        }}
                        />
                      </HelpTooltip>
                    )}
                  />
                </Box>

                <Box mb={theme.spacing(2)}>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Description (Optional)"
                        fullWidth
                        multiline
                        rows={2}
                        error={!!errors.description}
                        helperText={
                          <Box display="flex" justifyContent="space-between" width="100%">
                            <span>{errors.description?.message || 'Describe the purpose and use case for this schema'}</span>
                            <span>{descriptionValue?.length || 0}/500</span>
                          </Box>
                        }
                        size="small"
                        variant="outlined"
                        inputProps={{ maxLength: 500 }}
                        FormHelperTextProps={{
                          sx: { display: 'flex', justifyContent: 'space-between' }
                        }}
                      />
                    )}
                  />
                </Box>

                {/* Submit Error */}
                {submitError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {submitError}
                  </Alert>
                )}
              </form>
            ) : (
              /* View Mode - Display Content */
              <>
                <Box display="flex" alignItems="center" mb={1}>
                  <Typography
                    variant="h6"
                    component="h2"
                    sx={{
                      fontWeight: 600,
                      color: schema.is_active ? 'text.primary' : 'text.secondary',
                    }}
                  >
                    {schema.name}
                  </Typography>

                  {/* Default Schema Toggle */}
                  {allowDefaultToggle && projectId && !schema.project_id?.startsWith('global') ? (
                    <Box sx={{ ml: 1 }}>
                      <DefaultSchemaToggle
                        schema={schema}
                        currentDefaultSchema={currentDefaultSchema}
                        projectId={projectId}
                        onDefaultChange={onDefaultChange}
                        disabled={disabled || isEditMode}
                        size="small"
                        variant="icon"
                      />
                    </Box>
                  ) : (
                    <Tooltip title={schema.is_default ? 'Default Schema' : 'Not Default Schema'}>
                      <IconButton size="small" color="primary" sx={{ ml: 1 }} disabled>
                        {schema.is_default ? <StarIcon /> : <StarBorderIcon />}
                      </IconButton>
                    </Tooltip>
                  )}

                  {/* Status Chip */}
                  <Chip
                    label={schema.is_active ? 'Active' : 'Inactive'}
                    size="small"
                    color={schema.is_active ? 'success' : 'default'}
                    sx={{ ml: 1 }}
                  />
                </Box>

                {/* Description */}
                {schema.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: compact ? 1 : 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {schema.description}
                  </Typography>
                )}
              </>
            )}
          </Box>

          {/* Enhanced Action Buttons */}
          <Box
            display="flex"
            flexDirection="column"
            gap={theme.spacing(1)}
            ml={theme.spacing(2)}
            sx={{
              // Smooth container animation
              ...respectReducedMotion({
                transition: theme.transitions.create(
                  ['opacity', 'transform'],
                  {
                    duration: ANIMATION_DURATION.standard,
                    easing: EASING.decelerate,
                  }
                ),
              }),
            }}
          >
            <Collapse in={true} timeout={ANIMATION_DURATION.standard}>
              <Box display="flex" flexDirection="column" gap={theme.spacing(1)}>
                {isEditMode ? (
                  /* Edit Mode - Save/Cancel Buttons with enhanced animations */
                  <Fade
                    in={isEditMode}
                    timeout={{
                      enter: ANIMATION_DURATION.complex,
                      exit: ANIMATION_DURATION.standard,
                    }}
                  >
                    <Box display="flex" flexDirection="column" gap={theme.spacing(1)}>
                      <LoadingButton
                        size="small"
                        variant="contained"
                        color="primary"
                        loading={updateSchemaMutation.isLoading}
                        disabled={!isValid || !isDirty}
                        onClick={handleSubmit(handleSave)}
                        startIcon={<SaveIcon />}
                        sx={{
                          ...respectReducedMotion({
                            transition: theme.transitions.create(
                              ['background-color', 'transform', 'box-shadow'],
                              {
                                duration: ANIMATION_DURATION.fast,
                                easing: EASING.decelerate,
                              }
                            ),
                          }),
                          '&:hover:not(:disabled)': {
                            transform: 'translateY(-1px)',
                            boxShadow: theme.shadows[4],
                          },
                          '&:active': {
                            transform: 'translateY(0)',
                          },
                          '&.Mui-disabled': {
                            opacity: 0.5,
                          },
                        }}
                      >
                        Save
                      </LoadingButton>
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        onClick={handleCancel}
                        disabled={updateSchemaMutation.isLoading}
                        startIcon={<CancelIcon />}
                        sx={{
                          ...respectReducedMotion({
                            transition: theme.transitions.create(
                              ['border-color', 'background-color', 'transform'],
                              {
                                duration: ANIMATION_DURATION.fast,
                                easing: EASING.decelerate,
                              }
                            ),
                          }),
                          '&:hover:not(:disabled)': {
                            transform: 'translateY(-1px)',
                            backgroundColor: alpha(theme.palette.action.hover, 0.08),
                            borderColor: theme.palette.text.secondary,
                          },
                          '&:active': {
                            transform: 'translateY(0)',
                          },
                        }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Fade>
                ) : (
                  /* View Mode - View/Edit Buttons with enhanced hover effects */
                  <Fade
                    in={!isEditMode}
                    timeout={{
                      enter: ANIMATION_DURATION.standard,
                      exit: ANIMATION_DURATION.fast,
                    }}
                  >
                    <Box display="flex" flexDirection="column" gap={theme.spacing(1)}>
                      {onView && (
                        <Tooltip
                          title="View Schema Details"
                          TransitionComponent={Fade}
                          TransitionProps={{ timeout: ANIMATION_DURATION.fast }}
                        >
                          <IconButton
                            size="small"
                            onClick={() => onView(schema)}
                            disabled={disabled}
                            sx={{
                              ...respectReducedMotion({
                                transition: theme.transitions.create(
                                  ['background-color', 'transform', 'box-shadow'],
                                  {
                                    duration: ANIMATION_DURATION.fast,
                                    easing: EASING.sharp,
                                  }
                                ),
                              }),
                              '&:hover:not(:disabled)': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                transform: 'scale(1.1) translateY(-1px)',
                                boxShadow: theme.shadows[2],
                              },
                              '&:active': {
                                transform: 'scale(1.05) translateY(0)',
                              },
                            }}
                          >
                            <VisibilityIcon />
                          </IconButton>
                  </Tooltip>
                )}
                      {(allowInlineEdit || onEdit) && (
                        <Tooltip
                          title={allowInlineEdit ? "Edit Schema" : "Edit Schema (External)"}
                          TransitionComponent={Fade}
                          TransitionProps={{ timeout: ANIMATION_DURATION.fast }}
                        >
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={handleEditClick}
                            disabled={disabled || !schema.is_active}
                            sx={{
                              ...respectReducedMotion({
                                transition: theme.transitions.create(
                                  ['background-color', 'transform', 'box-shadow'],
                                  {
                                    duration: ANIMATION_DURATION.fast,
                                    easing: EASING.sharp,
                                  }
                                ),
                              }),
                              '&:hover:not(:disabled)': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                transform: 'scale(1.1) translateY(-1px)',
                                boxShadow: theme.shadows[2],
                              },
                              '&:active': {
                                transform: 'scale(1.05) translateY(0)',
                              },
                              '&.Mui-disabled': {
                                opacity: 0.4,
                                transform: 'none',
                              },
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Fade>
                )}
              </Box>
            </Collapse>
          </Box>
        </Box>

        {!compact && (
          <>
            {/* Schema Information */}
            <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Version:
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {schema.version}
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Fields:
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {schema.fields.length}
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={0.5}>
                <ScheduleIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  Created {formatDate(schema.created_at)}
                </Typography>
              </Box>
            </Box>

            {/* Usage Statistics */}
            {usageStats && (
              <Box display="flex" flexWrap="wrap" gap={2} mt={2}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <GroupIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {usageStats.component_count} component{usageStats.component_count !== 1 ? 's' : ''}
                  </Typography>
                </Box>

                <Box display="flex" alignItems="center" gap={0.5}>
                  <Typography variant="body2" color="text.secondary">
                    Last used: {formatLastUsed(usageStats.last_used)}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Default Schema Label */}
            {schema.is_default && (
              <Box mt={2}>
                <Chip
                  label="Default Schema"
                  color="primary"
                  variant="outlined"
                  size="small"
                  icon={<StarIcon />}
                />
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>

    {/* Cancel Confirmation Dialog */}
    <Dialog
      open={showCancelDialog}
      onClose={() => setShowCancelDialog(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <WarningIcon color="warning" />
          <Typography variant="h6">
            Discard Changes?
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1">
          You have unsaved changes to this schema. Are you sure you want to discard these changes and exit edit mode?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => setShowCancelDialog(false)}
          color="inherit"
        >
          Keep Editing
        </Button>
        <Button
          onClick={handleConfirmCancel}
          color="warning"
          variant="contained"
        >
          Discard Changes
        </Button>
      </DialogActions>
    </Dialog>
  </>
  );
};

export default SchemaManagementCard;