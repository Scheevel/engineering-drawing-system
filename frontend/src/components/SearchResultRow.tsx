import React, { useState } from 'react';
import {
  TableRow,
  TableCell,
  IconButton,
  Typography,
  Chip,
  Collapse,
  Box,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import HighlightedText from './HighlightedText.tsx';

interface SearchResultRowProps {
  component: any;
  searchTerm: string;
  onViewDetails: (componentId: string) => void;
}

const SearchResultRow: React.FC<SearchResultRowProps> = ({
  component,
  searchTerm,
  onViewDetails,
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <>
      <TableRow hover sx={{ cursor: 'pointer' }} onClick={handleExpandClick}>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="small" onClick={handleExpandClick}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <HighlightedText
              text={component.piece_mark}
              searchTerm={searchTerm}
              variant="body2"
              fontWeight="bold"
            />
          </Box>
        </TableCell>
        <TableCell>{component.component_type}</TableCell>
        <TableCell>{component.quantity}</TableCell>
        <TableCell>
          <HighlightedText
            text={component.drawing_file_name}
            searchTerm={searchTerm}
            variant="body2"
          />
          {component.sheet_number && (
            <Typography variant="caption" color="text.secondary" display="block">
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
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(component.id);
            }}
          >
            <ViewIcon />
          </IconButton>
        </TableCell>
      </TableRow>

      {/* Inline Preview Row */}
      <TableRow>
        <TableCell colSpan={7} sx={{ paddingBottom: 0, paddingTop: 0 }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div">
                Component Details
              </Typography>
              
              <Grid container spacing={3}>
                {/* Basic Information */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Basic Information
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    {component.description && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Description:
                        </Typography>
                        <HighlightedText
                          text={component.description}
                          searchTerm={searchTerm}
                          variant="body2"
                          display="block"
                        />
                      </Box>
                    )}
                    {component.material_type && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Material:
                        </Typography>
                        <Typography variant="body2">
                          {component.material_type}
                        </Typography>
                      </Box>
                    )}
                    {(component.location_x !== null && component.location_y !== null) && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Location on Drawing:
                        </Typography>
                        <Typography variant="body2">
                          X: {Math.round(component.location_x || 0)}, Y: {Math.round(component.location_y || 0)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>

                {/* Dimensions */}
                {component.dimensions && component.dimensions.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Dimensions
                    </Typography>
                    <List dense sx={{ pl: 2 }}>
                      {component.dimensions.slice(0, 3).map((dim: any, index: number) => (
                        <ListItem key={index} disableGutters>
                          <ListItemText
                            primary={`${dim.dimension_type || dim.type}: ${dim.nominal_value || dim.value}${dim.unit}`}
                            secondary={dim.tolerance ? `Tolerance: ${dim.tolerance}` : undefined}
                            primaryTypographyProps={{ variant: 'body2' }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      ))}
                      {component.dimensions.length > 3 && (
                        <ListItem disableGutters>
                          <ListItemText
                            primary={`+${component.dimensions.length - 3} more dimensions`}
                            primaryTypographyProps={{ variant: 'caption', style: { fontStyle: 'italic' } }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Grid>
                )}

                {/* Specifications */}
                {component.specifications && component.specifications.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Specifications
                    </Typography>
                    <List dense sx={{ pl: 2 }}>
                      {component.specifications.slice(0, 3).map((spec: any, index: number) => (
                        <ListItem key={index} disableGutters>
                          <ListItemText
                            primary={`${spec.specification_type || spec.type}: ${spec.value}`}
                            secondary={spec.description}
                            primaryTypographyProps={{ variant: 'body2' }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      ))}
                      {component.specifications.length > 3 && (
                        <ListItem disableGutters>
                          <ListItemText
                            primary={`+${component.specifications.length - 3} more specifications`}
                            primaryTypographyProps={{ variant: 'caption', style: { fontStyle: 'italic' } }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Grid>
                )}
              </Grid>
              
              <Divider sx={{ mt: 2 }} />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export default SearchResultRow;