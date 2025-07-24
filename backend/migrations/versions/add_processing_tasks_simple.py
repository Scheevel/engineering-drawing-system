"""Add processing_tasks table (simple)

Revision ID: add_processing_tasks_simple
Revises: create_app_tables
Create Date: 2025-07-14 18:42:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_processing_tasks_simple'
down_revision = 'create_app_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add processing_tasks table
    op.create_table('processing_tasks',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('drawing_id', sa.UUID(), nullable=False),
        sa.Column('task_type', sa.String(length=50), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('progress', sa.Integer(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('result_data', sa.JSON(), nullable=True),
        sa.Column('celery_task_id', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['drawing_id'], ['drawings.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add search_logs table
    op.create_table('search_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('query', sa.String(length=500), nullable=False),
        sa.Column('filters', sa.JSON(), nullable=True),
        sa.Column('results_count', sa.Integer(), nullable=True),
        sa.Column('response_time_ms', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.String(length=100), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add dimensions table
    op.create_table('dimensions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('component_id', sa.UUID(), nullable=False),
        sa.Column('dimension_type', sa.String(length=50), nullable=True),
        sa.Column('nominal_value', sa.Float(), nullable=True),
        sa.Column('tolerance', sa.String(length=50), nullable=True),
        sa.Column('unit', sa.String(length=20), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('location_x', sa.Float(), nullable=True),
        sa.Column('location_y', sa.Float(), nullable=True),
        sa.Column('extracted_text', sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(['component_id'], ['components.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add specifications table
    op.create_table('specifications',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('component_id', sa.UUID(), nullable=False),
        sa.Column('specification_type', sa.String(length=100), nullable=True),
        sa.Column('value', sa.String(length=255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['component_id'], ['components.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add missing columns to components table
    with op.batch_alter_table('components', schema=None) as batch_op:
        batch_op.add_column(sa.Column('description', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('material_type', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('review_status', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('extracted_data', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('updated_at', sa.DateTime(), nullable=True))
        batch_op.alter_column('piece_mark', nullable=False)


def downgrade() -> None:
    # Remove added columns from components
    with op.batch_alter_table('components', schema=None) as batch_op:
        batch_op.drop_column('updated_at')
        batch_op.drop_column('extracted_data')
        batch_op.drop_column('review_status')
        batch_op.drop_column('material_type')
        batch_op.drop_column('description')
        batch_op.alter_column('piece_mark', nullable=True)
    
    # Drop tables
    op.drop_table('specifications')
    op.drop_table('dimensions')
    op.drop_table('search_logs')
    op.drop_table('processing_tasks')