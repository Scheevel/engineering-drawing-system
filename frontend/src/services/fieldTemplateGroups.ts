/**
 * Field Template Groups Service
 *
 * Provides predefined groups of fields for common engineering use cases.
 * Each group contains a set of related fields that are commonly used together.
 */

import { ComponentSchemaFieldCreate } from '../types/schema';

export interface FieldGroup {
  id: string;
  name: string;
  description: string;
  category: 'structural' | 'project' | 'material' | 'documentation' | 'inspection';
  icon: string;
  fields: ComponentSchemaFieldCreate[];
  tags: string[];
  usageCount?: number;
  lastUsed?: Date;
}

// Predefined field groups for common engineering scenarios
export const FIELD_GROUPS: FieldGroup[] = [
  {
    id: 'structural-properties',
    name: 'Structural Properties',
    description: 'Essential structural engineering fields for component analysis',
    category: 'structural',
    icon: 'Engineering',
    fields: [
      {
        field_name: 'Load Capacity',
        field_type: 'number',
        field_config: {
          min_value: 0,
          max_value: null,
          decimal_places: 2,
          unit: 'kN',
        },
        help_text: 'Maximum load capacity in kilonewtons',
        is_required: true,
        display_order: 1,
      },
      {
        field_name: 'Material Grade',
        field_type: 'select',
        field_config: {
          options: ['A36', 'A572 Grade 50', 'A992', 'A514', 'A709 Grade 50'],
          allow_multiple: false,
        },
        help_text: 'Steel grade specification',
        is_required: true,
        display_order: 2,
      },
      {
        field_name: 'Section Modulus',
        field_type: 'number',
        field_config: {
          min_value: 0,
          max_value: null,
          decimal_places: 3,
          unit: 'in³',
        },
        help_text: 'Section modulus for bending calculations',
        is_required: false,
        display_order: 3,
      },
      {
        field_name: 'Moment of Inertia',
        field_type: 'number',
        field_config: {
          min_value: 0,
          max_value: null,
          decimal_places: 3,
          unit: 'in⁴',
        },
        help_text: 'Area moment of inertia',
        is_required: false,
        display_order: 4,
      },
      {
        field_name: 'Safety Factor',
        field_type: 'number',
        field_config: {
          min_value: 1.0,
          max_value: 10.0,
          decimal_places: 2,
          unit: '',
        },
        help_text: 'Applied safety factor for design',
        is_required: true,
        display_order: 5,
      },
    ],
    tags: ['structural', 'analysis', 'load', 'material', 'safety'],
  },
  {
    id: 'project-information',
    name: 'Project Information',
    description: 'Standard project tracking and identification fields',
    category: 'project',
    icon: 'Business',
    fields: [
      {
        field_name: 'Project Number',
        field_type: 'text',
        field_config: {
          max_length: 50,
          placeholder: 'e.g., BR-2024-001',
        },
        help_text: 'Unique project identifier',
        is_required: true,
        display_order: 1,
      },
      {
        field_name: 'Design Engineer',
        field_type: 'text',
        field_config: {
          max_length: 100,
          placeholder: 'Engineer name',
        },
        help_text: 'Primary design engineer responsible',
        is_required: true,
        display_order: 2,
      },
      {
        field_name: 'Design Date',
        field_type: 'date',
        field_config: {
          format: 'YYYY-MM-DD',
          include_time: false,
        },
        help_text: 'Date of design completion',
        is_required: true,
        display_order: 3,
      },
      {
        field_name: 'Revision Number',
        field_type: 'text',
        field_config: {
          max_length: 10,
          placeholder: 'Rev 1.0',
        },
        help_text: 'Current revision of the design',
        is_required: true,
        display_order: 4,
      },
      {
        field_name: 'Project Phase',
        field_type: 'select',
        field_config: {
          options: ['Preliminary', 'Design Development', 'Final Design', 'Construction', 'As-Built'],
          allow_multiple: false,
        },
        help_text: 'Current phase of the project',
        is_required: true,
        display_order: 5,
      },
      {
        field_name: 'Client',
        field_type: 'text',
        field_config: {
          max_length: 200,
          placeholder: 'Client organization name',
        },
        help_text: 'Client or owner organization',
        is_required: false,
        display_order: 6,
      },
    ],
    tags: ['project', 'tracking', 'documentation', 'identification'],
  },
  {
    id: 'dimensional-properties',
    name: 'Dimensional Properties',
    description: 'Physical dimensions and geometric properties',
    category: 'structural',
    icon: 'Straighten',
    fields: [
      {
        field_name: 'Length',
        field_type: 'number',
        field_config: {
          min_value: 0,
          max_value: null,
          decimal_places: 3,
          unit: 'ft',
        },
        help_text: 'Overall length of component',
        is_required: true,
        display_order: 1,
      },
      {
        field_name: 'Width',
        field_type: 'number',
        field_config: {
          min_value: 0,
          max_value: null,
          decimal_places: 3,
          unit: 'ft',
        },
        help_text: 'Overall width of component',
        is_required: false,
        display_order: 2,
      },
      {
        field_name: 'Height',
        field_type: 'number',
        field_config: {
          min_value: 0,
          max_value: null,
          decimal_places: 3,
          unit: 'ft',
        },
        help_text: 'Overall height of component',
        is_required: false,
        display_order: 3,
      },
      {
        field_name: 'Weight',
        field_type: 'number',
        field_config: {
          min_value: 0,
          max_value: null,
          decimal_places: 2,
          unit: 'lbs',
        },
        help_text: 'Total weight of component',
        is_required: false,
        display_order: 4,
      },
      {
        field_name: 'Cross-Sectional Area',
        field_type: 'number',
        field_config: {
          min_value: 0,
          max_value: null,
          decimal_places: 3,
          unit: 'in²',
        },
        help_text: 'Cross-sectional area for calculations',
        is_required: false,
        display_order: 5,
      },
    ],
    tags: ['dimensions', 'geometry', 'physical', 'measurements'],
  },
  {
    id: 'material-specifications',
    name: 'Material Specifications',
    description: 'Detailed material properties and specifications',
    category: 'material',
    icon: 'Build',
    fields: [
      {
        field_name: 'Material Type',
        field_type: 'select',
        field_config: {
          options: ['Carbon Steel', 'Stainless Steel', 'Aluminum', 'Concrete', 'Composite', 'Other'],
          allow_multiple: false,
        },
        help_text: 'Primary material classification',
        is_required: true,
        display_order: 1,
      },
      {
        field_name: 'Yield Strength',
        field_type: 'number',
        field_config: {
          min_value: 0,
          max_value: null,
          decimal_places: 0,
          unit: 'psi',
        },
        help_text: 'Minimum yield strength in psi',
        is_required: true,
        display_order: 2,
      },
      {
        field_name: 'Ultimate Tensile Strength',
        field_type: 'number',
        field_config: {
          min_value: 0,
          max_value: null,
          decimal_places: 0,
          unit: 'psi',
        },
        help_text: 'Ultimate tensile strength in psi',
        is_required: false,
        display_order: 3,
      },
      {
        field_name: 'Modulus of Elasticity',
        field_type: 'number',
        field_config: {
          min_value: 0,
          max_value: null,
          decimal_places: 0,
          unit: 'psi',
        },
        help_text: 'Elastic modulus in psi',
        is_required: false,
        display_order: 4,
      },
      {
        field_name: 'Coating/Finish',
        field_type: 'select',
        field_config: {
          options: ['Hot-Dip Galvanized', 'Painted', 'Weathering Steel', 'Stainless', 'None'],
          allow_multiple: false,
        },
        help_text: 'Surface protection or finish',
        is_required: true,
        display_order: 5,
      },
      {
        field_name: 'Material Certification',
        field_type: 'checkbox',
        field_config: {
          default_value: false,
        },
        help_text: 'Material test reports required',
        is_required: false,
        display_order: 6,
      },
    ],
    tags: ['material', 'properties', 'specifications', 'strength', 'coating'],
  },
  {
    id: 'inspection-quality',
    name: 'Inspection & Quality',
    description: 'Quality control and inspection requirements',
    category: 'inspection',
    icon: 'FactCheck',
    fields: [
      {
        field_name: 'Inspection Level',
        field_type: 'select',
        field_config: {
          options: ['Visual Only', 'Standard', 'Enhanced', 'Critical'],
          allow_multiple: false,
        },
        help_text: 'Required level of inspection',
        is_required: true,
        display_order: 1,
      },
      {
        field_name: 'NDT Requirements',
        field_type: 'select',
        field_config: {
          options: ['None', 'Ultrasonic', 'Magnetic Particle', 'Radiographic', 'Multiple Methods'],
          allow_multiple: true,
        },
        help_text: 'Non-destructive testing requirements',
        is_required: false,
        display_order: 2,
      },
      {
        field_name: 'Weld Inspection',
        field_type: 'select',
        field_config: {
          options: ['AWS D1.1', 'AWS D1.5', 'AISC 360', 'Custom Specification'],
          allow_multiple: false,
        },
        help_text: 'Welding inspection standard',
        is_required: false,
        display_order: 3,
      },
      {
        field_name: 'Tolerance Class',
        field_type: 'select',
        field_config: {
          options: ['Standard', 'Tight', 'Architectural', 'Survey Grade'],
          allow_multiple: false,
        },
        help_text: 'Dimensional tolerance requirements',
        is_required: true,
        display_order: 4,
      },
      {
        field_name: 'QC Inspector',
        field_type: 'text',
        field_config: {
          max_length: 100,
          placeholder: 'Inspector name',
        },
        help_text: 'Assigned quality control inspector',
        is_required: false,
        display_order: 5,
      },
      {
        field_name: 'Inspection Date',
        field_type: 'date',
        field_config: {
          format: 'YYYY-MM-DD',
          include_time: false,
        },
        help_text: 'Date of inspection completion',
        is_required: false,
        display_order: 6,
      },
    ],
    tags: ['inspection', 'quality', 'NDT', 'tolerances', 'welding'],
  },
];

export class FieldTemplateGroupsService {
  /**
   * Get all available field groups
   */
  static getFieldGroups(): FieldGroup[] {
    return FIELD_GROUPS;
  }

  /**
   * Get field groups by category
   */
  static getFieldGroupsByCategory(category: string): FieldGroup[] {
    if (category === 'all') return FIELD_GROUPS;
    return FIELD_GROUPS.filter(group => group.category === category);
  }

  /**
   * Get a specific field group by ID
   */
  static getFieldGroup(groupId: string): FieldGroup | null {
    return FIELD_GROUPS.find(group => group.id === groupId) || null;
  }

  /**
   * Search field groups by name, description, or tags
   */
  static searchFieldGroups(query: string): FieldGroup[] {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return FIELD_GROUPS;

    return FIELD_GROUPS.filter(group =>
      group.name.toLowerCase().includes(searchTerm) ||
      group.description.toLowerCase().includes(searchTerm) ||
      group.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Get available categories for field groups
   */
  static getCategories(): string[] {
    const categories = new Set(FIELD_GROUPS.map(group => group.category));
    return Array.from(categories);
  }

  /**
   * Apply a field group and return fields with proper display order
   */
  static applyFieldGroup(groupId: string, startingDisplayOrder: number = 1): ComponentSchemaFieldCreate[] {
    const group = this.getFieldGroup(groupId);
    if (!group) {
      throw new Error(`Field group not found: ${groupId}`);
    }

    return group.fields.map((field, index) => ({
      ...field,
      display_order: startingDisplayOrder + index,
    }));
  }

  /**
   * Get a preview of fields in a group
   */
  static getGroupPreview(groupId: string): {
    group: FieldGroup;
    fieldCount: number;
    requiredCount: number;
    fieldTypes: string[];
  } | null {
    const group = this.getFieldGroup(groupId);
    if (!group) return null;

    const fieldCount = group.fields.length;
    const requiredCount = group.fields.filter(field => field.is_required).length;
    const fieldTypes = [...new Set(group.fields.map(field => field.field_type))];

    return {
      group,
      fieldCount,
      requiredCount,
      fieldTypes,
    };
  }

  /**
   * Check if applying a field group would exceed field limits
   */
  static canApplyGroup(groupId: string, currentFieldCount: number, maxFields?: number): boolean {
    if (!maxFields) return true;

    const group = this.getFieldGroup(groupId);
    if (!group) return false;

    return currentFieldCount + group.fields.length <= maxFields;
  }

  /**
   * Get recommended field groups based on existing fields
   */
  static getRecommendedGroups(existingFields: ComponentSchemaFieldCreate[]): FieldGroup[] {
    const existingFieldNames = existingFields.map(f => f.field_name.toLowerCase());
    const existingFieldTypes = existingFields.map(f => f.field_type);

    return FIELD_GROUPS
      .map(group => {
        // Calculate relevance score based on complementary fields
        let score = 0;

        // Check for complementary field types
        const groupFieldTypes = group.fields.map(f => f.field_type);
        const commonTypes = existingFieldTypes.filter(type => groupFieldTypes.includes(type));
        score += commonTypes.length * 2;

        // Check for related field names
        const groupFieldNames = group.fields.map(f => f.field_name.toLowerCase());
        const overlapping = groupFieldNames.filter(name =>
          existingFieldNames.some(existing => existing.includes(name) || name.includes(existing))
        );

        // Penalize if too much overlap (avoid duplicate fields)
        if (overlapping.length > group.fields.length * 0.5) {
          score -= overlapping.length * 3;
        } else {
          score += overlapping.length;
        }

        return { group, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ group }) => group);
  }
}

export default FieldTemplateGroupsService;