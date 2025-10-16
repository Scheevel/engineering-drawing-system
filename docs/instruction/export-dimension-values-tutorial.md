# Tutorial: Export Component Dimensions to CSV

**When to use:** When you need to export component data including dimensional values (length, width, height, etc.) to CSV for analysis in Excel, reporting, or import into other systems.

---

## Prerequisites

Run these commands first:
```bash
docker-compose up -d          # Start development environment
# OR
make dev-up                   # If using Makefile

# Ensure database has components with dimensions
# Navigate to http://localhost:3000 and add dimensions to components
```

---

## Launch Tutorial

**Click to start:** Press `Cmd+Shift+P` → Type "Run Task" → Select "Tutorial: Export Dimension Values"

Or run manually:
```bash
cd frontend
npx playwright test e2e/tutorials/export-dimension-values.spec.ts --headed --debug
```

*Browser will open at /export page with the Dimension Format toggle highlighted*

---

## Steps

1. **Observe the Export Page** (tutorial opens http://localhost:3000/export)
   - See the header: "Export Components to CSV"
   - Notice the component count in the Export button

2. **Find the Dimension Format Toggle** (highlighted with yellow background)
   - Located near top of "Select Fields to Export" section
   - Two buttons: "Combined (15.75 in ±0.01)" and "Value Only (15.75)"
   - Default is "Combined" format

3. **Toggle between format options**
   - Click "Combined" → dimension columns show value + unit + tolerance
   - Click "Value Only" → dimension columns show only decimal value
   - Notice the preview updates INSTANTLY (no reload)

4. **Expand "Dimension Values" accordion**
   - Scroll down to field selection area
   - Look for accordion group labeled "Dimension Values"
   - Should be expanded by default
   - Shows checkboxes for: Length, Width, Height, Diameter, etc.

5. **Observe which dimension fields appear**
   - Only dimension types that EXIST in your components appear
   - If no components have "radius", no Radius checkbox appears
   - This is dynamic column discovery

6. **Toggle dimension field selection**
   - Uncheck "Length" → Length column disappears from preview below
   - Re-check "Length" → Length column reappears
   - Preview updates in real-time

7. **View the Preview table**
   - Scroll down to "Preview" section
   - See dimension columns alongside component data
   - Sparse data shows empty cells (components without that dimension type)
   - Format matches your toggle selection (Combined vs Value Only)

8. **Export the CSV**
   - Click the blue "Export CSV" button (top-right)
   - File downloads with dimension columns included
   - Open in Excel to verify dimension data

---

## What You Should See

✅ Export page loads with component count displayed
✅ "Dimension Format" toggle with two options (Combined/Value Only) is visible and highlighted
✅ "Dimension Values" accordion group in field selection area
✅ Dynamic dimension checkboxes based on actual component data
✅ Preview table shows dimension columns with values
✅ Format toggle updates preview instantly without data reload
✅ Deselecting dimension fields removes those columns from preview
✅ CSV export includes dimension data in selected format

---

## Troubleshooting

**No dimension fields appear in field selection:**
- Components in database have zero dimensions
- Add dimensions to components first (use Dimension Duplicate Prevention tutorial)
- Refresh the export page

**Preview shows "No components available for export":**
- No drawings/components loaded
- Upload and process drawings with components
- Check backend is running on port 8001

**Dimension values show as empty in preview:**
- Components exist but don't have that specific dimension type
- This is expected for sparse data (AC4: Sparse Data Handling)
- Components without a dimension type show empty string

**Format toggle doesn't update preview:**
- Check browser console for errors
- Ensure React state is updating (useMemo hook)
- Verify getDimensionFields() function exists in exportService.ts

**CSV export doesn't include dimensions:**
- Check that dimension fields are selected (checkboxes checked)
- Verify selectedFields includes dimension field keys
- Check backend /api/v1/export/drawings response includes dimension data

---

**Tutorial Type:** Core Feature
**Frequency:** Weekly (whenever exporting component data for analysis)
**Last Updated:** October 15, 2025
**Story:** 7.4 - Export Dimension Values in CSV
