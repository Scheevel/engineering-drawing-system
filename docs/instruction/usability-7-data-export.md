# Usability Guide: Epic 7 - Data Export & Reporting

**Document Type:** Agent Knowledge Base
**Target Audience:** BMAD Agents (Dev, QA, SM, PO)
**Last Updated:** 2025-10-02
**Epic Scope:** Story 7.1

## Executive Summary

Story 7.1 (refactored by Story 7.1.1) introduces client-side CSV export functionality that enables engineers to export individual components with drawing context, featuring customizable field selection, real-time preview, and Excel-compatible hyperlink formulas. This component-centric export supports the "export what you see" pattern, respecting all active page filters, and uses virtualization to handle hundreds of components efficiently without backend API changes.

## Feature Catalog

### 🎯 CSV Export with Customizable Field Selection (Story 7.1)

**WHEN TO USE:** When engineers need to export drawing/component data to Excel or spreadsheet tools for analysis, reporting, or sharing with stakeholders.

**AGENT EXECUTION SYNTAX:**
```bash
# Access Export Functionality
Navigate to http://localhost:3000/drawings
Click "Export" button in toolbar (next to "Upload Drawings")

# Field Selection (Manual UI Interaction)
# - Expand accordion groups: Basic Drawing Info, Project Association, Component Data, Metadata
# - Select individual fields or use group-level checkboxes
# - Component Data fields are discovered dynamically from actual component data
# - Field count chip shows "X fields selected"

# Preview & Download
# - Real-time preview updates as fields are selected
# - Preview shows virtualized table with all components from filtered drawings
# - Click "Export CSV (X components, Y fields)" button
# - File downloads as: drawings-export-2025-10-02.csv
```

**WHY USE THIS:** Solves the critical problem of extracting structured data from the system for external analysis. Engineers can customize exactly which fields to export, see a live preview before download, and open the CSV in Excel with working hyperlinks that navigate back to specific components in the application.

**HOW AGENTS SHOULD USE:**
- **Dev Agent:** Test field selection state management, verify virtualization performance with 500+ components (from ~10-20 drawings), validate HYPERLINK formula generation, confirm dynamic component field discovery from actual component data
- **QA Agent:** Validate "export what you see" filter integration (filtered drawings → their components exported), test Excel hyperlink clickability (open CSV in Excel AND Google Sheets), verify data quality (dates formatted correctly, nulls as empty strings), test edge cases (zero components, zero fields selected, large component datasets), verify component count = CSV row count
- **All Agents:** Use Export for generating test datasets, validating data integrity across development cycles, creating documentation examples

### 🎯 Excel-Compatible Hyperlinks (Story 7.1)

**WHEN TO USE:** When exported CSVs need clickable links that navigate users back to specific component views in the application (e.g., sharing reports with stakeholders who need to drill into details).

**AGENT EXECUTION SYNTAX:**
```bash
# Export with URL Field
Navigate to http://localhost:3000/drawings
Click "Export" button
Expand "Component Data" accordion group
Select "View Component" checkbox
Click "Export CSV"

# In Excel/Google Sheets
# - "View Component" column shows as blue clickable links (not raw formulas)
# - Click link → opens browser to /drawings/:id/components/:componentId

# Technical Format (for validation)
CSV cell contains: =HYPERLINK("http://localhost:3000/drawings/abc123/components/def456", "View Component")
# Excel renders this as: View Component (clickable link)
```

**WHY USE THIS:** Provides seamless navigation from static reports back to live application data. Stakeholders can review exported data in Excel and click directly into the system for deeper investigation without manually searching for components.

**HOW AGENTS SHOULD USE:**
- **Dev Agent:** Verify HYPERLINK formula syntax `=HYPERLINK("url", "text")`, test routing pattern `/drawings/:id/components/:componentId`, ensure URLs use absolute paths with `window.location.origin`
- **QA Agent:** **CRITICAL VALIDATION** - Open exported CSV in Microsoft Excel, verify links render as clickable (not raw formulas), click links to confirm navigation works, repeat test in Google Sheets (upload CSV, verify link compatibility)
- **All Agents:** Use hyperlinks for rapid navigation when debugging issues found in exported data

### 🎯 Real-Time Preview with Virtualization (Story 7.1)

**WHEN TO USE:** When previewing large exports (hundreds of components from many drawings) before committing to download, ensuring selected fields match expectations.

**AGENT EXECUTION SYNTAX:**
```bash
# Preview Automatically Updates
# - Select/deselect fields → preview columns update in real-time
# - Preview shows "Showing all X components" count (may be from fewer drawings)
# - Virtualized rendering: only ~20 visible component rows in DOM at any time
# - Performance warning appears if components > 300: "Large dataset detected (X components)"

# Validation Commands
# Open browser DevTools console
Performance.memory.usedJSHeapSize  # Should stay under 100MB for 500 components
document.querySelectorAll('[role="row"]').length  # Should be ~20-25 component rows (virtualization proof)
```

**WHY USE THIS:** Prevents accidental export of wrong data or fields. Engineers can verify exactly what will be exported before downloading, catching errors early. Virtualization ensures preview remains performant even with large datasets (500+ components, which may come from just 10-20 drawings with many components each).

**HOW AGENTS SHOULD USE:**
- **Dev Agent:** Verify react-window `FixedSizeList` implementation, test with 50/100/300/500 component datasets (from varying numbers of drawings), confirm only visible component rows render in DOM, validate warning threshold (300 components)
- **QA Agent:** Test preview updates in real-time as fields toggle, verify virtualization with DevTools (DOM should have ~20 component rows, not full dataset), confirm performance warning displays correctly at 300+ components
- **All Agents:** Use preview to visually validate data before export in testing workflows

## Agent Execution Patterns

### 🤖 Dev Agent Usage

```bash
# Post-Implementation Validation Workflow
cd frontend
npm test -- exportService.test.ts          # Run 14 unit tests (all should pass)
npm run build                               # Verify production build succeeds
npm start                                   # Start dev server on localhost:3000

# Navigate to http://localhost:3000/drawings
# Click "Export" button
# Test field selection UI: expand/collapse accordion groups
# Verify preview updates in real-time as fields toggle
# Test with filtered data (apply Project/Status filters, then export)
# Download CSV and verify file format

# Performance Testing
# Open DevTools Console
Performance.memory.usedJSHeapSize          # Baseline memory usage
# Export with 300 components → warning should appear
# Export with 500 components (from ~10-20 drawings) → preview should remain responsive
document.querySelectorAll('[role="row"]').length  # Should be ~20-25 component rows (virtualization proof)

# Dependency Rebuild (if "Module not found: papaparse" error)
docker-compose build --no-cache frontend   # Rebuild container with new dependencies
docker-compose up -d frontend              # Restart frontend service
curl http://localhost:3000                 # Verify frontend responds (200 OK)
```

### 🧪 QA Agent Usage

```bash
# Manual QA Validation Workflow
Navigate to http://localhost:3000/drawings

# Test 1: Basic Export Functionality
Click "Export" button
Expand "Basic Drawing Info" accordion
Select all fields in group (group checkbox)
Verify preview shows selected columns
Click "Export CSV (X components, Y fields)"
Verify file downloads: drawings-export-YYYY-MM-DD.csv

# Test 2: Filter Integration ("Export What You See")
Apply Project filter: Select specific project
Apply Status filter: Select "Completed"
Note drawing count in table (e.g., 23 drawings)
Click "Export" button
Verify preview shows ALL COMPONENTS from those 23 drawings (e.g., 127 components)
Export CSV → verify downloaded file has 127 component rows (+ 1 header), NOT 23 rows
# CRITICAL: Row count = component count, NOT drawing count

# Test 3: Excel Hyperlink Validation (CRITICAL)
Click "Export" button
Expand "Component Data" accordion
Select "View Component" checkbox
Export CSV → open in Microsoft Excel
# In Excel:
# - Verify "View Component" column shows as blue clickable links
# - Click link → should open browser to component view
# - Verify URL format: /drawings/:id/components/:componentId
# Repeat test in Google Sheets (upload CSV, test links)

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

# Test 5: Edge Cases
# - Zero components: Drawings with no indexed components → Export button disabled OR shows 0 components
# - Zero fields: Deselect all fields → Export button disabled
# - Large dataset: Load 300+ components (may be just 6-10 drawings) → warning message appears
# - Null values: Export component with missing dimensions/specs → CSV shows empty strings (not "null")
# - Drawing context integrity: Verify all components from same drawing have identical drawing_id/file_name
```

### 📋 SM/PO Agent Usage

```bash
# Feature Validation & Acceptance Testing
Navigate to http://localhost:3000/drawings

# Acceptance Criteria Validation (Story 7.1)
# AC 1: Export button visible in toolbar (next to "Upload Drawings")
# AC 2: Dialog opens with title "Export Drawings to CSV"
# AC 3: Accordion groups visible: Basic Drawing Info, Project Association, Component Data, Metadata
# AC 4: Group-level checkboxes work (select all/none in group)
# AC 5: Preview shows virtualized table with selected fields only
# AC 6: Apply filters → export respects filters (test by comparing counts)
# AC 7: URL field exports as clickable hyperlink in Excel (open CSV to verify)
# AC 8: Export button shows count: "Export CSV (X components, Y fields)"
# AC 9: Dates formatted as readable (MM/DD/YYYY HH:MM AM/PM), nulls as empty strings
# AC 10: Performance warning appears for 300+ components
# AC 11: Success notification after download, dialog closes automatically

# Story Completion Checklist
# ✓ All acceptance criteria validated (Story 7.1.1 - component-centric model)
# ✓ Unit tests passing (all tests updated for component-centric data)
# ✓ Excel hyperlink test passed (Excel AND Google Sheets)
# ✓ Performance test passed (500 components, no lag)
# ✓ Filter integration test passed (filtered drawings → their components exported)
# ✓ Edge cases handled (zero components, zero fields, large component datasets)
# ✓ Component count validation: CSV row count = total component count (NOT drawing count)
# ✓ Drawing context integrity: All components from same drawing have correct drawing_id

# Mark story as "Ready for Review" in docs/stories/story-7.1.1-csv-export-component-centric-refactor.md
```

## Cross-Platform Compatibility

**Platform Detection:** Client-side JavaScript in browser (platform-agnostic)

- **macOS:** Full compatibility - CSV exports work in all browsers (Chrome, Safari, Firefox), HYPERLINK formulas render correctly in Excel for Mac and Google Sheets
- **Linux:** Full compatibility - CSV exports work in all browsers, HYPERLINK formulas render correctly in LibreOffice Calc and Google Sheets
- **Windows WSL:** Full compatibility when accessing via browser on Windows host, HYPERLINK formulas render correctly in Excel for Windows

**Error Handling:** Browser download API used (`URL.createObjectURL` + `link.click()`) is supported across all modern browsers. If download blocked by browser security settings, user receives error notification: "Download blocked. Please check browser settings."

**Note:** Export functionality is entirely browser-based (no platform-specific backend code), ensuring consistent behavior across all operating systems.

## Troubleshooting for Agents

### Common Issues & Resolutions

```bash
# Issue 1: "Module not found: Error: Can't resolve 'papaparse'"
# Cause: Docker container built before papaparse dependency was added
docker-compose build --no-cache frontend   # Rebuild frontend with new dependencies
docker-compose up -d frontend              # Restart frontend service
curl http://localhost:3000                 # Verify frontend responds (200 OK)

# Issue 2: Export button disabled (grayed out)
# Cause: No components available to export (drawings with zero indexed components) OR no fields selected
# Resolution 1: Check that filtered drawings have indexed components (not just empty drawings)
# Resolution 2: Open Export dialog, select at least one field
# Validation: Button should enable when components exist (not just drawings) AND fields selected
# Note: Drawing count > 0 but component count = 0 → button remains disabled (correct behavior)

# Issue 3: HYPERLINK formulas showing as plain text in Excel
# Cause: CSV opened incorrectly or formula syntax error
# Step 1: Close CSV file in Excel
# Step 2: Right-click CSV → Open With → Microsoft Excel (not "Open")
# Step 3: Verify formula format: =HYPERLINK("url", "text")
# Expected: Blue clickable link, not raw formula text
# If still showing text: Check CSV in text editor, verify double-quotes: =HYPERLINK(""url"", ""text"")

# Issue 4: Preview not updating when fields selected
# Cause: React state sync issue or browser performance
# Resolution:
# Close Export dialog
# Open browser DevTools Console
# Check for JavaScript errors (red messages)
# Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
# Reopen Export dialog → test field selection again

# Issue 5: Download starts but file empty (0 bytes)
# Cause: CSV generation failed silently
# Resolution:
# Open browser DevTools Console
# Click Export CSV button again
# Check Console for error messages
# Common cause: Invalid data (circular references in JSON)
# Fix: Check drawing data structure, ensure no circular object references

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

### Validation Commands

```bash
# Verify Implementation Status
curl http://localhost:3000/drawings        # Frontend accessible (200 OK)
npm test -- exportService.test.ts          # Unit tests passing (14/14)
npm run build                              # Production build succeeds

# Verify Export Functionality (Manual)
# Navigate to http://localhost:3000/drawings
# Click "Export" button → Dialog opens
# Select fields → Preview updates
# Click "Export CSV" → File downloads

# Verify CSV Quality
# Open downloaded CSV in text editor (not Excel)
cat ~/Downloads/drawings-export-*.csv | head -5  # Check first 5 rows
# Expected:
# - Line 1: Header row with field labels (not keys)
# - Line 2+: Data rows with quoted fields
# - Date fields: "MM/DD/YYYY, HH:MM AM/PM" format
# - URL fields: =HYPERLINK("url", "text") format

# Verify Virtualization Performance
# Open browser DevTools Console
# Navigate to /drawings with drawings containing 300+ total components
# Click "Export" button
Performance.memory.usedJSHeapSize          # Should be < 100MB
document.querySelectorAll('[role="row"]').length  # Should be ~20-25 component rows (not 300+)
# Interpretation: Only visible component rows rendered (virtualization working)
```

## Integration Points

### Frontend & Browser APIs
- **Filter Integration:** Export respects active Project/Status filters - exports ALL COMPONENTS from filtered drawings ("export what you see" pattern)
- **CSV Download:** Standard browser download API (`URL.createObjectURL` + `link.click()`)

### Component Data
- **Dynamic Fields:** Export discovers component fields from actual component data (not schema definitions), drawing context fields provided separately
- **URL Generation:** HYPERLINK formulas use `/drawings/:id/components/:componentId` routing pattern

## Best Practices for BMAD Agents

1. **Always test Excel hyperlink compatibility** with `View Component` field selected - open exported CSV in both Microsoft Excel AND Google Sheets to verify clickable links render correctly
2. **Use "export what you see" for component data generation** - apply drawing filters to isolate specific projects/statuses, then export all components from those drawings for targeted testing scenarios
3. **Validate dynamic field discovery** by testing with drawings that have different component data structures - verify field union behavior works correctly
4. **Check preview virtualization performance** with `document.querySelectorAll('[role="row"]').length` to confirm only ~20-25 rows render (not full dataset)
5. **Test edge cases systematically**: zero components (drawings without indexed data), zero fields selected, 300+ components (warning threshold), null values in component data, drawing context integrity (same drawing_id for components from same drawing)
6. **Rebuild containers after dependency changes** with `docker-compose build --no-cache frontend` when encountering "Module not found" errors for papaparse

---

**Agent Consumption Ready:** This document provides executable commands and clear usage patterns for all Epic 7 - Data Export & Reporting features.

