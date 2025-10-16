# Tutorial: Add Component Dimension with Duplicate Prevention

**When to use:** When adding dimensional data to components and you want to see how the system prevents duplicate dimension types (e.g., can't add two "length" dimensions to the same component).

---

## Prerequisites

Run these commands first:
```bash
docker-compose up -d          # Start development environment
# OR
make dev-up                   # If using Makefile

# Ensure database has sample components
# Navigate to http://localhost:3000 and verify components exist
```

---

## Launch Tutorial

**Click to start:** Press `Cmd+Shift+P` → Type "Run Task" → Select "Tutorial: Dimension Duplicate Prevention"

Or run manually:
```bash
cd frontend
npx playwright test e2e/tutorials/dimension-duplicate-prevention.spec.ts --headed --debug
```

*Browser will open at the component editor with the "Add Dimension" button highlighted*

---

## Steps

1. **Navigate to a component** (tutorial opens the first available component)
   - If browser doesn't auto-navigate, go to http://localhost:3000 and click on any component

2. **Click "Add Dimension" button** (highlighted in red with pulsing border)
   - Button is in the Dimensions section of the component editor

3. **Observe the Dimension Type dropdown**
   - Notice some dimension types (e.g., "Length", "Width") may be DISABLED if the component already has them
   - Hover over disabled options to see tooltip: "This component already has a 'Length' dimension..."

4. **Try to add a new dimension**
   - Select an AVAILABLE dimension type (not grayed out)
   - Enter value: `15.75` or fractional like `15 3/4`
   - Select unit: `Inches (in)`
   - Add optional tolerance: `±0.01`
   - Click "Create"

5. **Open "Add Dimension" again**
   - Click the "Add Dimension" button again
   - Notice the dimension type you just added is now DISABLED
   - This prevents duplicate dimension types per component

6. **Edit an existing dimension** (optional)
   - Click the edit icon (pencil) on an existing dimension
   - Try to change its type to another existing type → validation prevents it
   - You CAN change it to a new type that doesn't exist yet

---

## What You Should See

✅ "Add Dimension" button highlighted in component editor's Dimensions section
✅ Dimension Form Dialog opens with dimension type dropdown
✅ Some dimension types are disabled (grayed out) if component already has them
✅ Tooltip explains "This component already has a 'Length' dimension. Edit the existing dimension instead."
✅ After creating a dimension, that type becomes disabled in future "Add Dimension" attempts
✅ Form validation prevents submission if you select a disabled/duplicate type

---

## Troubleshooting

**No "Add Dimension" button visible:**
- Ensure you're on a component detail/editor page (URL like `/components/{id}`)
- Check that component exists in database (upload and process a drawing first)
- Refresh the page

**All dimension types are enabled (none disabled):**
- Component has zero dimensions, so all types are available
- Add a dimension first, then re-open dialog to see the duplicate prevention

**Error: "Component already has a dimension of type...":**
- This is expected! Backend validation caught the duplicate
- Close dialog and edit the existing dimension instead
- This proves the backend validation is working (defense-in-depth)

---

**Tutorial Type:** Core Feature
**Frequency:** Weekly (whenever managing component dimensions)
**Last Updated:** October 15, 2025
**Story:** 6.4 - Prevent Duplicate Dimension Types Per Component
