import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Divider,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

export interface FilterOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface FilterableColumnHeaderProps {
  label: string;
  options: FilterOption[];
  selectedValue: string; // Single value (backend constraint)
  onChange: (value: string) => void;
  searchable?: boolean; // Show search box when > 10 options
}

const FilterableColumnHeader: React.FC<FilterableColumnHeaderProps> = ({
  label,
  options,
  selectedValue,
  onChange,
  searchable = options.length > 10,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const open = Boolean(anchorEl);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setSearchQuery(''); // Reset search when opening
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSearchQuery('');
  };

  const handleOptionChange = (value: string) => {
    onChange(value);
    handleCloseMenu();
  };

  // Filter options based on search query
  const filteredOptions = searchable
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const hasFilter = selectedValue && selectedValue !== 'all' && selectedValue !== '';
  const selectedOption = options.find((opt) => opt.value === selectedValue);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {/* Column label */}
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>

      {/* Filter icon */}
      <IconButton
        size="small"
        onClick={handleOpenMenu}
        sx={{
          color: hasFilter ? 'primary.main' : 'action.active',
          padding: 0.5,
        }}
      >
        <FilterListIcon fontSize="small" />
      </IconButton>

      {/* Active filter indicator */}
      {hasFilter && selectedOption && (
        <Typography
          variant="caption"
          sx={{
            color: 'primary.main',
            fontWeight: 600,
            maxWidth: 80,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          : {selectedOption.label}
        </Typography>
      )}

      {/* Filter menu */}
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
            maxHeight: 400,
            width: 250,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Filter by {label}
          </Typography>
        </Box>

        {/* Search box (conditional) */}
        {searchable && (
          <Box sx={{ px: 2, pb: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder={`Search ${label.toLowerCase()}...`}
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

        <Divider />

        {/* Radio group with options */}
        <RadioGroup value={selectedValue} sx={{ py: 0.5 }}>
          {filteredOptions.map((option) => (
            <MenuItem
              key={option.value}
              onClick={() => handleOptionChange(option.value)}
              sx={{ py: 0.5, px: 2 }}
            >
              <FormControlLabel
                value={option.value}
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {option.icon}
                    <Typography variant="body2">{option.label}</Typography>
                  </Box>
                }
                sx={{ margin: 0, width: '100%' }}
              />
            </MenuItem>
          ))}
        </RadioGroup>

        {/* No results message */}
        {searchable && filteredOptions.length === 0 && (
          <Box sx={{ px: 2, py: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No options match "{searchQuery}"
            </Typography>
          </Box>
        )}
      </Menu>
    </Box>
  );
};

export default FilterableColumnHeader;
