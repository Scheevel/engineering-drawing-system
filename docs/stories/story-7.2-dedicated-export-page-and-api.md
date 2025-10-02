# Story 7.2: Dedicated Export Page with Component-Inclusive API

## Status

**Status**: In Progress
**Epic**: 7 - Data Export & Reporting
**Sprint**: TBD
**Assigned To**: TBD
**Estimated Effort**: 8-12 hours
**Priority**: HIGH (blocks export functionality - critical bug fix)
**Dependencies**: Story 7.1.1 (completed)
**Story Type**: Feature + Bug Fix
**Validated By**: Neville (Engineering)
**Validation Date**: 2025-10-02

## Story

**As a** railroad bridge engineer,
**I want** a dedicated Export page with full-featured export controls and a backend API that includes component data,
**So that** I can successfully export component data to CSV without encountering "No components to preview" errors.

## Context & Rationale

### Critical Bug Identified (2025-10-02)

Story 7.1.1 successfully refactored the export service to use a component-centric data model, but **the export feature is completely non-functional** due to a critical data loading issue:

**Root Cause:**
1. ❌ `GET /api/v1/drawings` endpoint does NOT include component relationships
2. ❌ `DrawingResponse` Pydantic model does NOT have `components` field
3. ❌ Frontend `Drawing` TypeScript interface does NOT include `components`
4. ✅ Database relationship EXISTS: `Drawing.components → Component[]`
5. ✅ Export logic EXISTS and is CORRECT (Story 7.1.1)

**Current User Experience:**
```
User clicks "Export" button → Dialog opens → Preview shows "No components to preview"
Reason: drawings[].components is undefined (API never loads it)
Result: Export is completely broken
```

**Evidence:**
- Backend: `db.query(Drawing).all()` does NOT eager-load components ([drawing_service.py:149](backend/app/services/drawing_service.py#L149))
- Backend: `DrawingResponse` model lacks `components: List[ComponentResponse]` field
- Frontend: ExportPreview calculates `componentCount` from `drawings[].components` (which is undefined)

### Why a Dedicated Page?

The current implementation uses a modal dialog (`ExportDialog`) triggered from `DrawingsListPage`. This has several limitations:

**Current Issues:**
1. **Limited Screen Real Estate**: Modal dialog restricts preview area and field selection visibility
2. **Context Switching**: Users lose drawing list context when export dialog opens
3. **Navigation Reference**: CLAUDE.md notes "Navigation references /export page, but not yet implemented"
4. **UX Anti-pattern**: Complex workflows (multi-step, data-heavy) belong on dedicated pages, not modals

**Dedicated Page Benefits:**
1. **Full-Screen Workspace**: More room for preview table, filters, and field selection controls
2. **Persistent URL**: Users can bookmark `/export` for quick access
3. **Better Mobile UX**: Full page adapts better to smaller screens than modal
4. **Consistent Navigation**: Aligns with CLAUDE.md's existing navigation menu structure
5. **Future Extensibility**: Easier to add export history, templates, scheduled exports

### Architectural Decision: Dedicated Export Endpoint

**Option Selected:** `GET /api/v1/export/drawings?include_components=true`

**Why Not Modify Existing Endpoint?**
- `/api/v1/drawings` is optimized for list rendering (lightweight, paginated)
- Export requires ALL drawings with ALL components (different performance characteristics)
- Separation of concerns: list endpoint ≠ export endpoint
- Avoids accidental performance regression on drawing list page

**Benefits:**
- ✅ Clear API contract: "This endpoint is for export data loading"
- ✅ Can add export-specific optimizations (caching, batch loading, field selection)
- ✅ Backward compatible: existing `/drawings` endpoint unchanged
- ✅ Future-proof: export endpoint can diverge in features without affecting list

## Acceptance Criteria

### 1. **New Navigation Menu Item**
- Add "Export" menu item to main navigation (after "Drawings" or "Search")
- Icon: `<FileDownload />` or `<GetApp />` from Material-UI Icons
- Route: `/export`
- Accessible via direct URL navigation

### 2. **Backend: Export API Endpoint**
- **Endpoint**: `GET /api/v1/export/drawings`
- **Query Parameters**:
  - `project_id` (optional): Filter by project UUID
  - `status` (optional): Filter by processing status
  - `include_components` (default: `true`): Eager-load component relationships
- **Response Model**: `ExportDrawingsResponse`
  ```python
  class ExportDrawingsResponse(BaseModel):
      drawings: List[DrawingWithComponents]
      total_drawings: int
      total_components: int
      timestamp: datetime
  ```
- **Performance**: Use SQLAlchemy `joinedload()` for efficient component loading
- **No Pagination**: Return ALL matching drawings (export requires complete dataset)

### 3. **Backend: DrawingWithComponents Model**
- Extends `DrawingResponse` with components relationship:
  ```python
  class DrawingWithComponents(DrawingResponse):
      components: List[ComponentResponse] = []
  ```
- Each `ComponentResponse` includes:
  - `id`, `piece_mark`, `component_type`, `material`
  - `dimensions: List[DimensionResponse]`
  - `specifications: List[SpecificationResponse]`
  - `created_at`, `updated_at`

### 4. **Frontend: Dedicated Export Page Component**
- **File**: `frontend/src/pages/ExportPage.tsx`
- **Layout**: Full-page layout (not modal)
- **Sections**:
  1. **Page Header**: "Export Component Data to CSV"
  2. **Filters**: Project selector, Status selector (reuse from DrawingsListPage)
  3. **Field Selection**: Accordion groups (reuse from ExportDialog)
  4. **Preview Area**: Large virtualized preview (75% of viewport height)
  5. **Export Actions**: Export button, Clear Selection, Reset Filters

### 5. **Frontend: API Integration**
- New API service method: `getExportDrawings(filters)`
- Calls: `GET /api/v1/export/drawings?project_id=X&status=Y`
- Returns: `ExportDrawingsResponse` with fully populated `drawings[].components[]`
- Error handling: Show user-friendly message if API fails

### 6. **Frontend: Updated TypeScript Types**
- Add `components` field to `Drawing` interface:
  ```typescript
  export interface Drawing {
    // ... existing fields
    components?: Component[];  // Optional for backward compatibility
  }

  export interface Component {
    id: string;
    drawing_id: string;
    piece_mark: string;
    component_type?: string;
    material?: string;
    dimensions?: Dimension[];
    specifications?: Specification[];
    created_at: string;
    updated_at: string;
  }
  ```

### 7. **Refactor ExportDialog → Export Page Components**
- Extract reusable components:
  - `<FieldSelector />` - Field selection accordions (from ExportDialog)
  - `<ExportPreview />` - Preview table (already exists)
  - `<ExportActions />` - Export button and controls
- **Important**: Keep `ExportDialog` for backward compatibility if other pages use it
- `ExportPage` composes these components in full-page layout

### 8. **Filter Integration**
- Export page respects filter state (Project, Status)
- Filter changes trigger data refetch from export API
- Loading state: Show skeleton/spinner while fetching export data
- Empty state: "No drawings match current filters" when zero results

### 9. **Data Loading Flow**
```
User navigates to /export
  ↓
ExportPage mounts
  ↓
useQuery('exportDrawings', getExportDrawings(filters))
  ↓
GET /api/v1/export/drawings?project_id=X&status=Y
  ↓
Backend queries: db.query(Drawing).options(joinedload(Drawing.components)).filter(...)
  ↓
Response: { drawings: [...with components...], total_components: 127 }
  ↓
ExportPreview receives drawings[].components → componentCount = 127 ✅
  ↓
User sees: "Showing all 127 components from 23 drawings"
```

### 10. **Performance Requirements**
- Export API responds within 3 seconds for 100 drawings with 500 components
- Preview virtualizes component rows for smooth scrolling (500+ components)
- Export page loads within 2 seconds on initial navigation
- No memory leaks when switching between filters

### 11. **Error Handling & Edge Cases**
- **No components found**: Show message "No components available for export. Upload drawings and wait for processing to complete."
- **API timeout**: Show retry button with error message
- **Large datasets (1000+ components)**: Show performance warning before export
- **Empty field selection**: Disable export button, show tooltip "Select at least one field"

### 12. **User Feedback & Validation**
- Component count updates in real-time as filters change
- Export button shows count: "Export CSV (X components, Y fields)"
- Success message after CSV download: "Exported X components to drawings-export-2025-10-02.csv"
- Preview header sticky during scroll

## Tasks / Subtasks

### Backend Tasks (4-5 hours)

1. **Create Export API Endpoint** (2 hours)
   - [ ] Create `backend/app/api/export.py` with `/export/drawings` endpoint
   - [ ] Add route to `backend/app/api/__init__.py`
   - [ ] Implement query filters (project_id, status)
   - [ ] Use `joinedload(Drawing.components)` for efficient component loading
   - [ ] Add query optimization: select only needed fields

2. **Create Response Models** (1 hour)
   - [ ] Define `DrawingWithComponents` in `backend/app/models/drawing.py`
   - [ ] Define `ComponentResponse` in `backend/app/models/component.py`
   - [ ] Add `ExportDrawingsResponse` model
   - [ ] Test model serialization with nested components

3. **Add Export Service** (1 hour)
   - [ ] Create `backend/app/services/export_service.py`
   - [ ] Method: `get_export_drawings(filters, db)`
   - [ ] Business logic: filter validation, component count calculation
   - [ ] Add logging for export data volume (component counts)

4. **Testing** (1 hour)
   - [ ] Unit tests: `tests/test_export_service.py`
   - [ ] Integration tests: `tests/api/test_export.py`
   - [ ] Test edge cases: zero components, large datasets (500+ components)

### Frontend Tasks (4-6 hours)

5. **Create Export Page Component** (2 hours)
   - [ ] Create `frontend/src/pages/ExportPage.tsx`
   - [ ] Implement full-page layout with filter + preview + field selection
   - [ ] Add React Query hook: `useExportDrawings(filters)`
   - [ ] Loading states, error states, empty states

6. **API Integration** (1 hour)
   - [ ] Add `getExportDrawings(filters)` to `frontend/src/services/api.ts`
   - [ ] Add TypeScript types: `Component`, `Dimension`, `Specification`
   - [ ] Update `Drawing` interface to include `components?: Component[]`

7. **Refactor Export Components** (1-2 hours)
   - [ ] Extract `<FieldSelector />` from `ExportDialog.tsx` (if not already separate)
   - [ ] Ensure `<ExportPreview />` works with full-page layout
   - [ ] Create `<ExportActions />` component (Export button, Clear button)
   - [ ] Add `<ExportFilters />` component (Project, Status dropdowns)

8. **Navigation & Routing** (0.5 hours)
   - [ ] Add `/export` route to `frontend/src/App.tsx`
   - [ ] Add "Export" menu item to navigation component
   - [ ] Icon: `<FileDownload />` or `<GetApp />`

9. **Testing & Validation** (1-2 hours)
   - [ ] Manual testing: verify component data loads correctly
   - [ ] Test filter changes trigger data refetch
   - [ ] Test export functionality end-to-end
   - [ ] Verify preview shows correct component count
   - [ ] Test large datasets (100+ drawings, 500+ components)

### Documentation (0.5 hours)

10. **Update Documentation**
    - [ ] Update CLAUDE.md "Available API Endpoints" section with export endpoint
    - [ ] Update CLAUDE.md "Access Points" to mention /export page
    - [ ] Add note in Story 7.1.1 archive: "Fixed by Story 7.2"

## Technical Implementation Notes

### Backend: Efficient Component Loading

```python
# backend/app/services/export_service.py
from sqlalchemy.orm import joinedload

async def get_export_drawings(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = None
) -> ExportDrawingsResponse:
    """
    Load drawings with ALL components for export.
    Uses joinedload for efficient component loading (avoids N+1 queries).
    """
    query = db.query(Drawing).options(
        joinedload(Drawing.components)
            .joinedload(Component.dimensions),
        joinedload(Drawing.components)
            .joinedload(Component.specifications)
    )

    # Apply filters
    if project_id:
        query = query.filter(Drawing.project_id == uuid.UUID(project_id))
    if status:
        query = query.filter(Drawing.processing_status == status)

    drawings = query.all()

    # Calculate totals
    total_drawings = len(drawings)
    total_components = sum(len(d.components) for d in drawings)

    return ExportDrawingsResponse(
        drawings=[DrawingWithComponents.from_orm(d) for d in drawings],
        total_drawings=total_drawings,
        total_components=total_components,
        timestamp=datetime.utcnow()
    )
```

### Frontend: API Service Method

```typescript
// frontend/src/services/api.ts
export interface ExportDrawingsResponse {
  drawings: Drawing[];  // Now with components[] populated
  total_drawings: number;
  total_components: number;
  timestamp: string;
}

export const getExportDrawings = async (params: {
  project_id?: string;
  status?: string;
}): Promise<ExportDrawingsResponse> => {
  const response = await api.get('/export/drawings', { params });
  return response.data;
};
```

### Frontend: Export Page Hook

```typescript
// frontend/src/pages/ExportPage.tsx
const ExportPage: React.FC = () => {
  const [filters, setFilters] = useState({ project_id: 'all', status: 'all' });

  const { data, isLoading, error } = useQuery(
    ['exportDrawings', filters],
    () => getExportDrawings({
      project_id: filters.project_id === 'all' ? undefined : filters.project_id,
      status: filters.status === 'all' ? undefined : filters.status,
    }),
    {
      staleTime: 1 * 60 * 1000,  // 1 minute (export data changes less frequently)
    }
  );

  const drawings = data?.drawings || [];
  const componentCount = data?.total_components || 0;

  // ... rest of component
};
```

## Testing Strategy

### Backend Testing
- **Unit Tests**: Export service business logic (filtering, component counting)
- **Integration Tests**: API endpoint with database (real component loading)
- **Performance Tests**: Query time for 100 drawings with 500 components (< 3 seconds)

### Frontend Testing
- **Component Tests**: ExportPage rendering with mock data (React Testing Library)
- **Integration Tests**: API service method mocking (MSW)
- **E2E Tests**: Full export workflow (Playwright)
  - Navigate to /export
  - Wait for data load
  - Verify component count
  - Select fields
  - Click export
  - Verify CSV download

## Acceptance Validation

### Manual Testing Checklist
1. [ ] Navigate to `/export` from menu - page loads without errors
2. [ ] Verify component count displays correctly (e.g., "127 components from 23 drawings")
3. [ ] Change project filter - component count updates
4. [ ] Change status filter - preview refreshes
5. [ ] Select/deselect fields - preview columns update
6. [ ] Preview shows component rows (not drawing rows)
7. [ ] Click "Export CSV" - file downloads successfully
8. [ ] Open CSV in Excel - verify component data present (not "No components")
9. [ ] Verify HYPERLINK formulas work in Excel
10. [ ] Test with zero components - shows appropriate empty state

### Performance Validation
- [ ] Export page loads in < 2 seconds (100 drawings, 500 components)
- [ ] Preview scrolling is smooth (no jank)
- [ ] Export API responds in < 3 seconds
- [ ] CSV generation completes in < 5 seconds (500 components)

## Dependencies & Risks

### Dependencies
- **Story 7.1.1**: Must be completed (export service logic already correct)
- **Backend**: SQLAlchemy relationship `Drawing.components` must exist (✅ exists)
- **Frontend**: React Query for data fetching (✅ already used)

### Risks & Mitigation
**Risk**: Large datasets (1000+ components) may cause performance issues
- **Mitigation**: Add pagination to export API if needed, or implement streaming export

**Risk**: Changing `/drawings` API might break existing pages
- **Mitigation**: Use separate `/export/drawings` endpoint (no changes to existing API)

**Risk**: Users may not discover new export page
- **Mitigation**: Add prominent navigation menu item, update documentation

## Success Metrics

### Immediate Success (Post-Deploy)
- ✅ Export feature works without "No components to preview" error
- ✅ Users can successfully export component data to CSV
- ✅ Component count displays correctly (e.g., "127 components")

### Long-Term Success (1 week)
- Zero user reports of "empty export" bugs
- Export page average load time < 2 seconds (Google Analytics)
- CSV export completion rate > 90% (started export → downloaded file)

## Future Enhancements (Out of Scope)

These are explicitly **NOT** part of Story 7.2 but are potential future stories:

- Export templates (save field selections for reuse)
- Scheduled exports (daily/weekly CSV email)
- Export to additional formats (Excel XLSX, JSON, PDF)
- Export filtering by component type or piece mark pattern
- Export history tracking (audit log of exports)
- Bulk export (multiple projects at once)

---

## Related Stories

- **Story 7.1**: Initial CSV export implementation (drawing-centric, superseded)
- **Story 7.1.1**: Component-centric refactoring (completed, fixed data model)
- **Story 7.2**: Dedicated export page + API (this story, fixes "no components" bug)
- **Story 7.3**: (Future) Export templates and saved field selections
- **Story 7.4**: (Future) Scheduled exports and export history

---

**Validated by**: Neville (discovered "no components to preview" bug during deployment testing)
**Validation Date**: 2025-10-02
**Next Steps**: Prioritize for next sprint, assign to developer

---

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References
None yet

### Completion Notes
- Implementation started: 2025-10-02
- Following QA guidance from Story 7.1.1 review (high test coverage, edge cases, performance validation)

### File List
Files created or modified during implementation:

**Backend (Completed):**
- `backend/app/models/drawing.py` - Added DrawingWithComponents and ExportDrawingsResponse models
- `backend/app/services/export_service.py` - Added get_export_drawings() method with joinedload()
- `backend/app/api/export.py` - Added GET /export/drawings endpoint
- `backend/tests/test_export_api.py` - Created comprehensive test suite (19 tests)

**Frontend (In Progress):**
- TBD

### Change Log
- 2025-10-02: Story status updated to "In Progress" - authorized to begin by user
