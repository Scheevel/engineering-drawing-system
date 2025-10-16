# Story 7.4: Export Dimension Values in CSV

**Epic**: 7 - Data Export & Reporting
**Type**: Feature Enhancement (Brownfield)
**Status**: Ready
**Priority**: High
**Estimated Effort**: 8-13 Story Points (~2-3 days)
**Prerequisites**: Story 6.4 (Prevent Duplicate Dimension Types)

---

## User Story

**As a** bridge engineer exporting component data,
**I want** component dimension values displayed as columns in the CSV export preview and downloaded file,
**So that** I can import dimension data into external systems for analysis, documentation, and reporting without manual transcription.

---

## Story Context

**Problem Statement:**

Engineers need to export component dimension data alongside component information for analysis in Excel, import into other systems, or share with stakeholders. Currently, dimension data (length, width, height, etc.) is stored separately and requires manual transcription from the component detail view into spreadsheets, creating inefficiency and error potential.

**Existing System Integration:**

- **Epic**: Epic 7 - Data Export & Reporting
- **Related Stories**:
  - Story 7.1.1: CSV Export Component-Centric Refactor (component-centric data model)
  - Story 7.2: Dedicated Export Page and API (export UI and infrastructure)
  - Story 7.3: Export Dynamic Schema Fields (flexible schema field support)
  - Story 6.1: Component Dimension Management UI (dimension CRUD operations)
  - Story 6.2: Integrate Dimension/Spec Dialogs (dimension UI integration)
- **Components**: ExportDialog.tsx, ExportPreview.tsx, exportService.ts, exportFields.ts
- **Technology**: React 18 + TypeScript + Material-UI + React Query
- **Data Model**: Component-centric export (each row = 1 component + drawing context)

**User Impact:**

- **Frequency**: Moderate-high - engineers export data for reporting, analysis, sharing
- **Workflow**: Ad-hoc exports for various purposes (analysis, documentation, system integration)
- **Pain Point**: Manual dimension transcription from UI to spreadsheets, time-consuming and error-prone
- **Value**: Eliminates 15-30 minutes of manual work per export operation

---

## Acceptance Criteria

### Functional Requirements

**AC1: Dynamic Dimension Columns**
```
GIVEN components with dimension data
WHEN user opens the export dialog
THEN dimension columns are dynamically generated based on which dimension types exist across ALL components
AND only dimension types with at least one value across all components appear as columns
AND columns follow naming pattern: "Length", "Width", "Height", "Diameter", "Thickness", "Radius", "Depth", "Spacing", "Other"
```

**AC2: Dimension Value Format Options**
```
GIVEN user is configuring export fields
WHEN user selects dimension columns
THEN user can choose between two format options:
  - "Combined Format": "15.75 in ±0.01" (value + unit + tolerance)
  - "Value Only": "15.75" (decimal value only, omit unit and tolerance)
AND format option applies to ALL dimension columns uniformly
AND default format is "Combined Format"
```

**AC3: Decimal Value Display**
```
GIVEN a component has a dimension with fractional display_format
WHEN that dimension is exported
THEN the value is converted to decimal format (e.g., 3/4 → 0.75, 15 3/4 → 15.75)
AND fractional notation is never used in export (only decimal)
```

**AC4: Sparse Data Handling**
```
GIVEN Component A has "length" but no "width"
AND Component B has "width" but no "length"
WHEN export is generated
THEN both Length and Width columns appear
AND Component A row shows empty string ("") for Width
AND Component B row shows empty string ("") for Length
```

**AC5: Dimension Field Selection UI**
```
GIVEN user opens field selection in export dialog
WHEN viewing available fields
THEN dimension fields appear in new accordion group "Dimension Values"
AND all dimension columns are pre-selected by default
AND user can deselect individual dimension types
AND accordion group is expanded by default
```

**AC6: Export Preview with Dimensions**
```
GIVEN user has selected dimension fields
WHEN viewing export preview
THEN dimension columns appear alongside other component fields
AND preview shows actual dimension values from components
AND preview supports horizontal scrolling for wide tables (many columns)
AND preview updates in real-time when format option changes
```

### Technical Requirements

**AC7: Performance - Data Loading**
```
GIVEN export dialog is opened with drawings/components selected
WHEN dimension data is being loaded
THEN all component dimensions are loaded via efficient batch API call OR eager loading
AND loading indicator is shown during dimension data fetch
AND export preview renders within 2 seconds for datasets up to 100 components
```

**AC8: Performance - Large Datasets**
```
GIVEN export contains 100+ components with dimensions
WHEN preview is rendered
THEN virtualized table continues to perform smoothly
AND export CSV generation completes within 5 seconds
AND user receives warning if dataset exceeds 300 components (existing warning)
```

**AC9: No Coordinate Data**
```
GIVEN dimensions have location_x and location_y fields
WHEN dimensions are exported
THEN coordinate fields (location_x, location_y) are NOT included in export
AND only dimension_type, nominal_value, unit, and tolerance are exported
```

**AC10: Error Handling**
```
GIVEN dimension data fails to load for any reason
WHEN export dialog displays
THEN user sees warning message: "Unable to load dimension data. Dimension columns will be unavailable."
AND export continues to work without dimension columns
AND error is logged for debugging
```

### Integration Requirements

**AC11: Backward Compatibility**
```
GIVEN existing exports without dimension fields
WHEN user exports data
THEN export functionality continues to work exactly as before
AND no regression in performance or behavior
AND existing export tests pass without modification
```

**AC12: Type Safety**
```
GIVEN dynamic dimension columns
WHEN TypeScript compilation runs
THEN no type errors occur
AND ExportField interface supports dynamic keys
AND proper typing exists for format options
```

---

## Technical Notes

### Architecture Overview

**Current Data Flow**:
```
Drawing → Components (1:N) → STOP
```

**Required Data Flow**:
```
Drawing → Components (1:N) → Dimensions (1:N)
                           → Specifications (1:N) [deferred to Story 7.5]
```

**Challenge**: Current export system doesn't handle nested collections beyond 1 level. Need to flatten 2 levels of nesting (Drawing → Component → Dimension) into single CSV row.

### Data Loading Strategy

**Decision Required**: Choose between two approaches:

**Option A: Eager Loading (Recommended)**
```python
# Modify backend /api/export/preview endpoint
# Include dimensions in component response via SQLAlchemy joinedload()
drawings = db.query(Drawing)
  .options(joinedload(Drawing.components).joinedload(Component.dimensions))
  .filter(...)
  .all()
```
**Pros**: Single API call, best performance, simpler frontend
**Cons**: Larger response payload

**Option B: Batch Fetch Endpoint**
```python
# Create new endpoint: POST /api/components/batch-dimensions
# Request body: {"component_ids": ["uuid1", "uuid2", ...]}
# Returns: {component_id: [dimensions]}
```
**Pros**: Flexible, reusable endpoint
**Cons**: Additional API call, more frontend complexity

**Recommendation**: **Option A** (Eager Loading) for best user experience and performance.

### Data Structure Challenge

**Problem**: Variable column count based on actual dimension data

**Solution**: Two-pass approach
1. **Pass 1 (Column Discovery)**: Scan all components to determine which dimension types exist
2. **Pass 2 (Data Population)**: Generate CSV rows with discovered columns

**Example**:
```typescript
// Pass 1: Discover dimension types
const dimensionTypes = new Set<string>();
components.forEach(comp => {
  comp.dimensions?.forEach(dim => dimensionTypes.add(dim.dimension_type));
});

// Pass 2: Generate columns
const dimensionColumns: ExportField[] = Array.from(dimensionTypes).map(type => ({
  key: `dimension_${type}`,
  label: capitalizeFirst(type), // "length" → "Length"
  type: 'string',
  group: 'dimension_values'
}));
```

### Column Naming Convention

**Standard Dimension Types** (from `DimensionFormDialog.tsx`):
- length → "Length"
- width → "Width"
- height → "Height"
- diameter → "Diameter"
- thickness → "Thickness"
- radius → "Radius"
- depth → "Depth"
- spacing → "Spacing"
- other → "Other"

**CSV Column Keys**:
- `dimension_length`
- `dimension_width`
- `dimension_height`
- etc.

### Value Formatting Logic

**Combined Format**: `"15.75 in ±0.01"`
```typescript
function formatDimensionCombined(dimension: Dimension): string {
  const value = dimension.nominal_value.toFixed(2);
  const unit = dimension.unit;
  const tolerance = dimension.tolerance ? ` ±${dimension.tolerance}` : '';
  return `${value} ${unit}${tolerance}`;
}
```

**Value Only Format**: `"15.75"`
```typescript
function formatDimensionValueOnly(dimension: Dimension): string {
  return dimension.nominal_value.toFixed(2);
}
```

**Fractional to Decimal Conversion**: Use existing `parseFractionalInput` utility for consistency

### Files Involved

**Primary Files to Modify**:
- `frontend/src/components/export/ExportDialog.tsx` - Add format option toggle, dimension field selection
- `frontend/src/components/export/ExportPreview.tsx` - Render dimension columns
- `frontend/src/services/exportService.ts` - Dimension value formatting logic
- `frontend/src/config/exportFields.ts` - Dynamic dimension field generation
- `frontend/src/types/export.types.ts` - Add format option types
- `backend/app/api/export.py` - Eager load dimensions (Option A) OR new batch endpoint (Option B)
- `backend/app/services/export_service.py` - Include dimensions in export data

**Reference Files** (for patterns):
- `frontend/src/components/editor/ComponentDimensions.tsx` - Dimension display logic
- `frontend/src/components/dimensions/DimensionFormDialog.tsx` - Dimension types and validation
- `frontend/src/utils/fractionalParser.ts` - Decimal conversion utilities

### Implementation Approach

**Phase 1: Backend Data Loading** (2-4 hours)
1. Choose data loading strategy (recommend eager loading)
2. Modify export API to include dimension data
3. Test dimension data retrieval with Postman/curl

**Phase 2: Frontend Data Discovery** (2-3 hours)
1. Implement dimension type scanning across components
2. Generate dynamic ExportField objects for discovered types
3. Add "Dimension Values" accordion group to field selection UI

**Phase 3: Value Formatting** (2-3 hours)
1. Implement format option toggle (Combined vs Value Only)
2. Create dimension formatting functions
3. Integrate formatting into ExportPreview and CSV generation

**Phase 4: UI Integration** (2-3 hours)
1. Add dimension columns to ExportPreview virtualized table
2. Ensure horizontal scrolling works for wide tables
3. Pre-select dimension fields by default
4. Add loading indicator for dimension data fetch

**Phase 5: Testing** (3-4 hours)
1. Unit tests for formatting functions
2. Integration tests for export with dimensions
3. E2E test for full export workflow with dimensions
4. Performance testing with 100+ components
5. Edge case testing (sparse data, no dimensions, all dimensions)

### Edge Cases to Handle

1. **No Dimensions**: Component has zero dimensions → all dimension columns show empty string
2. **All Dimension Types**: Component has all 9 types → 9 columns generated
3. **Sparse Matrix**: Only 10% of components have "radius" → column appears but mostly empty
4. **Special Characters**: Dimension type "other" with custom label → CSV header escaping
5. **Missing Tolerance**: Dimension without tolerance → Combined format shows "15.75 in" (no ±)
6. **Unit Variations**: Same type, different units (15 in vs 381 mm) → separate values, user interprets
7. **Loading Failure**: Dimension API call fails → warning message, export without dimensions

### Performance Considerations

**Estimated Data Volume**:
- 100 components × 9 dimension types = 900 potential dimension records
- With 20% sparsity: ~180 actual dimension records
- CSV preview: 100 rows × 20 columns (including dimensions) = 2000 cells
- Rendering budget: <100ms for initial render, <50ms for scroll updates

**Optimization Strategies**:
- Memoize dimension type discovery (useMemo)
- Memoize formatted dimension values (useMemo)
- Existing virtualization handles large row counts
- Format option toggle triggers re-render (acceptable UX trade-off)

### Test Data Requirements

**Required Test Dataset** (create fixtures if needed):
```
Dataset for Testing:
- 5 components with NO dimensions
- 5 components with 1-2 dimensions each (common case)
- 2 components with ALL 9 dimension types (edge case)
- 1 component with fractional dimensions (3/4, 15 3/4)
- 1 component with very large values (10000.5) and very small (0.001)
- 2 components with same dimension type, different units (in vs mm)
- 1 component with dimensions lacking tolerance
```

### Acceptance Testing Workflow

**Manual Test Script**:
1. Upload drawings and add components with varied dimensions (use test dataset)
2. Navigate to Export page (/export)
3. Select drawings with dimensional components
4. Open export dialog
5. Verify "Dimension Values" accordion group exists and is expanded
6. Verify dimension columns are pre-selected
7. Verify format option toggle exists (Combined / Value Only)
8. Toggle format option → verify preview updates in real-time
9. Deselect a dimension column → verify it disappears from preview
10. Download CSV → verify dimension data appears correctly
11. Open CSV in Excel → verify values are readable and properly formatted
12. Test with 100+ components → verify performance and warning message

---

## Definition of Done

- [ ] Backend API eager-loads dimension data with components OR batch endpoint created
- [ ] Dimension type discovery logic scans all components and generates dynamic columns
- [ ] "Dimension Values" accordion group appears in field selection UI
- [ ] Format option toggle (Combined / Value Only) implemented and functional
- [ ] Export preview displays dimension columns with real data
- [ ] CSV export includes dimension data in selected format
- [ ] Horizontal scrolling works for tables with many columns
- [ ] Empty dimension values display as empty string ("")
- [ ] Fractional dimensions convert to decimal in export
- [ ] Location coordinates (location_x, location_y) excluded from export
- [ ] Loading indicator shown during dimension data fetch
- [ ] Error handling for dimension load failures with warning message
- [ ] Unit tests for dimension formatting functions
- [ ] Integration tests for export with dimensions
- [ ] E2E test covering full export workflow with dimensions
- [ ] Performance testing with 100+ components passes (<5s export, <2s preview)
- [ ] Edge case testing completed (no dimensions, all dimensions, sparse data)
- [ ] Backward compatibility verified (existing exports unchanged)
- [ ] TypeScript compilation successful with no type errors
- [ ] Code review completed
- [ ] QA sign-off with test dataset

---

## Dependencies

**Prerequisites**:
- **Story 6.4: Prevent Duplicate Dimension Types** (MUST complete first)
  - Prevents data confusion from multiple dimensions of same type per component
  - Ensures 1:1 mapping between dimension type and column
  - Without this, Story 7.4 implementation becomes ambiguous (which "length" to export?)

**Future Stories**:
- **Story 7.5: Export Specification Values in CSV** (potential follow-up)
  - Apply same pattern to specifications (material, coating, finish, etc.)
  - Reuse dimension export architecture and formatting patterns

---

## Notes

**Specifications Deferred**: This story handles dimensions only. Specifications (material, coating, etc.) will be addressed in a future story (7.5) using the same architectural pattern once the dimension approach is validated.

**Format Preference Persistence**: User's format option choice (Combined vs Value Only) is NOT persisted between sessions. This is acceptable for MVP; could be enhanced in future if user feedback indicates need for saved preferences.

**Column Order**: Dimension columns appear in alphabetical order by dimension type name (Depth, Diameter, Height, Length, Other, Radius, Spacing, Thickness, Width). This provides predictable column ordering for users.

**Excel Compatibility**: Combined format ("15.75 in ±0.01") is stored as text in CSV. Users may need to manually convert to numbers in Excel if performing calculations. Value Only format provides pure numbers for Excel formulas.

---

## QA Results

**Review Date**: 2025-10-15
**Reviewer**: Quinn (QA Agent)
**Gate Decision**: ✅ **APPROVED with CONCERNS**
**Gate File**: [docs/qa/gates/7.4-export-dimension-values.yml](../qa/gates/7.4-export-dimension-values.yml)
**Risk Score**: 6/12 (Medium)

### Summary

Story 7.4 is well-structured with clear acceptance criteria and comprehensive technical guidance. The component-centric export architecture provides a solid foundation for adding dimension columns. The story is **approved for implementation** with several medium-severity concerns around test coverage and performance validation.

### Prerequisites Status
⚠️ **Story 6.4 (Prevent Duplicate Dimension Types)** is marked as "Ready" but NOT YET IMPLEMENTED. This is a **hard prerequisite** and must be completed before Story 7.4 begins.

### Issues Identified

**🧪 TEST-002: Column Discovery Logic Test Coverage Insufficient** (Medium)
- **Issue**: Two-pass column discovery approach lacks explicit test cases for critical logic
- **Impact**: Column discovery bugs could cause missing or incorrect columns in export
- **Recommendation**: Add explicit unit tests for dimension type discovery with sparse datasets

**🧪 TEST-003: Format Toggle Real-Time Update Not Explicitly Tested** (Medium)
- **Issue**: AC6 requires real-time preview updates, but Definition of Done doesn't include specific test
- **Impact**: Format toggle could require full data reload, causing poor UX
- **Recommendation**: Add test verifying format toggle updates preview without data reload (<100ms)

**⚡ PERF-001: Large Dataset Performance Thresholds Not Validated** (Medium)
- **Issue**: Performance requirements (100-300 components) lack validation strategy and test fixtures
- **Impact**: Performance requirements cannot be validated without proper test data
- **Recommendation**: Create performance test fixtures for 100 and 300 components with automated timing tests

**🏗️ ARCH-001: Fractional to Decimal Conversion Strategy Unclear** (Low)
- **Issue**: AC3 mentions conversion, but dimensions are already stored as decimals in database
- **Impact**: Documentation ambiguity, not a functional issue
- **Recommendation**: Clarify that export uses database decimal value, ignoring UI display_format

### Strengths
- ✅ Clear architectural decision (eager loading recommended)
- ✅ Two-pass column discovery approach is sound
- ✅ Format options provide user flexibility
- ✅ Sparse data handling explicitly addressed
- ✅ Performance requirements are specific and measurable
- ✅ Backward compatibility verified
- ✅ Error handling for dimension load failures

### Approval Conditions
1. Story 6.4 must be implemented and QA'd before Story 7.4 begins
2. Dev team acknowledges TEST-002, TEST-003, PERF-001 and commits to addressing during implementation
3. Performance test fixtures will be created as part of implementation

### Next Steps
- **Story Manager**: Verify Story 6.4 completion before moving Story 7.4 to InProgress
- **Story Manager**: Add TEST-002, TEST-003, PERF-001 test cases to Definition of Done
- **Story Manager**: Clarify AC3 regarding fractional conversion (ARCH-001)
- **Dev Agent**: Create performance test fixtures before beginning implementation
- **QA Agent**: Verify column discovery logic and format toggle performance during testing

---

**Story Created**: October 2025
**Author**: Mary (Business Analyst) + Neville (Stakeholder)
**Epic**: 7 - Data Export & Reporting
