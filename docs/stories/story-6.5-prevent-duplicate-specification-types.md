# Story 6.5: Prevent Duplicate Specification Types Per Component

**Epic**: 6 - Component Data Management
**Type**: Data Integrity Enhancement (Brownfield)
**Status**: Ready
**Priority**: High
**Estimated Effort**: 2-4 Story Points (~0.5-1 day)
**Blocks**: Story 7.5 (Export Specification Values)
**Pattern**: Same as Story 6.4 (Prevent Duplicate Dimension Types)

---

## User Story

**As a** bridge engineer managing component specifications,
**I want** the system to prevent adding duplicate specification types to the same component,
**So that** specification data remains unambiguous and export operations can clearly map specification types to CSV columns.

---

## Story Context

**Problem Statement:**

Currently, the system allows adding multiple specifications of the same type (e.g., two "material" specifications) to a single component. This creates ambiguity:
- Which "material" value is the correct one?
- How should exports handle multiple "material" values?
- Users may accidentally create duplicates, thinking they're editing existing specifications

This issue blocks Story 7.5 (Export Specification Values), which requires a 1:1 mapping between specification types and CSV columns.

**Existing System Integration:**

- **Epic**: Epic 6 - Component Data Management
- **Related Stories**:
  - Story 6.1: Component Specification Management UI (specification CRUD operations)
  - Story 6.2: Integrate Dimension/Spec Dialogs (specification UI integration)
  - Story 6.4: Prevent Duplicate Dimension Types (identical pattern for dimensions)
  - **Blocks**: Story 7.5 (Export Specification Values) - prevents export ambiguity
- **Components**: SpecificationFormDialog.tsx, ComponentSpecifications.tsx
- **Technology**: React 18 + TypeScript + React Query + Material-UI
- **Backend**: FastAPI + SQLAlchemy with PostgreSQL

**User Impact:**

- **Frequency**: Moderate - users add specifications to components regularly
- **Workflow**: Specification creation and editing
- **Pain Point**: Accidental duplicates create confusion and data integrity issues
- **Value**: Ensures clean, unambiguous specification data for reporting and export

---

## Acceptance Criteria

**Note**: These criteria mirror Story 6.4 for dimensions, adapted for specifications.

### Functional Requirements

**AC1: Frontend Validation - Duplicate Prevention**
```
GIVEN a component already has a specification of type "material"
WHEN user opens the "Add Specification" dialog
THEN the "material" option is disabled in the specification type dropdown
AND disabled option shows tooltip: "This component already has a 'Material' specification. Edit the existing specification instead."
```

**AC2: Frontend Validation - Edit Mode**
```
GIVEN a component has specifications with types: material, finish, grade
WHEN user opens "Edit Specification" dialog for the "material" specification
THEN all specification types EXCEPT "material" are disabled in the dropdown
AND user can keep specification as "material" (not changing type)
AND user CAN change "material" to "coating" (if coating doesn't exist)
AND user CANNOT change "material" to "finish" (finish already exists)
```

**AC3: Backend Validation - API Enforcement**
```
GIVEN a component already has a specification of type "material"
WHEN API receives POST /api/components/{id}/specifications with specification_type="material"
THEN API returns 400 Bad Request
AND error message: "Component already has a specification of type 'material'"
AND specification is NOT created
```

**AC4: Backend Validation - Update Enforcement**
```
GIVEN a component has specifications: material, finish, grade
WHEN API receives PUT /api/specifications/{id} changing "material" to "finish"
THEN API returns 400 Bad Request
AND error message: "Component already has a specification of type 'finish'"
AND specification is NOT updated
```

**AC5: Clear User Feedback**
```
GIVEN user attempts to create duplicate specification via form
WHEN frontend validation prevents submission
THEN user sees clear error message in dialog
AND "Save" button remains disabled while duplicate exists
AND user is directed to edit existing specification instead
```

**AC6: Database Constraint (Optional - Defense in Depth)**
```
GIVEN database schema for component_specifications table
WHEN creating unique constraint on (component_id, specification_type)
THEN database enforces uniqueness at data layer
AND provides final safety net against duplicates
(Note: This AC is optional but highly recommended)
```

### Technical Requirements

**AC7: Existing Specifications Load**
```
GIVEN user opens Add/Edit Specification dialog
WHEN dialog initializes
THEN component's existing specifications are fetched via API
AND existing specification types are identified for validation
AND loading completes before user can select specification type
```

**AC8: Performance**
```
GIVEN specification validation is active
WHEN user interacts with specification forms
THEN validation adds <50ms latency
AND form remains responsive
```

**AC9: Error Handling**
```
GIVEN backend validation fails (400 error)
WHEN frontend receives error response
THEN user-friendly error message is displayed
AND form state is preserved (user doesn't lose data)
AND user can correct and resubmit
```

### Integration Requirements

**AC10: Backward Compatibility - Existing Data**
```
GIVEN database may contain existing duplicate specifications
WHEN this story is deployed
THEN existing duplicates are NOT deleted or modified
AND validation only applies to NEW specification creation/updates
AND admin can run optional cleanup script to identify/resolve existing duplicates
```

**AC11: Dimensions Not Affected**
```
GIVEN dimensions have already implemented duplicate prevention (Story 6.4)
WHEN specification duplicate prevention is implemented
THEN dimension creation/editing continues to work unchanged
```

---

## Technical Notes

### Implementation Approach

**This story follows the EXACT pattern as Story 6.4 (Dimensions).** Reference Story 6.4 for complete implementation details. Key differences:

**Frontend Files**:
- `frontend/src/components/specifications/SpecificationFormDialog.tsx` (instead of DimensionFormDialog.tsx)
- Uses `SPECIFICATION_TYPES` array (7 types) instead of `DIMENSION_TYPES` (9 types)

**Backend Files**:
- `backend/app/services/specification_service.py` - Add validation function
- `backend/app/api/components.py` - Integrate validation into specification endpoints
- Similar to dimension validation but for `ComponentSpecification` model

**Specification Types** (from SpecificationFormDialog.tsx):
- material → "Material"
- finish → "Finish"
- grade → "Grade"
- coating → "Coating"
- treatment → "Treatment"
- standard → "Standard"
- other → "Other"

### Code Pattern (Reference Story 6.4 for full details)

**Frontend Validation**:
```typescript
// SpecificationFormDialog.tsx
const { data: existingSpecifications = [] } = useQuery(
  ['component-specifications', componentId],
  () => getComponentSpecifications(componentId),
  { enabled: open }
);

const usedSpecificationTypes = useMemo(() => {
  if (mode === 'edit' && initialData) {
    return existingSpecifications
      .filter(s => s.id !== initialData.id)
      .map(s => s.specification_type);
  }
  return existingSpecifications.map(s => s.specification_type);
}, [existingSpecifications, mode, initialData]);
```

**Backend Validation**:
```python
# backend/app/services/specification_service.py

def validate_specification_type_unique(
    db: Session,
    component_id: str,
    specification_type: str,
    specification_id: Optional[str] = None
) -> None:
    """Validate that specification_type is unique for component."""
    query = db.query(ComponentSpecification).filter(
        ComponentSpecification.component_id == component_id,
        ComponentSpecification.specification_type == specification_type
    )

    if specification_id:
        query = query.filter(ComponentSpecification.id != specification_id)

    existing = query.first()

    if existing:
        raise ValueError(
            f"Component already has a specification of type '{specification_type}'"
        )
```

### Files Involved

**Frontend Files to Modify**:
- `frontend/src/components/specifications/SpecificationFormDialog.tsx`

**Backend Files to Modify**:
- `backend/app/services/specification_service.py`
- `backend/app/api/components.py` (specification endpoints)
- `backend/migrations/versions/YYYY_MM_DD_*.py` (optional unique constraint)

**Test Files**:
- `frontend/src/components/specifications/__tests__/SpecificationFormDialog.test.tsx`
- `backend/tests/test_specification_api.py`

### Edge Cases

Same as Story 6.4, adapted for specifications:
1. Edit mode - same type allowed
2. Edit mode - change to existing type prevented
3. Edit mode - change to available type allowed
4. Concurrent creation - backend catches duplicates
5. Existing duplicates - remain unchanged
6. Case sensitivity - case-insensitive comparison
7. API direct access - backend validation catches it

### Database Constraint (Optional)

```sql
-- Migration: Add unique constraint
-- backend/migrations/versions/YYYY_MM_DD_add_specification_unique_constraint.py

"""Add unique constraint on (component_id, specification_type)"""

def upgrade():
    op.create_unique_constraint(
        'uq_component_specification_type',
        'component_specifications',
        ['component_id', 'specification_type']
    )

def downgrade():
    op.drop_constraint(
        'uq_component_specification_type',
        'component_specifications',
        type_='unique'
    )
```

---

## Definition of Done

- [ ] Frontend: Specification type dropdown disables already-used types
- [ ] Frontend: Disabled options show helpful tooltip
- [ ] Frontend: Edit mode allows keeping current type, prevents changing to existing type
- [ ] Frontend: Form validation prevents submission of duplicate types
- [ ] Backend: API validation function created for specification type uniqueness
- [ ] Backend: Create specification endpoint validates and returns 400 for duplicates
- [ ] Backend: Update specification endpoint validates type changes
- [ ] Backend: Error messages are clear and user-friendly
- [ ] Database: Unique constraint added (optional but recommended)
- [ ] Frontend unit tests for duplicate prevention logic
- [ ] Backend API tests for duplicate prevention
- [ ] Manual testing completed
- [ ] Existing data scanned for duplicates (cleanup script run if needed)
- [ ] Code review completed
- [ ] QA sign-off

---

## Dependencies

**Blocks**:
- **Story 7.5: Export Specification Values in CSV** (MUST complete this story first)
  - Export feature requires 1:1 mapping between specification types and CSV columns
  - Without duplicate prevention, export ambiguity occurs (which "material" to export?)

**Pattern Reference**:
- **Story 6.4: Prevent Duplicate Dimension Types** (identical pattern, use as implementation guide)

---

## Notes

**Implementation Efficiency**: This story should be very quick to implement (~4 hours) because it's a direct copy-paste-adapt from Story 6.4. The logic is identical, only the entity names and type lists differ.

**Why This Matters for Export**: Story 7.5 needs to map each specification type to a CSV column (e.g., "Material" column). If a component has two "material" specifications, which value should appear in the "Material" column? This story prevents that ambiguity.

**Cleanup Script**: Reuse the cleanup script pattern from Story 6.4, adapted for specifications.

---

**Story Created**: October 2025
**Author**: Mary (Business Analyst) + Neville (Stakeholder)
**Epic**: 6 - Component Data Management
