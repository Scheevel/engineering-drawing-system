# Story 7.3 - Quick Implementation Guide

## Problem Statement

Component schema fields stored in `component.dynamic_data` (e.g., F106's "inspect" and "result" fields) are not exported as separate CSV columns.

## Solution: Data-Driven Field Discovery (Path 1)

Enhance `exportService.ts` to discover and export nested `dynamic_data` fields.

## Code Changes Required

### 1. Update `getComponentDataFields()` (~line 64)

**Add after existing `Object.keys(component).forEach()` loop:**

```typescript
// Discover fields from component.dynamic_data
if (component.dynamic_data && typeof component.dynamic_data === 'object') {
  Object.keys(component.dynamic_data).forEach(key => {
    const fieldKey = `component_${key}`;

    if (
      !discoveredKeys.has(key) &&
      (!existingFieldKeys || !existingFieldKeys.has(fieldKey))
    ) {
      discoveredKeys.add(key);
      fields.push({
        key: fieldKey,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        type: typeof component.dynamic_data[key] === 'number' ? 'number' : 'string',
        group: 'components'
      });
    }
  });
}
```

### 2. Update `generateCSV()` (~line 119)

**Modify the component field extraction:**

```typescript
// Handle component fields (primary data)
if (field.key.startsWith('component_')) {
  const componentKey = field.key.replace('component_', '');
  // Check top-level first, then dynamic_data
  value = component[componentKey] || component.dynamic_data?.[componentKey];
}
```

## Expected Result

**Before:**
```csv
Piece Mark,Component Type
F106,Flange
G204,Girder
```

**After:**
```csv
Piece Mark,Component Type,Inspect,Result,Thickness
F106,Flange,Pass,Good,
G204,Girder,,,10mm
```

## Testing Checklist

- [ ] Export F106 component with `{ inspect: "Pass", result: "Good" }`
- [ ] Verify "Inspect" and "Result" columns appear in CSV
- [ ] Verify F106 row has correct values
- [ ] Verify components without these fields show empty cells
- [ ] Verify preview shows dynamic columns
- [ ] Update unit tests in `exportService.test.ts`

## Estimated Time: 2-3 hours

**Files to modify:**
- `frontend/src/services/exportService.ts` (~30 lines of code)
- `frontend/src/services/__tests__/exportService.test.ts` (test updates)
