/**
 * Schema Field Importer Component
 *
 * Allows users to browse and import fields from other schemas in the project.
 * Provides conflict resolution and preview functionality before import.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Checkbox,
  TextField,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  IconButton,
  Tooltip,
  Badge,
  Card,
  CardContent,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Schema as SchemaIcon,
  ContentCopy as ImportIcon,
  Warning as ConflictIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon,
  Visibility as PreviewIcon,
  Settings as ConfigIcon,
  Error as ErrorIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';

import { ComponentSchemaField, ComponentSchemaFieldCreate } from '../../types/schema';

interface SchemaInfo {
  id: string;
  name: string;
  description?: string;
  fieldCount: number;
  lastModified: Date;
  fields: ComponentSchemaField[];
}

interface FieldConflict {
  fieldName: string;
  existingField: ComponentSchemaField | null;
  importedField: ComponentSchemaField;
  resolution: 'skip' | 'rename' | 'replace';
  newName?: string;
}

interface SchemaFieldImporterProps {
  open: boolean;
  onClose: () => void;
  onImportFields: (fields: ComponentSchemaFieldCreate[]) => void;
  currentSchemaId: string;
  existingFields: ComponentSchemaField[];
  availableSchemas: SchemaInfo[];
  disabled?: boolean;
}

type ImportMode = 'structure' | 'full';
type TabValue = 'browse' | 'preview' | 'conflicts';

export const SchemaFieldImporter: React.FC<SchemaFieldImporterProps> = ({
  open,
  onClose,
  onImportFields,
  currentSchemaId,
  existingFields,
  availableSchemas,
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFields, setSelectedFields] = useState<ComponentSchemaField[]>([]);
  const [selectedSchemas, setSelectedSchemas] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>('full');
  const [conflicts, setConflicts] = useState<FieldConflict[]>([]);
  const [currentTab, setCurrentTab] = useState<TabValue>('browse');

  // Filter available schemas (exclude current schema)
  const filteredSchemas = useMemo(() => {
    return availableSchemas
      .filter(schema => schema.id !== currentSchemaId)
      .filter(schema => {
        if (!searchQuery.trim()) return true;
        return schema.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               schema.description?.toLowerCase().includes(searchQuery.toLowerCase());
      });
  }, [availableSchemas, currentSchemaId, searchQuery]);

  // Get all available fields from selected schemas
  const availableFields = useMemo(() => {
    return filteredSchemas
      .filter(schema => selectedSchemas.length === 0 || selectedSchemas.includes(schema.id))
      .flatMap(schema =>
        schema.fields.map(field => ({
          ...field,
          sourceSchemaId: schema.id,
          sourceSchemaName: schema.name,
        }))
      );
  }, [filteredSchemas, selectedSchemas]);

  // Detect conflicts with existing fields
  const detectConflicts = useCallback((fieldsToImport: ComponentSchemaField[]) => {
    const existingFieldNames = new Set(existingFields.map(f => f.field_name.toLowerCase()));
    const conflicts: FieldConflict[] = [];

    fieldsToImport.forEach(field => {
      const conflictName = field.field_name.toLowerCase();
      if (existingFieldNames.has(conflictName)) {
        const existingField = existingFields.find(f =>
          f.field_name.toLowerCase() === conflictName
        ) || null;

        conflicts.push({
          fieldName: field.field_name,
          existingField,
          importedField: field,
          resolution: 'skip', // Default resolution
        });
      }
    });

    return conflicts;
  }, [existingFields]);

  // Update conflicts when selected fields change
  React.useEffect(() => {
    if (selectedFields.length > 0) {
      const newConflicts = detectConflicts(selectedFields);
      setConflicts(newConflicts);
      if (newConflicts.length > 0 && currentTab === 'browse') {
        setCurrentTab('conflicts');
      }
    } else {
      setConflicts([]);
    }
  }, [selectedFields, detectConflicts]);

  const handleSchemaToggle = (schemaId: string) => {
    setSelectedSchemas(prev =>
      prev.includes(schemaId)
        ? prev.filter(id => id !== schemaId)
        : [...prev, schemaId]
    );
  };

  const handleFieldToggle = (field: ComponentSchemaField & { sourceSchemaId: string }) => {
    setSelectedFields(prev => {
      const isSelected = prev.some(f => f.id === field.id && f.sourceSchemaId === field.sourceSchemaId);
      if (isSelected) {
        return prev.filter(f => !(f.id === field.id && f.sourceSchemaId === field.sourceSchemaId));
      } else {
        return [...prev, field];
      }
    });
  };

  const handleSelectAllFromSchema = (schemaId: string) => {
    const schemaFields = availableFields.filter(f => f.sourceSchemaId === schemaId);
    const allSelected = schemaFields.every(field =>
      selectedFields.some(selected => selected.id === field.id && selected.sourceSchemaId === field.sourceSchemaId)
    );

    if (allSelected) {
      // Deselect all from this schema
      setSelectedFields(prev => prev.filter(f => f.sourceSchemaId !== schemaId));
    } else {
      // Select all from this schema
      const newSelections = schemaFields.filter(field =>
        !selectedFields.some(selected => selected.id === field.id && selected.sourceSchemaId === field.sourceSchemaId)
      );
      setSelectedFields(prev => [...prev, ...newSelections]);
    }
  };

  const handleConflictResolution = (conflictIndex: number, resolution: 'skip' | 'rename' | 'replace', newName?: string) => {
    setConflicts(prev => prev.map((conflict, index) => {
      if (index === conflictIndex) {
        return {
          ...conflict,
          resolution,
          newName: resolution === 'rename' ? newName : undefined,
        };
      }
      return conflict;
    }));
  };

  const prepareFieldsForImport = (): ComponentSchemaFieldCreate[] => {
    const fieldsToImport: ComponentSchemaFieldCreate[] = [];
    const existingFieldNames = new Set(existingFields.map(f => f.field_name.toLowerCase()));

    selectedFields.forEach((field, index) => {
      const conflict = conflicts.find(c => c.fieldName === field.field_name);

      if (conflict) {
        switch (conflict.resolution) {
          case 'skip':
            // Don't import this field
            return;
          case 'rename':
            if (conflict.newName) {
              fieldsToImport.push(createImportField(field, conflict.newName, index));
            }
            return;
          case 'replace':
            // Import with original name (will replace existing)
            fieldsToImport.push(createImportField(field, field.field_name, index));
            return;
        }
      } else {
        // No conflict, import as-is
        fieldsToImport.push(createImportField(field, field.field_name, index));
      }
    });

    return fieldsToImport;
  };

  const createImportField = (field: ComponentSchemaField, fieldName: string, displayOrder: number): ComponentSchemaFieldCreate => {
    const baseField: ComponentSchemaFieldCreate = {
      field_name: fieldName,
      field_type: field.field_type,
      is_required: field.is_required,
      display_order: existingFields.length + displayOrder + 1,
    };

    if (importMode === 'full') {
      return {
        ...baseField,
        field_config: field.field_config,
        help_text: field.help_text,
      };
    } else {
      // Structure only - use minimal defaults
      return {
        ...baseField,
        field_config: {},
        help_text: undefined,
      };
    }
  };

  const handleImport = () => {
    try {
      const fieldsToImport = prepareFieldsForImport();
      onImportFields(fieldsToImport);
      handleClose();
    } catch (error) {
      console.error('Error importing fields:', error);
    }
  };

  const handleClose = () => {
    setSelectedFields([]);
    setSelectedSchemas([]);
    setConflicts([]);
    setSearchQuery('');
    setCurrentTab('browse');
    onClose();
  };

  const hasUnresolvedConflicts = conflicts.some(c =>
    c.resolution === 'rename' && !c.newName?.trim()
  );

  const getTabIcon = (tab: TabValue) => {
    switch (tab) {
      case 'browse': return <FilterIcon />;
      case 'preview': return <PreviewIcon />;
      case 'conflicts': return conflicts.length > 0 ? <ConflictIcon color="warning" /> : <SuccessIcon color="success" />;
      default: return <InfoIcon />;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={2} alignItems="center">
          <ImportIcon />
          <Typography variant="h6">Import Fields from Existing Schemas</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={currentTab} onChange={(_, value) => setCurrentTab(value)}>
            <Tab
              label="Browse Schemas"
              value="browse"
              icon={getTabIcon('browse')}
            />
            <Tab
              label={
                <Badge badgeContent={selectedFields.length} color="primary">
                  Preview
                </Badge>
              }
              value="preview"
              icon={getTabIcon('preview')}
              disabled={selectedFields.length === 0}
            />
            <Tab
              label={
                <Badge badgeContent={conflicts.length} color="warning">
                  Conflicts
                </Badge>
              }
              value="conflicts"
              icon={getTabIcon('conflicts')}
              disabled={conflicts.length === 0}
            />
          </Tabs>
        </Box>

        {/* Browse Tab */}
        {currentTab === 'browse' && (
          <Stack spacing={3}>
            {/* Search and Import Mode */}
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                size="small"
                placeholder="Search schemas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ flexGrow: 1 }}
              />

              <FormControl component="fieldset">
                <FormLabel component="legend">Import Mode</FormLabel>
                <RadioGroup
                  row
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as ImportMode)}
                >
                  <FormControlLabel
                    value="structure"
                    control={<Radio size="small" />}
                    label="Structure Only"
                  />
                  <FormControlLabel
                    value="full"
                    control={<Radio size="small" />}
                    label="Full Configuration"
                  />
                </RadioGroup>
              </FormControl>
            </Stack>

            {/* Schema List */}
            <Box>
              {filteredSchemas.length > 0 ? (
                filteredSchemas.map(schema => {
                  const schemaFields = availableFields.filter(f => f.sourceSchemaId === schema.id);
                  const selectedFromSchema = schemaFields.filter(field =>
                    selectedFields.some(selected => selected.id === field.id && selected.sourceSchemaId === field.sourceSchemaId)
                  );

                  return (
                    <Accordion key={schema.id}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack direction="row" spacing={2} alignItems="center" width="100%">
                          <Checkbox
                            checked={selectedFromSchema.length === schemaFields.length && schemaFields.length > 0}
                            indeterminate={selectedFromSchema.length > 0 && selectedFromSchema.length < schemaFields.length}
                            onChange={() => handleSelectAllFromSchema(schema.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <SchemaIcon />
                          <Box flexGrow={1}>
                            <Typography variant="subtitle1">{schema.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {schema.fieldCount} fields • Last modified: {schema.lastModified.toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Chip
                            label={`${selectedFromSchema.length}/${schemaFields.length} selected`}
                            size="small"
                            color={selectedFromSchema.length > 0 ? 'primary' : 'default'}
                          />
                        </Stack>
                      </AccordionSummary>

                      <AccordionDetails>
                        <List dense>
                          {schemaFields.map(field => {
                            const isSelected = selectedFields.some(f =>
                              f.id === field.id && f.sourceSchemaId === field.sourceSchemaId
                            );

                            return (
                              <ListItem key={`${field.sourceSchemaId}-${field.id}`}>
                                <ListItemIcon>
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={() => handleFieldToggle(field)}
                                  />
                                </ListItemIcon>
                                <ListItemText
                                  primary={field.field_name}
                                  secondary={
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <Chip label={field.field_type} size="small" variant="outlined" />
                                      {field.is_required && (
                                        <Chip label="Required" size="small" color="warning" variant="outlined" />
                                      )}
                                      {field.help_text && (
                                        <Typography variant="caption" color="text.secondary">
                                          {field.help_text}
                                        </Typography>
                                      )}
                                    </Stack>
                                  }
                                />
                              </ListItem>
                            );
                          })}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  );
                })
              ) : (
                <Box textAlign="center" py={4}>
                  <Typography variant="body2" color="text.secondary">
                    No schemas available to import from
                  </Typography>
                </Box>
              )}
            </Box>
          </Stack>
        )}

        {/* Preview Tab */}
        {currentTab === 'preview' && (
          <Stack spacing={2}>
            <Alert severity="info" icon={<InfoIcon />}>
              Preview of {selectedFields.length} field(s) to be imported in {importMode} mode
            </Alert>

            <List>
              {selectedFields.map((field, index) => (
                <React.Fragment key={`${field.sourceSchemaId}-${field.id}`}>
                  <ListItem>
                    <ListItemText
                      primary={field.field_name}
                      secondary={
                        <Stack spacing={1}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label={field.field_type} size="small" variant="outlined" />
                            {field.is_required && (
                              <Chip label="Required" size="small" color="warning" variant="outlined" />
                            )}
                            <Chip
                              label={`From: ${field.sourceSchemaName}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </Stack>
                          {importMode === 'full' && field.help_text && (
                            <Typography variant="caption" color="text.secondary">
                              {field.help_text}
                            </Typography>
                          )}
                        </Stack>
                      }
                    />
                  </ListItem>
                  {index < selectedFields.length - 1 && <Divider variant="inset" />}
                </React.Fragment>
              ))}
            </List>
          </Stack>
        )}

        {/* Conflicts Tab */}
        {currentTab === 'conflicts' && (
          <Stack spacing={2}>
            {conflicts.length > 0 ? (
              <>
                <Alert severity="warning" icon={<ConflictIcon />}>
                  {conflicts.length} field name conflict(s) detected. Choose how to resolve each conflict:
                </Alert>

                {conflicts.map((conflict, index) => (
                  <Card key={index} variant="outlined">
                    <CardContent>
                      <Stack spacing={2}>
                        <Typography variant="subtitle2" color="warning.main">
                          Conflict: "{conflict.fieldName}"
                        </Typography>

                        <FormControl component="fieldset">
                          <RadioGroup
                            value={conflict.resolution}
                            onChange={(e) => handleConflictResolution(index, e.target.value as any)}
                          >
                            <FormControlLabel
                              value="skip"
                              control={<Radio />}
                              label="Skip this field (don't import)"
                            />
                            <FormControlLabel
                              value="rename"
                              control={<Radio />}
                              label="Rename the imported field"
                            />
                            <FormControlLabel
                              value="replace"
                              control={<Radio />}
                              label="Replace existing field"
                            />
                          </RadioGroup>
                        </FormControl>

                        {conflict.resolution === 'rename' && (
                          <TextField
                            size="small"
                            label="New field name"
                            value={conflict.newName || ''}
                            onChange={(e) => handleConflictResolution(index, 'rename', e.target.value)}
                            placeholder={`${conflict.fieldName} (Imported)`}
                            error={!conflict.newName?.trim()}
                            helperText={!conflict.newName?.trim() ? 'New name is required' : ''}
                          />
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <Alert severity="success" icon={<SuccessIcon />}>
                No field name conflicts detected. You can proceed with the import.
              </Alert>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={disabled}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={disabled || selectedFields.length === 0 || hasUnresolvedConflicts}
          startIcon={<ImportIcon />}
        >
          Import {selectedFields.length} Field(s)
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SchemaFieldImporter;