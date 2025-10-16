# Story 7.5: Export Specification Values in CSV

**Epic**: 7 - Data Export & Reporting
**Type**: Feature Enhancement (Brownfield)
**Status**: Ready
**Priority**: High
**Estimated Effort**: 5-8 Story Points (~1-2 days)
**Prerequisites**: Story 6.5 (Prevent Duplicate Specification Types), Story 7.4 (Export Dimension Values - reuse architecture)

---

## User Story

**As a** bridge engineer exporting component data,
**I want** component specification values displayed as columns in the CSV export preview and downloaded file,
**So that** I can import specification data (material, finish, grade, coating, etc.) into external systems for analysis, documentation, and reporting without manual transcription.

---

## Story Context

**Problem Statement:**

Engineers need to export component specification data alongside component and dimension information for analysis in Excel, import into other systems, or share with stakeholders. Currently, specification data (material, finish, grade, coating, treatment, standard) is stored separately and requires manual transcription from the component detail view into spreadsheets, creating inefficiency and error potential.

**Existing System Integration:**

- **Epic**: Epic 7 - Data Export & Reporting
- **Related Stories**:
  - Story 7.4: Export Dimension Values (identical architectural pattern to reuse)
  - Story 7.1.1: CSV Export Component-Centric Refactor (component-centric data model)
  - Story 7.2: Dedicated Export Page and API (export UI and infrastructure)
  - Story 7.3: Export Dynamic Schema Fields (flexible schema field support)
  - Story 6.1: Component Specification Management UI (specification CRUD operations)
  - Story 6.2: Integrate Dimension/Spec Dialogs (specification UI integration)
- **Components**: ExportDialog.tsx, ExportPreview.tsx, exportService.ts, exportFields.ts
- **Technology**: React 18 + TypeScript + Material-UI + React Query
- **Data Model**: Component-centric export (each row = 1 component + drawing context + dimensions + specifications)

**User Impact:**

- **Frequency**: Moderate-high - engineers export data for reporting, analysis, sharing
- **Workflow**: Ad-hoc exports for various purposes (analysis, documentation, system integration)
- **Pain Point**: Manual specification transcription from UI to spreadsheets, time-consuming and error-prone
- **Value**: Completes the export feature with full component data (basic info + dimensions + specifications)

---

## Acceptance Criteria

### Functional Requirements

**AC1: Dynamic Specification Columns**
```
GIVEN components with specification data
WHEN user opens the export dialog
THEN specification columns are dynamically generated based on which specification types exist across ALL components
AND only specification types with at least one value across all components appear as columns
AND columns follow naming pattern: "Material", "Finish", "Grade", "Coating", "Treatment", "Standard", "Other"
```

**AC2: Text Value Display**
```
GIVEN a component has a specification (e.g., material="A36 Steel")
WHEN that specification is exported
THEN the text value is exported as-is ("A36 Steel")
AND no formatting or conversion is applied (specifications are text, not numeric)
AND values may contain spaces, hyphens, alphanumeric characters
```

**AC3: Sparse Data Handling**
```
GIVEN Component A has "material" but no "finish"
AND Component B has "finish" but no "material"
WHEN export is generated
THEN both Material and Finish columns appear
AND Component A row shows empty string ("") for Finish
AND Component B row shows empty string ("") for Material
```

**AC4: Specification Field Selection UI**
```
GIVEN user opens field selection in export dialog
WHEN viewing available fields
THEN specification fields appear in new accordion group "Specification Values"
AND all specification columns are pre-selected by default
AND user can deselect individual specification types
AND accordion group is expanded by default
```

**AC5: Export Preview with Specifications**
```
GIVEN user has selected specification fields
WHEN viewing export preview
THEN specification columns appear alongside component and dimension fields
AND preview shows actual specification values from components
AND preview supports horizontal scrolling for wide tables (many columns)
AND specification columns appear AFTER dimension columns (logical grouping)
```

**AC6: Description Field Excluded**
```
GIVEN specifications have a "description" field (optional detailed text)
WHEN specifications are exported
THEN only the "value" field is exported (not "description")
AND description field provides context in UI but not in export
```

### Technical Requirements

**AC7: Performance - Data Loading**
```
GIVEN export dialog is opened with drawings/components selected
WHEN specification data is being loaded
THEN all component specifications are loaded alongside dimensions via eager loading
AND loading indicator is shown during specification data fetch
AND export preview renders within 2 seconds for datasets up to 100 components
```

**AC8: Performance - Large Datasets**
```
GIVEN export contains 100+ components with specifications
WHEN preview is rendered
THEN virtualized table continues to perform smoothly
AND export CSV generation completes within 5 seconds
AND user receives warning if dataset exceeds 300 components (existing warning)
```

**AC9: No Confidence Score Data**
```
GIVEN specifications have a confidence_score field (OCR quality metric)
WHEN specifications are exported
THEN confidence_score is NOT included in export
AND only specification_type and value are exported
```

**AC10: Error Handling**
```
GIVEN specification data fails to load for any reason
WHEN export dialog displays
THEN user sees warning message: "Unable to load specification data. Specification columns will be unavailable."
AND export continues to work without specification columns
AND error is logged for debugging
```

### Integration Requirements

**AC11: Backward Compatibility**
```
GIVEN existing exports without specification fields
WHEN user exports data
THEN export functionality continues to work exactly as before
AND no regression in performance or behavior
AND existing export tests pass without modification
```

**AC12: Reuse Dimension Architecture**
```
GIVEN Story 7.4 implemented dimension export architecture
WHEN implementing specification export
THEN same architectural patterns are reused:
  - Dynamic column discovery (scan all components for spec types)
  - Field group creation (new accordion group)
  - Eager loading strategy
  - Sparse data handling
AND specifications integrate seamlessly with existing dimension columns
```

---

## Technical Notes

### Architecture Overview

**Current Data Flow** (after Story 7.4):
```
Drawing → Components (1:N) → Dimensions (1:N) → DONE
```

**Required Data Flow**:
```
Drawing → Components (1:N) → Dimensions (1:N)
                           → Specifications (1:N)
```

**Challenge**: Extend existing dimension export architecture to also handle specifications. Both are child collections that need to be pivoted into CSV columns.

### Implementation Approach (Reuse Story 7.4 Pattern)

**Key Insight**: This story is a DIRECT EXTENSION of Story 7.4. The architecture is identical:

1. **Data Loading**: Specifications eagerly loaded alongside dimensions
2. **Column Discovery**: Scan components for specification types (same 2-pass approach)
3. **Field Generation**: Create ExportField objects for discovered types
4. **Value Formatting**: Much simpler than dimensions - just return text value as-is
5. **UI Integration**: Add to field selection UI and preview (same patterns)

**Differences from Dimensions**:
- **No Format Options**: Specifications are text, no "Combined" vs "Value Only" toggle
- **Simpler Formatting**: Just return `specification.value` directly (no conversion)
- **7 Types**: material, finish, grade, coating, treatment, standard, other (vs 9 dimension types)

### Data Loading Strategy

**Extend Story 7.4 Eager Loading**:

```python
# backend/app/api/export.py (modify existing endpoint)
# Already loads dimensions via joinedload() from Story 7.4
# Add specifications to the same query

drawings = db.query(Drawing)
  .options(
    joinedload(Drawing.components)
      .joinedload(Component.dimensions),    # Story 7.4
    joinedload(Drawing.components)
      .joinedload(Component.specifications) # Story 7.5 (ADD THIS)
  )
  .filter(...)
  .all()
```

**Benefit**: Single API call loads all component data (basic + dimensions + specifications)

### Column Discovery Pattern

**Same 2-Pass Approach as Story 7.4**:

```typescript
// frontend/src/config/exportFields.ts

// Pass 1: Discover specification types
const specificationTypes = new Set<string>();
components.forEach(comp => {
  comp.specifications?.forEach(spec => specificationTypes.add(spec.specification_type));
});

// Pass 2: Generate columns
const specificationColumns: ExportField[] = Array.from(specificationTypes)
  .sort() // Alphabetical order
  .map(type => ({
    key: `specification_${type}`,
    label: capitalizeFirst(type), // "material" → "Material"
    type: 'string',
    group: 'specification_values'
  }));
```

### Column Naming Convention

**Standard Specification Types** (from SpecificationFormDialog.tsx):
- material → "Material"
- finish → "Finish"
- grade → "Grade"
- coating → "Coating"
- treatment → "Treatment"
- standard → "Standard"
- other → "Other"

**CSV Column Keys**:
- `specification_material`
- `specification_finish`
- `specification_grade`
- etc.

### Value Formatting Logic

**Much Simpler Than Dimensions**:

```typescript
function formatSpecificationValue(specification: Specification): string {
  // Specifications are already text - no conversion needed
  return specification.value;
}

// Example values:
// "A36 Steel"
// "Hot-Dip Galvanized"
// "ASTM A572 Grade 50"
// "Powder Coated Black"
```

**No format options needed** - specifications are already human-readable text.

### Files Involved

**Frontend Files to Modify** (reuse Story 7.4 patterns):
- `frontend/src/components/export/ExportDialog.tsx` - Add specification field selection (no format toggle needed)
- `frontend/src/components/export/ExportPreview.tsx` - Render specification columns alongside dimensions
- `frontend/src/services/exportService.ts` - Specification value formatting (trivial - just return value)
- `frontend/src/config/exportFields.ts` - Dynamic specification field generation (reuse dimension logic)
- `frontend/src/types/export.types.ts` - No changes needed (reuse ExportField interface)

**Backend Files to Modify**:
- `backend/app/api/export.py` - Add `.joinedload(Component.specifications)` to existing query
- `backend/app/services/export_service.py` - Include specifications in export data (extend existing dimension logic)

**Reference Files**:
- **Story 7.4 implementation files** - Reuse all architectural patterns
- `frontend/src/components/editor/ComponentSpecifications.tsx` - Specification display logic
- `frontend/src/components/specifications/SpecificationFormDialog.tsx` - Specification types and validation

### Implementation Phases

**Phase 1: Backend Data Loading** (1 hour)
1. Add specification eager loading to existing dimension query (Story 7.4)
2. Test specification data retrieval
3. Verify dimensions AND specifications load together

**Phase 2: Frontend Column Discovery** (1 hour)
1. Extend dimension discovery logic to also discover specification types
2. Generate dynamic ExportField objects for specifications
3. Add "Specification Values" accordion group to field selection UI

**Phase 3: Value Formatting** (30 minutes)
1. Create trivial formatting function (just return `spec.value`)
2. Integrate into ExportPreview and CSV generation (reuse dimension patterns)

**Phase 4: UI Integration** (1 hour)
1. Add specification columns to ExportPreview (alongside dimensions)
2. Ensure column ordering: component fields → dimensions → specifications
3. Pre-select specification fields by default
4. Test horizontal scrolling with many columns

**Phase 5: Testing** (2-3 hours)
1. Unit tests for specification formatting (trivial)
2. Integration tests for export with specifications
3. E2E test for full export workflow (dimensions + specifications)
4. Edge case testing (sparse data, no specs, all specs)

**Total Estimated Effort**: 5-8 hours (~1 day)

### Edge Cases to Handle

Same patterns as Story 7.4:
1. **No Specifications**: Component has zero specifications → all spec columns show empty string
2. **All Specification Types**: Component has all 7 types → 7 columns generated
3. **Sparse Matrix**: Only 10% of components have "coating" → column appears but mostly empty
4. **Special Characters**: Specification value contains commas or quotes → CSV escaping
5. **Long Values**: Specification value is 255 characters → displays in Excel, may truncate in UI preview
6. **Loading Failure**: Specification API fails → warning message, export without specifications

### Performance Considerations

**Estimated Data Volume** (combined with Story 7.4):
- 100 components × (9 dimensions + 7 specifications) = 1600 potential records
- With 20% sparsity: ~320 actual dimension + spec records
- CSV preview: 100 rows × 25-30 columns (component + drawing + dimensions + specs) = 2500-3000 cells
- Rendering budget: <100ms for initial render, <50ms for scroll updates

**Optimization Strategies**:
- Reuse memoization from Story 7.4 (same patterns apply)
- Single eager load for both dimensions AND specifications
- Existing virtualization handles large column counts

### Test Data Requirements

**Required Test Dataset** (reuse dimension test data, add specifications):
```
Dataset for Testing:
- 5 components with NO specifications (sparse data test)
- 5 components with 1-2 specifications each (common case)
- 2 components with ALL 7 specification types (edge case)
- 1 component with long specification values (255 chars)
- 1 component with special characters in values (commas, quotes)
- 2 components with dimensions AND specifications (integration test)
- 1 component with specifications but no dimensions
```

### Acceptance Testing Workflow

**Manual Test Script** (extends Story 7.4 test script):
1. Upload drawings and add components with varied dimensions AND specifications
2. Navigate to Export page (/export)
3. Select drawings with dimensional and specification data
4. Open export dialog
5. Verify "Specification Values" accordion group exists and is expanded
6. Verify specification columns are pre-selected
7. Verify NO format option toggle (specifications don't need formatting)
8. Deselect a specification column → verify it disappears from preview
9. Verify column ordering: component fields → dimensions → specifications
10. Download CSV → verify specification data appears correctly
11. Open CSV in Excel → verify specification values are readable
12. Test with 100+ components → verify performance and warning message

---

## Definition of Done

- [ ] Backend API eager-loads specification data alongside dimensions
- [ ] Specification type discovery logic scans all components and generates dynamic columns
- [ ] "Specification Values" accordion group appears in field selection UI
- [ ] Export preview displays specification columns alongside dimension columns
- [ ] CSV export includes specification data
- [ ] Horizontal scrolling works for tables with many columns (component + dimensions + specs)
- [ ] Empty specification values display as empty string ("")
- [ ] Specification description field excluded from export (only value exported)
- [ ] Confidence score excluded from export
- [ ] Column ordering: component fields → dimensions → specifications
- [ ] Loading indicator shown during specification data fetch
- [ ] Error handling for specification load failures with warning message
- [ ] Unit tests for specification formatting functions (trivial tests)
- [ ] Integration tests for export with specifications
- [ ] E2E test covering full export workflow (component + dimensions + specifications)
- [ ] Performance testing with 100+ components passes (<5s export, <2s preview)
- [ ] Edge case testing completed (no specs, all specs, sparse data, special characters)
- [ ] Backward compatibility verified (existing exports unchanged)
- [ ] Story 7.4 patterns successfully reused (architecture validation)
- [ ] Code review completed
- [ ] QA sign-off with test dataset

---

## Dependencies

**Prerequisites**:
- **Story 6.5: Prevent Duplicate Specification Types** (MUST complete first)
  - Prevents data confusion from multiple specifications of same type per component
  - Ensures 1:1 mapping between specification type and column
  - Without this, Story 7.5 implementation becomes ambiguous (which "material" to export?)

- **Story 7.4: Export Dimension Values** (MUST complete first)
  - Establishes architectural patterns for child collection export
  - Provides eager loading infrastructure to extend
  - Demonstrates dynamic column generation, field selection UI, sparse data handling
  - Story 7.5 reuses 90% of Story 7.4 architecture

**Future Enhancements**: None identified - this completes the export feature set (component + dimensions + specifications)

---

## Notes

**Architectural Reuse**: This story is significantly simpler than Story 7.4 because it reuses all the hard architectural work:
- Data loading infrastructure: Just add one more `.joinedload()`
- Column discovery: Copy-paste-adapt from dimension logic
- Field selection UI: Add new accordion group (same pattern)
- Value formatting: Trivial (no conversion needed for text)
- Preview rendering: Extend existing dimension column logic

**No Format Options**: Unlike dimensions, specifications don't need format options (Combined vs Value Only) because specification values are already text. This simplifies the UI and implementation.

**Column Ordering**: Specification columns appear AFTER dimension columns to maintain logical grouping:
1. Component basic info (piece_mark, type, etc.)
2. Drawing context (file_name, project, etc.)
3. Dimension values (Length, Width, Height, etc.)
4. Specification values (Material, Finish, Grade, etc.)

**Description Field Excluded**: The `description` field in specifications provides additional context in the UI but is NOT exported. Only the `value` field is exported to keep columns focused and avoid data duplication.

**Excel Compatibility**: Specification text values are directly usable in Excel - no conversion or post-processing needed. Values like "A36 Steel" or "ASTM A572 Grade 50" display perfectly in spreadsheet cells.

---

**Story Created**: October 2025
**Author**: Mary (Business Analyst) + Neville (Stakeholder)
**Epic**: 7 - Data Export & Reporting
