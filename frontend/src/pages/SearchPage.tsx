import React, { useState, useCallback, useEffect } from 'react';
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
  TablePagination,
  CircularProgress,
  IconButton,
  Autocomplete,
  FormControlLabel,
  Switch,
  Badge,
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  GetApp as ExportIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { searchComponents, getSearchSuggestions, getRecentComponents } from '../services/api.ts';
import ComponentDetailModal from '../components/ComponentDetailModal.tsx';

interface SearchFilters {
  componentType: string;
  projectId: string;
  drawingType: string;
  fuzzy: boolean;
}

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    componentType: '',
    projectId: '',
    drawingType: '',
    fuzzy: false,
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Fetch recent components when page loads
  const { data: recentComponentsData, isLoading: recentLoading } = useQuery(
    'recent-components',
    () => getRecentComponents(6),
    {
      enabled: !query.trim(), // Only fetch when not searching
    }
  );

  const {
    data: searchResults,
    isLoading,
    refetch,
    isFetching,
  } = useQuery(
    ['search', query, filters, page, rowsPerPage],
    () => searchComponents({
      query,
      ...filters,
      page: page + 1,
      limit: rowsPerPage,
    }),
    {
      enabled: query.length > 0,
      keepPreviousData: true,
    }
  );

  const handleSearch = useCallback(() => {
    setPage(0);
    refetch();
  }, [refetch]);

  const handleFilterChange = (field: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
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

  const handleExport = async () => {
    if (!searchResults?.results) return;
    
    const componentIds = searchResults.results.map(r => r.id);
    // Call export API
    console.log('Exporting:', componentIds);
  };

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
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
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
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {params.InputProps.endAdornment}
                        <IconButton onClick={handleSearch} disabled={!query.trim()}>
                          <SearchIcon />
                        </IconButton>
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
                <MenuItem value="wide_flange">Wide Flange (W)</MenuItem>
                <MenuItem value="hss">HSS</MenuItem>
                <MenuItem value="angle">Angle (L)</MenuItem>
                <MenuItem value="channel">Channel (C)</MenuItem>
                <MenuItem value="plate">Plate (PL)</MenuItem>
                <MenuItem value="generic">Generic</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Drawing Type</InputLabel>
              <Select
                value={filters.drawingType}
                onChange={(e) => handleFilterChange('drawingType', e.target.value)}
                label="Drawing Type"
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="e_sheet">E Sheet</MenuItem>
                <MenuItem value="shop_drawing">Shop Drawing</MenuItem>
                <MenuItem value="detail_drawing">Detail Drawing</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={1}>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={!query.trim() || isFetching}
              fullWidth
            >
              Search
            </Button>
          </Grid>
          
          <Grid item xs={12} md={1}>
            <Badge badgeContent={activeFiltersCount} color="primary">
              <Button
                variant="outlined"
                startIcon={<TuneIcon />}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                fullWidth
              >
                Filters
              </Button>
            </Badge>
          </Grid>
        </Grid>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom>
              Advanced Filters
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.fuzzy}
                      onChange={(e) => handleFilterChange('fuzzy', e.target.checked)}
                    />
                  }
                  label="Fuzzy Search"
                />
                <Typography variant="caption" display="block" color="text.secondary">
                  Find similar matches (e.g., "CG3" matches "C63")
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Project ID"
                  value={filters.projectId}
                  onChange={(e) => handleFilterChange('projectId', e.target.value)}
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Button
                  variant="outlined"
                  onClick={() => setFilters({
                    componentType: '',
                    projectId: '',
                    drawingType: '',
                    fuzzy: false,
                  })}
                  disabled={activeFiltersCount === 0}
                >
                  Clear All Filters
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Active Filters */}
        {(filters.componentType || filters.drawingType) && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Active Filters:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {filters.componentType && (
                <Chip
                  label={`Type: ${filters.componentType}`}
                  onDelete={() => handleFilterChange('componentType', '')}
                  size="small"
                />
              )}
              {filters.drawingType && (
                <Chip
                  label={`Drawing: ${filters.drawingType}`}
                  onDelete={() => handleFilterChange('drawingType', '')}
                  size="small"
                />
              )}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Search Results or Recent Components */}
      {query ? (
        <Paper>
          {/* Results Header */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Grid container alignItems="center" justifyContent="space-between">
              <Grid item>
                <Typography variant="h6">
                  Search Results
                  {searchResults && (
                    <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                      ({searchResults.total} results in {searchResults.search_time_ms}ms)
                    </Typography>
                  )}
                </Typography>
              </Grid>
              <Grid item>
                <Button
                  startIcon={<ExportIcon />}
                  onClick={handleExport}
                  disabled={!searchResults?.results?.length}
                >
                  Export Results
                </Button>
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
          {searchResults?.results && (
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
                    {searchResults.results.map((component) => (
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
                          {component.confidence_score !== null && component.confidence_score !== undefined && (
                            <Chip
                              label={`${Math.round(component.confidence_score * 100)}%`}
                              size="small"
                              color={component.confidence_score > 0.8 ? 'success' : 'warning'}
                            />
                          )}
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

              <TablePagination
                component="div"
                count={searchResults.total}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </>
          )}

          {/* No Results */}
          {searchResults && searchResults.results.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No components found matching your search criteria.
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

            {recentComponentsData?.recent_components && (
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
                    {recentComponentsData.recent_components.map((component) => (
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
            )}

            {recentComponentsData?.recent_components && recentComponentsData.recent_components.length === 0 && (
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