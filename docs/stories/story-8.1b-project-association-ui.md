# Story 8.1b: Project-Drawing Association UI

## Status

**Status**: ✅ Ready for Development
**Epic**: 8 - Project Management & Organization
**Sprint**: TBD
**Assigned To**: TBD
**Estimated Effort**: 6-8 hours (9 phases including backend verification)
**Priority**: High
**Dependencies**: **Story 8.1a (Backend Foundation) MUST BE COMPLETE** - Verify via Task 0 before starting
**Story Type**: Feature (UI/UX)
**Created By**: Bob (Scrum Master) - Sharded from original Story 8.1
**Creation Date**: 2025-10-03
**Validated By**: Sarah (PO) + Bob (SM)
**Validation Date**: 2025-10-03
**Implementation Readiness Score**: 10/10

---

## Story

**As a** railroad bridge engineer managing multiple bridge projects,
**I want** an intuitive UI to assign drawings to projects, view project assignments, and reorganize drawings efficiently,
**so that** I can keep my project files organized and find drawings by project quickly.

---

## Context & Rationale

### Why This Story Exists

Original Story 8.1 combined backend and frontend work (12-16 hours, 64 subtasks). During PO validation, critical issues were identified that required backend-first implementation:

1. **Breaking schema change** needed careful migration (now in 8.1a)
2. **Component count bug** needed backend fix first (now in 8.1a)
3. **Frontend UI should not block on backend uncertainty**

**This story (8.1b) focuses exclusively on UI/UX** once backend foundation is stable.

### What 8.1a Delivers (Prerequisites)

**Backend APIs Ready:**
- `GET/POST/DELETE /api/v1/drawings/{id}/projects` - Individual assignment
- `POST /api/v1/drawings/bulk/assign-projects` - Bulk assign
- `POST /api/v1/drawings/bulk/remove-projects` - Bulk remove
- `GET /api/v1/projects/{id}/drawings` - Project's drawings list
- `POST /api/v1/projects/{id}/drawings` - Assign from project view

**Data Model:**
- Junction table `drawing_project_associations` operational
- Many-to-many relationships working
- Component count fixed (displays 71, not 0)

**Response Format:**
```json
{
  "id": "uuid",
  "file_name": "Drawing-001.pdf",
  "components_extracted": 71,
  "projects": [
    {"id": "uuid", "name": "Bridge 405", "code": "BR-405"}
  ]
}
```

### Business Value

**Primary Benefits:**
1. **Visual Organization**: See project assignments at a glance (Tag Pills)
2. **Bulk Efficiency**: Reorganize multiple drawings quickly (Bulk Toolbar)
3. **Flexible Workflow**: Assign at upload OR organize later
4. **Project Discovery**: View all drawings for a project from project detail page
5. **Orphan Tracking**: Filter unassigned drawings needing organization

**User Scenarios:**
- **Upload Flow**: Engineer uploads 50 drawings, assigns to "Bridge 405 Rehabilitation"
- **Reorganization**: Project scope changes, engineer moves 10 drawings to new "Bridge 405 Phase 2"
- **Multi-Project**: Standard detail drawing tagged with 3 different bridge projects
- **Discovery**: Project manager views "Downtown Bridge Replacement" drawings list

---

## Acceptance Criteria

### **AC1: Upload Flow - Optional Project Assignment**

**Given** user is uploading new drawings
**When** upload form is displayed at `/upload`
**Then** form includes optional "Assign to Projects" multi-select dropdown
**And** dropdown lists all available projects
**And** "None (Unassigned)" is the default state
**And** user can select one or more projects OR leave unassigned
**And** drawings upload successfully regardless of project assignment

**UI Mockup:**
```
┌─────────────────────────────────────────────┐
│ Upload Drawings                              │
├─────────────────────────────────────────────┤
│ Select Files: [Choose Files]                │
│                                              │
│ Assign to Projects (optional):              │
│ ┌───────────────────────────────────────┐   │
│ │ [Select projects...] ▼                │   │
│ └───────────────────────────────────────┘   │
│   Projects available:                       │
│   ☐ Bridge 405 Rehabilitation               │
│   ☐ Downtown Bridge Replacement             │
│   ☐ Phase 2 Expansion                       │
│                                              │
│ [Cancel] [Upload Drawings]                  │
└─────────────────────────────────────────────┘
```

**Implementation Files:**
- [frontend/src/pages/UploadDrawingPage.tsx](frontend/src/pages/UploadDrawingPage.tsx) (likely path)
- Use Material-UI Autocomplete with `multiple` prop
- Call backend: `POST /api/v1/drawings/upload` with optional `project_ids: []`

---

### **AC2: Drawings List - Project Tag Display (Tag Pills UX)**

**Given** user is viewing `/drawings` page
**When** drawings list renders
**Then** each drawing row displays:
- Drawing name and metadata
- **Project tags** as Material-UI Chips (e.g., `[Bridge 405 ×] [Downtown Rehab ×]`)
- **"[+ Assign Projects]" button** for individual assignment
- **Component count** (now showing correct count from 8.1a)
- Upload date, status, and other metadata

**And** unassigned drawings display:
- `[Unassigned]` badge/chip (gray color, no × remove button)
- Same "[+ Assign Projects]" button

**Tag Interaction:**
- Clicking **"×"** on project tag → confirmation dialog → removes that project assignment
- Clicking **"[+ Assign Projects]"** → opens autocomplete multi-select dialog

**Visual Reference:**
```
┌────────────────────────────────────────────────────────┐
│ Drawings                                               │
├────────────────────────────────────────────────────────┤
│ ☐ Drawing-001.pdf                                      │
│   [Bridge 405 ×] [Downtown Rehab ×] [+ Assign]         │
│   • 71 components • Uploaded 2025-10-01 • Completed    │
├────────────────────────────────────────────────────────┤
│ ☐ Drawing-002.pdf                                      │
│   [Unassigned] [+ Assign]                              │
│   • 45 components • Uploaded 2025-10-02 • Completed    │
└────────────────────────────────────────────────────────┘
```

**Implementation Files:**
- [frontend/src/pages/DrawingsListPage.tsx](frontend/src/pages/DrawingsListPage.tsx)
- Create new component: `frontend/src/components/ProjectTags.tsx`
- Material-UI components: `Chip`, `Autocomplete`, `Dialog`

**API Calls:**
- Display: Data from `GET /api/v1/drawings` (includes `projects[]`)
- Remove: `DELETE /api/v1/drawings/{id}/projects/{project_id}`
- Assign: `POST /api/v1/drawings/{id}/projects` with `{project_ids: []}`

---

### **AC3: Drawings List - Bulk Assignment Toolbar**

**Given** user selects 2+ drawings via checkboxes
**When** selection is made
**Then** bulk actions toolbar appears (sticky/floating at top of list)
**And** toolbar displays:
- Selected count: "**3 drawings selected**"
- **"Assign to Projects"** button
- **"Remove from Projects"** button
- **"Clear Selection"** button

**When** user clicks "Assign to Projects"
**Then** multi-select dialog opens with all available projects
**And** user can select multiple projects
**And** clicking "Apply" assigns all selected drawings to selected projects
**And** existing project assignments are preserved (additive operation)
**And** success toast shows: "3 drawings assigned to Bridge 405"

**When** user clicks "Remove from Projects"
**Then** multi-select dialog opens showing **only projects currently assigned** to selected drawings
**And** user selects projects to remove
**And** clicking "Apply" removes those project assignments from all selected drawings
**And** success toast shows: "Removed 3 drawings from Downtown Rehab"

**Visual Reference:**
```
┌─────────────────────────────────────────────────────────┐
│ ✓ 3 drawings selected                                   │
│ [Assign to Projects] [Remove from Projects] [Clear]     │
└─────────────────────────────────────────────────────────┘
```

**Implementation Files:**
- [frontend/src/pages/DrawingsListPage.tsx](frontend/src/pages/DrawingsListPage.tsx)
- Create new component: `frontend/src/components/BulkActionsToolbar.tsx`
- Material-UI components: `AppBar`, `Toolbar`, `Button`, `Dialog`, `Autocomplete`

**API Calls:**
- Bulk assign: `POST /api/v1/drawings/bulk/assign-projects`
  ```json
  {
    "drawing_ids": ["uuid1", "uuid2", "uuid3"],
    "project_ids": ["project-uuid-1", "project-uuid-2"]
  }
  ```
- Bulk remove: `POST /api/v1/drawings/bulk/remove-projects`
  ```json
  {
    "drawing_ids": ["uuid1", "uuid2", "uuid3"],
    "project_ids": ["project-uuid-1"]
  }
  ```

---

### **AC4: Drawings List - Project Filter**

**Given** user is viewing `/drawings` page
**When** filter controls are displayed
**Then** filter section includes:
- **"Filter by Project"** multi-select dropdown
- **"Show Unassigned Only"** checkbox toggle
- Existing filters (status, date range, etc.)

**When** user selects project(s) from filter dropdown
**Then** drawings list shows only drawings assigned to selected project(s)
**And** count displays: "Showing X of Y drawings"
**And** filter chips show active filters (e.g., "Project: Bridge 405 ×")

**When** "Show Unassigned Only" is toggled ON
**Then** drawings list shows only drawings with no project assignments
**And** filter indicator shows active state
**And** count updates to show unassigned drawings only

**Visual Reference:**
```
┌─────────────────────────────────────────────────────────┐
│ Filters:                                                 │
│ Filter by Project: [Select projects...▼]                │
│ ☐ Show Unassigned Only                                  │
│ Status: [All ▼]                                         │
├─────────────────────────────────────────────────────────┤
│ Active Filters: [Project: Bridge 405 ×] [Unassigned ×] │
│ Showing 12 of 150 drawings                              │
└─────────────────────────────────────────────────────────┘
```

**Implementation Files:**
- [frontend/src/pages/DrawingsListPage.tsx](frontend/src/pages/DrawingsListPage.tsx)
- Create new component: `frontend/src/components/DrawingFilters.tsx`
- Material-UI components: `Select`, `Checkbox`, `Chip`

**API Calls:**
- Filter by project: `GET /api/v1/drawings?project_id={uuid}`
- Unassigned only: `GET /api/v1/drawings?unassigned=true`
- Combined: `GET /api/v1/drawings?unassigned=true&status=completed`

**State Management:**
- Use URL query params for filter state (allows bookmarking)
- React Router: `useSearchParams()` hook
- Example: `/drawings?project_id=uuid&unassigned=true`

---

### **AC5: Project Detail Page - Drawings Tab/Section**

**Given** user is viewing a project detail page at `/projects/{projectId}`
**When** page renders
**Then** page includes **"Drawings"** tab or section
**And** section displays:
- Count: "**X drawings** assigned to this project"
- List of drawings (same row format as AC2 - with project tags)
- **"+ Add Drawings"** button for bulk assignment from project view

**When** user clicks "+ Add Drawings" button
**Then** modal dialog opens with:
- Searchable list of **ALL system drawings** (not just unassigned)
- Each drawing shows current project assignments (tags visible)
- Multi-select checkboxes
- Filter: **"Show Unassigned Only"** checkbox (quick filter)
- **"Add Selected to Project"** button

**And** user selects drawings and clicks "Add Selected"
**Then** selected drawings are assigned to current project
**And** existing project assignments are preserved (additive)
**And** drawings list refreshes with new assignments
**And** success toast: "Added 5 drawings to Bridge 405 Rehabilitation"

**Visual Reference:**
```
┌─────────────────────────────────────────────────────────┐
│ Bridge 405 Rehabilitation                                │
├─────────────────────────────────────────────────────────┤
│ [Details] [Drawings] [Components] [Settings]            │
├─────────────────────────────────────────────────────────┤
│ Drawings (12)                          [+ Add Drawings] │
├─────────────────────────────────────────────────────────┤
│ ☐ Drawing-001.pdf                                        │
│   [Bridge 405 ×] [Downtown Rehab ×]                      │
│   • 71 components • Uploaded 2025-10-01                  │
├─────────────────────────────────────────────────────────┤
│ ☐ Drawing-003.pdf                                        │
│   [Bridge 405 ×]                                         │
│   • 34 components • Uploaded 2025-10-02                  │
└─────────────────────────────────────────────────────────┘

[Modal Dialog when "+ Add Drawings" clicked]
┌─────────────────────────────────────────────────────────┐
│ Add Drawings to: Bridge 405 Rehabilitation               │
├─────────────────────────────────────────────────────────┤
│ Search: [___________] ☐ Show Unassigned Only           │
├─────────────────────────────────────────────────────────┤
│ ☐ Drawing-002.pdf [Unassigned]                          │
│ ☐ Drawing-005.pdf [Downtown Rehab]                      │
│ ☐ Drawing-007.pdf [Phase 2 Expansion] [Bridge 405]      │
├─────────────────────────────────────────────────────────┤
│ 2 selected                [Cancel] [Add Selected]        │
└─────────────────────────────────────────────────────────┘
```

**Implementation Files:**
- [frontend/src/pages/ProjectDetailPage.tsx](frontend/src/pages/ProjectDetailPage.tsx) (likely path)
- Create new component: `frontend/src/components/ProjectDrawingsTab.tsx`
- Create new component: `frontend/src/components/AddDrawingsDialog.tsx`
- Material-UI components: `Tabs`, `Dialog`, `TextField` (search), `Checkbox`, `List`

**API Calls:**
- Get project drawings: `GET /api/v1/projects/{id}/drawings?page=1&limit=20`
- Add drawings: `POST /api/v1/projects/{id}/drawings` with `{drawing_ids: []}`
- Remove from project: `DELETE /api/v1/projects/{id}/drawings/{drawing_id}`

---

### **AC6: User Feedback & Notifications**

**Given** user performs any project assignment operation
**When** operation completes (success or failure)
**Then** system provides immediate feedback

**Success Notifications (Toast/Snackbar):**
- "3 drawings assigned to Bridge 405" (bulk assign)
- "Drawing removed from Downtown Rehab" (single remove)
- "Added 5 drawings to Bridge 405 Rehabilitation" (from project view)
- "Project assignments updated" (generic success)

**Error Notifications (Toast/Snackbar):**
- "Failed to assign drawings: Project not found" (404 error)
- "Failed to assign drawings: {error message}" (generic error)
- "Some drawings could not be assigned. Please try again." (partial failure)

**Confirmation Dialogs (Before Destructive Actions):**
- **Remove single assignment:** "Remove Drawing-001.pdf from Bridge 405?"
  - [Cancel] [Remove]
- **Bulk remove:** "Remove 3 drawings from Downtown Rehab?"
  - [Cancel] [Remove from Project]

**Loading States:**
- Spinners during API calls
- Skeleton loaders for drawings list
- Disabled buttons during operations
- "Saving..." text on submit buttons

**Implementation:**
- Material-UI: `Snackbar` with `Alert` for toasts
- Material-UI: `Dialog` for confirmations
- Material-UI: `CircularProgress` for spinners
- Material-UI: `Skeleton` for loading states

---

### **AC7: Responsive Design & Accessibility**

**Given** users access the system from various devices
**When** UI is rendered
**Then** interface is responsive and accessible

**Responsive Requirements:**
- Desktop (>1200px): Full layout with bulk toolbar
- Tablet (768-1200px): Condensed layout, collapsible filters
- Mobile (<768px): Stacked layout, drawer for filters, simplified bulk actions

**Accessibility Requirements:**
- ARIA labels on all interactive elements
- Keyboard navigation support (Tab, Enter, Escape)
- Screen reader compatible
- Color contrast meets WCAG AA standards
- Focus indicators visible

**Testing:**
- Test on Chrome, Firefox, Safari
- Test with keyboard only (no mouse)
- Test with screen reader (NVDA/JAWS)
- Test responsive breakpoints

---

## Tasks / Subtasks

### **Phase 0: Backend Readiness Verification (15 minutes)**

**CRITICAL**: Verify Story 8.1a backend is deployed and functional before starting implementation.

#### Task 0.1: Verify Backend API Accessibility
- [x] Confirm backend API accessible at `http://localhost:8001`
- [x] Test API health endpoint: `curl http://localhost:8001/api/v1/system/health`
- [x] Verify API documentation available: `http://localhost:8001/docs`

#### Task 0.2: Run Story 8.1a Verification Checklist
- [x] **Component count fixed**: `curl http://localhost:8001/api/v1/drawings | jq '.items[0].components_extracted'`
  - Expected: `71` (not `0`) - ✅ CONFIRMED: 71 components
- [x] **Projects array present**: `curl http://localhost:8001/api/v1/drawings | jq '.items[0].projects'`
  - Expected: `[{"id": "uuid", "name": "Project Name", ...}]` - ✅ CONFIRMED: projects array working
- [x] **Drawing projects endpoint**: `curl http://localhost:8001/api/v1/drawings/{id}/projects`
  - Expected: `200 OK` with projects array - ✅ CONFIRMED: endpoint functional
- [x] **Bulk assign endpoint**: `curl -X POST http://localhost:8001/api/v1/drawings/bulk/assign-projects`
  - Expected: Endpoint exists (may return validation error, that's OK) - ✅ CONFIRMED: endpoint exists with validation

#### Task 0.3: Document Backend Version
- [x] Record backend Git commit hash or version - **62a267c** (Story 8.1a Tasks 1.5-1.6)
- [x] Document Story 8.1a completion date - **2025-10-03**
- [x] Confirm Story 8.1a QA gate passed (check `docs/qa/gates/8.1a-backend-foundation-bug-fix.yml`) - **PASS** (Conditional, Score 7.3/10)
- [x] Note any known issues or deviations from 8.1a spec - **Task 1.7 (testing) incomplete but acceptable**

**HALT CONDITION**: If any verification fails, STOP and escalate to team. Do not proceed with UI implementation until backend is confirmed working.

---

### **Phase 1: TypeScript Types & API Client (1 hour)** ✅

#### Task 1.1: TypeScript Interfaces ✅
- [x] Create `ProjectSummary` interface (id, name, code)
- [x] Update `Drawing` interface to include `projects: ProjectSummary[]`
- [x] Create `BulkAssignRequest` and `BulkRemoveRequest` types
- [x] Update existing interfaces if needed

#### Task 1.2: API Client Methods ✅
- [x] Add `getDrawingProjects(drawingId)` to api.ts
- [x] Add `assignDrawingToProjects(drawingId, projectIds)` to api.ts
- [x] Add `removeDrawingFromProject(drawingId, projectId)` to api.ts
- [x] Add `bulkAssignDrawingsToProjects(drawingIds, projectIds)` to api.ts
- [x] Add `bulkRemoveDrawingsFromProjects(drawingIds, projectIds)` to api.ts
- [x] Add `getProjectDrawings(projectId, filters)` to api.ts

---

### **Phase 2: Upload Flow (AC1) (1 hour)** ✅

#### Task 2.1: Upload Form Enhancement ✅
- [x] **Review existing [UploadDrawingPage.tsx](frontend/src/pages/UploadDrawingPage.tsx) for form patterns**
- [x] Match styling and validation patterns from existing upload form
- [x] Add "Assign to Projects" multi-select to upload form
- [x] Use Material-UI Autocomplete with `multiple` prop
- [x] Fetch projects list for dropdown (use React Query)
- [x] Handle optional project_ids in upload submission
- [x] Update upload API call to include project_ids
- [x] Test upload with/without project assignment

---

### **Phase 3: Drawings List - Project Tags (AC2) (2 hours)**

#### Task 3.1: Project Tags Component
- [ ] Create `frontend/src/components/ProjectTags.tsx` component
- [ ] Display projects as Material-UI Chips with delete icon
- [ ] Show "[Unassigned]" badge for orphan drawings
- [ ] Implement "[+ Assign Projects]" button
- [ ] Handle chip delete (× button) with confirmation

#### Task 3.2: Assign Projects Dialog
- [ ] Create multi-select dialog for project assignment
- [ ] Use Material-UI Autocomplete for project selection
- [ ] Fetch all projects for dropdown
- [ ] Submit assignment via API
- [ ] Show success/error toast
- [ ] Refresh drawings list after assignment

#### Task 3.3: Integrate into DrawingsListPage
- [ ] Update [DrawingsListPage.tsx](frontend/src/pages/DrawingsListPage.tsx) to use ProjectTags
- [ ] Verify component count now displays correctly (from 8.1a bug fix)
- [ ] Update drawings query to include projects (React Query)

---

### **Phase 4: Bulk Operations Toolbar (AC3) (2 hours)**

#### Task 4.1: Bulk Selection State
- [ ] Add checkbox column to drawings list
- [ ] Implement selection state management (useState)
- [ ] Track selected drawing IDs
- [ ] Show/hide toolbar based on selection count

#### Task 4.2: Bulk Actions Toolbar Component
- [ ] Create `frontend/src/components/BulkActionsToolbar.tsx`
- [ ] Sticky/floating toolbar at top of page (position: sticky)
- [ ] Display selected count
- [ ] Add "Assign to Projects" button
- [ ] Add "Remove from Projects" button
- [ ] Add "Clear Selection" button

#### Task 4.3: Bulk Assign Dialog
- [ ] Create dialog for bulk project assignment
- [ ] Multi-select autocomplete for projects
- [ ] Submit to `POST /api/v1/drawings/bulk/assign-projects`
- [ ] Atomic operation (all succeed or all fail)
- [ ] Success toast with count

#### Task 4.4: Bulk Remove Dialog
- [ ] Create dialog for bulk project removal
- [ ] Show only projects common to selected drawings
- [ ] Submit to `POST /api/v1/drawings/bulk/remove-projects`
- [ ] Confirmation dialog before removal
- [ ] Success toast with count

---

### **Phase 5: Filters (AC4) (1 hour)**

#### Task 5.1: Project Filter Dropdown
- [ ] Add "Filter by Project" multi-select to filter section
- [ ] Use Material-UI Select or Autocomplete
- [ ] Update drawings query with `?project_id=` param
- [ ] Show active filter chips

#### Task 5.2: Unassigned Filter Toggle
- [ ] Add "Show Unassigned Only" checkbox
- [ ] Update drawings query with `?unassigned=true` param
- [ ] Show active filter indicator

#### Task 5.3: Filter State Management
- [ ] Use URL query params for filter state (React Router useSearchParams)
- [ ] Persist filters across page reloads
- [ ] Clear filters functionality
- [ ] Update "Showing X of Y drawings" count

---

### **Phase 6: Project Detail Page (AC5) (1.5 hours)**

#### Task 6.1: Drawings Tab
- [ ] Create "Drawings" tab in project detail page
- [ ] Display project's drawings count
- [ ] List drawings with project tags (reuse ProjectTags component)
- [ ] Add "+ Add Drawings" button

#### Task 6.2: Add Drawings Dialog
- [ ] Create modal dialog with all drawings list
- [ ] Add search functionality (client-side filter)
- [ ] Show current project assignments on each drawing
- [ ] Add "Show Unassigned Only" quick filter
- [ ] Multi-select checkboxes
- [ ] Submit via `POST /api/v1/projects/{id}/drawings`

#### Task 6.3: Remove from Project
- [ ] Add remove option for each drawing in project view
- [ ] Confirmation dialog
- [ ] Submit via `DELETE /api/v1/projects/{id}/drawings/{drawing_id}`
- [ ] Refresh list after removal

---

### **Phase 7: UI Polish & Feedback (AC6) (1 hour)**

#### Task 7.1: Loading States
- [ ] Add CircularProgress spinners during API calls
- [ ] Add Skeleton loaders for drawings list
- [ ] Disable buttons during operations
- [ ] Show "Saving..." text on submit buttons

#### Task 7.2: Toast Notifications
- [ ] Implement success toasts (Snackbar + Alert)
- [ ] Implement error toasts with error messages
- [ ] Auto-dismiss after 5 seconds
- [ ] Allow manual dismiss

#### Task 7.3: Confirmation Dialogs
- [ ] Create reusable confirmation dialog component
- [ ] Use for all destructive actions (remove assignments)
- [ ] Include context in dialog text (drawing name, project name)

---

### **Phase 8: Testing & Polish (AC7) (1.5 hours)**

#### Task 8.1: Component Tests
- [ ] Test ProjectTags component (React Testing Library)
- [ ] Test BulkActionsToolbar component
- [ ] Test AddDrawingsDialog component
- [ ] Test filter interactions

#### Task 8.2: Integration Tests
- [ ] Test upload → assign → display flow
- [ ] Test bulk assign → verify tags updated
- [ ] Test filter by project → verify results
- [ ] Test remove assignment → verify tag removed

#### Task 8.3: E2E Tests
- [ ] E2E: Upload drawing with project assignment
- [ ] E2E: Assign multiple drawings to project (bulk)
- [ ] E2E: Filter by project and verify list
- [ ] E2E: Remove assignment and verify

#### Task 8.4: Responsive & Accessibility
- [ ] Test on desktop, tablet, mobile viewports
- [ ] Test keyboard navigation (Tab, Enter, Escape)
- [ ] Test with screen reader (basic verification)
- [ ] Verify color contrast meets WCAG AA

---

### **Phase 9: Documentation (30 minutes)**

#### Task 9.1: User Documentation
- [ ] Update user guide with project assignment workflows
- [ ] Document bulk operations with screenshots
- [ ] Document filter usage
- [ ] Add troubleshooting section

#### Task 9.2: Story Completion
- [ ] Add screenshots to story completion notes
- [ ] Document any deviations from original design
- [ ] Update change log

---

## Technical Notes

### Recommended State Management

**React Query for Server State:**
```typescript
// Fetch drawings with projects
const { data: drawings } = useQuery(
  ['drawings', filters],
  () => listDrawings(filters),
  { staleTime: 2 * 60 * 1000 }  // 2 minutes
);

// Bulk assign mutation
const assignMutation = useMutation(
  bulkAssignDrawingsToProjects,
  {
    onSuccess: () => {
      queryClient.invalidateQueries(['drawings']);
      showToast('Drawings assigned successfully');
    }
  }
);
```

**Local State for Selection:**
```typescript
const [selectedDrawingIds, setSelectedDrawingIds] = useState<string[]>([]);

const handleSelectAll = () => {
  setSelectedDrawingIds(drawings.map(d => d.id));
};

const handleClearSelection = () => {
  setSelectedDrawingIds([]);
};
```

**URL State for Filters:**
```typescript
const [searchParams, setSearchParams] = useSearchParams();

const projectFilter = searchParams.get('project_id');
const unassignedOnly = searchParams.get('unassigned') === 'true';

const updateFilter = (key: string, value: string) => {
  const params = new URLSearchParams(searchParams);
  params.set(key, value);
  setSearchParams(params);
};
```

### Material-UI Components Used

**From `@mui/material`:**
- `Chip` - Project tags with delete icon
- `Autocomplete` - Multi-select project dropdowns
- `Dialog` - Assignment and confirmation dialogs
- `Snackbar` + `Alert` - Toast notifications
- `AppBar` + `Toolbar` - Bulk actions toolbar (sticky)
- `Checkbox` - Bulk selection and filters
- `CircularProgress` - Loading spinners
- `Skeleton` - Loading placeholders
- `TextField` - Search inputs
- `Button` - Actions

### UX Design Rationale

**Tag Pills + Bulk Toolbar Hybrid (Path 3A):**
- **Visibility**: Project assignments immediately visible via chips
- **Bulk Power**: Toolbar enables efficient multi-drawing operations
- **Low Friction**: Single-click add/remove operations
- **Industry Proven**: Gmail-style bulk selection, Jira-style tags
- **Scalability**: Works for 1-100+ drawings per view

**Why This Pattern:**
- Balances individual and bulk operations
- No hidden functionality (all actions visible)
- Familiar UX patterns reduce learning curve
- Mobile-friendly (collapsible toolbar)

### Security Considerations

**Authentication & Authorization:**
- Rely on backend JWT validation (from Story 8.1a)
- All API calls include authentication headers via api.ts client
- Backend enforces project access controls (if implemented)

**Input Validation:**
- All UUIDs validated by backend API endpoints
- Material-UI Autocomplete prevents injection in project names
- No client-side SQL or direct database access

**XSS Prevention:**
- Material-UI components auto-escape user-generated content
- Project names rendered via `{project.name}` (React auto-escapes)
- No `dangerouslySetInnerHTML` usage

**CSRF Protection:**
- Backend API uses JWT tokens (stateless, CSRF-resistant)
- No session cookies requiring CSRF tokens

**Rate Limiting:**
- Backend enforces rate limits on bulk operations (Story 8.1a)
- Frontend does not implement additional throttling

**Error Handling:**
- API errors sanitized before display (avoid exposing stack traces)
- Generic error messages for security-related failures

### Testing Setup

**Test Framework Configuration:**
- **Unit/Component Tests**: Jest + React Testing Library (existing project setup)
- **E2E Tests**: Playwright (per frontend test configuration)
- **Test Runner**: `npm test` for unit tests, `npx playwright test` for E2E

**API Mocking Strategy:**
- Use MSW (Mock Service Worker) for API endpoint stubbing
- Mock all 8 backend endpoints from Story 8.1a:
  ```typescript
  // frontend/src/services/__mocks__/handlers.ts
  rest.get('/api/v1/drawings', (req, res, ctx) => {
    return res(ctx.json({ items: mockDrawings }));
  });
  rest.post('/api/v1/drawings/bulk/assign-projects', (req, res, ctx) => {
    return res(ctx.json({ success: true }));
  });
  ```

**Test Data Setup:**
- Create test utilities in `frontend/test-utils/projectTestData.ts`
- Provide mock drawings with various project assignment states:
  ```typescript
  export const mockDrawings = [
    { id: '1', file_name: 'Drawing-001.pdf', projects: [mockProject1, mockProject2] },
    { id: '2', file_name: 'Drawing-002.pdf', projects: [] }, // unassigned
  ];
  ```

**Running Tests:**
```bash
# Unit and component tests
npm test

# E2E tests (requires backend running)
npx playwright test

# E2E tests in headed mode (visual debugging)
npx playwright test --headed

# Test coverage report
npm test -- --coverage
```

**Test Environment:**
- Backend API should be running on `http://localhost:8001` for E2E tests
- Use `.env.test` for test-specific configuration
- Playwright config in `playwright.config.ts`

---

## Definition of Done

- [ ] All acceptance criteria (AC1-AC7) met and verified
- [ ] Upload flow includes optional project assignment
- [ ] Drawings list displays project tags correctly
- [ ] Bulk operations toolbar functional (assign/remove)
- [ ] Project filter works (multi-select + unassigned toggle)
- [ ] Project detail page shows drawings with add/remove functionality
- [ ] All toasts and confirmations implemented
- [ ] Component tests passing (React Testing Library)
- [ ] E2E tests passing (upload → assign → filter → remove flow)
- [ ] Responsive design verified (desktop, tablet, mobile)
- [ ] Accessibility verified (keyboard, screen reader basics)
- [ ] User documentation updated with screenshots
- [ ] Code reviewed and approved
- [ ] Changes merged to main branch

---

## Dependencies

**CRITICAL:** Story 8.1a (Backend Foundation) **MUST BE COMPLETE** before starting this story.

**Required from 8.1a:**
- Junction table `drawing_project_associations` operational
- Backend API endpoints deployed and accessible
- Component count bug fixed (71 displays correctly, not 0)
- Backend returning `projects: []` in drawing responses

**Verification Checklist Before Starting:**
```bash
# 1. Backend API accessible
curl http://localhost:8001/api/v1/drawings | jq '.items[0].projects'
# Should return: [{"id": "uuid", "name": "Project Name", "code": "CODE"}]

# 2. Component count fixed
curl http://localhost:8001/api/v1/drawings | jq '.items[0].components_extracted'
# Should return: 71 (not 0)

# 3. New endpoints available
curl http://localhost:8001/api/v1/drawings/{id}/projects
curl -X POST http://localhost:8001/api/v1/drawings/bulk/assign-projects
```

---

## Related Issues

**Depends On:**
- Story 8.1a (Backend Foundation & Bug Fix)

**Future Enhancements (Out of Scope):**
- Path 3B: Sidebar filter view (power user alternative)
- Project assignment history/audit log UI
- Drag-and-drop project assignment
- Project-based permissions UI

---

## Dev Agent Record

### Agent Model Used

**Model**: Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)
**Agent**: James (Full Stack Developer)
**Start Date**: 2025-10-03

### Debug Log References

None yet - Phase 0 completed successfully without issues

### Completion Notes

**Phase 0: Backend Readiness Verification** ✅ (2025-10-03)
- Verified backend API health and accessibility
- Confirmed Story 8.1a backend changes deployed:
  - Component count bug fix: `components_extracted` returns 71 (not 0)
  - Projects array present in drawing responses
  - New API endpoints operational:
    - `GET /drawings/{id}/projects` returns project list
    - `POST /drawings/bulk/assign-projects` exists with validation
- Backend version: Git commit `62a267c` (Story 8.1a Tasks 1.5-1.6)
- QA gate: PASS (Conditional, Score 7.3/10)
- Known limitation: Task 1.7 (backend testing) incomplete but acceptable
- **DECISION**: All prerequisites met, proceeding with Phase 1

**Phase 1: TypeScript Types & API Client** ✅ (2025-10-03)
- Added TypeScript interfaces (Task 1.1):
  - `ProjectSummary` interface: id, name, client, location
  - `BulkAssignRequest` interface: drawing_ids, project_ids
  - `BulkRemoveRequest` interface: drawing_ids, project_ids
  - Updated `Drawing` interface with `projects: ProjectSummary[]` and `components_extracted: number`
  - Updated `DrawingResponse` interface with matching fields
- Added API client methods (Task 1.2):
  - `getDrawingProjects(drawingId)` - GET /drawings/{id}/projects
  - `assignDrawingToProjects(drawingId, projectIds)` - POST /drawings/{id}/projects
  - `removeDrawingFromProject(drawingId, projectId)` - DELETE /drawings/{id}/projects/{project_id}
  - `bulkAssignDrawingsToProjects(request)` - POST /drawings/bulk/assign-projects
  - `bulkRemoveDrawingsFromProjects(request)` - POST /drawings/bulk/remove-projects
  - `getProjectDrawings(projectId, filters)` - GET /projects/{id}/drawings
- TypeScript compilation: ✅ PASS (no errors, build succeeded)
- Bundle size impact: +843 bytes (acceptable)

**Phase 2: Upload Flow Enhancement** ✅ (2025-10-03)
- Updated `uploadDrawing` API function to support both single and multiple project IDs
  - Backward compatible with legacy `projectId` parameter
  - New `projectIds` array parameter for many-to-many support
- Enhanced DrawingUpload component with multi-select Autocomplete:
  - Replaced single-select dropdown with Material-UI Autocomplete (multiple mode)
  - Changed state from `projectId` (string) to `selectedProjectIds` (string[])
  - Updated createProjectMutation to add new projects to selection
  - Upload now supports assigning drawings to multiple projects simultaneously
  - Added helper function `getSelectedProjectNames()` for display
  - Improved UX with Chip tags showing selected projects
- TypeScript compilation: ✅ PASS (no errors, build succeeded)
- Bundle size impact: +298 bytes (+0.07% from Phase 1, total +1.14KB)

### File List

**Phase 1 Files:**
- `frontend/src/services/api.ts` - Added TypeScript interfaces and 6 API client methods (Story 8.1b)

**Phase 2 Files:**
- `frontend/src/services/api.ts` - Updated uploadDrawing to support project_ids array (Story 8.1b)
- `frontend/src/components/DrawingUpload.tsx` - Replaced single-select with multi-select Autocomplete (Story 8.1b)

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-03 | 1.0 | Sharded from Story 8.1, UI-only scope | Bob (Scrum Master) |
| 2025-10-03 | 1.1 | PO validation complete (8.0/10 conditional go), 6 improvements recommended | Sarah (PO) |
| 2025-10-03 | 1.2 | Applied PO recommendations: Added Dev Agent Record, QA Results, Security Considerations, Testing Setup, Task 0 (Backend Verification), Task 2.1 pattern reference | Bob (Scrum Master) |
| 2025-10-03 | 1.3 | SM checklist validation complete (10/10 ready), status updated to Ready for Development | Bob (Scrum Master) |

---

## QA Results

_This section will be populated by the QA agent after story completion._

---

## Notes

**Why This Story Exists:**
Original Story 8.1 combined backend and frontend (12-16h, 64 tasks). PO validation identified:
- Backend needed to go first (breaking schema change, bug fix)
- Frontend should not block on backend uncertainty
- Sharding reduces risk and enables parallel work after 8.1a

**This Story (8.1b) Delivers:**
- Complete UI for project-drawing associations
- Industry-proven UX pattern (Tag Pills + Bulk Toolbar)
- All user-facing functionality from original Story 8.1
- Mobile-responsive and accessible design

**DO NOT START until Story 8.1a is deployed and verified!**
