import { DEFAULT_SCHEMA } from '../api';
import type { ComponentSchema, SchemaFieldType } from '../api';

describe('DEFAULT_SCHEMA Constant', () => {
  // Test ID: 3.12-UNIT-001 - Default schema constant validates
  it('should have valid default schema structure', () => {
    expect(DEFAULT_SCHEMA).toBeDefined();
    expect(DEFAULT_SCHEMA.id).toBe('default-schema-001');
    expect(DEFAULT_SCHEMA.name).toBe('Default Schema');
    expect(DEFAULT_SCHEMA.description).toBe('Default schema for immediate use when no custom schemas exist');
    expect(DEFAULT_SCHEMA.version).toBe(1);
    expect(DEFAULT_SCHEMA.is_default).toBe(true);
    expect(DEFAULT_SCHEMA.is_active).toBe(true);
    expect(DEFAULT_SCHEMA.created_at).toBeDefined();
    expect(DEFAULT_SCHEMA.updated_at).toBeDefined();
  });

  // Test ID: 3.12-UNIT-003 - Default schema has notes textarea field
  it('should contain notes textarea field with correct configuration', () => {
    expect(DEFAULT_SCHEMA.fields).toBeDefined();
    expect(DEFAULT_SCHEMA.fields).toHaveLength(1);

    const notesField = DEFAULT_SCHEMA.fields[0];
    expect(notesField.id).toBe('default-notes-field');
    expect(notesField.field_name).toBe('notes');
    expect(notesField.field_type).toBe('textarea');
    expect(notesField.field_config).toEqual({
      rows: 4,
      placeholder: 'Enter notes and observations...'
    });
    expect(notesField.help_text).toBe('General notes and observations for this component');
    expect(notesField.display_order).toBe(1);
    expect(notesField.is_required).toBe(false);
    expect(notesField.is_active).toBe(true);
  });

  it('should have valid field type from SchemaFieldType union', () => {
    const notesField = DEFAULT_SCHEMA.fields[0];
    const validTypes: SchemaFieldType[] = ['text', 'number', 'select', 'checkbox', 'textarea', 'date'];
    expect(validTypes).toContain(notesField.field_type);
  });

  it('should have system flags correctly set', () => {
    expect(DEFAULT_SCHEMA.is_default).toBe(true);
    expect(DEFAULT_SCHEMA.is_active).toBe(true);
    expect(DEFAULT_SCHEMA.project_id).toBeUndefined(); // Should be global
  });

  it('should have consistent timestamps', () => {
    expect(DEFAULT_SCHEMA.created_at).toBeDefined();
    expect(DEFAULT_SCHEMA.updated_at).toBeDefined();
    expect(new Date(DEFAULT_SCHEMA.created_at)).toBeInstanceOf(Date);
    expect(new Date(DEFAULT_SCHEMA.updated_at)).toBeInstanceOf(Date);
  });
});