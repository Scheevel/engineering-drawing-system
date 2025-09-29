/**
 * Field Template Selector Component
 *
 * Provides interface for browsing, previewing, and applying predefined
 * field templates to schema designs.
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Box,
  Stack,
  IconButton,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  Collapse,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as PreviewIcon,
  Add as AddIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Engineering as EngineeringIcon,
  Business as BusinessIcon,
  Build as BuildIcon,
  Category as CategoryIcon,
  Star as RequiredIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { SchemaTemplate, ComponentSchemaFieldCreate, FIELD_TYPE_LABELS } from '../../types/schema';
import { FieldTemplateService } from '../../services/fieldTemplates';

interface FieldTemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onApplyTemplate: (fields: ComponentSchemaFieldCreate[]) => void;
  currentFieldCount?: number;
  maxFields?: number;
  disabled?: boolean;
}

const CATEGORY_ICONS = {
  engineering: <EngineeringIcon />,
  construction: <BuildIcon />,
  manufacturing: <BusinessIcon />,
  general: <CategoryIcon />,
};

const CATEGORY_COLORS = {
  engineering: 'primary',
  construction: 'secondary',
  manufacturing: 'warning',
  general: 'info',
} as const;

export const FieldTemplateSelector: React.FC<FieldTemplateSelectorProps> = ({
  open,
  onClose,
  onApplyTemplate,
  currentFieldCount = 0,
  maxFields,
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<SchemaTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Get all templates and categories
  const allTemplates = useMemo(() => FieldTemplateService.getTemplates(), []);
  const categories = useMemo(() => FieldTemplateService.getCategories(), []);

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    let templates = allTemplates;

    // Filter by category
    if (selectedCategory !== 'all') {
      templates = templates.filter(template => template.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      templates = FieldTemplateService.searchTemplates(searchQuery);
    }

    return templates;
  }, [allTemplates, selectedCategory, searchQuery]);

  // Get template preview data
  const templatePreview = useMemo(() => {
    if (!selectedTemplate) return null;
    return FieldTemplateService.getTemplatePreview(selectedTemplate.id);
  }, [selectedTemplate]);

  const handleTemplateSelect = (template: SchemaTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleApplyTemplate = () => {
    if (!selectedTemplate) return;

    try {
      const fields = FieldTemplateService.applyTemplate(
        selectedTemplate.id,
        currentFieldCount + 1
      );
      onApplyTemplate(fields);
      onClose();
    } catch (error) {
      console.error('Error applying template:', error);
    }
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setShowPreview(false);
    setSearchQuery('');
    setSelectedCategory('all');
    onClose();
  };

  const canApplyTemplate = () => {
    if (!selectedTemplate || disabled) return false;
    if (maxFields) {
      return currentFieldCount + selectedTemplate.fields.length <= maxFields;
    }
    return true;
  };

  const getFieldLimitWarning = () => {
    if (!selectedTemplate || !maxFields) return null;
    const newTotal = currentFieldCount + selectedTemplate.fields.length;
    if (newTotal > maxFields) {
      return `Adding this template would exceed the field limit (${newTotal}/${maxFields})`;
    }
    return null;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: '80vh' } }}
    >
      <DialogTitle>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6">Field Templates</Typography>
            <Typography variant="body2" color="text.secondary">
              Choose from predefined field templates to quickly build your schema
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <ExpandLessIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          {/* Search and Filter Bar */}
          <Box sx={{ p: 2, pb: 0 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                sx={{ flexGrow: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>
          </Box>

          {/* Category Tabs */}
          <Tabs
            value={selectedCategory}
            onChange={(_, value) => setSelectedCategory(value)}
            sx={{ px: 2 }}
          >
            <Tab label="All" value="all" />
            {categories.map((category) => (
              <Tab
                key={category}
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    {CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]}
                    <span style={{ textTransform: 'capitalize' }}>{category}</span>
                  </Stack>
                }
                value={category}
              />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ display: 'flex', height: 'calc(80vh - 180px)' }}>
          {/* Template List */}
          <Box sx={{ width: showPreview ? '50%' : '100%', borderRight: showPreview ? 1 : 0, borderColor: 'divider' }}>
            <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
              {filteredTemplates.length === 0 ? (
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    {searchQuery ? 'No templates match your search' : 'No templates found'}
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {filteredTemplates.map((template) => (
                    <Grid item xs={12} sm={showPreview ? 12 : 6} md={showPreview ? 12 : 4} key={template.id}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          border: selectedTemplate?.id === template.id ? 2 : 1,
                          borderColor: selectedTemplate?.id === template.id
                            ? 'primary.main'
                            : 'divider',
                          '&:hover': {
                            boxShadow: 2,
                            transform: 'translateY(-1px)',
                          },
                        }}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <CardContent sx={{ pb: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="h6" gutterBottom>
                                {template.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {template.description}
                              </Typography>
                            </Box>
                            {template.is_system_template && (
                              <Chip
                                label="System"
                                size="small"
                                color={CATEGORY_COLORS[template.category as keyof typeof CATEGORY_COLORS]}
                                variant="outlined"
                              />
                            )}
                          </Stack>

                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                            <Badge badgeContent={template.fields.length} color="primary">
                              <Typography variant="caption" color="text.secondary">
                                Fields
                              </Typography>
                            </Badge>
                            <Badge
                              badgeContent={template.fields.filter(f => f.is_required).length}
                              color="warning"
                            >
                              <RequiredIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                            </Badge>
                            {template.usage_count > 0 && (
                              <Typography variant="caption" color="text.secondary">
                                Used {template.usage_count} times
                              </Typography>
                            )}
                          </Stack>
                        </CardContent>

                        <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
                          <Button
                            size="small"
                            startIcon={<PreviewIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTemplateSelect(template);
                            }}
                          >
                            Preview
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<AddIcon />}
                            disabled={!canApplyTemplate() || selectedTemplate?.id !== template.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyTemplate();
                            }}
                          >
                            Apply
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </Box>

          {/* Template Preview Panel */}
          <Collapse in={showPreview} orientation="horizontal">
            <Box sx={{ width: '50%', height: '100%', overflow: 'auto' }}>
              {templatePreview && (
                <Box sx={{ p: 2 }}>
                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Typography variant="h6">Template Preview</Typography>
                    <IconButton onClick={() => setShowPreview(false)} size="small">
                      <ExpandMoreIcon />
                    </IconButton>
                  </Stack>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {templatePreview.template.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {templatePreview.template.description}
                    </Typography>

                    {/* Template Statistics */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                          <Typography variant="h5" color="primary">
                            {templatePreview.fieldCount}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Total Fields
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                          <Typography variant="h5" color="warning.main">
                            {templatePreview.requiredFieldCount}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Required
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                          <Typography variant="h5" color="info.main">
                            {templatePreview.fieldTypes.length}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Field Types
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Field Type Breakdown */}
                    <Typography variant="subtitle2" gutterBottom>
                      Field Types
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                      {templatePreview.fieldTypes.map((typeInfo) => (
                        <Chip
                          key={typeInfo.type}
                          label={`${FIELD_TYPE_LABELS[typeInfo.type as keyof typeof FIELD_TYPE_LABELS]} (${typeInfo.count})`}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </Box>

                  {/* Field List */}
                  <Typography variant="subtitle2" gutterBottom>
                    Fields in Template
                  </Typography>
                  <List dense>
                    {templatePreview.template.fields.map((field, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          {field.is_required ? (
                            <RequiredIcon color="warning" fontSize="small" />
                          ) : (
                            <CheckCircleIcon color="action" fontSize="small" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={field.field_name}
                          secondary={
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip
                                label={FIELD_TYPE_LABELS[field.field_type as keyof typeof FIELD_TYPE_LABELS]}
                                size="small"
                                variant="outlined"
                              />
                              {field.help_text && (
                                <Tooltip title={field.help_text}>
                                  <InfoIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                </Tooltip>
                              )}
                            </Stack>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>

                  {/* Warnings */}
                  {getFieldLimitWarning() && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      {getFieldLimitWarning()}
                    </Alert>
                  )}
                </Box>
              )}
            </Box>
          </Collapse>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleApplyTemplate}
          variant="contained"
          disabled={!selectedTemplate || !canApplyTemplate()}
          startIcon={<AddIcon />}
        >
          {selectedTemplate
            ? `Apply Template (${selectedTemplate.fields.length} fields)`
            : 'Select Template'
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};