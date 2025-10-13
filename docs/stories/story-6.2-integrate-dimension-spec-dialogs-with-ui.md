# Story 6.2: Integrate Dimension & Specification Dialogs with UI

## Status
Approved

## Story

**As a** bridge engineer using the component dimension/specification management system,
**I want** the "Add Dimension" and "Edit Dimension" buttons in the component editor to actually open functional dialogs,
**so that** I can create and modify dimension data for components using the fractional input features from Story 6.1.

## Acceptance Criteria

1. **Add Dimension Integration**: Clicking "Add Dimension" button in ComponentDimensions opens DimensionFormDialog
2. **Edit Dimension Integration**: Clicking edit icon on existing dimension opens DimensionFormDialog with pre-populated data
3. **Delete Dimension Confirmation**: Clicking delete icon prompts for confirmation before deletion
4. **Add Specification Integration**: Clicking "Add Specification" button in ComponentSpecifications opens SpecificationFormDialog (if component exists)
5. **Edit Specification Integration**: Clicking edit icon on existing specification opens SpecificationFormDialog with pre-populated data
6. **Delete Specification Confirmation**: Clicking delete icon prompts for confirmation before deletion
7. **Data Refresh**: After saving or deleting, the dimension/specification list automatically refreshes
8. **Dialog Close**: Clicking cancel or close icon dismisses dialog without saving
9. **E2E Test Validation**: The e2e/dimension-entry-workflow.spec.ts test passes (currently skipping due to missing integration)

## Tasks / Subtasks

- [ ] **Task 1: Integrate DimensionFormDialog with ComponentDimensions** (AC: 1, 2, 3, 7, 8)
  - [ ] Import DimensionFormDialog component
  - [ ] Add React state for dialog open/close (dialogOpen, setDialogOpen)
  - [ ] Add React state for editing dimension (editingDimension, setEditingDimension)
  - [ ] Wire "Add Dimension" button onClick to open dialog with editingDimension=null
  - [ ] Wire "Edit Dimension" icon onClick to open dialog with editingDimension set to selected dimension
  - [ ] Implement delete confirmation dialog for "Delete Dimension" icon
  - [ ] Add DimensionFormDialog JSX with proper props (open, onClose, componentId, dimension, onSave)
  - [ ] Implement onSave callback to close dialog and trigger data refresh via onUpdate prop
  - [ ] Remove TODO comments from lines 68-71, 130-136, 138-146

- [ ] **Task 2: Integrate SpecificationFormDialog with ComponentSpecifications** (AC: 4, 5, 6, 7, 8)
  - [ ] Check if ComponentSpecifications.tsx exists (similar structure to ComponentDimensions)
  - [ ] If exists, apply same integration pattern as Task 1
  - [ ] If not exists, note in completion notes (may be future story)
  - [ ] Import SpecificationFormDialog component
  - [ ] Add React state for dialog management
  - [ ] Wire all buttons to appropriate handlers
  - [ ] Remove any TODO stubs

- [ ] **Task 3: Verify editMode Prop Propagation** (AC: 1-6)
  - [ ] Check ComponentEditor.tsx passes editMode={true} to ComponentDimensions
  - [ ] Check ComponentDetailModal.tsx passes editMode correctly
  - [ ] Verify buttons only appear when editMode={true}
  - [ ] Test in both edit and view modes

- [ ] **Task 4: Add Success Notifications** (AC: 7)
  - [ ] Add toast/snackbar notification on successful dimension save
  - [ ] Add toast/snackbar notification on successful dimension delete
  - [ ] Add toast/snackbar notification on successful specification save
  - [ ] Add toast/snackbar notification on successful specification delete
  - [ ] Use Material-UI Snackbar or existing notification system

- [ ] **Task 5: Write Integration Tests** (AC: 9)
  - [ ] Run existing e2e/dimension-entry-workflow.spec.ts test
  - [ ] Verify test now passes (no longer skips due to missing dialog)
  - [ ] Add integration test for dialog state management
  - [ ] Add integration test for save callback triggering refresh
  - [ ] Add integration test for cancel closing dialog without saving

## Dev Notes

### Context from Story 6.1
Story 6.1 (already completed and archived) created:
- `DimensionFormDialog.tsx` (362 lines) - Full dimension CRUD dialog with fractional input parser
- `SpecificationFormDialog.tsx` (266 lines) - Full specification CRUD dialog
- Fractional input parser with WYSIWYG support ("15 3/4" format)
- Backend migration b02d6db199d3 (display_format column)
- 40 passing tests (7 backend + 33 frontend)

**However**, these dialogs were never wired to the UI components.

### Root Cause Analysis
**File**: `frontend/src/components/editor/ComponentDimensions.tsx`
**Lines**: 68-71, 130-136, 138-146

Current implementation has TODO stubs:
```typescript
// Line 68-71: Add Dimension button
onClick={() => {
  // TODO: Open add dimension dialog
  console.log('Add dimension for component:', componentId);
}}

// Line 130-136: Edit Dimension icon
onClick={() => {
  // TODO: Open edit dimension dialog
  console.log('Edit dimension:', dimension.id);
}}

// Line 138-146: Delete Dimension icon
onClick={() => {
  // TODO: Confirm and delete dimension
  console.log('Delete dimension:', dimension.id);
}}
```

**Expected Behavior**: Clicking buttons should open the DimensionFormDialog from Story 6.1
**Actual Behavior**: Clicking buttons only logs to console (no dialog opens)

### Relevant Source Tree

**Files to Modify**:
- `frontend/src/components/editor/ComponentDimensions.tsx` - Primary integration point
- `frontend/src/components/editor/ComponentSpecifications.tsx` - If exists, same pattern
- `frontend/src/pages/ComponentEditor.tsx` - Verify editMode prop
- `frontend/src/components/ComponentDetailModal.tsx` - Verify editMode prop

**Files to Import**:
- `frontend/src/components/dimensions/DimensionFormDialog.tsx` - Story 6.1 dialog (already exists)
- `frontend/src/components/specifications/SpecificationFormDialog.tsx` - Story 6.1 dialog (already exists)
- `frontend/src/components/dimensions/index.ts` - Export file (already exists)
- `frontend/src/components/specifications/index.ts` - Export file (already exists)

**Existing Patterns to Follow**:
Look at how ComponentDimensions already handles:
- React Query for data fetching (useQuery hook)
- Loading states (CircularProgress)
- Error states (Alert component)
- Edit mode conditional rendering (editMode prop)

### Integration Pattern (Reference Implementation)

Based on Material-UI dialog patterns in the codebase:

```typescript
import React, { useState } from 'react';
import DimensionFormDialog from '../dimensions/DimensionFormDialog';

const ComponentDimensions: React.FC<ComponentDimensionsProps> = ({
  componentId,
  editMode = false,
  onUpdate,
}) => {
  // Add dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDimension, setEditingDimension] = useState<Dimension | null>(null);

  // "Add Dimension" onClick handler
  const handleAddClick = () => {
    setEditingDimension(null); // null = add mode
    setDialogOpen(true);
  };

  // "Edit Dimension" onClick handler
  const handleEditClick = (dimension: Dimension) => {
    setEditingDimension(dimension); // set = edit mode
    setDialogOpen(true);
  };

  // Dialog save callback
  const handleSave = (savedDimension: Dimension) => {
    setDialogOpen(false);
    onUpdate?.(); // Trigger parent to refetch data
  };

  return (
    <Box>
      {/* Existing JSX */}
      <Button onClick={handleAddClick}>Add Dimension</Button>

      {/* Add dialog JSX */}
      <DimensionFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        componentId={componentId}
        dimension={editingDimension}
        onSave={handleSave}
      />
    </Box>
  );
};
```

### Delete Confirmation Pattern

For delete operations, use Material-UI Dialog for confirmation:

```typescript
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';

const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [dimensionToDelete, setDimensionToDelete] = useState<string | null>(null);

const handleDeleteClick = (dimensionId: string) => {
  setDimensionToDelete(dimensionId);
  setDeleteDialogOpen(true);
};

const handleConfirmDelete = async () => {
  if (dimensionToDelete) {
    await deleteDimension(dimensionToDelete);
    setDeleteDialogOpen(false);
    onUpdate?.();
  }
};

// JSX for confirmation dialog
<Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
  <DialogTitle>Delete Dimension?</DialogTitle>
  <DialogContent>
    <DialogContentText>
      Are you sure you want to delete this dimension? This action cannot be undone.
    </DialogContentText>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
    <Button onClick={handleConfirmDelete} color="error">Delete</Button>
  </DialogActions>
</Dialog>
```

### API References

**Dimensions API** (already implemented in Story 6.1):
- `getComponentDimensions(componentId)` - Fetch dimensions list
- `createDimension(componentId, data)` - Create new dimension
- `updateDimension(dimensionId, data)` - Update existing dimension
- `deleteDimension(dimensionId)` - Delete dimension

**Specifications API** (already implemented in Story 6.1):
- `getComponentSpecifications(componentId)` - Fetch specifications list
- `createSpecification(componentId, data)` - Create new specification
- `updateSpecification(specificationId, data)` - Update existing specification
- `deleteSpecification(specificationId)` - Delete specification

All APIs are in `frontend/src/services/api.ts`

### E2E Test Reference

**File**: `frontend/e2e/dimension-entry-workflow.spec.ts`

This test was created to validate the integration and currently skips execution because the dialogs are not wired. Once integration is complete, this test should pass:

**Test Scenarios**:
1. Full workflow: Search → View → Edit → Dimensions → Add button opens dialog
2. Edge case: "No dimensions found" message handling
3. Story 6.1 validation: Fractional input parser in dialog

**Running the test**:
```bash
cd frontend
npx playwright test dimension-entry-workflow.spec.ts --project=chromium
```

**Expected Results After Integration**:
- All 3 test scenarios should execute (not skip)
- Test should validate dialog opens on button click
- Test should validate form fields are present
- Test should validate fractional input support

### Testing

#### Unit/Integration Tests
Create tests in `frontend/src/components/editor/ComponentDimensions.test.tsx`:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import ComponentDimensions from './ComponentDimensions';

describe('ComponentDimensions Dialog Integration', () => {
  it('should open DimensionFormDialog when Add button clicked', () => {
    // Test add dialog opens
  });

  it('should open DimensionFormDialog with dimension data when edit clicked', () => {
    // Test edit dialog opens with pre-populated data
  });

  it('should close dialog on cancel without calling onUpdate', () => {
    // Test cancel behavior
  });

  it('should close dialog and trigger refresh on save', () => {
    // Test save callback
  });
});
```

#### E2E Test Validation
Run the existing E2E test suite:
```bash
cd frontend
npx playwright test dimension-entry-workflow.spec.ts
```

#### Manual Testing Checklist
1. Navigate to `/search`
2. Click "View" on any component
3. Click "Edit" button
4. Click "Dimensions" tab
5. Verify "Add Dimension" button is visible (editMode must be true)
6. Click "Add Dimension" - dialog should open
7. Fill in dimension data with fractional input ("15 3/4")
8. Click "Save" - dialog closes, dimension appears in list
9. Click edit icon on dimension - dialog opens with existing data
10. Modify data and save - changes reflect in list
11. Click delete icon - confirmation dialog appears
12. Confirm delete - dimension removed from list

### Standards to Follow

**React Patterns** (from [coding-standards.md](docs/architecture/coding-standards.md)):
- Functional components with hooks
- useState for local dialog state
- React Query's useQuery for data fetching (already in place)
- Material-UI components for consistency

**TypeScript** (from [coding-standards.md](docs/architecture/coding-standards.md)):
- Strict typing for all props and state
- Define interfaces for dimension/specification types
- Use existing API types from `services/api.ts`

**Import Organization** (from [coding-standards.md](docs/architecture/coding-standards.md)):
```typescript
// 1. React and core libraries
import React, { useState } from 'react';

// 2. Material-UI imports
import { Dialog, Button } from '@mui/material';

// 3. Local imports
import DimensionFormDialog from '../dimensions/DimensionFormDialog';
```

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-13 | 1.0 | Story created from E2E test findings and technical investigation | Bob (Scrum Master) |
| 2025-10-13 | 1.1 | Story validated and approved - Implementation readiness score 10/10, no sharding needed | Sarah (Product Owner) |

## Dev Agent Record

_(This section will be populated by the development agent during implementation)_

### Agent Model Used

_(To be completed by dev agent)_

### Debug Log References

_(To be completed by dev agent)_

### Completion Notes List

_(To be completed by dev agent)_

### File List

_(To be completed by dev agent - all files created, modified, or affected during implementation)_

## QA Results

_(This section will be populated by the QA Agent after review)_
