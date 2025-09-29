import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Box,
  IconButton,
  Alert,
  Tabs,
  Tab,
  Divider,
  CircularProgress,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Visibility as ViewIcon,
  Help as HelpIcon,
  History as HistoryIcon,
  Straighten as DimensionsIcon,
  Settings as SpecsIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  Schema as SchemaIcon,
  ManageAccounts as ManageIcon,
  Pageview as ViewDrawingIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  FlexibleComponent,
  ComponentSchema,
  SchemaValidationResult,
  TypeLockStatus,
  getFlexibleComponent,
  updateFlexibleComponent,
  createFlexibleComponent,
  unlockComponentType,
  getProjectSchemas,
  FlexibleComponentCreate,
  FlexibleComponentUpdate,
} from '../../services/api.ts';

// Import schema navigation hook
import { useSchemaNavigation } from '../../hooks/schema/useSchemaNavigation.ts';
import { useSchemaChangeIntegration } from '../../hooks/schema/useSchemaChangeListener.ts';

// Import our new flexible components
import SchemaAwareForm from './SchemaAwareForm.tsx';
import TypeSelectionDropdown from './TypeSelectionDropdown.tsx';
import ContextualHelpPanel from './ContextualHelpPanel.tsx';

// Import existing editor components for additional tabs
import ComponentDimensions from '../editor/ComponentDimensions.tsx';
import ComponentHistory from '../editor/ComponentHistory.tsx';
import ComponentSpecifications from '../editor/ComponentSpecifications.tsx';

interface FlexibleComponentCardProps {
  componentId?: string;
  drawingId?: string;
  projectId?: string;
  open: boolean;
  onClose: () => void;
  mode?: 'view' | 'edit' | 'create';
  initialPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  if (value !== index) {
    return null;
  }

  return (
    <Box
      role="tabpanel"
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      sx={{ width: '100%' }}
    >
      {children}
    </Box>
  );
};

const FlexibleComponentCard: React.FC<FlexibleComponentCardProps> = ({
  componentId,
  drawingId,
  projectId,
  open,
  onClose,
  mode: initialMode = 'view',
  initialPosition,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const schemaNavigation = useSchemaNavigation();

  // Schema change event integration
  const { emitSchemaUpdated } = useSchemaChangeIntegration({
    projectId,
    onSchemaCreated: (event) => {
      // Refresh available schemas when a new schema is created
      queryClient.invalidateQueries(['project-schemas', projectId]);
    },
    onSchemaUpdated: (event) => {
      // Update current component if it uses the updated schema
      if (selectedSchema?.id === event.schemaId) {
        queryClient.invalidateQueries(['schema', event.schemaId]);
        queryClient.invalidateQueries(['project-schemas', projectId]);
      }
    },
    onSchemaDeleted: (event) => {
      // Handle schema deletion - switch to default schema if current is deleted
      if (selectedSchema?.id === event.schemaId && projectSchemas?.schemas.length) {
        const defaultSchema = projectSchemas.schemas.find(s => s.is_default) || projectSchemas.schemas[0];
        if (defaultSchema) {
          handleSchemaChange(defaultSchema.id, defaultSchema);
        }
      }
    },
  });

  const [mode, setMode] = useState(initialMode);
  const [tabValue, setTabValue] = useState(0);
  const [currentField, setCurrentField] = useState<string>();
  const [showHelp, setShowHelp] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [validation, setValidation] = useState<SchemaValidationResult>();
  const [selectedSchema, setSelectedSchema] = useState<ComponentSchema>();
  const [pendingSchemaId, setPendingSchemaId] = useState<string>();

  const isCreating = !componentId && mode === 'create';
  const isEditing = mode === 'edit' || isCreating;

  // Fetch component data
  const { data: component, isLoading, error } = useQuery(
    ['flexible-component', componentId],
    () => componentId ? getFlexibleComponent(componentId) : null,
    {
      enabled: open && !!componentId,
    }
  );

  // Fetch project schemas for creation mode
  const { data: projectSchemas } = useQuery(
    ['project-schemas', projectId],
    () => projectId ? getProjectSchemas(projectId) : null,
    {
      enabled: open && isCreating && !!projectId,
    }
  );

  // Update mutation
  const updateMutation = useMutation(
    (data: { id: string; updates: FlexibleComponentUpdate }) =>
      updateFlexibleComponent(data.id, data.updates),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['flexible-component', componentId]);
        queryClient.invalidateQueries(['component', componentId]); // Legacy cache
        setMode('view');
      },
    }
  );

  // Create mutation
  const createMutation = useMutation(
    (data: FlexibleComponentCreate) => createFlexibleComponent(data),
    {
      onSuccess: (newComponent) => {
        queryClient.invalidateQueries(['drawing-components']);
        onClose();
        // Optionally navigate to the new component
        if (newComponent.id) {
          navigate(`/component/${newComponent.id}`);
        }
      },
    }
  );

  // Unlock mutation
  const unlockMutation = useMutation(
    (componentId: string) => unlockComponentType(componentId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['flexible-component', componentId]);
      },
    }
  );

  // Initialize data when component loads
  useEffect(() => {
    if (component) {
      setFormValues(component.dynamic_data || {});
      setSelectedSchema(component.schema_info);
      setPendingSchemaId(component.schema_id);
    } else if (isCreating && projectSchemas?.schemas.length) {
      // Set default schema for new components
      const defaultSchema = projectSchemas.schemas.find(s => s.is_default) || projectSchemas.schemas[0];
      setSelectedSchema(defaultSchema);
      setPendingSchemaId(defaultSchema.id);
    }
  }, [component, projectSchemas, isCreating]);

  // Reset tab to Details when modal opens
  useEffect(() => {
    if (open) {
      setTabValue(0);
    }
  }, [open]);

  const handleSave = async () => {
    if (!validation?.is_valid) {
      return;
    }

    try {
      if (isCreating) {
        if (!drawingId) {
          throw new Error('Drawing ID is required for creating components');
        }

        await createMutation.mutateAsync({
          piece_mark: formValues.piece_mark || 'NEW-COMPONENT',
          drawing_id: drawingId,
          schema_id: pendingSchemaId,
          dynamic_data: formValues,
          coordinates: initialPosition,
        });
      } else if (componentId) {
        await updateMutation.mutateAsync({
          id: componentId,
          updates: {
            schema_id: pendingSchemaId,
            dynamic_data: formValues,
          },
        });
      }
    } catch (error) {
      console.error('Failed to save component:', error);
    }
  };

  const handleCancel = () => {
    if (isCreating) {
      onClose();
    } else {
      setMode('view');
      // Reset form to original values
      if (component) {
        setFormValues(component.dynamic_data || {});
        setSelectedSchema(component.schema_info);
        setPendingSchemaId(component.schema_id);
      }
    }
  };

  const handleSchemaChange = (schemaId: string, schema: ComponentSchema) => {
    setSelectedSchema(schema);
    setPendingSchemaId(schemaId);
    // Reset form values when schema changes
    setFormValues({});
  };

  const handleUnlock = async (componentId: string) => {
    try {
      await unlockMutation.mutateAsync(componentId);
    } catch (error) {
      console.error('Failed to unlock component:', error);
    }
  };

  const handleViewDrawing = () => {
    if (component?.drawing_id) {
      // Navigate to drawing viewer with component highlighting
      navigate(`/drawings/${component.drawing_id}?highlight=${componentId}`);
    } else if (drawingId) {
      // Fallback to drawingId prop if component.drawing_id not available
      navigate(`/drawings/${drawingId}?highlight=${componentId}`);
    }
  };

  // Schema management handlers
  const handleManageSchemas = () => {
    // Save current component context in sessionStorage for return navigation
    const componentContext = {
      componentId,
      drawingId,
      projectId,
      mode,
      timestamp: Date.now(),
    };
    sessionStorage.setItem('flexibleComponentContext', JSON.stringify(componentContext));

    // Navigate to schema management for the project
    if (projectId) {
      schemaNavigation.navigateToSchemas(projectId);
    } else {
      schemaNavigation.navigateToSchemas();
    }
  };

  const handleEditCurrentSchema = () => {
    if (selectedSchema) {
      // Save current component context
      const componentContext = {
        componentId,
        drawingId,
        projectId,
        mode,
        selectedSchemaId: selectedSchema.id,
        formValues,
        timestamp: Date.now(),
      };
      sessionStorage.setItem('flexibleComponentContext', JSON.stringify(componentContext));

      // Navigate to edit the current schema
      schemaNavigation.navigateToSchemaEdit(selectedSchema.id, projectId);
    }
  };

  // Schema change handler with real-time updates and event emission
  const handleSchemaChangeWithUpdates = (schemaId: string, schema: ComponentSchema) => {
    handleSchemaChange(schemaId, schema);

    // Emit schema update event for cross-component communication
    emitSchemaUpdated(schemaId, {
      componentId,
      previousSchemaId: selectedSchema?.id,
      newSchema: schema,
    });

    // Invalidate related caches for real-time updates
    queryClient.invalidateQueries(['project-schemas', projectId]);
    queryClient.invalidateQueries(['component-schemas']);
    queryClient.invalidateQueries(['schema', schemaId]);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <Box display="flex" justifyContent="center" alignItems="center" p={4}>
          <CircularProgress />
        </Box>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <Alert severity="error">
            Failed to load component: {error instanceof Error ? error.message : 'Unknown error'}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  const availableSchemas = projectSchemas?.schemas || (component?.schema_info ? [component.schema_info] : []);
  const lockStatus: TypeLockStatus = {
    is_locked: component?.is_type_locked || false,
    lock_reason: component?.is_type_locked ? 'Component contains data' : undefined,
    locked_fields: component?.dynamic_data ? Object.keys(component.dynamic_data).filter(k => component.dynamic_data[k]) : [],
    can_unlock: true,
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '70vh' }
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="between">
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="h6">
                {isCreating ? 'Create Component' :
                 isEditing ? 'Edit Component' : 'Component Details'}
              </Typography>

              {component && (
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip label={component.piece_mark} color="primary" />
                  {component.is_type_locked && (
                    <Chip
                      icon={<LockIcon />}
                      label="Locked"
                      color="warning"
                      size="small"
                    />
                  )}
                </Box>
              )}
            </Box>

            <Box display="flex" alignItems="center" gap={1}>
              <IconButton onClick={() => setShowHelp(!showHelp)}>
                <HelpIcon />
              </IconButton>
              <IconButton onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={3}>
            {/* Main Content Area */}
            <Grid item xs={showHelp ? 8 : 12}>
              {/* Schema Selection - Only show in edit/create mode */}
              {isEditing && (
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                      <Typography variant="h6">
                        Component Schema
                      </Typography>

                      {/* Schema Management Actions */}
                      <Box display="flex" gap={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<ManageIcon />}
                          onClick={handleManageSchemas}
                          disabled={updateMutation.isLoading || createMutation.isLoading}
                        >
                          Manage Schemas
                        </Button>

                        {selectedSchema && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={handleEditCurrentSchema}
                            disabled={updateMutation.isLoading || createMutation.isLoading}
                          >
                            Edit Schema
                          </Button>
                        )}
                      </Box>
                    </Box>

                    <TypeSelectionDropdown
                      componentId={componentId}
                      currentSchemaId={pendingSchemaId}
                      availableSchemas={availableSchemas}
                      lockStatus={lockStatus}
                      onSchemaChange={handleSchemaChangeWithUpdates}
                      onUnlock={handleUnlock}
                      disabled={updateMutation.isLoading || createMutation.isLoading}
                    />

                    {/* Schema validation feedback */}
                    {validation && !validation.is_valid && (
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        <Typography variant="body2" fontWeight={500}>
                          Schema Validation Issues:
                        </Typography>
                        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                          {validation.errors.slice(0, 3).map((error, idx) => (
                            <li key={idx} style={{ fontSize: '0.875rem' }}>
                              {error}
                            </li>
                          ))}
                          {validation.errors.length > 3 && (
                            <li style={{ fontSize: '0.875rem', fontStyle: 'italic' }}>
                              ... and {validation.errors.length - 3} more issues
                            </li>
                          )}
                        </ul>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Tabs for different sections */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs
                  value={tabValue}
                  onChange={(e, v) => {
                    // Fallback handler - should not be needed with custom onClick handlers
                    console.log('Material-UI onChange triggered:', tabValue, 'to', v);
                    setTabValue(v);
                  }}
                  aria-label="Component information tabs"
                >
                  <Tab
                    icon={<EditIcon />}
                    label="Details"
                    id="tab-0"
                    aria-controls="tabpanel-0"
                    onClick={() => {
                      console.log('Details tab clicked, setting tabValue to 0');
                      setTabValue(0);
                    }}
                  />
                  {!isCreating && (
                    <>
                      <Tab
                        icon={<DimensionsIcon />}
                        label="Dimensions"
                        id="tab-1"
                        aria-controls="tabpanel-1"
                        onClick={() => {
                          console.log('Dimensions tab clicked, setting tabValue to 1');
                          setTabValue(1);
                        }}
                      />
                      <Tab
                        icon={<SpecsIcon />}
                        label="Specifications"
                        id="tab-2"
                        aria-controls="tabpanel-2"
                        onClick={() => {
                          console.log('Specifications tab clicked, setting tabValue to 2');
                          setTabValue(2);
                        }}
                      />
                      <Tab
                        icon={<HistoryIcon />}
                        label="History"
                        id="tab-3"
                        aria-controls="tabpanel-3"
                        onClick={() => {
                          console.log('History tab clicked, setting tabValue to 3');
                          setTabValue(3);
                        }}
                      />
                    </>
                  )}
                </Tabs>
              </Box>

              {/* Tab Panels */}
              <TabPanel value={tabValue} index={0}>
                {/* System Information Section */}
                {!isCreating && component && (
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        System Information
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            Piece Mark
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {component.piece_mark}
                          </Typography>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary">
                            Drawing File
                          </Typography>
                          <Typography variant="body1">
                            {component.drawing_file_name || 'N/A'}
                          </Typography>
                        </Grid>

                        {(component.location_x !== null && component.location_x !== undefined &&
                          component.location_y !== null && component.location_y !== undefined) && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              Location on Drawing
                            </Typography>
                            <Typography variant="body1">
                              X: {Math.round(component.location_x)}, Y: {Math.round(component.location_y)}
                            </Typography>
                          </Grid>
                        )}

                        {component.confidence_score !== null && component.confidence_score !== undefined && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              Detection Confidence
                            </Typography>
                            <Chip
                              label={`${Math.round(component.confidence_score * 100)}%`}
                              size="small"
                              color={component.confidence_score > 0.8 ? 'success' : 'warning'}
                            />
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
                )}

                {/* Schema-Based Fields */}
                {selectedSchema ? (
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Component Details
                      </Typography>
                      <SchemaAwareForm
                        schema={selectedSchema}
                        initialValues={formValues}
                        onValuesChange={setFormValues}
                        onValidationChange={setValidation}
                        disabled={!isEditing}
                        showHelpText={!showHelp} // Show inline help if panel is closed
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <Alert severity="info">
                    {isCreating ? 'Please select a schema to begin creating the component.' :
                     'No schema selected. Component data may not display correctly.'}
                  </Alert>
                )}
              </TabPanel>

              {!isCreating && componentId && (
                <>
                  <TabPanel value={tabValue} index={1}>
                    <ComponentDimensions componentId={componentId} />
                  </TabPanel>

                  <TabPanel value={tabValue} index={2}>
                    <ComponentSpecifications componentId={componentId} />
                  </TabPanel>

                  <TabPanel value={tabValue} index={3}>
                    <ComponentHistory componentId={componentId} />
                  </TabPanel>
                </>
              )}
            </Grid>

            {/* Help Panel */}
            {showHelp && (
              <Grid item xs={4}>
                <ContextualHelpPanel
                  schema={selectedSchema}
                  currentField={currentField}
                  validationResult={validation}
                  position="sidebar"
                  collapsed={false}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions>
          <Box display="flex" justifyContent="between" width="100%">
            {/* Left side - Status info and actions */}
            <Box display="flex" alignItems="center" gap={1}>
              {validation && (
                <Chip
                  icon={validation.is_valid ? <UnlockIcon /> : <LockIcon />}
                  label={validation.is_valid ? 'Valid' : `${validation.errors.length} errors`}
                  color={validation.is_valid ? 'success' : 'error'}
                  size="small"
                />
              )}

              {/* View Drawing Button - only show for existing components */}
              {!isCreating && (component?.drawing_id || drawingId) && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ViewDrawingIcon />}
                  onClick={handleViewDrawing}
                  sx={{ ml: 1 }}
                >
                  View Drawing
                </Button>
              )}
            </Box>

            {/* Right side - Actions */}
            <Box display="flex" gap={1}>
              {isEditing ? (
                <>
                  <Button
                    onClick={handleCancel}
                    startIcon={<CancelIcon />}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={!validation?.is_valid || updateMutation.isLoading || createMutation.isLoading}
                  >
                    {isCreating ? 'Create' : 'Save'}
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={onClose}>
                    Close
                  </Button>
                  <Button
                    onClick={() => setMode('edit')}
                    variant="contained"
                    startIcon={<EditIcon />}
                  >
                    Edit
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Floating Help Panel for non-sidebar mode */}
      {showHelp && selectedSchema && (
        <ContextualHelpPanel
          schema={selectedSchema}
          currentField={currentField}
          validationResult={validation}
          position="bottom-left"
          onClose={() => setShowHelp(false)}
        />
      )}
    </>
  );
};

export default FlexibleComponentCard;