/**
 * Field Metadata Editor Component
 *
 * Provides comprehensive metadata management for schema fields including
 * documentation, versioning, usage tracking, and template management.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  LinearProgress,
  Avatar,
  Badge,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  History as HistoryIcon,
  Analytics as AnalyticsIcon,
  Description as DocumentationIcon,
  Label as TagIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ContentCopy as CopyIcon,
  Visibility as ViewIcon,
  Download as ExportIcon,
  Upload as ImportIcon,
  Star as FavoriteIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  TrendingUp as TrendIcon,
  Assessment as ReportIcon,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { SchemaFieldType } from '../../services/api';

export interface FieldMetadata {
  id: string;
  fieldId: string;
  version: number;
  documentation: {
    title: string;
    description: string;
    examples: string[];
    businessRules: string[];
    technicalNotes: string[];
    relatedFields: string[];
  };
  tags: string[];
  category: string;
  businessOwner?: string;
  technicalOwner?: string;
  createdBy: string;
  createdAt: string;
  lastModifiedBy: string;
  lastModifiedAt: string;
  changeLog: FieldChangeLogEntry[];
  usageAnalytics: FieldUsageAnalytics;
  templateInfo?: FieldTemplateInfo;
  customProperties: Record<string, any>;
}

export interface FieldChangeLogEntry {
  id: string;
  version: number;
  timestamp: string;
  userId: string;
  userName: string;
  changeType: 'created' | 'modified' | 'deleted' | 'restored' | 'deprecated';
  changes: FieldChange[];
  comment: string;
}

export interface FieldChange {
  property: string;
  oldValue: any;
  newValue: any;
  changeDescription: string;
}

export interface FieldUsageAnalytics {
  totalComponents: number;
  activeComponents: number;
  lastUsed: string;
  usageFrequency: 'high' | 'medium' | 'low' | 'unused';
  validationErrors: number;
  userFeedback: FieldFeedback[];
  performanceMetrics: {
    avgValidationTime: number;
    errorRate: number;
    completionRate: number;
  };
}

export interface FieldFeedback {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  timestamp: string;
  category: 'usability' | 'clarity' | 'validation' | 'suggestion';
}

export interface FieldTemplateInfo {
  templateId: string;
  templateName: string;
  templateVersion: string;
  isTemplate: boolean;
  derivedFrom?: string;
  templateTags: string[];
}

export interface FieldMetadataEditorProps {
  fieldId: string;
  fieldName: string;
  fieldType: SchemaFieldType;
  metadata: FieldMetadata;
  onMetadataChange: (metadata: FieldMetadata) => void;
  availableFields?: Array<{ id: string; name: string; type: SchemaFieldType }>;
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
      id={`metadata-tabpanel-${index}`}
      aria-labelledby={`metadata-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

const FIELD_CATEGORIES = [
  'Identification',
  'Dimensions',
  'Material Properties',
  'Structural Analysis',
  'Load Calculations',
  'Safety Factors',
  'Documentation',
  'Quality Control',
  'Compliance',
  'Other',
];

const COMMON_TAGS = [
  'required',
  'calculated',
  'user-input',
  'engineering',
  'safety-critical',
  'aashto',
  'aisc',
  'compliance',
  'dimensional',
  'material',
  'load',
  'inspection',
  'documentation',
];

const metadataSchema = yup.object({
  documentation: yup.object({
    title: yup.string().required('Title is required').max(200),
    description: yup.string().required('Description is required').max(2000),
    examples: yup.array().of(yup.string().max(500)),
    businessRules: yup.array().of(yup.string().max(1000)),
    technicalNotes: yup.array().of(yup.string().max(1000)),
    relatedFields: yup.array().of(yup.string()),
  }),
  tags: yup.array().of(yup.string()).max(20, 'Maximum 20 tags allowed'),
  category: yup.string().required('Category is required'),
  businessOwner: yup.string().max(100),
  technicalOwner: yup.string().max(100),
});

const FieldMetadataEditor: React.FC<FieldMetadataEditorProps> = ({
  fieldId,
  fieldName,
  fieldType,
  metadata,
  onMetadataChange,
  availableFields = [],
  readOnly = false,
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [showChangeLog, setShowChangeLog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [newTag, setNewTag] = useState('');

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FieldMetadata>({
    resolver: yupResolver(metadataSchema),
    defaultValues: metadata,
  });

  const {
    fields: exampleFields,
    append: appendExample,
    remove: removeExample,
  } = useFieldArray({
    control,
    name: 'documentation.examples',
  });

  const {
    fields: businessRuleFields,
    append: appendBusinessRule,
    remove: removeBusinessRule,
  } = useFieldArray({
    control,
    name: 'documentation.businessRules',
  });

  const {
    fields: technicalNoteFields,
    append: appendTechnicalNote,
    remove: removeTechnicalNote,
  } = useFieldArray({
    control,
    name: 'documentation.technicalNotes',
  });

  const watchedTags = watch('tags');

  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  }, []);

  const handleAddTag = useCallback((tag: string) => {
    const currentTags = watchedTags || [];
    if (!currentTags.includes(tag) && currentTags.length < 20) {
      setValue('tags', [...currentTags, tag], { shouldDirty: true });
    }
  }, [watchedTags, setValue]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    const currentTags = watchedTags || [];
    setValue('tags', currentTags.filter(tag => tag !== tagToRemove), { shouldDirty: true });
  }, [watchedTags, setValue]);

  const handleAddNewTag = useCallback(() => {
    if (newTag.trim()) {
      handleAddTag(newTag.trim());
      setNewTag('');
    }
  }, [newTag, handleAddTag]);

  const onSubmit = useCallback((data: FieldMetadata) => {
    const updatedMetadata = {
      ...data,
      lastModifiedAt: new Date().toISOString(),
      lastModifiedBy: 'Current User', // TODO: Get from auth context
      version: metadata.version + 1,
    };
    onMetadataChange(updatedMetadata);
  }, [metadata.version, onMetadataChange]);

  const getUsageStatusColor = (frequency: string) => {
    switch (frequency) {
      case 'high': return 'success';
      case 'medium': return 'warning';
      case 'low': return 'info';
      case 'unused': return 'error';
      default: return 'default';
    }
  };

  const renderDocumentationTab = () => (
    <TabPanel value={currentTab} index={0}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Field Documentation
              </Typography>

              <Controller
                name="documentation.title"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Display Title"
                    fullWidth
                    margin="normal"
                    error={!!errors.documentation?.title}
                    helperText={errors.documentation?.title?.message}
                    disabled={readOnly}
                  />
                )}
              />

              <Controller
                name="documentation.description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description"
                    fullWidth
                    multiline
                    rows={4}
                    margin="normal"
                    error={!!errors.documentation?.description}
                    helperText={errors.documentation?.description?.message || 'Detailed description of the field purpose and usage'}
                    disabled={readOnly}
                  />
                )}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader
              title="Examples"
              action={
                !readOnly && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => appendExample('')}
                  >
                    Add Example
                  </Button>
                )
              }
            />
            <CardContent>
              {exampleFields.map((field, index) => (
                <Box key={field.id} display="flex" gap={1} mb={1}>
                  <Controller
                    name={`documentation.examples.${index}`}
                    control={control}
                    render={({ field: textField }) => (
                      <TextField
                        {...textField}
                        label={`Example ${index + 1}`}
                        fullWidth
                        size="small"
                        disabled={readOnly}
                      />
                    )}
                  />
                  {!readOnly && (
                    <IconButton
                      size="small"
                      onClick={() => removeExample(index)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              ))}
              {exampleFields.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No examples added. Click "Add Example" to provide usage examples.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardHeader
              title="Business Rules"
              action={
                !readOnly && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => appendBusinessRule('')}
                  >
                    Add Rule
                  </Button>
                )
              }
            />
            <CardContent>
              {businessRuleFields.map((field, index) => (
                <Box key={field.id} display="flex" gap={1} mb={1}>
                  <Controller
                    name={`documentation.businessRules.${index}`}
                    control={control}
                    render={({ field: textField }) => (
                      <TextField
                        {...textField}
                        label={`Rule ${index + 1}`}
                        fullWidth
                        size="small"
                        multiline
                        disabled={readOnly}
                      />
                    )}
                  />
                  {!readOnly && (
                    <IconButton
                      size="small"
                      onClick={() => removeBusinessRule(index)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              ))}
              {businessRuleFields.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No business rules defined. Add rules to document constraints and requirements.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardHeader
              title="Technical Notes"
              action={
                !readOnly && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => appendTechnicalNote('')}
                  >
                    Add Note
                  </Button>
                )
              }
            />
            <CardContent>
              {technicalNoteFields.map((field, index) => (
                <Box key={field.id} display="flex" gap={1} mb={1}>
                  <Controller
                    name={`documentation.technicalNotes.${index}`}
                    control={control}
                    render={({ field: textField }) => (
                      <TextField
                        {...textField}
                        label={`Technical Note ${index + 1}`}
                        fullWidth
                        size="small"
                        multiline
                        disabled={readOnly}
                      />
                    )}
                  />
                  {!readOnly && (
                    <IconButton
                      size="small"
                      onClick={() => removeTechnicalNote(index)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              ))}
              {technicalNoteFields.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No technical notes added. Document implementation details and considerations.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </TabPanel>
  );

  const renderCategoriesAndTagsTab = () => (
    <TabPanel value={currentTab} index={1}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Classification
              </Typography>

              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Category</InputLabel>
                    <Select
                      {...field}
                      label="Category"
                      error={!!errors.category}
                      disabled={readOnly}
                    >
                      {FIELD_CATEGORIES.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="businessOwner"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Business Owner"
                    fullWidth
                    margin="normal"
                    disabled={readOnly}
                    helperText="Person responsible for business requirements"
                  />
                )}
              />

              <Controller
                name="technicalOwner"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Technical Owner"
                    fullWidth
                    margin="normal"
                    disabled={readOnly}
                    helperText="Person responsible for technical implementation"
                  />
                )}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Tags
              </Typography>

              <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                {(watchedTags || []).map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={readOnly ? undefined : () => handleRemoveTag(tag)}
                    size="small"
                    color="primary"
                  />
                ))}
              </Box>

              {!readOnly && (
                <>
                  <Box display="flex" gap={1} mb={2}>
                    <TextField
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      label="Add Tag"
                      size="small"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddNewTag();
                        }
                      }}
                    />
                    <Button
                      onClick={handleAddNewTag}
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      disabled={!newTag.trim()}
                    >
                      Add
                    </Button>
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Common Tags:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {COMMON_TAGS.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                        onClick={() => handleAddTag(tag)}
                        disabled={(watchedTags || []).includes(tag)}
                      />
                    ))}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </TabPanel>
  );

  const renderUsageAnalyticsTab = () => (
    <TabPanel value={currentTab} index={2}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <AnalyticsIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {metadata.usageAnalytics.totalComponents}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Components
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <TrendIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {metadata.usageAnalytics.activeComponents}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Components
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: getUsageStatusColor(metadata.usageAnalytics.usageFrequency) + '.main' }}>
                  <ReportIcon />
                </Avatar>
                <Box>
                  <Chip
                    label={metadata.usageAnalytics.usageFrequency.toUpperCase()}
                    color={getUsageStatusColor(metadata.usageAnalytics.usageFrequency) as any}
                    size="small"
                  />
                  <Typography variant="body2" color="text.secondary">
                    Usage Frequency
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardHeader title="Performance Metrics" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" gutterBottom>
                    Validation Time
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(metadata.usageAnalytics.performanceMetrics.avgValidationTime * 10, 100)}
                      sx={{ flexGrow: 1 }}
                    />
                    <Typography variant="body2">
                      {metadata.usageAnalytics.performanceMetrics.avgValidationTime}ms
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" gutterBottom>
                    Error Rate
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinearProgress
                      variant="determinate"
                      value={metadata.usageAnalytics.performanceMetrics.errorRate * 100}
                      color="error"
                      sx={{ flexGrow: 1 }}
                    />
                    <Typography variant="body2">
                      {(metadata.usageAnalytics.performanceMetrics.errorRate * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" gutterBottom>
                    Completion Rate
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinearProgress
                      variant="determinate"
                      value={metadata.usageAnalytics.performanceMetrics.completionRate * 100}
                      color="success"
                      sx={{ flexGrow: 1 }}
                    />
                    <Typography variant="body2">
                      {(metadata.usageAnalytics.performanceMetrics.completionRate * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardHeader
              title="User Feedback"
              action={
                <Button
                  size="small"
                  onClick={() => setShowFeedbackDialog(true)}
                  startIcon={<AddIcon />}
                  disabled={readOnly}
                >
                  Add Feedback
                </Button>
              }
            />
            <CardContent>
              {metadata.usageAnalytics.userFeedback.length === 0 ? (
                <Alert severity="info">
                  No user feedback available. Encourage users to provide feedback for continuous improvement.
                </Alert>
              ) : (
                <List>
                  {metadata.usageAnalytics.userFeedback.slice(0, 5).map((feedback) => (
                    <ListItem key={feedback.id}>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle2">
                              {feedback.userName}
                            </Typography>
                            <Chip
                              label={feedback.category}
                              size="small"
                              variant="outlined"
                            />
                            <Box display="flex">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Typography
                                  key={i}
                                  color={i < feedback.rating ? 'primary' : 'text.disabled'}
                                >
                                  ★
                                </Typography>
                              ))}
                            </Box>
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              {feedback.comment}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(feedback.timestamp).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </TabPanel>
  );

  const renderVersionHistoryTab = () => (
    <TabPanel value={currentTab} index={3}>
      <Card variant="outlined">
        <CardHeader
          title={`Version History (Current: v${metadata.version})`}
          action={
            <Button
              startIcon={<HistoryIcon />}
              onClick={() => setShowChangeLog(true)}
              size="small"
            >
              View Details
            </Button>
          }
        />
        <CardContent>
          <Alert severity="info">
            Version history and change tracking will be fully implemented in the next phase.
            This will include detailed change logs, version comparison, and rollback capabilities.
          </Alert>
        </CardContent>
      </Card>
    </TabPanel>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Field Metadata: {fieldName}
        </Typography>
        {!readOnly && (
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSubmit(onSubmit)}
            disabled={!isDirty}
          >
            Save Metadata
          </Button>
        )}
      </Box>

      <Card variant="outlined">
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab icon={<DocumentationIcon />} label="Documentation" />
            <Tab icon={<TagIcon />} label="Categories & Tags" />
            <Tab icon={<AnalyticsIcon />} label="Usage Analytics" />
            <Tab icon={<HistoryIcon />} label="Version History" />
          </Tabs>
        </Box>

        {renderDocumentationTab()}
        {renderCategoriesAndTagsTab()}
        {renderUsageAnalyticsTab()}
        {renderVersionHistoryTab()}
      </Card>
    </Box>
  );
};

export default FieldMetadataEditor;