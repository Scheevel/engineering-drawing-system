import React, { useState } from 'react';
import {
  TableSortLabel,
  Menu,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  IconButton,
  Typography,
  Divider,
} from '@mui/material';
import { FilterList as FilterListIcon } from '@mui/icons-material';

interface ConfidenceColumnHeaderProps {
  sortBy: string;
  confidenceQuartile: number; // 0-4 (0 = all, 1-4 = quartiles)
  onSort: (column: string) => void;
  onFilterChange: (quartile: number) => void;
}

const QUARTILE_OPTIONS = [
  { value: 0, label: 'All Levels', color: 'inherit' },
  { value: 1, label: '0-25% (Low)', color: 'error.main', emoji: '🔴' },
  { value: 2, label: '25-50% (Medium-Low)', color: 'orange', emoji: '🟠' },
  { value: 3, label: '50-75% (Medium-High)', color: 'warning.main', emoji: '🟡' },
  { value: 4, label: '75-100% (High)', color: 'success.main', emoji: '🟢' },
];

const ConfidenceColumnHeader: React.FC<ConfidenceColumnHeaderProps> = ({
  sortBy,
  confidenceQuartile,
  onSort,
  onFilterChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation(); // Prevent sort from triggering
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleQuartileChange = (quartile: number) => {
    onFilterChange(quartile);
    handleCloseMenu();
  };

  const isActive = sortBy.startsWith('confidence');
  const direction = sortBy === 'confidence_asc' ? 'asc' : 'desc';
  const hasFilter = confidenceQuartile > 0;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {/* Sortable label */}
      <TableSortLabel
        active={isActive}
        direction={direction}
        onClick={() => onSort('confidence')}
      >
        Confidence
      </TableSortLabel>

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
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Filter by Confidence
          </Typography>
        </Box>
        <Divider />
        <RadioGroup value={confidenceQuartile} sx={{ px: 1, py: 0.5 }}>
          {QUARTILE_OPTIONS.map((option) => (
            <MenuItem
              key={option.value}
              onClick={() => handleQuartileChange(option.value)}
              sx={{
                py: 0.5,
                px: 1,
              }}
            >
              <FormControlLabel
                value={option.value}
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {option.emoji && (
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: option.color,
                        }}
                      />
                    )}
                    <Typography variant="body2">{option.label}</Typography>
                  </Box>
                }
                sx={{ margin: 0, width: '100%' }}
              />
            </MenuItem>
          ))}
        </RadioGroup>
      </Menu>
    </Box>
  );
};

export default ConfidenceColumnHeader;
