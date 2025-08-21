"""
Test migration for adding instance_identifier to support multiple piece mark instances

This test suite validates that the migration preserves all existing data and handles
the schema changes correctly.
"""
import pytest
import uuid
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.models.database import Base, Component, Drawing, Project


class TestInstanceIdentifierMigration:
    """Test the instance_identifier migration data preservation and functionality."""
    
    @pytest.fixture
    def test_engine(self):
        """Create a test database engine."""
        # Use test database URL from environment or default to local test DB
        import os
        database_url = os.getenv('TEST_DATABASE_URL', 'postgresql://user:password@localhost:5432/drawing_index_test')
        engine = create_engine(database_url)
        return engine
    
    @pytest.fixture
    def session(self, test_engine):
        """Create a database session for testing."""
        Session = sessionmaker(bind=test_engine)
        session = Session()
        yield session
        session.close()
    
    def test_data_preservation_before_migration(self, session):
        """Test that creates sample data to validate preservation after migration."""
        # Create test project
        project = Project(
            id=uuid.uuid4(),
            name="Test Migration Project",
            client="Test Client",
            created_at=datetime.utcnow()
        )
        session.add(project)
        session.flush()
        
        # Create test drawing
        drawing = Drawing(
            id=uuid.uuid4(),
            project_id=project.id,
            file_name="test_drawing.pdf",
            original_name="Original Drawing.pdf",
            file_path="/test/path/drawing.pdf",
            processing_status="completed",
            created_at=datetime.utcnow()
        )
        session.add(drawing)
        session.flush()
        
        # Create test components with same piece mark (this should work after migration)
        component1 = Component(
            id=uuid.uuid4(),
            drawing_id=drawing.id,
            piece_mark="G1",
            component_type="girder",
            quantity=1,
            material_type="steel",
            confidence_score=0.95,
            created_at=datetime.utcnow()
        )
        
        component2 = Component(
            id=uuid.uuid4(),
            drawing_id=drawing.id,
            piece_mark="B2",
            component_type="brace",
            quantity=2,
            material_type="steel",
            confidence_score=0.88,
            created_at=datetime.utcnow()
        )
        
        session.add_all([component1, component2])
        session.commit()
        
        # Verify data was inserted
        components = session.query(Component).filter_by(drawing_id=drawing.id).all()
        assert len(components) == 2
        assert components[0].piece_mark in ["G1", "B2"]
        assert components[1].piece_mark in ["G1", "B2"]
        
        return {
            'project_id': project.id,
            'drawing_id': drawing.id,
            'component_ids': [component1.id, component2.id]
        }
    
    def test_data_preservation_after_migration(self, session):
        """Test that all existing data is preserved after migration."""
        # Query all components to ensure they still exist
        components = session.query(Component).all()
        
        for component in components:
            # Verify all original fields are still present
            assert component.id is not None
            assert component.drawing_id is not None
            assert component.piece_mark is not None
            assert hasattr(component, 'instance_identifier')  # New field should exist
            
            # For existing records, instance_identifier should be NULL
            # (unless explicitly set during migration)
            if component.instance_identifier is None:
                print(f"Component {component.piece_mark} has NULL instance_identifier as expected")
    
    def test_multiple_piece_mark_instances(self, session):
        """Test that multiple instances of same piece mark can now be created."""
        # Create test data
        project = Project(
            name="Multi-Instance Test Project",
            created_at=datetime.utcnow()
        )
        session.add(project)
        session.flush()
        
        drawing = Drawing(
            project_id=project.id,
            file_name="multi_instance_test.pdf",
            file_path="/test/multi_instance.pdf",
            processing_status="completed",
            created_at=datetime.utcnow()
        )
        session.add(drawing)
        session.flush()
        
        # Create multiple instances of the same piece mark with different instance identifiers
        component1 = Component(
            drawing_id=drawing.id,
            piece_mark="G1",
            instance_identifier="A",
            component_type="girder",
            quantity=1,
            created_at=datetime.utcnow()
        )
        
        component2 = Component(
            drawing_id=drawing.id,
            piece_mark="G1", 
            instance_identifier="B",
            component_type="girder",
            quantity=1,
            created_at=datetime.utcnow()
        )
        
        # This should NOT raise a constraint violation after migration
        session.add_all([component1, component2])
        session.commit()
        
        # Verify both components were created
        g1_components = session.query(Component).filter_by(
            drawing_id=drawing.id, 
            piece_mark="G1"
        ).all()
        
        assert len(g1_components) == 2
        instance_ids = [c.instance_identifier for c in g1_components]
        assert "A" in instance_ids
        assert "B" in instance_ids
    
    def test_constraint_violation_same_instance(self, session):
        """Test that the unique constraint still works for same instance identifier."""
        # Create test data
        project = Project(name="Constraint Test", created_at=datetime.utcnow())
        session.add(project)
        session.flush()
        
        drawing = Drawing(
            project_id=project.id,
            file_name="constraint_test.pdf", 
            file_path="/test/constraint.pdf",
            processing_status="completed",
            created_at=datetime.utcnow()
        )
        session.add(drawing)
        session.flush()
        
        # Create first component
        component1 = Component(
            drawing_id=drawing.id,
            piece_mark="G1",
            instance_identifier="A",
            component_type="girder",
            created_at=datetime.utcnow()
        )
        session.add(component1)
        session.commit()
        
        # Try to create second component with same piece_mark and instance_identifier
        # This should fail due to the unique constraint
        component2 = Component(
            drawing_id=drawing.id,
            piece_mark="G1",
            instance_identifier="A",  # Same as component1
            component_type="girder",
            created_at=datetime.utcnow()
        )
        session.add(component2)
        
        with pytest.raises(Exception):  # Should raise integrity error
            session.commit()
    
    def test_null_instance_identifier_allowed(self, session):
        """Test that NULL instance_identifier is allowed for backward compatibility."""
        project = Project(name="Null Test", created_at=datetime.utcnow())
        session.add(project)
        session.flush()
        
        drawing = Drawing(
            project_id=project.id,
            file_name="null_test.pdf",
            file_path="/test/null.pdf",
            processing_status="completed",
            created_at=datetime.utcnow()
        )
        session.add(drawing)
        session.flush()
        
        # Create component with NULL instance_identifier (default behavior)
        component = Component(
            drawing_id=drawing.id,
            piece_mark="G1",
            # instance_identifier intentionally not set (should default to NULL)
            component_type="girder",
            created_at=datetime.utcnow()
        )
        session.add(component)
        session.commit()  # Should not raise error
        
        # Verify it was created with NULL instance_identifier
        retrieved = session.query(Component).filter_by(id=component.id).first()
        assert retrieved.instance_identifier is None


def create_sample_data_script():
    """
    Script to create sample data for testing migration.
    Run this before migration to ensure data preservation.
    """
    script = """
-- Sample data creation script for migration testing
-- Run this before applying the migration

INSERT INTO projects (id, name, client, created_at) 
VALUES (
    gen_random_uuid(), 
    'Migration Test Project', 
    'Test Client',
    NOW()
) RETURNING id \\gset project_id

INSERT INTO drawings (id, project_id, file_name, file_path, processing_status, created_at)
VALUES (
    gen_random_uuid(),
    :'project_id',
    'test_migration.pdf',
    '/test/migration.pdf', 
    'completed',
    NOW()
) RETURNING id \\gset drawing_id

-- Create components that will test the migration
INSERT INTO components (id, drawing_id, piece_mark, component_type, quantity, created_at)
VALUES 
    (gen_random_uuid(), :'drawing_id', 'G1', 'girder', 1, NOW()),
    (gen_random_uuid(), :'drawing_id', 'B2', 'brace', 2, NOW()),
    (gen_random_uuid(), :'drawing_id', 'P3', 'plate', 1, NOW());

-- Verify data was created
SELECT 'Sample data created successfully:' as message;
SELECT p.name as project_name, d.file_name as drawing, c.piece_mark, c.component_type
FROM components c
JOIN drawings d ON c.drawing_id = d.id  
JOIN projects p ON d.project_id = p.id
WHERE p.name = 'Migration Test Project';
"""
    return script


def create_rollback_verification_script():
    """
    Script to verify rollback procedure works correctly.
    """
    script = """
-- Rollback verification script
-- Run this after migration rollback to verify schema reverted

-- Check if instance_identifier column was removed
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'components' AND column_name = 'instance_identifier';
-- This should return no rows after rollback

-- Check if original constraint was restored (if it existed)
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'components' AND constraint_type = 'UNIQUE';

-- Verify all original data still exists
SELECT COUNT(*) as total_components FROM components;

-- Test that original functionality still works
-- (This would depend on what constraints existed before)
"""
    return script


if __name__ == "__main__":
    print("Migration Test Scripts")
    print("======================")
    print()
    print("Sample Data Creation Script:")
    print(create_sample_data_script())
    print()
    print("Rollback Verification Script:")
    print(create_rollback_verification_script())