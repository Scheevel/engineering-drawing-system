import React from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as DuplicateIcon,
  CheckCircle as VerifyIcon,
  Straighten as DimensionIcon,
  Assignment as SpecIcon,
} from '@mui/icons-material';

interface DrawingContextMenuProps {
  open: boolean;
  anchorPosition: { left: number; top: number } | null;
  onClose: () => void;
  clickedComponent?: {
    id: string;
    piece_mark: string;
    manual_creation?: boolean;
  } | null;
  onCreateComponent: () => void;
  onEditComponent: (componentId: string) => void;
  onDeleteComponent: (componentId: string) => void;
  onDuplicateComponent: (componentId: string) => void;
  onVerifyComponent: (componentId: string) => void;
  editMode: boolean;
}

const DrawingContextMenu: React.FC<DrawingContextMenuProps> = ({
  open,
  anchorPosition,
  onClose,
  clickedComponent,
  onCreateComponent,
  onEditComponent,
  onDeleteComponent,
  onDuplicateComponent,
  onVerifyComponent,
  editMode,
}) => {
  const handleMenuItemClick = (action: () => void) => {
    action();
    onClose();
  };

  if (!editMode) {
    return null; // Only show context menu in edit mode
  }

  return (
    <Menu
      open={open}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={anchorPosition || undefined}
      slotProps={{
        paper: {
          style: {
            maxHeight: 300,
            minWidth: 200,
          },
        },
      }}
    >
      {clickedComponent ? (
        // Context menu for existing component
        <>
          <MenuItem disabled>
            <Typography variant="subtitle2" color="text.secondary">
              {clickedComponent.piece_mark}
              {clickedComponent.manual_creation && ' (Manual)'}
            </Typography>
          </MenuItem>
          <Divider />
          
          <MenuItem onClick={() => handleMenuItemClick(() => onEditComponent(clickedComponent.id))}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Component</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={() => handleMenuItemClick(() => onDuplicateComponent(clickedComponent.id))}>
            <ListItemIcon>
              <DuplicateIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Duplicate Component</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={() => handleMenuItemClick(() => onVerifyComponent(clickedComponent.id))}>
            <ListItemIcon>
              <VerifyIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Mark as Verified</ListItemText>
          </MenuItem>
          
          <Divider />
          
          <MenuItem>
            <ListItemIcon>
              <DimensionIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Add Dimension</ListItemText>
          </MenuItem>
          
          <MenuItem>
            <ListItemIcon>
              <SpecIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Add Specification</ListItemText>
          </MenuItem>
          
          <Divider />
          
          <MenuItem 
            onClick={() => handleMenuItemClick(() => onDeleteComponent(clickedComponent.id))}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete Component</ListItemText>
          </MenuItem>
        </>
      ) : (
        // Context menu for empty area (create new component)
        <>
          <MenuItem onClick={() => handleMenuItemClick(onCreateComponent)}>
            <ListItemIcon>
              <AddIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Create Component Here</ListItemText>
          </MenuItem>
        </>
      )}
    </Menu>
  );
};

export default DrawingContextMenu;