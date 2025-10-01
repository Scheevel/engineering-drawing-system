/**
 * Field Type Selector Component
 *
 * Visual selector for choosing schema field types with icons,
 * descriptions, and interactive selection interface.
 */

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  FormLabel,
  FormHelperText,
  alpha,
} from '@mui/material';
import {
  TextFields as TextFieldsIcon,
  Numbers as NumbersIcon,
  CheckBox as CheckBoxIcon,
  CalendarToday as CalendarIcon,
  Subject as TextAreaIcon,
} from '@mui/icons-material';

import {
  SchemaFieldType,
} from '../../services/api';
import {
  FIELD_TYPE_LABELS,
  FIELD_TYPE_DESCRIPTIONS,
} from '../../types/schema.ts';

interface FieldTypeSelectorProps {
  selectedType: SchemaFieldType;
  onTypeChange: (type: SchemaFieldType) => void;
  error?: string;
  disabled?: boolean;
}

const FieldTypeSelector: React.FC<FieldTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
  error,
  disabled = false,
}) => {
  // Get appropriate icon for field type
  const getFieldTypeIcon = (fieldType: SchemaFieldType) => {
    const iconProps = { fontSize: 'medium' as const };

    switch (fieldType) {
      case 'text':
        return <TextFieldsIcon {...iconProps} />;
      case 'number':
        return <NumbersIcon {...iconProps} />;
      case 'checkbox':
        return <CheckBoxIcon {...iconProps} />;
      case 'textarea':
        return <TextAreaIcon {...iconProps} />;
      case 'date':
        return <CalendarIcon {...iconProps} />;
      default:
        return <TextFieldsIcon {...iconProps} />;
    }
  };

  // All available field types (FR-5: AC 22)
  const fieldTypes: SchemaFieldType[] = [
    'text',
    'number',
    'checkbox',
    'textarea',
    'date',
  ];

  return (
    <FormControl fullWidth error={!!error}>
      <FormLabel component="legend" sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Field Type
        </Typography>
      </FormLabel>

      <Grid container spacing={2}>
        {fieldTypes.map((fieldType) => {
          const isSelected = selectedType === fieldType;

          return (
            <Grid item xs={12} sm={6} md={4} key={fieldType}>
              <Card
                sx={{
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  border: '2px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  backgroundColor: isSelected
                    ? alpha('#1976d2', 0.08)
                    : 'background.paper',
                  height: '100%',
                  minHeight: '160px',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': disabled
                    ? {}
                    : {
                        borderColor: isSelected ? 'primary.main' : 'primary.light',
                        backgroundColor: isSelected
                          ? alpha('#1976d2', 0.12)
                          : alpha('#1976d2', 0.04),
                        transform: 'translateY(-2px)',
                        boxShadow: 2,
                      },
                  opacity: disabled ? 0.6 : 1,
                }}
                onClick={() => {
                  if (!disabled) {
                    onTypeChange(fieldType);
                  }
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Box display="flex" flexDirection="column" alignItems="center" textAlign="center" flex={1} justifyContent="center">
                    {/* Icon */}
                    <Box
                      sx={{
                        color: isSelected ? 'primary.main' : 'text.secondary',
                        mb: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {getFieldTypeIcon(fieldType)}
                    </Box>

                    {/* Type Label */}
                    <Typography
                      variant="subtitle2"
                      fontWeight={isSelected ? 600 : 500}
                      color={isSelected ? 'primary.main' : 'text.primary'}
                      gutterBottom
                    >
                      {FIELD_TYPE_LABELS[fieldType]}
                    </Typography>

                    {/* Description */}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.3,
                      }}
                    >
                      {FIELD_TYPE_DESCRIPTIONS[fieldType]}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Error Message */}
      {error && (
        <FormHelperText sx={{ mt: 1 }}>
          {error}
        </FormHelperText>
      )}

      {/* Selected Type Info */}
      {selectedType && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 1,
            backgroundColor: alpha('#1976d2', 0.05),
            border: '1px solid',
            borderColor: alpha('#1976d2', 0.2),
          }}
        >
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
              {getFieldTypeIcon(selectedType)}
            </Box>
            <Typography variant="body2" fontWeight={600} color="primary.main">
              Selected: {FIELD_TYPE_LABELS[selectedType]}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {FIELD_TYPE_DESCRIPTIONS[selectedType]}
          </Typography>
        </Box>
      )}
    </FormControl>
  );
};

export default FieldTypeSelector;