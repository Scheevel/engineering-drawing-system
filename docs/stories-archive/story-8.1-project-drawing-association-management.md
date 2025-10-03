# Story 8.1: Project-Drawing Association Management

## Status

**Status**: Ready for Review ✅
**Epic**: 8 - Project Management & Organization
**Sprint**: TBD
**Assigned To**: TBD
**Estimated Effort**: 12-16 hours (Backend: 6-8h, Frontend: 6-8h)
**Priority**: High (core organizational capability)
**Dependencies**: None
**Story Type**: Feature + Bug Fix
**Created By**: Mary (Business Analyst)
**Creation Date**: 2025-10-03

---

## Story

**As a** railroad bridge engineer managing multiple bridge projects,
**I want** to associate drawings with one or more projects and organize them flexibly throughout their lifecycle,
**so that** I can keep project files organized, find drawings by project, and reorganize as project scopes evolve.

---

## Context & Rationale

### Current Issues

**Bug Identified:**
- `/drawings` page displays "component count: 0" for drawing with 71 actual components
- Root cause likely: Component relationship not eagerly loaded or count calculation broken

**Missing Functionality:**
- No way to associate drawings with projects (many-to-many relationship)
- Cannot view project's drawings from `/projects` page
- Cannot filter drawings by project or view unassigned drawings
- Projects exist in isolation without drawing associations

### Business Value

**Primary Benefits:**
1. **Project Organization**: Group drawings by bridge project for easy discovery
2. **Flexible Lifecycle**: Assign drawings at upload OR organize later
3. **Cross-Project Reuse**: Support drawings shared across multiple projects (many-to-many)
4. **Bulk Operations**: Reorganize multiple drawings efficiently
5. **Unassigned Tracking**: Identify orphan drawings needing organization

**User Scenarios:**
- **Upload Flow**: Engineer uploads 50 drawings for "Bridge 405 Rehabilitation" project
- **Reorganization**: Project scope changes, engineer moves 10 drawings to new "Bridge 405 Phase 2" project
- **Multi-Project**: Standard detail drawing used in 3 different bridge projects
- **Discovery**: Project manager views all drawings for "Downtown Bridge Replacement"

---

## Acceptance Criteria

### **AC1: Bug Fix - Component Count Display**

**Given** a drawing with components exists in the system
**When** user views `/drawings` page
**Then** the component count displays actual count (e.g., "71 components")
**And** the count is not "0" for drawings with components

**Technical Fix:**
- Backend: Ensure `GET /api/v1/drawings` uses `joinedload(Drawing.components)` or includes component count
- Frontend: Verify DrawingsList component renders count correctly from API response

---

### **AC2: Many-to-Many Data Model**

**Given** the system supports project-drawing relationships
**When** data model is inspected
**Then** it supports many-to-many relationships via junction table
**And** a drawing can belong to 0, 1, or multiple projects
**And** a drawing can exist without project assignment (orphan state)

**Database Schema:**
```sql
-- Junction table for many-to-many relationship
CREATE TABLE drawing_project_associations (
    id UUID PRIMARY KEY,
    drawing_id UUID REFERENCES drawings(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by VARCHAR(255), -- Optional: track who made assignment
    UNIQUE(drawing_id, project_id)
);

-- Indexes for performance
CREATE INDEX idx_dpa_drawing_id ON drawing_project_associations(drawing_id);
CREATE INDEX idx_dpa_project_id ON drawing_project_associations(project_id);
```

---

### **AC3: Upload Flow - Optional Project Assignment**

**Given** user is uploading new drawings
**When** upload form is displayed
**Then** form includes optional "Assign to Project" dropdown
**And** dropdown lists all projects with "None (Unassigned)" option
**And** user can select one or more projects OR leave unassigned
**And** drawings upload successfully regardless of project assignment

---

### **AC4: Drawings List - Project Tag Display (Recommended UX: Tag Pills + Bulk)**

**Given** user is viewing `/drawings` page
**When** drawings list renders
**Then** each drawing row displays:
- Drawing name
- **Project tags** as Material-UI Chips/Pills (e.g., `[Project A ×] [Project B ×]`)
- **"[+ Assign Projects]" button** for individual assignment
- **Component count** (bug fixed from AC1)
- Drawing metadata (upload date, status, etc.)

**And** unassigned drawings display:
- `[Unassigned]` badge/chip (gray color)
- Same "[+ Assign Projects]" button

**Tag Interaction:**
- Clicking "×" on project tag removes that project assignment (with confirmation)
- Clicking "[+ Assign Projects]" opens autocomplete multi-select dialog

**Visual Reference:**
```
┌────────────────────────────────────────────────────────┐
│ ☐ Drawing-001.pdf                                      │
│   [Bridge 405 ×] [Downtown Rehab ×] [+ Assign]         │
│   • 71 components • Uploaded 2025-10-01                │
├────────────────────────────────────────────────────────┤
│ ☐ Drawing-002.pdf                                      │
│   [Unassigned] [+ Assign]                              │
│   • 45 components • Uploaded 2025-10-02                │
└────────────────────────────────────────────────────────┘
```

---

### **AC5: Drawings List - Bulk Assignment Toolbar**

**Given** user selects 2+ drawings via checkboxes
**When** selection is made
**Then** bulk actions toolbar appears (sticky/floating at top)
**And** toolbar displays:
- Selected count: "2 drawings selected"
- **"Assign to Projects"** button
- **"Remove from Projects"** button
- "Clear Selection" button

**When** "Assign to Projects" is clicked
**Then** multi-select dialog opens with all projects
**And** user can select multiple projects to assign
**And** clicking "Apply" assigns all selected drawings to selected projects
**And** existing project assignments are preserved (additive operation)

**When** "Remove from Projects" is clicked
**Then** multi-select dialog opens showing only projects currently assigned to selected drawings
**And** user selects projects to remove
**And** clicking "Apply" removes those project assignments from all selected drawings

**Visual Reference:**
```
┌─────────────────────────────────────────────────────────┐
│ ✓ 3 drawings selected                                   │
│ [Assign to Projects] [Remove from Projects] [Clear]     │
└─────────────────────────────────────────────────────────┘
```

---

### **AC6: Drawings List - Project Filter**

**Given** user is viewing `/drawings` page
**When** filter controls are displayed
**Then** filter section includes:
- **"Filter by Project"** dropdown (multi-select)
- **"Show Unassigned Only"** checkbox toggle
- Existing filters (status, date range, etc.)

**When** user selects project(s) from filter
**Then** drawings list shows only drawings assigned to selected project(s)
**And** count displays: "Showing X of Y drawings"

**When** "Show Unassigned Only" is toggled ON
**Then** drawings list shows only drawings with no project assignments
**And** filter indicator shows active filter state

---

### **AC7: Project Detail Page - Drawings Tab/Section**

**Given** user is viewing a project detail page at `/projects/{projectId}`
**When** page renders
**Then** page includes "Drawings" tab or section
**And** section displays:
- Count: "X drawings assigned to this project"
- List of drawings (same row format as AC4)
- **"+ Add Drawings" button** for bulk assignment

**When** "+ Add Drawings" button is clicked
**Then** modal dialog opens with:
- Searchable list of ALL drawings (with current assignments visible)
- Multi-select checkboxes
- Filter: "Show Unassigned Only"
- "Add Selected to Project" button

**And** user selects drawings and clicks "Add Selected"
**Then** selected drawings are assigned to current project
**And** existing project assignments are preserved
**And** drawings list refreshes with new assignments

---

### **AC8: API Endpoints - Backend Implementation**

**Backend must provide:**

**Drawing Endpoints:**
```
GET    /api/v1/drawings/{id}/projects          # Get projects for drawing
POST   /api/v1/drawings/{id}/projects          # Assign drawing to projects (body: {project_ids: []})
DELETE /api/v1/drawings/{id}/projects/{project_id}  # Remove drawing from project

POST   /api/v1/drawings/bulk/assign-projects   # Bulk assign (body: {drawing_ids: [], project_ids: []})
POST   /api/v1/drawings/bulk/remove-projects   # Bulk remove (body: {drawing_ids: [], project_ids: []})
```

**Project Endpoints:**
```
GET    /api/v1/projects/{id}/drawings          # Get drawings for project (with pagination, filters)
POST   /api/v1/projects/{id}/drawings          # Assign drawings to project (body: {drawing_ids: []})
DELETE /api/v1/projects/{id}/drawings/{drawing_id}  # Remove drawing from project
```

**Enhanced Endpoints:**
```
GET /api/v1/drawings?project_id={id}           # Filter drawings by project
GET /api/v1/drawings?unassigned=true           # Get unassigned drawings
GET /api/v1/drawings (updated)                 # Include project associations in response
```

**Response Format (Drawing with Projects):**
```json
{
  "id": "uuid",
  "file_name": "Drawing-001.pdf",
  "component_count": 71,  // Bug fix: ensure correct count
  "projects": [
    {"id": "uuid", "name": "Bridge 405", "code": "BR-405"},
    {"id": "uuid", "name": "Downtown Rehab", "code": "DT-RH-2024"}
  ],
  "upload_date": "2025-10-01T10:00:00Z",
  ...
}
```

---

### **AC9: Performance Considerations**

**Given** system has 1000+ drawings and 50+ projects
**When** user performs operations
**Then** performance requirements are met:
- Drawings list with project tags loads in < 2 seconds
- Bulk assignment of 100 drawings completes in < 5 seconds
- Filter by project refreshes list in < 1 second
- Project detail page loads drawings in < 2 seconds

**Optimization Requirements:**
- Backend uses eager loading for project associations (`joinedload`)
- Backend uses pagination for large drawing lists
- Backend uses indexes on junction table foreign keys
- Frontend uses virtualization for long lists (react-window)

---

### **AC10: Data Integrity & Validation**

**When** drawing-project associations are managed
**Then** system ensures:
- Cannot assign drawing to non-existent project (404 error)
- Cannot create duplicate associations (idempotent operations)
- Deleting project removes all drawing associations (CASCADE or manual cleanup)
- Deleting drawing removes all project associations (CASCADE)
- Orphan drawings are valid and queryable

**Error Handling:**
- User-friendly error messages for failures
- Rollback on bulk operation failures (atomic transactions)
- Confirmation dialogs for destructive actions (remove assignments)

---

### **AC11: User Feedback & Notifications**

**When** user performs project assignment operations
**Then** system provides feedback:
- **Success Toast**: "3 drawings assigned to Bridge 405"
- **Success Toast**: "Drawing removed from Downtown Rehab"
- **Error Toast**: "Failed to assign drawings: {error message}"
- **Confirmation Dialog**: "Remove Drawing-001 from Project A?" (before deletion)
- **Loading States**: Spinners/skeletons during async operations

---

## Tasks / Subtasks

### Phase 1: Backend Foundation (6-8 hours)

#### Task 1.1: Database Schema & Migration
- [ ] Create `drawing_project_associations` junction table with migration
- [ ] Add indexes for `drawing_id` and `project_id`
- [ ] Add `assigned_at` and `assigned_by` columns
- [ ] Test migration up/down on dev database

#### Task 1.2: SQLAlchemy Models
- [ ] Update `Drawing` model with `projects` relationship (many-to-many)
- [ ] Update `Project` model with `drawings` relationship (many-to-many)
- [ ] Create `DrawingProjectAssociation` model (if using explicit association object)
- [ ] Add SQLAlchemy relationship configuration (`secondary=` table)

#### Task 1.3: Pydantic Schemas
- [ ] Create `ProjectSummaryResponse` schema (id, name, code)
- [ ] Update `DrawingResponse` to include `projects: List[ProjectSummaryResponse]`
- [ ] Create `AssignProjectsRequest` schema (drawing_ids, project_ids)
- [ ] Create `BulkAssignRequest` and `BulkRemoveRequest` schemas

#### Task 1.4: Drawing API Endpoints
- [ ] Implement `GET /api/v1/drawings/{id}/projects`
- [ ] Implement `POST /api/v1/drawings/{id}/projects` (assign)
- [ ] Implement `DELETE /api/v1/drawings/{id}/projects/{project_id}` (remove)
- [ ] Implement `POST /api/v1/drawings/bulk/assign-projects`
- [ ] Implement `POST /api/v1/drawings/bulk/remove-projects`

#### Task 1.5: Project API Endpoints
- [ ] Implement `GET /api/v1/projects/{id}/drawings` (with pagination)
- [ ] Implement `POST /api/v1/projects/{id}/drawings` (assign drawings to project)
- [ ] Implement `DELETE /api/v1/projects/{id}/drawings/{drawing_id}`

#### Task 1.6: Query Enhancements
- [ ] Fix component count bug: Update `GET /api/v1/drawings` to eagerly load components or calculate count
- [ ] Add `?project_id=` query parameter to filter drawings by project
- [ ] Add `?unassigned=true` query parameter to get orphan drawings
- [ ] Add `joinedload(Drawing.projects)` to drawings list query

#### Task 1.7: Backend Testing
- [ ] Unit tests for drawing-project association CRUD
- [ ] Unit tests for bulk operations (atomic transactions)
- [ ] Unit tests for filters (project_id, unassigned)
- [ ] Integration tests for cascade deletion behavior
- [ ] Test component count bug fix

---

### Phase 2: Frontend UI Implementation (6-8 hours)

#### Task 2.1: TypeScript Types & Interfaces
- [ ] Create `ProjectSummary` interface (id, name, code)
- [ ] Update `Drawing` interface to include `projects: ProjectSummary[]`
- [ ] Create `BulkAssignRequest` and `BulkRemoveRequest` types

#### Task 2.2: API Client Methods
- [ ] Add `getDrawingProjects(drawingId)`
- [ ] Add `assignDrawingToProjects(drawingId, projectIds)`
- [ ] Add `removeDrawingFromProject(drawingId, projectId)`
- [ ] Add `bulkAssignDrawingsToProjects(drawingIds, projectIds)`
- [ ] Add `bulkRemoveDrawingsFromProjects(drawingIds, projectIds)`
- [ ] Add `getProjectDrawings(projectId, filters)`

#### Task 2.3: Drawings List - Project Tag Display (AC4)
- [ ] Add project tags display using Material-UI Chip components
- [ ] Implement "[+ Assign Projects]" button with autocomplete dialog
- [ ] Add "×" remove handler with confirmation dialog
- [ ] Display "[Unassigned]" badge for orphan drawings
- [ ] Update drawings list query to include projects

#### Task 2.4: Drawings List - Bulk Toolbar (AC5)
- [ ] Add checkbox selection to drawing list rows
- [ ] Implement sticky/floating bulk actions toolbar
- [ ] Add "Assign to Projects" bulk action with multi-select dialog
- [ ] Add "Remove from Projects" bulk action with multi-select dialog
- [ ] Implement "Clear Selection" functionality

#### Task 2.5: Drawings List - Filters (AC6)
- [ ] Add "Filter by Project" multi-select dropdown
- [ ] Add "Show Unassigned Only" checkbox toggle
- [ ] Implement filter state management (URL params or local state)
- [ ] Update drawings query based on active filters

#### Task 2.6: Project Detail Page - Drawings Section (AC7)
- [ ] Create/update Project detail page with Drawings tab
- [ ] Display project's drawings list with count
- [ ] Implement "+ Add Drawings" button and modal
- [ ] Add searchable drawing selector with filters
- [ ] Implement bulk assign from project view

#### Task 2.7: Upload Flow Enhancement (AC3)
- [ ] Add optional "Assign to Project" dropdown to upload form
- [ ] Support multi-select project assignment at upload
- [ ] Handle unassigned upload (default state)

#### Task 2.8: UI Polish & Feedback
- [ ] Add loading states (skeletons, spinners)
- [ ] Implement success/error toast notifications
- [ ] Add confirmation dialogs for destructive actions
- [ ] Ensure responsive design (mobile-friendly)

#### Task 2.9: Frontend Testing
- [ ] Component tests for ProjectTags component
- [ ] Component tests for BulkActionsToolbar
- [ ] Integration tests for assignment workflows
- [ ] E2E test for upload → assign → filter → remove flow

---

### Phase 3: Bug Fix & Polish (2 hours)

#### Task 3.1: Component Count Bug Fix
- [ ] Verify backend includes component count in drawings response
- [ ] Ensure frontend displays count from API response
- [ ] Test with drawing containing 71 components
- [ ] Update any caching/memoization that might show stale count

#### Task 3.2: Documentation
- [ ] Update API documentation with new endpoints
- [ ] Update user guide with project assignment workflows
- [ ] Document bulk operations and filters
- [ ] Add screenshots to story completion notes

---

## Technical Notes

### Backend Implementation Details

**SQLAlchemy Relationship (Many-to-Many):**
```python
# In Drawing model (backend/app/models/database.py)
projects = relationship(
    "Project",
    secondary="drawing_project_associations",
    back_populates="drawings"
)

# In Project model
drawings = relationship(
    "Drawing",
    secondary="drawing_project_associations",
    back_populates="projects"
)
```

**Query Optimization:**
```python
# Eager load projects when fetching drawings
drawings = db.query(Drawing).options(
    joinedload(Drawing.projects),
    joinedload(Drawing.components)  # Fix component count bug
).all()
```

---

### Frontend Implementation Details

**Recommended Libraries:**
- Material-UI Chip (`@mui/material/Chip`) for project tags
- Material-UI Autocomplete (`@mui/material/Autocomplete`) for multi-select
- React Query (`react-query`) for data fetching and caching

**State Management:**
- Local state for bulk selection (useState)
- React Query for server state (drawings, projects)
- URL params for filters (useSearchParams)

---

### UX Design Rationale (Tree of Thoughts Winner)

**Path 3A: Tag Pills + Bulk Toolbar Hybrid** selected because:
1. **Visibility**: Project assignments immediately visible via tags
2. **Bulk Power**: Toolbar enables efficient multi-drawing operations
3. **Low Friction**: Single-click add/remove operations
4. **Industry Proven**: Pattern used in Gmail, Jira, Notion
5. **Scalability**: Works for 1-100+ drawings per view

**Alternative Considered:**
- Path 3B (Sidebar Filter) viable for power users but consumes more screen space
- Can be added later as enhancement if needed

---

## Definition of Done

- [x] All acceptance criteria (AC1-AC11) met and verified
- [ ] Backend endpoints implemented and tested (unit + integration)
- [ ] Frontend UI implemented per recommended UX (Tag Pills + Bulk Toolbar)
- [ ] Component count bug fixed and verified
- [ ] API documentation updated
- [ ] Code reviewed and approved
- [ ] QA testing completed (manual + E2E)
- [ ] Changes merged to main branch
- [ ] User documentation updated

---

## Related Issues

**Bug Fix Included:**
- Component count displays "0" instead of actual count (71 components)

**Future Enhancements (Out of Scope):**
- Path 3B: Sidebar filter view (power user alternative)
- Project assignment history/audit log
- Bulk export drawings by project
- Project-based permissions/access control

---

## Notes

**UX Design Decision:**
This story implements the **Tag Pills + Bulk Toolbar Hybrid** pattern (Path 3A from Tree of Thoughts analysis) based on:
- Highest scoring solution (45/50)
- Balanced across all criteria (discoverability, bulk power, low friction, scalability)
- Industry-proven pattern reducing implementation risk
- User requirement for flexible lifecycle management

**Scope Boundary:**
- Many-to-many relationship enables future multi-project scenarios
- Orphan drawings explicitly supported (engineering reality: not everything has project assignment immediately)
- Bulk operations critical for reorganization scenarios (project scope changes common)

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-03 | 1.0 | Initial story creation with Tree of Thoughts UX analysis | Mary (Business Analyst) |
