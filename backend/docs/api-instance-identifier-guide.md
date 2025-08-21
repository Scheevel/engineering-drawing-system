# API Guide: Instance Identifier Support

This guide documents the new `instance_identifier` field support for managing multiple instances of the same piece mark within a drawing.

## Overview

The Component API now supports an optional `instance_identifier` field that allows multiple components with the same `piece_mark` to exist within the same drawing, as long as they have different `instance_identifier` values.

## API Changes

### Request Models

All component request models now include the optional `instance_identifier` field:

```json
{
  "instance_identifier": "string (optional, max 10 characters)"
}
```

### Response Models

All component responses now include the `instance_identifier` field:

```json
{
  "instance_identifier": "string | null"
}
```

## Usage Examples

### Creating Components with Instance Identifiers

**Create first instance:**
```http
POST /components
Content-Type: application/json

{
  "drawing_id": "123e4567-e89b-12d3-a456-426614174000",
  "piece_mark": "G1",
  "component_type": "wide_flange",
  "location_x": 10.5,
  "location_y": 20.0,
  "instance_identifier": "A"
}
```

**Create second instance with same piece mark:**
```http
POST /components
Content-Type: application/json

{
  "drawing_id": "123e4567-e89b-12d3-a456-426614174000", 
  "piece_mark": "G1",
  "component_type": "wide_flange",
  "location_x": 30.5,
  "location_y": 40.0,
  "instance_identifier": "B"
}
```

### Creating Components Without Instance Identifier (Backward Compatibility)

Components can still be created without specifying `instance_identifier`:

```http
POST /components
Content-Type: application/json

{
  "drawing_id": "123e4567-e89b-12d3-a456-426614174000",
  "piece_mark": "G2", 
  "component_type": "wide_flange",
  "location_x": 10.5,
  "location_y": 20.0
}
```

### Updating Instance Identifier

```http
PUT /components/{component_id}
Content-Type: application/json

{
  "instance_identifier": "C"
}
```

### Clearing Instance Identifier

```http
PUT /components/{component_id}
Content-Type: application/json

{
  "instance_identifier": null
}
```

## Error Scenarios

### Duplicate Component Error

When attempting to create a duplicate component with the same `(drawing_id, piece_mark, instance_identifier)` combination:

**Request:**
```http
POST /components
Content-Type: application/json

{
  "drawing_id": "123e4567-e89b-12d3-a456-426614174000",
  "piece_mark": "G1",
  "instance_identifier": "A"
}
```

**Response:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "detail": "Component with piece mark 'G1' and instance identifier 'A' already exists in this drawing"
}
```

### Validation Error for Long Instance Identifier

**Request:**
```http
POST /components
Content-Type: application/json

{
  "piece_mark": "G1",
  "instance_identifier": "ABCDEFGHIJK"
}
```

**Response:**
```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "detail": [
    {
      "type": "string_too_long",
      "loc": ["body", "instance_identifier"],
      "msg": "String should have at most 10 characters",
      "input": "ABCDEFGHIJK"
    }
  ]
}
```

## Uniqueness Constraint

The uniqueness constraint now considers the combination of:
- `drawing_id`
- `piece_mark` 
- `instance_identifier`

This allows:
- ✅ Same `piece_mark` with different `instance_identifier` in same drawing
- ✅ Same `piece_mark` with same `instance_identifier` in different drawings
- ✅ Components with `NULL` `instance_identifier` (backward compatibility)
- ❌ Duplicate `(drawing_id, piece_mark, instance_identifier)` combinations

## Backward Compatibility

- Existing API calls without `instance_identifier` continue to work
- Existing components return `instance_identifier: null` in responses
- All existing functionality remains unchanged
- The field is optional in all request models

## Response Examples

### Component with Instance Identifier

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "drawing_id": "987fcdeb-51a2-43d7-8f9e-123456789abc",
  "piece_mark": "G1",
  "component_type": "wide_flange", 
  "description": "Main beam connection",
  "quantity": 1,
  "location_x": 10.5,
  "location_y": 20.0,
  "instance_identifier": "A",
  "review_status": "pending",
  "created_at": "2025-08-21T10:30:00Z",
  "updated_at": "2025-08-21T10:30:00Z"
}
```

### Component without Instance Identifier

```json
{
  "id": "456e7890-e89b-12d3-a456-426614174111",
  "drawing_id": "987fcdeb-51a2-43d7-8f9e-123456789abc",
  "piece_mark": "G2",
  "component_type": "wide_flange",
  "description": "Secondary beam",
  "quantity": 1,
  "location_x": 30.5,
  "location_y": 40.0,
  "instance_identifier": null,
  "review_status": "pending", 
  "created_at": "2025-08-21T10:35:00Z",
  "updated_at": "2025-08-21T10:35:00Z"
}
```