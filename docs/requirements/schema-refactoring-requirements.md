# Schema System Refactoring - Requirements Document

**Document Version**: 1.0
**Date**: 2025-09-30
**Status**: Draft
**Owner**: Business Analyst (Mary)
**Document Type**: Functional & Technical Requirements

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Functional Requirements](#functional-requirements)
4. [Non-Functional Requirements](#non-functional-requirements)
5. [Implementation Considerations](#implementation-considerations)
6. [Acceptance Testing Plan](#acceptance-testing-plan)
7. [Summary & Next Steps](#summary-and-next-steps)

---

## Executive Summary

### Purpose

This document outlines the functional and technical requirements for refactoring the Component Schema management system to address critical usability and data integrity issues identified during user testing.

### Scope

- Frontend schema management UI (create, edit, delete operations)
- Backend validation logic and error messaging
- State management for schema CRUD operations
- Schema field type implementations (with focus on multi-select and comprehensive testing of all types)

### Impact

**Medium-High** - Affects all users creating or managing component schemas, which is core to the flexible component system.

### Priority

**High** - Multiple critical user experience issues blocking effective schema management.

### Known Affected Areas

- Schema naming validation
- Post-creation navigation
- Field addition workflows
- Schema deletion workflows (to be included)
- Multi-select field type (confirmed issue)
- Other field types require comprehensive testing

### Key Assumptions

- Default schema is hardcoded and should be protected from modification/deletion
- Multi-select is the only **confirmed** field type issue; others need testing
- Schema deletion may have dependencies (components using schema) requiring safeguards
- Current schema validation rules exist in backend but aren't exposed to frontend
- Only 3 schemas currently exist and all are sample data (low risk)

---

## Problem Statement

### Current State Issues

The Component Schema management system exhibits seven critical issues that impede user productivity and data integrity:

### 1. Schema Naming Validation Failure

- **Symptom**: Save operation fails silently when schema name contains invalid characters
- **User Impact**: Users receive no guidance on naming rules, leading to confusion and repeated failed attempts
- **Root Cause**: Backend validation exists but error messages not propagated to frontend UI
- **Severity**: High - Blocks schema creation workflow

### 2. Post-Creation Navigation Breakdown

- **Symptom**: After successfully creating a new schema, the schema management page displays blank
- **User Impact**: Users cannot verify schema creation success or continue working with schemas
- **Expected Behavior**: Return to schema list view showing all schemas including newly created one
- **Severity**: High - Breaks user workflow continuity

### 3. Field Addition State Management

- **Symptom**: Adding new fields to existing schema does not enable "Save" button
- **User Impact**: Users must make unrelated changes (e.g., edit schema name) to trigger save-enabled state
- **Workaround**: Edit schema name first, then save captures both changes
- **Severity**: Medium - Confusing UX with workaround available

### 4. Schema Name Update Persistence

- **Symptom**: Changes to schema names fail to persist after save
- **User Impact**: Cannot rename schemas after initial creation
- **Severity**: High - Prevents schema name corrections and organization

### 5. Multi-Select Field Type Implementation

- **Symptom**: Multi-select field type "fails to actuate" during schema editing
- **User Impact**: Cannot create multi-select fields for components
- **Needs Clarification**: Specific failure mode (rendering, validation, data persistence)
- **Severity**: Medium - Blocks specific field type functionality

### 6. Default Schema Mutability

- **Symptom**: Hardcoded default schema is currently editable by users
- **User Impact**: Risk of corrupting system-level schema that other components depend on
- **Expected Behavior**: Default schema should be read-only/static
- **Severity**: Medium-High - Data integrity risk

### 7. Schema Deletion Safeguards (Scope Addition)

- **Symptom**: Schema deletion workflow and dependency checking unknown/untested
- **User Impact**: Potential data loss or orphaned components if schemas deleted while in use
- **Required**: Validation that prevents deletion of schemas currently assigned to components
- **Severity**: High - Data integrity and system stability risk

---

## Functional Requirements

### FR-1: Schema Naming Validation & User Feedback

**Requirement**: Implement client-side and server-side validation for schema names with clear user feedback.

**Acceptance Criteria:**
- AC-1.1: Display validation rules to user before/during schema name entry
- AC-1.2: Provide real-time feedback on name validity as user types
- AC-1.3: Show clear error messages when invalid characters detected
- AC-1.4: Prevent save submission if name validation fails
- AC-1.5: Error messages specify which characters are invalid and why

**Validation Rules** (to be confirmed with backend):
- Allowed characters: Letters (a-z, A-Z), numbers (0-9), hyphens (-), underscores (_)
- Length constraints: Min 3 characters, Max 100 characters
- No leading/trailing spaces
- Must start with letter or number
- Case-insensitive uniqueness check within project scope

**UI Components:**
- Inline validation message below name field
- Character counter showing remaining length
- Visual indicator (green check/red X) for valid/invalid state

---

### FR-2: Post-Creation Navigation & Success Confirmation

**Requirement**: After successful schema creation, return user to schema list view with success confirmation.

**Acceptance Criteria:**
- AC-2.1: On successful save, redirect to schema list page
- AC-2.2: Display success toast/notification: "Schema '[name]' created successfully"
- AC-2.3: Newly created schema appears in list (highlight or scroll to it)
- AC-2.4: Schema list refreshes to show current state
- AC-2.5: If navigation fails, keep user on form with success message

**Navigation Flow:**
1. User submits valid schema creation form
2. Backend creates schema, returns success + schema ID
3. Frontend displays success message
4. Frontend navigates to `/schemas?project=[id]&highlight=[new-schema-id]`
5. List view loads and highlights newly created schema

---

### FR-3: Field Addition Save State Management

**Requirement**: Adding, editing, or removing schema fields must trigger dirty state and enable save button.

**Acceptance Criteria:**
- AC-3.1: Adding new field to schema enables "Save" button
- AC-3.2: Editing existing field properties enables "Save" button
- AC-3.3: Removing field from schema enables "Save" button
- AC-3.4: Reordering fields enables "Save" button
- AC-3.5: "Save" button disabled when no changes detected
- AC-3.6: Unsaved changes warning when navigating away

**State Management:**
- Track initial schema state (snapshot on load)
- Compare current state to initial state on any field change
- Set `isDirty = true` when states differ
- Enable save button when `isDirty === true`

---

### FR-4: Schema Name Update Persistence

**Requirement**: Schema name changes must persist correctly to database.

**Acceptance Criteria:**
- AC-4.1: Editing schema name updates backend successfully
- AC-4.2: Updated name appears in schema list immediately
- AC-4.3: Updated name displays in edit form on reload
- AC-4.4: Name uniqueness validation applied during update
- AC-4.5: Audit trail captures name change with timestamp

**Backend Requirements:**
- PATCH endpoint accepts schema name updates
- Validate name uniqueness excluding current schema
- Return updated schema object in response
- Log schema name changes to audit table

---

### FR-5: Multi-Select Field Type Implementation

**Requirement**: Multi-select field type must function correctly in schema editor and component forms.

**Acceptance Criteria:**
- AC-5.1: Schema editor allows creating multi-select field type
- AC-5.2: Multi-select field accepts options configuration (list of values)
- AC-5.3: Field config saves correctly to database
- AC-5.4: Component forms render multi-select fields properly
- AC-5.5: Users can select multiple values from options list
- AC-5.6: Selected values persist to component dynamic_data correctly

**Field Configuration:**
```json
{
  "field_type": "multiselect",
  "field_config": {
    "options": ["Option 1", "Option 2", "Option 3"],
    "min_selections": 0,
    "max_selections": null,
    "allow_custom": false
  }
}
```

**Investigation Required:**
- Identify current failure point (schema save, field render, value persistence)
- Test with various option counts and configurations

---

### FR-6: Default Schema Protection

**Requirement**: System default schema must be immutable (read-only) to prevent accidental modification.

**Acceptance Criteria:**
- AC-6.1: Default schema displays "System Default" badge/indicator
- AC-6.2: Edit button disabled or hidden for default schema
- AC-6.3: Delete button disabled or hidden for default schema
- AC-6.4: Backend rejects update/delete attempts on default schema
- AC-6.5: Clear message explaining why default schema cannot be modified
- AC-6.6: Users can duplicate default schema to create editable copy

**Implementation:**
- Add `is_system_default` flag to schema model (or check specific ID)
- Frontend checks flag before enabling edit/delete actions
- Backend validates flag on all mutation endpoints
- Return 403 Forbidden with descriptive error for attempts to modify default

---

### FR-7: Schema Deletion with Dependency Validation

**Requirement**: Prevent deletion of schemas currently in use by components; provide safe deletion workflow.

**Acceptance Criteria:**
- AC-7.1: Check for component dependencies before allowing deletion
- AC-7.2: If schema in use, display warning with component count
- AC-7.3: Provide option to reassign components to different schema before deletion
- AC-7.4: If no dependencies, show confirmation dialog before deletion
- AC-7.5: After successful deletion, return to schema list with confirmation
- AC-7.6: System default schema cannot be deleted (see FR-6)
- AC-7.7: Deleted schemas marked inactive rather than hard-deleted (soft delete)

**Deletion Workflow:**
1. User clicks "Delete" on schema
2. Frontend requests dependency check: `GET /api/schemas/{id}/usage`
3. If components exist:
   - Show warning: "This schema is used by X components. Reassign or cancel?"
   - Offer reassignment workflow
4. If no dependencies:
   - Show confirmation: "Delete '[name]' schema? This cannot be undone."
5. On confirm, send `DELETE /api/schemas/{id}`
6. Soft delete: Set `is_active = false`, keep in database
7. Redirect to schema list with success message

---

## Non-Functional Requirements

### NFR-1: Performance Requirements

**NFR-1.1: Schema List Load Time**
- Schema list page must load within 2 seconds for projects with up to 50 schemas
- Pagination implemented if project has >50 schemas (20 per page)
- Loading states shown during data fetch

**NFR-1.2: Schema Save Response Time**
- Schema create/update operations complete within 3 seconds
- User receives immediate feedback (loading spinner) during save
- Optimistic UI updates where safe (pending backend confirmation)

**NFR-1.3: Validation Responsiveness**
- Client-side validation feedback appears within 300ms of user input
- Real-time validation does not block user typing
- Debounce validation checks to avoid excessive API calls

---

### NFR-2: Usability & User Experience

**NFR-2.1: Error Message Clarity**
- All error messages written in plain language (no technical jargon)
- Error messages specify what went wrong and how to fix it
- Example: "Schema name cannot contain spaces. Use hyphens (-) or underscores (_) instead."

**NFR-2.2: Visual Feedback & Affordances**
- Disabled buttons clearly indicate why they're disabled (tooltip on hover)
- System default schema visually distinguished from user-created schemas
- Unsaved changes indicated by visual marker (asterisk, color change, banner)
- Destructive actions (delete) use warning colors (red) and require confirmation

**NFR-2.3: Keyboard Navigation**
- All schema management functions accessible via keyboard
- Tab order follows logical workflow
- Enter key submits forms, Escape cancels dialogs
- Focus management after modal closes returns to triggering element

**NFR-2.4: Responsive Design**
- Schema management UI functional on tablet devices (768px width minimum)
- Mobile support not required but layouts should degrade gracefully
- Form fields stack vertically on narrow screens

---

### NFR-3: Data Integrity & Reliability

**NFR-3.1: Validation Consistency**
- Same validation rules enforced on both client and server
- Server-side validation is authoritative (client-side is UX enhancement)
- Invalid data cannot reach database through any pathway

**NFR-3.2: Atomic Operations**
- Schema updates are atomic (all-or-nothing)
- Failed saves do not leave schema in partial state
- Rollback mechanism for failed multi-step operations

**NFR-3.3: Concurrent Editing Protection**
- Detect if schema modified by another user since current user loaded it
- Show warning: "This schema was updated by [user] at [time]. Reload to see latest?"
- Prevent overwriting changes without user acknowledgment

**NFR-3.4: Audit Trail**
- All schema mutations logged with: user, timestamp, action, changed fields
- Schema deletion preserves audit history (soft delete requirement)
- Audit logs retained for minimum 90 days

---

### NFR-4: Browser Compatibility

**NFR-4.1: Supported Browsers**
- Chrome 90+ (primary target)
- Firefox 88+
- Safari 14+
- Edge 90+

**NFR-4.2: Graceful Degradation**
- Core functionality works without JavaScript (server-rendered fallbacks)
- Progressive enhancement for advanced features
- Polyfills for features not supported in older browsers

---

### NFR-5: Accessibility

**NFR-5.1: Baseline Accessibility**
- Maintain existing accessibility standards (don't regress)
- Follow Material-UI best practices already in place
- Defer comprehensive WCAG audit to future phase

**Note**: Comprehensive accessibility testing deferred per YAGNI principle. Focus on functional correctness first; accessibility evaluation planned for separate initiative.

---

### NFR-6: Maintainability & Code Quality

**NFR-6.1: Code Standards**
- Follow existing project coding standards (see docs/architecture/coding-standards.md)
- TypeScript strict mode enabled for all new code
- Component reusability: Extract shared validation logic into utilities

**NFR-6.2: Testing Requirements**
- Unit tests for all validation logic (>80% coverage)
- Integration tests for schema CRUD workflows
- E2E tests for critical user paths (create, edit, delete)

**NFR-6.3: Documentation**
- API endpoints documented in OpenAPI spec
- Component props documented with JSDoc
- User-facing help text for schema naming rules

---

### NFR-7: Security

**NFR-7.1: Input Sanitization**
- All user input sanitized to prevent XSS attacks
- Schema names validated against injection patterns
- SQL injection protection via parameterized queries (already in place with SQLAlchemy)

**NFR-7.2: Authorization**
- Users can only modify schemas in their permitted projects
- System default schema write-protected at both UI and API level
- Audit trail includes user identity for accountability

**Note**: No project-specific security requirements beyond standard web application practices at this time.

---

## Implementation Considerations

### Technical Architecture Affected

**Frontend Components:**
- `/frontend/src/pages/SchemaManagement.tsx` - Schema list view
- `/frontend/src/components/schema/SchemaEditor.tsx` - Create/edit forms
- `/frontend/src/components/flexible/SchemaAwareForm.tsx` - Field rendering (recently updated for readability)
- `/frontend/src/services/api.ts` - API client methods

**Backend Modules:**
- `/backend/app/api/schemas.py` - REST endpoints (recently updated for project ID handling)
- `/backend/app/services/schema_service.py` - Business logic
- `/backend/app/models/database.py` - ComponentSchema, ComponentSchemaField models

**Database Tables:**
- `component_schemas` - Schema definitions
- `component_schema_fields` - Field configurations
- `components` - References schemas via `schema_id` foreign key

---

### Recommended Implementation Phases

**Phase 1: Critical User Blockers (Week 1)**
- FR-1: Schema naming validation & feedback
- FR-2: Post-creation navigation fix
- FR-4: Schema name update persistence

**Rationale:** These three issues completely block basic schema management workflows. Addressing them first provides immediate user value.

---

**Phase 2: State Management & Field Issues (Week 2)**
- FR-3: Field addition save state management
- FR-5: Multi-select field type investigation & fix
- Comprehensive field type testing across all 8 types

**Rationale:** Requires deeper state management analysis. Multi-select investigation may reveal patterns applicable to other field types.

---

**Phase 3: Safety & Protection (Week 3)**
- FR-6: Default schema protection
- FR-7: Schema deletion with dependency validation

**Rationale:** Data integrity safeguards are important but don't block current workflows (users can work around or avoid these operations).

---

### Dependencies & Integration Points

**Existing Systems:**
- **React Query** - Already used for caching; leverage for optimistic updates and state invalidation
- **React Hook Form** - Form state management; ensure dirty state tracking configured correctly
- **Material-UI** - Form components and validation display; utilize built-in error states
- **FastAPI OpenAPI** - Auto-generated API docs; update as endpoints modified

**Recent Related Work:**
- Schema API special project ID handling (commit 5a418bd) - May affect testing scenarios
- Field readability improvements (commits 3801cb8, 60649c7) - Validates field rendering working correctly

---

### Testing Strategy

**Unit Tests:**
- Schema name validation logic (frontend & backend)
- Field dirty state detection algorithms
- Dependency check queries

**Integration Tests:**
- Full schema CRUD workflows via API
- Schema-component relationship validation
- Concurrent edit detection scenarios

**End-to-End Tests:**
- User creates schema with invalid name → sees validation error → corrects → saves successfully
- User creates schema → redirected to list → new schema highlighted
- User adds field → save button enables → saves → field persists on reload
- User attempts to delete in-use schema → sees warning → cancels/reassigns

**Manual Testing Checklist:**
- [ ] Test all 8 field types (text, textarea, number, date, select, checkbox, autocomplete, multi-select)
- [ ] Test special project IDs (default-project, demo-project, unassigned, global)
- [ ] Test default schema protection (cannot edit/delete)
- [ ] Test schema with 0, 1, 5, 20 fields (performance validation)

---

### Risks & Mitigation Strategies

**Risk 1: Multi-Select Root Cause Unknown**
- **Impact:** Cannot estimate fix complexity without investigation
- **Mitigation:** Time-box investigation to 4 hours; if unclear, create spike story for deeper analysis
- **Fallback:** Document multi-select as "not supported" temporarily if critical blocker found

**Risk 2: Schema-Component Dependency Queries Slow**
- **Impact:** Deletion validation could timeout on large datasets
- **Mitigation:** Add database index on `components.schema_id`, implement query pagination
- **Monitoring:** Track query performance; optimize if >2 seconds for typical project

**Risk 3: Concurrent Edit Detection Complexity**
- **Impact:** Implementing version conflict detection adds significant complexity
- **Mitigation:** Start with timestamp-based approach; upgrade to optimistic locking if needed
- **De-scope Option:** Defer concurrent edit detection to Phase 4 if not critical

**Risk 4: Breaking Changes to Schema API**
- **Impact:** Frontend changes might break existing component usage
- **Mitigation:** Maintain backward compatibility; use API versioning if necessary
- **Testing:** Regression test component editor after schema changes

---

### Success Metrics

**User Experience Metrics:**
- Schema creation success rate increases to >95% (current rate acceptable but not measured)
- Time to create schema reduces (measure baseline first)
- Support tickets related to schema issues decrease to <2 per month

**Technical Metrics:**
- Schema API error rate <1% (excluding invalid user input)
- Schema list load time <2 seconds (99th percentile)
- Zero data corruption incidents from schema modifications

**Functional Completeness:**
- All 8 field types tested and working
- All 7 functional requirements validated
- Zero high-severity bugs in production after 2 weeks

---

## Acceptance Testing Plan

### Test Environment Setup

**Test Data Requirements:**
- Fresh database with default schema only
- 3 test projects: "Project A", "Project B", "default-project"
- Sample components (5-10) assigned to default schema
- Clean state (no user-created schemas initially)

**Given**: Only 3 schemas currently exist and all are sample data
- **Low Risk**: Can modify/delete existing schemas during testing
- **No Migration Needed**: Fresh start acceptable for refactoring
- **Performance Not Critical**: Small dataset eliminates scale concerns

---

### Acceptance Test Scenarios

### AT-1: Schema Name Validation (FR-1)

**Test Case 1.1: Invalid Characters Rejected**
```
GIVEN user is creating a new schema
WHEN user enters name "My Schema!" (contains space and !)
THEN inline validation shows "Invalid characters: space, !"
AND save button remains disabled
AND error message suggests "Use hyphens or underscores instead"
```

**Test Case 1.2: Valid Name Accepted**
```
GIVEN user is creating a new schema
WHEN user enters name "my-schema_v1"
THEN validation shows green checkmark
AND save button becomes enabled
AND no error messages displayed
```

**Test Case 1.3: Name Too Short**
```
GIVEN user is creating a new schema
WHEN user enters name "ab" (2 characters)
THEN validation shows "Minimum 3 characters required"
AND save button remains disabled
```

**Test Case 1.4: Duplicate Name Rejected**
```
GIVEN schema named "test-schema" already exists
WHEN user creates new schema with name "test-schema"
THEN validation shows "Schema name already exists in this project"
AND save button remains disabled
```

---

### AT-2: Post-Creation Navigation (FR-2)

**Test Case 2.1: Successful Creation Redirects**
```
GIVEN user is on schema creation form
WHEN user submits valid schema "new-test-schema"
THEN schema is created successfully
AND user redirected to schema list page
AND success message displays "Schema 'new-test-schema' created successfully"
AND new schema appears in list (highlighted or scrolled to)
```

**Test Case 2.2: Creation Failure Stays on Form**
```
GIVEN user is on schema creation form
WHEN schema save fails (server error)
THEN user remains on creation form
AND error message displays explaining failure
AND form data preserved for user to retry
```

---

### AT-3: Field Addition Save State (FR-3)

**Test Case 3.1: Adding Field Enables Save**
```
GIVEN user is editing existing schema
WHEN user clicks "Add Field" and configures new field "notes" (text type)
THEN save button immediately becomes enabled
AND unsaved changes indicator appears
```

**Test Case 3.2: Editing Field Enables Save**
```
GIVEN user is editing existing schema with 2 fields
WHEN user changes field "description" from required=false to required=true
THEN save button becomes enabled
AND unsaved changes indicator appears
```

**Test Case 3.3: Removing Field Enables Save**
```
GIVEN user is editing existing schema with 3 fields
WHEN user deletes field "optional-notes"
THEN save button becomes enabled
AND confirmation dialog asks "Remove field 'optional-notes'?"
```

**Test Case 3.4: No Changes Disables Save**
```
GIVEN user is editing existing schema
WHEN user makes no changes
THEN save button remains disabled
AND no unsaved changes indicator
```

---

### AT-4: Schema Name Update Persistence (FR-4)

**Test Case 4.1: Name Change Saves**
```
GIVEN schema named "old-name" exists
WHEN user edits schema and changes name to "new-name"
AND user clicks save
THEN schema name updates successfully
AND schema list shows "new-name"
AND opening schema again shows "new-name" in form
```

**Test Case 4.2: Name Change with Fields Saves Both**
```
GIVEN user is editing schema "test-schema" with 2 fields
WHEN user changes name to "updated-schema" AND adds new field
AND user clicks save
THEN both name and field changes persist
AND schema list shows "updated-schema"
AND new field appears in schema
```

---

### AT-5: Multi-Select Field Type (FR-5)

**Test Case 5.1: Create Multi-Select Field**
```
GIVEN user is editing schema
WHEN user adds field "materials" with type "multi-select"
AND configures options ["Steel", "Aluminum", "Concrete"]
AND saves schema
THEN field saves successfully
AND opening schema shows multi-select field configured correctly
```

**Test Case 5.2: Component Uses Multi-Select**
```
GIVEN schema with multi-select field "materials" exists
AND component assigned to this schema
WHEN user views component in editor
THEN multi-select field renders with checkboxes/multi-select UI
AND user can select multiple options
AND selections save to component.dynamic_data correctly
```

**Test Case 5.3: Multi-Select in Read Mode**
```
GIVEN component with multi-select field containing values ["Steel", "Aluminum"]
WHEN user views component in read-only mode
THEN selected values display clearly (not gray text)
AND multiple values shown (e.g., "Steel, Aluminum")
```

---

### AT-6: Default Schema Protection (FR-6)

**Test Case 6.1: Default Schema Not Editable**
```
GIVEN default schema exists (system-created)
WHEN user views default schema in schema list
THEN "Edit" button is disabled or hidden
AND tooltip explains "System default schema cannot be modified"
AND "System Default" badge visible
```

**Test Case 6.2: Default Schema Not Deletable**
```
GIVEN default schema exists
WHEN user views default schema in schema list
THEN "Delete" button is disabled or hidden
AND tooltip explains "System default schema cannot be deleted"
```

**Test Case 6.3: Backend Rejects Default Schema Edits**
```
GIVEN default schema ID is known
WHEN API call attempts to PATCH /api/schemas/{default-id}
THEN response is 403 Forbidden
AND error message: "Cannot modify system default schema"
```

**Test Case 6.4: Default Schema Duplication Allowed**
```
GIVEN default schema exists
WHEN user clicks "Duplicate" on default schema
THEN copy created with name "Default Schema Copy"
AND copied schema is editable (not system default)
```

---

### AT-7: Schema Deletion with Dependencies (FR-7)

**Test Case 7.1: Delete Unused Schema**
```
GIVEN schema "test-schema" exists with 0 components using it
WHEN user clicks delete on "test-schema"
THEN confirmation dialog appears "Delete 'test-schema'? This cannot be undone."
AND user confirms
THEN schema marked inactive (soft delete)
AND schema removed from list
AND success message "Schema 'test-schema' deleted"
```

**Test Case 7.2: Prevent Deleting In-Use Schema**
```
GIVEN schema "active-schema" has 5 components using it
WHEN user clicks delete on "active-schema"
THEN warning dialog shows "This schema is used by 5 components"
AND options presented: "Reassign components" or "Cancel"
AND delete blocked until components reassigned
```

**Test Case 7.3: Reassign Then Delete**
```
GIVEN schema "old-schema" has 3 components
WHEN user chooses "Reassign components" option
AND selects "new-schema" as target
AND confirms reassignment
THEN 3 components updated to use "new-schema"
AND "old-schema" becomes deletable
AND user can proceed with deletion
```

---

### Comprehensive Field Type Testing

**All 8 Field Types Must Be Tested:**

| Field Type | Create | Edit | Save | Render | Data Persist | Multi-Instance |
|------------|--------|------|------|--------|--------------|----------------|
| text | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| textarea | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| number | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| date | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| select | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| checkbox | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| autocomplete | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **multiselect** | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ |

**Multi-Instance Test:** Schema with multiple fields of same type (e.g., 3 text fields)

---

### Sign-Off Criteria

**Requirements Validation:**
- [ ] All FR-1 through FR-7 acceptance criteria met
- [ ] All 8 field types tested and functional
- [ ] Zero high-severity bugs found during testing
- [ ] Performance metrics within NFR targets

**User Acceptance:**
- [ ] Schema creation workflow completes without errors
- [ ] Field addition/editing workflow intuitive and functional
- [ ] Deletion safeguards prevent accidental data loss
- [ ] User can complete all common schema management tasks

**Technical Validation:**
- [ ] No regression in existing component functionality
- [ ] API error handling comprehensive
- [ ] Database migrations complete successfully
- [ ] Audit trail captures all schema changes

**Documentation Complete:**
- [ ] API documentation updated (OpenAPI spec)
- [ ] User help text added for validation rules
- [ ] Code comments explain complex state management

---

## Summary and Next Steps

### Document Summary

This requirements document addresses **7 critical issues** in the Component Schema management system that currently block or impair user workflows. The refactoring effort focuses on:

**Core Problems Solved:**
1. Silent validation failures preventing schema creation
2. Broken post-creation navigation leaving users with blank screens
3. Save state management preventing field modifications
4. Schema name updates failing to persist
5. Multi-select field type non-functional
6. Unprotected system default schema at risk of modification
7. Missing deletion safeguards risking data loss

**Scope & Impact:**
- **Functional Requirements:** 7 major features across create, read, update, delete operations
- **Non-Functional Requirements:** Performance, usability, data integrity, security
- **Testing Requirements:** Comprehensive validation of all 8 field types
- **Timeline:** Estimated 3-week effort (single developer, part-time)
- **Risk:** Low - only 3 sample schemas exist, no production data impact

**Key Success Metrics:**
- Schema creation success rate >95%
- All 8 field types functional and tested
- Zero data corruption incidents
- User workflow completion without errors

---

### Implementation Phases

**Phase 1: Critical Blockers (Week 1)**
- FR-1: Schema naming validation & feedback
- FR-2: Post-creation navigation fix
- FR-4: Schema name update persistence

**Deliverables:** Users can successfully create and rename schemas with clear validation feedback.

---

**Phase 2: Field Management (Week 2)**
- FR-3: Field addition save state management
- FR-5: Multi-select field type investigation & fix
- Comprehensive field type testing (all 8 types)

**Deliverables:** Users can add/edit fields reliably; all field types functional.

---

**Phase 3: Data Protection (Week 3)**
- FR-6: Default schema protection
- FR-7: Schema deletion with dependency validation

**Deliverables:** Data integrity safeguards prevent accidental corruption or loss.

---

### Recommended Next Steps

**Immediate Actions (This Week):**

1. **Document Review & Approval**
   - [ ] Review this requirements document with stakeholders
   - [ ] Obtain sign-off from Product Owner
   - [ ] Confirm priority and timeline alignment

2. **Technical Planning**
   - [ ] Dev team reviews requirements for technical feasibility
   - [ ] Identify any missing technical details or constraints
   - [ ] Estimate effort for each phase (confirm 3-week timeline)

3. **Environment Setup**
   - [ ] Create test environment with sample data
   - [ ] Set up baseline metrics for schema operations
   - [ ] Prepare database backup before starting work

**Development Phase (Weeks 1-3):**

4. **Phase 1 Implementation**
   - [ ] Create user stories from FR-1, FR-2, FR-4
   - [ ] Implement validation rules and error messaging
   - [ ] Fix post-creation navigation flow
   - [ ] Fix schema name update persistence
   - [ ] Run acceptance tests AT-1, AT-2, AT-4

5. **Phase 2 Implementation**
   - [ ] Create user stories from FR-3, FR-5
   - [ ] Implement dirty state detection for field changes
   - [ ] Investigate multi-select field root cause
   - [ ] Test all 8 field types systematically
   - [ ] Run acceptance tests AT-3, AT-5, comprehensive field tests

6. **Phase 3 Implementation**
   - [ ] Create user stories from FR-6, FR-7
   - [ ] Implement default schema protection
   - [ ] Build dependency checking for deletion
   - [ ] Create reassignment workflow
   - [ ] Run acceptance tests AT-6, AT-7

**Post-Implementation (Week 4):**

7. **Quality Assurance**
   - [ ] Complete all acceptance test scenarios
   - [ ] Perform regression testing on component editor
   - [ ] Verify performance metrics within NFR targets
   - [ ] Document any known limitations or workarounds

8. **Documentation & Deployment**
   - [ ] Update API documentation (OpenAPI spec)
   - [ ] Add user-facing help text for schema management
   - [ ] Create deployment checklist
   - [ ] Plan production rollout (low risk given sample data)

9. **Monitoring & Validation**
   - [ ] Monitor schema operations for first 2 weeks
   - [ ] Collect user feedback on improved workflows
   - [ ] Measure success metrics (creation success rate, error rates)
   - [ ] Address any post-deployment issues

---

### Open Questions for Development Team

**Technical Investigations Required:**

1. **Multi-Select Field Root Cause**
   - Is this a frontend rendering issue, backend persistence issue, or both?
   - Time-boxed investigation (4 hours) recommended before committing to fix
   - Fallback: Document as "not supported" if critical blocker found

2. **Schema Name Validation Rules**
   - What are the exact allowed characters? (Recommended: `[a-zA-Z0-9_-]`)
   - Min/max length constraints? (Recommended: 3-100 characters)
   - Any other business rules not captured?

3. **Default Schema Identification**
   - How is default schema identified? (Flag in database? Specific ID?)
   - Can there be multiple default schemas (one per project)?
   - Should default schema be truly immutable or just protected from accidental changes?

4. **Concurrent Edit Detection**
   - Is this a real concern or theoretical?
   - Can we defer to Phase 4 or de-scope entirely?
   - Recommended approach: timestamp-based version checking

**Business Decisions Required:**

5. **Schema Deletion Strategy**
   - Soft delete (recommended) or hard delete?
   - Audit trail retention period? (Recommended: 90 days minimum)
   - Should deleted schemas be recoverable?

6. **Field Type Expansion**
   - Are there plans for additional field types beyond the current 8?
   - Should architecture support easy addition of new types?

---

### Document Maintenance

**Version History:**
- v1.0 (2025-09-30): Initial draft based on user-reported issues

**Review Schedule:**
- Update after Phase 1 completion (Week 1)
- Update after Phase 2 completion (Week 2)
- Final update after Phase 3 completion (Week 3)

**Document Owner:** Business Analyst (Mary)
**Approvers:** Product Owner, Engineering Lead, QA Lead

**Related Documents:**
- `/docs/architecture/coding-standards.md` - Development standards
- `/docs/architecture/tech-stack.md` - Technology decisions
- `/backend/app/api/schemas.py` - Current schema API implementation
- `/frontend/src/components/flexible/SchemaAwareForm.tsx` - Field rendering (recently updated)

---

### Success Indicators

**User Feedback:**
- ✅ "I can create schemas without mysterious errors"
- ✅ "Adding fields to schemas is straightforward"
- ✅ "I'm confident my schema changes are saved"
- ✅ "The system prevents me from breaking things accidentally"

**Technical Health:**
- ✅ Zero schema-related support tickets for 2 weeks post-deployment
- ✅ All automated tests passing
- ✅ No schema corruption incidents
- ✅ Performance metrics within target ranges

**Business Value:**
- ✅ Schema management no longer blocks component creation workflows
- ✅ Users can confidently manage schemas without developer intervention
- ✅ Reduced risk of data loss from accidental deletions
- ✅ Foundation for future schema enhancements

---

### Final Notes

This requirements document provides a **comprehensive blueprint** for addressing all identified schema management issues. The phased approach ensures:

1. **Immediate value** - Critical blockers fixed first
2. **Risk mitigation** - Small, testable increments
3. **Data safety** - Protection features last (users can avoid risky operations until ready)
4. **Quality assurance** - Comprehensive testing plan included

**The refactoring is ready to proceed pending stakeholder approval.**

---

*Document generated by Business Analyst (Mary) using BMAD™ Core advanced elicitation workflow*
