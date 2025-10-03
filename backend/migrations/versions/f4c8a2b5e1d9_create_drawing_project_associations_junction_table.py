"""Create drawing_project_associations junction table (Phase A)

Revision ID: f4c8a2b5e1d9
Revises: 0ab370a9afb6
Create Date: 2025-10-03 10:00:00.000000

This is Phase A of the project-drawing many-to-many migration:
- Creates junction table with CASCADE constraints
- Migrates existing project_id data to junction table
- Preserves drawings.project_id column (Phase C will drop it)
- Includes rollback procedure

Story: 8.1a AC2 & AC3 - Backend Foundation & Bug Fix
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'f4c8a2b5e1d9'
down_revision = '0ab370a9afb6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Phase A: Create junction table and migrate data
    - Safe to run without breaking existing code
    - Existing code continues using drawings.project_id
    """
    # Create the junction table
    op.create_table(
        'drawing_project_associations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('drawing_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('assigned_by', sa.String(length=255), nullable=True),

        # Foreign key constraints with CASCADE
        sa.ForeignKeyConstraint(['drawing_id'], ['drawings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),

        # Unique constraint to prevent duplicate associations
        sa.UniqueConstraint('drawing_id', 'project_id', name='uq_drawing_project_association')
    )

    # Create performance indexes
    op.create_index('idx_dpa_drawing_id', 'drawing_project_associations', ['drawing_id'])
    op.create_index('idx_dpa_project_id', 'drawing_project_associations', ['project_id'])

    # Migrate existing data from drawings.project_id to junction table
    # Only migrate non-null project_id values
    op.execute("""
        INSERT INTO drawing_project_associations (id, drawing_id, project_id, assigned_at, assigned_by)
        SELECT
            gen_random_uuid() as id,
            d.id as drawing_id,
            d.project_id,
            COALESCE(d.upload_date, NOW()) as assigned_at,
            'migration_phase_a' as assigned_by
        FROM drawings d
        WHERE d.project_id IS NOT NULL
    """)

    # Log migration results
    connection = op.get_bind()
    result = connection.execute(sa.text(
        "SELECT COUNT(*) FROM drawing_project_associations WHERE assigned_by = 'migration_phase_a'"
    ))
    migrated_count = result.scalar()
    print(f"✓ Phase A Complete: Migrated {migrated_count} drawing-project associations")


def downgrade() -> None:
    """
    Rollback Phase A:
    - Restore project_id from junction table (first association only)
    - Drop junction table and indexes

    WARNING: If multiple projects are associated with a drawing,
    only the first one will be restored to drawings.project_id
    """
    # Restore project_id to drawings table from junction table
    # For drawings with multiple projects, take the earliest association
    op.execute("""
        UPDATE drawings d
        SET project_id = (
            SELECT dpa.project_id
            FROM drawing_project_associations dpa
            WHERE dpa.drawing_id = d.id
            ORDER BY dpa.assigned_at ASC
            LIMIT 1
        )
        WHERE EXISTS (
            SELECT 1
            FROM drawing_project_associations dpa
            WHERE dpa.drawing_id = d.id
        )
    """)

    # Log rollback results
    connection = op.get_bind()
    result = connection.execute(sa.text(
        "SELECT COUNT(*) FROM drawings WHERE project_id IS NOT NULL"
    ))
    restored_count = result.scalar()
    print(f"✓ Rollback Complete: Restored {restored_count} project_id values to drawings table")

    # Drop indexes
    op.drop_index('idx_dpa_project_id', table_name='drawing_project_associations')
    op.drop_index('idx_dpa_drawing_id', table_name='drawing_project_associations')

    # Drop junction table
    op.drop_table('drawing_project_associations')
