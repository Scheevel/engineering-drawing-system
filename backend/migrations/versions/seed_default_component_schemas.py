"""Seed default component schemas for existing projects

Revision ID: seed_default_schemas
Revises: add_flexible_schemas
Create Date: 2025-09-24 00:01:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid
import json

# revision identifiers, used by Alembic.
revision = 'seed_default_schemas'
down_revision = 'add_flexible_schemas'
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()

    # Get all existing projects
    projects_result = connection.execute(sa.text("SELECT id FROM projects"))
    projects = projects_result.fetchall()

    # Also check for orphaned drawings (project_id = NULL) and create a global schema
    orphaned_drawings_result = connection.execute(sa.text("SELECT COUNT(*) FROM drawings WHERE project_id IS NULL"))
    has_orphaned_drawings = orphaned_drawings_result.fetchone()[0] > 0

    # Default schema field definitions matching current system
    default_fields = [
        {
            'field_name': 'component_type',
            'field_type': 'select',
            'field_config': {
                'options': [
                    'wide_flange', 'hss', 'angle', 'channel', 'plate', 'tube',
                    'beam', 'column', 'brace', 'girder', 'truss', 'generic'
                ],
                'allow_custom': False
            },
            'help_text': 'Select the type of structural component',
            'display_order': 0,
            'is_required': True
        },
        {
            'field_name': 'description',
            'field_type': 'text',
            'field_config': {
                'multiline': True,
                'max_length': 500
            },
            'help_text': 'Describe the component purpose and characteristics',
            'display_order': 1,
            'is_required': False
        },
        {
            'field_name': 'material_type',
            'field_type': 'autocomplete',
            'field_config': {
                'options': [
                    'A36 Steel', 'A572 Grade 50', 'A992 Steel',
                    'A500 Grade B', 'Aluminum', 'Stainless Steel', 'Galvanized Steel'
                ],
                'allow_custom': True
            },
            'help_text': 'Enter or select material specification',
            'display_order': 2,
            'is_required': False
        },
        {
            'field_name': 'quantity',
            'field_type': 'number',
            'field_config': {
                'min': 1,
                'step': 1,
                'integer_only': True
            },
            'help_text': 'Number of identical components',
            'display_order': 3,
            'is_required': True
        }
    ]

    for project in projects:
        project_id = project[0]
        schema_id = str(uuid.uuid4())

        # Create default schema for this project
        connection.execute(
            sa.text("""
                INSERT INTO component_schemas
                (id, project_id, name, description, schema_definition, version, is_default, is_active, created_by, created_at, updated_at)
                VALUES (:schema_id, :project_id, 'Default', 'Default component schema with basic fields', :schema_def, 1, true, true, 'system_migration', NOW(), NOW())
            """),
            {
                'schema_id': schema_id,
                'project_id': str(project_id),
                'schema_def': json.dumps({'version': '1.0', 'fields': default_fields})
            }
        )

        # Create schema fields
        for field_def in default_fields:
            field_id = str(uuid.uuid4())
            connection.execute(
                sa.text("""
                    INSERT INTO component_schema_fields
                    (id, schema_id, field_name, field_type, field_config, help_text, display_order, is_required, is_active)
                    VALUES (:field_id, :schema_id, :field_name, :field_type, :field_config, :help_text, :display_order, :is_required, true)
                """),
                {
                    'field_id': field_id,
                    'schema_id': schema_id,
                    'field_name': field_def['field_name'],
                    'field_type': field_def['field_type'],
                    'field_config': json.dumps(field_def['field_config']),
                    'help_text': field_def['help_text'],
                    'display_order': field_def['display_order'],
                    'is_required': field_def['is_required']
                }
            )

    # Create global schema for orphaned drawings (drawings with project_id = NULL)
    global_schema_id = None
    if has_orphaned_drawings:
        global_schema_id = str(uuid.uuid4())
        connection.execute(
            sa.text("""
                INSERT INTO component_schemas
                (id, project_id, name, description, schema_definition, version, is_default, is_active, created_by, created_at, updated_at)
                VALUES (:schema_id, NULL, 'Global Default', 'Default schema for drawings not assigned to projects', :schema_def, 1, true, true, 'system_migration', NOW(), NOW())
            """),
            {
                'schema_id': global_schema_id,
                'schema_def': json.dumps({'version': '1.0', 'fields': default_fields})
            }
        )

        # Create schema fields for global schema
        for field_def in default_fields:
            field_id = str(uuid.uuid4())
            connection.execute(
                sa.text("""
                    INSERT INTO component_schema_fields
                    (id, schema_id, field_name, field_type, field_config, help_text, display_order, is_required, is_active)
                    VALUES (:field_id, :schema_id, :field_name, :field_type, :field_config, :help_text, :display_order, :is_required, true)
                """),
                {
                    'field_id': field_id,
                    'schema_id': global_schema_id,
                    'field_name': field_def['field_name'],
                    'field_type': field_def['field_type'],
                    'field_config': json.dumps(field_def['field_config']),
                    'help_text': field_def['help_text'],
                    'display_order': field_def['display_order'],
                    'is_required': field_def['is_required']
                }
            )

    # Migrate existing component data to dynamic_data format
    # This preserves existing component_type, description, material_type, and quantity data
    print("Migrating existing component data to dynamic format...")

    # Update components for drawings with projects
    connection.execute(
        sa.text("""
            UPDATE components
            SET
                schema_id = (
                    SELECT cs.id
                    FROM component_schemas cs
                    JOIN drawings d ON d.project_id = cs.project_id
                    WHERE d.id = components.drawing_id
                    AND cs.is_default = true
                    LIMIT 1
                ),
                dynamic_data = jsonb_build_object(
                    'component_type', COALESCE(component_type, ''),
                    'description', COALESCE(description, ''),
                    'material_type', COALESCE(material_type, ''),
                    'quantity', COALESCE(quantity, 1)
                )
            WHERE schema_id IS NULL
            AND EXISTS (
                SELECT 1 FROM drawings d WHERE d.id = components.drawing_id AND d.project_id IS NOT NULL
            )
        """)
    )

    # Update components for orphaned drawings (project_id = NULL)
    if global_schema_id:
        connection.execute(
            sa.text("""
                UPDATE components
                SET
                    schema_id = :global_schema_id,
                    dynamic_data = jsonb_build_object(
                        'component_type', COALESCE(component_type, ''),
                        'description', COALESCE(description, ''),
                        'material_type', COALESCE(material_type, ''),
                        'quantity', COALESCE(quantity, 1)
                    )
                WHERE schema_id IS NULL
                AND EXISTS (
                    SELECT 1 FROM drawings d WHERE d.id = components.drawing_id AND d.project_id IS NULL
                )
            """),
            {'global_schema_id': global_schema_id}
        )

    # Verify migration
    result = connection.execute(sa.text("SELECT COUNT(*) FROM components WHERE schema_id IS NULL"))
    unmigrated_count = result.fetchone()[0]

    if unmigrated_count > 0:
        print(f"Warning: {unmigrated_count} components could not be migrated to schema format")
    else:
        print("All components successfully migrated to schema format")


def downgrade() -> None:
    connection = op.get_bind()

    # Restore original component data from dynamic_data
    connection.execute(
        sa.text("""
            UPDATE components
            SET
                component_type = CASE
                    WHEN dynamic_data ? 'component_type' THEN dynamic_data->>'component_type'
                    ELSE component_type
                END,
                description = CASE
                    WHEN dynamic_data ? 'description' THEN dynamic_data->>'description'
                    ELSE description
                END,
                material_type = CASE
                    WHEN dynamic_data ? 'material_type' THEN dynamic_data->>'material_type'
                    ELSE material_type
                END,
                quantity = CASE
                    WHEN dynamic_data ? 'quantity' THEN (dynamic_data->>'quantity')::integer
                    ELSE quantity
                END
            WHERE dynamic_data IS NOT NULL
        """)
    )

    # Remove all seeded schemas (this will cascade to schema_fields)
    connection.execute(
        sa.text("""
            DELETE FROM component_schemas
            WHERE created_by = 'system_migration'
        """)
    )