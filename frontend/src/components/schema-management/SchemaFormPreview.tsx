/**
 * Schema Form Preview Component
 *
 * Shows a preview of how the field reordering affects the actual schema form.
 * Displays fields in their new order with minimal styling.
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Stack,
} from '@mui/material';
import { ComponentSchemaField } from '../../types/schema';

interface SchemaFormPreviewProps {
  fields: ComponentSchemaField[];
  title?: string;
  isCollapsed?: boolean;
}

export const SchemaFormPreview: React.FC<SchemaFormPreviewProps> = ({
  fields,
  title = 'Form Preview',
  isCollapsed = false,
}) => {
  const activeFields = fields.filter(field => field.is_active);

  const renderFieldPreview = (field: ComponentSchemaField) => {
    const commonProps = {
      key: field.id,
      label: field.label,
      size: 'small' as const,
      disabled: true,
      variant: 'outlined' as const,
      fullWidth: true,
    };

    switch (field.field_type) {
      case 'text':
      case 'textarea':
        return (
          <TextField
            {...commonProps}
            placeholder={field.help_text || `Enter ${field.label.toLowerCase()}`}
            multiline={field.field_type === 'textarea'}
            rows={field.field_type === 'textarea' ? 3 : 1}
          />
        );

      case 'number':
        return (
          <TextField
            {...commonProps}
            type="number"
            placeholder={field.help_text || `Enter ${field.label.toLowerCase()}`}
          />
        );

      case 'select':
        const options = (field.field_config as any)?.options || [];
        return (
          <FormControl {...commonProps}>
            <InputLabel>{field.label}</InputLabel>
            <Select value="" displayEmpty>
              <MenuItem value="" disabled>
                {field.help_text || `Select ${field.label.toLowerCase()}`}
              </MenuItem>
              {options.map((option: string, index: number) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'boolean':
        return (
          <FormControlLabel
            control={<Checkbox disabled />}
            label={field.label}
            sx={{ alignSelf: 'flex-start' }}
          />
        );

      case 'date':
        return (
          <TextField
            {...commonProps}
            type="date"
            InputLabelProps={{ shrink: true }}
          />
        );

      default:
        return (
          <TextField
            {...commonProps}
            placeholder={field.help_text || `Enter ${field.label.toLowerCase()}`}
          />
        );
    }
  };

  if (isCollapsed) {
    return (
      <Paper
        elevation={1}
        sx={{
          p: 2,
          opacity: 0.7,
          border: '1px dashed',
          borderColor: 'divider'
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          {title} ({activeFields.length} fields)
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom color="primary">
        {title}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Preview of form with current field order ({activeFields.length} active fields)
      </Typography>

      <Divider sx={{ mb: 2 }} />

      {activeFields.length === 0 ? (
        <Typography variant="body2" color="text.secondary" fontStyle="italic">
          No active fields to display
        </Typography>
      ) : (
        <Stack spacing={2}>
          {activeFields.map((field) => (
            <Box key={field.id}>
              {renderFieldPreview(field)}
              {field.is_required && (
                <Typography
                  variant="caption"
                  color="error.main"
                  sx={{ display: 'block', mt: 0.5 }}
                >
                  * Required
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
};