import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  Alert,
  Box,
  Chip,
} from '@mui/material';
import { SavedSearchCreate, SavedSearchUpdate, SavedSearch } from '../services/api';

interface SavedSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (searchData: SavedSearchCreate | SavedSearchUpdate) => Promise<void>;
  editingSearch?: SavedSearch | null;
  currentQuery: string;
  currentScope: string[];
  currentFilters: {
    componentType?: string;
    projectId?: string;
    instanceIdentifier?: string;
    drawingType?: string;
  };
  currentSort: {
    sortBy: string;
    sortOrder: string;
  };
  projectId: string;
  isAtLimit?: boolean;
  maxSearches?: number;
}

const SavedSearchDialog: React.FC<SavedSearchDialogProps> = ({
  open,
  onClose,
  onSave,
  editingSearch,
  currentQuery,
  currentScope,
  currentFilters,
  currentSort,
  projectId,
  isAtLimit = false,
  maxSearches = 50,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<string[]>([]);
  const [componentType, setComponentType] = useState('');
  const [instanceIdentifier, setInstanceIdentifier] = useState('');
  const [drawingType, setDrawingType] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [sortOrder, setSortOrder] = useState('desc');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize form when dialog opens or editing search changes
  useEffect(() => {
    if (open) {
      if (editingSearch) {
        // Edit mode - populate with existing search
        setName(editingSearch.name);
        setDescription(editingSearch.description || '');
        setQuery(editingSearch.query);
        setScope(editingSearch.scope);
        setComponentType(editingSearch.component_type || '');
        setInstanceIdentifier(editingSearch.instance_identifier || '');
        setDrawingType(editingSearch.drawing_type || '');
        setSortBy(editingSearch.sort_by);
        setSortOrder(editingSearch.sort_order);
      } else {
        // Create mode - populate with current search state
        setName('');
        setDescription('');
        setQuery(currentQuery);
        setScope(currentScope);
        setComponentType(currentFilters.componentType || '');
        setInstanceIdentifier(currentFilters.instanceIdentifier || '');
        setDrawingType(currentFilters.drawingType || '');
        setSortBy(currentSort.sortBy);
        setSortOrder(currentSort.sortOrder);
      }
      setError('');
    }
  }, [open, editingSearch, currentQuery, currentScope, currentFilters, currentSort]);

  const handleScopeChange = (scopeValue: string) => {
    setScope(prev => {
      if (prev.includes(scopeValue)) {
        // Remove if already selected, but ensure at least one remains
        const newScope = prev.filter(s => s !== scopeValue);
        return newScope.length > 0 ? newScope : prev;
      } else {
        // Add if not selected
        return [...prev, scopeValue];
      }
    });
  };

  const handleSave = async () => {
    setError('');
    setLoading(true);

    try {
      // Validation
      if (!name.trim()) {
        throw new Error('Search name is required');
      }
      if (!query.trim()) {
        throw new Error('Search query is required');
      }
      if (scope.length === 0) {
        throw new Error('At least one search scope must be selected');
      }

      const searchData = editingSearch 
        ? {
            name: name.trim(),
            description: description.trim() || undefined,
            query: query.trim(),
            scope,
            component_type: componentType || undefined,
            instance_identifier: instanceIdentifier || undefined,
            drawing_type: drawingType || undefined,
            sort_by: sortBy,
            sort_order: sortOrder,
          } as SavedSearchUpdate
        : {
            name: name.trim(),
            description: description.trim() || undefined,
            query: query.trim(),
            scope,
            component_type: componentType || undefined,
            instance_identifier: instanceIdentifier || undefined,
            drawing_type: drawingType || undefined,
            sort_by: sortBy,
            sort_order: sortOrder,
            project_id: projectId,
          } as SavedSearchCreate;

      await onSave(searchData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save search');
    } finally {
      setLoading(false);
    }
  };

  const getScopeDisplayName = (scopeValue: string): string => {
    const displayNames: Record<string, string> = {
      piece_mark: 'Piece Marks',
      component_type: 'Component Types',
      description: 'Descriptions'
    };
    return displayNames[scopeValue] || scopeValue;
  };

  const isCreateMode = !editingSearch;
  const canSave = !isCreateMode || !isAtLimit;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isCreateMode ? 'Save Search' : 'Edit Saved Search'}
      </DialogTitle>
      
      <DialogContent>
        {isAtLimit && isCreateMode && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You have reached the maximum of {maxSearches} saved searches for this project. 
            Delete some existing searches to create new ones.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Search Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            placeholder="e.g., Steel Beams Quality Check"
          />

          <TextField
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder="Optional description for this search..."
          />

          <TextField
            label="Search Query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            fullWidth
            required
            placeholder="e.g., beam AND steel"
          />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Search Scope
            </Typography>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={scope.includes('piece_mark')}
                    onChange={() => handleScopeChange('piece_mark')}
                  />
                }
                label="Piece Marks"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={scope.includes('component_type')}
                    onChange={() => handleScopeChange('component_type')}
                  />
                }
                label="Component Types"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={scope.includes('description')}
                    onChange={() => handleScopeChange('description')}
                  />
                }
                label="Descriptions"
              />
            </FormGroup>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Component Type"
              value={componentType}
              onChange={(e) => setComponentType(e.target.value)}
              fullWidth
              placeholder="Optional filter..."
            />

            <TextField
              label="Instance Identifier"
              value={instanceIdentifier}
              onChange={(e) => setInstanceIdentifier(e.target.value)}
              fullWidth
              placeholder="e.g., A, B, C"
              inputProps={{ maxLength: 10 }}
            />

            <TextField
              label="Drawing Type"
              value={drawingType}
              onChange={(e) => setDrawingType(e.target.value)}
              fullWidth
              placeholder="Optional filter..."
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Sort By"
              >
                <MenuItem value="relevance">Relevance</MenuItem>
                <MenuItem value="date">Date Added</MenuItem>
                <MenuItem value="name">Piece Mark</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Sort Order</InputLabel>
              <Select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                label="Sort Order"
              >
                <MenuItem value="desc">Descending</MenuItem>
                <MenuItem value="asc">Ascending</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Preview */}
          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Search Preview
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Query:</strong> {query || 'No query specified'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Scope:</strong> {scope.map(getScopeDisplayName).join(', ') || 'No scope selected'}
            </Typography>
            {(componentType || drawingType) && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {componentType && (
                  <Chip label={`Type: ${componentType}`} size="small" />
                )}
                {drawingType && (
                  <Chip label={`Drawing: ${drawingType}`} size="small" />
                )}
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={loading || (isCreateMode && isAtLimit)}
        >
          {loading ? 'Saving...' : (isCreateMode ? 'Save Search' : 'Update Search')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SavedSearchDialog;