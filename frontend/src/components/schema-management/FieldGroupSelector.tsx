/**
 * Field Group Selector Component
 *
 * Provides interface for browsing and applying predefined field groups.
 * Groups contain sets of related fields for common engineering use cases.
 */

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Typography,
  Button,
  Grid,
  Chip,
  Box,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  TextField,
  InputAdornment,
  Tab,
  Tabs,
  Badge,
  IconButton,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Engineering as EngineeringIcon,
  Business as BusinessIcon,
  Build as BuildIcon,
  FactCheck as InspectionIcon,
  Straighten as DimensionIcon,
  Search as SearchIcon,
  Visibility as PreviewIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
  Category as CategoryIcon,
  Star as RequiredIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

import { ComponentSchemaFieldCreate } from '../../types/schema';
import { FieldTemplateGroupsService, FieldGroup } from '../../services/fieldTemplateGroups';

interface FieldGroupSelectorProps {
  existingFields: ComponentSchemaFieldCreate[];
  onApplyGroup: (fields: ComponentSchemaFieldCreate[]) => void;
  disabled?: boolean;
  maxFields?: number;
  currentFieldCount?: number;
  compact?: boolean;
}

const CATEGORY_ICONS = {
  structural: <EngineeringIcon />,
  project: <BusinessIcon />,
  material: <BuildIcon />,
  documentation: <CategoryIcon />,
  inspection: <InspectionIcon />,
};

const CATEGORY_COLORS = {
  structural: 'primary',
  project: 'secondary',
  material: 'warning',
  documentation: 'info',
  inspection: 'success',
} as const;

export const FieldGroupSelector: React.FC<FieldGroupSelectorProps> = ({
  existingFields,
  onApplyGroup,
  disabled = false,
  maxFields,
  currentFieldCount = 0,
  compact = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<FieldGroup | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

  // Get all field groups and categories
  const allGroups = useMemo(() => FieldTemplateGroupsService.getFieldGroups(), []);
  const categories = useMemo(() => FieldTemplateGroupsService.getCategories(), []);
  const recommendedGroups = useMemo(() =>
    FieldTemplateGroupsService.getRecommendedGroups(existingFields),
    [existingFields]
  );

  // Filter groups based on search and category
  const filteredGroups = useMemo(() => {
    let groups = allGroups;

    // Filter by category
    if (selectedCategory !== 'all') {
      groups = FieldTemplateGroupsService.getFieldGroupsByCategory(selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      groups = FieldTemplateGroupsService.searchFieldGroups(searchQuery);
    }

    return groups;
  }, [allGroups, selectedCategory, searchQuery]);

  // Get group preview data
  const groupPreview = useMemo(() => {
    if (!selectedGroup) return null;
    return FieldTemplateGroupsService.getGroupPreview(selectedGroup.id);
  }, [selectedGroup]);

  const handleGroupSelect = (group: FieldGroup) => {
    setSelectedGroup(group);
    setShowPreview(true);
  };

  const handleApplyGroup = () => {
    if (!selectedGroup) return;

    try {
      const fields = FieldTemplateGroupsService.applyFieldGroup(
        selectedGroup.id,
        currentFieldCount + 1
      );
      onApplyGroup(fields);
      setShowPreview(false);
      setSelectedGroup(null);
    } catch (error) {
      console.error('Error applying field group:', error);
    }
  };

  const canApplyGroup = (group: FieldGroup) => {
    if (disabled) return false;
    return FieldTemplateGroupsService.canApplyGroup(group.id, currentFieldCount, maxFields);
  };

  const getFieldLimitMessage = (group: FieldGroup) => {
    if (!maxFields) return null;
    const remaining = maxFields - currentFieldCount;
    if (group.fields.length > remaining) {
      return `Would exceed field limit by ${group.fields.length - remaining} fields`;
    }
    return null;
  };

  if (compact && !expanded) {
    return (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5 }}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Field Groups
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              {recommendedGroups.slice(0, 2).map(group => (
                <Tooltip key={group.id} title={`Add ${group.name} (${group.fields.length} fields)`}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={CATEGORY_ICONS[group.category]}
                    onClick={() => handleGroupSelect(group)}
                    disabled={!canApplyGroup(group)}
                    color={CATEGORY_COLORS[group.category]}
                  >
                    {group.name}
                  </Button>
                </Tooltip>
              ))}
              <IconButton
                size="small"
                onClick={() => setExpanded(true)}
                disabled={disabled}
              >
                <ExpandMoreIcon />
              </IconButton>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardHeader
          title={
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h6">Field Groups</Typography>
              {recommendedGroups.length > 0 && (
                <Chip
                  icon={<CheckCircleIcon />}
                  label={`${recommendedGroups.length} recommended`}
                  size="small"
                  color="success"
                  variant="outlined"
                />
              )}
            </Stack>
          }
          action={
            compact ? (
              <IconButton onClick={() => setExpanded(false)} size="small">
                <ExpandLessIcon />
              </IconButton>
            ) : null
          }
        />

        <CardContent sx={{ pt: 0 }}>
          {/* Search and Category Filter */}
          <Stack spacing={2} sx={{ mb: 3 }}>
            <TextField
              size="small"
              placeholder="Search field groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            <Tabs
              value={selectedCategory}
              onChange={(_, value) => setSelectedCategory(value)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="All" value="all" />
              {categories.map(category => (
                <Tab
                  key={category}
                  label={category.charAt(0).toUpperCase() + category.slice(1)}
                  value={category}
                  icon={CATEGORY_ICONS[category]}
                />
              ))}
            </Tabs>
          </Stack>

          {/* Recommended Groups */}
          {recommendedGroups.length > 0 && selectedCategory === 'all' && !searchQuery && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon fontSize="small" color="success" />
                Recommended for this schema
              </Typography>
              <Grid container spacing={1}>
                {recommendedGroups.map(group => (
                  <Grid item xs={12} md={6} key={group.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        borderColor: canApplyGroup(group) ? 'success.main' : 'warning.main',
                        borderWidth: 2,
                      }}
                      onClick={() => handleGroupSelect(group)}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                          <Stack direction="row" spacing={1} alignItems="center">
                            {CATEGORY_ICONS[group.category]}
                            <Typography variant="body2" fontWeight="medium">
                              {group.name}
                            </Typography>
                          </Stack>
                          <Badge badgeContent={group.fields.length} color="primary">
                            <AddIcon />
                          </Badge>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* All Field Groups */}
          <Typography variant="subtitle2" gutterBottom>
            {searchQuery ? 'Search Results' : 'All Field Groups'}
          </Typography>

          <Grid container spacing={2}>
            {filteredGroups.map(group => {
              const limitMessage = getFieldLimitMessage(group);
              const canApply = canApplyGroup(group);

              return (
                <Grid item xs={12} md={6} lg={4} key={group.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: '100%',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                      opacity: canApply ? 1 : 0.6,
                    }}
                    onClick={() => handleGroupSelect(group)}
                  >
                    <CardContent>
                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                          <Box sx={{ color: `${CATEGORY_COLORS[group.category]}.main` }}>
                            {CATEGORY_ICONS[group.category]}
                          </Box>
                          <Badge badgeContent={group.fields.length} color="primary" />
                        </Stack>

                        <Typography variant="subtitle2" fontWeight="medium">
                          {group.name}
                        </Typography>

                        <Typography variant="caption" color="text.secondary" sx={{ minHeight: '2.5em' }}>
                          {group.description}
                        </Typography>

                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {group.tags.slice(0, 3).map(tag => (
                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                          ))}
                          {group.tags.length > 3 && (
                            <Chip label={`+${group.tags.length - 3}`} size="small" variant="outlined" />
                          )}
                        </Stack>

                        {limitMessage && (
                          <Alert severity="warning" sx={{ mt: 1 }}>
                            <Typography variant="caption">{limitMessage}</Typography>
                          </Alert>
                        )}
                      </Stack>
                    </CardContent>

                    <CardActions>
                      <Button
                        size="small"
                        startIcon={<PreviewIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGroupSelect(group);
                        }}
                      >
                        Preview
                      </Button>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canApply) {
                            const fields = FieldTemplateGroupsService.applyFieldGroup(
                              group.id,
                              currentFieldCount + 1
                            );
                            onApplyGroup(fields);
                          }
                        }}
                        disabled={!canApply}
                        color={CATEGORY_COLORS[group.category]}
                      >
                        Add Group
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {filteredGroups.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="body2" color="text.secondary">
                No field groups found matching your criteria
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Group Preview Dialog */}
      <Dialog open={showPreview} onClose={() => setShowPreview(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={2} alignItems="center">
            {selectedGroup && CATEGORY_ICONS[selectedGroup.category]}
            <Typography variant="h6">
              {selectedGroup?.name} Preview
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent>
          {groupPreview && (
            <Stack spacing={3}>
              <Typography variant="body2" color="text.secondary">
                {selectedGroup?.description}
              </Typography>

              <Stack direction="row" spacing={2}>
                <Chip
                  label={`${groupPreview.fieldCount} fields`}
                  icon={<InfoIcon />}
                  variant="outlined"
                />
                <Chip
                  label={`${groupPreview.requiredCount} required`}
                  icon={<RequiredIcon />}
                  color="warning"
                  variant="outlined"
                />
                <Chip
                  label={groupPreview.fieldTypes.join(', ')}
                  variant="outlined"
                />
              </Stack>

              <Typography variant="subtitle2">Fields in this group:</Typography>

              <List dense>
                {selectedGroup?.fields.map((field, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemIcon>
                        {field.is_required ? (
                          <RequiredIcon color="warning" />
                        ) : (
                          <InfoIcon color="action" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={field.field_name}
                        secondary={
                          <Stack spacing={0.5}>
                            <Typography variant="caption">
                              Type: {field.field_type} {field.is_required && '(Required)'}
                            </Typography>
                            {field.help_text && (
                              <Typography variant="caption" color="text.secondary">
                                {field.help_text}
                              </Typography>
                            )}
                          </Stack>
                        }
                      />
                    </ListItem>
                    {index < selectedGroup.fields.length - 1 && <Divider variant="inset" />}
                  </React.Fragment>
                ))}
              </List>

              {selectedGroup && getFieldLimitMessage(selectedGroup) && (
                <Alert severity="error">
                  {getFieldLimitMessage(selectedGroup)}
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleApplyGroup}
            disabled={!selectedGroup || !canApplyGroup(selectedGroup)}
            startIcon={<AddIcon />}
          >
            Add Group ({selectedGroup?.fields.length} fields)
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FieldGroupSelector;