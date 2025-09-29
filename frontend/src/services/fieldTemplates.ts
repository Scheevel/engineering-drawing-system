/**
 * Field Template Service
 *
 * Provides predefined field templates for common engineering component schemas
 * and template management functionality.
 */

import { SchemaTemplate, ComponentSchemaFieldCreate, SchemaFieldType } from '../types/schema';

// Predefined engineering field templates
export const ENGINEERING_FIELD_TEMPLATES: SchemaTemplate[] = [
  {
    id: 'basic-component-info',
    name: 'Basic Component Info',
    description: 'Essential fields for identifying and tracking engineering components',
    category: 'engineering',
    is_system_template: true,
    usage_count: 0,
    fields: [
      {
        field_name: 'Component Name',
        field_type: 'text' as SchemaFieldType,
        field_config: {
          placeholder: 'Enter component name (e.g., Beam B1, Column C2)',
          maxLength: 100,
          pattern: '^[A-Za-z0-9\\s\\-_]+$'
        },
        help_text: 'Unique name or identifier for this component',
        display_order: 1,
        is_required: true,
      },
      {
        field_name: 'Component Type',
        field_type: 'select' as SchemaFieldType,
        field_config: {
          options: [
            { value: 'beam', label: 'Beam' },
            { value: 'column', label: 'Column' },
            { value: 'connection', label: 'Connection' },
            { value: 'plate', label: 'Plate' },
            { value: 'bolt', label: 'Bolt' },
            { value: 'weld', label: 'Weld' },
            { value: 'bearing', label: 'Bearing' },
            { value: 'deck', label: 'Deck' },
            { value: 'other', label: 'Other' }
          ],
          multiple: false
        },
        help_text: 'Primary structural classification of this component',
        display_order: 2,
        is_required: true,
      },
      {
        field_name: 'Drawing Reference',
        field_type: 'text' as SchemaFieldType,
        field_config: {
          placeholder: 'Drawing number or sheet reference',
          maxLength: 50
        },
        help_text: 'Reference to the drawing where this component is detailed',
        display_order: 3,
        is_required: false,
      },
      {
        field_name: 'Installation Date',
        field_type: 'date' as SchemaFieldType,
        field_config: {
          format: 'YYYY-MM-DD',
          showTime: false
        },
        help_text: 'Date when component was installed or is planned for installation',
        display_order: 4,
        is_required: false,
      },
      {
        field_name: 'Status',
        field_type: 'select' as SchemaFieldType,
        field_config: {
          options: [
            { value: 'design', label: 'Design' },
            { value: 'fabrication', label: 'Fabrication' },
            { value: 'shipped', label: 'Shipped' },
            { value: 'installed', label: 'Installed' },
            { value: 'inspected', label: 'Inspected' },
            { value: 'rejected', label: 'Rejected' }
          ],
          multiple: false
        },
        help_text: 'Current status in the project lifecycle',
        display_order: 5,
        is_required: false,
      }
    ]
  },
  {
    id: 'material-properties',
    name: 'Material Properties',
    description: 'Standard material specification and property fields for structural components',
    category: 'engineering',
    is_system_template: true,
    usage_count: 0,
    fields: [
      {
        field_name: 'Material Grade',
        field_type: 'select' as SchemaFieldType,
        field_config: {
          options: [
            { value: 'A36', label: 'ASTM A36 (Structural Steel)' },
            { value: 'A572', label: 'ASTM A572 (High-Strength Steel)' },
            { value: 'A992', label: 'ASTM A992 (Structural Steel)' },
            { value: 'A709', label: 'ASTM A709 (Bridge Steel)' },
            { value: 'A588', label: 'ASTM A588 (Weathering Steel)' },
            { value: 'custom', label: 'Custom/Other' }
          ],
          multiple: false
        },
        help_text: 'ASTM or equivalent material specification',
        display_order: 1,
        is_required: true,
      },
      {
        field_name: 'Yield Strength',
        field_type: 'number' as SchemaFieldType,
        field_config: {
          min: 0,
          max: 200,
          step: 1,
          unit: 'ksi',
          precision: 0
        },
        help_text: 'Minimum yield strength in ksi (e.g., 36, 50, 65)',
        display_order: 2,
        is_required: true,
      },
      {
        field_name: 'Tensile Strength',
        field_type: 'number' as SchemaFieldType,
        field_config: {
          min: 0,
          max: 200,
          step: 1,
          unit: 'ksi',
          precision: 0
        },
        help_text: 'Minimum tensile strength in ksi',
        display_order: 3,
        is_required: false,
      },
      {
        field_name: 'Coating Type',
        field_type: 'select' as SchemaFieldType,
        field_config: {
          options: [
            { value: 'none', label: 'None (Bare Steel)' },
            { value: 'galvanized', label: 'Hot-Dip Galvanized' },
            { value: 'paint', label: 'Paint System' },
            { value: 'weathering', label: 'Weathering Steel' },
            { value: 'metallizing', label: 'Metallizing' }
          ],
          multiple: false
        },
        help_text: 'Corrosion protection system',
        display_order: 4,
        is_required: false,
      },
      {
        field_name: 'Heat Treatment',
        field_type: 'checkbox' as SchemaFieldType,
        field_config: {
          trueLabel: 'Heat Treated',
          falseLabel: 'As-Rolled'
        },
        help_text: 'Whether material received heat treatment',
        display_order: 5,
        is_required: false,
      },
      {
        field_name: 'Mill Test Certificate',
        field_type: 'text' as SchemaFieldType,
        field_config: {
          placeholder: 'MTC number or reference',
          maxLength: 50
        },
        help_text: 'Mill test certificate number for traceability',
        display_order: 6,
        is_required: false,
      }
    ]
  },
  {
    id: 'dimensions',
    name: 'Dimensions',
    description: 'Physical dimensions and geometric properties for components',
    category: 'engineering',
    is_system_template: true,
    usage_count: 0,
    fields: [
      {
        field_name: 'Length',
        field_type: 'number' as SchemaFieldType,
        field_config: {
          min: 0,
          max: 1000,
          step: 0.125,
          unit: 'ft',
          precision: 3
        },
        help_text: 'Overall length of component in feet',
        display_order: 1,
        is_required: true,
      },
      {
        field_name: 'Width',
        field_type: 'number' as SchemaFieldType,
        field_config: {
          min: 0,
          max: 100,
          step: 0.125,
          unit: 'ft',
          precision: 3
        },
        help_text: 'Overall width of component in feet',
        display_order: 2,
        is_required: false,
      },
      {
        field_name: 'Height',
        field_type: 'number' as SchemaFieldType,
        field_config: {
          min: 0,
          max: 100,
          step: 0.125,
          unit: 'ft',
          precision: 3
        },
        help_text: 'Overall height of component in feet',
        display_order: 3,
        is_required: false,
      },
      {
        field_name: 'Cross Section',
        field_type: 'text' as SchemaFieldType,
        field_config: {
          placeholder: 'e.g., W24x84, HSS12x8x1/2, L6x6x3/4',
          maxLength: 50
        },
        help_text: 'Standard designation for structural cross-section',
        display_order: 4,
        is_required: false,
      },
      {
        field_name: 'Web Thickness',
        field_type: 'number' as SchemaFieldType,
        field_config: {
          min: 0,
          max: 10,
          step: 0.0625,
          unit: 'in',
          precision: 4
        },
        help_text: 'Web thickness in inches (for built-up sections)',
        display_order: 5,
        is_required: false,
      },
      {
        field_name: 'Flange Thickness',
        field_type: 'number' as SchemaFieldType,
        field_config: {
          min: 0,
          max: 10,
          step: 0.0625,
          unit: 'in',
          precision: 4
        },
        help_text: 'Flange thickness in inches (for built-up sections)',
        display_order: 6,
        is_required: false,
      },
      {
        field_name: 'Weight',
        field_type: 'number' as SchemaFieldType,
        field_config: {
          min: 0,
          max: 100000,
          step: 1,
          unit: 'lbs',
          precision: 0
        },
        help_text: 'Total weight of component in pounds',
        display_order: 7,
        is_required: false,
      }
    ]
  },
  {
    id: 'specifications',
    name: 'Specifications',
    description: 'Design requirements, codes, and performance specifications',
    category: 'engineering',
    is_system_template: true,
    usage_count: 0,
    fields: [
      {
        field_name: 'Design Code',
        field_type: 'select' as SchemaFieldType,
        field_config: {
          options: [
            { value: 'AASHTO', label: 'AASHTO LRFD Bridge Design' },
            { value: 'AISC', label: 'AISC Steel Construction Manual' },
            { value: 'AWS', label: 'AWS Welding Code' },
            { value: 'AREMA', label: 'AREMA Manual for Railway Engineering' },
            { value: 'ASCE', label: 'ASCE Standards' }
          ],
          multiple: true
        },
        help_text: 'Applicable design codes and standards',
        display_order: 1,
        is_required: true,
      },
      {
        field_name: 'Design Load',
        field_type: 'number' as SchemaFieldType,
        field_config: {
          min: 0,
          max: 10000,
          step: 1,
          unit: 'kips',
          precision: 1
        },
        help_text: 'Design load capacity in kips',
        display_order: 2,
        is_required: false,
      },
      {
        field_name: 'Live Load',
        field_type: 'text' as SchemaFieldType,
        field_config: {
          placeholder: 'e.g., HL-93, Cooper E80, AREMA',
          maxLength: 50
        },
        help_text: 'Live load specification (vehicular or railway)',
        display_order: 3,
        is_required: false,
      },
      {
        field_name: 'Seismic Zone',
        field_type: 'select' as SchemaFieldType,
        field_config: {
          options: [
            { value: 'A', label: 'Zone A (Low)' },
            { value: 'B', label: 'Zone B (Moderate)' },
            { value: 'C', label: 'Zone C (High)' },
            { value: 'D', label: 'Zone D (Very High)' },
            { value: 'none', label: 'Not Applicable' }
          ],
          multiple: false
        },
        help_text: 'Seismic design zone classification',
        display_order: 4,
        is_required: false,
      },
      {
        field_name: 'Fatigue Category',
        field_type: 'select' as SchemaFieldType,
        field_config: {
          options: [
            { value: 'A', label: 'Category A' },
            { value: 'B', label: 'Category B' },
            { value: 'C', label: 'Category C' },
            { value: 'D', label: 'Category D' },
            { value: 'E', label: 'Category E' },
            { value: 'none', label: 'Not Subject to Fatigue' }
          ],
          multiple: false
        },
        help_text: 'AASHTO fatigue design category',
        display_order: 5,
        is_required: false,
      },
      {
        field_name: 'Inspection Requirements',
        field_type: 'textarea' as SchemaFieldType,
        field_config: {
          placeholder: 'Special inspection requirements, testing protocols...',
          rows: 3,
          maxLength: 500
        },
        help_text: 'Special requirements for inspection and testing',
        display_order: 6,
        is_required: false,
      },
      {
        field_name: 'Design Notes',
        field_type: 'textarea' as SchemaFieldType,
        field_config: {
          placeholder: 'Additional design considerations, constraints, or notes...',
          rows: 4,
          maxLength: 1000
        },
        help_text: 'Additional design notes and considerations',
        display_order: 7,
        is_required: false,
      }
    ]
  }
];

// Template management functions
export class FieldTemplateService {
  private static templates: SchemaTemplate[] = [...ENGINEERING_FIELD_TEMPLATES];

  /**
   * Get all available templates, optionally filtered by category
   */
  static getTemplates(category?: string): SchemaTemplate[] {
    if (category) {
      return this.templates.filter(template => template.category === category);
    }
    return [...this.templates];
  }

  /**
   * Get template by ID
   */
  static getTemplate(id: string): SchemaTemplate | undefined {
    return this.templates.find(template => template.id === id);
  }

  /**
   * Get template categories
   */
  static getCategories(): string[] {
    return Array.from(new Set(this.templates.map(template => template.category)));
  }

  /**
   * Search templates by name or description
   */
  static searchTemplates(query: string): SchemaTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.templates.filter(template =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Apply template to create fields with proper display order
   */
  static applyTemplate(templateId: string, startingDisplayOrder: number = 1): ComponentSchemaFieldCreate[] {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Increment usage count
    template.usage_count++;

    // Return fields with adjusted display order
    return template.fields.map((field, index) => ({
      ...field,
      display_order: startingDisplayOrder + index
    }));
  }

  /**
   * Create preview data for a template
   */
  static getTemplatePreview(templateId: string): {
    template: SchemaTemplate;
    fieldCount: number;
    requiredFieldCount: number;
    fieldTypes: { type: string; count: number }[];
  } | null {
    const template = this.getTemplate(templateId);
    if (!template) return null;

    const fieldTypes = template.fields.reduce((acc, field) => {
      const existingType = acc.find(item => item.type === field.field_type);
      if (existingType) {
        existingType.count++;
      } else {
        acc.push({ type: field.field_type, count: 1 });
      }
      return acc;
    }, [] as { type: string; count: number }[]);

    return {
      template,
      fieldCount: template.fields.length,
      requiredFieldCount: template.fields.filter(field => field.is_required).length,
      fieldTypes
    };
  }

  /**
   * Add custom template (for future extensibility)
   */
  static addCustomTemplate(template: Omit<SchemaTemplate, 'id' | 'usage_count'>): SchemaTemplate {
    const newTemplate: SchemaTemplate = {
      ...template,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      usage_count: 0,
      is_system_template: false
    };

    this.templates.push(newTemplate);
    return newTemplate;
  }

  /**
   * Get most used templates
   */
  static getMostUsedTemplates(limit: number = 5): SchemaTemplate[] {
    return [...this.templates]
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, limit);
  }

  /**
   * Validate template fields
   */
  static validateTemplate(template: SchemaTemplate): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template.name.trim()) {
      errors.push('Template name is required');
    }

    if (!template.description.trim()) {
      errors.push('Template description is required');
    }

    if (template.fields.length === 0) {
      errors.push('Template must contain at least one field');
    }

    // Check for duplicate field names
    const fieldNames = template.fields.map(field => field.field_name);
    const duplicateNames = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      errors.push(`Duplicate field names found: ${duplicateNames.join(', ')}`);
    }

    // Validate each field
    template.fields.forEach((field, index) => {
      if (!field.field_name.trim()) {
        errors.push(`Field ${index + 1}: Field name is required`);
      }

      if (!field.field_type) {
        errors.push(`Field ${index + 1}: Field type is required`);
      }
    });

    return { isValid: errors.length === 0, errors };
  }
}