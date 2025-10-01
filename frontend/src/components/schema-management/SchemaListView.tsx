/**
 * Schema List View Component
 *
 * Displays schemas in responsive card or table format with sorting, filtering,
 * and loading states. Supports both desktop table and mobile card views.
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Toolbar,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import {
  ViewList as TableViewIcon,
  ViewModule as CardViewIcon,
  Clear as ClearIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Schema as SchemaIcon,
} from '@mui/icons-material';
import { ComponentSchema } from '../../services/api.ts';
import { SchemaUsageStats } from '../../types/schema';
import SchemaManagementCard from './SchemaManagementCard.tsx';
import {
  useAriaLive,
  useKeyboardShortcuts,
  generateAriaId,
  createHeadingStructure,
  focusIndicatorStyles,
  KeyboardShortcut
} from '../../utils/accessibility.ts';
import { useSchemaConfig, getCurrentConfig } from '../../config/schemaConfig.ts';
import {
  useDebounced,
  usePerformanceMonitor,
  useVirtualScroll,
  useExpensiveComputation
} from '../../hooks/schema/usePerformanceOptimizations.tsx';

type SortField = 'name' | 'created_at' | 'usage_count' | 'updated_at';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'card' | 'table';

interface FilterState {
  searchTerm: string;
  showOnlyDefault: boolean;
  statusFilter: 'all' | 'active' | 'inactive';
  usageFilter: 'all' | 'used' | 'unused';
}

interface SchemaListViewProps {
  schemas: ComponentSchema[];
  usageStats?: Record<string, SchemaUsageStats>;
  isLoading?: boolean;
  error?: Error | null;
  onSchemaEdit?: (schema: ComponentSchema) => void;
  onSchemaView?: (schema: ComponentSchema) => void;
  onSchemaCreate?: () => void;
  onSchemaDelete?: (schema: ComponentSchema) => void;
  onSchemaDuplicate?: (schema: ComponentSchema) => void;
  allowEdit?: boolean;
  allowCreate?: boolean;
  compact?: boolean;
}

const SchemaListView: React.FC<SchemaListViewProps> = ({
  schemas,
  usageStats = {},
  isLoading = false,
  error = null,
  onSchemaEdit,
  onSchemaView,
  onSchemaCreate,
  onSchemaDelete,
  onSchemaDuplicate,
  allowEdit = true,
  allowCreate = true,
  compact = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Performance configuration and monitoring
  const { config } = useSchemaConfig();
  const renderMonitor = usePerformanceMonitor('schema-list-render');
  const filterMonitor = usePerformanceMonitor('schema-list-filter');
  const sortMonitor = usePerformanceMonitor('schema-list-sort');

  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? 'card' : 'table');
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    showOnlyDefault: false,
    statusFilter: 'all',
    usageFilter: 'all',
  });

  // Accessibility hooks and refs
  const { announce } = useAriaLive();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const headingId = generateAriaId('schema-list-heading');
  const searchLabelId = generateAriaId('search-label');
  const resultsAnnouncementId = generateAriaId('results-announcement');

  // Optimized schema processing with performance monitoring and caching
  const processedSchemas = useExpensiveComputation(
    (schemas, usageStats, sortField, sortOrder, filters) => {
      filterMonitor.start();

      let filtered = schemas.filter((schema) => {
        // Search term filter
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          const matchesSearch =
            schema.name.toLowerCase().includes(searchLower) ||
            (schema.description && schema.description.toLowerCase().includes(searchLower));
          if (!matchesSearch) return false;
        }

        // Default filter
        if (filters.showOnlyDefault && !schema.is_default) return false;

        // Status filter
        if (filters.statusFilter === 'active' && !schema.is_active) return false;
        if (filters.statusFilter === 'inactive' && schema.is_active) return false;

        // Usage filter
        if (filters.usageFilter !== 'all') {
          const stats = usageStats[schema.id];
          const hasUsage = stats && stats.component_count > 0;
          if (filters.usageFilter === 'used' && !hasUsage) return false;
          if (filters.usageFilter === 'unused' && hasUsage) return false;
        }

        return true;
      });

      filterMonitor.end();
      sortMonitor.start();

      // Sort
      filtered.sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'created_at':
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            break;
          case 'updated_at':
            comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
            break;
          case 'usage_count':
            const aUsage = usageStats[a.id]?.component_count || 0;
            const bUsage = usageStats[b.id]?.component_count || 0;
            comparison = aUsage - bUsage;
            break;
          default:
            break;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });

      sortMonitor.end();
      return filtered;
    },
    [schemas, usageStats, sortField, sortOrder, filters],
    {
      cacheSize: config.performance.maxCacheSize,
      ttlMs: config.performance.cacheTTLMs,
    }
  );

  // Virtual scrolling for large schema lists
  const shouldUseVirtualScrolling = config.performance.enableVirtualScrolling &&
    processedSchemas.length > config.performance.virtualScrollThreshold;

  // Always call the hook to maintain consistent hook order
  const virtualScrollConfig = useVirtualScroll(
    processedSchemas.map((schema, index) => ({
      id: schema.id,
      data: schema,
      height: compact ? 120 : 160
    })),
    {
      itemHeight: compact ? 120 : 160,
      containerHeight: 600, // Default container height
      overscan: config.performance.virtualScrollOverscan,
      enableDynamicHeight: false,
      // Disable virtual scrolling if not needed
      enabled: shouldUseVirtualScrolling,
    }
  );

  const handleSort = useCallback((field: SortField) => {
    const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
    if (sortField === field) {
      setSortOrder(newOrder);
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    // Announce sort change
    announce(`Schemas sorted by ${field} in ${newOrder}ending order`, 'polite');
  }, [sortField, sortOrder, announce]);

  const clearFilters = useCallback(() => {
    setFilters({
      searchTerm: '',
      showOnlyDefault: false,
      statusFilter: 'all',
      usageFilter: 'all',
    });
    // Announce filter clear
    announce(`All filters cleared. Showing ${schemas.length} schemas`, 'polite');
  }, [schemas.length, announce]);

  // Debounced search for performance
  const [debouncedSearchUpdate, searchControls] = useDebounced(
    (value: string) => {
      setFilters(prev => ({ ...prev, searchTerm: value }));
    },
    config.performance.debounceDelayMs,
    { trailing: true }
  );

  // Enhanced filter handlers with announcements
  const handleSearchChange = useCallback((value: string) => {
    debouncedSearchUpdate(value);
  }, [debouncedSearchUpdate]);

  const handleStatusFilterChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, statusFilter: value as any }));
    announce(`Status filter changed to ${value}`, 'polite');
  }, [announce]);

  const handleUsageFilterChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, usageFilter: value as any }));
    announce(`Usage filter changed to ${value}`, 'polite');
  }, [announce]);

  const handleDefaultFilterToggle = useCallback(() => {
    const newValue = !filters.showOnlyDefault;
    setFilters(prev => ({ ...prev, showOnlyDefault: newValue }));
    announce(newValue ? 'Showing only default schemas' : 'Showing all schemas', 'polite');
  }, [filters.showOnlyDefault, announce]);

  // Keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'f',
      ctrlKey: true,
      action: () => searchInputRef.current?.focus(),
      description: 'Focus search input',
    },
    {
      key: 'n',
      ctrlKey: true,
      action: () => onSchemaCreate?.(),
      description: 'Create new schema',
    },
    {
      key: 'r',
      ctrlKey: true,
      action: clearFilters,
      description: 'Clear all filters',
    },
  ];

  // Register keyboard shortcuts
  useKeyboardShortcuts(allowCreate && onSchemaCreate ? shortcuts : shortcuts.slice(0, -1));

  // Announce filter results when they change
  useEffect(() => {
    if (processedSchemas.length !== schemas.length) {
      const hasFilters = filters.searchTerm || filters.showOnlyDefault ||
                        filters.statusFilter !== 'all' || filters.usageFilter !== 'all';
      if (hasFilters) {
        announce(`Found ${processedSchemas.length} schemas matching your filters`, 'polite');
      }
    }
  }, [processedSchemas.length, schemas.length, filters, announce]);

  const hasActiveFilters =
    filters.searchTerm ||
    filters.showOnlyDefault ||
    filters.statusFilter !== 'all' ||
    filters.usageFilter !== 'all';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Performance monitoring for render cycles
  useEffect(() => {
    renderMonitor.start();
    return () => {
      renderMonitor.end();
    };
  });

  // Loading state
  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  // Error state
  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading schemas: {error.message}
        </Alert>
        <Button variant="outlined" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 0 }}>
      {/* Toolbar */}
      <Toolbar
        sx={{
          borderBottom: '1px solid',
          borderBottomColor: 'divider',
          ...focusIndicatorStyles(theme)
        }}
      >
        <Typography
          variant="h6"
          component="h2"
          id={headingId}
          sx={{ flexGrow: 1 }}
          role="heading"
          aria-level={2}
        >
          Schemas ({processedSchemas.length})
        </Typography>

        {/* View Mode Toggle */}
        {!isMobile && (
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, value) => {
              if (value) {
                setViewMode(value);
                announce(`View mode changed to ${value}`, 'polite');
              }
            }}
            size="small"
            sx={{ mr: 2, ...focusIndicatorStyles(theme) }}
            aria-label="View mode selection"
          >
            <ToggleButton
              value="card"
              aria-label="Card view"
              title="Switch to card view"
            >
              <CardViewIcon />
            </ToggleButton>
            <ToggleButton
              value="table"
              aria-label="Table view"
              title="Switch to table view"
            >
              <TableViewIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        )}

        {/* Create Button */}
        {allowCreate && onSchemaCreate && (
          <Button
            variant="contained"
            color="primary"
            onClick={onSchemaCreate}
            size={compact ? 'small' : 'medium'}
            sx={focusIndicatorStyles(theme)}
            aria-describedby="create-schema-help"
            title="Create a new schema (Ctrl+N)"
          >
            Create Schema
          </Button>
        )}
      </Toolbar>

      {/* Filters */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderBottomColor: 'divider' }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search */}
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <label id={searchLabelId} style={{ display: 'none' }}>
                Search schemas by name or description
              </label>
              <TextField
                inputRef={searchInputRef}
                fullWidth
                size="small"
                placeholder="Search schemas..."
                value={filters.searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
                }}
                inputProps={{
                  'aria-labelledby': searchLabelId,
                  'aria-describedby': 'search-help',
                  role: 'searchbox',
                }}
                sx={focusIndicatorStyles(theme)}
                title="Search schemas by name or description (Ctrl+F)"
              />
              <Typography
                id="search-help"
                variant="caption"
                sx={{ display: 'none' }}
              >
                Press Ctrl+F to focus search input
              </Typography>
            </Box>
          </Grid>

          {/* Status Filter */}
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small" sx={focusIndicatorStyles(theme)}>
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={filters.statusFilter}
                label="Status"
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                aria-describedby="status-filter-help"
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="active">Active Only</MenuItem>
                <MenuItem value="inactive">Inactive Only</MenuItem>
              </Select>
              <Typography
                id="status-filter-help"
                variant="caption"
                sx={{ display: 'none' }}
              >
                Filter schemas by their activation status
              </Typography>
            </FormControl>
          </Grid>

          {/* Usage Filter */}
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small" sx={focusIndicatorStyles(theme)}>
              <InputLabel id="usage-filter-label">Usage</InputLabel>
              <Select
                labelId="usage-filter-label"
                value={filters.usageFilter}
                label="Usage"
                onChange={(e) => handleUsageFilterChange(e.target.value)}
                aria-describedby="usage-filter-help"
              >
                <MenuItem value="all">All Schemas</MenuItem>
                <MenuItem value="used">Used in Components</MenuItem>
                <MenuItem value="unused">Not Yet Used</MenuItem>
              </Select>
              <Typography
                id="usage-filter-help"
                variant="caption"
                sx={{ display: 'none' }}
              >
                Filter schemas by whether they have been used in components
              </Typography>
            </FormControl>
          </Grid>

          {/* Default Filter & Clear */}
          <Grid item xs={12} sm={12} md={5}>
            <Box display="flex" gap={1} alignItems="center">
              <Button
                variant={filters.showOnlyDefault ? 'contained' : 'outlined'}
                size="small"
                onClick={handleDefaultFilterToggle}
                sx={focusIndicatorStyles(theme)}
                aria-pressed={filters.showOnlyDefault}
                aria-describedby="default-filter-help"
                title={filters.showOnlyDefault ? 'Show all schemas' : 'Show only default schemas'}
              >
                Default Only
              </Button>
              <Typography
                id="default-filter-help"
                variant="caption"
                sx={{ display: 'none' }}
              >
                Toggle to show only schemas marked as default for their projects
              </Typography>

              {hasActiveFilters && (
                <Tooltip title="Clear all filters (Ctrl+R)">
                  <IconButton
                    size="small"
                    onClick={clearFilters}
                    sx={focusIndicatorStyles(theme)}
                    aria-label="Clear all filters"
                  >
                    <ClearIcon />
                  </IconButton>
                </Tooltip>
              )}

              {hasActiveFilters && (
                <Chip
                  label={`${processedSchemas.length} of ${schemas.length}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  aria-label={`Showing ${processedSchemas.length} schemas out of ${schemas.length} total`}
                />
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Default Schema Information Message */}
      {schemas.some(schema => schema.is_default && schema.id === 'default-schema-001') && (
        <Alert
          severity="info"
          sx={{ mx: 2, mt: 1, mb: 0 }}
          icon={<SchemaIcon />}
        >
          <Typography variant="body2">
            <strong>Using default schema</strong> - Create custom schemas for your projects to customize field structures and improve data organization.
          </Typography>
        </Alert>
      )}

      {/* Content */}
      <Box sx={{ p: 2 }}>
        {processedSchemas.length === 0 ? (
          // Empty State
          <Box textAlign="center" py={6}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {hasActiveFilters ? 'No schemas match your filters' : 'No schemas found'}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {hasActiveFilters
                ? 'Try adjusting your search criteria or clearing filters.'
                : 'Create your first schema to get started.'
              }
            </Typography>
            {hasActiveFilters ? (
              <Button variant="outlined" onClick={clearFilters} sx={{ mt: 2 }}>
                Clear Filters
              </Button>
            ) : allowCreate && onSchemaCreate && (
              <Button variant="contained" onClick={onSchemaCreate} sx={{ mt: 2 }}>
                Create Schema
              </Button>
            )}
          </Box>
        ) : viewMode === 'card' ? (
          // Card View
          <Grid container spacing={2}>
            {processedSchemas.map((schema) => (
              <Grid item xs={12} sm={6} md={4} key={schema.id}>
                <SchemaManagementCard
                  schema={schema}
                  usageStats={usageStats[schema.id]}
                  onEdit={allowEdit ? onSchemaEdit : undefined}
                  onView={onSchemaView}
                  onDelete={onSchemaDelete}
                  onDuplicate={onSchemaDuplicate}
                  compact={compact}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          // Table View
          <TableContainer role="region" aria-labelledby={headingId}>
            <Table role="table" aria-label="Schemas table">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'name'}
                      direction={sortField === 'name' ? sortOrder : 'asc'}
                      onClick={() => handleSort('name')}
                      sx={focusIndicatorStyles(theme)}
                      aria-label={`Sort by name ${sortField === 'name' ? (sortOrder === 'asc' ? 'descending' : 'ascending') : 'ascending'}`}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Fields</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'usage_count'}
                      direction={sortField === 'usage_count' ? sortOrder : 'asc'}
                      onClick={() => handleSort('usage_count')}
                      sx={focusIndicatorStyles(theme)}
                      aria-label={`Sort by component count ${sortField === 'usage_count' ? (sortOrder === 'asc' ? 'descending' : 'ascending') : 'ascending'}`}
                    >
                      Components
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'created_at'}
                      direction={sortField === 'created_at' ? sortOrder : 'asc'}
                      onClick={() => handleSort('created_at')}
                      sx={focusIndicatorStyles(theme)}
                      aria-label={`Sort by creation date ${sortField === 'created_at' ? (sortOrder === 'asc' ? 'descending' : 'ascending') : 'ascending'}`}
                    >
                      Created
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {processedSchemas.map((schema) => (
                  <TableRow key={schema.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight={500}>
                          {schema.name}
                        </Typography>
                        {schema.is_default && (
                          <Chip label="Default" size="small" color="primary" />
                        )}
                      </Box>
                      {schema.description && (
                        <Typography variant="caption" color="text.secondary">
                          {schema.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={schema.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        color={schema.is_active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{schema.fields.length}</TableCell>
                    <TableCell>
                      {usageStats[schema.id]?.component_count || 0}
                    </TableCell>
                    <TableCell>{formatDate(schema.created_at)}</TableCell>
                    <TableCell align="right">
                      <Box display="flex" gap={1} justifyContent="flex-end">
                        {onSchemaView && (
                          <Tooltip title={`View schema: ${schema.name}`}>
                            <IconButton
                              size="small"
                              onClick={() => onSchemaView(schema)}
                              sx={focusIndicatorStyles(theme)}
                              aria-label={`View schema ${schema.name}`}
                            >
                              <SearchIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {allowEdit && onSchemaEdit && (
                          <Tooltip title={schema.is_active ? `Edit schema: ${schema.name}` : 'Schema must be active to edit'}>
                            <span>
                              <IconButton
                                size="small"
                                color="primary"
                                disabled={!schema.is_active}
                                onClick={() => onSchemaEdit(schema)}
                                sx={focusIndicatorStyles(theme)}
                                aria-label={`Edit schema ${schema.name}${!schema.is_active ? ' (disabled - schema inactive)' : ''}`}
                              >
                                <FilterIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Paper>
  );
};

export default SchemaListView;