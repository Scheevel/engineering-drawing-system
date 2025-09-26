# Story 3.4: Dynamic Field Management

**Epic:** Schema Management UI
**Story Points:** 13
**Sprint:** Sprint 3-4 (Week 3-4)
**Dependencies:** Story 3.3 (Schema Creation and Basic Editing)
**Priority:** Critical Path

## Description

Implement dynamic field creation, editing, and management within schemas including field type selection and configuration. This is the most complex story in the epic, enabling users to define the specific fields that make up their component schemas.

## User Story

**As a** railroad bridge engineer
**I want** to add, configure, and manage individual fields within my component schemas
**So that** I can capture exactly the data points I need for my engineering components

## Acceptance Criteria

### Field Editor Interface
- [ ] **Field List Display**
  - Display existing schema fields in organized, editable list format
  - Show field name, type, required status, and basic configuration summary
  - Visual distinction between required and optional fields
  - Field status indicators (active/inactive)
  - Loading states for individual field operations

- [ ] **Add New Field Button**
  - Prominent "Add Field" button accessible from schema editing interface
  - Opens field creation form/dialog
  - Disabled during field save operations
  - Keyboard accessible with proper ARIA labels

- [ ] **Field Creation Form**
  - Modal dialog or inline form for creating new fields
  - Required fields: field name, field type
  - Optional fields: help text, required status, display order
  - Real-time validation of field name uniqueness
  - Form follows existing Material-UI patterns

- [ ] **Remove Field Functionality**
  - Delete button for each field with confirmation dialog
  - Prevent deletion of fields currently in use by components
  - Soft delete vs hard delete based on usage
  - Clear warning messages about impact of field removal

- [ ] **Field Activation Toggle**
  - Toggle to activate/deactivate fields without deletion
  - Visual indication of inactive fields (grayed out, different styling)
  - Bulk activation/deactivation capabilities
  - Preserve field configuration when deactivating

### Field Type Support
- [ ] **Field Type Selector**
  - Dropdown/select component with all supported field types
  - Type options: text, number, select, checkbox, textarea, date, autocomplete
  - Clear descriptions and examples for each field type
  - Icons or visual indicators for field types
  - Search/filter capability for large type lists

- [ ] **Field Type Descriptions**
  - Help text explaining each field type's purpose and usage
  - Examples of appropriate use cases for each type
  - Preview of how field type will appear in forms
  - Links to documentation for complex field types

- [ ] **Dynamic Configuration Interface**
  - Configuration options change based on selected field type
  - Smooth transitions when switching field types
  - Preserve compatible configuration when changing types
  - Clear indication of which options apply to current type

### Field Configuration by Type

#### Text Fields
- [ ] **Text Field Configuration**
  - Multiline option (textarea vs single-line input)
  - Maximum length setting with character counter
  - Pattern validation (regex) with common patterns provided
  - Placeholder text configuration
  - Input format hints for users

#### Number Fields
- [ ] **Number Field Configuration**
  - Minimum and maximum value settings
  - Step increment value (0.1, 1, 10, etc.)
  - Integer-only vs decimal options
  - Unit display (optional suffix like "mm", "lbs")
  - Number format options (thousands separator, decimal places)

#### Select Fields
- [ ] **Select Field Configuration**
  - Option management interface (add, edit, remove, reorder options)
  - Allow custom values toggle
  - Default selection configuration
  - Option grouping capabilities
  - Import options from existing schemas or templates

#### Checkbox Fields
- [ ] **Checkbox Configuration**
  - Default checked state
  - Custom labels for checked/unchecked states
  - Help text for boolean choice clarification

#### Autocomplete Fields
- [ ] **Autocomplete Configuration**
  - Predefined options list management
  - Allow custom values setting
  - Search behavior configuration
  - Multiple selection option
  - Integration with external data sources (future)

#### Date Fields
- [ ] **Date Configuration**
  - Date format selection
  - Min/max date constraints
  - Default date behavior (today, blank, custom)
  - Date picker style preferences

### Field Validation and Configuration
- [ ] **Field-Level Validation**
  - Real-time validation of field configuration
  - Prevent duplicate field names within schema
  - Validate field-specific configurations (e.g., min < max for numbers)
  - Cross-field validation where applicable
  - Clear error messaging with correction suggestions

- [ ] **Configuration Validation**
  - Validate select field options are not empty
  - Ensure number min/max relationships are logical
  - Validate regex patterns for text fields
  - Check date range constraints for validity
  - Prevent configuration that would break existing component data

- [ ] **Required Field Management**
  - Toggle required status for any field
  - Visual indication of required fields (asterisk, styling)
  - Warning when making required field optional if data exists
  - Impact analysis for requirement changes

- [ ] **Help Text and Documentation**
  - Help text configuration for each field
  - Markdown support for rich help text formatting
  - Preview of help text as it will appear to users
  - Character limits and formatting validation

### Display Order Management
- [ ] **Field Ordering Interface**
  - Visual representation of field display order
  - Up/down arrows for order adjustment
  - Drag-and-drop ordering (prepare for Story 3.5)
  - Numeric order input for precise positioning
  - Auto-numbering with gap handling

- [ ] **Order Validation**
  - Prevent duplicate display orders
  - Automatic re-ordering when conflicts arise
  - Preserve logical grouping of related fields
  - Order persistence across save operations

## Technical Implementation

### Components to Create

**Field Management Components:**
- `src/components/schema-management/SchemaFieldEditor.tsx` - Main field editing interface
- `src/components/schema-management/FieldTypeSelector.tsx` - Field type selection
- `src/components/schema-management/FieldConfigEditor.tsx` - Type-specific configuration
- `src/components/schema-forms/DynamicFieldRenderer.tsx` - Render fields dynamically

**Field Configuration Components:**
- `src/components/schema-forms/TextFieldConfig.tsx` - Text field configuration
- `src/components/schema-forms/NumberFieldConfig.tsx` - Number field configuration
- `src/components/schema-forms/SelectFieldConfig.tsx` - Select field configuration
- `src/components/schema-forms/CheckboxFieldConfig.tsx` - Checkbox configuration
- `src/components/schema-forms/AutocompleteFieldConfig.tsx` - Autocomplete configuration
- `src/components/schema-forms/DateFieldConfig.tsx` - Date field configuration

### Hooks to Create
- `src/hooks/schema/useSchemaFieldEditor.ts` - Field CRUD operations
- `src/hooks/schema/useFieldValidation.ts` - Field-specific validation
- `src/hooks/schema/useFieldConfiguration.ts` - Type-specific configuration management

### Utilities to Create
- `src/utils/fieldTypeMapping.ts` - Field type definitions and mappings
- `src/utils/fieldValidationUtils.ts` - Field validation logic
- `src/utils/fieldConfigDefaults.ts` - Default configurations for field types

### API Integration Pattern
```typescript
// Field management hook
export const useSchemaFieldEditor = (schemaId: string) => {
  const queryClient = useQueryClient();

  const addFieldMutation = useMutation(addSchemaField, {
    onMutate: async (newField) => {
      // Optimistic update
      const previousSchema = queryClient.getQueryData(['schema', schemaId]);
      queryClient.setQueryData(['schema', schemaId], (old) => ({
        ...old,
        fields: [...old.fields, { ...newField, id: `temp-${Date.now()}` }]
      }));
      return { previousSchema };
    },
    onError: (err, newField, context) => {
      queryClient.setQueryData(['schema', schemaId], context.previousSchema);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['schema', schemaId]);
    },
  });

  return { addField: addFieldMutation.mutate, /* other operations */ };
};
```

### Field Type Configuration Interface
```typescript
interface FieldTypeConfig {
  text: {
    multiline?: boolean;
    maxLength?: number;
    pattern?: string;
    placeholder?: string;
  };
  number: {
    min?: number;
    max?: number;
    step?: number;
    integerOnly?: boolean;
    unit?: string;
  };
  select: {
    options: Array<{ value: string; label: string }>;
    allowCustom?: boolean;
    defaultValue?: string;
  };
  // ... other field types
}
```

## Testing Requirements

### Unit Tests
- [ ] **Field Editor Component Tests**
  - Field list renders correctly with existing fields
  - Add field button opens creation form
  - Field deletion works with confirmation
  - Field activation toggle functions properly

- [ ] **Field Type Configuration Tests**
  - Each field type shows appropriate configuration options
  - Configuration validation works for all field types
  - Type switching preserves compatible settings
  - Invalid configurations prevent save

- [ ] **Field Validation Tests**
  - Duplicate field names prevented
  - Field configuration validation works
  - Cross-field validation rules enforced
  - Error messages clear and actionable

### Integration Tests
- [ ] **Complete Field Management Workflow**
  - Create schema -> add fields -> configure fields -> save schema
  - Field editing workflow with various field types
  - Field deletion impact on existing components

- [ ] **Field Type Comprehensive Testing**
  - Test all field types with various configurations
  - Validate field rendering in schema preview
  - Test field data validation with different settings

### Performance Tests
- [ ] **Large Schema Handling**
  - Performance with schemas containing 50+ fields
  - Field reordering performance
  - Configuration change response time

### Test Files to Create
- `src/components/schema-management/SchemaFieldEditor.test.tsx`
- `src/components/schema-management/FieldTypeSelector.test.tsx`
- `src/hooks/schema/useSchemaFieldEditor.test.ts`
- `src/utils/fieldValidationUtils.test.ts`

## Definition of Done

- [ ] Users can add, edit, and remove schema fields successfully
- [ ] All supported field types work with proper configuration options
- [ ] Field validation prevents invalid configurations and provides clear feedback
- [ ] Field management integrates properly with schema saving operations
- [ ] UI provides clear feedback for all field operations
- [ ] Performance remains acceptable with complex schemas (50+ fields)
- [ ] All field configuration options work as specified
- [ ] Field ordering and display management functions correctly
- [ ] Error handling provides actionable user guidance
- [ ] Test coverage meets requirements (>80% for all new components)

## Risks & Mitigation

**Risk:** Configuration complexity across multiple field types
**Mitigation:** Modular component design with shared configuration patterns

**Risk:** Field validation complexity
**Mitigation:** Comprehensive utility functions and extensive testing

**Risk:** Performance with large numbers of fields
**Mitigation:** Efficient rendering patterns and lazy loading where appropriate

**Risk:** User experience complexity with many configuration options
**Mitigation:** Progressive disclosure and clear field type documentation

## Dependencies

**Requires:**
- Story 3.3: Schema Creation and Basic Editing
- Field type definitions from backend API
- Understanding of component data requirements

**Enables:**
- Story 3.5: Advanced Field Operations (drag-and-drop, bulk operations)
- Story 3.6: Real-time Validation and Preview
- Story 3.7: State Management Optimization

**API Dependencies:**
- `addSchemaField(schemaId, fieldData)` - Add field to schema
- `updateSchemaField(fieldId, updates)` - Update field configuration
- `removeSchemaField(fieldId)` - Remove field from schema
- `reorderSchemaFields(schemaId, fieldOrder)` - Update field display order

---

**Created:** 2025-01-26
**Assigned:** Frontend Developer
**Labels:** complex-forms, field-management, dynamic-ui, validation