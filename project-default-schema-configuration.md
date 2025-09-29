# Project Default Schema Configuration

## Overview

The Engineering Drawing Index System supports **flexible component schemas** that define the structure and validation rules for component data. Each project can have its own default schema, with a global fallback system for drawings not assigned to projects.

This document explains how users can specify and manage project default type schemas within the system.

## How Default Schemas Work

### Hierarchy & Fallback Logic

The system uses a hierarchical approach to schema selection:

1. **Project-Specific Default**: When creating components in a project, the system first looks for a schema marked as `is_default: true` within that project
2. **Global Default Fallback**: If no project default exists, the system uses the global default schema (`project_id: NULL` and `is_default: true`)
3. **Automatic Assignment**: New components automatically receive the appropriate default schema based on their drawing's project assignment

### Key Implementation Files

- **Backend Service**: `backend/app/services/schema_service.py:get_default_schema()`
- **Frontend Integration**: `frontend/src/components/flexible/FlexibleComponentCard.tsx:47-49`
- **Database Migration**: `backend/migrations/versions/seed_default_component_schemas.py`
- **API Endpoints**: `backend/app/api/schemas.py`

## User Methods to Specify Default Schemas

### Method 1: Create Schema as Default (API)

When creating a new schema, users can mark it as the project default:

**Endpoint**: `POST /api/v1/schemas/`

```json
{
  "name": "Standard Bridge Components",
  "description": "Default schema for bridge component specifications",
  "is_default": true,
  "is_active": true,
  "project_id": "uuid-of-project",
  "fields": [
    {
      "field_name": "component_type",
      "field_type": "select",
      "field_config": {
        "options": ["wide_flange", "hss", "angle", "channel", "plate", "tube"],
        "allow_custom": false
      },
      "is_required": true,
      "display_order": 0
    },
    {
      "field_name": "description",
      "field_type": "text",
      "field_config": {
        "multiline": true,
        "max_length": 500
      },
      "is_required": false,
      "display_order": 1
    }
  ]
}
```

### Method 2: Update Existing Schema to Default (API)

Users can promote an existing schema to be the project default:

**Endpoint**: `PUT /api/v1/schemas/{schema_id}`

```json
{
  "is_default": true
}
```

**Important**: The system allows only **one default schema per project**. Setting `is_default: true` on a schema should automatically unset any existing default for that project.

### Method 3: System Migration (Automated)

The system automatically creates default schemas for existing projects through database migrations:

- **Migration File**: `backend/migrations/versions/seed_default_component_schemas.py`
- **Migration ID**: `seed_default_schemas`
- **Triggers**: When upgrading to flexible schema system
- **Behavior**: Creates a "Default" schema for each existing project with standard engineering fields

## Default Schema Structure

### Standard Default Fields

The system seeds projects with these standard fields for engineering components:

```json
{
  "component_type": {
    "field_type": "select",
    "options": [
      "wide_flange", "hss", "angle", "channel", "plate", "tube",
      "beam", "column", "brace", "girder", "truss", "generic"
    ],
    "allow_custom": false,
    "required": true,
    "help_text": "Select the type of structural component"
  },
  "description": {
    "field_type": "text",
    "multiline": true,
    "max_length": 500,
    "required": false,
    "help_text": "Describe the component purpose and characteristics"
  },
  "material_type": {
    "field_type": "autocomplete",
    "options": [
      "A36 Steel", "A572 Grade 50", "A992 Steel", "A500 Grade B",
      "Aluminum", "Stainless Steel", "Galvanized Steel"
    ],
    "allow_custom": true,
    "required": false,
    "help_text": "Enter or select material specification"
  },
  "quantity": {
    "field_type": "number",
    "min": 1,
    "step": 1,
    "integer_only": true,
    "required": true,
    "help_text": "Number of identical components"
  }
}
```

### Schema Field Types

The system supports the following field types:

- **`text`**: Single-line or multi-line text input
- **`number`**: Numeric input with validation (min, max, step, integer_only)
- **`select`**: Dropdown selection from predefined options
- **`checkbox`**: Boolean true/false selection
- **`textarea`**: Multi-line text input
- **`date`**: Date picker input
- **`autocomplete`**: Searchable dropdown with custom value support

## Database Schema

### Key Tables

```sql
-- Schema definitions with default flag
CREATE TABLE component_schemas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),  -- NULL for global schemas
    name VARCHAR(100) NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    is_default BOOLEAN DEFAULT FALSE,         -- KEY FIELD FOR DEFAULTS
    is_active BOOLEAN DEFAULT TRUE,
    schema_definition JSONB,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Individual field configurations
CREATE TABLE component_schema_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schema_id UUID REFERENCES component_schemas(id) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    field_config JSONB DEFAULT '{}',
    help_text TEXT,
    display_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Components reference schemas
CREATE TABLE components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drawing_id UUID REFERENCES drawings(id) NOT NULL,
    schema_id UUID REFERENCES component_schemas(id),  -- Links to schema
    piece_mark VARCHAR(100) NOT NULL,
    dynamic_data JSONB DEFAULT '{}',  -- Schema-driven data storage
    -- ... other fields
);
```

### Important Database Indexes

```sql
-- Fast lookup of project defaults
CREATE INDEX idx_schemas_project_default ON component_schemas (project_id, is_default);

-- Field ordering within schemas
CREATE INDEX idx_schema_fields_order ON component_schema_fields (schema_id, display_order);
```

## API Endpoints for Managing Defaults

### Retrieving Default Schemas

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `GET /api/v1/schemas/projects/{project_id}/default` | Get project's default schema | ComponentSchemaResponse |
| `GET /api/v1/schemas/global/default` | Get global default schema | ComponentSchemaResponse |
| `GET /api/v1/schemas/projects/{project_id}` | Get all schemas for project (includes default) | ComponentSchemaListResponse |

### Managing Schema Defaults

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/schemas/` | POST | Create new schema (set `is_default: true`) |
| `/api/v1/schemas/{schema_id}` | PUT | Update schema to mark as default |

### Error Responses

- **HTTP 404**: No default schema found for project
- **HTTP 400**: Invalid schema data or validation errors
- **HTTP 500**: Server error during schema operations

## Frontend Integration

### Automatic Default Selection

The frontend automatically selects appropriate defaults when creating components:

```typescript
// From FlexibleComponentCard.tsx:47-49
const defaultSchema = projectSchemas.schemas.find(s => s.is_default) || projectSchemas.schemas[0];
setSelectedSchema(defaultSchema);
setPendingSchemaId(defaultSchema.id);
```

### Schema Selection UI

- **Type Dropdown**: `frontend/src/components/flexible/TypeSelectionDropdown.tsx`
- **Schema Form**: `frontend/src/components/flexible/SchemaAwareForm.tsx`
- **Default Indication**: Shows "Default Schema" label in UI

## Business Rules & Constraints

### Default Schema Rules

1. **One Default Per Project**: Only one schema can be marked `is_default: true` per project
2. **Global Fallback Required**: System must maintain one global default schema (`project_id: NULL`)
3. **Automatic Assignment**: New components inherit their drawing's project default schema
4. **Schema Locking**: Components become "type-locked" after creation, preventing schema changes in certain conditions

### Validation Rules

- Schema names must be unique within a project
- Field names must be unique within a schema
- At least one field is required per schema
- Default schemas cannot be deleted if components reference them

### Error Handling & Fallbacks

- Returns HTTP 404 if no default schema found for project
- Falls back to global default when project default is missing
- Frontend gracefully selects first available schema if no default marked
- Validates schema structure and field uniqueness before creation

## Migration and Upgrade Process

### From Legacy System

When upgrading from the previous rigid component system:

1. **Migration runs automatically**: `seed_default_component_schemas.py`
2. **Preserves existing data**: Legacy fields mapped to dynamic_data format
3. **Creates project defaults**: Each existing project gets a "Default" schema
4. **Maintains compatibility**: Existing components continue to work

### Testing Migration

Use the migration test script:

```bash
cd backend/migrations
python test_schema_migration.py
```

This validates that all projects have default schemas after migration.

## Troubleshooting

### Common Issues

1. **No Default Schema Found**
   - Check if project has schema with `is_default: true`
   - Verify global default schema exists (`project_id: NULL`)
   - Run migration to create missing defaults

2. **Multiple Default Schemas**
   - Only one schema per project should have `is_default: true`
   - Use database query to identify conflicts:
   ```sql
   SELECT project_id, COUNT(*)
   FROM component_schemas
   WHERE is_default = true
   GROUP BY project_id
   HAVING COUNT(*) > 1;
   ```

3. **Components Not Using Default Schema**
   - Check if `schema_id` is properly assigned during component creation
   - Verify schema assignment logic in `schema_service.py:get_default_schema()`

### Database Queries for Debugging

```sql
-- Find all default schemas
SELECT p.name as project_name, cs.name as schema_name, cs.is_default
FROM component_schemas cs
LEFT JOIN projects p ON p.id = cs.project_id
WHERE cs.is_default = true;

-- Count components per schema
SELECT cs.name, COUNT(c.id) as component_count
FROM component_schemas cs
LEFT JOIN components c ON c.schema_id = cs.id
GROUP BY cs.id, cs.name;

-- Find components without schemas
SELECT COUNT(*) FROM components WHERE schema_id IS NULL;
```

## Summary

The flexible schema system provides a robust foundation for customizing component data structures while maintaining consistency through intelligent defaults. Users can specify project default schemas through API calls or rely on automated system migration, with a hierarchical fallback system ensuring components always receive appropriate schema assignments.