# Tutorial: Create Custom Schema

**When to use:** When you need to define a new component type with custom fields

---

## Prerequisites

Run these commands first:
```bash
make dev-up              # Start development environment
make seed-test-data      # Load test data (optional)
```

---

## Launch Tutorial

**Click to start:** Press `Cmd+Shift+P` → Type "Run Task" → Select "Tutorial: Create Schema"

Or run manually:
```bash
npx playwright test schema-create-tutorial.spec.ts --headed --debug
```

*Browser will open at schema management page with interactive elements highlighted*

---

## Steps

1. **Click "Create Schema" button** (highlighted in red, top-right)

2. **Enter Component Type**
   - Field: "Component Type Name"
   - Example: "Beam", "Column", "Brace"
   - Must be unique

3. **Click "Add Field"** (button below component type)

4. **Configure First Field**
   - Field Name: e.g., "Length"
   - Field Type: Select from dropdown (text, number, date, etc.)
   - Required: Toggle if mandatory

5. **Add More Fields** (repeat step 3-4 as needed)
   - Common fields: dimensions, material, specifications

6. **Click "Save Schema"** (bottom-right, primary button)

---

## What You Should See

✅ Success notification appears
✅ Schema appears in list with your component type name
✅ New component type available in dropdown when creating components

---

## Troubleshooting

**"Create Schema" button not visible:**
- Verify you're at `/components/schema`
- Try direct navigation: Go to `/schemas/create`
- Check SchemaListView component is activated

**"Component type already exists" error:**
- Use a different, unique name
- Check existing schemas list first
- Names are case-sensitive

**Fields not saving:**
- Verify all required field properties filled
- Check browser console for errors (F12)
- Ensure field names are unique within schema

---

**Tutorial Type:** Core Feature
**Frequency:** Monthly
**Last Updated:** October 14, 2025
