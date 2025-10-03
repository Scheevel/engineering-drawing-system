# Story 7.3: Export Dynamic Schema Fields from Component dynamic_data

## Status

**Status**: Ready for Development ✅
**Epic**: 7 - Data Export & Reporting
**Sprint**: TBD
**Assigned To**: TBD
**Estimated Effort**: 2-3 hours
**Priority**: Medium (enhances existing export functionality)
**Dependencies**: Story 7.2 (completed - component-inclusive API)
**Story Type**: Feature Enhancement
**Validated By**: Sarah (Product Owner)
**Validation Date**: 2025-10-03
**Implementation Readiness Score**: 8.5/10
**Template Compliance**: ✅ Complete

## Story

**As a** railroad bridge engineer,
**I want** custom schema fields (stored in `component.dynamic_data`) to appear as separate columns in CSV exports,
**So that** I can analyze schema-specific component data (like "inspect" and "result" fields) in Excel alongside standard component fields.

## Context & Rationale

### Current Behavior (Bug)

The system supports flexible component schemas where users can define custom fields (e.g., "inspect", "result", "notes"). These fields are stored in the `Component.dynamic_data` JSONB column. However, the current export implementation does NOT discover or export these nested fields.

**Example:**
```json
{
  "piece_mark": "F106",
  "component_type": "Flange",
  "dynamic_data": {
    "inspect": "Pass",
    "result": "Good"
  }
}
```

**Current CSV Output:**
```csv
Piece Mark,Component Type,Dynamic Data
F106,Flange,"{""inspect"":""Pass"",""result"":""Good""}"
```
❌ `dynamic_data` exported as single JSON blob - unusable in Excel

**Expected CSV Output:**
```csv
Piece Mark,Component Type,Inspect,Result
F106,Flange,Pass,Good
```
✅ Each schema field becomes a separate column

### Root Cause

In `frontend/src/services/exportService.ts:72`, the `getComponentDataFields()` function uses:
```typescript
Object.keys(component).forEach(key => { ... })
```

This discovers only **top-level** component keys. The `dynamic_data` field is discovered as a single key, but its **nested contents** are not introspected.

### Solution Approach: Path 1 (Data-Driven Discovery)

Enhance `getComponentDataFields()` to:
1. Check if `component.dynamic_data` exists
2. Iterate `Object.keys(component.dynamic_data)` to discover nested fields
3. Create CSV columns for each nested field (e.g., `component_inspect`, `component_result`)
4. Update `generateCSV()` to extract values from `component.dynamic_data[key]`

**Key Characteristic: Sparse Matrix Pattern**
- CSV contains union of ALL discovered fields across ALL components
- Components without a field have empty cells in that column
- Example: F106 has "inspect", G204 has "thickness" → CSV has both columns, each row populates what it has

## Acceptance Criteria

1. **Dynamic Field Discovery**: Export service discovers all fields within `component.dynamic_data` across all components being exported

2. **Separate CSV Columns**: Each discovered `dynamic_data` field appears as a separate column in CSV output
   - Column naming: Use field key with proper formatting (e.g., "inspect" → "Inspect")
   - Column ordering: After standard component fields

3. **Sparse Data Handling**: Components without a particular schema field show empty cells in that column
   - Example: F106 has "inspect", B55 does not → B55 row has empty "Inspect" cell

4. **Type Inference**: Field types are inferred from data:
   - Numeric values → exported as numbers
   - All other values → exported as strings
   - Dates → formatted as readable strings (if detectable)

5. **Backward Compatibility**: Export continues to work for components without `dynamic_data` or with empty `dynamic_data`

6. **Preview Accuracy**: ExportPreview component shows dynamic schema fields as columns in real-time preview

7. **Field Selection**: Dynamic schema fields appear in the "Component Data" group in FieldGroupSelector and can be toggled on/off

## Tasks / Subtasks

### Task 1: Enhance Field Discovery Logic (AC: 1, 2, 4, 5)
- [ ] Update `getComponentDataFields()` in `frontend/src/services/exportService.ts`:
  - Add check for `component.dynamic_data` existence
  - Iterate `Object.keys(component.dynamic_data)` for each component
  - Deduplicate field keys across all components (Set-based tracking)
  - Format field labels: `key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())`
  - Infer field types: `typeof value === 'number' ? 'number' : 'string'`
  - Ensure fields are excluded from discovery (already handled by existing exclusion logic)
- [ ] Add inline code comments explaining sparse matrix pattern

### Task 2: Update CSV Generation Logic (AC: 3, 5)
- [ ] Update `generateCSV()` in `frontend/src/services/exportService.ts`:
  - When processing `component_*` prefixed fields, check if key exists in `component.dynamic_data`
  - Extract value: `component.dynamic_data[componentKey]`
  - Handle missing values (return empty string for `formatValue()`)
- [ ] Verify sparse data handling: components without field show empty cells

### Task 3: Preview Integration (AC: 6)
- [ ] Test ExportPreview component with dynamic schema fields:
  - Verify preview table shows dynamic columns
  - Verify real-time updates when toggling dynamic fields
  - Verify sparse data displays correctly (empty cells for missing values)

### Task 4: Field Selection UI Integration (AC: 7)
- [ ] Verify FieldGroupSelector includes dynamic fields in "Component Data" group:
  - Dynamic fields appear in field list (auto-discovered)
  - Fields can be toggled on/off individually
  - Group-level checkbox includes dynamic fields in selection state
- [ ] Test field count chip updates correctly with dynamic fields

### Task 5: Testing & Validation (AC: 1-7)
- [ ] Create test data:
  - Component F106: `dynamic_data = { inspect: "Pass", result: "Good" }`
  - Component G204: `dynamic_data = { thickness: "10mm" }`
  - Component B55: `dynamic_data = {}` (or no schema)
- [ ] Test CSV output:
  - Verify "Inspect", "Result", "Thickness" columns exist
  - Verify F106 row: `Pass, Good, [empty]`
  - Verify G204 row: `[empty], [empty], 10mm`
  - Verify B55 row: `[empty], [empty], [empty]`
- [ ] Test edge cases:
  - All components have empty `dynamic_data` → no extra columns
  - Single component has `dynamic_data` → columns created, others empty
  - Mixed schemas across components → union of all fields
- [ ] Update existing export tests in `frontend/src/services/__tests__/exportService.test.ts`

## Dev Notes

### Relevant Architecture Context

**Project Structure:**
- Frontend services located in `frontend/src/services/`
- Test files co-located in `__tests__/` subdirectories
- Export functionality previously implemented in Story 7.1 and 7.2

**Technology Stack:**
- TypeScript 4.9.0 for type-safe development
- Papa Parse library for CSV generation
- React Query for state management (if needed for preview updates)

**Key Files:**
- `frontend/src/services/exportService.ts` - Core export logic (64+ functions)
- `frontend/src/components/export/ExportPreview.tsx` - Preview component with virtualization
- `frontend/src/components/export/FieldGroupSelector.tsx` - Field selection UI

### Testing

**Testing Standards (from `docs/architecture/coding-standards.md`):**

**Test Framework:** Jest 29.5.0 + React Testing Library 13.4.0

**Test File Location:**
- Unit tests co-located in `__tests__/` subdirectory
- Path: `frontend/src/services/__tests__/exportService.test.ts`

**Testing Patterns:**
- Use descriptive test names: `describe('getComponentDataFields', () => { it('should discover fields from dynamic_data', ...) })`
- Test edge cases explicitly (empty `dynamic_data`, missing fields, mixed schemas)
- Mock component data structures to match database models

**Test Standards for This Story:**
1. Unit test field discovery with `dynamic_data` objects
2. Unit test CSV generation with sparse matrix data
3. Test type inference (number vs string detection)
4. Test backward compatibility (components without `dynamic_data`)
5. Manual testing with Export dialog for UI integration

**Code Quality Checks:**
```bash
npm run lint              # ESLint + TypeScript
npm run type-check        # TypeScript validation
npm test                  # Jest unit tests
```

## Technical Notes

### Implementation Strategy: Data-Driven Discovery

This implementation uses **data-driven discovery** rather than schema-driven export:
- **Discovers fields from actual component data** (what exists in `dynamic_data`)
- Does NOT require loading ComponentSchema definitions
- Trade-off: Only exports fields that have values in at least one component

**Alternative (Future Enhancement):** Path 4 (Hybrid Approach) could add schema-awareness to:
- Use proper field labels from schema definitions
- Include all schema fields even if no data exists (empty columns)
- Respect schema-defined field ordering
- See Story 7.3 analysis notes for Path 4 details

### Code Changes Summary

**File: `frontend/src/services/exportService.ts`**

Location: `getComponentDataFields()` function (~line 64)
```typescript
// BEFORE: Only discovers top-level component keys
Object.keys(component).forEach(key => { ... });

// AFTER: Also discovers nested dynamic_data keys
Object.keys(component).forEach(key => {
  // Existing logic...
});

// NEW: Discover dynamic_data fields
if (component.dynamic_data && typeof component.dynamic_data === 'object') {
  Object.keys(component.dynamic_data).forEach(key => {
    const fieldKey = `component_${key}`;
    if (!discoveredKeys.has(key) && (!existingFieldKeys || !existingFieldKeys.has(fieldKey))) {
      discoveredKeys.add(key);
      fields.push({
        key: fieldKey,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: typeof component.dynamic_data[key] === 'number' ? 'number' : 'string',
        group: 'components'
      });
    }
  });
}
```

Location: `generateCSV()` function (~line 119)
```typescript
// BEFORE: Extracts from top-level component keys
if (field.key.startsWith('component_')) {
  const componentKey = field.key.replace('component_', '');
  value = component[componentKey];
}

// AFTER: Also checks dynamic_data
if (field.key.startsWith('component_')) {
  const componentKey = field.key.replace('component_', '');
  value = component[componentKey] || component.dynamic_data?.[componentKey];
}
```

### Testing Strategy

**Unit Tests:** Update `frontend/src/services/__tests__/exportService.test.ts`
- Test `getComponentDataFields()` with components containing `dynamic_data`
- Test `generateCSV()` with mixed schemas (sparse matrix)
- Test edge cases (empty `dynamic_data`, missing field values)

**Manual Testing:**
1. Create components with custom schemas (F106 example)
2. Open Export dialog
3. Verify dynamic fields appear in field selector
4. Verify preview shows dynamic columns
5. Export CSV and open in Excel
6. Verify sparse data (empty cells where expected)

## Definition of Done

- [ ] Code changes implemented in `exportService.ts`
- [ ] Unit tests updated and passing
- [ ] Manual testing completed with F106 example data
- [ ] CSV export includes dynamic schema fields as separate columns
- [ ] Sparse data handling verified (empty cells for missing values)
- [ ] Preview component displays dynamic fields correctly
- [ ] Code reviewed and approved
- [ ] Changes merged to main branch

## Related Files

**Modified:**
- `frontend/src/services/exportService.ts` - Field discovery and CSV generation logic

**Test Files:**
- `frontend/src/services/__tests__/exportService.test.ts` - Unit tests

**Documentation:**
- This story document

## Notes

**Future Enhancement (Story 7.4?):** Consider implementing Path 4 (Hybrid Approach) to add schema-awareness:
- Load ComponentSchema definitions during export
- Use schema field labels, types, ordering
- Include all schema fields even without data (empty columns)
- See Tree of Thoughts analysis in story elicitation notes

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-03 | 1.0 | Initial story creation from feature request elicitation | Mary (Analyst) |
| 2025-10-03 | 1.1 | Story validation and template compliance updates | Sarah (Product Owner) |

## Dev Agent Record

### Agent Model Used

_To be populated by development agent during implementation_

### Debug Log References

_To be populated by development agent during implementation_

### Completion Notes List

_To be populated by development agent during implementation_

### File List

_To be populated by development agent during implementation_

## QA Results

_To be populated by QA Agent after implementation and testing_
