/**
 * Field Group Manager Component
 *
 * Provides interface for creating, managing, and organizing field groups
 * with hierarchical structure, conditional visibility, and drag-and-drop support.
 */

import React, { useState, useCallback, useEffect } from 'react';
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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Tooltip,
  Paper,
  TreeView,
  TreeItem,
  Menu,
  MenuList,
  MenuItem as MenuListItem,
  ListItemIcon,
  Badge,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Description as FieldIcon,
  Visibility as VisibleIcon,
  VisibilityOff as HiddenIcon,
  Star as RequiredIcon,
  Group as GroupIcon,
  AccountTree as TreeIcon,
  DragIndicator as DragIcon,
  MoreVert as MoreIcon,
  ContentCopy as CopyIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  Settings as SettingsIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { SchemaFieldType } from '../../services/api';

export interface FieldGroup {
  id: string;
  name: string;
  description: string;
  parentGroupId?: string;
  order: number;
  isCollapsible: boolean;
  isCollapsed: boolean;
  isVisible: boolean;
  visibilityRules: VisibilityRule[];
  styling: GroupStyling;
  fieldIds: string[];
  childGroupIds: string[];
  metadata: {
    createdAt: string;
    createdBy: string;
    lastModified: string;
    isTemplate: boolean;
    category: string;
    tags: string[];
  };
}

export interface VisibilityRule {
  id: string;
  type: 'field_value' | 'user_role' | 'component_type' | 'custom';
  condition: Record<string, any>;
  action: 'show' | 'hide';
  priority: number;
}

export interface GroupStyling {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  padding?: number;
  margin?: number;
  headerStyle?: 'default' | 'emphasized' | 'minimal';
  columns?: number;
  spacing?: 'compact' | 'normal' | 'comfortable';
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

export interface FieldGroupManagerProps {
  fields: ComponentSchemaField[];
  groups: FieldGroup[];
  onGroupsChange: (groups: FieldGroup[]) => void;
  onFieldGroupAssignment: (fieldId: string, groupId: string | null) => void;
  allowNesting?: boolean;
  maxNestingDepth?: number;
  showPreview?: boolean;
  readOnly?: boolean;
}

const GROUP_CATEGORIES = [
  'Identification',
  'Dimensions',
  'Materials',
  'Structural Analysis',
  'Load Information',
  'Safety & Compliance',
  'Quality Control',
  'Documentation',
  'Custom',
];

const GROUP_TEMPLATES = [
  {
    id: 'basic_info',
    name: 'Basic Information',
    description: 'General identification and project information',
    category: 'Identification',
    styling: { headerStyle: 'emphasized', spacing: 'normal' },
  },
  {
    id: 'dimensions',
    name: 'Dimensions & Geometry',
    description: 'Dimensional measurements and geometric properties',
    category: 'Dimensions',
    styling: { columns: 2, spacing: 'compact' },
  },
  {
    id: 'materials',
    name: 'Material Properties',
    description: 'Material specifications and properties',
    category: 'Materials',
    styling: { borderColor: '#2196f3', borderWidth: 2 },
  },
  {
    id: 'loads',
    name: 'Load Analysis',
    description: 'Load values, combinations, and analysis results',
    category: 'Structural Analysis',
    styling: { backgroundColor: '#f5f5f5', padding: 16 },
  },
  {
    id: 'safety',
    name: 'Safety & Compliance',
    description: 'Safety factors, compliance checks, and regulatory requirements',
    category: 'Safety & Compliance',
    styling: { borderColor: '#f44336', borderWidth: 2, headerStyle: 'emphasized' },
  },
];

const groupSchema = yup.object({
  name: yup.string().required('Group name is required').max(100),
  description: yup.string().max(500),
  category: yup.string().required('Category is required'),
  parentGroupId: yup.string().nullable(),
  isCollapsible: yup.boolean(),
  isVisible: yup.boolean(),
});

// Draggable Tree Item Component
const DraggableTreeItem: React.FC<{
  group: FieldGroup;
  fields: ComponentSchemaField[];
  onGroupEdit: (group: FieldGroup) => void;
  onGroupDelete: (groupId: string) => void;
  onFieldMove: (fieldId: string, targetGroupId: string | null) => void;
  depth?: number;
  readOnly?: boolean;
}> = ({
  group,
  fields,
  onGroupEdit,
  onGroupDelete,
  onFieldMove,
  depth = 0,
  readOnly = false,
}) => {
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const groupFields = fields.filter(field => field.groupId === group.id);

  const [{ isDragging }, drag] = useDrag({
    type: 'group',
    item: { id: group.id, type: 'group' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: ['group', 'field'],
    drop: (item: any) => {
      if (item.type === 'field') {
        onFieldMove(item.id, group.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const handleActionClick = (event: React.MouseEvent<HTMLElement>) => {
    setActionMenuAnchor(event.currentTarget);
  };

  const handleActionClose = () => {
    setActionMenuAnchor(null);
  };

  return (
    <Box
      ref={(node) => drag(drop(node))}
      sx={{
        opacity: isDragging ? 0.5 : 1,
        bgcolor: isOver ? 'action.hover' : 'transparent',
        border: isOver ? '2px dashed' : 'none',
        borderColor: 'primary.main',
        borderRadius: 1,
        p: isOver ? 1 : 0,
      }}
    >
      <Accordion defaultExpanded={!group.isCollapsed}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            '& .MuiAccordionSummary-content': {
              alignItems: 'center',
            },
          }}
        >
          <Box display="flex" alignItems="center" width="100%">
            {!readOnly && (
              <DragIcon color="action" sx={{ mr: 1 }} />
            )}
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: group.isVisible ? 'primary.main' : 'grey.400',
                mr: 2,
              }}
            >
              <GroupIcon />
            </Avatar>
            <Box flexGrow={1}>
              <Typography variant="subtitle1">
                {group.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {groupFields.length} fields • {group.metadata.category}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Badge badgeContent={groupFields.length} color="primary">
                <FieldIcon color="action" />
              </Badge>
              {!group.isVisible && (
                <Chip label="Hidden" size="small" color="default" />
              )}
              {!readOnly && (
                <IconButton
                  size="small"
                  onClick={handleActionClick}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <MoreIcon />
                </IconButton>
              )}
            </Box>
          </Box>
        </AccordionSummary>

        <AccordionDetails>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {group.description}
            </Typography>

            {/* Group Fields */}
            {groupFields.length > 0 && (
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Fields in this group:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {groupFields.map(field => (
                    <Chip
                      key={field.id}
                      label={field.field_name}
                      size="small"
                      variant="outlined"
                      icon={field.is_required ? <RequiredIcon /> : undefined}
                      onDelete={readOnly ? undefined : () => onFieldMove(field.id, null)}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Visibility Rules */}
            {group.visibilityRules.length > 0 && (
              <Box mt={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Visibility Rules:
                </Typography>
                <Box>
                  {group.visibilityRules.map(rule => (
                    <Chip
                      key={rule.id}
                      label={`${rule.type}: ${rule.action}`}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Group Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionClose}
      >
        <MenuListItem onClick={() => { onGroupEdit(group); handleActionClose(); }}>
          <ListItemIcon><EditIcon /></ListItemIcon>
          Edit Group
        </MenuListItem>
        <MenuListItem onClick={() => { /* TODO: Duplicate group */ handleActionClose(); }}>
          <ListItemIcon><CopyIcon /></ListItemIcon>
          Duplicate Group
        </MenuListItem>
        <Divider />
        <MenuListItem onClick={() => { /* TODO: Archive group */ handleActionClose(); }}>
          <ListItemIcon><ArchiveIcon /></ListItemIcon>
          Archive Group
        </MenuListItem>
        <MenuListItem
          onClick={() => { onGroupDelete(group.id); handleActionClose(); }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon><DeleteIcon color="error" /></ListItemIcon>
          Delete Group
        </MenuListItem>
      </Menu>
    </Box>
  );
};

const FieldGroupManager: React.FC<FieldGroupManagerProps> = ({
  fields,
  groups,
  onGroupsChange,
  onFieldGroupAssignment,
  allowNesting = true,
  maxNestingDepth = 3,
  showPreview = true,
  readOnly = false,
}) => {
  const [editingGroup, setEditingGroup] = useState<FieldGroup | null>(null);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [ungroupedFields, setUngroupedFields] = useState<ComponentSchemaField[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Partial<FieldGroup>>({
    resolver: yupResolver(groupSchema),
  });

  useEffect(() => {
    const ungrouped = fields.filter(field => !field.groupId);
    setUngroupedFields(ungrouped);
  }, [fields]);

  const handleCreateGroup = useCallback(() => {
    const newGroup: Partial<FieldGroup> = {
      name: '',
      description: '',
      parentGroupId: undefined,
      isCollapsible: true,
      isCollapsed: false,
      isVisible: true,
      visibilityRules: [],
      styling: {
        headerStyle: 'default',
        spacing: 'normal',
        columns: 1,
      },
      fieldIds: [],
      childGroupIds: [],
      metadata: {
        createdAt: new Date().toISOString(),
        createdBy: 'Current User',
        lastModified: new Date().toISOString(),
        isTemplate: false,
        category: 'Custom',
        tags: [],
      },
    };
    setEditingGroup(newGroup as FieldGroup);
    setShowGroupDialog(true);
  }, []);

  const handleEditGroup = useCallback((group: FieldGroup) => {
    setEditingGroup(group);
    reset(group);
    setShowGroupDialog(true);
  }, [reset]);

  const handleDeleteGroup = useCallback((groupId: string) => {
    // Move fields to ungrouped before deleting group
    const groupFields = fields.filter(field => field.groupId === groupId);
    groupFields.forEach(field => {
      onFieldGroupAssignment(field.id, null);
    });

    // Remove group
    const updatedGroups = groups.filter(g => g.id !== groupId);
    onGroupsChange(updatedGroups);
  }, [fields, groups, onFieldGroupAssignment, onGroupsChange]);

  const handleSaveGroup = useCallback((groupData: Partial<FieldGroup>) => {
    const isNewGroup = !editingGroup?.id || editingGroup.id.startsWith('temp_');

    const group: FieldGroup = {
      ...editingGroup,
      ...groupData,
      id: isNewGroup ? `group_${Date.now()}` : editingGroup!.id,
      order: isNewGroup ? groups.length + 1 : editingGroup!.order,
      fieldIds: editingGroup?.fieldIds || [],
      childGroupIds: editingGroup?.childGroupIds || [],
    } as FieldGroup;

    let updatedGroups;
    if (isNewGroup) {
      updatedGroups = [...groups, group];
    } else {
      updatedGroups = groups.map(g => g.id === group.id ? group : g);
    }

    onGroupsChange(updatedGroups);
    setShowGroupDialog(false);
    setEditingGroup(null);
  }, [editingGroup, groups, onGroupsChange]);

  const handleFieldMove = useCallback((fieldId: string, targetGroupId: string | null) => {
    onFieldGroupAssignment(fieldId, targetGroupId);
  }, [onFieldGroupAssignment]);

  const handleTemplateSelect = useCallback((template: any) => {
    const newGroup: FieldGroup = {
      id: `group_${Date.now()}`,
      name: template.name,
      description: template.description,
      order: groups.length + 1,
      isCollapsible: true,
      isCollapsed: false,
      isVisible: true,
      visibilityRules: [],
      styling: template.styling,
      fieldIds: [],
      childGroupIds: [],
      metadata: {
        createdAt: new Date().toISOString(),
        createdBy: 'Current User',
        lastModified: new Date().toISOString(),
        isTemplate: false,
        category: template.category,
        tags: [],
      },
    };

    const updatedGroups = [...groups, newGroup];
    onGroupsChange(updatedGroups);
    setShowTemplateDialog(false);
  }, [groups, onGroupsChange]);

  const rootGroups = groups.filter(group => !group.parentGroupId);

  return (
    <DndProvider backend={HTML5Backend}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Field Groups & Organization
          </Typography>
          {!readOnly && (
            <Box display="flex" gap={1}>
              <Button
                startIcon={<GroupIcon />}
                onClick={() => setShowTemplateDialog(true)}
                variant="outlined"
                size="small"
              >
                From Template
              </Button>
              <Button
                startIcon={<AddIcon />}
                onClick={handleCreateGroup}
                variant="contained"
                size="small"
              >
                Create Group
              </Button>
            </Box>
          )}
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Card variant="outlined">
              <CardHeader
                title={`Field Groups (${groups.length})`}
                avatar={<TreeIcon />}
              />
              <CardContent>
                {groups.length === 0 ? (
                  <Alert severity="info">
                    No field groups created yet. Create groups to organize your fields into logical sections.
                  </Alert>
                ) : (
                  <Box>
                    {rootGroups.map(group => (
                      <DraggableTreeItem
                        key={group.id}
                        group={group}
                        fields={fields}
                        onGroupEdit={handleEditGroup}
                        onGroupDelete={handleDeleteGroup}
                        onFieldMove={handleFieldMove}
                        readOnly={readOnly}
                      />
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardHeader
                title={`Ungrouped Fields (${ungroupedFields.length})`}
                avatar={<FieldIcon />}
              />
              <CardContent>
                {ungroupedFields.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    All fields are organized in groups.
                  </Typography>
                ) : (
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Drag fields to groups to organize them:
                    </Typography>
                    <Box display="flex" flexDirection="column" gap={1}>
                      {ungroupedFields.map(field => (
                        <Paper
                          key={field.id}
                          variant="outlined"
                          sx={{
                            p: 1,
                            cursor: 'move',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography variant="body2">
                              {field.field_name}
                            </Typography>
                            <Chip
                              label={field.field_type}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>

            {showPreview && (
              <Card variant="outlined" sx={{ mt: 2 }}>
                <CardHeader
                  title="Group Preview"
                  avatar={<PreviewIcon />}
                />
                <CardContent>
                  <Alert severity="info">
                    Preview functionality will show how groups appear in the actual form layout.
                  </Alert>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>

        {/* Group Editor Dialog */}
        <Dialog
          open={showGroupDialog}
          onClose={() => setShowGroupDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingGroup?.id?.startsWith('temp_') || !editingGroup?.id ? 'Create Group' : 'Edit Group'}
          </DialogTitle>
          <DialogContent>
            <form onSubmit={handleSubmit(handleSaveGroup)}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Group Name"
                        fullWidth
                        required
                        error={!!errors.name}
                        helperText={errors.name?.message}
                        margin="normal"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="metadata.category"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth margin="normal">
                        <InputLabel>Category</InputLabel>
                        <Select {...field} label="Category">
                          {GROUP_CATEGORIES.map(category => (
                            <MenuItem key={category} value={category}>
                              {category}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Description"
                        fullWidth
                        multiline
                        rows={2}
                        margin="normal"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="isCollapsible"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="Allow collapse/expand"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="isVisible"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label="Visible by default"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </form>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowGroupDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit(handleSaveGroup)}
            >
              Save Group
            </Button>
          </DialogActions>
        </Dialog>

        {/* Template Selection Dialog */}
        <Dialog
          open={showTemplateDialog}
          onClose={() => setShowTemplateDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Choose Group Template</DialogTitle>
          <DialogContent>
            <Grid container spacing={2}>
              {GROUP_TEMPLATES.map(template => (
                <Grid item xs={12} md={6} key={template.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        {template.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {template.description}
                      </Typography>
                      <Chip label={template.category} size="small" variant="outlined" />
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
      </Box>
    </DndProvider>
  );
};

export default FieldGroupManager;