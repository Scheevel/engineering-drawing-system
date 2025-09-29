/**
 * Field Preset Library Component
 *
 * Provides a comprehensive library of field configuration presets and templates
 * for engineering applications, with import/export and sharing capabilities.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Tooltip,
  Avatar,
  Badge,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Menu,
  MenuList,
  MenuItem as MenuListItem,
  ListItemIcon,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Copy as CopyIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Category as CategoryIcon,
  Engineering as EngineeringIcon,
  Architecture as ArchitectureIcon,
  Build as BuildIcon,
  Timeline as TimelineIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as PreviewIcon,
  GetApp as ImportIcon,
  Publish as ExportIcon,
  CloudDownload as CloudIcon,
  LocalLibrary as LibraryIcon,
  Bookmark as BookmarkIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { SchemaFieldType } from '../../services/api';

export interface FieldPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  fieldType: SchemaFieldType;
  configuration: Record<string, any>;
  metadata: {
    tags: string[];
    author: string;
    organization?: string;
    version: string;
    createdAt: string;
    lastModifiedAt: string;
    usageCount: number;
    rating: number;
    isPublic: boolean;
    isFavorite: boolean;
    isOfficial: boolean;
  };
  validationRules?: any[];
  dependencies?: any[];
  documentation?: {
    examples: string[];
    businessRules: string[];
    technicalNotes: string[];
  };
}

export interface PresetCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  presets: FieldPreset[];
}

export interface FieldPresetLibraryProps {
  onPresetSelect: (preset: FieldPreset) => void;
  onPresetCreate?: (preset: FieldPreset) => void;
  onPresetUpdate?: (preset: FieldPreset) => void;
  onPresetDelete?: (presetId: string) => void;
  currentFieldType?: SchemaFieldType;
  showFavoritesOnly?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`preset-tabpanel-${index}`}
      aria-labelledby={`preset-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

// Engineering-specific field presets
const ENGINEERING_FIELD_PRESETS: FieldPreset[] = [
  {
    id: 'drawing_number',
    name: 'Engineering Drawing Number',
    description: 'Standard drawing number format for engineering documentation',
    category: 'Identification',
    fieldType: 'text',
    configuration: {
      pattern: '^[A-Z]{2,3}-\\d{4,6}(-[A-Z]\\d*)?$',
      maxLength: 20,
      placeholder: 'DRG-123456-A1',
      transform: 'uppercase',
    },
    metadata: {
      tags: ['identification', 'drawing', 'engineering', 'required'],
      author: 'Engineering Standards',
      version: '1.0',
      createdAt: '2024-01-01T00:00:00Z',
      lastModifiedAt: '2024-01-01T00:00:00Z',
      usageCount: 150,
      rating: 4.8,
      isPublic: true,
      isFavorite: false,
      isOfficial: true,
    },
    validationRules: [{
      type: 'pattern',
      pattern: '^[A-Z]{2,3}-\\d{4,6}(-[A-Z]\\d*)?$',
      errorMessage: 'Please enter a valid drawing number (e.g., DRG-123456-A1)',
    }],
    documentation: {
      examples: ['DRG-123456', 'BRG-001234-A1', 'PLN-987654-B2'],
      businessRules: ['Must follow company drawing numbering standard'],
      technicalNotes: ['Supports revision suffixes (-A1, -B2, etc.)'],
    },
  },
  {
    id: 'steel_grade',
    name: 'Steel Grade Selection',
    description: 'Standard steel grades for structural engineering',
    category: 'Materials',
    fieldType: 'select',
    configuration: {
      options: [
        { value: 'a36', label: 'A36', category: 'Carbon Steel' },
        { value: 'a572_gr50', label: 'A572 Grade 50', category: 'High Strength Steel' },
        { value: 'a992', label: 'A992', category: 'Structural Steel' },
        { value: 'a588', label: 'A588', category: 'Weathering Steel' },
        { value: 'a709_gr50', label: 'A709 Grade 50', category: 'Bridge Steel' },
      ],
      allowMultiple: false,
      groupByCategory: true,
    },
    metadata: {
      tags: ['material', 'steel', 'structural', 'aisc'],
      author: 'Structural Engineering',
      version: '2.1',
      createdAt: '2024-01-01T00:00:00Z',
      lastModifiedAt: '2024-01-15T00:00:00Z',
      usageCount: 89,
      rating: 4.6,
      isPublic: true,
      isFavorite: true,
      isOfficial: true,
    },
    documentation: {
      examples: ['A36 for general construction', 'A992 for wide flange beams'],
      businessRules: ['Must comply with AISC specifications', 'Consider corrosion resistance for bridge applications'],
      technicalNotes: ['A588 requires proper detailing for weathering'],
    },
  },
  {
    id: 'load_value',
    name: 'Load Value (kips)',
    description: 'Structural load value with engineering units',
    category: 'Loads',
    fieldType: 'number',
    configuration: {
      min: 0,
      step: 0.1,
      precision: 2,
      unit: 'kips',
      displayFormat: 'decimal',
      allowZero: true,
      allowNegative: false,
    },
    metadata: {
      tags: ['load', 'structural', 'analysis', 'kips'],
      author: 'Load Analysis Team',
      version: '1.3',
      createdAt: '2024-01-01T00:00:00Z',
      lastModifiedAt: '2024-01-10T00:00:00Z',
      usageCount: 67,
      rating: 4.4,
      isPublic: true,
      isFavorite: false,
      isOfficial: true,
    },
    documentation: {
      examples: ['125.5 kips', '1250.0 kips'],
      businessRules: ['Must be positive value', 'Consider load factors for ultimate loads'],
      technicalNotes: ['1 kip = 1000 pounds force'],
    },
  },
  {
    id: 'dimension_inches',
    name: 'Dimension (inches)',
    description: 'Dimensional measurement in inches with fractional support',
    category: 'Dimensions',
    fieldType: 'text',
    configuration: {
      pattern: '^\\d+(\\.\\d+|\\s\\d+/\\d+)?"?$',
      placeholder: '12.5" or 12 1/2"',
      maxLength: 15,
    },
    metadata: {
      tags: ['dimension', 'inches', 'measurement', 'fractional'],
      author: 'Drafting Standards',
      version: '1.1',
      createdAt: '2024-01-01T00:00:00Z',
      lastModifiedAt: '2024-01-05T00:00:00Z',
      usageCount: 134,
      rating: 4.7,
      isPublic: true,
      isFavorite: true,
      isOfficial: true,
    },
    documentation: {
      examples: ['12.5"', '24 1/2"', '6.75'],
      businessRules: ['Support both decimal and fractional notation'],
      technicalNotes: ['Pattern validates decimal or fractional format'],
    },
  },
  {
    id: 'inspection_date',
    name: 'Inspection Date',
    description: 'Date field for structural inspections with business day constraints',
    category: 'Quality Control',
    fieldType: 'date',
    configuration: {
      format: 'MM/DD/YYYY',
      businessDaysOnly: true,
      excludeWeekends: true,
      allowTime: false,
    },
    metadata: {
      tags: ['inspection', 'date', 'quality', 'business-days'],
      author: 'QC Department',
      version: '1.0',
      createdAt: '2024-01-01T00:00:00Z',
      lastModifiedAt: '2024-01-01T00:00:00Z',
      usageCount: 45,
      rating: 4.3,
      isPublic: true,
      isFavorite: false,
      isOfficial: true,
    },
    documentation: {
      examples: ['01/15/2024', '03/22/2024'],
      businessRules: ['Must be business day', 'Cannot be weekend or holiday'],
      technicalNotes: ['Excludes weekends automatically'],
    },
  },
  {
    id: 'safety_factor',
    name: 'Safety Factor',
    description: 'Engineering safety factor with typical range validation',
    category: 'Safety',
    fieldType: 'number',
    configuration: {
      min: 1.0,
      max: 10.0,
      step: 0.1,
      precision: 2,
      displayFormat: 'decimal',
    },
    metadata: {
      tags: ['safety', 'factor', 'engineering', 'validation'],
      author: 'Safety Engineering',
      version: '1.2',
      createdAt: '2024-01-01T00:00:00Z',
      lastModifiedAt: '2024-01-08T00:00:00Z',
      usageCount: 23,
      rating: 4.5,
      isPublic: true,
      isFavorite: false,
      isOfficial: true,
    },
    documentation: {
      examples: ['1.5', '2.0', '3.0'],
      businessRules: ['Minimum safety factor is 1.0', 'Typical range 1.5 to 4.0'],
      technicalNotes: ['Consider load type and criticality'],
    },
  },
];

const PRESET_CATEGORIES: PresetCategory[] = [
  {
    id: 'identification',
    name: 'Identification',
    description: 'Drawing numbers, project IDs, and identification fields',
    icon: <BookmarkIcon />,
    presets: ENGINEERING_FIELD_PRESETS.filter(p => p.category === 'Identification'),
  },
  {
    id: 'materials',
    name: 'Materials',
    description: 'Material grades, properties, and specifications',
    icon: <EngineeringIcon />,
    presets: ENGINEERING_FIELD_PRESETS.filter(p => p.category === 'Materials'),
  },
  {
    id: 'dimensions',
    name: 'Dimensions',
    description: 'Measurements, sizes, and dimensional properties',
    icon: <ArchitectureIcon />,
    presets: ENGINEERING_FIELD_PRESETS.filter(p => p.category === 'Dimensions'),
  },
  {
    id: 'loads',
    name: 'Loads',
    description: 'Load values, forces, and load combinations',
    icon: <BuildIcon />,
    presets: ENGINEERING_FIELD_PRESETS.filter(p => p.category === 'Loads'),
  },
  {
    id: 'quality',
    name: 'Quality Control',
    description: 'Inspection, testing, and quality assurance fields',
    icon: <TimelineIcon />,
    presets: ENGINEERING_FIELD_PRESETS.filter(p => p.category === 'Quality Control'),
  },
  {
    id: 'safety',
    name: 'Safety',
    description: 'Safety factors, ratings, and compliance fields',
    icon: <StarIcon />,
    presets: ENGINEERING_FIELD_PRESETS.filter(p => p.category === 'Safety'),
  },
];

const presetSchema = yup.object({
  name: yup.string().required('Preset name is required').max(100),
  description: yup.string().required('Description is required').max(500),
  category: yup.string().required('Category is required'),
  fieldType: yup.string().required('Field type is required'),
});

const FieldPresetLibrary: React.FC<FieldPresetLibraryProps> = ({
  onPresetSelect,
  onPresetCreate,
  onPresetUpdate,
  onPresetDelete,
  currentFieldType,
  showFavoritesOnly = false,
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewPreset, setPreviewPreset] = useState<FieldPreset | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedPreset, setSelectedPreset] = useState<FieldPreset | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Partial<FieldPreset>>({
    resolver: yupResolver(presetSchema),
  });

  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  }, []);

  const handleToggleFavorite = useCallback((presetId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(presetId)) {
        newFavorites.delete(presetId);
      } else {
        newFavorites.add(presetId);
      }
      return newFavorites;
    });
  }, []);

  const handlePresetPreview = useCallback((preset: FieldPreset) => {
    setPreviewPreset(preset);
    setShowPreviewDialog(true);
  }, []);

  const handlePresetAction = useCallback((preset: FieldPreset, event: React.MouseEvent<HTMLElement>) => {
    setSelectedPreset(preset);
    setActionMenuAnchor(event.currentTarget);
  }, []);

  const handleActionMenuClose = useCallback(() => {
    setActionMenuAnchor(null);
    setSelectedPreset(null);
  }, []);

  const handleExportPreset = useCallback((preset: FieldPreset) => {
    const dataStr = JSON.stringify(preset, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `${preset.name.toLowerCase().replace(/\s+/g, '_')}_preset.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    handleActionMenuClose();
  }, [handleActionMenuClose]);

  const handleImportPreset = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const preset = JSON.parse(e.target?.result as string);
          if (onPresetCreate) {
            onPresetCreate(preset);
          }
        } catch (error) {
          console.error('Error importing preset:', error);
        }
      };
      reader.readAsText(file);
    }
  }, [onPresetCreate]);

  const filteredPresets = ENGINEERING_FIELD_PRESETS.filter(preset => {
    const matchesSearch = !searchTerm ||
      preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      preset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      preset.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = !selectedCategory || preset.category === selectedCategory;
    const matchesFieldType = !currentFieldType || preset.fieldType === currentFieldType;
    const matchesFavorites = !showFavoritesOnly || favorites.has(preset.id);

    return matchesSearch && matchesCategory && matchesFieldType && matchesFavorites;
  });

  const renderPresetCard = (preset: FieldPreset) => (
    <Card key={preset.id} variant="outlined" sx={{ mb: 2 }}>
      <CardHeader
        avatar={
          <Badge
            badgeContent={preset.metadata.isOfficial ? '✓' : null}
            color="primary"
          >
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <CategoryIcon />
            </Avatar>
          </Badge>
        }
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle1">{preset.name}</Typography>
            <Chip label={preset.fieldType} size="small" variant="outlined" />
            {preset.metadata.isOfficial && (
              <Chip label="Official" size="small" color="primary" />
            )}
          </Box>
        }
        subheader={
          <Box>
            <Typography variant="body2" color="text.secondary">
              {preset.description}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mt={0.5}>
              <Typography variant="caption">
                v{preset.metadata.version} • {preset.metadata.usageCount} uses
              </Typography>
              <Box display="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Typography
                    key={i}
                    color={i < Math.floor(preset.metadata.rating) ? 'primary' : 'text.disabled'}
                    sx={{ fontSize: '0.75rem' }}
                  >
                    ★
                  </Typography>
                ))}
              </Box>
            </Box>
          </Box>
        }
        action={
          <Box display="flex" gap={0.5}>
            <IconButton
              size="small"
              onClick={() => handleToggleFavorite(preset.id)}
              color={favorites.has(preset.id) ? 'primary' : 'default'}
            >
              {favorites.has(preset.id) ? <StarIcon /> : <StarBorderIcon />}
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handlePresetPreview(preset)}
            >
              <PreviewIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={(e) => handlePresetAction(preset, e)}
            >
              <ExpandMoreIcon />
            </IconButton>
          </Box>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
          {preset.metadata.tags.slice(0, 5).map(tag => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
          {preset.metadata.tags.length > 5 && (
            <Chip label={`+${preset.metadata.tags.length - 5} more`} size="small" variant="outlined" />
          )}
        </Box>

        <Button
          variant="contained"
          size="small"
          fullWidth
          onClick={() => onPresetSelect(preset)}
        >
          Use This Preset
        </Button>
      </CardContent>
    </Card>
  );

  const renderCategoryView = () => (
    <TabPanel value={currentTab} index={0}>
      <Grid container spacing={3}>
        {PRESET_CATEGORIES.map(category => (
          <Grid item xs={12} md={6} lg={4} key={category.id}>
            <Card variant="outlined">
              <CardHeader
                avatar={
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>
                    {category.icon}
                  </Avatar>
                }
                title={category.name}
                subheader={`${category.presets.length} presets`}
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {category.description}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={() => {
                    setSelectedCategory(category.name);
                    setCurrentTab(1);
                  }}
                >
                  Browse {category.name}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </TabPanel>
  );

  const renderListView = () => (
    <TabPanel value={currentTab} index={1}>
      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search Presets"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>
                {PRESET_CATEGORIES.map(cat => (
                  <MenuItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={5}>
            <Box display="flex" gap={1}>
              <Button
                startIcon={<AddIcon />}
                onClick={() => setShowCreateDialog(true)}
                variant="outlined"
                size="small"
              >
                Create Preset
              </Button>
              <Button
                startIcon={<ImportIcon />}
                component="label"
                variant="outlined"
                size="small"
              >
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportPreset}
                  style={{ display: 'none' }}
                />
              </Button>
              <Button
                startIcon={<CloudIcon />}
                variant="outlined"
                size="small"
              >
                Browse Online
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {filteredPresets.length === 0 ? (
        <Alert severity="info">
          No presets found matching your criteria. Try adjusting your search or category filter.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {filteredPresets.map(preset => (
            <Grid item xs={12} md={6} lg={4} key={preset.id}>
              {renderPresetCard(preset)}
            </Grid>
          ))}
        </Grid>
      )}
    </TabPanel>
  );

  const renderFavoritesView = () => (
    <TabPanel value={currentTab} index={2}>
      {favorites.size === 0 ? (
        <Alert severity="info">
          No favorite presets yet. Click the star icon on any preset to add it to your favorites.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {ENGINEERING_FIELD_PRESETS
            .filter(preset => favorites.has(preset.id))
            .map(preset => (
              <Grid item xs={12} md={6} lg={4} key={preset.id}>
                {renderPresetCard(preset)}
              </Grid>
            ))}
        </Grid>
      )}
    </TabPanel>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">
          Field Preset Library
        </Typography>
        <Box display="flex" gap={1}>
          <Typography variant="body2" color="text.secondary">
            {filteredPresets.length} presets available
          </Typography>
        </Box>
      </Box>

      <Card variant="outlined">
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab icon={<CategoryIcon />} label="Categories" />
            <Tab icon={<LibraryIcon />} label="All Presets" />
            <Tab icon={<StarIcon />} label={`Favorites (${favorites.size})`} />
          </Tabs>
        </Box>

        {renderCategoryView()}
        {renderListView()}
        {renderFavoritesView()}
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
      >
        <MenuListItem onClick={() => selectedPreset && handlePresetPreview(selectedPreset)}>
          <ListItemIcon><PreviewIcon /></ListItemIcon>
          Preview
        </MenuListItem>
        <MenuListItem onClick={() => selectedPreset && handleExportPreset(selectedPreset)}>
          <ListItemIcon><ExportIcon /></ListItemIcon>
          Export
        </MenuListItem>
        <MenuListItem onClick={() => selectedPreset && onPresetSelect(selectedPreset)}>
          <ListItemIcon><CopyIcon /></ListItemIcon>
          Use as Template
        </MenuListItem>
        <Divider />
        <MenuListItem onClick={() => selectedPreset && handleToggleFavorite(selectedPreset.id)}>
          <ListItemIcon>
            {selectedPreset && favorites.has(selectedPreset.id) ? <StarIcon /> : <StarBorderIcon />}
          </ListItemIcon>
          {selectedPreset && favorites.has(selectedPreset.id) ? 'Remove from Favorites' : 'Add to Favorites'}
        </MenuListItem>
      </Menu>

      {/* Preset Preview Dialog */}
      <Dialog
        open={showPreviewDialog}
        onClose={() => setShowPreviewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Preset Preview: {previewPreset?.name}
        </DialogTitle>
        <DialogContent>
          {previewPreset && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                This preview shows the complete preset configuration that will be applied to your field.
              </Alert>

              <pre style={{
                backgroundColor: '#f5f5f5',
                padding: '16px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '0.85rem'
              }}>
                {JSON.stringify(previewPreset, null, 2)}
              </pre>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreviewDialog(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (previewPreset) {
                onPresetSelect(previewPreset);
                setShowPreviewDialog(false);
              }
            }}
          >
            Use This Preset
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Preset Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Preset</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Custom preset creation will be available in the next release. Currently, you can import presets from JSON files.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FieldPresetLibrary;