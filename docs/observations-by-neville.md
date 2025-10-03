<strikethrough>check /docs/stories/backlog and /docs/stories-archive/ to see if any of these observations are already accounted for in any of the existing stories</strikethrough>

make a yagni folder

---

## Story 8.1 Sharding Outcome (2025-10-03)

**Context:** Story 8.1 (Project-Drawing Association Management) underwent PO validation by Sarah (Product Owner) and SM checklist validation by Bob (Scrum Master).

**Critical Issues Identified:**
1. **Breaking Schema Change:** Story proposed many-to-many migration from existing one-to-many but lacked migration strategy
2. **Bug Fix Wrong Target:** AC1 claimed query optimization needed, but actual bug was missing `components_extracted` field in `DrawingResponse` model
3. **API Endpoint Conflict:** Story didn't acknowledge existing `/api/v1/projects/assign-drawings` endpoint
4. **Scope Too Large:** 64 subtasks, 12-16 hours, backend + frontend tightly coupled

**Resolution: SHARDED into TWO stories**

### ✅ Story 8.1a: Backend Foundation & Bug Fix (8-10h)
**Status:** Ready for Development
**File:** [docs/stories/story-8.1a-backend-foundation-bug-fix.md](docs/stories/story-8.1a-backend-foundation-bug-fix.md)

**Scope:**
- AC1: Component count bug (CORRECTED - add `components_extracted` to DrawingResponse)
- AC2: Many-to-many data model + 3-phase migration strategy
- AC3: Complete data migration with rollback procedure
- AC4: Backend API endpoints (8 new endpoints)
- AC5: Performance & data integrity
- Tasks: Migration planning (1.0) + Backend foundation (1.1-1.7)

**Key Fixes Applied:**
- Component count root cause corrected: `backend/app/models/drawing.py` missing field, NOT query optimization
- 3-phase migration added: Create junction → Deploy models → Drop old column
- Data migration SQL provided with rollback
- Existing API refactor noted (not duplicate)
- Breaking changes documented

**Blocks:** Story 8.1b (cannot start until 8.1a deployed)

---

### ✅ Story 8.1b: Project-Drawing Association UI (6-8h)
**Status:** Ready for Development (after 8.1a complete)
**File:** [docs/stories/story-8.1b-project-association-ui.md](docs/stories/story-8.1b-project-association-ui.md)

**Dependencies:** Story 8.1a MUST BE COMPLETE
- Junction table operational
- Backend APIs deployed
- Component count bug verified fixed

**Scope:**
- AC1: Upload flow project selector
- AC2: Tag Pills display (Material-UI Chips)
- AC3: Bulk operations toolbar
- AC4: Project filter (multi-select + unassigned toggle)
- AC5: Project detail page drawings tab
- AC6: User feedback (toasts, confirmations, loading states)
- AC7: Responsive design & accessibility
- Tasks: All frontend UI implementation (1.1-9.2)

**UX Pattern:** Tag Pills + Bulk Toolbar Hybrid (Tree of Thoughts winner from original story)

---

### 📦 Original Story Archived
**File:** [docs/stories-archive/story-8.1-project-drawing-association-management.md](docs/stories-archive/story-8.1-project-drawing-association-management.md)

**Why Archived:**
- Critical issues identified during PO validation
- Breaking schema change needed careful migration planning
- Bug fix targeted wrong code
- Scope too large for single story (risk reduction via sharding)

---

### 📊 Sharding Impact

| Metric | Original 8.1 | Sharded (8.1a + 8.1b) |
|--------|--------------|------------------------|
| **Total Effort** | 12-16h | 14-18h (migration overhead) |
| **Subtasks** | 64 tasks | 8.1a: 29 tasks, 8.1b: 35 tasks |
| **Risk Level** | HIGH (breaking change + UI) | MEDIUM (isolated concerns) |
| **Parallel Work** | No | No (8.1b blocked by 8.1a) |
| **Bug Fix Delivery** | Coupled with feature | Independent in 8.1a |
| **Migration Strategy** | Missing | Complete 3-phase plan |

---

### 🎯 Next Actions

1. **Immediate:** Review Story 8.1a for dev readiness
2. **Start:** Begin Story 8.1a implementation (backend + bug fix)
3. **Block:** Do NOT start Story 8.1b until 8.1a deployed and verified
4. **Verify:** Before 8.1b start, check:
   - `GET /api/v1/drawings` returns `components_extracted: 71` (not 0)
   - `GET /api/v1/drawings` returns `projects: []` array
   - New endpoints accessible: `/api/v1/drawings/{id}/projects`, bulk endpoints

---

### 📝 Validation Summary

**PO Validation Score:** 72/100 (original Story 8.1)
**SM Checklist Score:** 6/10 clarity (original Story 8.1)

**Sharded Stories:**
- **Story 8.1a:** All critical issues resolved, migration strategy complete, ready for dev
- **Story 8.1b:** Clear UI scope, blocked on 8.1a, ready for dev once unblocked

**Validation Outcome:** ✅ CONDITIONAL GO (with sharding and fixes applied)


