"""Initial migration - create application tables

Revision ID: create_app_tables
Revises: 
Create Date: 2025-07-11 16:43:25.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
import uuid

# revision identifiers, used by Alembic.
revision = 'create_app_tables'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create projects table
    op.create_table('projects',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('client', sa.String(255)),
        sa.Column('location', sa.String(255)),
        sa.Column('description', sa.Text()),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now())
    )

    # Create drawings table
    op.create_table('drawings',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('project_id', UUID(as_uuid=True), sa.ForeignKey('projects.id'), nullable=True),
        sa.Column('file_name', sa.String(255), nullable=False),
        sa.Column('original_name', sa.String(255)),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('file_size', sa.Integer()),
        sa.Column('drawing_type', sa.String(50)),
        sa.Column('sheet_number', sa.String(50)),
        sa.Column('drawing_date', sa.DateTime()),
        sa.Column('upload_date', sa.DateTime(), default=sa.func.now()),
        sa.Column('processing_status', sa.String(50), default='pending'),
        sa.Column('processing_progress', sa.Integer(), default=0),
        sa.Column('error_message', sa.Text()),
        sa.Column('drawing_metadata', sa.JSON())
    )

    # Create components table
    op.create_table('components',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('drawing_id', UUID(as_uuid=True), sa.ForeignKey('drawings.id'), nullable=False),
        sa.Column('piece_mark', sa.String(100)),
        sa.Column('component_type', sa.String(100)),
        sa.Column('quantity', sa.Integer()),
        sa.Column('location_x', sa.Float()),
        sa.Column('location_y', sa.Float()),
        sa.Column('bounding_box', sa.JSON()),
        sa.Column('confidence_score', sa.Float()),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now())
    )
    
    # Create index for piece_mark search
    op.create_index('ix_components_piece_mark', 'components', ['piece_mark'])


def downgrade():
    op.drop_index('ix_components_piece_mark', 'components')
    op.drop_table('components')
    op.drop_table('drawings')  
    op.drop_table('projects')
