# Story 6.1: Fix Drawings List Display Bug - Brownfield Bug Fix

## User Story

As a railroad bridge engineer,
I want to see and click on uploaded drawings in the "View Drawings" list,
So that I can access the drawing viewer to examine drawings and locate components.

## Story Context

**Existing System Integration:**
- Integrates with: DrawingsListPage component ([frontend/src/pages/DrawingsListPage.tsx](frontend/src/pages/DrawingsListPage.tsx))
- Technology: React 18, React Query, Material-UI, FastAPI backend
- Follows pattern: Existing table-based list pages with filters and statistics
- Touch points:
  - `/drawings` API endpoint via `listDrawings()` service method
  - DrawingViewer component at `/drawings/:id` route
  - Statistics summary cards and filter controls

**Current Bug Description:**
The "View Drawings" page at `/drawings` exhibits a data inconsistency where:
- ✅ Statistics cards correctly display "Total Drawings: 1"
- ❌ Table body renders "No drawings found" empty state
- ❌ Users cannot click on drawings to view them in the DrawingViewer component

**Root Cause Hypothesis:**
Data transformation issue in DrawingsListPage component where the `drawings` array is not being properly extracted from the API response, or filtering logic is inadvertently hiding valid drawings.

## Acceptance Criteria

**Functional Requirements:**

1. **Drawing List Display**: When drawings exist in the database, the table displays all drawings with columns: File Name, Project, Status, Size, Upload Date, Components, Actions
2. **Statistics Consistency**: Statistics cards (Total, Assigned, Unassigned, Processing) match the actual count of drawings displayed in the table
3. **Navigation to Viewer**: Clicking the "View" icon button on a drawing row successfully navigates to `/drawings/:id` and opens the DrawingViewer component

**Integration Requirements:**

4. Existing DrawingsListPage filter functionality (by Project and Status) continues to work unchanged
5. New data mapping follows existing React Query pattern for list views
6. Integration with DrawingViewer component maintains current behavior (pan, zoom, component overlays)

**Quality Requirements:**

7. API response structure is validated and properly typed
8. Console errors related to data mapping are resolved
9. No regression in existing DrawingsListPage functionality (filters, pagination, bulk operations)
10. Empty state ("No drawings found") only displays when truly no drawings exist

## Technical Notes

**Integration Approach:**
- Investigate API response structure from `listDrawings()` endpoint ([api.ts:209-222](frontend/src/services/api.ts#L209-L222))
- Verify data extraction logic at [DrawingsListPage.tsx:103-104](frontend/src/pages/DrawingsListPage.tsx#L103-L104):
  ```typescript
  const drawings = drawingsData?.drawings || [];
  const totalDrawings = drawingsData?.total || 0;
  ```
- Check for TypeScript type mismatches between API response and component expectations
- Validate that the `drawings` array contains valid Drawing objects with required fields

**Existing Pattern Reference:**
- Follow the same data fetching pattern as SearchPage component (uses React Query with proper data extraction)
- Use consistent error handling and loading states as other list pages

**Key Constraints:**
- Must not modify DrawingViewer component functionality
- Must preserve existing filter and pagination behavior
- Database schema and API endpoints should remain unchanged

**Investigation Steps:**
1. Add console.log to verify actual API response structure
2. Check browser network tab for `/drawings` API call payload
3. Verify TypeScript types match actual API response
4. Check for filtering logic that might hide drawings
5. Validate DrawingViewer component renders correctly when accessed directly via URL

## Definition of Done

- [x] Root cause identified and documented
- [ ] Data extraction logic corrected to properly map API response to table rows
- [ ] Statistics cards display counts matching table contents
- [ ] "View" button successfully navigates to DrawingViewer for each drawing
- [ ] Empty state only appears when no drawings exist
- [ ] All existing filters, pagination, and bulk operations work correctly
- [ ] No console errors related to data mapping
- [ ] Code follows existing React Query and data fetching patterns
- [ ] Manual testing confirms drawings list → viewer navigation works end-to-end

## Risk and Compatibility Check

**Minimal Risk Assessment:**
- **Primary Risk:** Breaking existing filter or pagination functionality while fixing data mapping
- **Mitigation:** Test all filter combinations (by Project, by Status) and pagination after fix
- **Rollback:** Simple git revert of DrawingsListPage.tsx changes

**Compatibility Verification:**
- [x] No breaking changes to existing APIs (fix is frontend-only)
- [x] Database changes - None required
- [x] UI changes follow existing design patterns (table structure unchanged)
- [x] Performance impact is negligible (only fixing data extraction logic)

## Validation Checklist

**Scope Validation:**
- [x] Story can be completed in one development session (~2 hours)
- [x] Integration approach is straightforward (frontend component fix only)
- [x] Follows existing patterns exactly (React Query data fetching pattern)
- [x] No design or architecture work required

**Clarity Check:**
- [x] Story requirements are unambiguous (display drawings in table)
- [x] Integration points are clearly specified (DrawingsListPage ↔ API ↔ DrawingViewer)
- [x] Success criteria are testable (manual E2E test: list → click → view)
- [x] Rollback approach is simple (git revert)

## Evidence & Screenshots

**Screenshot Evidence:** [drawings-page-loading.png](.playwright-mcp/drawings-page-loading.png)
- Shows statistics displaying "Total Drawings: 1"
- Shows table displaying "No drawings found" empty state
- Demonstrates the data inconsistency bug

## Related Files

**Primary Files:**
- [frontend/src/pages/DrawingsListPage.tsx](frontend/src/pages/DrawingsListPage.tsx) - Main component requiring fix
- [frontend/src/services/api.ts](frontend/src/services/api.ts#L209-L222) - API service method `listDrawings()`
- [frontend/src/pages/DrawingViewer.tsx](frontend/src/pages/DrawingViewer.tsx) - Viewer component (no changes needed)

**Reference Files:**
- [frontend/src/App.tsx](frontend/src/App.tsx#L60-L61) - Route definitions
- [frontend/src/pages/Dashboard.tsx](frontend/src/pages/Dashboard.tsx#L40-L43) - "View Drawings" navigation card

## Success Criteria

The bug fix is successful when:

1. ✅ Drawings table displays all drawings that exist in the database
2. ✅ Statistics cards show counts matching table contents
3. ✅ Clicking "View" icon navigates to DrawingViewer successfully
4. ✅ Empty state only appears when truly no drawings exist
5. ✅ All existing functionality (filters, pagination, bulk ops) works correctly

---

**Story Created:** 2025-10-01
**Story Type:** Bug Fix / Brownfield Enhancement
**Estimated Effort:** 2-3 hours
**Priority:** High (blocking core functionality)
