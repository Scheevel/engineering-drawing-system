/**
 * Schema Management Page Component
 *
 * Global schema management page that displays all schemas across projects.
 * Provides schema viewing, editing, and management capabilities.
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Alert,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  DialogContentText,
  CircularProgress,
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  Dashboard as DashboardIcon,
  Schema as SchemaIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';

import SchemaListView from '../../components/schema-management/SchemaListView.tsx';
// import useSimpleNavigation from '../../simple-nav-hook';
import { getProjectSchemas, ComponentSchema, deleteSchema, duplicateSchema, getSchemaUsage } from '../../services/api.ts';
// import { schemaManagementService } from '../../services/schemaManagementService';

const SchemaManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // const { breadcrumbs } = useSimpleNavigation();
  const breadcrumbs: any[] = [];

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSchema, setSelectedSchema] = useState<ComponentSchema | null>(null);
  const [schemaUsageInfo, setSchemaUsageInfo] = useState<{ components_using_schema: number; component_ids: string[] } | null>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // For global schemas, we'll use a demo project to trigger default schema fallback
  // This allows users to see the default schema when visiting /schemas
  const {
    data: schemasResponse,
    isLoading,
    error,
    refetch: refetchSchemas,
  } = useQuery(
    ['global-schemas', 'demo-project'],
    () => getProjectSchemas('demo-project'),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const schemas = schemasResponse?.schemas || [];
  const globalMetrics = null; // Temporarily disable metrics until backend endpoint is available

  // Delete mutation
  const deleteMutation = useMutation(
    (schemaId: string) => deleteSchema(schemaId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['global-schemas']);
        refetchSchemas();
        setDeleteDialogOpen(false);
        setSelectedSchema(null);
        setSchemaUsageInfo(null);
      },
      onError: (error: any) => {
        setActionError(error?.response?.data?.detail || error.message || 'Failed to delete schema');
      },
    }
  );

  // Duplicate mutation
  const duplicateMutation = useMutation(
    ({ schemaId, newName }: { schemaId: string; newName?: string }) => duplicateSchema(schemaId, newName),
    {
      onSuccess: (newSchema) => {
        queryClient.invalidateQueries(['global-schemas']);
        refetchSchemas();
        setDuplicateDialogOpen(false);
        setSelectedSchema(null);
        setDuplicateName('');
        // Navigate to edit the new schema
        navigate(`/schemas/${newSchema.id}/edit`);
      },
      onError: (error: any) => {
        setActionError(error?.response?.data?.detail || error.message || 'Failed to duplicate schema');
      },
    }
  );

  const handleSchemaView = (schema: ComponentSchema) => {
    // Navigate to schema detail view
    navigate(`/schemas/${schema.id}`);
  };

  const handleSchemaEdit = (schema: ComponentSchema) => {
    // Navigate to schema edit view
    navigate(`/schemas/${schema.id}/edit`);
  };

  const handleSchemaCreate = () => {
    // Navigate to schema creation
    navigate('/schemas/create');
  };

  // FR-7: Handle schema deletion with dependency checking
  const handleSchemaDelete = async (schema: ComponentSchema) => {
    setSelectedSchema(schema);
    setActionError(null);

    // Check usage before showing dialog
    try {
      const usage = await getSchemaUsage(schema.id);
      setSchemaUsageInfo(usage);
      setDeleteDialogOpen(true);
    } catch (error: any) {
      setActionError(error?.response?.data?.detail || error.message || 'Failed to check schema usage');
    }
  };

  const confirmDelete = () => {
    if (selectedSchema) {
      deleteMutation.mutate(selectedSchema.id);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setSelectedSchema(null);
    setSchemaUsageInfo(null);
    setActionError(null);
  };

  // FR-6 AC 33: Handle schema duplication
  const handleSchemaDuplicate = (schema: ComponentSchema) => {
    setSelectedSchema(schema);
    setDuplicateName(`${schema.name} (Copy)`);
    setActionError(null);
    setDuplicateDialogOpen(true);
  };

  const confirmDuplicate = () => {
    if (selectedSchema) {
      duplicateMutation.mutate({
        schemaId: selectedSchema.id,
        newName: duplicateName || undefined,
      });
    }
  };

  const cancelDuplicate = () => {
    setDuplicateDialogOpen(false);
    setSelectedSchema(null);
    setDuplicateName('');
    setActionError(null);
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box mb={3}>
          <Skeleton variant="text" width="40%" height={40} />
          <Skeleton variant="text" width="60%" height={20} sx={{ mt: 1 }} />
        </Box>
        <Skeleton variant="rectangular" height={400} />
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
                href={crumb.href}
                onClick={(e) => {
                  e.preventDefault();
                  if (crumb.href) {
                    navigate(crumb.href);
                  }
                }}
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
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
        <Typography variant="h4" component="h1" gutterBottom>
          Schema Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage component type schemas across all projects. Create, edit, and organize your schema definitions.
        </Typography>
      </Box>

      {/* Global Metrics Alert */}
      {globalMetrics && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="body2" fontWeight={500}>
              Global Schema Overview
            </Typography>
            <Typography variant="body2">
              {globalMetrics.total_schemas} total schemas • {globalMetrics.active_schemas} active • {globalMetrics.default_schemas} default schemas
            </Typography>
          </Box>
        </Alert>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading global schema data: {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      )}

      {/* Schema List */}
      <SchemaListView
        schemas={schemas}
        usageStats={{}} // Would come from global usage stats
        isLoading={isLoading}
        error={error instanceof Error ? error : null}
        onSchemaView={handleSchemaView}
        onSchemaEdit={handleSchemaEdit}
        onSchemaCreate={handleSchemaCreate}
        onSchemaDelete={handleSchemaDelete}
        onSchemaDuplicate={handleSchemaDuplicate}
        allowEdit={true}
        allowCreate={true}
      />

      {/* Delete Confirmation Dialog (FR-7 AC 34-37) */}
      <Dialog open={deleteDialogOpen} onClose={cancelDelete} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            <Typography variant="h6">Delete Schema</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {actionError}
            </Alert>
          )}

          {selectedSchema && schemaUsageInfo && (
            <>
              <DialogContentText>
                Are you sure you want to delete the schema <strong>"{selectedSchema.name}"</strong>?
              </DialogContentText>

              {schemaUsageInfo.components_using_schema > 0 ? (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight={500} gutterBottom>
                    This schema is currently in use
                  </Typography>
                  <Typography variant="body2">
                    {schemaUsageInfo.components_using_schema} component{schemaUsageInfo.components_using_schema !== 1 ? 's are' : ' is'} using this schema.
                    You must reassign {schemaUsageInfo.components_using_schema !== 1 ? 'these components' : 'this component'} to another schema before deletion.
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    This schema is not currently in use. It can be safely deleted.
                  </Typography>
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} disabled={deleteMutation.isLoading}>
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={
              deleteMutation.isLoading ||
              !schemaUsageInfo ||
              schemaUsageInfo.components_using_schema > 0
            }
            startIcon={deleteMutation.isLoading ? <CircularProgress size={20} /> : undefined}
          >
            {deleteMutation.isLoading ? 'Deleting...' : 'Delete Schema'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Duplicate Schema Dialog (FR-6 AC 33) */}
      <Dialog open={duplicateDialogOpen} onClose={cancelDuplicate} maxWidth="sm" fullWidth>
        <DialogTitle>Duplicate Schema</DialogTitle>
        <DialogContent>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {actionError}
            </Alert>
          )}

          <DialogContentText sx={{ mb: 2 }}>
            Create a copy of <strong>"{selectedSchema?.name}"</strong>. Enter a name for the new schema.
          </DialogContentText>

          <TextField
            autoFocus
            fullWidth
            label="New Schema Name"
            value={duplicateName}
            onChange={(e) => setDuplicateName(e.target.value)}
            placeholder={`${selectedSchema?.name} (Copy)`}
            helperText="The duplicated schema will be editable and non-default."
            disabled={duplicateMutation.isLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDuplicate} disabled={duplicateMutation.isLoading}>
            Cancel
          </Button>
          <Button
            onClick={confirmDuplicate}
            color="primary"
            variant="contained"
            disabled={duplicateMutation.isLoading || !duplicateName.trim()}
            startIcon={duplicateMutation.isLoading ? <CircularProgress size={20} /> : undefined}
          >
            {duplicateMutation.isLoading ? 'Duplicating...' : 'Duplicate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SchemaManagementPage;