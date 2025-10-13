/**
 * Specification Form Dialog Component
 *
 * Story 6.1: Dimension and Specification Management UI
 * Provides create/edit dialog for component specifications
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Box,
  Typography,
  FormHelperText,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

// Specification type options (verified against database 2025-10-13)
const SPECIFICATION_TYPES = [
  { value: 'material', label: 'Material' },
  { value: 'finish', label: 'Finish' },
  { value: 'grade', label: 'Grade' },
  { value: 'coating', label: 'Coating' },
  { value: 'treatment', label: 'Treatment' },
  { value: 'standard', label: 'Standard' },
  { value: 'other', label: 'Other' },
];

interface SpecificationFormData {
  specification_type: string;
  value: string;
  description?: string;
}

interface SpecificationData {
  id?: string;
  specification_type: string;
  value: string;
  description?: string;
  display_format?: 'decimal' | 'fraction'; // For future fractional support
}

interface SpecificationFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  componentId: string;
  initialData?: SpecificationData;
  onClose: () => void;
  onSuccess: (data: SpecificationData) => void;
  onError?: (error: Error) => void;
}

// Validation schema
const specificationSchema = yup.object({
  specification_type: yup
    .string()
    .required('Specification type is required')
    .oneOf(SPECIFICATION_TYPES.map(s => s.value)),
  value: yup
    .string()
    .required('Value is required')
    .max(255, 'Value must be less than 255 characters'),
  description: yup
    .string()
    .nullable()
    .max(500, 'Description must be less than 500 characters'),
});

export const SpecificationFormDialog: React.FC<SpecificationFormDialogProps> = ({
  open,
  mode,
  componentId,
  initialData,
  onClose,
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SpecificationFormData>({
    resolver: yupResolver(specificationSchema),
    defaultValues: {
      specification_type: initialData?.specification_type || 'material',
      value: initialData?.value || '',
      description: initialData?.description || '',
    },
  });

  // Reset form when dialog opens with new initial data
  useEffect(() => {
    if (open && initialData) {
      reset({
        specification_type: initialData.specification_type,
        value: initialData.value,
        description: initialData.description || '',
      });
    } else if (open && !initialData) {
      reset({
        specification_type: 'material',
        value: '',
        description: '',
      });
    }
  }, [open, initialData, reset]);

  const onSubmit = async (data: SpecificationFormData) => {
    setLoading(true);
    setError(null);

    try {
      const specificationData: SpecificationData = {
        ...(mode === 'edit' && initialData?.id ? { id: initialData.id } : {}),
        specification_type: data.specification_type,
        value: data.value,
        description: data.description || undefined,
        display_format: 'decimal', // Default for now, can be enhanced for fractional values
      };

      // Call API to create/update specification
      const endpoint = mode === 'create'
        ? `/api/v1/components/${componentId}/specifications`
        : `/api/v1/components/specifications/${initialData?.id}`;

      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(specificationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save specification');
      }

      const result = await response.json();
      onSuccess(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      onError?.(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'Add Specification' : 'Edit Specification'}
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Specification Type */}
            <FormControl fullWidth error={!!errors.specification_type}>
              <InputLabel>Specification Type *</InputLabel>
              <Controller
                name="specification_type"
                control={control}
                render={({ field }) => (
                  <Select {...field} label="Specification Type *">
                    {SPECIFICATION_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.specification_type && (
                <FormHelperText>{errors.specification_type.message}</FormHelperText>
              )}
            </FormControl>

            {/* Value */}
            <Controller
              name="value"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Value *"
                  fullWidth
                  error={!!errors.value}
                  helperText={
                    errors.value?.message ||
                    'Specification value (e.g., A992, Galvanized, ASTM A36)'
                  }
                  placeholder="e.g., A992"
                />
              )}
            />

            {/* Description (Optional) */}
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Description"
                  fullWidth
                  multiline
                  rows={3}
                  error={!!errors.description}
                  helperText={
                    errors.description?.message ||
                    'Optional description or additional details'
                  }
                  placeholder="e.g., Steel grade for structural applications"
                />
              )}
            />

            <Typography variant="caption" color="text.secondary">
              * Required fields
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            variant="contained"
            loading={loading}
            disabled={loading}
          >
            {mode === 'create' ? 'Create' : 'Save'}
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
};
