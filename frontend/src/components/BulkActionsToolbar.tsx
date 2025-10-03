import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckBox as CheckBoxIcon,
  AddBox as AssignIcon,
  RemoveCircleOutline as RemoveIcon,
} from '@mui/icons-material';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkAssign: () => void;
  onBulkRemove: () => void;
}

const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  onClearSelection,
  onBulkAssign,
  onBulkRemove,
}) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'sticky',
        top: 16,
        zIndex: 10,
        mb: 2,
        p: 2,
        backgroundColor: 'primary.main',
        color: 'primary.contrastText',
        borderRadius: 2,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={2}>
          <CheckBoxIcon />
          <Typography variant="h6">
            {selectedCount} drawing{selectedCount !== 1 ? 's' : ''} selected
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AssignIcon />}
            onClick={onBulkAssign}
            sx={{ color: 'white' }}
          >
            Assign to Projects
          </Button>
          <Button
            variant="outlined"
            startIcon={<RemoveIcon />}
            onClick={onBulkRemove}
            sx={{
              color: 'white',
              borderColor: 'white',
              '&:hover': {
                borderColor: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            Remove from Projects
          </Button>
          <Tooltip title="Clear selection">
            <IconButton
              onClick={onClearSelection}
              sx={{
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default BulkActionsToolbar;
