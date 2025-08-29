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
  Visibility as VisibilityIcon,
} from '@mui/icons-material';

interface DrawingContextMenuProps {
  open: boolean;
  anchorPosition: { left: number; top: number } | null;
  onClose: () => void;
  clickedComponent?: {
    id: string;
    piece_mark: string;
    instance_identifier?: string;
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

  // Always show context menu, but with different options based on edit mode
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
              {clickedComponent.instance_identifier ? 
                `${clickedComponent.piece_mark}-${clickedComponent.instance_identifier}` : 
                clickedComponent.piece_mark}
              {clickedComponent.manual_creation && ' (Manual)'}
            </Typography>
          </MenuItem>
          <Divider />
          
          {editMode ? (
            // Full options in edit mode
            <>
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
            // Limited options when not in edit mode
            <>
              <MenuItem onClick={() => handleMenuItemClick(() => onEditComponent(clickedComponent.id))}>
                <ListItemIcon>
                  <VisibilityIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>View Component Details</ListItemText>
              </MenuItem>
            </>
          )}
        </>
      ) : (
        // Context menu for empty area - always allow marker creation
        <>
          <MenuItem onClick={() => handleMenuItemClick(onCreateComponent)}>
            <ListItemIcon>
              <AddIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Create Marker Here</ListItemText>
          </MenuItem>
          
          {!editMode && (
            <MenuItem disabled>
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Enter edit mode for more options
              </Typography>
            </MenuItem>
          )}
        </>
      )}
    </Menu>
  );
};

export default DrawingContextMenu;