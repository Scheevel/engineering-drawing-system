# Component Type Schema Migration Strategy

## User Story

As a **project administrator setting up component schemas**,
I want **component type to be defined within project schemas instead of as a system field**,
So that **projects can customize type taxonomies while maintaining backward compatibility with legacy components**.

## Story Context

**Existing System Integration:**

- Integrates with: Schema management system, FlexibleComponentCard, default schema creation
- Technology: Backend FastAPI schema system, frontend schema editing UI
- Follows pattern: Migration from system fields to schema fields (precedent: dynamic_data introduction)
- Touch points: Schema creation, component migration, default schema templates, legacy component support
- **Builds On**: Story 3.14 (component_type display restoration)

## Acceptance Criteria

**Phase 1: Default Schema Creation**

1. **Default Schema Template**: Create "Bridge Component Default" schema with component_type field
2. **Type Field Configuration**: Dropdown field with 12 standard types (wide_flange, hss, angle, etc.)
3. **Auto-Assignment**: New projects automatically receive default schema
4. **Backward Compatibility**: Legacy components without schema_id display system component_type field

**Phase 2: Migration Path**

5. **Migration Trigger**: When editing a legacy component, offer one-time migration to default schema
6. **Data Preservation**: System component_type value copies to schema field_values on migration
7. **Dual Display**: During transition, show both system field (read-only) and schema field (editable)
8. **Migration Indicator**: Visual badge showing "Migrated" status after schema assignment

**Phase 3: Deprecation Communication**

9. **Deprecation Warning**: System component_type field shows "Legacy Field" badge in view mode
10. **Migration Prompt**: Edit mode shows "Migrate to Schema" button for legacy components
11. **Documentation**: Help text explains schema-based approach and migration benefits
12. **Rollback Safety**: Migration can be reversed by clearing schema_id (restores system field)

**Quality Requirements:**

13. **Test Coverage**: Migration logic, dual display, default schema creation
14. **Data Integrity**: No data loss during migration, validation of type values
15. **Performance**: Migration operations complete in < 100ms per component

## Technical Notes

**Implementation Approach:**

**Backend Changes:**

1. Create default schema template JSON with component_type field definition
2. Add migration endpoint: `POST /api/components/{id}/migrate-to-schema`
3. Schema validation ensures type field exists before marking as "component schema"
4. Update getFlexibleComponent to return both system and schema type values during transition

**Frontend Changes:**

1. Update FlexibleComponentCard to detect legacy vs. schema components
2. Add migration dialog component with clear messaging and data preview
3. Implement dual display mode showing both system (deprecated) and schema fields
4. Add "Migrate" button in System Information section for legacy components

**Migration Logic:**

```typescript
// Pseudo-code for migration
async function migrateComponentToSchema(componentId: string, targetSchemaId: string) {
  const component = await getComponent(componentId);
  const schema = await getSchema(targetSchemaId);

  // Copy system component_type to schema field_values
  const fieldValues = {
    ...component.dynamic_data?.field_values,
    component_type: component.component_type
  };

  // Update component with schema assignment
  await updateComponent(componentId, {
    schema_id: targetSchemaId,
    dynamic_data: { field_values: fieldValues }
  });
}
```

**Default Schema Template:**

```json
{
  "name": "Bridge Component Default",
  "description": "Standard schema for railroad bridge components",
  "version": "1.0",
  "is_default": true,
  "fields": [
    {
      "field_name": "component_type",
      "display_name": "Component Type",
      "field_type": "select",
      "required": true,
      "validation_rules": {
        "options": [
          {"value": "wide_flange", "label": "Wide Flange"},
          {"value": "hss", "label": "HSS"},
          {"value": "angle", "label": "Angle"},
          {"value": "channel", "label": "Channel"},
          {"value": "plate", "label": "Plate"},
          {"value": "tube", "label": "Tube"},
          {"value": "beam", "label": "Beam"},
          {"value": "column", "label": "Column"},
          {"value": "brace", "label": "Brace"},
          {"value": "girder", "label": "Girder"},
          {"value": "truss", "label": "Truss"},
          {"value": "generic", "label": "Generic"}
        ]
      },
      "display_order": 1,
      "help_text": "Select the structural component classification"
    }
  ]
}
```

## Definition of Done

- [ ] Default schema template created with component_type field
- [ ] Migration endpoint implemented and tested
- [ ] FlexibleComponentCard detects legacy vs. schema components
- [ ] Migration dialog component created with user-friendly messaging
- [ ] Dual display mode implemented for transitioning components
- [ ] Deprecation badges and warnings display correctly
- [ ] All migration tests pass (unit, integration, data integrity)
- [ ] Documentation updated with migration guide
- [ ] Rollback mechanism tested and verified

## Test-Driven Development Requirements

**Required Test Coverage:**

1. **Unit Tests**:
   - Default schema template validation
   - Migration logic preserves component_type value
   - Dual display rendering for legacy components
   - Deprecation badge display logic

2. **Integration Tests**:
   - End-to-end migration workflow
   - Schema assignment on component save
   - Legacy component detection and handling
   - Rollback mechanism restores system field

3. **Data Migration Tests**:
   - Bulk migration of legacy components
   - Type value validation during migration
   - No data loss during migration
   - Migration status tracking

## Risk and Compatibility Check

**Risk Assessment:**

- **Primary Risk**: Data loss during migration or schema conflicts
- **Mitigation**: Dual display during transition, rollback mechanism, comprehensive testing
- **Rollback**: Clear schema_id to restore system field behavior

**Compatibility Verification:**

- [ ] Legacy components continue working without schema assignment
- [ ] ComponentDetailModal continues using system component_type field (no changes needed)
- [ ] Search and export continue working with both system and schema type values
- [ ] No breaking changes to existing API contracts

**Migration Risks:**

1. **Custom Type Values**: Some projects may have custom types beyond the 12 standard ones
   - **Mitigation**: Migration validation checks for unsupported types, prompts user to add to schema
2. **Null/Missing Types**: Legacy components without component_type set
   - **Mitigation**: Migration skips or prompts for type selection before migrating
3. **Schema Conflicts**: Multiple schemas with different type field definitions
   - **Mitigation**: Only default schema supports auto-migration; custom schemas require manual selection

---

**Development Estimate**: 1-2 weeks (backend schema system + frontend migration UI + testing)
**Sprint Priority**: Medium (architectural improvement, not urgent)
**Dependencies**: Story 3.14 (component_type display must be working first)
**Prerequisite**: Story 3.14 completion and deployment

---

## Strategic Context

**Architectural Goals:**

This story represents the strategic evolution toward a fully schema-driven component system:

1. **Current State**: Mixed system fields (component_type, piece_mark) + schema fields (dynamic_data)
2. **Target State**: Schema defines all editable fields; system fields are metadata only (IDs, timestamps)
3. **Migration Path**: Gradual, user-driven migration with clear communication and safety mechanisms

**Benefits of Schema-Based Type:**

- **Customization**: Projects can define custom type taxonomies (e.g., "Box Girder", "Truss Chord")
- **Validation**: Schema-level validation rules for type-specific required fields
- **Flexibility**: Type field can include additional metadata (icon, color, structural properties)
- **Consistency**: All editable fields managed through single schema system

**Precedent:**

This follows the pattern established in Epic 3 (Stories 3.1-3.13) where the system migrated from hardcoded fields to flexible schemas. The component_type field is the last major system field that should migrate to schema control.

---

## User Migration Experience

**Scenario 1: New Component Creation**

1. User creates component → auto-assigned default schema
2. Type field appears as schema field (no migration needed)
3. User never sees system field

**Scenario 2: Editing Legacy Component**

1. User opens legacy component in FlexibleComponentCard
2. System Information shows: "Component Type: Wide Flange [Legacy Field]"
3. Banner message: "This component uses legacy fields. Migrate to schema for full flexibility."
4. User clicks "Migrate to Schema" button
5. Migration dialog shows current type, target schema, preview of changes
6. User confirms → component migrated → "Migrated ✓" badge displays
7. Future edits use schema field

**Scenario 3: Project Admin Customization**

1. Admin creates custom schema with extended types
2. Admin adds "Box Girder" and "Cable Stay" to type options
3. Components using custom schema get extended type dropdown
4. Legacy components continue using 12 standard types until migrated
