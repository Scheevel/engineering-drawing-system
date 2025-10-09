# Story 9.1: Search UI Refactoring - Column-Based Filtering & Confidence Display

## Status

**Status**: ✅ Ready for Development (Backend Verified)
**Epic**: 9 - Search & Discovery UX Improvements
**Sprint**: TBD
**Assigned To**: TBD
**Estimated Effort**: 3.5-5 hours (5 phases)
**Priority**: Medium
**Dependencies**: None (Backend verified: confidence filtering supported, single-select required)
**Story Type**: Refactoring + Feature Enhancement
**Created By**: Mary (Business Analyst)
**Creation Date**: 2025-10-08
**Validated By**: Sarah (Product Owner)
**Validation Date**: 2025-10-09
**Implementation Readiness Score**: 9.2/10

---

## Story

**As a** railroad bridge engineer searching for components across historical drawings,
**I want** sortable and filterable column headers with confidence scores visible,
**so that** I can quickly filter results by quality metrics and organize data like a spreadsheet without switching between search controls.

---

## Context & Rationale

### Why This Story Exists

The current [SearchPage](frontend/src/pages/SearchPage.tsx) (lines 995-1004) displays search results in a table with static headers and a separate "Search Components" section with multiple filter dropdowns. This creates a **disjointed UX**:

1. **Confidence Hidden**: ML/OCR confidence scores exist in backend data but aren't shown to users
2. **Separate Filter Controls**: Users must look away from results to adjust filters (Component Type, Project dropdowns)
3. **No Column Sorting**: Table headers are static labels, not interactive controls
4. **Inefficient Workflow**: Engineers accustomed to Excel-like data tables expect in-column filtering

### Current Implementation (Lines 995-1004)

```tsx
<TableHead>
  <TableRow>
    <TableCell>Piece Mark</TableCell>
    <TableCell>Type</TableCell>
    <TableCell>Quantity</TableCell>
    <TableCell>Drawing</TableCell>
    <TableCell>Project</TableCell>
    <TableCell>Confidence</TableCell>  {/* Currently displays but no filtering */}
    <TableCell>Actions</TableCell>
  </TableRow>
</TableHead>
```

**Note**: Confidence column **already exists** in table header (line 1002) but lacks:
- Sortable header (click to sort by confidence)
- Filterable ranges (quartile-based filtering)
- Visual quality indicators (color coding)

### What This Story Delivers

**Refactoring (Simplified Search Controls):**
- Collapse "Search Components" section (lines 574-893)
- Keep full-text search box with minimal real estate
- Move Component Type and Project filters **into** column headers
- Remove separate filter dropdowns

**New Feature (Confidence Column Enhancement):**
- Make Confidence column **sortable** (click header to toggle asc/desc)
- Add **quartile-based filtering** (0-25%, 25-50%, 50-75%, 75-100%)
- Display confidence with **color-coded indicators** (red/yellow/green)
- Show filter controls in column header menu (similar to Excel/Google Sheets)

**UX Pattern Reference:**
This implements a **"Data Table"** pattern familiar from:
- Google Sheets column filters
- Excel AutoFilter
- Jira issue tables
- GitHub Issues list

### Business Value

**Primary Benefits:**
1. **Faster Filtering**: Click column header instead of searching for dropdown
2. **Quality Visibility**: Engineers see confidence scores at a glance (red=verify drawing, green=trust)
3. **Familiar UX**: Excel-like interaction reduces learning curve
4. **Reduced Clutter**: Minimized search section saves vertical space
5. **Power User Efficiency**: Sort + filter combinations in fewer clicks

**User Scenarios:**
- **Quality Triage**: Filter Confidence < 50% to review low-quality OCR extractions
- **High-Confidence Search**: Filter Confidence 75-100% when exact data needed
- **Component Type Filtering**: Click "Type" header → select "Wide Flange" instead of dropdown
- **Project Organization**: Click "Project" header → select "Bridge 405" from menu

---

## Acceptance Criteria

### **AC1: Minimized Search Section**

**Given** user is viewing `/search` page
**When** page renders
**Then** search section displays:
- **Full-text search box** (Autocomplete with suggestions) - PRESERVED
- **Search Scope button** (Piece Marks, Component Types, Descriptions) - PRESERVED
- **Sort By dropdown** - PRESERVED (for relevance, date added sorting)
- **NO separate filter dropdowns** for Component Type or Project
- **Compact layout** using single row (3 columns: Search, Scope, Sort)

**UI Mockup (Minimized):**
```
┌─────────────────────────────────────────────────────────────────┐
│ Search Components                                               │
├─────────────────────────────────────────────────────────────────┤
│ [Search box with autocomplete...] [Scope ▼] [Sort By ▼]        │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**
- [SearchPage.tsx](frontend/src/pages/SearchPage.tsx) lines 578-733: Simplify Paper component
- Remove Component Type dropdown (lines 661-677)
- Remove Project dropdown (lines 679-704)
- Remove Instance Identifier field (lines 706-716)
- Remove Clear Filters button (lines 718-732)
- Keep: Search input (584-646), Scope button (648-660), Sort dropdown (945-958)
- Reduce Grid from 6 items to 3 items (single row)

---

### **AC2: Sortable Column Headers**

**Given** user is viewing search results table
**When** table headers render
**Then** all data columns display sortable indicators:
- **Piece Mark**, **Type**, **Quantity**, **Confidence** columns show sort icons
- **Drawing** and **Project** columns remain non-sortable (too varied)
- Clicking header toggles sort: **Ascending → Descending → No Sort**
- Active sort column shows indicator (▲ or ▼ icon)
- URL query param updates (e.g., `?sort=confidence_desc`)

**Sortable Columns:**
- Piece Mark (alphabetical A-Z / Z-A)
- Type (alphabetical by component_type)
- Quantity (numerical 0-99 / 99-0)
- Confidence (numerical 0-100% / 100-0%)

**Visual Reference:**
```
┌──────────────┬────────┬──────────┬──────────────┬─────────┬───────────────┐
│ Piece Mark ▲ │ Type ▼ │ Quantity │ Drawing      │ Project │ Confidence ▼  │
├──────────────┼────────┼──────────┼──────────────┼─────────┼───────────────┤
│ C63          │ Channel│ 12       │ Drawing-001  │ BR-405  │ 95% 🟢        │
│ W12x26       │ Beam   │ 8        │ Drawing-002  │ BR-405  │ 78% 🟡        │
│ L4x4x1/2     │ Angle  │ 24       │ Drawing-003  │ Unassig │ 42% 🟠        │
└──────────────┴────────┴──────────┴──────────────┴─────────┴───────────────┘
```

**Implementation:**
- Use Material-UI `TableSortLabel` component
- Add `onClick` handlers to sortable column headers
- Update `sortBy` state (lines 133, 436-438)
- Extend SORT_OPTIONS array (lines 90-97) with new options
- Sync sort state to URL via `useSearchParams`

---

### **AC3: Confidence Column with Quartile Filtering**

**Given** user clicks Confidence column header
**When** header menu opens
**Then** menu displays quartile filter options:
- **All Confidence Levels** (default, clears filter)
- **0-25%** (Low - Red indicator 🔴)
- **25-50%** (Medium-Low - Orange indicator 🟠)
- **50-75%** (Medium-High - Yellow indicator 🟡)
- **75-100%** (High - Green indicator 🟢)

**And** selecting a quartile:
- Applies filter to search results (backend API call with `confidence_min` and `confidence_max` params)
- Updates URL query param (e.g., `?confidence_quartile=4`)
- Displays active filter indicator in column header
- Shows filter badge below table: `[Confidence: 75-100% ×]`

**And** confidence values in table:
- Display as percentage with color-coded circle indicator
- Red circle (🔴): 0-25%
- Orange circle (🟠): 25-50%
- Yellow circle (🟡): 50-75%
- Green circle (🟢): 75-100%

**Visual Reference:**
```
┌─────────────────┐
│ Confidence ▼ 🔽 │ ← Click opens menu
├─────────────────┤
│ ☑ All Levels    │
│ ☐ 0-25% 🔴      │
│ ☐ 25-50% 🟠     │
│ ☐ 50-75% 🟡     │
│ ☑ 75-100% 🟢    │ ← Active filter
└─────────────────┘

Table Cell Display:
┌──────────┐
│ 95% 🟢   │ ← Green for high confidence
│ 42% 🟠   │ ← Orange for medium-low
└──────────┘
```

**Implementation:**
- Create `ConfidenceColumnHeader.tsx` component
- Use Material-UI `Menu` + `MenuItem` for filter dropdown
- Add confidence filter state: `confidenceQuartile` (0-4, where 0 = all)
- Map quartiles to API params:
  - Quartile 1 (0-25%): `confidence_min=0&confidence_max=0.25`
  - Quartile 2 (25-50%): `confidence_min=0.25&confidence_max=0.50`
  - Quartile 3 (50-75%): `confidence_min=0.50&confidence_max=0.75`
  - Quartile 4 (75-100%): `confidence_min=0.75&confidence_max=1.00`
- Update [SearchResultRow](frontend/src/components/SearchResultRow.tsx) to display colored indicator
- Sync filter to URL query params

---

### **AC4: Column Header Filtering (Type & Project)**

**Given** user clicks **Type** column header
**When** header menu opens
**Then** menu displays:
- **All Types** (default, clears filter)
- List of available component types (from `componentTypesData`)
- Radio buttons for single-select filtering
- Search box for filtering long lists (optional, when > 10 types)

**And** selecting a type:
- Applies filter to search results (backend API call with `component_type` param)
- Updates URL query param (e.g., `?type=wide_flange`)
- Shows active filter badge: `[Type: Wide Flange ×]`

**Given** user clicks **Project** column header
**When** header menu opens
**Then** menu displays:
- **All Projects** (default, clears filter)
- **Unassigned** (drawings with no project)
- List of available projects (from `projects` query)
- Radio buttons for single-select filtering

**And** selecting a project:
- Applies filter to search results (backend API call with `project_id` param)
- Updates URL query param (e.g., `?project=uuid`)
- Shows active filter badge: `[Project: Bridge 405 ×]`

**Visual Reference:**
```
Type Column Menu:
┌──────────────────────────┐
│ [Search types...]        │
├──────────────────────────┤
│ ○ All Types              │
│ ◉ Wide Flange (W)        │ ← Single-select (radio)
│ ○ Channel (C)            │
│ ○ Angle (L)              │
│ ○ HSS                    │
└──────────────────────────┘

Active Filter Badges (below table):
┌────────────────────────────────────────────┐
│ Active Filters:                            │
│ [Type: Wide Flange ×] [Confidence: 75-100% ×] │
└────────────────────────────────────────────┘
```

**Implementation:**
- Create `FilterableColumnHeader.tsx` component (reusable)
- Use Material-UI `Menu` + `RadioGroup` + `Radio` for single-select
- Add state for active filters: `componentTypeFilter`, `projectFilter` (singular, not arrays)
- Update search query construction (lines 401-427)
- Display active filter chips (lines 868-892) - repurpose existing implementation
- Sync all filters to URL query params

---

### **AC5: Backwards Compatibility & State Management**

**Given** user has bookmarked search URL with old query params
**When** user visits bookmarked URL
**Then** legacy filters still work:
- `?componentType=wide_flange` → converts to `?type=wide_flange`
- `?projectId=uuid` → converts to `?project=uuid`
- Old state gracefully migrated to new URL structure

**And** all filter state persists via URL:
- Page reload preserves all active filters
- Sharing URL shares exact filter configuration
- Browser back/forward buttons work correctly

**Implementation:**
- Use React Router `useSearchParams` hook (existing pattern from Story 8.1b)
- Add migration logic in `useEffect` to convert old params
- Validate all params on mount (handle corrupted URLs)

---

## Tasks / Subtasks

### **Phase 1: State Management & URL Structure (1 hour)**

#### Task 1.1: Define New Filter State Shape
- [ ] Create TypeScript interfaces for new filter structure
  ```typescript
  interface SearchFilters {
    query: string;
    scope: string[];
    sortBy: string;
    componentType: string;        // NEW: Single value (backend constraint)
    projectId: string;            // NEW: Single value (backend constraint)
    confidenceQuartile: number;   // NEW: 0-4 (0 = all, 1-4 = quartiles)
  }
  ```
- [ ] Update existing `SearchFilters` interface (line 73-77)
- [ ] Add type guards for filter validation

#### Task 1.2: URL State Management
- [ ] Implement `useSearchParams` for filter state (following Story 8.1b pattern)
- [ ] Create helper functions:
  - `filtersToUrlParams(filters): URLSearchParams`
  - `urlParamsToFilters(params): SearchFilters`
  - `migrateLegacyParams(params): URLSearchParams` (backwards compatibility)
- [ ] Add `useEffect` to sync filter state to URL
- [ ] Test URL param serialization (arrays, special characters)

#### Task 1.3: Update Search Query Construction
- [ ] Modify `searchComponents` call (lines 402-412) to use new filters
- [ ] Pass single values for componentType and projectId filters (backend supports single enum only)
- [ ] Map confidenceQuartile to min/max ranges
- [ ] Update React Query key to include new filters (line 401)

---

### **Phase 2: Minimize Search Section (1 hour)**

#### Task 2.1: Refactor SearchPage Layout
- [ ] Remove Component Type dropdown (lines 661-677)
- [ ] Remove Project dropdown (lines 679-704)
- [ ] Remove Instance Identifier field (lines 706-716)
- [ ] Remove Clear Filters button (lines 718-732)
- [ ] Reduce Grid from 6 columns to 3 columns
- [ ] Update responsive breakpoints (md={4} for each item)

#### Task 2.2: Preserve Core Search Controls
- [ ] Keep Search input with Autocomplete (lines 584-646)
- [ ] Keep Search Scope button (lines 648-660)
- [ ] Keep Sort By dropdown (lines 945-958)
- [ ] Verify Search Scope collapse panel still works (lines 737-778)
- [ ] Verify query validation still works (lines 596-598)

#### Task 2.3: Update Active Filters Display
- [ ] Repurpose existing filter chips section (lines 868-892)
- [ ] Show chips for: Component Types, Projects, Confidence Quartile
- [ ] Add "Clear All Filters" button when any filter active
- [ ] Update chip onDelete handlers to update URL params

---

### **Phase 3: Sortable Column Headers (1.5 hours)**

#### Task 3.1: Implement TableSortLabel Components
- [ ] Import `TableSortLabel` from Material-UI
- [ ] Wrap Piece Mark header (line 997)
- [ ] Wrap Type header (line 998)
- [ ] Wrap Quantity header (line 999)
- [ ] Wrap Confidence header (line 1002)
- [ ] Leave Drawing and Project as static (too varied for meaningful sort)

#### Task 3.2: Sort State Management
- [ ] Update `sortBy` state to include direction (e.g., `piece_mark_asc`, `confidence_desc`)
- [ ] Create `handleSort(column)` function with 3-state toggle logic:
  ```typescript
  const handleSort = (column: string) => {
    const currentSort = sortBy;
    // Cycle: No Sort → Ascending → Descending → No Sort
    if (!currentSort.startsWith(column)) {
      setSortBy(`${column}_asc`);
    } else if (currentSort.endsWith('_asc')) {
      setSortBy(`${column}_desc`);
    } else {
      setSortBy('relevance'); // Reset to default
    }
  };
  ```
- [ ] Add active/direction props to `TableSortLabel`

#### Task 3.3: Extend SORT_OPTIONS
- [ ] Add new sort options to SORT_OPTIONS array (lines 90-97):
  - `piece_mark_asc`, `piece_mark_desc` (already exists)
  - `component_type_asc`, `component_type_desc`
  - `quantity_asc`, `quantity_desc`
  - `confidence_asc`, `confidence_desc` (already exists as `confidence_desc`)
- [ ] Update Sort By dropdown to show all options
- [ ] Sync sort state to URL (`?sort=confidence_desc`)

---

### **Phase 4: Confidence Column Enhancement (1.5 hours)**

#### Task 4.1: Create ConfidenceIndicator Component
- [ ] Create `frontend/src/components/ConfidenceIndicator.tsx`
- [ ] Display confidence percentage + colored circle
- [ ] Implement color logic:
  ```typescript
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.75) return 'success.main'; // Green
    if (confidence >= 0.50) return 'warning.main'; // Yellow
    if (confidence >= 0.25) return 'orange';        // Orange
    return 'error.main';                            // Red
  };
  ```
- [ ] Use Material-UI `Box` with circular indicator
- [ ] Add tooltip with exact confidence value

#### Task 4.2: Create ConfidenceColumnHeader Component
- [ ] Create `frontend/src/components/ConfidenceColumnHeader.tsx`
- [ ] Implement Material-UI `Menu` with quartile options
- [ ] Add radio buttons for single-select quartile filtering
- [ ] Display color indicators next to each quartile range
- [ ] Handle menu open/close state
- [ ] Emit filter change events to parent

#### Task 4.3: Integrate Confidence Filtering
- [ ] Add `confidenceQuartile` state to SearchPage
- [ ] Update search query with confidence_min/confidence_max params
- [ ] Map quartile values (1-4) to API params:
  ```typescript
  const getConfidenceRange = (quartile: number) => {
    const ranges = {
      1: { min: 0, max: 0.25 },
      2: { min: 0.25, max: 0.50 },
      3: { min: 0.50, max: 0.75 },
      4: { min: 0.75, max: 1.00 },
    };
    return ranges[quartile] || null;
  };
  ```
- [ ] Update active filter chips to show confidence range
- [ ] Sync to URL (`?confidence_quartile=4`)

#### Task 4.4: Update SearchResultRow Component
- [ ] Replace plain confidence text (line 1002 area) with ConfidenceIndicator
- [ ] Ensure confidence value exists in component data
- [ ] Handle missing/null confidence gracefully

---

### **Phase 5: Filterable Column Headers (Type & Project) (1 hour)**

#### Task 5.1: Create FilterableColumnHeader Component
- [ ] Create `frontend/src/components/FilterableColumnHeader.tsx` (reusable)
- [ ] Props: `label`, `options`, `selectedValue`, `onChange`, `searchable`
- [ ] Implement Material-UI `Menu` with `RadioGroup` for single-select
- [ ] Add search box for filtering options (conditional, when > 10 items)
- [ ] Show active filter in header when selected (e.g., "Type: Wide Flange")
- [ ] Handle single-select radio button state

#### Task 5.2: Implement Type Column Filtering
- [ ] Replace static "Type" header (line 998) with FilterableColumnHeader
- [ ] Pass componentTypesData as options
- [ ] Use `getComponentTypeLabel` helper (lines 100-118) for display
- [ ] Add `componentTypeFilter` state (single string value)
- [ ] Update search query with component_type single value param
- [ ] Sync to URL (`?type=wide_flange`)

#### Task 5.3: Implement Project Column Filtering
- [ ] Replace static "Project" header (line 1001) with FilterableColumnHeader
- [ ] Pass projects data as options
- [ ] Include "Unassigned" as special option (project_id: null)
- [ ] Add `projectFilter` state (single string value)
- [ ] Update search query with project_id single value param
- [ ] Handle "Unassigned" filter specially (backend expects null)
- [ ] Sync to URL (`?project=uuid`)

#### Task 5.4: Update Active Filters Display
- [ ] Repurpose existing chips section (lines 868-892)
- [ ] Show chips for each active filter:
  - Component Type chip (show type label, not ID) - singular
  - Project chip (show project name, not ID) - singular
  - Confidence quartile chip (e.g., "Confidence: 75-100%")
- [ ] Add "Clear All Filters" button
- [ ] Implement individual chip delete (update URL params)

---

## Technical Notes

### API Changes Required

**Backend API Capabilities (VERIFIED 2025-10-09):**

✅ **Confidence filtering - SUPPORTED**:
```
GET /api/v1/search/components?confidence_min=0.75&confidence_max=1.0
```

❌ **Array parameters - NOT SUPPORTED**:
Backend uses Pydantic enum validation expecting single values:
```
# WORKS:
GET /api/v1/search/components?component_type=wide_flange&project_id=uuid

# FAILS (Pydantic validation error):
GET /api/v1/search/components?component_type=wide_flange,channel
```

**Design Decision**: Implement **single-select filtering** (radio buttons) to match backend constraints. Multi-select support deferred to future backend enhancement story.

### Component Architecture

```
SearchPage
├── Minimized Search Section
│   ├── Search Input (Autocomplete)
│   ├── Scope Button
│   └── Sort Dropdown
├── Active Filter Chips
│   ├── Type Chips
│   ├── Project Chips
│   ├── Confidence Chip
│   └── Clear All Button
└── Results Table
    ├── TableHead
    │   ├── PieceMarkHeader (sortable)
    │   ├── FilterableColumnHeader (Type)
    │   ├── SortableHeader (Quantity)
    │   ├── DrawingHeader (static)
    │   ├── FilterableColumnHeader (Project)
    │   └── ConfidenceColumnHeader (sortable + filterable)
    └── TableBody
        └── SearchResultRow
            └── ConfidenceIndicator
```

### State Management Pattern

**URL as Source of Truth:**
```typescript
// URL: ?query=beam&type=wide_flange&confidence_quartile=4&sort=confidence_desc

const [searchParams, setSearchParams] = useSearchParams();

// Read filters from URL
const filters = useMemo(() => ({
  query: searchParams.get('query') || '',
  componentType: searchParams.get('type') || '',       // Single value
  projectId: searchParams.get('project') || '',        // Single value
  confidenceQuartile: parseInt(searchParams.get('confidence_quartile') || '0'),
  sortBy: searchParams.get('sort') || 'relevance',
}), [searchParams]);

// Update filters (automatically updates URL)
const updateFilter = (key: string, value: any) => {
  const params = new URLSearchParams(searchParams);
  params.set(key, value.toString());
  setSearchParams(params);
};
```

### Material-UI Components Used

- `TableSortLabel` - Sortable column headers
- `Menu` + `MenuItem` - Column header filter dropdowns
- `RadioGroup` + `Radio` - Single-select filters (backend constraint)
- `Chip` - Active filter badges
- `Box` - Confidence color indicator
- `Tooltip` - Confidence hover details

### Backwards Compatibility Strategy

**Migration logic for old URLs:**
```typescript
useEffect(() => {
  const params = new URLSearchParams(searchParams);
  let migrated = false;

  // Migrate componentType → type
  if (params.has('componentType')) {
    params.set('type', params.get('componentType')!);
    params.delete('componentType');
    migrated = true;
  }

  // Migrate projectId → project
  if (params.has('projectId')) {
    params.set('project', params.get('projectId')!);
    params.delete('projectId');
    migrated = true;
  }

  if (migrated) {
    setSearchParams(params, { replace: true });
  }
}, []);
```

### Performance Considerations

**Bundle Size Impact:**
- Estimated +2KB for new components (ConfidenceIndicator, FilterableColumnHeader)
- No lazy loading needed (search is primary feature)

**Rendering Optimization:**
- Use `useMemo` for filter transformations
- Debounce search input (existing implementation at line 155)
- React Query caching reduces API calls (existing)

---

## Definition of Done

- [ ] All acceptance criteria (AC1-AC5) met and verified
- [ ] Search section minimized (3 controls: Search, Scope, Sort)
- [ ] Column headers sortable (Piece Mark, Type, Quantity, Confidence)
- [ ] Confidence column filterable by quartiles with color indicators
- [ ] Type and Project columns filterable via header menus
- [ ] Active filter chips display below table
- [ ] All filter state persists in URL query params
- [ ] Backwards compatibility with old URLs verified
- [ ] Component tests passing (ConfidenceIndicator, FilterableColumnHeader)
- [ ] E2E test covering filter workflow
- [ ] Responsive design verified (desktop, tablet, mobile)
- [ ] TypeScript compilation with no errors
- [ ] Code reviewed and approved
- [ ] User documentation updated with screenshots

---

## Dependencies

**None** - This story refactors existing SearchPage component with no external dependencies.

**Recommended Before Starting:**
- Verify backend API supports `confidence_min`/`confidence_max` query params
- Verify backend API supports array params for `component_type` and `project_id`
- If not, plan client-side workarounds or backend story

---

## Related Issues

**Future Enhancements (Out of Scope):**
- Saved filter presets (similar to saved searches from Story 8.1b)
- Export filtered results to CSV
- Advanced filter builder (boolean logic between filters)
- Column visibility toggle (show/hide columns)
- Column reordering (drag-and-drop)

---

## Dev Agent Record

### Agent Model Used

**Model**: TBD
**Agent**: James (Full Stack Developer)
**Start Date**: TBD

### Completion Notes

(To be filled during implementation)

### File List

**Phase 1 Files:**
- `frontend/src/pages/SearchPage.tsx` - Update filter state management and URL handling

**Phase 2 Files:**
- `frontend/src/pages/SearchPage.tsx` - Minimize search section layout

**Phase 3 Files:**
- `frontend/src/pages/SearchPage.tsx` - Add TableSortLabel components

**Phase 4 Files:**
- `frontend/src/components/ConfidenceIndicator.tsx` - NEW: Display confidence with color
- `frontend/src/components/ConfidenceColumnHeader.tsx` - NEW: Sortable + filterable header
- `frontend/src/components/SearchResultRow.tsx` - Update to use ConfidenceIndicator
- `frontend/src/pages/SearchPage.tsx` - Integrate confidence filtering

**Phase 5 Files:**
- `frontend/src/components/FilterableColumnHeader.tsx` - NEW: Reusable filterable header
- `frontend/src/pages/SearchPage.tsx` - Integrate Type and Project column filtering

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-08 | 1.0 | Initial story creation from elicitation | Mary (Business Analyst) |
| 2025-10-09 | 1.1 | PO validation complete: Backend verified, modified AC4 to single-select (radio buttons) due to backend Pydantic enum constraint. Confidence filtering supported. Score: 9.2/10 | Sarah (Product Owner) |

---

## Notes

**Backend Verification Results (2025-10-09):**
- ✅ **Confidence Filtering**: Backend supports `confidence_min` and `confidence_max` query parameters
- ❌ **Array Parameters**: Backend uses Pydantic enum validation expecting single values (not comma-separated arrays)
- **Design Decision**: Modified AC4 from multi-select (checkboxes) to single-select (radio buttons) to match backend capabilities
- **Future Enhancement**: Multi-select filtering can be added once backend supports array parameters or implements OR logic for filters

**Design Philosophy:**
This story transforms search from a "**search-then-filter**" model to a "**browse-and-filter**" model. Engineers familiar with Excel and Google Sheets will find the column-based filtering intuitive and efficient.

**Why Column-Based Filtering:**
- **Cognitive Load**: Filters co-located with data reduce mental context switching
- **Discoverability**: Filter options visible in column headers (no hidden dropdowns)
- **Efficiency**: 1 click to filter vs 2-3 clicks to find dropdown
- **Scalability**: Works for 10 or 1000 results without overwhelming UI

**Confidence Score Context:**
ML/OCR confidence is critical for railroad engineers who must verify component dimensions for safety. Color-coded indicators (🔴 🟠 🟡 🟢) provide instant visual triage:
- **Green (75-100%)**: Trust extracted data
- **Yellow (50-75%)**: Verify against drawing if critical
- **Orange (25-50%)**: High chance of OCR error, verify all data
- **Red (0-25%)**: Do not trust, manual review required

**Reference Implementation:**
- GitHub Issues table (filterable assignee, label, milestone columns)
- Jira issue list (filterable status, priority, assignee columns)
- Google Sheets AutoFilter (dropdown menus in column headers)

---

## QA Results

(To be filled by Quinn during QA review)

---
