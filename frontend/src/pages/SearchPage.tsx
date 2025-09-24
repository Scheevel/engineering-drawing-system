import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  Autocomplete,
  LinearProgress,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Collapse,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Clear as ClearIcon,
  Folder,
  FolderOpen,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Tune as TuneIcon,
  Help as HelpIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Bookmark as BookmarkIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  searchComponents, 
  getSearchSuggestions, 
  getRecentComponents, 
  getComponentTypes, 
  getProjects, 
  getSavedSearchesForProject,
  createSavedSearch,
  deleteSavedSearch,
  executeSavedSearch,
  getSavedSearchCount,
  type ProjectResponse,
  type SavedSearchCreate,
  type SavedSearch 
} from '../services/api.ts';
import FlexibleComponentCard from '../components/flexible/FlexibleComponentCard.tsx';
import SearchResultRow from '../components/SearchResultRow.tsx';
import SavedSearchDialog from '../components/SavedSearchDialog.tsx';
import ScopeEffectivenessMetrics from '../components/ScopeEffectivenessMetrics.tsx';
import { useDebounce } from '../hooks/useDebounce.ts';

interface SearchFilters {
  componentType: string;
  projectId: string;
  instanceIdentifier: string;
}

interface SearchScope {
  piece_mark: boolean;
  component_type: boolean;
  description: boolean;
}

interface SortOption {
  value: string;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'piece_mark_asc', label: 'Piece Mark (A-Z)' },
  { value: 'piece_mark_desc', label: 'Piece Mark (Z-A)' },
  { value: 'date_desc', label: 'Date Added (Newest)' },
  { value: 'date_asc', label: 'Date Added (Oldest)' },
  { value: 'confidence_desc', label: 'Confidence (High to Low)' },
];

// Helper function to get proper display label for component types
const getComponentTypeLabel = (value: string): string => {
  // Create a mapping for common types that need better formatting
  const knownTypeLabels: Record<string, string> = {
    'wide_flange': 'Wide Flange (W)',
    'hss': 'HSS',
    'angle': 'Angle (L)',
    'channel': 'Channel (C)',
    'plate': 'Plate (PL)',
    'generic': 'Generic',
    'beam': 'Beam',
    'column': 'Column',
    'brace': 'Brace',
    'girder': 'Girder',
    'truss': 'Truss',
  };
  
  // If we have a known label, use it; otherwise capitalize the value
  return knownTypeLabels[value] || value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
};

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    componentType: '',
    projectId: 'all',
    instanceIdentifier: '',
  });
  const [searchScope, setSearchScope] = useState<SearchScope>({
    piece_mark: true,   // Default to piece marks for precision
    component_type: false,
    description: false,
  });
  const [scopeExpanded, setScopeExpanded] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [page, setPage] = useState(1);
  const [allResults, setAllResults] = useState<any[]>([]);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allRecentResults, setAllRecentResults] = useState<any[]>([]);
  const [hasMoreRecent, setHasMoreRecent] = useState(false);
  const [isLoadingMoreRecent, setIsLoadingMoreRecent] = useState(false);
  const [queryValidation, setQueryValidation] = useState<{
    isValid: boolean;
    error?: string;
    queryType?: string;
  }>({ isValid: true });
  
  // Saved search state
  const [savedSearchDialogOpen, setSavedSearchDialogOpen] = useState(false);
  const [savedSearchesExpanded, setSavedSearchesExpanded] = useState(false);
  const [editingSavedSearch, setEditingSavedSearch] = useState<SavedSearch | null>(null);
  
  // Debounce search query to avoid excessive API calls
  const debouncedQuery = useDebounce(query, 300);
  
  const queryClient = useQueryClient();

  // Helper functions for scope management
  const getScopeArray = (): string[] => {
    const scope: string[] = [];
    if (searchScope.piece_mark) scope.push('piece_mark');
    if (searchScope.component_type) scope.push('component_type');
    if (searchScope.description) scope.push('description');
    return scope.length > 0 ? scope : ['piece_mark']; // Default fallback
  };

  // Compute scope array for useQuery dependency to avoid stale closures
  // useMemo prevents new array creation on every render, avoiding infinite loops
  const currentScopeArray = useMemo(() => getScopeArray(), [searchScope]);

  const getScopeDisplayText = (): string => {
    const active = currentScopeArray;
    const displayNames: Record<string, string> = {
      piece_mark: 'Piece Marks',
      component_type: 'Component Types',
      description: 'Descriptions'
    };
    return active.map(s => displayNames[s]).join(', ');
  };

  const handleScopeChange = (field: keyof SearchScope, checked: boolean) => {
    setSearchScope(prev => {
      const newScope = { ...prev, [field]: checked };
      
      // Ensure at least one scope is always selected
      const hasAnySelected = Object.values(newScope).some(value => value);
      if (!hasAnySelected) {
        newScope.piece_mark = true; // Force piece_mark if nothing selected
      }
      
      return newScope;
    });
    setPage(1); // Reset to first page when scope changes
    setAllResults([]); // Clear current results immediately for better UX
    
    // Force query cache invalidation to ensure search triggers with new scope
    // This handles the race condition where scope defaults to piece_mark
    queryClient.invalidateQueries(['search']);
  };

  // Real-time query validation
  const validateQuery = (queryText: string) => {
    if (!queryText.trim()) {
      setQueryValidation({ isValid: true });
      return;
    }

    // Simple client-side validation patterns
    const errors = [];
    
    // Check for unmatched parentheses
    const openParens = (queryText.match(/\(/g) || []).length;
    const closeParens = (queryText.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push('Unmatched parentheses');
    }

    // Check for incomplete boolean operators
    if (queryText.match(/\b(AND|OR|NOT)\s*$/i)) {
      errors.push('Boolean operator needs a term after it');
    }

    // Check for leading boolean operators
    if (queryText.match(/^\s*(AND|OR)\b/i)) {
      errors.push('Search cannot start with AND/OR');
    }

    // Detect query features for feedback
    let queryType = 'simple';
    if (queryText.match(/\b(AND|OR|NOT)\b/i)) queryType = 'boolean';
    if (queryText.match(/[*?]/)) queryType = queryType === 'boolean' ? 'complex' : 'wildcard';
    if (queryText.match(/"/)) queryType = queryType !== 'simple' ? 'complex' : 'quoted';

    setQueryValidation({
      isValid: errors.length === 0,
      error: errors[0],
      queryType: queryType
    });
  };

  // Search syntax help content
  const getSearchHelpContent = () => (
    <Box sx={{ maxWidth: 400 }}>
      <Typography variant="subtitle2" gutterBottom>
        Advanced Search Syntax
      </Typography>
      
      <List dense>
        <ListItem>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Typography variant="body2" fontWeight="bold">AND</Typography>
          </ListItemIcon>
          <ListItemText 
            primary="steel AND beam" 
            secondary="Find components containing both terms"
            primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
          />
        </ListItem>
        
        <ListItem>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Typography variant="body2" fontWeight="bold">OR</Typography>
          </ListItemIcon>
          <ListItemText 
            primary="plate OR angle" 
            secondary="Find components containing either term"
            primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
          />
        </ListItem>
        
        <ListItem>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Typography variant="body2" fontWeight="bold">NOT</Typography>
          </ListItemIcon>
          <ListItemText 
            primary="girder NOT aluminum" 
            secondary="Exclude components containing 'aluminum'"
            primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
          />
        </ListItem>
        
        <ListItem>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Typography variant="body2" fontWeight="bold">*</Typography>
          </ListItemIcon>
          <ListItemText 
            primary="C6*" 
            secondary="Wildcard - matches C6, C63, C64, etc."
            primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
          />
        </ListItem>
        
        <ListItem>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Typography variant="body2" fontWeight="bold">( )</Typography>
          </ListItemIcon>
          <ListItemText 
            primary="(beam OR girder) AND steel" 
            secondary="Group terms for complex logic"
            primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Typography variant="body2" fontWeight="bold">" "</Typography>
          </ListItemIcon>
          <ListItemText 
            primary='"wide flange beam"' 
            secondary="Exact phrase matching"
            primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
          />
        </ListItem>
      </List>
      
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Tip: Use scope selection to limit search to specific fields for better precision.
      </Typography>
    </Box>
  );

  // Fetch recent components when page loads
  const { data: recentComponentsData, isLoading: recentLoading } = useQuery(
    'recent-components',
    () => getRecentComponents(20),
    {
      enabled: !debouncedQuery.trim(), // Only fetch when not searching
      onSuccess: (data) => {
        setAllRecentResults(data.recent_components || []);
        // Show load more if we have more components available than what we're displaying
        setHasMoreRecent((data.recent_components?.length === 20) && (data.total_available > 20));
        setIsLoadingMoreRecent(false);
      },
    }
  );

  // Fetch available component types
  const { data: componentTypesData } = useQuery(
    'component-types',
    getComponentTypes,
    {
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );

  // Fetch projects for filter dropdown
  const { data: projects = [] } = useQuery<ProjectResponse[]>(
    'projects',
    getProjects,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Get current project for saved searches
  const currentProjectId = filters.projectId !== 'all' && filters.projectId !== 'unassigned' ? filters.projectId : null;
  const currentProject = projects.find(p => p.id === currentProjectId);

  // Fetch saved searches for current project
  const { data: savedSearchesData, refetch: refetchSavedSearches } = useQuery(
    ['saved-searches', currentProjectId],
    () => currentProjectId ? getSavedSearchesForProject(currentProjectId) : Promise.resolve(null),
    {
      enabled: !!currentProjectId,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  // Get saved search count for limits checking
  const { data: savedSearchCountData } = useQuery(
    ['saved-search-count', currentProjectId],
    () => currentProjectId ? getSavedSearchCount(currentProjectId) : Promise.resolve(null),
    {
      enabled: !!currentProjectId,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  // Mutations for saved search operations
  const createSavedSearchMutation = useMutation(createSavedSearch, {
    onSuccess: () => {
      queryClient.invalidateQueries(['saved-searches', currentProjectId]);
      queryClient.invalidateQueries(['saved-search-count', currentProjectId]);
      setSavedSearchDialogOpen(false);
    },
  });

  const deleteSavedSearchMutation = useMutation(deleteSavedSearch, {
    onSuccess: () => {
      queryClient.invalidateQueries(['saved-searches', currentProjectId]);
      queryClient.invalidateQueries(['saved-search-count', currentProjectId]);
    },
  });

  const {
    data: searchResults,
    isLoading,
    isFetching,
  } = useQuery(
    ['search', debouncedQuery, filters, currentScopeArray, page],
    () => searchComponents({
      query: debouncedQuery || '*', // Use wildcard when no query but filters are applied
      scope: currentScopeArray,
      component_type: filters.componentType || undefined,
      project_id: filters.projectId === 'all' ? undefined :
                  filters.projectId === 'unassigned' ? null :
                  filters.projectId || undefined,
      instance_identifier: filters.instanceIdentifier || undefined,
      page,
      limit: 25,
    }),
    {
      enabled: Boolean(debouncedQuery.length > 0 || filters.componentType || filters.projectId !== 'all' || filters.instanceIdentifier), // Enable when query OR filters are present
      keepPreviousData: false,
      onSuccess: (data) => {
        if (page === 1) {
          // Reset results for new search
          setAllResults(data.results || []);
        } else {
          // Append results for load more
          setAllResults(prev => [...prev, ...(data.results || [])]);
        }
        setHasMoreResults((data.total || 0) > allResults.length + (data.results?.length || 0));
        setIsLoadingMore(false);
      },
    }
  );

  const handleFilterChange = (field: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    setPage(1); // Reset to first page when sort changes
  };

  const handleLoadMore = () => {
    if (hasMoreResults && !isLoadingMore && !isFetching) {
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    setAllResults([]);
    setPage(1);
  };

  const handleLoadMoreRecent = async () => {
    if (hasMoreRecent && !isLoadingMoreRecent && !recentLoading) {
      setIsLoadingMoreRecent(true);
      try {
        // Load more components by increasing the limit
        const currentCount = allRecentResults.length;
        const newLimit = currentCount + 20; // Load 20 more components
        
        const response = await getRecentComponents(newLimit);
        const newComponents = response.recent_components || [];
        
        setAllRecentResults(newComponents);
        
        // Check if there are more components available
        const hasMore = newComponents.length < response.total_available;
        setHasMoreRecent(hasMore);
        
      } catch (error) {
        console.error('Failed to load more recent components:', error);
        // Keep the button visible so user can try again
      } finally {
        setIsLoadingMoreRecent(false);
      }
    }
  };

  // Saved search handlers
  const handleOpenSaveSearchDialog = () => {
    setEditingSavedSearch(null);
    setSavedSearchDialogOpen(true);
  };

  const handleSaveSearch = async (searchData: SavedSearchCreate) => {
    try {
      await createSavedSearchMutation.mutateAsync(searchData);
    } catch (error) {
      console.error('Failed to save search:', error);
      throw error;
    }
  };

  const handleExecuteSavedSearch = async (savedSearch: SavedSearch) => {
    try {
      // Update search state to match the saved search
      setQuery(savedSearch.query);
      setFilters({
        componentType: savedSearch.component_type || '',
        projectId: savedSearch.project_id,
      });
      setSearchScope({
        piece_mark: savedSearch.scope.includes('piece_mark'),
        component_type: savedSearch.scope.includes('component_type'),
        description: savedSearch.scope.includes('description'),
      });
      setSortBy(savedSearch.sort_by);
      setPage(1);
      setAllResults([]);

      // Execute the search via the API (this also updates usage statistics)
      const results = await executeSavedSearch(savedSearch.id);
    } catch (error) {
      console.error('Failed to execute saved search:', error);
    }
  };

  const handleDeleteSavedSearch = async (searchId: string) => {
    try {
      await deleteSavedSearchMutation.mutateAsync(searchId);
    } catch (error) {
      console.error('Failed to delete saved search:', error);
    }
  };

  // Load suggestions when query changes
  useEffect(() => {
    if (query.length >= 2) {
      getSearchSuggestions(query, 10)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    } else {
      setSuggestions([]);
    }
  }, [query]);

  // Validate query in real-time
  useEffect(() => {
    validateQuery(query);
  }, [query]);

  // Reset page and results when search query, filters, or scope change
  useEffect(() => {
    if (debouncedQuery.trim() || filters.componentType || filters.projectId !== 'all') {
      setPage(1);
      setAllResults([]);
    }
  }, [debouncedQuery, filters.componentType, filters.projectId, searchScope]);

  // Handle scope default refresh - ensures search triggers when scope defaults to piece_mark
  useEffect(() => {
    // Check if we have a query or filters that would trigger a search
    const shouldSearch = Boolean(debouncedQuery.length > 0 || filters.componentType || filters.projectId !== 'all');
    
    if (shouldSearch) {
      // Force a fresh search by invalidating the exact query key
      queryClient.invalidateQueries(['search', debouncedQuery, filters, currentScopeArray, page]);
    }
  }, [currentScopeArray, debouncedQuery, filters, page, queryClient, searchScope]);

  // Note: Removed aggressive query invalidation useEffect here - the useQuery dependency 
  // array with memoized currentScopeArray is sufficient for cache busting

  // Don't reset recent components - let React Query handle the data

  const activeFiltersCount = [
    filters.componentType,
    filters.projectId !== 'all' ? filters.projectId : '',
    filters.instanceIdentifier
  ].filter(value => value && value.trim() !== '').length;

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Search Components
      </Typography>

      {/* Search Form */}
      <Paper sx={{ p: 3, mb: 3 }}>
        {isFetching && debouncedQuery && (
          <LinearProgress sx={{ mb: 2 }} />
        )}
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <Box sx={{ position: 'relative' }}>
              <Autocomplete
                freeSolo
                options={suggestions}
                value={query}
                onInputChange={(_, newValue) => setQuery(newValue || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    label="Search piece marks, components, or descriptions"
                    error={!queryValidation.isValid}
                    helperText={queryValidation.error || (queryValidation.queryType !== 'simple' ? `${queryValidation.queryType} query` : '')}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
                      endAdornment: (
                        <>
                          {/* Query validation indicator */}
                          {query && (
                            queryValidation.isValid ? (
                              <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20, mr: 1 }} />
                            ) : (
                              <ErrorIcon sx={{ color: 'error.main', fontSize: 20, mr: 1 }} />
                            )
                          )}
                          
                          {/* Help tooltip */}
                          <Tooltip
                            title={getSearchHelpContent()}
                            placement="bottom-end"
                            arrow
                            componentsProps={{
                              tooltip: {
                                sx: { maxWidth: 'none' }
                              }
                            }}
                          >
                            <IconButton size="small" sx={{ mr: 1 }}>
                              <HelpIcon sx={{ fontSize: 20 }} />
                            </IconButton>
                          </Tooltip>
                          
                          {/* Clear button */}
                          {query && (
                            <IconButton 
                              onClick={handleClearSearch} 
                              size="small"
                              sx={{ mr: 1 }}
                            >
                              <ClearIcon />
                            </IconButton>
                          )}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={2}>
            <Button
              variant="outlined"
              startIcon={<TuneIcon />}
              endIcon={scopeExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setScopeExpanded(!scopeExpanded)}
              fullWidth
              size="medium"
            >
              Search Scope
            </Button>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Component Type</InputLabel>
              <Select
                value={filters.componentType}
                onChange={(e) => handleFilterChange('componentType', e.target.value)}
                label="Component Type"
              >
                <MenuItem value="">All Types</MenuItem>
                {componentTypesData?.component_types?.map((type) => (
                  <MenuItem key={type} value={type}>
                    {getComponentTypeLabel(type)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Project</InputLabel>
              <Select
                value={filters.projectId}
                onChange={(e) => handleFilterChange('projectId', e.target.value)}
                label="Project"
              >
                <MenuItem value="all">All Projects</MenuItem>
                <MenuItem value="unassigned">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FolderOpen sx={{ color: 'text.secondary', fontSize: 'small' }} />
                    Unassigned
                  </Box>
                </MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Folder sx={{ color: 'primary.main', fontSize: 'small' }} />
                      {project.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Instance Identifier"
              value={filters.instanceIdentifier}
              onChange={(e) => handleFilterChange('instanceIdentifier', e.target.value)}
              placeholder="e.g., A, B, C"
              inputProps={{ maxLength: 10 }}
              helperText="Filter by specific instance (optional)"
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={() => setFilters({
                componentType: '',
                projectId: 'all',
                instanceIdentifier: '',
              })}
              disabled={activeFiltersCount === 0}
              fullWidth
            >
              Clear Filters
            </Button>
          </Grid>

        </Grid>

        {/* Scope Selection */}
        <Collapse in={scopeExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Search in these fields:
            </Typography>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={searchScope.piece_mark}
                    onChange={(e) => handleScopeChange('piece_mark', e.target.checked)}
                    color="primary"
                  />
                }
                label="Piece Marks"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={searchScope.component_type}
                    onChange={(e) => handleScopeChange('component_type', e.target.checked)}
                    color="primary"
                  />
                }
                label="Component Types"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={searchScope.description}
                    onChange={(e) => handleScopeChange('description', e.target.checked)}
                    color="primary"
                  />
                }
                label="Descriptions"
              />
            </FormGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Select at least one field to search in. Piece Marks are recommended for precise results.
            </Typography>
          </Box>
        </Collapse>

        {/* Saved Searches Panel */}
        {currentProjectId && savedSearchesData && savedSearchesData.searches.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="text"
              startIcon={<BookmarkIcon />}
              endIcon={savedSearchesExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setSavedSearchesExpanded(!savedSearchesExpanded)}
              sx={{ mb: savedSearchesExpanded ? 1 : 0 }}
              size="small"
            >
              Saved Searches ({savedSearchesData.searches.length})
              {currentProject && (
                <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                  - {currentProject.name}
                </Typography>
              )}
            </Button>
            
            <Collapse in={savedSearchesExpanded} timeout="auto" unmountOnExit>
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Grid container spacing={1}>
                  {savedSearchesData.searches.map((savedSearch) => (
                    <Grid item xs={12} sm={6} md={4} key={savedSearch.id}>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 1.5, 
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' },
                          display: 'flex',
                          flexDirection: 'column',
                          height: '100%'
                        }}
                        onClick={() => handleExecuteSavedSearch(savedSearch)}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
                            {savedSearch.name}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSavedSearch(savedSearch.id);
                            }}
                            disabled={deleteSavedSearchMutation.isLoading}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, flexGrow: 1 }}>
                          {savedSearch.query}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">
                            Used {savedSearch.execution_count} times
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {savedSearch.preview_query_type && savedSearch.preview_query_type !== 'simple' && (
                              <Chip 
                                label={savedSearch.preview_query_type} 
                                size="small" 
                                variant="outlined" 
                                sx={{ height: 16, fontSize: '0.65rem', mr: 0.5 }} 
                              />
                            )}
                            <PlayArrowIcon fontSize="small" color="primary" />
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  Click a saved search to execute it. 
                  {savedSearchCountData && (
                    <> {savedSearchCountData.remaining} of {savedSearchCountData.max_allowed} slots remaining.</>
                  )}
                </Typography>
              </Box>
            </Collapse>
          </Box>
        )}

        {/* Active Filters */}
        {(filters.componentType || filters.projectId !== 'all') && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Active Filters:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {filters.componentType && (
                <Chip
                  label={`Type: ${getComponentTypeLabel(filters.componentType)}`}
                  onDelete={() => handleFilterChange('componentType', '')}
                  size="small"
                />
              )}
              {filters.projectId !== 'all' && (
                <Chip
                  label={`Project: ${filters.projectId === 'unassigned' ? 'Unassigned' : 
                    projects.find(p => p.id === filters.projectId)?.name || 'Unknown'}`}
                  onDelete={() => handleFilterChange('projectId', 'all')}
                  size="small"
                />
              )}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Search Results or Recent Components */}
      {debouncedQuery ? (
        <Paper>
          {/* Results Header */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Grid container alignItems="center" justifyContent="space-between">
              <Grid item xs={12} md={6}>
                <Typography variant="h6">
                  Search Results
                  {searchResults && (
                    <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                      (Showing {allResults.length} of {searchResults.total} results in {searchResults.search_time_ms}ms)
                    </Typography>
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Searching in: {getScopeDisplayText()}
                  {searchResults?.query_type && searchResults.query_type !== 'simple' && (
                    <Chip 
                      label={searchResults.query_type} 
                      size="small" 
                      variant="outlined" 
                      sx={{ ml: 1, height: 20 }} 
                    />
                  )}
                  {queryValidation.queryType && queryValidation.queryType !== 'simple' && (
                    <Chip 
                      label={`client: ${queryValidation.queryType}`} 
                      size="small" 
                      variant="outlined" 
                      color="primary"
                      sx={{ ml: 1, height: 20 }} 
                    />
                  )}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                {/* Save Search Button - only show when there are results and a project is selected */}
                {allResults.length > 0 && currentProjectId && (
                  <Button
                    variant="outlined"
                    startIcon={<BookmarkBorderIcon />}
                    onClick={handleOpenSaveSearchDialog}
                    disabled={createSavedSearchMutation.isLoading}
                    sx={{ mb: 1, mr: 1, minWidth: 120 }}
                    size="small"
                  >
                    Save Search
                  </Button>
                )}
                <FormControl size="small" fullWidth>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    label="Sort By"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* Scope Effectiveness Metrics - Story 1.2 */}
          {searchResults?.scope_counts && (
            <ScopeEffectivenessMetrics
              scopeCounts={searchResults.scope_counts}
              currentScope={currentScopeArray}
              query={debouncedQuery}
            />
          )}

          {/* Warnings */}
          {searchResults?.warnings && searchResults.warnings.length > 0 && (
            <Box sx={{ p: 2, bgcolor: 'warning.light', borderBottom: 1, borderColor: 'divider' }}>
              {searchResults.warnings.map((warning, index) => (
                <Typography key={index} variant="body2" color="warning.dark">
                  ⚠️ {warning}
                </Typography>
              ))}
            </Box>
          )}

          {/* Loading State */}
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Results Table */}
          {allResults.length > 0 && (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Piece Mark</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell>Drawing</TableCell>
                      <TableCell>Project</TableCell>
                      <TableCell>Confidence</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allResults.map((component) => (
                      <SearchResultRow
                        key={component.id}
                        component={component}
                        searchTerm={debouncedQuery}
                        searchScope={currentScopeArray}
                        onViewDetails={setSelectedComponent}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Load More Button */}
              {hasMoreResults && (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Button
                    variant="outlined"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore || isFetching}
                    sx={{ minWidth: 200 }}
                  >
                    {isLoadingMore ? (
                      <>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Loading more...
                      </>
                    ) : (
                      'Load More Results'
                    )}
                  </Button>
                </Box>
              )}
            </>
          )}

          {/* No Results */}
          {allResults.length === 0 && !isLoading && debouncedQuery && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No components found matching your search criteria.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Try adjusting your search terms or filters.
              </Typography>
            </Box>
          )}
        </Paper>
      ) : (
        /* Recent Components Preview */
        <Paper>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Components
              {recentComponentsData && (
                <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                  ({recentComponentsData.total_available} total available)
                </Typography>
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Start typing in the search box above to find specific components, or browse recent additions below.
            </Typography>

            {recentLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {(allRecentResults.length > 0 || recentComponentsData?.recent_components?.length > 0) && (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Piece Mark</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>Drawing</TableCell>
                        <TableCell>Project</TableCell>
                        <TableCell>Added</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(allRecentResults.length > 0 ? allRecentResults : recentComponentsData?.recent_components || []).map((component) => (
                        <TableRow key={component.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {component.piece_mark}
                            </Typography>
                          </TableCell>
                          <TableCell>{component.component_type}</TableCell>
                          <TableCell>{component.quantity}</TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {component.drawing_file_name}
                            </Typography>
                            {component.sheet_number && (
                              <Typography variant="caption" color="text.secondary">
                                Sheet: {component.sheet_number}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{component.project_name || 'N/A'}</TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(component.created_at).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => setSelectedComponent(component.id)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Load More Button for Recent Components */}
                {hasMoreRecent && (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Button
                      variant="outlined"
                      onClick={handleLoadMoreRecent}
                      disabled={isLoadingMoreRecent || recentLoading}
                      sx={{ minWidth: 200 }}
                    >
                      {isLoadingMoreRecent ? (
                        <>
                          <CircularProgress size={20} sx={{ mr: 1 }} />
                          Loading more...
                        </>
                      ) : (
                        'Load More Components'
                      )}
                    </Button>
                  </Box>
                )}
              </>
            )}

            {allRecentResults.length === 0 && !recentComponentsData?.recent_components?.length && !recentLoading && (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No components have been processed yet. Upload some drawings to get started!
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {/* Saved Search Dialog */}
      {currentProjectId && (
        <SavedSearchDialog
          open={savedSearchDialogOpen}
          onClose={() => setSavedSearchDialogOpen(false)}
          onSave={handleSaveSearch}
          editingSearch={editingSavedSearch}
          currentQuery={query}
          currentScope={currentScopeArray}
          currentFilters={{
            componentType: filters.componentType,
            projectId: currentProjectId,
            instanceIdentifier: filters.instanceIdentifier,
            drawingType: undefined, // Not currently supported in SearchPage filters
          }}
          currentSort={{
            sortBy: sortBy,
            sortOrder: 'desc', // Default since we don't track order separately
          }}
          projectId={currentProjectId}
          isAtLimit={savedSearchCountData?.remaining === 0}
          maxSearches={savedSearchCountData?.max_allowed}
        />
      )}

      {/* Component Detail Modal */}
      {selectedComponent && (
        <FlexibleComponentCard
          componentId={selectedComponent}
          open={!!selectedComponent}
          onClose={() => setSelectedComponent(null)}
          mode="view"
        />
      )}
    </Box>
  );
};

export default SearchPage;