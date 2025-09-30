/**
 * Schema Create Page Component
 *
 * Provides a form for creating new component type schemas.
 * Supports basic schema information and field configuration.
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Alert,
  Breadcrumbs,
  Link,
  Divider,
  Card,
  CardContent,
  IconButton,
  Grid,
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Schema as SchemaIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ComponentSchemaCreate, ComponentSchemaFieldCreate, SchemaFieldType, createSchema } from '../../services/api.ts';

const SchemaCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<ComponentSchemaCreate>({
    name: '',
    description: '',
    fields: [],
    is_default: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (field: keyof ComponentSchemaCreate, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddField = () => {
    const newField: ComponentSchemaFieldCreate = {
      field_name: '',
      field_type: 'text',
      field_config: {},
      help_text: '',
      display_order: formData.fields.length,
      is_required: false,
    };

    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
  };

  const handleFieldChange = (index: number, field: keyof ComponentSchemaFieldCreate, value: any) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) =>
        i === index ? { ...f, [field]: value } : f
      ),
    }));
  };

  const handleRemoveField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      console.log('Creating schema:', formData);
      const newSchema = await createSchema(formData);
      console.log('Schema created successfully:', newSchema);

      setSuccess(true);
      setTimeout(() => {
        navigate('/components/schema');
      }, 2000);
    } catch (err) {
      console.error('Failed to create schema:', err);
      setError(err instanceof Error ? err.message : 'Failed to create schema');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/components/schema');
  };

  const fieldTypes: { value: SchemaFieldType; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'select', label: 'Select' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'date', label: 'Date' },
  ];

  if (success) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="success" sx={{ mb: 3 }}>
          Schema created successfully! Redirecting to schema management...
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 3 }}
      >
        <Link
          underline="hover"
          color="inherit"
          onClick={() => navigate('/')}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
        >
          <DashboardIcon fontSize="small" />
          Dashboard
        </Link>
        <Link
          underline="hover"
          color="inherit"
          onClick={() => navigate('/components/schema')}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
        >
          <SchemaIcon fontSize="small" />
          Schema Management
        </Link>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AddIcon fontSize="small" />
          Create Schema
        </Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Box display="flex" alignItems="center" mb={4}>
        <IconButton
          onClick={handleCancel}
          sx={{ mr: 2 }}
          aria-label="Go back to schema management"
        >
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Create New Schema
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Define a new component type schema with custom fields and validation rules.
          </Typography>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Schema Form */}
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <Typography variant="h6" gutterBottom>
            Basic Information
          </Typography>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Schema Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                placeholder="e.g., Bridge Beam Components"
                helperText="Descriptive name for this schema type"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_default}
                    onChange={(e) => handleInputChange('is_default', e.target.checked)}
                  />
                }
                label="Set as Default Schema"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the purpose and use cases for this schema..."
                helperText="Optional description to help users understand when to use this schema"
              />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 4 }} />

          {/* Fields Section */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              Schema Fields ({formData.fields.length})
            </Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddField}
              variant="outlined"
            >
              Add Field
            </Button>
          </Box>

          {formData.fields.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              No fields defined yet. Click "Add Field" to start building your schema.
            </Alert>
          ) : (
            <Box sx={{ mb: 4 }}>
              {formData.fields.map((field, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Typography variant="subtitle1" fontWeight={500}>
                        Field {index + 1}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveField(index)}
                        color="error"
                        aria-label={`Remove field ${index + 1}`}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Field Name"
                          value={field.field_name}
                          onChange={(e) => handleFieldChange(index, 'field_name', e.target.value)}
                          required
                          placeholder="e.g., length, material"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          select
                          label="Field Type"
                          value={field.field_type}
                          onChange={(e) => handleFieldChange(index, 'field_type', e.target.value as SchemaFieldType)}
                          SelectProps={{ native: true }}
                        >
                          {fieldTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={8}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Help Text"
                          value={field.help_text}
                          onChange={(e) => handleFieldChange(index, 'help_text', e.target.value)}
                          placeholder="Instructions for users filling this field"
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.is_required}
                              onChange={(e) => handleFieldChange(index, 'is_required', e.target.checked)}
                              size="small"
                            />
                          }
                          label="Required"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {/* Action Buttons */}
          <Box display="flex" gap={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Schema'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default SchemaCreatePage;