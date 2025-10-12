"""Add index on component_audit_logs session_id

Revision ID: 094fb7c755c4
Revises: f4c8a2b5e1d9
Create Date: 2025-10-12 01:58:40.709273

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '094fb7c755c4'
down_revision = 'f4c8a2b5e1d9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add index on session_id for efficient querying of linked audit records
    op.create_index(
        'idx_component_audit_logs_session_id',
        'component_audit_logs',
        ['session_id']
    )


def downgrade() -> None:
    # Remove the index
    op.drop_index('idx_component_audit_logs_session_id', table_name='component_audit_logs')