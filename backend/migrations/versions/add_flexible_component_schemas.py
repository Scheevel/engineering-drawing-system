"""Add flexible component schema support

Revision ID: add_flexible_schemas
Revises: 9bc6a98f1c12
Create Date: 2025-09-24 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = 'add_flexible_schemas'
down_revision = '9bc6a98f1c12'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create component_schemas table
    op.create_table(
        'component_schemas',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id'), nullable=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('schema_definition', postgresql.JSONB(), nullable=False),
        sa.Column('version', sa.Integer(), default=1, nullable=False),
        sa.Column('is_default', sa.Boolean(), default=False, nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_by', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now(), nullable=False),

        # Unique constraint for project + name + version
        sa.UniqueConstraint('project_id', 'name', 'version', name='unique_schema_version_per_project')
    )

    # Create component_schema_fields table
    op.create_table(
        'component_schema_fields',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('schema_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('component_schemas.id', ondelete='CASCADE'), nullable=False),
        sa.Column('field_name', sa.String(100), nullable=False),
        sa.Column('field_type', sa.String(50), nullable=False),  # text, number, select, date, etc.
        sa.Column('field_config', postgresql.JSONB(), nullable=True),  # validation, options, etc.
        sa.Column('help_text', sa.Text(), nullable=True),
        sa.Column('display_order', sa.Integer(), default=0, nullable=False),
        sa.Column('is_required', sa.Boolean(), default=False, nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),

        # Unique constraint for schema + field_name
        sa.UniqueConstraint('schema_id', 'field_name', name='unique_field_per_schema')
    )

    # Add new columns to existing components table
    op.add_column('components', sa.Column('schema_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('component_schemas.id'), nullable=True))
    op.add_column('components', sa.Column('dynamic_data', postgresql.JSONB(), nullable=True))

    # Create performance indexes
    op.create_index('idx_components_schema_id', 'components', ['schema_id'])
    op.create_index('idx_schema_fields_schema_id', 'component_schema_fields', ['schema_id'])
    op.create_index('idx_schemas_project_default', 'component_schemas', ['project_id', 'is_default'])
    op.create_index('idx_schemas_project_active', 'component_schemas', ['project_id', 'is_active'])
    op.create_index('idx_schema_fields_order', 'component_schema_fields', ['schema_id', 'display_order'])

    # Create GIN index for dynamic_data JSONB queries (PostgreSQL specific)
    op.create_index('idx_components_dynamic_data_gin', 'components', ['dynamic_data'], postgresql_using='gin')


def downgrade() -> None:
    # Drop indexes first
    op.drop_index('idx_components_dynamic_data_gin', 'components')
    op.drop_index('idx_schema_fields_order', 'component_schema_fields')
    op.drop_index('idx_schemas_project_active', 'component_schemas')
    op.drop_index('idx_schemas_project_default', 'component_schemas')
    op.drop_index('idx_schema_fields_schema_id', 'component_schema_fields')
    op.drop_index('idx_components_schema_id', 'components')

    # Remove new columns from components table
    op.drop_column('components', 'dynamic_data')
    op.drop_column('components', 'schema_id')

    # Drop schema tables (in reverse order due to foreign keys)
    op.drop_table('component_schema_fields')
    op.drop_table('component_schemas')