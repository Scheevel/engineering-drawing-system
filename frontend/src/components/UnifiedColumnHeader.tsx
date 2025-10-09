import React, { useState } from 'react';
import {
  Box,
  Typography,
  Menu,
  MenuItem,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
  ListItemIcon,
  ListItemText,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  ArrowDropDown as ArrowDropDownIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Clear as ClearIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

export interface ColumnFilterOption {
  value: string | number;
  label: string;
  color?: string; // For confidence indicators
  icon?: React.ReactNode;
}

interface UnifiedColumnHeaderProps {
  label: string;
  columnKey: string; // e.g., 'piece_mark', 'component_type', 'confidence'

  // Sort props
  sortable?: boolean;
  sortBy?: string;
  onSort?: (column: string) => void;

  // Filter props
  filterable?: boolean;
  filterOptions?: ColumnFilterOption[];
  selectedFilterValue?: string | number;
  onFilterChange?: (value: string | number) => void;
  searchable?: boolean; // Show search box for filter options
}

const UnifiedColumnHeader: React.FC<UnifiedColumnHeaderProps> = ({
  label,
  columnKey,
  sortable = false,
  sortBy,
  onSort,
  filterable = false,
  filterOptions = [],
  selectedFilterValue,
  onFilterChange,
  searchable = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const open = Boolean(anchorEl);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSearchQuery('');
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSearchQuery('');
  };

  const handleSortAsc = () => {
    if (onSort) {
      onSort(columnKey);
      // Cycle to ascending
      if (!sortBy.startsWith(columnKey)) {
        onSort(columnKey); // First click = asc
      }
    }
    handleCloseMenu();
  };

  const handleSortDesc = () => {
    if (onSort) {
      // Force descending
      const currentSort = sortBy;
      if (!currentSort.startsWith(columnKey)) {
        onSort(columnKey); // First click = asc
        setTimeout(() => onSort(columnKey), 0); // Second click = desc
      } else if (currentSort.endsWith('_asc')) {
        onSort(columnKey); // Toggle to desc
      }
    }
    handleCloseMenu();
  };

  const handleClearSort = () => {
    if (onSort) {
      // Cycle back to relevance
      while (sortBy.startsWith(columnKey)) {
        onSort(columnKey);
      }
    }
    handleCloseMenu();
  };

  const handleFilterChange = (value: string | number) => {
    if (onFilterChange) {
      onFilterChange(value);
    }
    handleCloseMenu();
  };

  // Check if column is currently sorted
  const isSorted = sortBy ? sortBy.startsWith(columnKey) : false;
  const sortDirection = sortBy && sortBy.endsWith('_asc') ? 'asc' : 'desc';

  // Check if column has active filter
  const hasFilter = filterable && selectedFilterValue !== undefined &&
    selectedFilterValue !== '' && selectedFilterValue !== 'all' && selectedFilterValue !== 0;

  // Filter options based on search
  const filteredOptions = searchable && searchQuery
    ? filterOptions.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filterOptions;

  // Determine if header is interactive
  const isInteractive = sortable || filterable;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      {isInteractive ? (
        <>
          {/* Clickable header */}
          <Box
            onClick={handleOpenMenu}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: isSorted || hasFilter ? 'primary.main' : 'inherit',
              }}
            >
              {label}
            </Typography>

            {/* Sort direction indicator */}
            {isSorted && (
              sortDirection === 'asc' ? (
                <ArrowUpwardIcon sx={{ fontSize: 16, ml: 0.5 }} />
              ) : (
                <ArrowDownwardIcon sx={{ fontSize: 16, ml: 0.5 }} />
              )
            )}

            {/* Dropdown arrow */}
            <ArrowDropDownIcon sx={{ fontSize: 20 }} />

            {/* Active filter badge */}
            {hasFilter && (
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  ml: 0.5,
                }}
              />
            )}
          </Box>

          {/* Unified menu with sort + filter options */}
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleCloseMenu}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            PaperProps={{
              sx: {
                minWidth: 200,
                maxHeight: 400,
              },
            }}
          >
            {/* Sort options */}
            {sortable && (
              <>
                <MenuItem onClick={handleSortAsc}>
                  <ListItemIcon>
                    <ArrowUpwardIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Sort Ascending</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleSortDesc}>
                  <ListItemIcon>
                    <ArrowDownwardIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Sort Descending</ListItemText>
                </MenuItem>
                {isSorted && (
                  <MenuItem onClick={handleClearSort}>
                    <ListItemIcon>
                      <ClearIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Clear Sort</ListItemText>
                  </MenuItem>
                )}
                {filterable && <Divider sx={{ my: 1 }} />}
              </>
            )}

            {/* Filter options */}
            {filterable && (
              <>
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Filter by {label}
                  </Typography>
                </Box>

                {/* Search box */}
                {searchable && (
                  <Box sx={{ px: 2, pb: 1 }}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>
                )}

                <RadioGroup value={selectedFilterValue} sx={{ py: 0.5 }}>
                  {filteredOptions.map((option) => (
                    <MenuItem
                      key={option.value}
                      onClick={() => handleFilterChange(option.value)}
                      sx={{ py: 0.5, px: 2 }}
                    >
                      <FormControlLabel
                        value={option.value}
                        control={<Radio size="small" />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {option.color && (
                              <Box
                                sx={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  bgcolor: option.color,
                                }}
                              />
                            )}
                            {option.icon}
                            <Typography variant="body2">{option.label}</Typography>
                          </Box>
                        }
                        sx={{ margin: 0, width: '100%' }}
                      />
                    </MenuItem>
                  ))}
                </RadioGroup>

                {searchable && filteredOptions.length === 0 && (
                  <Box sx={{ px: 2, py: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No options match "{searchQuery}"
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Menu>
        </>
      ) : (
        // Non-interactive header (e.g., Drawing, Actions)
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
      )}
    </Box>
  );
};

export default UnifiedColumnHeader;
