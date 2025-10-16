import React, { useState, useEffect, useMemo } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Description as DrawingIcon,
  Folder as ProjectIcon,
  Category as ComponentIcon,
  Settings as MetadataIcon,
  Straighten as DimensionIcon,
} from '@mui/icons-material';
import { EXPORT_FIELD_GROUPS } from '../../config/exportFields.ts';
import { ExportField, FieldGroup } from '../../types/export.types';
import { getComponentDataFields, getDimensionFields } from '../../services/exportService.ts';

interface FieldGroupSelectorProps {
  drawings: any[];
  selectedFields: string[];
  onFieldsChange: (selectedFields: string[]) => void;
  dimensionFormatOption?: 'combined' | 'value_only';  // Story 7.4: Format option
}

const FieldGroupSelector: React.FC<FieldGroupSelectorProps> = ({
  drawings,
  selectedFields,
  onFieldsChange,
  dimensionFormatOption = 'combined',  // Story 7.4: Default format
}) => {
  // Story 7.4: Combine static fields with dynamic component AND dimension fields
  const allFieldGroups = useMemo(() => {
    // Get static field keys to prevent duplicates
    const staticFields = EXPORT_FIELD_GROUPS.flatMap(g => g.fields);
    const staticFieldKeys = new Set(staticFields.map(f => f.key));
    const dynamicComponentFields = getComponentDataFields(drawings, staticFieldKeys);
    // Story 7.4: Discover dimension fields
    const dimensionFields = getDimensionFields(drawings, dimensionFormatOption);

    return EXPORT_FIELD_GROUPS.map(group => {
      if (group.id === 'components') {
        // Add dynamic fields to components group
        return {
          ...group,
          fields: [...group.fields, ...dynamicComponentFields],
        };
      } else if (group.id === 'dimension_values') {
        // Story 7.4: Populate dimension_values group with discovered fields
        return {
          ...group,
          fields: dimensionFields,
        };
      }
      return group;
    });
  }, [drawings, dimensionFormatOption]);

  // Get icon for each group
  const getGroupIcon = (groupId: string) => {
    switch (groupId) {
      case 'basic':
        return <DrawingIcon fontSize="small" sx={{ mr: 1 }} />;
      case 'project':
        return <ProjectIcon fontSize="small" sx={{ mr: 1 }} />;
      case 'components':
        return <ComponentIcon fontSize="small" sx={{ mr: 1 }} />;
      case 'component_metadata':  // Fixed: was 'metadata'
        return <MetadataIcon fontSize="small" sx={{ mr: 1 }} />;
      case 'dimension_values':  // Story 7.4: Icon for dimension values
        return <DimensionIcon fontSize="small" sx={{ mr: 1 }} />;
      default:
        return null;
    }
  };

  // Calculate selection state for a group (all, none, or partial)
  const getGroupSelectionState = (group: FieldGroup) => {
    const groupFieldKeys = group.fields.map(f => f.key);
    const selectedCount = groupFieldKeys.filter(key => selectedFields.includes(key)).length;

    if (selectedCount === 0) {
      return 'none';
    } else if (selectedCount === groupFieldKeys.length) {
      return 'all';
    } else {
      return 'partial';
    }
  };

  // Handle group-level checkbox toggle
  const handleGroupToggle = (group: FieldGroup) => {
    const groupFieldKeys = group.fields.map(f => f.key);
    const selectionState = getGroupSelectionState(group);

    if (selectionState === 'all') {
      // Deselect all fields in this group
      const newSelectedFields = selectedFields.filter(key => !groupFieldKeys.includes(key));
      onFieldsChange(newSelectedFields);
    } else {
      // Select all fields in this group
      const newSelectedFields = [...new Set([...selectedFields, ...groupFieldKeys])];
      onFieldsChange(newSelectedFields);
    }
  };

  // Handle individual field checkbox toggle
  const handleFieldToggle = (fieldKey: string) => {
    if (selectedFields.includes(fieldKey)) {
      onFieldsChange(selectedFields.filter(key => key !== fieldKey));
    } else {
      onFieldsChange([...selectedFields, fieldKey]);
    }
  };

  return (
    <Box>
      {/* Field count chip */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Chip
          label={`${selectedFields.length} fields selected`}
          color={selectedFields.length > 0 ? 'primary' : 'default'}
          size="small"
        />
      </Box>

      {/* Accordion groups */}
      {allFieldGroups.map(group => {
        const selectionState = getGroupSelectionState(group);

        return (
          <Accordion
            key={group.id}
            defaultExpanded={group.defaultExpanded}
            sx={{ mb: 1 }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                '& .MuiAccordionSummary-content': {
                  alignItems: 'center',
                },
              }}
            >
              {/* Group icon */}
              {getGroupIcon(group.id)}

              {/* Group-level checkbox with indeterminate state */}
              <Checkbox
                checked={selectionState === 'all'}
                indeterminate={selectionState === 'partial'}
                onChange={() => handleGroupToggle(group)}
                onClick={(e) => e.stopPropagation()} // Prevent accordion toggle
                sx={{ p: 0, mr: 1 }}
              />

              {/* Group label */}
              <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                {group.label}
              </Typography>

              {/* Field count in group */}
              <Typography
                variant="caption"
                sx={{ ml: 1, color: 'text.secondary' }}
              >
                ({group.fields.length} fields)
              </Typography>
            </AccordionSummary>

            <AccordionDetails>
              <FormGroup>
                {group.fields.map(field => (
                  <FormControlLabel
                    key={field.key}
                    control={
                      <Checkbox
                        checked={selectedFields.includes(field.key)}
                        onChange={() => handleFieldToggle(field.key)}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        {field.label}
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{ ml: 1, color: 'text.secondary' }}
                        >
                          ({field.type})
                        </Typography>
                      </Typography>
                    }
                  />
                ))}
              </FormGroup>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

export default FieldGroupSelector;
