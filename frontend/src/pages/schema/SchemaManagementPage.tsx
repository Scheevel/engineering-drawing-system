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
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  Dashboard as DashboardIcon,
  Schema as SchemaIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';

import SchemaListView from '../../components/schema-management/SchemaListView.tsx';
// import useSimpleNavigation from '../../simple-nav-hook';
import { getProjectSchemas, ComponentSchema } from '../../services/api.ts';
// import { schemaManagementService } from '../../services/schemaManagementService';

const SchemaManagementPage: React.FC = () => {
  const navigate = useNavigate();
  // const { breadcrumbs } = useSimpleNavigation();
  const breadcrumbs: any[] = [];

  // For global schemas, we'll use a demo project to trigger default schema fallback
  // This allows users to see the default schema when visiting /schemas
  const {
    data: schemasResponse,
    isLoading,
    error,
  } = useQuery(
    ['global-schemas', 'demo-project'],
    () => getProjectSchemas('demo-project'),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const schemas = schemasResponse?.schemas || [];
  const globalMetrics = null; // Temporarily disable metrics until backend endpoint is available

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
        allowEdit={true}
        allowCreate={true}
      />
    </Container>
  );
};

export default SchemaManagementPage;