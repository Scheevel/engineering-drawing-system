# Usability Guide Update Tracking - Component-Centric Refactoring

**Document:** docs/instruction/usability-7-data-export.md
**Story:** Story 7.1.1 - Component-Centric Data Model Refactoring
**Update Required After:** Story 7.1.1 implementation complete
**Analyst:** Mary (Business Analyst)
**Date:** 2025-10-02

---

## 🎯 Update Strategy

**Approach:** Mark sections requiring updates, preserve structure, update terminology from drawing-centric to component-centric

**Key Changes:**
- **Entity Shift:** "drawings" (rows) → "components" (rows)
- **Context Shift:** Component data (primary) → Drawing context (secondary)
- **Count Shift:** "X drawings" → "X components" or "X components from N drawings"
- **Threshold Shift:** "300 drawings" → "300 components"

---

## 📝 Section-by-Section Update Requirements

### ✅ UNCHANGED Sections (No updates needed)
- **Document Header** (Lines 1-7): Metadata remains accurate
- **Excel-Compatible Hyperlinks** (Lines 44-71): Already component-centric (CORRECT in Story 7.1)
- **Cross-Platform Compatibility** (Lines 208-218): Platform-agnostic, no data model dependency
- **Integration Points - URL Generation** (Line 304): Already correct
- **Best Practice #1** (Line 308): Excel hyperlink testing - no change needed
- **Best Practice #6** (Line 313): Docker rebuild - no change needed

---

### 🔴 CRITICAL UPDATES REQUIRED

#### **Section: Executive Summary** (Lines 8-10)

**Current (Line 10):**
```markdown
Story 7.1 introduces client-side CSV export functionality that enables engineers to export drawing and component data with customizable field selection, real-time preview, and Excel-compatible hyperlink formulas. This feature supports the "export what you see" pattern, respecting all active page filters, and uses virtualization to handle hundreds of drawings efficiently without backend API changes.
```

**Updated (Story 7.1.1):**
```markdown
Story 7.1 (refactored by Story 7.1.1) introduces client-side CSV export functionality that enables engineers to export individual components with drawing context, featuring customizable field selection, real-time preview, and Excel-compatible hyperlink formulas. This component-centric export supports the "export what you see" pattern, respecting all active page filters, and uses virtualization to handle hundreds of components efficiently without backend API changes.
```

**Changes:**
- "drawing and component data" → "individual components with drawing context"
- "hundreds of drawings" → "hundreds of components"
- Added: "component-centric export" descriptor

---

#### **Section: Feature Catalog - CSV Export** (Lines 12-42)

**Line 32 - CRITICAL:**
```markdown
# CURRENT (WRONG):
# - Preview shows virtualized table with all filtered drawings

# UPDATED:
# - Preview shows virtualized table with all components from filtered drawings
```

**Line 33 - CRITICAL:**
```markdown
# CURRENT (WRONG):
# - Click "Export CSV (X drawings, Y fields)" button

# UPDATED:
# - Click "Export CSV (X components, Y fields)" button
```

**Line 34 - No change:**
```markdown
# - File downloads as: drawings-export-2025-10-02.csv
# Note: Filename remains "drawings-export" for backward compatibility, but contains component rows
```

**Line 27 - UPDATE:**
```markdown
# CURRENT:
# - Component Data fields are discovered dynamically from actual drawing data

# UPDATED:
# - Component Data fields are discovered dynamically from actual component data
```

**Line 40 - UPDATE (Dev Agent guidance):**
```markdown
# CURRENT:
- **Dev Agent:** Test field selection state management, verify virtualization performance with 500+ drawings, validate HYPERLINK formula generation, confirm dynamic component field discovery from actual data

# UPDATED:
- **Dev Agent:** Test field selection state management, verify virtualization performance with 500+ components (from ~10-20 drawings), validate HYPERLINK formula generation, confirm dynamic component field discovery from actual component data
```

**Line 41 - UPDATE (QA Agent guidance):**
```markdown
# CURRENT:
- **QA Agent:** Validate "export what you see" filter integration, test Excel hyperlink clickability (open CSV in Excel AND Google Sheets), verify data quality (dates formatted correctly, nulls as empty strings), test edge cases (zero drawings, zero fields selected, large datasets)

# UPDATED:
- **QA Agent:** Validate "export what you see" filter integration (filtered drawings → their components exported), test Excel hyperlink clickability (open CSV in Excel AND Google Sheets), verify data quality (dates formatted correctly, nulls as empty strings), test edge cases (zero components, zero fields selected, large component datasets), verify component count = CSV row count
```

---

#### **Section: Real-Time Preview with Virtualization** (Lines 73-96)

**Line 75 - CRITICAL:**
```markdown
# CURRENT (WRONG):
**WHEN TO USE:** When previewing large exports (hundreds of drawings) before committing to download, ensuring selected fields match expectations.

# UPDATED:
**WHEN TO USE:** When previewing large exports (hundreds of components from many drawings) before committing to download, ensuring selected fields match expectations.
```

**Lines 81-83 - CRITICAL:**
```markdown
# CURRENT (WRONG):
# - Preview shows "Showing all X drawings" count
# - Virtualized rendering: only ~20 visible rows in DOM at any time
# - Performance warning appears if drawings > 300: "Large dataset detected"

# UPDATED:
# - Preview shows "Showing all X components" count (may be from fewer drawings)
# - Virtualized rendering: only ~20 visible component rows in DOM at any time
# - Performance warning appears if components > 300: "Large dataset detected (X components)"
```

**Lines 87-88 - UPDATE:**
```markdown
# CURRENT (WRONG):
Performance.memory.usedJSHeapSize  # Should stay under 100MB for 500 drawings
document.querySelectorAll('[role="row"]').length  # Should be ~20-25 (virtualization proof)

# UPDATED:
Performance.memory.usedJSHeapSize  # Should stay under 100MB for 500 components
document.querySelectorAll('[role="row"]').length  # Should be ~20-25 component rows (virtualization proof)
```

**Line 91 - UPDATE:**
```markdown
# CURRENT:
**WHY USE THIS:** ... Virtualization ensures preview remains performant even with large datasets (500+ drawings).

# UPDATED:
**WHY USE THIS:** ... Virtualization ensures preview remains performant even with large datasets (500+ components, which may come from just 10-20 drawings with many components each).
```

**Lines 94-95 - UPDATE:**
```markdown
# CURRENT:
- **Dev Agent:** Verify react-window `FixedSizeList` implementation, test with 50/100/300/500 drawing datasets, confirm only visible rows render in DOM, validate warning threshold (300 drawings)
- **QA Agent:** Test preview updates in real-time as fields toggle, verify virtualization with DevTools (DOM should have ~20 rows, not full dataset), confirm performance warning displays correctly

# UPDATED:
- **Dev Agent:** Verify react-window `FixedSizeList` implementation, test with 50/100/300/500 component datasets (from varying numbers of drawings), confirm only visible component rows render in DOM, validate warning threshold (300 components)
- **QA Agent:** Test preview updates in real-time as fields toggle, verify virtualization with DevTools (DOM should have ~20 component rows, not full dataset), confirm performance warning displays correctly at 300+ components
```

---

#### **Section: Dev Agent Usage** (Lines 100-127)

**Lines 119-121 - CRITICAL:**
```markdown
# CURRENT (WRONG):
Performance.memory.usedJSHeapSize          # Baseline memory usage
# Export with 300 drawings → warning should appear
# Export with 500 drawings → preview should remain responsive
document.querySelectorAll('[role="row"]').length  # Should be ~20-25 rows (virtualization proof)

# UPDATED:
Performance.memory.usedJSHeapSize          # Baseline memory usage
# Export with 300 components → warning should appear
# Export with 500 components (from ~10-20 drawings) → preview should remain responsive
document.querySelectorAll('[role="row"]').length  # Should be ~20-25 component rows (virtualization proof)
```

---

#### **Section: QA Agent Usage** (Lines 129-176)

**Lines 140-141 - CRITICAL:**
```markdown
# CURRENT (WRONG):
Click "Export CSV (X drawings, Y fields)"
Verify file downloads: drawings-export-YYYY-MM-DD.csv

# UPDATED:
Click "Export CSV (X components, Y fields)"
Verify file downloads: drawings-export-YYYY-MM-DD.csv
# Note: Filename format unchanged, but content is now component rows
```

**Lines 143-149 - CRITICAL (Test 2):**
```markdown
# CURRENT (WRONG):
# Test 2: Filter Integration ("Export What You See")
Apply Project filter: Select specific project
Apply Status filter: Select "Completed"
Note drawing count in table (e.g., 23 drawings)
Click "Export" button
Verify preview shows same 23 drawings (not all drawings)
Export CSV → verify downloaded file has 23 rows (+ 1 header)

# UPDATED:
# Test 2: Filter Integration ("Export What You See")
Apply Project filter: Select specific project
Apply Status filter: Select "Completed"
Note drawing count in table (e.g., 23 drawings)
Click "Export" button
Verify preview shows ALL COMPONENTS from those 23 drawings (e.g., 127 components)
Export CSV → verify downloaded file has 127 component rows (+ 1 header), NOT 23 rows
# CRITICAL: Row count = component count, NOT drawing count
```

**Lines 162-169 - UPDATE (Test 4):**
```markdown
# CURRENT:
# Test 4: Dynamic Component Fields
# Ensure test data has components with various fields (piece_mark, dimensions, etc.)
Click "Export" button
Expand "Component Data" accordion
# Verify dynamically discovered fields appear (beyond static fields)
# Fields should be human-readable: "Piece Mark" not "piece_mark"
Select component data fields
Export CSV → verify component data columns populated correctly

# UPDATED:
# Test 4: Component-Centric Data Model
# Ensure test data has drawings with multiple components per drawing
Click "Export" button
Expand "Component Data" accordion (should be PRIMARY/expanded by default in 7.1.1)
Expand "Drawing Context" accordion (should show: drawing_id, drawing_file_name, etc.)
# Verify dynamically discovered component fields appear
# Verify drawing context fields available for selection
Select both component and drawing context fields
Export CSV → verify each row = 1 component with drawing context populated
# Critical: Drawing with 5 components → 5 rows, each with same drawing_id/file_name
```

**Lines 171-175 - UPDATE (Test 5):**
```markdown
# CURRENT (WRONG):
# Test 5: Edge Cases
# - Zero drawings: Apply filter with no results → Export button disabled
# - Zero fields: Deselect all fields → Export button disabled
# - Large dataset: Load 300+ drawings → warning message appears
# - Null values: Export drawing with missing data → CSV shows empty strings (not "null")

# UPDATED:
# Test 5: Edge Cases
# - Zero components: Drawings with no indexed components → Export button disabled OR shows 0 components
# - Zero fields: Deselect all fields → Export button disabled
# - Large dataset: Load 300+ components (may be just 6-10 drawings) → warning message appears
# - Null values: Export component with missing dimensions/specs → CSV shows empty strings (not "null")
# - Drawing context integrity: Verify all components from same drawing have identical drawing_id/file_name
```

---

#### **Section: SM/PO Agent Usage** (Lines 178-206)

**Lines 192-194 - CRITICAL:**
```markdown
# CURRENT (WRONG):
# AC 8: Export button shows count: "Export CSV (X drawings, Y fields)"
# AC 9: Dates formatted as readable (MM/DD/YYYY HH:MM AM/PM), nulls as empty strings
# AC 10: Performance warning appears for 300+ drawings

# UPDATED (Story 7.1.1):
# AC 8: Export button shows count: "Export CSV (X components, Y fields)"
# AC 9: Dates formatted as readable (MM/DD/YYYY HH:MM AM/PM), nulls as empty strings
# AC 10: Performance warning appears for 300+ components
```

**Lines 197-203 - UPDATE:**
```markdown
# CURRENT:
# Story Completion Checklist
# ✓ All 11 acceptance criteria validated
# ✓ Unit tests passing (14/14)
# ✓ Excel hyperlink test passed (Excel AND Google Sheets)
# ✓ Performance test passed (500 drawings, no lag)
# ✓ Filter integration test passed ("export what you see")
# ✓ Edge cases handled (zero drawings, zero fields, large datasets)

# UPDATED (Story 7.1.1):
# Story Completion Checklist
# ✓ All acceptance criteria validated (Story 7.1.1 - component-centric model)
# ✓ Unit tests passing (all tests updated for component-centric data)
# ✓ Excel hyperlink test passed (Excel AND Google Sheets)
# ✓ Performance test passed (500 components, no lag)
# ✓ Filter integration test passed (filtered drawings → their components exported)
# ✓ Edge cases handled (zero components, zero fields, large component datasets)
# ✓ Component count validation: CSV row count = total component count (NOT drawing count)
# ✓ Drawing context integrity: All components from same drawing have correct drawing_id
```

**Line 205 - UPDATE:**
```markdown
# CURRENT:
# Mark story as "Ready for Review" in docs/stories/story-7.1.data-export-csv-functionality.md

# UPDATED:
# Mark story as "Ready for Review" in docs/stories/story-7.1.1-csv-export-component-centric-refactor.md
```

---

#### **Section: Troubleshooting** (Lines 220-294)

**Lines 231-235 - CRITICAL UPDATE (Issue 2):**
```markdown
# CURRENT (PARTIAL):
# Issue 2: Export button disabled (grayed out)
# Cause: No drawings available to export OR no fields selected
# Resolution 1: Check drawing count in table (should be > 0)
# Resolution 2: Open Export dialog, select at least one field
# Validation: Button should enable when drawings exist AND fields selected

# UPDATED:
# Issue 2: Export button disabled (grayed out)
# Cause: No components available to export (drawings with zero indexed components) OR no fields selected
# Resolution 1: Check that filtered drawings have indexed components (not just empty drawings)
# Resolution 2: Open Export dialog, select at least one field
# Validation: Button should enable when components exist (not just drawings) AND fields selected
# Note: Drawing count > 0 but component count = 0 → button remains disabled (correct behavior)
```

**ADD NEW ISSUE (Issue 6):**
```markdown
# Issue 6: CSV has more rows than expected (more than drawing count)
# Cause: Component-centric export - each component = 1 row (not each drawing)
# Expected Behavior:
# - 23 filtered drawings with varying component counts → CSV may have 100+ rows
# - Drawing with 50 components → 50 rows in CSV (all with same drawing context)
# Resolution: This is CORRECT behavior in Story 7.1.1
# Validation:
# - Count components in filtered drawings (not drawing count)
# - CSV row count = total component count (+ 1 header row)
# - Each row should have unique component_id but may share drawing_id
```

**Lines 287-293 - UPDATE:**
```markdown
# CURRENT (WRONG):
# Verify Virtualization Performance
# Open browser DevTools Console
# Navigate to /drawings with 300+ drawings
# Click "Export" button
Performance.memory.usedJSHeapSize          # Should be < 100MB
document.querySelectorAll('[role="row"]').length  # Should be ~20-25 (not 300+)
# Interpretation: Only visible rows rendered (virtualization working)

# UPDATED:
# Verify Virtualization Performance
# Open browser DevTools Console
# Navigate to /drawings with drawings containing 300+ total components
# Click "Export" button
Performance.memory.usedJSHeapSize          # Should be < 100MB
document.querySelectorAll('[role="row"]').length  # Should be ~20-25 component rows (not 300+)
# Interpretation: Only visible component rows rendered (virtualization working)
```

---

#### **Section: Integration Points** (Lines 296-304)

**Line 299 - UPDATE:**
```markdown
# CURRENT:
- **Filter Integration:** Export respects active Project/Status filters via parent component's data passing ("export what you see" pattern)

# UPDATED:
- **Filter Integration:** Export respects active Project/Status filters - exports ALL COMPONENTS from filtered drawings ("export what you see" pattern)
```

**Line 303 - UPDATE:**
```markdown
# CURRENT:
- **Dynamic Fields:** Export discovers component fields from actual drawing data, not schema definitions

# UPDATED:
- **Dynamic Fields:** Export discovers component fields from actual component data (not schema definitions), drawing context fields provided separately
```

---

#### **Section: Best Practices** (Lines 306-313)

**Line 309 - UPDATE:**
```markdown
# CURRENT:
2. **Use "export what you see" for test data generation** - apply filters to isolate specific drawing sets, then export for targeted testing scenarios

# UPDATED:
2. **Use "export what you see" for component data generation** - apply drawing filters to isolate specific projects/statuses, then export all components from those drawings for targeted testing scenarios
```

**Line 312 - UPDATE:**
```markdown
# CURRENT:
5. **Test edge cases systematically**: zero drawings, zero fields selected, 300+ drawings (warning threshold), null values in data

# UPDATED:
5. **Test edge cases systematically**: zero components (drawings without indexed data), zero fields selected, 300+ components (warning threshold), null values in component data, drawing context integrity (same drawing_id for components from same drawing)
```

---

## 📊 Update Summary Statistics

| Section | Lines | Updates | Severity |
|---------|-------|---------|----------|
| Executive Summary | 8-10 | 1 | CRITICAL |
| Feature Catalog - CSV Export | 12-42 | 7 | CRITICAL |
| Feature Catalog - Virtualization | 73-96 | 6 | CRITICAL |
| Dev Agent Usage | 100-127 | 3 | HIGH |
| QA Agent Usage | 129-176 | 8 | CRITICAL |
| SM/PO Agent Usage | 178-206 | 5 | HIGH |
| Troubleshooting | 220-294 | 4 | CRITICAL |
| Integration Points | 296-304 | 2 | MEDIUM |
| Best Practices | 306-313 | 2 | MEDIUM |
| **TOTAL** | **318 lines** | **38 updates** | **9 sections** |

---

## 🎯 Priority Update Sequence

### Phase 1: CRITICAL Updates (Do First - After Story 7.1.1 Implementation)
1. **QA Test 2** (Lines 143-149): Row count = component count, NOT drawing count
2. **Preview Count** (Line 81): "Showing all X components"
3. **Export Button Label** (Lines 33, 140, 192): "X components, Y fields"
4. **Performance Threshold** (Lines 83, 194): "300+ components"
5. **Troubleshooting Issue 2** (Lines 231-235): Component availability check
6. **Add Troubleshooting Issue 6**: More rows than drawings (expected behavior)

### Phase 2: HIGH Priority Updates (Do Next)
1. **Dev Agent Performance Testing** (Lines 119-121): Component-based metrics
2. **QA Test 4** (Lines 162-169): Component-centric data model validation
3. **QA Test 5** (Lines 171-175): Edge cases for components
4. **SM/PO Checklist** (Lines 197-203): Component count validation

### Phase 3: MEDIUM Priority Updates (Do Last)
1. **Executive Summary** (Line 10): Component-centric descriptor
2. **Integration Points** (Lines 299, 303): Filter and field discovery
3. **Best Practices** (Lines 309, 312): Component-focused guidance

---

## ✅ Verification Checklist (For Dev Agent After Updates)

After updating the usability guide post-Story 7.1.1 implementation:

- [ ] All instances of "X drawings" (as row count) changed to "X components"
- [ ] All instances of "300 drawings" (threshold) changed to "300 components"
- [ ] All test scenarios reflect component-centric model (row = component, not drawing)
- [ ] Troubleshooting includes "more rows than drawings" as expected behavior
- [ ] Performance metrics reference components, not drawings
- [ ] Filter integration clarified: "filtered drawings → their components"
- [ ] Drawing context fields mentioned as available (drawing_id, file_name)
- [ ] Component count validation emphasized in QA tests
- [ ] Field group restructuring reflected (Component Data primary, Drawing Context secondary)
- [ ] All agent execution patterns updated to match component-centric workflow

---

## 📋 Story 7.1.1 Implementation - Documentation Task Reference

**Story 7.1.1 - Task 7: Update Documentation**
- [ ] Update Story 7.1 (COMPLETE - superseded notice added)
- [ ] Update usability-7-data-export.md (THIS DOCUMENT - awaiting implementation)
- [ ] Update inline code comments (part of implementation tasks 1-6)

**Prerequisite:** Story 7.1.1 Tasks 1-6 must be complete before updating this usability guide

**Estimated Update Time:** 30-45 minutes (systematic find/replace + semantic validation)

---

**Document Control:**
- **Status:** Ready for use by Dev Agent after Story 7.1.1 implementation
- **Next Action:** Hold until Story 7.1.1 code complete, then execute updates
- **Owner:** Dev Agent (James) during Story 7.1.1 Task 7
- **Reviewer:** QA Agent to validate updated test scenarios match implementation
