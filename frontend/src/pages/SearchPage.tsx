import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Clear as ClearIcon,
  Folder,
  FolderOpen,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { searchComponents, getSearchSuggestions, getRecentComponents, getComponentTypes, getProjects, type ProjectResponse } from '../services/api.ts';
import ComponentDetailModal from '../components/ComponentDetailModal.tsx';
import SearchResultRow from '../components/SearchResultRow.tsx';
import { useDebounce } from '../hooks/useDebounce.ts';

interface SearchFilters {
  componentType: string;
  projectId: string;
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
  });
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
  
  // Debounce search query to avoid excessive API calls
  const debouncedQuery = useDebounce(query, 300);

  // Fetch recent components when page loads
  const { data: recentComponentsData, isLoading: recentLoading } = useQuery(
    'recent-components',
    () => getRecentComponents(20),
    {
      enabled: !debouncedQuery.trim(), // Only fetch when not searching
      onSuccess: (data) => {
        console.log('Recent components fetched:', data);
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

  const {
    data: searchResults,
    isLoading,
    isFetching,
  } = useQuery(
    ['search', debouncedQuery, filters, page],
    () => searchComponents({
      query: debouncedQuery || '*', // Use wildcard when no query but filters are applied
      component_type: filters.componentType || undefined,
      project_id: filters.projectId === 'all' ? undefined :
                  filters.projectId === 'unassigned' ? null :
                  filters.projectId || undefined,
      page,
      limit: 25,
    }),
    {
      enabled: Boolean(debouncedQuery.length > 0 || filters.componentType || filters.projectId !== 'all'), // Enable when query OR filters are present
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

  // Reset page and results when search query or filters change
  useEffect(() => {
    if (debouncedQuery.trim() || filters.componentType || filters.projectId !== 'all') {
      setPage(1);
      setAllResults([]);
    }
  }, [debouncedQuery, filters.componentType, filters.projectId]);

  // Don't reset recent components - let React Query handle the data

  const activeFiltersCount = Object.values(filters).filter(value => 
    typeof value === 'string' ? value : false
  ).length;

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
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
                    endAdornment: (
                      <>
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
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={() => setFilters({
                componentType: '',
                projectId: 'all',
              })}
              disabled={activeFiltersCount === 0}
              fullWidth
            >
              Clear Filters
            </Button>
          </Grid>

        </Grid>


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
              </Grid>
              <Grid item xs={12} md={3}>
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

            {console.log('Rendering recent components, allRecentResults:', allRecentResults)}
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

      {/* Component Detail Modal */}
      {selectedComponent && (
        <ComponentDetailModal
          componentId={selectedComponent}
          open={!!selectedComponent}
          onClose={() => setSelectedComponent(null)}
        />
      )}
    </Box>
  );
};

export default SearchPage;