"""Add instance_identifier to support multiple piece mark instances

Revision ID: 9bc6a98f1c12
Revises: add_saved_searches_table
Create Date: 2025-08-21 18:48:00.958284

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '9bc6a98f1c12'
down_revision = 'add_saved_searches_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add instance_identifier field to components table
    op.add_column('components', sa.Column('instance_identifier', sa.String(10), nullable=True))
    
    # Check if old constraint exists before trying to drop it
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    unique_constraints = inspector.get_unique_constraints('components')
    
    # Drop existing unique constraint if it exists
    for constraint in unique_constraints:
        if constraint['name'] == 'unique_piece_mark_per_drawing':
            op.drop_constraint('unique_piece_mark_per_drawing', 'components', type_='unique')
            break
    
    # Create new composite unique constraint
    # Note: In PostgreSQL, NULL values are considered distinct, so multiple NULLs are allowed
    op.create_unique_constraint(
        'unique_piece_mark_instance_per_drawing',
        'components',
        ['drawing_id', 'piece_mark', 'instance_identifier']
    )


def downgrade() -> None:
    # Drop the composite unique constraint
    op.drop_constraint('unique_piece_mark_instance_per_drawing', 'components', type_='unique')
    
    # Recreate original unique constraint (if it existed)
    try:
        op.create_unique_constraint(
            'unique_piece_mark_per_drawing',
            'components', 
            ['drawing_id', 'piece_mark']
        )
    except Exception:
        # Original constraint may not have existed
        pass
    
    # Remove instance_identifier column
    op.drop_column('components', 'instance_identifier')