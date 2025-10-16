# Story 6.4: Prevent Duplicate Dimension Types Per Component

**Epic**: 6 - Component Data Management
**Type**: Data Integrity Enhancement (Brownfield)
**Status**: Ready
**Priority**: High
**Estimated Effort**: 3-5 Story Points (~1 day)
**Blocks**: Story 7.4 (Export Dimension Values)

---

## User Story

**As a** bridge engineer managing component dimensions,
**I want** the system to prevent adding duplicate dimension types to the same component,
**So that** dimension data remains unambiguous and export operations can clearly map dimension types to CSV columns.

---

## Story Context

**Problem Statement:**

Currently, the system allows adding multiple dimensions of the same type (e.g., two "length" dimensions) to a single component. This creates ambiguity:
- Which "length" value is the correct one?
- How should exports handle multiple "length" values?
- Users may accidentally create duplicates, thinking they're editing existing dimensions

This issue blocks Story 7.4 (Export Dimension Values), which requires a 1:1 mapping between dimension types and CSV columns.

**Existing System Integration:**

- **Epic**: Epic 6 - Component Data Management
- **Related Stories**:
  - Story 6.1: Component Dimension Management UI (dimension CRUD operations)
  - Story 6.2: Integrate Dimension/Spec Dialogs (dimension UI integration)
  - Story 6.3: Dimension Immediate Display Fix (dimension list updates)
  - **Blocks**: Story 7.4 (Export Dimension Values) - prevents export ambiguity
- **Components**: DimensionFormDialog.tsx, ComponentDimensions.tsx
- **Technology**: React 18 + TypeScript + React Query + Material-UI
- **Backend**: FastAPI + SQLAlchemy with PostgreSQL

**User Impact:**

- **Frequency**: Moderate - users add dimensions to components regularly
- **Workflow**: Dimension creation and editing
- **Pain Point**: Accidental duplicates create confusion and data integrity issues
- **Value**: Ensures clean, unambiguous dimension data for reporting and export

---

## Acceptance Criteria

### Functional Requirements

**AC1: Frontend Validation - Duplicate Prevention**
```
GIVEN a component already has a dimension of type "length"
WHEN user opens the "Add Dimension" dialog
THEN the "length" option is disabled in the dimension type dropdown
AND disabled option shows tooltip: "This component already has a 'Length' dimension. Edit the existing dimension instead."
```

**AC2: Frontend Validation - Edit Mode**
```
GIVEN a component has dimensions with types: length, width, height
WHEN user opens "Edit Dimension" dialog for the "length" dimension
THEN all dimension types EXCEPT "length" are disabled in the dropdown
AND user can keep dimension as "length" (not changing type)
AND user CAN change "length" to "diameter" (if diameter doesn't exist)
AND user CANNOT change "length" to "width" (width already exists)
```

**AC3: Backend Validation - API Enforcement**
```
GIVEN a component already has a dimension of type "length"
WHEN API receives POST /api/components/{id}/dimensions with dimension_type="length"
THEN API returns 400 Bad Request
AND error message: "Component already has a dimension of type 'length'"
AND dimension is NOT created
```

**AC4: Backend Validation - Update Enforcement**
```
GIVEN a component has dimensions: length, width, height
WHEN API receives PUT /api/dimensions/{id} changing "length" to "width"
THEN API returns 400 Bad Request
AND error message: "Component already has a dimension of type 'width'"
AND dimension is NOT updated
```

**AC5: Clear User Feedback**
```
GIVEN user attempts to create duplicate dimension via form
WHEN frontend validation prevents submission
THEN user sees clear error message in dialog
AND "Save" button remains disabled while duplicate exists
AND user is directed to edit existing dimension instead
```

**AC6: Database Constraint (Optional - Defense in Depth)**
```
GIVEN database schema for component_dimensions table
WHEN creating unique constraint on (component_id, dimension_type)
THEN database enforces uniqueness at data layer
AND provides final safety net against duplicates
(Note: This AC is optional but highly recommended)
```

### Technical Requirements

**AC7: Existing Dimensions Load**
```
GIVEN user opens Add/Edit Dimension dialog
WHEN dialog initializes
THEN component's existing dimensions are fetched via API
AND existing dimension types are identified for validation
AND loading completes before user can select dimension type
```

**AC8: Performance**
```
GIVEN dimension validation is active
WHEN user interacts with dimension forms
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
GIVEN database may contain existing duplicate dimensions
WHEN this story is deployed
THEN existing duplicates are NOT deleted or modified
AND validation only applies to NEW dimension creation/updates
AND admin can run optional cleanup script to identify/resolve existing duplicates
```

**AC11: Specifications Not Affected**
```
GIVEN specifications have similar structure to dimensions
WHEN dimension duplicate prevention is implemented
THEN specification creation/editing continues to work unchanged
AND specifications are NOT subject to duplicate prevention (separate story if needed)
```

---

## Technical Notes

### Implementation Approach

**Frontend Implementation** (Priority: High)

**Step 1: Fetch Existing Dimensions**
```typescript
// DimensionFormDialog.tsx
const { data: existingDimensions = [] } = useQuery(
  ['component-dimensions', componentId],
  () => getComponentDimensions(componentId),
  { enabled: open } // Only fetch when dialog is open
);

// Extract dimension types already in use
const usedDimensionTypes = useMemo(() => {
  if (mode === 'edit' && initialData) {
    // In edit mode, allow keeping current type
    return existingDimensions
      .filter(d => d.id !== initialData.id)
      .map(d => d.dimension_type);
  }
  return existingDimensions.map(d => d.dimension_type);
}, [existingDimensions, mode, initialData]);
```

**Step 2: Disable Used Dimension Types**
```typescript
// Dimension type select field
<Select {...field} label="Dimension Type *">
  {DIMENSION_TYPES.map((type) => {
    const isDisabled = usedDimensionTypes.includes(type.value);
    return (
      <MenuItem
        key={type.value}
        value={type.value}
        disabled={isDisabled}
      >
        <Tooltip
          title={isDisabled ?
            `This component already has a '${type.label}' dimension. Edit the existing dimension instead.` :
            ''}
          placement="right"
        >
          <span>{type.label}</span>
        </Tooltip>
      </MenuItem>
    );
  })}
</Select>
```

**Step 3: Validation Schema Update**
```typescript
const dimensionSchema = yup.object({
  dimension_type: yup
    .string()
    .required('Dimension type is required')
    .oneOf(DIMENSION_TYPES.map(d => d.value))
    .test('no-duplicate', 'This dimension type already exists for this component', (value) => {
      return !usedDimensionTypes.includes(value);
    }),
  // ... other fields
});
```

**Backend Implementation** (Priority: High)

**Step 1: Validation Service Function**
```python
# backend/app/services/dimension_service.py

def validate_dimension_type_unique(
    db: Session,
    component_id: str,
    dimension_type: str,
    dimension_id: Optional[str] = None
) -> None:
    """
    Validate that dimension_type is unique for component.

    Args:
        component_id: Component UUID
        dimension_type: Dimension type to validate
        dimension_id: If updating, exclude this dimension from check

    Raises:
        ValueError: If duplicate dimension type exists
    """
    query = db.query(ComponentDimension).filter(
        ComponentDimension.component_id == component_id,
        ComponentDimension.dimension_type == dimension_type
    )

    if dimension_id:
        # Updating existing dimension - exclude self from check
        query = query.filter(ComponentDimension.id != dimension_id)

    existing = query.first()

    if existing:
        raise ValueError(
            f"Component already has a dimension of type '{dimension_type}'"
        )
```

**Step 2: API Endpoint Integration**
```python
# backend/app/api/components.py

@router.post("/{component_id}/dimensions", response_model=DimensionResponse)
def create_dimension(
    component_id: str,
    dimension_data: DimensionCreate,
    db: Session = Depends(get_db)
):
    try:
        # Validate uniqueness
        validate_dimension_type_unique(
            db,
            component_id,
            dimension_data.dimension_type
        )

        # Create dimension
        new_dimension = dimension_service.create_dimension(db, component_id, dimension_data)
        return new_dimension

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/dimensions/{dimension_id}", response_model=DimensionResponse)
def update_dimension(
    dimension_id: str,
    dimension_data: DimensionUpdate,
    db: Session = Depends(get_db)
):
    dimension = db.query(ComponentDimension).filter_by(id=dimension_id).first()
    if not dimension:
        raise HTTPException(status_code=404, detail="Dimension not found")

    try:
        # Validate uniqueness if dimension_type is changing
        if dimension_data.dimension_type != dimension.dimension_type:
            validate_dimension_type_unique(
                db,
                dimension.component_id,
                dimension_data.dimension_type,
                dimension_id=dimension_id  # Exclude self
            )

        # Update dimension
        updated_dimension = dimension_service.update_dimension(db, dimension_id, dimension_data)
        return updated_dimension

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

**Database Constraint (Optional - Recommended)**

```sql
-- Migration: Add unique constraint
-- backend/migrations/versions/YYYY_MM_DD_add_dimension_unique_constraint.py

"""Add unique constraint on (component_id, dimension_type)"""

def upgrade():
    # Optional: Clean up existing duplicates first
    # (Manual intervention may be needed)

    # Add unique constraint
    op.create_unique_constraint(
        'uq_component_dimension_type',
        'component_dimensions',
        ['component_id', 'dimension_type']
    )

def downgrade():
    op.drop_constraint(
        'uq_component_dimension_type',
        'component_dimensions',
        type_='unique'
    )
```

### Files Involved

**Frontend Files to Modify**:
- `frontend/src/components/dimensions/DimensionFormDialog.tsx` - Add duplicate validation logic
- `frontend/src/components/editor/ComponentDimensions.tsx` - No changes needed (already has dimension list)

**Backend Files to Modify**:
- `backend/app/services/dimension_service.py` - Add validation function
- `backend/app/api/components.py` - Integrate validation into create/update endpoints
- `backend/migrations/versions/YYYY_MM_DD_*.py` - Optional unique constraint migration

**Test Files to Create/Modify**:
- `frontend/src/components/dimensions/__tests__/DimensionFormDialog.test.tsx` - Add duplicate validation tests
- `backend/tests/test_dimension_api.py` - Add duplicate prevention API tests

### Edge Cases to Handle

1. **Edit Mode - Same Type**: User edits "length" dimension, keeps type as "length" → ALLOWED (not changing type)
2. **Edit Mode - Change to Existing**: User changes "length" to "width" (width exists) → PREVENTED
3. **Edit Mode - Change to Available**: User changes "length" to "diameter" (diameter doesn't exist) → ALLOWED
4. **Concurrent Creation**: Two users add same dimension type simultaneously → Backend validation catches it, one succeeds, one fails with 400 error
5. **Existing Duplicates**: Component already has duplicate "length" dimensions from before validation → Existing duplicates remain, new duplicates prevented
6. **Case Sensitivity**: Backend stores "length", user tries "Length" → Should be case-insensitive comparison
7. **API Direct Access**: User bypasses UI and calls API directly → Backend validation catches it

### Testing Strategy

**Frontend Tests**:
```typescript
describe('DimensionFormDialog - Duplicate Prevention', () => {
  it('disables dimension types already in use for component', () => {
    // Component has "length" dimension
    // Open Add dialog
    // Verify "length" option is disabled
  });

  it('shows tooltip on disabled dimension types', () => {
    // Hover over disabled option
    // Verify tooltip message appears
  });

  it('allows changing dimension type in edit mode if target type is available', () => {
    // Component has length, width
    // Edit "length" dimension, change to "diameter"
    // Verify allowed
  });

  it('prevents changing dimension type in edit mode if target type exists', () => {
    // Component has length, width
    // Edit "length" dimension, try to change to "width"
    // Verify prevented
  });
});
```

**Backend Tests**:
```python
def test_create_dimension_duplicate_prevented(client, db, component_id):
    # Create "length" dimension
    response = client.post(f"/api/components/{component_id}/dimensions", json={
        "dimension_type": "length",
        "nominal_value": 15.5,
        "unit": "in"
    })
    assert response.status_code == 200

    # Try to create another "length" dimension
    response = client.post(f"/api/components/{component_id}/dimensions", json={
        "dimension_type": "length",
        "nominal_value": 20.0,
        "unit": "in"
    })
    assert response.status_code == 400
    assert "already has a dimension of type" in response.json()["detail"]

def test_update_dimension_type_to_existing_prevented(client, db, component_id):
    # Component has length and width dimensions
    # Try to change width to length
    response = client.put(f"/api/dimensions/{width_dimension_id}", json={
        "dimension_type": "length",  # Trying to change to existing type
        "nominal_value": 10.0,
        "unit": "in"
    })
    assert response.status_code == 400
    assert "already has a dimension of type" in response.json()["detail"]
```

**Manual Test Script**:
1. Create component with "length" dimension
2. Open "Add Dimension" dialog
3. Verify "Length" option is disabled in dropdown
4. Hover over disabled option → verify tooltip appears
5. Select "Width" and save → verify succeeds
6. Open "Add Dimension" again
7. Verify both "Length" and "Width" are now disabled
8. Edit "Length" dimension
9. Try to change type to "Width" → verify prevented with error message
10. Change type to "Diameter" → verify allowed
11. Use API client (Postman) to attempt creating duplicate via API → verify 400 error

### Cleanup Script for Existing Duplicates (Optional)

```python
# scripts/cleanup_duplicate_dimensions.py
"""
Identify and optionally resolve existing duplicate dimensions.
Run this BEFORE applying database unique constraint.
"""

def find_duplicate_dimensions(db: Session):
    """Find components with duplicate dimension types."""
    query = """
    SELECT component_id, dimension_type, COUNT(*) as count
    FROM component_dimensions
    GROUP BY component_id, dimension_type
    HAVING COUNT(*) > 1
    """
    results = db.execute(query).fetchall()
    return results

def resolve_duplicates_interactive(db: Session):
    """Interactive CLI to resolve duplicate dimensions."""
    duplicates = find_duplicate_dimensions(db)

    if not duplicates:
        print("No duplicate dimensions found.")
        return

    print(f"Found {len(duplicates)} cases of duplicate dimension types:")

    for component_id, dimension_type, count in duplicates:
        print(f"\nComponent {component_id}: {count} '{dimension_type}' dimensions")

        # Fetch all dimensions of this type for component
        dimensions = db.query(ComponentDimension).filter(
            ComponentDimension.component_id == component_id,
            ComponentDimension.dimension_type == dimension_type
        ).all()

        # Display options
        for i, dim in enumerate(dimensions):
            print(f"  {i+1}. Value: {dim.nominal_value} {dim.unit}, Created: {dim.created_at}")

        # Prompt for action
        choice = input("Keep which dimension? (enter number, or 's' to skip): ")

        if choice.lower() == 's':
            continue

        try:
            keep_index = int(choice) - 1
            if 0 <= keep_index < len(dimensions):
                # Delete all except chosen one
                for i, dim in enumerate(dimensions):
                    if i != keep_index:
                        db.delete(dim)
                db.commit()
                print(f"Deleted {len(dimensions) - 1} duplicate dimension(s)")
            else:
                print("Invalid choice, skipping")
        except ValueError:
            print("Invalid input, skipping")

if __name__ == "__main__":
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        resolve_duplicates_interactive(db)
    finally:
        db.close()
```

---

## Definition of Done

- [ ] Frontend: Dimension type dropdown disables already-used types
- [ ] Frontend: Disabled options show helpful tooltip
- [ ] Frontend: Edit mode allows keeping current type, prevents changing to existing type
- [ ] Frontend: Form validation prevents submission of duplicate types
- [ ] Backend: API validation function created for dimension type uniqueness
- [ ] Backend: Create dimension endpoint validates and returns 400 for duplicates
- [ ] Backend: Update dimension endpoint validates type changes
- [ ] Backend: Error messages are clear and user-friendly
- [ ] Database: Unique constraint added (optional but recommended)
- [ ] Frontend unit tests for duplicate prevention logic
- [ ] Backend API tests for duplicate prevention
- [ ] Manual testing completed with test script
- [ ] Existing data scanned for duplicates (cleanup script run if needed)
- [ ] Documentation updated (API docs, schema docs)
- [ ] Code review completed
- [ ] QA sign-off

---

## Dependencies

**Blocks**:
- **Story 7.4: Export Dimension Values in CSV** (MUST complete this story first)
  - Export feature requires 1:1 mapping between dimension types and CSV columns
  - Without duplicate prevention, export ambiguity occurs (which "length" to export?)

**No Prerequisites**: This story can be implemented immediately

---

## Notes

**Why This Matters for Export**: Story 7.4 needs to map each dimension type to a CSV column (e.g., "Length" column). If a component has two "length" dimensions, which value should appear in the "Length" column? This story prevents that ambiguity by ensuring at most one dimension per type per component.

**Specifications**: This story focuses on dimensions only. If specifications should also prevent duplicates (e.g., only one "material" spec per component), that would be a separate story (Story 6.5).

**Database Constraint Recommendation**: While frontend and backend validation are sufficient, adding a database unique constraint provides defense-in-depth and prevents duplicates from any code path (admin scripts, data migrations, etc.). Highly recommended.

**Existing Duplicates**: If the database contains existing duplicate dimensions, they will continue to exist and function. This validation only prevents NEW duplicates. Run the optional cleanup script to identify and resolve existing duplicates if needed.

**User Education**: Consider adding help text to the dimension form explaining: "Each component can have at most one dimension per type. To change a dimension value, edit the existing dimension instead of creating a new one."

---

## QA Results

**Review Date**: 2025-10-15
**Reviewer**: Quinn (QA Agent)
**Gate Decision**: ✅ **APPROVED with CONCERNS**
**Gate File**: [docs/qa/gates/6.4-prevent-duplicate-dimension-types.yml](../qa/gates/6.4-prevent-duplicate-dimension-types.yml)
**Risk Score**: 7/12 (Medium)

### Summary

Story 6.4 is structurally sound with comprehensive acceptance criteria and clear technical guidance. The story is **approved for implementation** with several medium-severity concerns that should be addressed during development.

### Issues Identified

**🔒 SEC-001: Case Sensitivity in Dimension Type Validation** (Medium)
- **Issue**: Edge Case 6 allows "length" and "Length" as separate dimension types, creating potential user confusion
- **Impact**: Users may unintentionally create duplicates with different casing
- **Recommendation**: Implement case-INSENSITIVE validation using `.lower()` comparison in both frontend and backend

**⚠️ REL-001: Concurrent Dimension Creation Race Condition** (Medium)
- **Issue**: Two users could simultaneously create the same dimension type without proper database-level protection
- **Impact**: Application-level validation alone is susceptible to race conditions
- **Recommendation**: Make AC6 (database unique constraint) MANDATORY instead of optional for defense-in-depth

**🧪 TEST-001: Database Migration Testing Strategy Undefined** (Low)
- **Issue**: Story doesn't specify how to test migration with existing duplicate data
- **Impact**: Migration could fail or behave unexpectedly if duplicates exist
- **Recommendation**: Add pre-migration duplicate detection check and document rollback strategy

### Strengths
- ✅ Comprehensive acceptance criteria covering functional, technical, and integration requirements
- ✅ Clear implementation code examples for both frontend and backend
- ✅ Edge cases thoroughly documented with 7 specific test scenarios
- ✅ Cleanup script provided for handling existing duplicate data
- ✅ Backward compatibility explicitly addressed (AC10)
- ✅ Proper dependency blocking for Story 7.4

### Approval Conditions
1. Dev team acknowledges SEC-001 and commits to case-insensitive validation
2. Database constraint (AC6) is implemented as MANDATORY, not optional
3. Migration includes duplicate detection pre-check

### Next Steps
- **Story Manager**: Update AC6 to mark constraint as MANDATORY
- **Story Manager**: Add note about case-insensitive validation to AC3 and AC4
- **Dev Agent**: Implement with focus on SEC-001 and REL-001 mitigations
- **QA Agent**: Verify case-insensitive validation and constraint handling in testing

---

**Story Created**: October 2025
**Author**: Mary (Business Analyst) + Neville (Stakeholder)
**Epic**: 6 - Component Data Management
