"""Add missing timestamp columns to component_schema_fields

Revision ID: 0ab370a9afb6
Revises: seed_default_schemas
Create Date: 2025-09-24 20:27:24.845974

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0ab370a9afb6'
down_revision = 'seed_default_schemas'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing timestamp columns to component_schema_fields
    op.add_column('component_schema_fields',
        sa.Column('created_at', sa.DateTime(), nullable=True, default=sa.func.now())
    )
    op.add_column('component_schema_fields',
        sa.Column('updated_at', sa.DateTime(), nullable=True, default=sa.func.now())
    )

    # Update existing rows to have current timestamp
    op.execute("UPDATE component_schema_fields SET created_at = NOW(), updated_at = NOW() WHERE created_at IS NULL")

    # Make columns not null after setting defaults
    op.alter_column('component_schema_fields', 'created_at', nullable=False)
    op.alter_column('component_schema_fields', 'updated_at', nullable=False)


def downgrade() -> None:
    # Remove the timestamp columns
    op.drop_column('component_schema_fields', 'updated_at')
    op.drop_column('component_schema_fields', 'created_at')