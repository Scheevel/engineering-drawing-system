import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Chip,
  Tabs,
  Tab,
  Grid,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  History as HistoryIcon,
  Edit as EditIcon,
  ViewModule as ViewDrawingIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getComponentDetails, updateComponent, validateComponent } from '../services/api.ts';
import ComponentBasicInfo from '../components/editor/ComponentBasicInfo.tsx';
import ComponentDimensions from '../components/editor/ComponentDimensions.tsx';
import ComponentSpecifications from '../components/editor/ComponentSpecifications.tsx';
import ComponentHistory from '../components/editor/ComponentHistory.tsx';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`component-tabpanel-${index}`}
      aria-labelledby={`component-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ComponentEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [currentTab, setCurrentTab] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [componentData, setComponentData] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Fetch component data
  const { 
    data: component, 
    isLoading, 
    error,
    refetch 
  } = useQuery(
    ['component', id],
    () => getComponentDetails(id!),
    { 
      enabled: !!id,
      onSuccess: (data) => {
        console.log('Component data loaded:', data);
        setComponentData(data);
      }
    }
  );

  // Also set componentData when component data changes (fallback)
  React.useEffect(() => {
    if (component && !componentData) {
      console.log('Setting componentData from component:', component);
      setComponentData(component);
    }
  }, [component, componentData]);

  // Update component mutation
  const updateMutation = useMutation(
    (updateData: any) => updateComponent(id!, updateData),
    {
      onSuccess: (data) => {
        setComponentData(data);
        setHasUnsavedChanges(false);
        setEditMode(false);
        queryClient.invalidateQueries(['component', id]);
        // Also invalidate related queries
        queryClient.invalidateQueries(['search']);
        queryClient.invalidateQueries(['drawing-components']);
      },
      onError: (error: any) => {
        console.error('Update failed:', error);
      }
    }
  );

  // Real-time validation
  const validateMutation = useMutation(
    (data: any) => validateComponent(id!, data),
    {
      onSuccess: (validation) => {
        setValidationErrors(validation.errors || []);
        setValidationWarnings(validation.warnings || []);
      },
      onError: () => {
        setValidationErrors(['Validation failed']);
        setValidationWarnings([]);
      }
    }
  );

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
      setPendingNavigation(`tab-${newValue}`);
      return;
    }
    setCurrentTab(newValue);
  };

  const handleDataChange = (newData: any) => {
    setComponentData(newData);
    setHasUnsavedChanges(true);
    
    // Debounced validation
    setTimeout(() => {
      validateMutation.mutate(newData);
    }, 500);
  };

  const handleSave = async () => {
    if (!componentData) return;
    
    try {
      // Extract only the fields that can be updated
      const updateData = {
        piece_mark: componentData.piece_mark,
        component_type: componentData.component_type,
        description: componentData.description,
        quantity: componentData.quantity,
        material_type: componentData.material_type,
        review_status: componentData.review_status,
      };
      
      updateMutation.mutate(updateData);
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
      setPendingNavigation('cancel');
      return;
    }
    setEditMode(false);
    setComponentData(component);
  };

  const handleUnsavedDialogClose = (saveChanges: boolean) => {
    if (saveChanges) {
      handleSave();
    } else {
      setHasUnsavedChanges(false);
      setComponentData(component);
      
      if (pendingNavigation?.startsWith('tab-')) {
        const tabIndex = parseInt(pendingNavigation.split('-')[1]);
        setCurrentTab(tabIndex);
      } else if (pendingNavigation === 'cancel') {
        setEditMode(false);
      }
    }
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  };

  const handleViewDrawing = () => {
    if (!component) return;
    navigate(`/drawing-viewer/${component.drawing_id}?highlight=${component.id}`);
  };

  const canSave = editMode && hasUnsavedChanges && validationErrors.length === 0;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !component) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load component details. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Breadcrumb Navigation */}
      <Box sx={{ mb: 2 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link 
            color="inherit" 
            href="#" 
            onClick={(e) => { e.preventDefault(); navigate('/search'); }}
          >
            Search
          </Link>
          <Link 
            color="inherit" 
            href="#" 
            onClick={(e) => { e.preventDefault(); navigate(`/drawing-viewer/${component.drawing_id}`); }}
          >
            {component.drawing_file_name}
          </Link>
          <Typography color="text.primary">
            {component.piece_mark}
          </Typography>
        </Breadcrumbs>
      </Box>

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Tooltip title="Back to Search">
                <IconButton onClick={() => navigate('/search')}>
                  <BackIcon />
                </IconButton>
              </Tooltip>
              
              <Box>
                <Typography variant="h4" component="h1">
                  {component.piece_mark}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  {component.component_type || 'Unknown Type'} 
                  {component.material_type && ` • ${component.material_type}`}
                </Typography>
              </Box>
              
              {component.confidence_score !== null && component.confidence_score !== undefined && (
                <Chip
                  label={`${Math.round(component.confidence_score * 100)}% Confidence`}
                  size="small"
                  color={component.confidence_score > 0.8 ? 'success' : 'warning'}
                />
              )}
              
              <Chip
                label={component.review_status || 'Pending'}
                size="small"
                color={component.review_status === 'approved' ? 'success' : 'default'}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {!editMode ? (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<ViewDrawingIcon />}
                    onClick={handleViewDrawing}
                  >
                    View Drawing
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={() => setEditMode(true)}
                  >
                    Edit Component
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={handleCancel}
                    disabled={updateMutation.isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={!canSave || updateMutation.isLoading}
                  >
                    {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              )}
            </Box>
          </Grid>
        </Grid>

        {/* Validation Messages */}
        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Validation Errors:</Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}
        
        {validationWarnings.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Warnings:</Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {validationWarnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </Alert>
        )}
      </Paper>

      {/* Tabbed Content */}
      <Paper>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange} aria-label="component editor tabs">
            <Tab label="Basic Information" />
            <Tab label={`Dimensions (${component.dimensions?.length || 0})`} />
            <Tab label={`Specifications (${component.specifications?.length || 0})`} />
            <Tab label="History" />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          {componentData ? (
            <ComponentBasicInfo
              component={componentData}
              editMode={editMode}
              onChange={handleDataChange}
            />
          ) : (
            <Box sx={{ p: 3 }}>
              <Typography>No component data available</Typography>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <ComponentDimensions
            componentId={id!}
            dimensions={componentData?.dimensions || []}
            editMode={editMode}
            onUpdate={refetch}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <ComponentSpecifications
            componentId={id!}
            specifications={componentData?.specifications || []}
            editMode={editMode}
            onUpdate={refetch}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <ComponentHistory
            componentId={id!}
          />
        </TabPanel>
      </Paper>

      {/* Unsaved Changes Dialog */}
      <Dialog open={showUnsavedDialog} onClose={() => setShowUnsavedDialog(false)}>
        <DialogTitle>Unsaved Changes</DialogTitle>
        <DialogContent>
          <Typography>
            You have unsaved changes. Would you like to save them before continuing?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleUnsavedDialogClose(false)}>
            Discard Changes
          </Button>
          <Button onClick={() => handleUnsavedDialogClose(true)} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComponentEditor;