/**
 * Project Schema Page Component
 *
 * Project-specific schema management page that displays schemas for a specific project.
 * Provides comprehensive schema management capabilities within project context.
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Alert,
  Chip,
  Grid,
  Card,
  CardContent,
  Skeleton,
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  Dashboard as DashboardIcon,
  Folder as FolderIcon,
  Schema as SchemaIcon,
  Group as GroupIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from 'react-query';

import SchemaListView from '../../components/schema-management/SchemaListView.tsx';
import SchemaCreateDialog from '../../components/schema-management/SchemaCreateDialog.tsx';
import { getProject, getProjectSchemas, ComponentSchema, ComponentSchemaListResponse } from '../../services/api.ts';
// import { useSchemaManagement, useSchemaNavigation } from '../../hooks/schema';

const ProjectSchemaPage: React.FC = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Basic breadcrumbs - replace with custom hook later
  const breadcrumbs = [
    { label: 'Dashboard', href: '/', current: false },
    { label: 'Projects', href: '/projects', current: false },
    { label: 'Schema Management', href: '#', current: true },
  ];

  // Fetch project information
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useQuery(
    ['project', projectId],
    () => projectId ? getProject(projectId) : null,
    {
      enabled: !!projectId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch project schemas
  const {
    data: schemaResponse,
    isLoading: schemasLoading,
    error: schemasError,
    refetch: refetchSchemas,
  } = useQuery<ComponentSchemaListResponse>(
    ['project-schemas', projectId],
    () => projectId ? getProjectSchemas(projectId) : Promise.resolve({ schemas: [], total: 0 }),
    {
      enabled: !!projectId,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  const schemas = schemaResponse?.schemas || [];

  const isLoading = projectLoading || schemasLoading;
  const error = projectError || schemasError;

  // Calculate schema statistics
  const schemaCount = {
    total: schemas.length,
    active: schemas.filter(s => s.is_active).length,
  };
  const defaultSchema = schemas.find(s => s.is_default);
  const usageStats = {}; // Placeholder - would come from usage stats API

  const handleSchemaView = (schema: ComponentSchema) => {
    navigate(`/projects/${projectId}/schemas/${schema.id}`);
  };

  const handleSchemaEdit = (schema: ComponentSchema) => {
    navigate(`/projects/${projectId}/schemas/${schema.id}/edit`);
  };

  const handleSchemaCreate = () => {
    setCreateDialogOpen(true);
  };

  const handleCreateSuccess = (newSchema: ComponentSchema) => {
    refetchSchemas(); // Refresh the schema list
    // Optionally navigate to the new schema
    navigate(`/projects/${projectId}/schemas/${newSchema.id}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box mb={3}>
          <Skeleton variant="text" width="60%" height={20} />
          <Skeleton variant="text" width="50%" height={40} sx={{ mt: 1 }} />
          <Skeleton variant="text" width="70%" height={20} sx={{ mt: 1 }} />
        </Box>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="80%" height={30} />
                  <Skeleton variant="text" width="60%" height={20} sx={{ mt: 1 }} />
                  <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" height={400} />
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="error">
          Error loading project schemas: {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      </Container>
    );
  }

  // Project not found
  if (!project && !projectLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="error">
          Project not found. Please check the project ID and try again.
        </Alert>
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
                {index === 1 && <FolderIcon fontSize="small" />}
                {index === 2 && <FolderIcon fontSize="small" />}
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </Breadcrumbs>

      {/* Page Header */}
      <Box mb={4}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Typography variant="h4" component="h1">
            Schema Management
          </Typography>
          <Chip
            label={project?.name || 'Loading...'}
            color="primary"
            variant="outlined"
            size="medium"
          />
        </Box>
        <Typography variant="body1" color="text.secondary">
          Manage component type schemas for {project?.name}. Define how components are structured and validated.
        </Typography>
      </Box>

      {/* Project Schema Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <SchemaIcon color="primary" />
                <Box>
                  <Typography variant="h6">{schemaCount.total}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Schemas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <GroupIcon color="success" />
                <Box>
                  <Typography variant="h6">{schemaCount.active}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Schemas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <StarIcon color="warning" />
                <Box>
                  <Typography variant="h6">
                    {defaultSchema ? 1 : 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Default Schema
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <GroupIcon color="info" />
                <Box>
                  <Typography variant="h6">
                    {Object.values(usageStats).reduce((total, stat) => total + stat.component_count, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Components Using Schemas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Default Schema Alert */}
      {defaultSchema && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="body2" fontWeight={500}>
              Default Schema: {defaultSchema.name}
            </Typography>
            <Typography variant="body2">
              This schema will be used for new components when no specific schema is selected.
            </Typography>
          </Box>
        </Alert>
      )}

      {/* Schema List */}
      <SchemaListView
        schemas={schemas}
        usageStats={usageStats}
        isLoading={schemasLoading}
        error={schemasError instanceof Error ? schemasError : null}
        onSchemaView={handleSchemaView}
        onSchemaEdit={handleSchemaEdit}
        onSchemaCreate={handleSchemaCreate}
        allowEdit={true}
        allowCreate={true}
      />

      {/* Schema Creation Dialog */}
      <SchemaCreateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
        projectId={projectId}
        defaultToGlobal={false}
      />
    </Container>
  );
};

export default ProjectSchemaPage;