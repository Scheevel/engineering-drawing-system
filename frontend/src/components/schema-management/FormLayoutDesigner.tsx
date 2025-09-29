/**
 * Form Layout Designer Component
 *
 * Provides visual interface for designing form layouts with multi-column support,
 * responsive breakpoints, field positioning, and real-time preview functionality.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Slider,
  Grid,
  Paper,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Tooltip,
  Chip,
  Avatar,
  Badge,
  ToggleButton,
  ToggleButtonGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  GridView as GridIcon,
  ViewColumn as ColumnIcon,
  ViewStream as StreamIcon,
  Tablet as TabletIcon,
  PhoneAndroid as MobileIcon,
  Computer as DesktopIcon,
  Preview as PreviewIcon,
  Settings as SettingsIcon,
  Save as SaveIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  ContentCopy as CopyIcon,
  RestartAlt as ResetIcon,
  Tune as TuneIcon,
  AspectRatio as AspectRatioIcon,
  SpaceBar as SpacingIcon,
  FormatAlignLeft as AlignLeftIcon,
  FormatAlignCenter as AlignCenterIcon,
  FormatAlignRight as AlignRightIcon,
  ExpandMore as ExpandMoreIcon,
  Palette as PaletteIcon,
  ViewQuilt as LayoutIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { SchemaFieldType } from '../../services/api';

const ResponsiveGridLayout = WidthProvider(Responsive);

export interface FieldLayoutConfig {
  fieldId: string;
  gridPosition: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  responsive: {
    lg: GridPosition;
    md: GridPosition;
    sm: GridPosition;
    xs: GridPosition;
  };
  styling: FieldStyling;
  alignment: 'left' | 'center' | 'right';
  labelPosition: 'top' | 'left' | 'inside' | 'hidden';
}

export interface GridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FieldStyling {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  margin?: number;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
}

export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  layout: Record<string, FieldLayoutConfig>;
  metadata: {
    columns: number;
    responsive: boolean;
    preview: string;
    tags: string[];
  };
}

export interface ComponentSchemaField {
  id: string;
  field_name: string;
  field_type: SchemaFieldType;
  field_config: Record<string, any>;
  help_text?: string;
  is_required: boolean;
  is_active: boolean;
  display_order: number;
  groupId?: string;
}

export interface FormLayoutDesignerProps {
  fields: ComponentSchemaField[];
  initialLayout?: Record<string, FieldLayoutConfig>;
  onLayoutChange: (layout: Record<string, FieldLayoutConfig>) => void;
  maxColumns?: number;
  showResponsivePreview?: boolean;
  allowTemplates?: boolean;
  readOnly?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`layout-tabpanel-${index}`}
      aria-labelledby={`layout-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    id: 'single_column',
    name: 'Single Column',
    description: 'Simple single-column layout for straightforward forms',
    category: 'Basic',
    layout: {},
    metadata: {
      columns: 1,
      responsive: true,
      preview: 'Single column stacked layout',
      tags: ['simple', 'mobile-friendly'],
    },
  },
  {
    id: 'two_column',
    name: 'Two Column',
    description: 'Two-column layout for efficient space usage',
    category: 'Basic',
    layout: {},
    metadata: {
      columns: 2,
      responsive: true,
      preview: 'Side-by-side field layout',
      tags: ['compact', 'desktop'],
    },
  },
  {
    id: 'engineering_form',
    name: 'Engineering Form',
    description: 'Optimized layout for engineering data entry',
    category: 'Engineering',
    layout: {},
    metadata: {
      columns: 3,
      responsive: true,
      preview: 'Grouped engineering fields with logical flow',
      tags: ['engineering', 'technical', 'grouped'],
    },
  },
  {
    id: 'inspection_checklist',
    name: 'Inspection Checklist',
    description: 'Vertical layout optimized for inspection workflows',
    category: 'Quality Control',
    layout: {},
    metadata: {
      columns: 1,
      responsive: true,
      preview: 'Checklist-style vertical layout',
      tags: ['inspection', 'vertical', 'checklist'],
    },
  },
];

const BREAKPOINTS = {
  lg: 1200,
  md: 996,
  sm: 768,
  xs: 480,
};

const COLS = {
  lg: 12,
  md: 10,
  sm: 6,
  xs: 4,
};

const FIELD_TYPE_HEIGHTS = {
  'text': 1,
  'number': 1,
  'select': 1,
  'date': 1,
  'checkbox': 1,
  'textarea': 2,
};

const FormLayoutDesigner: React.FC<FormLayoutDesignerProps> = ({
  fields,
  initialLayout = {},
  onLayoutChange,
  maxColumns = 12,
  showResponsivePreview = true,
  allowTemplates = true,
  readOnly = false,
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('lg');
  const [layoutConfig, setLayoutConfig] = useState<Record<string, FieldLayoutConfig>>(initialLayout);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({
    columns: 12,
    rowHeight: 60,
    margin: [10, 10],
    containerPadding: [10, 10],
    compactType: 'vertical' as 'vertical' | 'horizontal' | null,
  });

  const layoutRef = useRef<any>(null);

  // Initialize layout for fields that don't have configuration
  useEffect(() => {
    const newLayoutConfig = { ...layoutConfig };
    let hasChanges = false;

    fields.forEach((field, index) => {
      if (!newLayoutConfig[field.id]) {
        const defaultHeight = FIELD_TYPE_HEIGHTS[field.field_type as keyof typeof FIELD_TYPE_HEIGHTS] || 1;
        const position = {
          x: 0,
          y: index * defaultHeight,
          w: 6,
          h: defaultHeight,
        };

        newLayoutConfig[field.id] = {
          fieldId: field.id,
          gridPosition: position,
          responsive: {
            lg: position,
            md: { ...position, w: 5 },
            sm: { ...position, w: 6 },
            xs: { ...position, w: 4 },
          },
          styling: {
            padding: 8,
            margin: 4,
            borderRadius: 4,
          },
          alignment: 'left',
          labelPosition: 'top',
        };
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setLayoutConfig(newLayoutConfig);
    }
  }, [fields, layoutConfig]);

  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  }, []);

  const handleBreakpointChange = useCallback((event: React.MouseEvent<HTMLElement>, newBreakpoint: string | null) => {
    if (newBreakpoint) {
      setCurrentBreakpoint(newBreakpoint);
    }
  }, []);

  const handleLayoutChange = useCallback((layout: any[], allLayouts: any) => {
    if (readOnly) return;

    const updatedConfig = { ...layoutConfig };

    layout.forEach((item) => {
      if (updatedConfig[item.i]) {
        updatedConfig[item.i].gridPosition = {
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
        };
        updatedConfig[item.i].responsive[currentBreakpoint as keyof typeof updatedConfig[string]['responsive']] = {
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
        };
      }
    });

    setLayoutConfig(updatedConfig);
  }, [layoutConfig, currentBreakpoint, readOnly]);

  const handleFieldSelect = useCallback((fieldId: string) => {
    setSelectedField(fieldId);
    setShowSettingsDialog(true);
  }, []);

  const handleFieldStylingChange = useCallback((fieldId: string, styling: Partial<FieldStyling>) => {
    const updatedConfig = {
      ...layoutConfig,
      [fieldId]: {
        ...layoutConfig[fieldId],
        styling: {
          ...layoutConfig[fieldId]?.styling,
          ...styling,
        },
      },
    };
    setLayoutConfig(updatedConfig);
  }, [layoutConfig]);

  const handleSaveLayout = useCallback(() => {
    onLayoutChange(layoutConfig);
  }, [layoutConfig, onLayoutChange]);

  const handleApplyTemplate = useCallback((template: LayoutTemplate) => {
    // Apply template logic here - for now, just reset to auto-layout
    const autoLayout: Record<string, FieldLayoutConfig> = {};
    const columnsPerRow = template.metadata.columns;

    fields.forEach((field, index) => {
      const row = Math.floor(index / columnsPerRow);
      const col = index % columnsPerRow;
      const fieldWidth = Math.floor(12 / columnsPerRow);
      const defaultHeight = FIELD_TYPE_HEIGHTS[field.field_type as keyof typeof FIELD_TYPE_HEIGHTS] || 1;

      const position = {
        x: col * fieldWidth,
        y: row * defaultHeight,
        w: fieldWidth,
        h: defaultHeight,
      };

      autoLayout[field.id] = {
        fieldId: field.id,
        gridPosition: position,
        responsive: {
          lg: position,
          md: { ...position, w: Math.min(fieldWidth + 1, 10) },
          sm: { ...position, w: 6 },
          xs: { ...position, w: 4 },
        },
        styling: {
          padding: 8,
          margin: 4,
          borderRadius: 4,
        },
        alignment: 'left',
        labelPosition: 'top',
      };
    });

    setLayoutConfig(autoLayout);
    setShowTemplateDialog(false);
  }, [fields]);

  const generateGridItems = () => {
    return fields.map((field) => {
      const fieldConfig = layoutConfig[field.id];
      if (!fieldConfig) return null;

      const isSelected = selectedField === field.id;

      return (
        <div
          key={field.id}
          className={`layout-field ${isSelected ? 'selected' : ''}`}
          onClick={() => !readOnly && handleFieldSelect(field.id)}
          style={{
            border: isSelected ? '2px solid #1976d2' : '1px solid #e0e0e0',
            borderRadius: fieldConfig.styling.borderRadius || 4,
            backgroundColor: fieldConfig.styling.backgroundColor || '#f9f9f9',
            padding: fieldConfig.styling.padding || 8,
            cursor: readOnly ? 'default' : 'pointer',
            overflow: 'hidden',
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="caption" color="primary" fontWeight="bold">
              {field.field_name}
            </Typography>
            <Chip
              label={field.field_type}
              size="small"
              variant="outlined"
              style={{ fontSize: '0.6rem', height: '16px' }}
            />
          </Box>

          {fieldConfig.labelPosition === 'top' && (
            <Typography variant="caption" color="text.secondary" display="block">
              Label
            </Typography>
          )}

          <Box
            sx={{
              bgcolor: 'white',
              border: '1px solid #ddd',
              borderRadius: 1,
              p: 0.5,
              minHeight: '24px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Typography variant="caption" color="text.disabled">
              {field.field_type === 'textarea' ? 'Multi-line input...' : 'Input field...'}
            </Typography>
          </Box>

          {field.help_text && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', mt: 0.5 }}>
              {field.help_text.substring(0, 50)}...
            </Typography>
          )}
        </div>
      );
    }).filter(Boolean);
  };

  const getCurrentLayout = () => {
    return fields.map((field) => {
      const fieldConfig = layoutConfig[field.id];
      if (!fieldConfig) return null;

      const position = fieldConfig.responsive[currentBreakpoint as keyof typeof fieldConfig.responsive] || fieldConfig.gridPosition;
      return {
        i: field.id,
        x: position.x,
        y: position.y,
        w: position.w,
        h: position.h,
        minW: 1,
        minH: 1,
        maxW: 12,
      };
    }).filter(Boolean);
  };

  const renderDesignView = () => (
    <TabPanel value={currentTab} index={0}>
      <Box mb={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="subtitle1">
              Layout Designer
            </Typography>
            <ToggleButtonGroup
              value={currentBreakpoint}
              exclusive
              onChange={handleBreakpointChange}
              size="small"
            >
              <ToggleButton value="lg">
                <DesktopIcon />
              </ToggleButton>
              <ToggleButton value="md">
                <TabletIcon />
              </ToggleButton>
              <ToggleButton value="sm">
                <TabletIcon />
              </ToggleButton>
              <ToggleButton value="xs">
                <MobileIcon />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {!readOnly && (
            <Box display="flex" gap={1}>
              {allowTemplates && (
                <Button
                  startIcon={<LayoutIcon />}
                  onClick={() => setShowTemplateDialog(true)}
                  variant="outlined"
                  size="small"
                >
                  Templates
                </Button>
              )}
              <Button
                startIcon={<TuneIcon />}
                onClick={() => setShowSettingsDialog(true)}
                variant="outlined"
                size="small"
              >
                Settings
              </Button>
              <Button
                startIcon={<SaveIcon />}
                onClick={handleSaveLayout}
                variant="contained"
                size="small"
              >
                Save Layout
              </Button>
            </Box>
          )}
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          {readOnly
            ? 'Layout preview mode. Layouts cannot be modified.'
            : `Design your form layout by dragging and resizing fields. Currently editing for ${currentBreakpoint.toUpperCase()} screens.`}
        </Alert>
      </Box>

      <Paper
        variant="outlined"
        sx={{
          p: 2,
          minHeight: '500px',
          backgroundColor: '#fafafa',
        }}
      >
        <ResponsiveGridLayout
          ref={layoutRef}
          className="layout"
          layouts={{ [currentBreakpoint]: getCurrentLayout() }}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={globalSettings.rowHeight}
          margin={globalSettings.margin}
          containerPadding={globalSettings.containerPadding}
          compactType={globalSettings.compactType}
          onLayoutChange={handleLayoutChange}
          isDraggable={!readOnly}
          isResizable={!readOnly}
          draggableHandle=".layout-field"
        >
          {generateGridItems()}
        </ResponsiveGridLayout>
      </Paper>
    </TabPanel>
  );

  const renderPreviewView = () => (
    <TabPanel value={currentTab} index={1}>
      <Alert severity="info" sx={{ mb: 2 }}>
        Form preview shows how the layout will appear to end users across different screen sizes.
      </Alert>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Form Preview
        </Typography>
        <Grid container spacing={2}>
          {fields.map((field) => {
            const fieldConfig = layoutConfig[field.id];
            if (!fieldConfig) return null;

            return (
              <Grid
                key={field.id}
                item
                xs={Math.round((fieldConfig.responsive.xs?.w || 4) * 3)}
                sm={Math.round((fieldConfig.responsive.sm?.w || 6) * 2)}
                md={Math.round((fieldConfig.responsive.md?.w || 5) * 1.2)}
                lg={Math.round((fieldConfig.responsive.lg?.w || 6) * 1)}
              >
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    {field.field_name}
                    {field.is_required && <span style={{ color: 'red' }}> *</span>}
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={`Enter ${field.field_name.toLowerCase()}`}
                    multiline={field.field_type === 'textarea'}
                    rows={field.field_type === 'textarea' ? 3 : 1}
                    type={field.field_type === 'number' ? 'number' : 'text'}
                    disabled={!field.is_active}
                  />
                  {field.help_text && (
                    <Typography variant="caption" color="text.secondary">
                      {field.help_text}
                    </Typography>
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    </TabPanel>
  );

  const renderResponsiveView = () => (
    <TabPanel value={currentTab} index={2}>
      <Typography variant="h6" gutterBottom>
        Responsive Breakpoints
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        Configure how your form adapts to different screen sizes. Each breakpoint can have different field arrangements.
      </Alert>

      <Grid container spacing={2}>
        {Object.entries(BREAKPOINTS).map(([breakpoint, width]) => (
          <Grid item xs={12} md={6} key={breakpoint}>
            <Card variant="outlined">
              <CardHeader
                title={
                  <Box display="flex" alignItems="center" gap={1}>
                    {breakpoint === 'lg' && <DesktopIcon />}
                    {breakpoint === 'md' && <TabletIcon />}
                    {breakpoint === 'sm' && <TabletIcon />}
                    {breakpoint === 'xs' && <MobileIcon />}
                    <Typography variant="subtitle1">
                      {breakpoint.toUpperCase()} ({width}px+)
                    </Typography>
                  </Box>
                }
                action={
                  <Chip
                    label={`${COLS[breakpoint as keyof typeof COLS]} columns`}
                    size="small"
                    variant="outlined"
                  />
                }
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Grid configuration for {breakpoint} screens with {COLS[breakpoint as keyof typeof COLS]} columns maximum.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </TabPanel>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Form Layout Designer
        </Typography>
        <Box display="flex" gap={1}>
          <Chip
            label={`${fields.length} fields`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`${Object.keys(layoutConfig).length} configured`}
            size="small"
            color="success"
            variant="outlined"
          />
        </Box>
      </Box>

      <Card variant="outlined">
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab icon={<GridIcon />} label="Design" />
            <Tab icon={<PreviewIcon />} label="Preview" />
            <Tab icon={<AspectRatioIcon />} label="Responsive" />
          </Tabs>
        </Box>

        {renderDesignView()}
        {renderPreviewView()}
        {renderResponsiveView()}
      </Card>

      {/* Template Selection Dialog */}
      <Dialog
        open={showTemplateDialog}
        onClose={() => setShowTemplateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Choose Layout Template</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {LAYOUT_TEMPLATES.map((template) => (
              <Grid item xs={12} md={6} key={template.id}>
                <Card
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => handleApplyTemplate(template)}
                >
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      {template.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {template.description}
                    </Typography>
                    <Box display="flex" gap={0.5} mt={1}>
                      <Chip label={template.category} size="small" variant="outlined" />
                      <Chip label={`${template.metadata.columns} columns`} size="small" variant="outlined" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTemplateDialog(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Field Settings Dialog */}
      <Dialog
        open={showSettingsDialog && !!selectedField}
        onClose={() => setShowSettingsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Field Layout Settings
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Advanced field styling and positioning options will be available in the next release.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettingsDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FormLayoutDesigner;