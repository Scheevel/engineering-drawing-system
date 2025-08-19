import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Toolbar,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  Description as DrawingIcon,
  Upload as UploadIcon,
  Folder as FolderIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';

const drawerWidthExpanded = 240;
const drawerWidthCollapsed = 64;

interface NavigationProps {
  onDrawerToggle?: (isExpanded: boolean) => void;
}

const Navigation: React.FC<NavigationProps> = ({ onDrawerToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('navigation-expanded');
    return !isMobile && (saved === null ? false : saved === 'true');
  });
  const [isHovered, setIsHovered] = useState(false);

  const effectiveExpanded = isMobile || isExpanded || isHovered;
  const drawerWidth = effectiveExpanded ? drawerWidthExpanded : drawerWidthCollapsed;

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Projects', icon: <FolderIcon />, path: '/projects' },
    { text: 'Search Components', icon: <SearchIcon />, path: '/search' },
    { text: 'Upload Drawings', icon: <UploadIcon />, path: '/upload' },
  ];

  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('navigation-expanded', isExpanded.toString());
    }
    onDrawerToggle?.(effectiveExpanded);
  }, [isExpanded, isMobile, effectiveExpanded, onDrawerToggle]);

  useEffect(() => {
    if (isMobile && isExpanded) {
      setIsExpanded(false);
    }
  }, [isMobile]);

  const handleToggle = () => {
    if (!isMobile) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleMouseEnter = () => {
    if (!isMobile && !isExpanded) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsHovered(false);
    }
  };

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.standard,
        }),
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: 'border-box',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.standard,
          }),
          overflowX: 'hidden',
        },
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Toolbar>
        {!isMobile && (
          <IconButton
            onClick={handleToggle}
            sx={{
              ml: 'auto',
              opacity: effectiveExpanded ? 1 : 0,
              transition: theme.transitions.create('opacity', {
                duration: theme.transitions.duration.shorter,
              }),
            }}
          >
            {isExpanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      <List sx={{ py: 0 }}>
        {menuItems.map((item) => {
          const isSelected = location.pathname === item.path;
          const listItem = (
            <ListItem key={item.text} disablePadding sx={{ display: 'block', m: 0, p: 0 }}>
              <ListItemButton
                selected={isSelected}
                onClick={() => navigate(item.path)}
                sx={{
                  height: 48,
                  minHeight: 48,
                  maxHeight: 48,
                  justifyContent: effectiveExpanded ? 'initial' : 'center',
                  px: 2.5,
                  my: 0,
                  py: 0,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: effectiveExpanded ? 3 : 'auto',
                    justifyContent: 'center',
                    height: 24,
                    width: 24,
                    display: 'flex',
                    alignItems: 'center',
                    // Fix icon alignment issues in collapsed state
                    '& .MuiSvgIcon-root': {
                      // Apply specific adjustments for misaligned icons
                      ...(item.text === 'Search Components' && {
                        transform: 'translateY(-1px)',
                      }),
                      ...(item.text === 'Upload Drawings' && {
                        transform: 'translateY(1px)',
                      }),
                    },
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{
                    opacity: effectiveExpanded ? 1 : 0,
                    transition: theme.transitions.create('opacity', {
                      duration: theme.transitions.duration.shorter,
                    }),
                  }}
                />
              </ListItemButton>
            </ListItem>
          );

          if (!effectiveExpanded && !isMobile) {
            return (
              <Tooltip
                key={item.text}
                title={item.text}
                placement="right"
                arrow
              >
                {listItem}
              </Tooltip>
            );
          }

          return listItem;
        })}
      </List>
    </Drawer>
  );
};

export default Navigation;