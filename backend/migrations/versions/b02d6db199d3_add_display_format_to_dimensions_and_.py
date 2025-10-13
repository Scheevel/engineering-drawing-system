"""add_display_format_to_dimensions_and_specifications

Revision ID: b02d6db199d3
Revises: 094fb7c755c4
Create Date: 2025-10-13 17:32:43.835611

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b02d6db199d3'
down_revision = '094fb7c755c4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add display_format column to dimensions and specifications tables"""
    op.add_column('dimensions',
        sa.Column('display_format', sa.String(10), nullable=True, server_default='decimal')
    )
    op.add_column('specifications',
        sa.Column('display_format', sa.String(10), nullable=True)
    )


def downgrade() -> None:
    """Remove display_format column from dimensions and specifications tables"""
    op.drop_column('dimensions', 'display_format')
    op.drop_column('specifications', 'display_format')