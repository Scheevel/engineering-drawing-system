# Story 7.1.1: CSV Export - Component-Centric Data Model Refactoring

## Status

**Status**: Draft
**Epic**: 7 - Data Export & Reporting
**Sprint**: TBD
**Assigned To**: TBD
**Estimated Effort**: 4-6 hours
**Priority**: HIGH (blocks Story 7.1 production readiness)
**Dependencies**: Story 7.1 (must be completed first)
**Story Type**: Refactoring / Correction

## Story

**As a** railroad bridge engineer,
**I want** to export ALL COMPONENTS from selected drawings to CSV format (not drawings with aggregated component data),
**So that** I can analyze individual component specifications, dimensions, and piece marks in Excel for inventory management, material ordering, and structural analysis.

## Context & Rationale

### Problem with Story 7.1 Implementation

Story 7.1 implemented **drawing-centric** export where each CSV row represents a drawing with component data aggregated into fields. This does not serve the application's core purpose.

**Application Purpose (Clarified):**
- PRIMARY GOAL: Index and extract component detail data from engineering drawings
- PRIMARY ENTITY: Components (piece marks, dimensions, specifications)
- SECONDARY ENTITY: Drawings (image container/source)
- USER WORKFLOW: Analyze component-level data in spreadsheets, not drawing-level data

**Current Implementation (Story 7.1) - INCORRECT:**
```csv
Drawing ID, File Name,    Component Count, Piece Mark Array, Dimensions Array
001,        bridge.jpg,   5,              [C63,G14,B22,...], [120x50,85x30,...]
002,        deck.jpg,     3,              [M15,P09,K44],     [200x75,95x40,...]
```
**Result:** Engineers cannot analyze individual components without manual data transformation

**Correct Implementation (Story 7.1.1) - COMPONENT-CENTRIC:**
```csv
Component ID, Piece Mark, Dimensions, Material, Drawing ID, Drawing File Name
c001,        C63,        120x50,      Steel,   001,        bridge.jpg
c002,        G14,        85x30,       Aluminum,001,        bridge.jpg
c003,        B22,        200x75,      Steel,   001,        bridge.jpg
c004,        M15,        95x40,       Iron,    002,        deck.jpg
c005,        P09,        180x60,      Steel,   002,        deck.jpg
```
**Result:** Each component is a separate row → direct Excel analysis, filtering, pivot tables, material calculations

### Why This is a Refactoring (Not New Feature)

- Story 7.1 delivered the WRONG data granularity for the application's core use case
- This story corrects the data model to align with user needs
- Core UI/UX patterns (field selection, preview, virtualization) remain the same
- Only the underlying data structure changes (flatten components → rows)

## Acceptance Criteria

### 1. **Component-Based Data Flattening**
- Export flattens component data: each component = 1 CSV row
- Drawing with 50 components produces 50 rows in CSV
- Drawing with 0 components produces 0 rows (excluded from export)

### 2. **Field Groups Restructured**
- **Component Data** (expanded by default): piece_mark, dimensions, material, specifications, custom fields
- **Drawing Context** (collapsed): drawing_id, drawing_file_name, drawing_project_name, drawing_status
- **Component Metadata** (collapsed): component_id, component_created_at, component_updated_at
- Dynamic field discovery still works (discovers component fields from actual data)

### 3. **Preview Shows Component Rows**
- Preview displays components as rows (not drawings)
- Preview count: "Showing all X components" (not "X drawings")
- Example: 23 filtered drawings with 127 total components → preview shows 127 rows
- Virtualization threshold: 300 components (not 300 drawings)
- Performance warning: "Large dataset detected (X components)" when > 300 components

### 4. **Export Button Label Updated**
- Button label: "Export CSV (X components, Y fields)"
- Optional extended label: "Export CSV (X components from N drawings, Y fields)"
- Button disabled when: zero components available OR zero fields selected
- Note: Zero components = zero drawings with indexed components (drawings without components are excluded)

### 5. **Filter Integration Preserved ("Export What You See")**
- When drawings filtered by Project/Status, export ALL components from matching drawings
- Example: Filter "Project A" → 5 drawings match → export all components from those 5 drawings
- Component count dynamically updates as drawing filters change

### 6. **Drawing Context Fields Available**
- Export includes drawing reference fields for traceability:
  - drawing_id (UUID)
  - drawing_file_name (e.g., "001-08-201.jpg")
  - drawing_project_name (if associated)
  - drawing_upload_date
- These appear as columns in exported CSV (user can select/deselect)

### 7. **Component URL Field (Unchanged)**
- URL field still exports HYPERLINK formula: `=HYPERLINK("url", "piece_mark")`
- URL pattern: `/drawings/:drawing_id/components/:component_id`
- This was CORRECT in Story 7.1 (component-level navigation)

### 8. **Data Quality Standards (Unchanged)**
- CSV header row uses field labels (not keys)
- Date fields formatted as readable strings (MM/DD/YYYY, HH:MM AM/PM)
- Null/undefined values exported as empty strings
- Numbers exported as numeric strings
- All fields quoted to handle commas in data

### 9. **Performance Requirements**
- Virtualization handles 500+ components without performance degradation
- Preview renders ~20-25 visible component rows in DOM at any time
- CSV generation completes within reasonable time for datasets up to 1000 components
- Memory usage remains under 100MB for 500 component exports

### 10. **Backward Compatibility (Optional)**
- If needed, provide "Export by Drawing" toggle to switch between component-centric and drawing-centric modes
- Default mode: Component-centric (new behavior)
- This acceptance criterion is OPTIONAL - discuss with PO before implementing

## Tasks / Subtasks

### Task 1: Update Export Data Transformation Logic
- [ ] Refactor `exportService.ts`:
  - [ ] Change `generateCSV()` to flatten component data (not drawings)
  - [ ] Implement component flattening: `drawings.flatMap(d => d.components.map(c => ({...c, drawing_*})))`
  - [ ] Add drawing context fields to each component row
  - [ ] Update `getComponentDataFields()` for new structure
  - [ ] Handle drawings with zero components (exclude from export)
- [ ] Update `formatValue()` function:
  - [ ] Ensure date formatting still works for component timestamps
  - [ ] Verify URL HYPERLINK formula generation (should still work)
  - [ ] Handle new drawing context field types

### Task 2: Restructure Field Configuration
- [ ] Refactor `exportFields.ts`:
  - [ ] Move component fields to primary group (expanded by default)
  - [ ] Create "Drawing Context" field group (collapsed by default)
  - [ ] Add drawing reference fields: drawing_id, drawing_file_name, drawing_project_name, drawing_upload_date
  - [ ] Verify dynamic field discovery adapts to new structure
  - [ ] Update field group icons and labels

### Task 3: Update Preview Component
- [ ] Refactor `ExportPreview.tsx`:
  - [ ] Change preview count display: "Showing all X components" (not drawings)
  - [ ] Update warning threshold logic: `components.length > 300`
  - [ ] Update warning message: "Large dataset detected (X components)"
  - [ ] Verify virtualization still works with component rows
  - [ ] Test with 500+ component dataset

### Task 4: Update Export Dialog & Main Integration
- [ ] Refactor `ExportDialog.tsx`:
  - [ ] Update button label: "Export CSV (X components, Y fields)"
  - [ ] Update disabled state logic: check component count (not drawing count)
  - [ ] Update success notification: "Exported X components successfully"
  - [ ] Verify field selection state management adapts to new data
- [ ] Update `DrawingsListPage.tsx` integration:
  - [ ] Pass component-flattened data to ExportDialog (or let dialog handle flattening)
  - [ ] Verify filter integration still works (filtered drawings → their components)
  - [ ] Test "export what you see" behavior with various filters

### Task 5: Update Field Group Selector
- [ ] Verify `FieldGroupSelector.tsx` works with restructured field groups
- [ ] Test group-level checkbox behavior with new grouping
- [ ] Verify field count chip displays correctly
- [ ] Test dynamic component field discovery

### Task 6: Update All Unit Tests
- [ ] Refactor `exportService.test.ts` (14 tests):
  - [ ] Update test data structure (components as primary, drawings as context)
  - [ ] Update `generateCSV()` tests to expect component rows
  - [ ] Update `formatValue()` tests (should mostly pass unchanged)
  - [ ] Update `getComponentDataFields()` tests for new structure
  - [ ] Add test: Drawing with 0 components → 0 rows exported
  - [ ] Add test: Drawing with 50 components → 50 rows exported
  - [ ] Add test: Component count validation (not drawing count)
- [ ] Update component tests (if any exist):
  - [ ] Update snapshot tests to reflect new preview structure
  - [ ] Update integration tests for component-centric behavior

### Task 7: Update Documentation
- [ ] Update Story 7.1:
  - [ ] Add note: "Implementation corrected by Story 7.1.1 - refactored to component-centric model"
  - [ ] Mark Story 7.1 as "Superseded by Story 7.1.1" in Dev Agent Record
- [ ] Update [docs/instruction/usability-7-data-export.md](docs/instruction/usability-7-data-export.md):
  - [ ] Change "Showing all X drawings" → "Showing all X components"
  - [ ] Update test scenarios to reflect component-centric behavior
  - [ ] Update validation commands (component count, not drawing count)
  - [ ] Add troubleshooting: "Why is my export showing more rows than drawings?"
- [ ] Update inline code comments in all modified files

### Task 8: Manual QA Validation
- [ ] Test with varied component counts:
  - [ ] 1 drawing with 1 component → 1 row
  - [ ] 1 drawing with 50 components → 50 rows
  - [ ] 10 drawings with 0 components each → 0 rows (all excluded)
  - [ ] 23 drawings with mixed component counts → sum of all components
- [ ] Test filter integration:
  - [ ] Apply Project filter → verify only components from matching drawings export
  - [ ] Apply Status filter → verify component count updates correctly
- [ ] Test preview and export:
  - [ ] Verify "Showing all X components" count is accurate
  - [ ] Verify CSV row count matches component count (+ 1 header)
  - [ ] Verify drawing context fields populate correctly in each row
- [ ] Test performance:
  - [ ] 300 components → warning appears
  - [ ] 500 components → preview remains responsive
  - [ ] Virtualization: ~20-25 component rows in DOM
- [ ] Test Excel output:
  - [ ] Open exported CSV in Excel
  - [ ] Verify component rows are separate (not aggregated)
  - [ ] Verify HYPERLINK formulas still work (click component link → navigates to component view)
  - [ ] Test pivot tables and filtering on component data

## Dev Notes

### Technical Context

**Refactoring Type:** Data model correction (entity granularity change)
**Scope:** Moderate - affects data transformation layer, field configuration, preview display
**Risk Level:** Medium - core export behavior changes, but UI/UX patterns remain similar

### Data Transformation Pattern

**Before (Story 7.1 - Drawing-centric):**
```typescript
// drawings array: [drawing1, drawing2, drawing3]
// Each drawing has nested components array
const csvData = drawings.map(drawing => ({
  id: drawing.id,
  file_name: drawing.file_name,
  component_count: drawing.components.length,
  // Component data aggregated or as arrays
}));
```

**After (Story 7.1.1 - Component-centric):**
```typescript
// Flatten components from all drawings
const csvData = drawings.flatMap(drawing =>
  drawing.components.map(component => ({
    // Component fields (primary)
    component_id: component.id,
    piece_mark: component.piece_mark,
    dimension_length: component.dimension_length,
    dimension_width: component.dimension_width,
    material_type: component.material_type,
    // ... all component fields ...

    // Drawing context fields (secondary)
    drawing_id: drawing.id,
    drawing_file_name: drawing.file_name,
    drawing_project_name: drawing.project_name,
    drawing_upload_date: drawing.upload_date,
  }))
);

// Handle empty case: drawings with zero components are automatically excluded by flatMap
```

### Field Configuration Changes

**exportFields.ts Structure Change:**

```typescript
// BEFORE: Drawing fields primary, component fields secondary
export const EXPORT_FIELD_GROUPS: FieldGroup[] = [
  {
    id: 'basic',
    label: 'Basic Drawing Info',
    expanded: true,
    fields: [/* drawing fields */]
  },
  {
    id: 'components',
    label: 'Component Data',
    expanded: false,
    fields: [/* component fields - dynamic */]
  }
];

// AFTER: Component fields primary, drawing fields secondary
export const EXPORT_FIELD_GROUPS: FieldGroup[] = [
  {
    id: 'components',
    label: 'Component Data',
    expanded: true,  // ← Now default expanded
    fields: [
      { key: 'component_id', label: 'Component ID', type: 'string' },
      { key: 'piece_mark', label: 'Piece Mark', type: 'string' },
      { key: 'dimension_length', label: 'Length', type: 'number' },
      // ... discovered dynamically from actual component data
    ]
  },
  {
    id: 'drawing_context',
    label: 'Drawing Context',
    expanded: false,  // ← Collapsed by default
    fields: [
      { key: 'drawing_id', label: 'Drawing ID', type: 'string' },
      { key: 'drawing_file_name', label: 'Drawing File Name', type: 'string' },
      { key: 'drawing_project_name', label: 'Project Name', type: 'string' },
      { key: 'drawing_upload_date', label: 'Upload Date', type: 'date' },
    ]
  },
  {
    id: 'component_metadata',
    label: 'Component Metadata',
    expanded: false,
    fields: [/* component timestamps */]
  }
];
```

### Preview Count Logic Change

**ExportPreview.tsx:**
```typescript
// BEFORE (Story 7.1)
const displayCount = drawings.length;
const countMessage = `Showing all ${displayCount} drawings`;
const showWarning = displayCount > 300;

// AFTER (Story 7.1.1)
const componentCount = drawings.reduce((sum, d) => sum + d.components.length, 0);
const displayCount = componentCount;
const countMessage = `Showing all ${displayCount} components`;
const showWarning = displayCount > 300;
```

### Zero Components Handling

**Decision:** Exclude drawings with zero components from export

**Rationale:**
- Application purpose: Index and extract component data
- A drawing without components has no data to export
- User workflow: Analyze components, not empty drawing containers
- Data integrity: CSV should only contain meaningful component records

**Implementation:** JavaScript's `flatMap()` automatically excludes empty arrays, so drawings with `components.length === 0` produce no rows

### URL HYPERLINK Formula (Unchanged)

**Good News:** The HYPERLINK implementation in Story 7.1 was CORRECT!

```typescript
// This was right in Story 7.1 and stays the same in Story 7.1.1
case 'url':
  const url = `${window.location.origin}/drawings/${drawing_id}/components/${component_id}`;
  const linkText = component.piece_mark || 'View Component';
  return `=HYPERLINK("${url}", "${linkText}")`;
```

The URL navigates to a specific component view, which aligns perfectly with component-centric export.

### Testing Strategy

**Unit Tests (High Priority):**
- All 14 existing tests in `exportService.test.ts` need updates
- Focus on data transformation logic (flatMap behavior)
- Test edge cases: 0 components, 1 component, 50 components

**Manual Testing (Critical):**
- **Test 1: Component Count Validation**
  - Filter to 5 drawings with varying component counts
  - Note total component count (e.g., 73 components)
  - Export and verify CSV has 73 rows (+ 1 header)

- **Test 2: Drawing Context Integrity**
  - Export with drawing context fields selected
  - Verify each component row includes correct parent drawing info
  - Check for data integrity: component c001 always references drawing 001

- **Test 3: Excel Analysis Workflow**
  - Export 100+ components
  - Open in Excel
  - Create pivot table: Group by piece_mark, sum dimensions
  - Filter by drawing_project_name
  - Verify component-level analysis works as expected

### Performance Considerations

**Good News:** Component-centric export should perform BETTER than drawing-centric

**Why:**
- Virtualization: Still renders ~20-25 rows (now component rows)
- CSV Generation: `flatMap()` is efficient for flattening nested arrays
- Memory: Linear with component count (same as before with drawing count)

**Threshold Adjustment:**
- Current: Warning at 300 drawings
- New: Warning at 300 components
- Rationale: 300 components ≈ 6-10 drawings with 30-50 components each (reasonable dataset size)

### Backward Compatibility Consideration (Optional)

**Question for PO:** Should we support BOTH export modes?

**Option A: Component-Centric Only (Recommended)**
- Simplest implementation
- Aligns with application purpose
- Forces users to use correct workflow

**Option B: Toggle Between Modes**
- Add "Export Mode" dropdown: "By Component" (default) vs. "By Drawing"
- More complex implementation (+2 hours effort)
- May confuse users about which mode to use
- Only implement if PO identifies specific use case for drawing-centric export

**Recommendation:** Start with Option A, add Option B only if users request it

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-02 | 1.0 | Initial story creation - Refactor Story 7.1 CSV export from drawing-centric to component-centric data model to align with application's core purpose of component data indexing | Mary (Business Analyst) |

---

## Dev Agent Record

*This section will be populated by the development agent during implementation*

---

## QA Results

*This section will be populated by the QA agent after implementation review*

---

**Story Created:** 2025-10-02
**Story Type:** Refactoring / Data Model Correction
**Parent Story:** Story 7.1 (Data Export - CSV Functionality)
**Story Ready for Development:** Pending PO approval on backward compatibility question (AC 10)
