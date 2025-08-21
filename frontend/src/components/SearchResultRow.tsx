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
  searchScope?: string[]; // Array of scope fields that should be highlighted
  onViewDetails: (componentId: string) => void;
}

const SearchResultRow: React.FC<SearchResultRowProps> = ({
  component,
  searchTerm,
  searchScope = ['piece_mark'], // Default to piece_mark scope if not specified
  onViewDetails,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Helper function to determine if a field should be highlighted based on search scope
  const getHighlightTerm = (fieldName: string): string => {
    if (!searchScope || searchScope.length === 0) {
      return fieldName === 'piece_mark' ? searchTerm : ''; // Default to piece_mark only
    }
    return searchScope.includes(fieldName) ? searchTerm : '';
  };

  // Helper function to check if a field contains the search term (case-insensitive)
  const fieldContainsSearchTerm = (fieldValue: string | null | undefined, searchTerm: string): boolean => {
    if (!fieldValue || !searchTerm || searchTerm.trim() === '') {
      return false;
    }
    return fieldValue.toLowerCase().includes(searchTerm.toLowerCase());
  };

  // Get field match indicators for fields that contain the search term and are in scope
  const getFieldMatchIndicators = () => {
    if (!searchTerm || searchTerm.trim() === '' || !searchScope || searchScope.length === 0) {
      return [];
    }

    const indicators = [];
    const fieldMappings = {
      piece_mark: { value: component.piece_mark, label: 'Piece Mark' },
      component_type: { value: component.component_type, label: 'Type' },
      description: { value: component.description, label: 'Description' }
    };

    // Only show indicators for fields that are in search scope AND contain the search term
    for (const [fieldKey, fieldData] of Object.entries(fieldMappings)) {
      if (searchScope.includes(fieldKey) && fieldContainsSearchTerm(fieldData.value, searchTerm)) {
        indicators.push(
          <Chip
            key={fieldKey}
            label={fieldData.label}
            size="small"
            variant="filled"
            color="primary"
            aria-label={`Field contains search match: ${fieldData.label}`}
            sx={{
              fontSize: '0.65rem',
              height: 18,
              mr: 0.5,
              mb: 0.5,
            }}
          />
        );
      }
    }

    return indicators;
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <>
      <TableRow hover sx={{ cursor: 'pointer' }} onClick={handleExpandClick}>
        <TableCell>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton size="small" onClick={handleExpandClick}>
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
              <HighlightedText
                text={component.piece_mark}
                searchTerm={getHighlightTerm('piece_mark')}
                variant="body2"
                fontWeight="bold"
              />
            </Box>
            {/* Field Match Indicators - Story 1.1 */}
            {getFieldMatchIndicators().length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', ml: 5 }}>
                {getFieldMatchIndicators()}
              </Box>
            )}
          </Box>
        </TableCell>
        <TableCell>
          <HighlightedText
            text={component.component_type}
            searchTerm={getHighlightTerm('component_type')}
            variant="body2"
          />
        </TableCell>
        <TableCell>{component.quantity}</TableCell>
        <TableCell>
          <HighlightedText
            text={component.drawing_file_name}
            searchTerm={getHighlightTerm('drawing_file_name')}
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
                          searchTerm={getHighlightTerm('description')}
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