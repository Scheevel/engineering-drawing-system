/**
 * Dimension Form Dialog Component
 *
 * Story 6.1: Dimension and Specification Management UI
 * Provides create/edit dialog for component dimensions with fractional input support
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
import { parseFractionalInput } from '../../utils/fractionalParser';

// Dimension type options (verified against database 2025-10-13)
const DIMENSION_TYPES = [
  { value: 'length', label: 'Length' },
  { value: 'width', label: 'Width' },
  { value: 'height', label: 'Height' },
  { value: 'diameter', label: 'Diameter' },
  { value: 'thickness', label: 'Thickness' },
  { value: 'radius', label: 'Radius' },
  { value: 'depth', label: 'Depth' },
  { value: 'spacing', label: 'Spacing' },
  { value: 'other', label: 'Other' },
];

// Unit options (verified against database 2025-10-13)
const UNITS = [
  { value: 'in', label: 'Inches (in)' },
  { value: 'ft', label: 'Feet (ft)' },
  { value: 'mm', label: 'Millimeters (mm)' },
  { value: 'cm', label: 'Centimeters (cm)' },
  { value: 'm', label: 'Meters (m)' },
  { value: 'yd', label: 'Yards (yd)' },
];

interface DimensionFormData {
  dimension_type: string;
  nominal_value_input: string; // User input (can be fractional or decimal)
  unit: string;
  tolerance?: string;
  location_x?: number;
  location_y?: number;
}

interface DimensionData {
  id?: string;
  dimension_type: string;
  nominal_value: number;
  display_format?: 'decimal' | 'fraction';
  unit: string;
  tolerance?: string;
  location_x?: number;
  location_y?: number;
}

interface DimensionFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  componentId: string;
  initialData?: DimensionData;
  onClose: () => void;
  onSuccess: (data: DimensionData) => void;
  onError?: (error: Error) => void;
}

// Validation schema
const dimensionSchema = yup.object({
  dimension_type: yup
    .string()
    .required('Dimension type is required')
    .oneOf(DIMENSION_TYPES.map(d => d.value)),
  nominal_value_input: yup
    .string()
    .required('Nominal value is required')
    .test('valid-format', 'Invalid format. Use decimal (15.75) or fraction (15 3/4)', (value) => {
      if (!value) return false;
      try {
        parseFractionalInput(value);
        return true;
      } catch {
        return false;
      }
    }),
  unit: yup
    .string()
    .required('Unit is required')
    .oneOf(UNITS.map(u => u.value)),
  tolerance: yup
    .string()
    .nullable()
    .max(50, 'Tolerance must be less than 50 characters'),
  location_x: yup.number().nullable(),
  location_y: yup.number().nullable(),
});

export const DimensionFormDialog: React.FC<DimensionFormDialogProps> = ({
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
  } = useForm<DimensionFormData>({
    resolver: yupResolver(dimensionSchema),
    defaultValues: {
      dimension_type: initialData?.dimension_type || 'length',
      nominal_value_input: initialData?.nominal_value?.toString() || '',
      unit: initialData?.unit || 'in',
      tolerance: initialData?.tolerance || '',
      location_x: initialData?.location_x,
      location_y: initialData?.location_y,
    },
  });

  // Reset form when dialog opens with new initial data
  useEffect(() => {
    if (open && initialData) {
      reset({
        dimension_type: initialData.dimension_type,
        nominal_value_input: initialData.nominal_value.toString(),
        unit: initialData.unit,
        tolerance: initialData.tolerance || '',
        location_x: initialData.location_x,
        location_y: initialData.location_y,
      });
    } else if (open && !initialData) {
      reset({
        dimension_type: 'length',
        nominal_value_input: '',
        unit: 'in',
        tolerance: '',
        location_x: undefined,
        location_y: undefined,
      });
    }
  }, [open, initialData, reset]);

  const onSubmit = async (data: DimensionFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Parse fractional input to get decimal value and display format
      const parsed = parseFractionalInput(data.nominal_value_input);

      const dimensionData: DimensionData = {
        ...(mode === 'edit' && initialData?.id ? { id: initialData.id } : {}),
        dimension_type: data.dimension_type,
        nominal_value: parsed.decimalValue,
        display_format: parsed.displayFormat,
        unit: data.unit,
        tolerance: data.tolerance || undefined,
        location_x: data.location_x,
        location_y: data.location_y,
      };

      // Call API to create/update dimension
      const endpoint = mode === 'create'
        ? `/api/v1/components/${componentId}/dimensions`
        : `/api/v1/components/dimensions/${initialData?.id}`;

      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dimensionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save dimension');
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
        {mode === 'create' ? 'Add Dimension' : 'Edit Dimension'}
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Dimension Type */}
            <FormControl fullWidth error={!!errors.dimension_type}>
              <InputLabel>Dimension Type *</InputLabel>
              <Controller
                name="dimension_type"
                control={control}
                render={({ field }) => (
                  <Select {...field} label="Dimension Type *">
                    {DIMENSION_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.dimension_type && (
                <FormHelperText>{errors.dimension_type.message}</FormHelperText>
              )}
            </FormControl>

            {/* Nominal Value with Fractional Support */}
            <Controller
              name="nominal_value_input"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Nominal Value *"
                  fullWidth
                  error={!!errors.nominal_value_input}
                  helperText={
                    errors.nominal_value_input?.message ||
                    'Enter as decimal (15.75) or fraction (15 3/4, 15-3/4, 3/4)'
                  }
                  placeholder="e.g., 15.75 or 15 3/4"
                />
              )}
            />

            {/* Unit */}
            <FormControl fullWidth error={!!errors.unit}>
              <InputLabel>Unit *</InputLabel>
              <Controller
                name="unit"
                control={control}
                render={({ field }) => (
                  <Select {...field} label="Unit *">
                    {UNITS.map((unit) => (
                      <MenuItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.unit && (
                <FormHelperText>{errors.unit.message}</FormHelperText>
              )}
            </FormControl>

            {/* Tolerance (Optional) */}
            <Controller
              name="tolerance"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Tolerance"
                  fullWidth
                  error={!!errors.tolerance}
                  helperText={errors.tolerance?.message || 'Optional (e.g., ±0.01)'}
                  placeholder="e.g., ±0.01"
                />
              )}
            />

            {/* Location Coordinates (Optional) */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Controller
                name="location_x"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Location X"
                    type="number"
                    fullWidth
                    error={!!errors.location_x}
                    helperText="Optional coordinate"
                  />
                )}
              />
              <Controller
                name="location_y"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Location Y"
                    type="number"
                    fullWidth
                    error={!!errors.location_y}
                    helperText="Optional coordinate"
                  />
                )}
              />
            </Box>

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
