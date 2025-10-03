# Breaking Changes: Story 8.1a - Many-to-Many Project-Drawing Associations

**Story**: 8.1a - Backend Foundation & Bug Fix
**Date**: 2025-10-03
**Migration**: f4c8a2b5e1d9
**Severity**: **MAJOR** - Database schema and API changes

---

## Overview

Story 8.1a migrates the project-drawing relationship from **one-to-many** to **many-to-many** using a junction table. This enables drawings to belong to multiple projects simultaneously.

---

## Database Schema Changes

### ✅ Phase A: COMPLETED (This Migration)
**Migration**: `f4c8a2b5e1d9_create_drawing_project_associations_junction_table.py`

#### New Table: `drawing_project_associations`
```sql
CREATE TABLE drawing_project_associations (
    id UUID PRIMARY KEY,
    drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    assigned_by VARCHAR(255),
    UNIQUE(drawing_id, project_id)
);
```

#### Indexes Created
- `idx_dpa_drawing_id` on `drawing_id`
- `idx_dpa_project_id` on `project_id`

#### Data Migration
- All existing `drawings.project_id` values migrated to junction table
- `drawings.project_id` column **PRESERVED** (for backward compatibility during Phase B)

**Status**: ✅ Safe to deploy - Non-breaking for existing code

---

### ⏳ Phase B: PENDING (Code Deployment)
**Tasks**: 1.2, 1.3, 1.4, 1.5, 1.6

#### SQLAlchemy Model Changes

**BEFORE (one-to-many):**
```python
class Drawing(Base):
    project_id = Column(UUID, ForeignKey("projects.id"), nullable=True)
    project = relationship("Project", back_populates="drawings")

class Project(Base):
    drawings = relationship("Drawing", back_populates="project")
```

**AFTER (many-to-many):**
```python
class Drawing(Base):
    project_id = Column(UUID, ForeignKey("projects.id"), nullable=True)  # KEPT temporarily
    projects = relationship(
        "Project",
        secondary="drawing_project_associations",
        back_populates="drawings"
    )

class Project(Base):
    drawings = relationship(
        "Drawing",
        secondary="drawing_project_associations",
        back_populates="projects"
    )
```

**Status**: ⏳ Pending implementation

---

### 🔮 Phase C: FUTURE (Schema Cleanup)
**Migration**: TBD - Future story (after 30-day verification period)

#### Column Removal
```sql
ALTER TABLE drawings DROP COLUMN project_id;
```

**Status**: 🔮 Future work - NOT in Story 8.1a scope

---

## API Changes

### Breaking Changes to Response Schemas

#### 1. `DrawingResponse` Schema Changes

**BEFORE:**
```json
{
  "id": "uuid",
  "title": "Drawing 001",
  "project_id": "uuid",         // Single project (nullable)
  "project": {                  // Optional single project object
    "id": "uuid",
    "name": "Project A"
  }
}
```

**AFTER:**
```json
{
  "id": "uuid",
  "title": "Drawing 001",
  "components_extracted": 71,   // BUG FIX: Added field
  "project_id": "uuid",         // DEPRECATED (Phase C will remove)
  "project": null,              // DEPRECATED (Phase C will remove)
  "projects": [                 // NEW: Array of projects
    {
      "id": "uuid",
      "name": "Project A",
      "code": "PRJ-A"
    }
  ]
}
```

**Migration Path for API Consumers:**
1. **Phase B**: Update clients to use `projects[]` array instead of `project`
2. **Phase C**: Clients must use `projects[]` - `project` and `project_id` fields removed

---

#### 2. `ProjectResponse` Schema Changes

**BEFORE:**
```json
{
  "id": "uuid",
  "name": "Project A",
  "drawings": [                 // One-to-many
    {"id": "uuid", "title": "Drawing 001"}
  ]
}
```

**AFTER:**
```json
{
  "id": "uuid",
  "name": "Project A",
  "drawings": [                 // Many-to-many (same structure, different semantics)
    {"id": "uuid", "title": "Drawing 001"}
  ]
}
```

**Migration Path**: Response structure unchanged, but semantics now support many-to-many

---

### New API Endpoints (Phase B)

#### Drawing-to-Project Association
```
GET    /api/v1/drawings/{drawing_id}/projects          # List projects for drawing
POST   /api/v1/drawings/{drawing_id}/projects          # Assign project(s) to drawing
DELETE /api/v1/drawings/{drawing_id}/projects/{project_id}  # Remove project from drawing

POST   /api/v1/drawings/bulk/assign-projects           # Bulk assign
POST   /api/v1/drawings/bulk/remove-projects           # Bulk remove
```

#### Project-to-Drawing Association
```
GET    /api/v1/projects/{project_id}/drawings          # List drawings for project
POST   /api/v1/projects/{project_id}/drawings          # Assign drawing(s) to project
DELETE /api/v1/projects/{project_id}/drawings/{drawing_id}  # Remove drawing from project
```

#### Refactored Endpoints
```
POST   /api/v1/projects/assign-drawings                # REFACTORED to support many-to-many
```

---

### Query Parameter Changes

#### `GET /api/v1/drawings` Enhanced Filters

**NEW Parameters:**
```
?project_id=uuid                 # Filter by single project (existing behavior)
?project_ids=uuid1,uuid2         # Filter by multiple projects (NEW)
?unassigned=true                 # Show only drawings without projects (NEW)
```

**Example:**
```bash
# Get drawings in Project A OR Project B
GET /api/v1/drawings?project_ids=uuid-a,uuid-b

# Get unassigned drawings
GET /api/v1/drawings?unassigned=true
```

---

## Code References Requiring Updates (18 Locations)

### High Priority (Direct `project_id` Usage)
1. **app/services/drawing_service.py** (4 references)
   - `list_drawings()` - Add `joinedload(Drawing.projects)`
   - `get_drawing()` - Eager load `projects` relationship
   - `update_drawing()` - Handle `projects` array in payload
   - **BUG FIX**: Add `components_extracted` to response

2. **app/services/search_service.py** (4 references)
   - `search_drawings()` - Query junction table for project filters
   - `advanced_search()` - Support `project_ids` array parameter

3. **app/api/flexible_components.py** (1 reference)
   - `get_component()` - Update `component.drawing.project_id` to `component.drawing.projects`

### Medium Priority (Relationship Access)
4. **app/services/export_service.py** (3 references)
   - Update `component.drawing.project` to handle multiple projects
   - Export CSV: Add `projects` column (comma-separated project names)

5. **app/services/flexible_component_service.py** (2 references)
   - Update `drawing.project` relationship access

6. **app/services/component_service.py** (2 references)
   - Update `drawing.project` relationship access

7. **app/services/schema_service.py** (2 references)
   - Update `drawing.project_id` to `drawing.projects`

---

## Cascade Behavior Changes

### BEFORE (One-to-Many)
```python
# projects.py
drawings = relationship("Drawing", back_populates="project", cascade="all, delete-orphan")
```
- **Behavior**: Deleting a project deletes all associated drawings

### AFTER (Many-to-Many)
```python
# projects.py (Phase B)
drawings = relationship("Drawing", secondary="...", back_populates="projects")
```
- **Behavior**: Deleting a project **ONLY** removes associations, drawings are preserved
- **Junction table CASCADE**: `ON DELETE CASCADE` removes association records automatically

⚠️ **IMPORTANT**: Update project deletion logic if business rules require cascade deletion of drawings

---

## Testing Requirements

### Phase A Verification (Post-Migration)
```bash
# Connect to database
psql -U user -d drawing_index

# Verify junction table created
SELECT COUNT(*) FROM drawing_project_associations;

# Verify data migrated
SELECT
    (SELECT COUNT(*) FROM drawings WHERE project_id IS NOT NULL) as drawings_with_project,
    (SELECT COUNT(*) FROM drawing_project_associations) as associations;

# Verify indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'drawing_project_associations';
```

### Phase B Verification (Post-Code Deployment)
```bash
# Test API endpoints
curl http://localhost:8001/api/v1/drawings

# Verify components_extracted field present (bug fix)
curl http://localhost:8001/api/v1/drawings | jq '.[0].components_extracted'
# Expected: 71 (not 0 or null)

# Verify projects array present
curl http://localhost:8001/api/v1/drawings | jq '.[0].projects'
# Expected: [] or [{"id": "...", "name": "...", "code": "..."}]

# Test new endpoints
curl -X GET http://localhost:8001/api/v1/drawings/{id}/projects
curl -X POST http://localhost:8001/api/v1/drawings/{id}/projects -d '{"project_ids": ["uuid"]}'
```

---

## Rollback Procedures

### Emergency Rollback (Phase A Only)

**Prerequisites:**
- Phase B code NOT deployed yet
- `drawings.project_id` column still exists

**Steps:**
```bash
# Run rollback SQL script
psql -U user -d drawing_index -f backend/migrations/rollback_phase_a.sql

# Or use Alembic downgrade
alembic downgrade -1
```

⚠️ **DATA LOSS WARNING**: If drawings have multiple projects, only the first (earliest `assigned_at`) will be restored to `project_id`

---

### Rollback Not Possible (Phase B Deployed)

If Phase B code is deployed and clients are using `projects[]` array:
1. **DO NOT** run rollback scripts (will break deployed code)
2. Instead, perform **forward fix**:
   - Identify issue
   - Fix in code
   - Deploy hotfix
3. Phase C (dropping `project_id` column) should be delayed until stability confirmed

---

## Deployment Checklist

### Pre-Deployment
- [ ] Review 18 code locations requiring updates
- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Verify rollback procedure on staging
- [ ] Notify API consumers of upcoming changes

### Phase A Deployment
- [ ] Run Alembic migration: `alembic upgrade head`
- [ ] Verify junction table created: `psql -c "SELECT COUNT(*) FROM drawing_project_associations;"`
- [ ] Verify data migrated: Check association count matches non-null `project_id` count
- [ ] Monitor for errors in logs
- [ ] Existing code should continue working (no downtime)

### Phase B Deployment
- [ ] Deploy updated SQLAlchemy models (Task 1.2)
- [ ] Deploy updated Pydantic schemas (Task 1.3)
- [ ] Deploy new API endpoints (Tasks 1.4, 1.5)
- [ ] Verify `components_extracted` field in API responses (bug fix)
- [ ] Verify `projects[]` array in API responses
- [ ] Test bulk operations
- [ ] Monitor API error rates

### Post-Deployment
- [ ] Run Phase B verification tests
- [ ] Monitor for 48 hours
- [ ] Notify API consumers that many-to-many is live
- [ ] Document timeline for Phase C (column removal)

---

## Timeline

| Phase | Status | Estimated Duration | Notes |
|-------|--------|-------------------|-------|
| **Phase A** | ✅ Ready | 30 min | Migration + data migration |
| **Phase B** | ⏳ Pending | 6-8 hours | Code updates + testing |
| **Phase C** | 🔮 Future | TBD | Wait 30 days after Phase B for stability |

---

## Support & Troubleshooting

### Common Issues

**Issue**: `components_extracted` field showing 0 instead of actual count
**Solution**: This is the bug fix in Story 8.1a AC1. Phase B deployment will fix it.

**Issue**: Multiple projects shown for single drawing after migration
**Solution**: This is expected behavior - many-to-many allows multiple projects.

**Issue**: API returns `project` as null after Phase B
**Solution**: Use `projects[]` array instead. `project` field deprecated.

### Contact
For deployment support, refer to Story 8.1a Dev Notes or contact development team.

---

**Document Version**: 1.0
**Last Updated**: 2025-10-03
**Story**: 8.1a - Backend Foundation & Bug Fix
