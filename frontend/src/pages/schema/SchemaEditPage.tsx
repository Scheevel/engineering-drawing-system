/**
 * Schema Edit Page Component
 *
 * Dedicated page for editing component schemas with comprehensive field management,
 * validation, and history tracking. Provides a focused editing experience with
 * real-time validation and unsaved changes protection.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Alert,
  Skeleton,
  Paper,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  NavigateNext as NavigateNextIcon,
  Dashboard as DashboardIcon,
  Schema as SchemaIcon,
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  History as HistoryIcon,
  Preview as PreviewIcon,
  Warning as WarningIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSchema } from '../../services/schemaQueries.ts';
import { useSchemaForm, SchemaEditFormData } from '../../hooks/schema/useSchemaForm.ts';
import { useDefaultSchemaToggle } from '../../hooks/schema/useDefaultSchemaToggle.ts';
import { ComponentSchema, ComponentSchemaField, ComponentSchemaFieldCreate } from '../../services/api.ts';
import { useFieldCRUD } from '../../hooks/schema/useFieldCRUD.ts';
import { useSchemaDirtyState } from '../../hooks/schema/useSchemaDirtyState.ts';
import SchemaFormFields from '../../components/schema-management/SchemaFormFields.tsx';
import DefaultSchemaToggle from '../../components/schema-management/DefaultSchemaToggle.tsx';
import SchemaFieldList from '../../components/schema-management/SchemaFieldList.tsx';
import FieldCreationDialog from '../../components/schema-management/FieldCreationDialog.tsx';
import FieldEditForm from '../../components/schema-management/FieldEditForm.tsx';
import FieldDeletionDialog from '../../components/schema-management/FieldDeletionDialog.tsx';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`schema-edit-tabpanel-${index}`}
      aria-labelledby={`schema-edit-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const SchemaEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { schemaId } = useParams<{ schemaId: string }>();
  const [activeTab, setActiveTab] = useState(0);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Field management dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedField, setSelectedField] = useState<ComponentSchemaField | null>(null);

  // Fetch schema data
  const {
    data: schema,
    isLoading: schemaLoading,
    error: schemaError,
    refetch: refetchSchema,
  } = useSchema(schemaId || '', {
    enabled: !!schemaId,
  });

  // Form management
  const schemaForm = useSchemaForm<SchemaEditFormData>({
    mode: 'edit',
    schema,
    projectId: schema?.project_id,
    onSuccess: (updatedSchema) => {
      refetchSchema();
      // Show success message or redirect
    },
    onError: (error) => {
      console.error('Failed to update schema:', error);
    },
  });

  const {
    form,
    isValid,
    isDirty: formIsDirty,
    isSubmitting,
    handleSubmit,
    handleReset,
    validationErrors,
    nameError,
    descriptionError,
  } = schemaForm;

  // Unified dirty state tracking (FR-3: AC 11-16)
  const dirtyState = useSchemaDirtyState({
    initialSchema: schema,
    formIsDirty,
    onDirtyChange: (isDirty) => {
      // Optional: Could show indicator in UI
      console.log('Schema dirty state changed:', isDirty);
    },
  });

  const { isDirty, areFieldsDirty, markFieldsAsDirty, updateFieldsSnapshot, resetDirtyState } = dirtyState;

  // Field CRUD operations
  const fieldCRUD = useFieldCRUD();

  // Default schema toggle management
  const defaultToggle = useDefaultSchemaToggle(
    schema!,
    schema,
    {
      projectId: schema?.project_id,
      onDefaultChange: (newDefaultSchema) => {
        refetchSchema();
      },
    }
  );

  // Breadcrumbs
  const breadcrumbs = [
    { label: 'Dashboard', href: '/', current: false },
    { label: 'Schemas', href: '/schemas', current: false },
    { label: schema?.name || 'Loading...', href: '', current: true },
  ];

  // Navigation protection for unsaved changes
  const handleNavigation = (path: string) => {
    if (isDirty) {
      setPendingNavigation(path);
      setShowUnsavedDialog(true);
    } else {
      navigate(path);
    }
  };

  const handleConfirmNavigation = () => {
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  };

  const handleCancelNavigation = () => {
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  };

  // Handle tab changes
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Form submission
  const onSubmit = (data: SchemaEditFormData) => {
    handleSubmit(data);
  };

  // Handle save and continue editing
  const handleSaveAndContinue = () => {
    form.handleSubmit(onSubmit)();
  };

  // Handle save and return to list
  const handleSaveAndReturn = () => {
    form.handleSubmit((data) => {
      handleSubmit(data);
      // Navigate back after successful save
      setTimeout(() => {
        if (schema?.project_id) {
          navigate(`/projects/${schema.project_id}/schemas`);
        } else {
          navigate('/schemas');
        }
      }, 1000);
    })();
  };

  // Handle cancel with unsaved changes check
  const handleCancel = () => {
    if (isDirty) {
      setShowUnsavedDialog(true);
      setPendingNavigation('/schemas');
    } else {
      navigate('/schemas');
    }
  };

  // Field management handlers
  const handleCreateField = () => {
    setShowCreateDialog(true);
  };

  const handleEditField = (field: ComponentSchemaField) => {
    setSelectedField(field);
    setShowEditDialog(true);
  };

  const handleDeleteField = (fieldId: string) => {
    const field = schema?.fields?.find(f => f.id === fieldId);
    if (field) {
      setSelectedField(field);
      setShowDeleteDialog(true);
    }
  };

  const handleToggleFieldActive = (fieldId: string, isActive: boolean) => {
    if (!schemaId) return;
    fieldCRUD.toggleFieldActive.mutate({
      fieldId,
      isActive,
      options: {
        optimisticUpdate: true,
        onSuccess: () => {
          refetchSchema();
        },
        onError: (error) => {
          console.error('Failed to toggle field active status:', error);
        },
      },
    });
  };

  const handleFieldCreate = (fieldData: ComponentSchemaFieldCreate) => {
    if (!schemaId || !schema) return;

    // Mark fields as dirty (FR-3, AC 11)
    markFieldsAsDirty('added');

    fieldCRUD.createField.mutate({
      schemaId,
      fieldData,
      existingFields: schema.fields || [],
      options: {
        optimisticUpdate: true,
        onSuccess: () => {
          refetchSchema().then(() => {
            // Field is now saved to backend, reset dirty state
            resetDirtyState();
          });
          setShowCreateDialog(false);
        },
        onError: (error) => {
          console.error('Failed to create field:', error);
        },
      },
    });
  };

  const handleFieldEdit = (fieldId: string, updates: Partial<ComponentSchemaField>) => {
    if (!schema) return;

    // Mark fields as dirty (FR-3, AC 12)
    markFieldsAsDirty('modified');

    fieldCRUD.updateField.mutate({
      fieldId,
      updates,
      existingFields: schema.fields || [],
      options: {
        optimisticUpdate: true,
        onSuccess: () => {
          refetchSchema().then(() => {
            // Field is now saved to backend, reset dirty state
            resetDirtyState();
          });
          setShowEditDialog(false);
          setSelectedField(null);
        },
        onError: (error) => {
          console.error('Failed to update field:', error);
        },
      },
    });
  };

  const handleFieldDelete = (fieldId: string, deleteType: 'soft' | 'hard') => {
    if (!schema) return;

    // Mark fields as dirty (FR-3, AC 13)
    markFieldsAsDirty('removed');

    fieldCRUD.deleteField.mutate({
      fieldId,
      deleteType,
      options: {
        optimisticUpdate: true,
        onSuccess: () => {
          refetchSchema().then(() => {
            // Field is now saved to backend, reset dirty state
            resetDirtyState();
          });
          setShowDeleteDialog(false);
          setSelectedField(null);
        },
        onError: (error) => {
          console.error('Failed to delete field:', error);
        },
      },
    });
  };

  const handleCloseDialogs = () => {
    setShowCreateDialog(false);
    setShowEditDialog(false);
    setShowDeleteDialog(false);
    setSelectedField(null);
  };

  // Loading state
  if (schemaLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box mb={3}>
          <Skeleton variant="text" width="40%" height={40} />
          <Skeleton variant="text" width="60%" height={20} sx={{ mt: 1 }} />
        </Box>
        <Skeleton variant="rectangular" height={600} />
      </Container>
    );
  }

  // Error state
  if (schemaError || !schema) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {schemaError instanceof Error
            ? schemaError.message
            : 'Failed to load schema. The schema may not exist or you may not have permission to view it.'}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/schemas')}
        >
          Back to Schemas
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 3 }}
      >
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            {crumb.current ? (
              <Box display="flex" alignItems="center" gap={1}>
                <SchemaIcon fontSize="small" />
                <Typography color="text.primary" fontWeight={500}>
                  {crumb.label}
                </Typography>
              </Box>
            ) : (
              <Link
                underline="hover"
                color="inherit"
                onClick={(e) => {
                  e.preventDefault();
                  if (crumb.href) {
                    handleNavigation(crumb.href);
                  }
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                }}
              >
                {index === 0 && <DashboardIcon fontSize="small" />}
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </Breadcrumbs>

      {/* Page Header */}
      <Box mb={4}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton
              onClick={() => handleNavigation('/schemas')}
              size="small"
              sx={{ mr: 1 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" component="h1" fontWeight={600}>
              Edit Schema
            </Typography>

            {/* Schema Status Indicators */}
            <Box display="flex" gap={1}>
              {schema.is_default && (
                <Chip
                  icon={<StarIcon />}
                  label="Default Schema"
                  color="primary"
                  size="small"
                />
              )}
              <Chip
                label={schema.is_active ? 'Active' : 'Inactive'}
                color={schema.is_active ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={isSubmitting}
              startIcon={<CancelIcon />}
            >
              Cancel
            </Button>
            <LoadingButton
              variant="outlined"
              onClick={handleSaveAndContinue}
              loading={isSubmitting}
              disabled={!isValid || !formIsDirty}
              startIcon={<SaveIcon />}
            >
              Save
            </LoadingButton>
            <LoadingButton
              variant="contained"
              onClick={handleSaveAndReturn}
              loading={isSubmitting}
              disabled={!isValid || !formIsDirty}
              startIcon={<SaveIcon />}
            >
              Save & Return
            </LoadingButton>
          </Box>
        </Box>

        {/* Schema Summary */}
        <Typography variant="body1" color="text.secondary">
          Editing schema: <strong>{schema.name}</strong>
          {schema.description && ` • ${schema.description}`}
        </Typography>
      </Box>

      {/* Unsaved Changes Warning (FR-3, AC 16) */}
      {isDirty && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="body2" gutterBottom>
                You have unsaved changes. Remember to save your work before leaving this page.
              </Typography>
              {areFieldsDirty && (
                <Typography variant="caption" color="text.secondary">
                  Field changes: {dirtyState.changeTypes.join(', ')} ({dirtyState.fieldChangeCount} change{dirtyState.fieldChangeCount !== 1 ? 's' : ''})
                </Typography>
              )}
            </Box>
            <Button
              size="small"
              onClick={handleReset}
              disabled={isSubmitting}
            >
              Discard Changes
            </Button>
          </Box>
        </Alert>
      )}

      {/* Validation Errors Summary */}
      {Object.keys(validationErrors).length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            Please fix the following errors:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {Object.entries(validationErrors).map(([field, error]) => (
              <li key={field}>
                <Typography variant="body2">
                  <strong>{field}:</strong> {error}
                </Typography>
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Main Content */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Basic Information" />
          <Tab label="Fields" />
          <Tab label="Advanced Settings" />
          <Tab label="History" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          {/* Basic Information Tab */}
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <SchemaFormFields
              control={form.control}
              errors={validationErrors}
              mode="edit"
              schema={schema}
            />

            {/* Default Schema Toggle */}
            {schema.project_id && !schema.project_id.startsWith('global') && (
              <Card sx={{ mt: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Default Schema Settings
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        The default schema is automatically selected when creating new components.
                      </Typography>
                    </Box>
                    <DefaultSchemaToggle
                      schema={schema}
                      currentDefaultSchema={schema}
                      projectId={schema.project_id}
                      onDefaultChange={defaultToggle.handleDefaultChange}
                      variant="button"
                      size="large"
                    />
                  </Box>
                </CardContent>
              </Card>
            )}
          </form>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {/* Fields Tab */}
          <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Schema Fields
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage the data fields that components using this schema will capture.
                  {schema?.fields?.length ? ` This schema has ${schema.fields.length} field${schema.fields.length !== 1 ? 's' : ''}.` : ' No fields have been added yet.'}
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateField}
                disabled={fieldCRUD.createField.isLoading}
              >
                Add Field
              </Button>
            </Box>

            {/* Field List */}
            <SchemaFieldList
              fields={schema?.fields || []}
              loading={fieldCRUD.createField.isLoading || fieldCRUD.updateField.isLoading || fieldCRUD.deleteField.isLoading}
              onFieldEdit={handleEditField}
              onFieldDelete={handleDeleteField}
              onFieldToggleActive={handleToggleFieldActive}
              disabled={isSubmitting}
              showReorderHandles={false}
            />

            {/* Empty State */}
            {(!schema?.fields || schema.fields.length === 0) && (
              <Card sx={{ mt: 2, p: 4, textAlign: 'center' }}>
                <CardContent>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No Fields Yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Start building your schema by adding fields that will capture the data for components using this schema.
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleCreateField}
                    disabled={fieldCRUD.createField.isLoading}
                  >
                    Add Your First Field
                  </Button>
                </CardContent>
              </Card>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {/* Advanced Settings Tab */}
          <Typography variant="h6" gutterBottom>
            Advanced Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Advanced settings will be implemented in a future update.
          </Typography>
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          {/* History Tab */}
          <Typography variant="h6" gutterBottom>
            Change History
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Change history tracking will be implemented in a future update.
          </Typography>
        </TabPanel>
      </Paper>

      {/* Unsaved Changes Confirmation Dialog */}
      <Dialog
        open={showUnsavedDialog}
        onClose={handleCancelNavigation}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            <Typography variant="h6">
              Unsaved Changes
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            You have unsaved changes that will be lost if you leave this page.
            Are you sure you want to continue without saving?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelNavigation} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmNavigation} color="warning" variant="contained">
            Leave Without Saving
          </Button>
        </DialogActions>
      </Dialog>

      {/* Field Management Dialogs */}

      {/* Field Creation Dialog */}
      <FieldCreationDialog
        open={showCreateDialog}
        onClose={handleCloseDialogs}
        onSave={handleFieldCreate}
        existingFieldNames={schema?.fields?.map(f => f.field_name) || []}
        displayOrder={(schema?.fields?.length || 0) + 1}
        loading={fieldCRUD.createField.isLoading}
      />

      {/* Field Edit Dialog */}
      <FieldEditForm
        open={showEditDialog}
        onClose={handleCloseDialogs}
        onSave={handleFieldEdit}
        field={selectedField}
        existingFieldNames={schema?.fields?.filter(f => f.id !== selectedField?.id).map(f => f.field_name) || []}
        loading={fieldCRUD.updateField.isLoading}
        isFieldInUse={false} // TODO: Implement field usage checking
        usageWarning=""
      />

      {/* Field Deletion Dialog */}
      <FieldDeletionDialog
        open={showDeleteDialog}
        onClose={handleCloseDialogs}
        onDelete={handleFieldDelete}
        field={selectedField}
        usageInfo={{
          componentCount: 0, // TODO: Implement usage tracking
          componentNames: [],
          hasRequiredUsage: false,
          canSafelyDelete: true,
          warnings: [],
        }}
        loading={fieldCRUD.deleteField.isLoading}
      />
    </Container>
  );
};

export default SchemaEditPage;