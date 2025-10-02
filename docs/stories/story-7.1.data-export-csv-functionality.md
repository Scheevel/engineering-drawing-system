# Story 7.1: Data Export - CSV Functionality

## Status

**Status**: Ready
**Epic**: 7 - Data Export & Reporting
**Sprint**: TBD
**Assigned To**: TBD
**Estimated Effort**: 6-8 hours
**Priority**: Medium (enhances user workflow efficiency)
**Validated By**: Sarah (Product Owner)
**Validation Date**: 2025-10-02

## Story

**As a** railroad bridge engineer,
**I want** to export drawing and component data to CSV format with customizable field selection and preview,
**so that** I can analyze data in Excel/spreadsheets, share reports with stakeholders, and integrate with existing analysis workflows.

## Acceptance Criteria

1. **Export Button Access**: User can access "Export" button from DrawingsListPage toolbar (disabled when no drawings displayed)

2. **Export Dialog Opens**: Clicking "Export" button opens modal dialog titled "Export Drawings to CSV"

3. **Field Selection - Accordion Groups**: Dialog displays field groups in accordion format with flexible schema-based organization:
   - Basic Drawing Info (expanded by default): id, file_name, status, file_size, upload_date
   - Project Association (collapsed): project_id, project_name
   - Component Data (collapsed): component_count, plus dynamic fields from flexible schema
   - Metadata & Processing (collapsed): created_at, updated_at, processing_status

4. **Field Selection - Interactive Controls**:
   - Group-level checkboxes select/deselect all fields in group
   - Group checkboxes show indeterminate state when partial selection
   - Individual field checkboxes within each group
   - Field count chip displays "X fields selected"

5. **Full Preview with Virtualization**:
   - Preview section shows virtualized table with all filtered drawings
   - Only selected fields appear as columns
   - Preview updates in real-time as fields are toggled
   - Handles hundreds of drawings without performance degradation
   - Shows count: "Showing all X drawings"

6. **Filter Integration**: Export respects current page filters (Project, Status) - "export what you see" pattern

7. **URL Field for Component Navigation**:
   - Export includes URL field that links directly to piece-marking tag display within application
   - URL format enables direct navigation to specific component view
   - URLs remain valid after export (persistent links)
   - URLs exported as Excel HYPERLINK formula for clickable links

8. **CSV Generation & Download**:
   - "Export CSV" button shows: "Export CSV (X drawings, Y fields)"
   - Button disabled if no fields selected or no drawings available
   - Clicking button generates CSV file client-side using papaparse
   - File downloads with timestamp filename: `drawings-export-YYYY-MM-DD.csv`

9. **CSV Data Quality**:
   - CSV includes header row with field labels (not keys)
   - Date fields formatted as readable strings (not ISO timestamps)
   - Null/undefined values exported as empty strings
   - Numbers exported as numeric strings
   - URLs exported as `=HYPERLINK("url", "display text")` formula for clickable links in Excel/Sheets
   - All fields quoted to handle commas in data

10. **Performance & Error Handling**:
    - Shows warning alert if dataset exceeds hundreds of rows
    - Validates field selection and data availability
    - Provides clear error messages on failure (implementation-specific)
    - Export completes within reasonable time for typical datasets

11. **User Feedback**:
    - Success notification after download
    - Error notification if export fails
    - Dialog closes automatically after successful export

## Tasks / Subtasks

### Task 1: Project Setup & Core Infrastructure (AC: 7, 8, 9)
- [ ] Install dependencies: `papaparse` (CSV generation), `react-window` (virtualization)
- [ ] Create TypeScript type definitions: `frontend/src/types/export.types.ts`
  - ExportField, FieldGroup, ExportConfig interfaces
- [ ] Create field configuration: `frontend/src/config/exportFields.config.ts`
  - Define EXPORT_FIELD_GROUPS with accordion structure
  - Include Component Data fields dynamically based on actual component data
  - Add URL field definition with type 'url'
- [ ] Create export service: `frontend/src/services/exportService.ts`
  - generateCSV() function
  - downloadCSV() function
  - formatValue() helper with URL HYPERLINK formula handling
  - safeExportDrawingsToCSV() wrapper with error handling
  - getComponentDataFields() for dynamic field discovery from actual data

### Task 2: Field Selection UI - Accordion Groups (AC: 3, 4)
- [ ] Create `FieldGroupSelector` component: `frontend/src/components/export/FieldGroupSelector.tsx`
  - Implement Material-UI Accordion with expand/collapse
  - Add group-level checkboxes with indeterminate state logic
  - Implement individual field checkboxes
  - Add field count chip ("X fields selected")
  - Handle field toggle events
- [ ] Add Material-UI icons to field groups (DrawingIcon, ProjectIcon, ComponentIcon, MetadataIcon)
- [ ] Test field selection state management (all, partial, none selected)
- [ ] Implement dynamic field discovery from actual component data

### Task 3: Preview Component with Virtualization (AC: 5)
- [ ] Create `ExportPreview` component: `frontend/src/components/export/ExportPreview.tsx`
  - Implement react-window FixedSizeList for virtualized rendering
  - Create sticky header row with selected field labels
  - Implement virtualized Row component
  - Add preview count display: "Showing all X drawings"
  - Handle real-time updates when field selection changes
- [ ] Test virtualization performance with 500+ drawing dataset
- [ ] Add warning alert for large datasets (hundreds of rows threshold ~300)

### Task 4: URL Field Generation for Component Navigation (AC: 7)
- [ ] Add URL generation logic to exportService.ts
  - Generate application URLs: `/drawings/{drawing_id}/components/{component_id}`
  - Format as Excel HYPERLINK formula: `=HYPERLINK("url", "display text")`
  - Ensure URLs are absolute paths (include base URL: `window.location.origin`)
- [ ] Update EXPORT_FIELD_GROUPS config to include URL field in components group
- [ ] Test URL field exports as clickable hyperlinks in Excel/Google Sheets
- [ ] Verify URLs remain valid after export (persistent routing)
- [ ] Verify routing pattern during testing (assumed correct, needs validation)

### Task 5: Main Export Dialog Integration (AC: 1, 2, 6, 8, 10, 11)
- [ ] Create `ExportDialog` component: `frontend/src/components/export/ExportDialog.tsx`
  - Implement Dialog with title "Export Drawings to CSV"
  - Integrate FieldGroupSelector component
  - Integrate ExportPreview component
  - Add "Export CSV" button with dynamic label showing drawing/field counts
  - Implement dialog close handlers
  - Add snackbar notifications (success/error using notistack)
- [ ] Integrate with DrawingsListPage: `frontend/src/pages/DrawingsListPage.tsx`
  - Add "Export" button to toolbar (with FileDownload icon)
  - Add exportDialogOpen state management
  - Pass filtered drawings to ExportDialog (respects current page filters)
  - Disable button when drawings.length === 0
- [ ] Test filter integration: "export what you see" behavior

### Task 6: CSV Generation & Download Logic (AC: 8, 9)
- [ ] Implement CSV generation in exportService.ts:
  - Map drawings to selected fields only
  - Format date fields (ISO → readable format: MM/DD/YYYY, HH:MM AM/PM)
  - Format URL fields as `=HYPERLINK("url", "text")` formula
  - Handle null/undefined values (empty strings)
  - Use papaparse with header=true, quotes=true
- [ ] Implement download trigger:
  - Create Blob with CSV content (type: 'text/csv;charset=utf-8;')
  - Generate filename with timestamp: `drawings-export-YYYY-MM-DD.csv`
  - Trigger browser download via link.click()
  - Clean up ObjectURL after download
- [ ] Test CSV data quality:
  - Verify header row uses field labels (not keys)
  - Verify date formatting in exported file
  - Verify URL fields are clickable when opened in Excel (HYPERLINK formula)
  - Verify quoted fields handle commas correctly

### Task 7: Error Handling & Performance Optimization (AC: 10)
- [ ] Add validation checks:
  - Zero fields selected → show warning
  - Zero drawings available → show warning
  - Dataset size check → show performance warning if > 300 drawings
- [ ] Add error boundary for export failures
- [ ] Implement try-catch in safeExportDrawingsToCSV with user-friendly error messages
- [ ] Add loading state during CSV generation (for large datasets)
- [ ] Test error scenarios: empty data, network failures, browser download blocked

### Task 8: Testing & Quality Assurance (AC: All)
- [ ] Write unit tests for exportService.ts:
  - Test generateCSV with various field types (string, number, date, url)
  - Test formatValue for dates, URLs (HYPERLINK formula), nulls
  - Test getComponentDataFields dynamic field discovery
  - Test safeExportDrawingsToCSV error handling
- [ ] Write component tests:
  - FieldGroupSelector: checkbox states, field toggling, dynamic fields
  - ExportPreview: virtualization, real-time updates
  - ExportDialog: full workflow integration
- [ ] Write E2E test (Playwright):
  - Navigate to /drawings
  - Click Export button
  - Select fields via accordion groups
  - Verify preview updates
  - Download CSV
  - Verify file content (header row, data rows, URL HYPERLINK formula)
- [ ] Manual testing checklist:
  - Test with 0, 1, 10, 100, 300, 500+ drawings
  - Test all field group combinations
  - Test dynamic component data fields with different schemas
  - Test filter integration (Project, Status filters)
  - Test URL field clickability in Excel AND Google Sheets
  - Test on different browsers (Chrome, Firefox, Safari)

## Dev Notes

### Technical Context

**Feature Type:** New feature - Data export functionality (CSV format)
**Scope:** Frontend-only implementation (client-side CSV generation)
**Complexity:** Medium - Requires new UI components, state management, and library integration

### Relevant Source Tree Information

**New Files to Create:**
```
frontend/src/
├── components/export/
│   ├── ExportDialog.tsx           (Main dialog component - 150 lines)
│   ├── FieldGroupSelector.tsx     (Accordion UI - 120 lines)
│   └── ExportPreview.tsx          (Virtualized table - 100 lines)
├── config/
│   └── exportFields.config.ts     (Field definitions - 80 lines)
├── services/
│   └── exportService.ts           (Core CSV logic - 150 lines)
└── types/
    └── export.types.ts            (TypeScript interfaces - 30 lines)
```

**Files to Modify:**
```
frontend/src/pages/DrawingsListPage.tsx  (+15 lines: Export button + dialog integration)
frontend/package.json                     (+2 dependencies: papaparse, react-window)
```

### Key Architectural Patterns

**1. Drawing Data Flow (Existing Pattern - Follow This)**
```
DrawingsListPage
  └── useQuery<DrawingListResponse>('drawings', ...)
      └── Returns: { items: Drawing[], total: number }
      └── Already filtered by page filters (Project, Status)
```

**Export Integration Point:**
- ExportDialog receives `drawings` prop from DrawingsListPage's `drawingsData?.items`
- This ensures "export what you see" behavior (AC6)

**2. Component Structure Pattern**
- Follow existing Material-UI patterns from DrawingsListPage
- Use same Dialog/Button/Accordion components
- Maintain consistent spacing with `sx={{ mb: 2 }}` pattern

**3. State Management**
- Local useState for field selection (no global state needed)
- Dialog open/close managed by parent (DrawingsListPage)

### Dependencies to Install

```bash
npm install papaparse react-window
npm install --save-dev @types/papaparse @types/react-window
```

**Library Choices (Approved in Analysis):**
- **papaparse**: Industry standard for CSV generation (50KB gzipped)
- **react-window**: Virtualization for preview table (40KB gzipped)

### URL Field Implementation Details

**Requirement:** Export must include URL field linking to component piece-marking tag display

**Implementation Approach - Excel HYPERLINK Formula:**
```typescript
// In exportFields.config.ts
{
  key: 'component_view_link',
  label: 'View Component',
  type: 'url',
  group: 'components'
}

// In exportService.ts - formatValue()
case 'url':
  // Generate Excel HYPERLINK formula for clickable links
  const baseUrl = window.location.origin;
  const url = `${baseUrl}/drawings/${drawing.id}/components/${drawing.component_id}`;
  const linkText = drawing.file_name || 'View Component';

  // Excel formula: =HYPERLINK("url", "display text")
  return `=HYPERLINK("${url}", "${linkText}")`;
```

**CSV Output Example:**
```csv
"File Name","View Component","Status"
"001-08-201.jpg","=HYPERLINK(""http://localhost:3000/drawings/abc123/components/def456"", ""View Component"")","Completed"
```

**Result in Excel/Sheets:**
- User sees: "View Component" as blue underlined clickable link
- Clicking navigates to: `http://localhost:3000/drawings/abc123/components/def456`

**Important:**
- Verify routing pattern `/drawings/:id/components/:componentId` exists during testing
- Assumption: This routing pattern is correct, but needs validation
- If route differs, adjust URL generation logic accordingly

### Flexible Schema Integration - Data-Driven Approach

**Context:** Component Data fields vary based on flexible schema definitions

**CRITICAL CHANGE:** Export fields based on **actual component data** (not schema definitions)

**Implementation Strategy:**
```typescript
// exportService.ts - Dynamic field discovery from actual data
const getComponentDataFields = (drawing: Drawing): ExportField[] => {
  const fields: ExportField[] = [];

  // If drawing has components with data
  if (drawing.components && drawing.components.length > 0) {
    const firstComponent = drawing.components[0];

    // Dynamically discover fields from actual component data
    Object.keys(firstComponent).forEach(key => {
      // Exclude internal/system keys
      if (key !== 'id' && key !== 'drawing_id' && key !== 'created_at') {
        fields.push({
          key: `component_${key}`,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // "piece_mark" → "Piece Mark"
          type: typeof firstComponent[key] === 'number' ? 'number' : 'string',
          group: 'components'
        });
      }
    });
  }

  return fields;
};

// Usage in FieldGroupSelector
const allFields = [
  ...EXPORT_FIELD_GROUPS.flatMap(g => g.fields), // Static fields
  ...getComponentDataFields(drawings[0])          // Dynamic component fields from actual data
];
```

**Advantages:**
- ✅ No schema API calls needed - simpler implementation
- ✅ Reflects actual exportable data (what exists, not what could exist)
- ✅ Automatically adapts as component data structures evolve
- ✅ Handles mixed schemas gracefully (shows union of all fields)

**Example Scenario:**
- Drawing 1 has components with: `{piece_mark, dimension_length}`
- Drawing 2 has components with: `{piece_mark, material_type, custom_field}`
- Export UI shows: `piece_mark`, `dimension_length`, `material_type`, `custom_field`
- CSV exports available data for each drawing (nulls where data missing)

### Performance Considerations

**Dataset Size:** System typically handles hundreds of drawings per page

**Virtualization Required:**
- Use react-window's `FixedSizeList` for preview table
- Only renders visible rows (~20 in DOM at any time)
- Handles 500+ rows without performance issues

**Memory Budget:**
- CSV generation for 500 drawings × 15 fields = ~750KB (safe)
- Browser download triggered immediately (no memory accumulation)

**Warning Threshold:**
- Show performance warning if `drawings.length > 300` (conservative)
- Message: "Large dataset detected. Export may take a few seconds."

### CSV Format Requirements

**Date Formatting:**
```typescript
// Convert ISO timestamps to Excel-compatible format
new Date(value).toLocaleString('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});
// Output: "01/15/2025, 10:30 AM"
```

**URL Handling - HYPERLINK Formula:**
```typescript
// Excel/Sheets HYPERLINK formula pattern
const url = `${window.location.origin}/drawings/${id}/components/${componentId}`;
const text = 'View Component';
return `=HYPERLINK("${url}", "${text}")`;

// CSV must double-quote the quotes inside formula:
// =HYPERLINK(""url"", ""text"")
```

**Null Handling:**
```typescript
// Export null/undefined as empty string (not "null" or "undefined")
value === null || value === undefined ? '' : String(value)
```

### Error Handling Patterns

**Validation Errors (Show in UI):**
- Zero fields selected → Disable export button + tooltip: "Select at least one field"
- Zero drawings available → Disable export button + tooltip: "No drawings to export"

**Export Errors (Show Snackbar):**
- CSV generation failure → "Export failed. Please try again."
- Browser download blocked → "Download blocked. Please check browser settings."
- Memory exceeded → "Dataset too large. Please apply filters to reduce size."

**Use Material-UI Snackbar (notistack):**
```typescript
import { useSnackbar } from 'notistack';
const { enqueueSnackbar } = useSnackbar();

// Success
enqueueSnackbar(`Exported ${drawings.length} drawings successfully`, {
  variant: 'success'
});

// Error
enqueueSnackbar('Export failed. Please try again.', {
  variant: 'error'
});
```

### Existing Patterns to Follow

**1. Filter Integration (from DrawingsListPage.tsx:70-80)**
```typescript
// Current page filters are already applied to drawings data
const { data: drawingsData } = useQuery<DrawingListResponse>(
  ['drawings', filters.projectId, filters.status],
  () => listDrawings({
    project_id: filters.projectId,
    status: filters.status
  })
);
```

**Export Dialog receives filtered data:** Pass `drawingsData?.items || []` to ExportDialog

**2. Button Pattern (from DrawingsListPage toolbar)**
```typescript
<Button
  variant="outlined"
  startIcon={<FileDownload />}
  onClick={() => setExportDialogOpen(true)}
  disabled={drawings.length === 0}
>
  Export
</Button>
```

**3. Dialog Pattern (reference DrawingReassignDialog.tsx if exists)**
- Use Material-UI Dialog with maxWidth="lg" fullWidth
- PaperProps: `sx={{ height: '90vh' }}` for tall dialog (preview needs space)
- DialogTitle, DialogContent (dividers), DialogActions structure
- Close button in top-right with IconButton

### Testing Requirements

**Test File Locations:**
```
frontend/src/
├── services/__tests__/
│   └── exportService.test.ts
├── components/export/__tests__/
│   ├── ExportDialog.test.tsx
│   ├── FieldGroupSelector.test.tsx
│   └── ExportPreview.test.tsx
└── e2e/
    └── export.spec.ts
```

**Testing Frameworks:**
- **Unit/Component Tests:** Jest + React Testing Library (existing setup)
- **E2E Tests:** Playwright (existing setup)

**Test Coverage Requirements:**

**1. Unit Tests (exportService.ts)**
```typescript
describe('exportService', () => {
  test('formatValue handles URL type with HYPERLINK formula', () => {
    const drawing = { id: 'abc123', file_name: 'test.jpg', component_id: 'def456' };
    const result = formatValue(drawing, 'url');
    expect(result).toMatch(/^=HYPERLINK\(/);
    expect(result).toContain('test.jpg');
  });

  test('generateCSV includes actual component data fields', () => {
    const drawings = [{
      id: '1',
      file_name: 'test.jpg',
      components: [{
        piece_mark: 'C63',
        dimension_length: 120.5,
        custom_field: 'value'
      }]
    }];
    const csv = generateCSV(drawings, selectedFields);
    expect(csv).toContain('piece_mark');
    expect(csv).toContain('dimension_length');
    expect(csv).toContain('custom_field');
  });

  test('getComponentDataFields discovers fields from actual data', () => {
    const drawing = {
      components: [{ field1: 'val1', field2: 123, id: 'ignore' }]
    };
    const fields = getComponentDataFields(drawing);
    expect(fields).toHaveLength(2); // id excluded
    expect(fields[0].key).toBe('component_field1');
    expect(fields[1].type).toBe('number');
  });
});
```

**2. Component Tests**
```typescript
describe('FieldGroupSelector', () => {
  test('dynamically displays component fields from actual data', () => {
    const drawings = [{
      components: [{ piece_mark: 'C63', length: 120 }]
    }];
    render(<FieldGroupSelector drawings={drawings} />);

    // Expand Component Data group
    fireEvent.click(screen.getByText('Component Data'));

    expect(screen.getByText('Piece Mark')).toBeInTheDocument();
    expect(screen.getByText('Length')).toBeInTheDocument();
  });
});

describe('ExportPreview', () => {
  test('virtualizes large datasets', () => {
    const drawings = Array(1000).fill({ id: '1', file_name: 'test.jpg' });
    render(<ExportPreview drawings={drawings} selectedFields={fields} />);

    // Only ~20 rows should be in DOM (virtualization)
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeLessThan(30);
  });
});
```

**3. E2E Test Requirements**
```typescript
test('exports CSV with clickable hyperlinks', async ({ page }) => {
  await page.goto('/drawings');
  await page.click('button:has-text("Export")');

  // Expand Component Data group and select URL field
  await page.click('text=Component Data');
  await page.click('input[type="checkbox"]:near(text="View Component")');

  // Download CSV
  const downloadPromise = page.waitForEvent('download');
  await page.click('button:has-text("Export CSV")');
  const download = await downloadPromise;

  // Verify CSV contains HYPERLINK formula
  const path = await download.path();
  const content = fs.readFileSync(path, 'utf-8');
  expect(content).toMatch(/=HYPERLINK\(/);
  expect(content).toContain('/drawings/');
  expect(content).toContain('/components/');
});
```

**Manual Testing Focus:**

**Priority 1: URL Hyperlink Validation**
1. Export CSV with "View Component" field selected
2. Open CSV in Microsoft Excel
3. Verify "View Component" column shows as blue clickable links (not raw formulas)
4. Click link → verify it opens correct component view in browser
5. Repeat test in Google Sheets (upload CSV, verify links work)
6. **CRITICAL:** If routing pattern differs, update URL generation logic

**Priority 2: Component Data Fields (Data-Driven)**
1. Test drawings with different component data structures
2. Verify export UI dynamically shows available fields from actual data
3. Export with mixed component schemas → verify data aligns correctly
4. Verify field labels are human-readable (e.g., "Piece Mark" not "piece_mark")

**Priority 3: Performance**
1. Test with 50, 100, 300, 500 drawings
2. Verify warning appears at 300 drawings threshold
3. Confirm export completes within 5 seconds for typical datasets

**Testing Standards from Architecture:**
- Follow existing test patterns from `DrawingsListPage.test.tsx`
- Use `screen.getByRole()` queries (accessibility best practice)
- Mock API responses with `react-query` testing utilities
- E2E tests should use `data-testid` attributes for stable selectors

### Important Implementation Notes

1. **Component URL Routing:** Verify `/drawings/:id/components/:componentId` route exists during testing. **Assumption confirmed by user - proceed with this pattern, validate during implementation.**

2. **Flexible Schema Fields:** Use **data-driven approach** - export actual component data fields, not schema definitions. Simpler implementation, no API calls needed.

3. **CSV Library Configuration:** Use papaparse with `quotes: true` to ensure fields with commas are properly escaped.

4. **Virtualization Performance:** FixedSizeList requires fixed row height. Use `rowHeight={52}` (matches existing table row height for consistency).

5. **TypeScript Strict Mode:** Ensure all field keys are typed as `keyof Drawing` to prevent runtime errors from typos.

6. **File Naming Convention:** Use ISO date format in filename: `drawings-export-YYYY-MM-DD.csv` for sortability.

7. **HYPERLINK Formula Quoting:** In CSV, the HYPERLINK formula must double-quote internal quotes:
   - Correct: `"=HYPERLINK(""url"", ""text"")"`
   - Incorrect: `"=HYPERLINK("url", "text")"`

### Questions for Clarification (Dev Agent to Resolve During Implementation)

- ✅ Component URL structure: `/drawings/:id/components/:componentId` (confirmed by user, validate during testing)
- ✅ Flexible schema field access: Use data-driven approach (export actual component data)
- ✅ Performance warning threshold: 300 drawings (user confirmed "hundreds of rows")

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-02 | 1.0 | Initial story creation - CSV data export feature with preview, accordion field selection, URL hyperlinks, and data-driven component field discovery | BMad Master |
| 2025-10-02 | 1.1 | Story validated and approved - Status updated to Ready. Quality score: 95/100. One minor type definition issue identified (DrawingListResponse) to be resolved during Task 1. No sharding required. | Sarah (Product Owner) |

---

## Dev Agent Record

*This section will be populated by the development agent during implementation*

### Agent Model Used

*To be recorded by dev agent*

### Debug Log References

*To be recorded by dev agent*

### Completion Notes

*To be recorded by dev agent*

### File List

*List all files created, modified, or affected during story implementation*

---

## QA Results

*This section will be populated by the QA agent after implementation review*

---

**Story Created:** 2025-10-02
**Story Type:** New Feature - Data Export (CSV)
**Story Ready for Development:** 2025-10-02 (pending PO approval)
