"""
Constraint Validation Tests for Multiple Piece Mark Instances.

Focuses specifically on testing database constraint enforcement
through the API layer, ensuring proper validation of the composite
unique constraint (drawing_id, piece_mark, instance_identifier).

Test Coverage:
- Composite unique constraint enforcement via API
- User-friendly constraint violation error messages  
- Mixed NULL/non-NULL instance_identifier scenarios
- Constraint behavior isolation across different drawings
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4
import json
from typing import Dict, Any, List

from app.main import app
from app.core.database import get_db, engine
from app.models.database import Base, Component, Drawing
from fixtures.test_data_instance_identifier import InstanceIdentifierTestData


@pytest.fixture(scope="module")
def test_db():
    """Create and clean up test database for constraint testing."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(test_db):
    """Create FastAPI test client."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def multiple_test_drawings(client) -> List[Dict[str, Any]]:
    """Create multiple test drawings for constraint isolation testing."""
    from app.core.database import SessionLocal
    db = SessionLocal()
    
    drawings = []
    for i in range(3):
        drawing_data = InstanceIdentifierTestData.get_test_drawing_data()
        drawing_data["title"] = f"Constraint Test Drawing {i+1}"
        drawing = Drawing(**drawing_data)
        
        db.add(drawing)
        db.commit()
        drawings.append({"id": str(drawing.id), **drawing_data})
    
    db.close()
    return drawings


@pytest.fixture  
def constraint_test_cleanup():
    """Clean up test components after each constraint test."""
    yield
    from app.core.database import SessionLocal
    db = SessionLocal()
    db.query(Component).delete()
    db.commit()
    db.close()


class TestCompositeUniqueConstraintEnforcement:
    """Test composite unique constraint (drawing_id, piece_mark, instance_identifier)."""
    
    def test_enforce_unique_constraint_with_instance_identifier(self, client, multiple_test_drawings, constraint_test_cleanup):
        """Test that API enforces uniqueness for (drawing_id, piece_mark, instance_identifier)."""
        drawing = multiple_test_drawings[0]
        
        # Create original component
        original_component = {
            **InstanceIdentifierTestData.get_component_base_data(drawing["id"]),
            "piece_mark": "UNIQUE_TEST",
            "instance_identifier": "CONSTRAINT"
        }
        
        response1 = client.post("/components", json=original_component)
        assert response1.status_code == 201
        
        # Attempt to create duplicate with same (drawing_id, piece_mark, instance_identifier)
        duplicate_component = {
            **original_component,
            "location_x": 999.0,  # Different location shouldn't matter
            "location_y": 888.0   # Different location shouldn't matter
        }
        
        response2 = client.post("/components", json=duplicate_component)
        assert response2.status_code == 400
        
        # Verify constraint violation error
        error_data = response2.json()
        assert "already exists" in error_data["detail"]
        assert "UNIQUE_TEST" in error_data["detail"]
        assert "CONSTRAINT" in error_data["detail"]
    
    def test_enforce_unique_constraint_with_null_instance_identifier(self, client, multiple_test_drawings, constraint_test_cleanup):
        """Test constraint enforcement for NULL instance_identifier values."""
        drawing = multiple_test_drawings[0]
        
        # Create original component with NULL instance_identifier
        original_component = {
            **InstanceIdentifierTestData.get_component_base_data(drawing["id"]),
            "piece_mark": "NULL_UNIQUE_TEST"
            # No instance_identifier = NULL
        }
        
        response1 = client.post("/components", json=original_component)
        assert response1.status_code == 201
        
        # Attempt to create duplicate with same (drawing_id, piece_mark, NULL)
        duplicate_component = {
            **original_component,
            "location_x": 777.0,  # Different location
            "location_y": 666.0
        }
        
        response2 = client.post("/components", json=duplicate_component)
        assert response2.status_code == 400
        
        # Verify constraint violation for NULL instance_identifier
        error_data = response2.json()
        assert "already exists" in error_data["detail"]
        assert "NULL_UNIQUE_TEST" in error_data["detail"]
    
    def test_allow_same_piece_mark_different_instance_identifier(self, client, multiple_test_drawings, constraint_test_cleanup):
        """Test that same piece_mark with different instance_identifier is allowed."""
        drawing = multiple_test_drawings[0]
        
        component_scenarios = [
            {
                **InstanceIdentifierTestData.get_component_base_data(drawing["id"]),
                "piece_mark": "SAME_MARK",
                "instance_identifier": "A"
            },
            {
                **InstanceIdentifierTestData.get_component_base_data(drawing["id"]),
                "piece_mark": "SAME_MARK",  # Same piece_mark
                "instance_identifier": "B"  # Different instance_identifier
            },
            {
                **InstanceIdentifierTestData.get_component_base_data(drawing["id"]),
                "piece_mark": "SAME_MARK",  # Same piece_mark
                "instance_identifier": None  # NULL instance_identifier
            }
        ]
        
        created_components = []
        for scenario in component_scenarios:
            response = client.post("/components", json=scenario)
            assert response.status_code == 201
            created_components.append(response.json())
        
        # Verify all components were created successfully
        assert len(created_components) == 3
        
        # All have same piece_mark but different instance_identifiers
        piece_marks = [comp["piece_mark"] for comp in created_components]
        instance_identifiers = [comp["instance_identifier"] for comp in created_components]
        
        assert all(pm == "SAME_MARK" for pm in piece_marks)
        assert set(instance_identifiers) == {"A", "B", None}
    
    def test_constraint_isolation_across_drawings(self, client, multiple_test_drawings, constraint_test_cleanup):
        """Test that constraints are isolated per drawing."""
        drawing1 = multiple_test_drawings[0]
        drawing2 = multiple_test_drawings[1]
        
        # Create same (piece_mark, instance_identifier) in both drawings
        component_data_drawing1 = {
            **InstanceIdentifierTestData.get_component_base_data(drawing1["id"]),
            "piece_mark": "ISOLATION_TEST",
            "instance_identifier": "ISOLATED"
        }
        
        component_data_drawing2 = {
            **InstanceIdentifierTestData.get_component_base_data(drawing2["id"]),
            "piece_mark": "ISOLATION_TEST",  # Same piece_mark
            "instance_identifier": "ISOLATED"  # Same instance_identifier
        }
        
        # Both should succeed - constraint is per drawing
        response1 = client.post("/components", json=component_data_drawing1)
        assert response1.status_code == 201
        
        response2 = client.post("/components", json=component_data_drawing2)
        assert response2.status_code == 201
        
        # Verify both were created with same piece_mark and instance_identifier
        data1 = response1.json()
        data2 = response2.json()
        
        assert data1["piece_mark"] == data2["piece_mark"] == "ISOLATION_TEST"
        assert data1["instance_identifier"] == data2["instance_identifier"] == "ISOLATED"
        assert data1["drawing_id"] == drawing1["id"]
        assert data2["drawing_id"] == drawing2["id"]
        assert data1["id"] != data2["id"]


class TestConstraintViolationErrorMessages:
    """Test that constraint violation error messages are user-friendly."""
    
    def test_error_message_includes_all_constraint_fields(self, client, multiple_test_drawings, constraint_test_cleanup):
        """Test that constraint violation errors include drawing, piece_mark, and instance_identifier."""
        drawing = multiple_test_drawings[0]
        
        # Create original component
        original_data = {
            **InstanceIdentifierTestData.get_component_base_data(drawing["id"]),
            "piece_mark": "ERROR_MESSAGE_TEST",
            "instance_identifier": "MSG_TEST"
        }
        
        response1 = client.post("/components", json=original_data)
        assert response1.status_code == 201
        
        # Attempt duplicate creation
        response2 = client.post("/components", json=original_data)
        assert response2.status_code == 400
        
        error_message = response2.json()["detail"]
        
        # Verify error message contains all relevant context
        assert "already exists" in error_message
        assert "ERROR_MESSAGE_TEST" in error_message  # piece_mark
        assert "MSG_TEST" in error_message           # instance_identifier
        assert "drawing" in error_message.lower()   # drawing context
    
    def test_error_message_for_null_instance_identifier(self, client, multiple_test_drawings, constraint_test_cleanup):
        """Test error messages for NULL instance_identifier constraint violations."""
        drawing = multiple_test_drawings[0]
        
        # Create component with NULL instance_identifier
        original_data = {
            **InstanceIdentifierTestData.get_component_base_data(drawing["id"]),
            "piece_mark": "NULL_ERROR_TEST"
            # No instance_identifier
        }
        
        response1 = client.post("/components", json=original_data)
        assert response1.status_code == 201
        
        # Attempt duplicate creation
        response2 = client.post("/components", json=original_data)
        assert response2.status_code == 400
        
        error_message = response2.json()["detail"]
        
        # Verify error message is clear for NULL instance_identifier
        assert "already exists" in error_message
        assert "NULL_ERROR_TEST" in error_message
        # Should handle NULL gracefully in error message
    
    def test_error_message_actionable_guidance(self, client, multiple_test_drawings, constraint_test_cleanup):
        """Test that error messages provide actionable guidance to users."""
        drawing = multiple_test_drawings[0]
        
        # Create original component
        original_data = {
            **InstanceIdentifierTestData.get_component_base_data(drawing["id"]),
            "piece_mark": "GUIDANCE_TEST",
            "instance_identifier": "GUIDE"
        }
        
        response1 = client.post("/components", json=original_data)
        assert response1.status_code == 201
        
        # Attempt duplicate creation
        response2 = client.post("/components", json=original_data)
        assert response2.status_code == 400
        
        error_message = response2.json()["detail"]
        
        # Error should be clear and actionable
        assert len(error_message) > 20  # Reasonably descriptive
        assert not error_message.isupper()  # Not shouting
        assert "." in error_message or ":" in error_message  # Proper sentence structure


class TestMixedNullNonNullScenarios:
    """Test constraint behavior with mixed NULL/non-NULL instance_identifier values."""
    
    def test_null_and_nonnull_same_piece_mark_different_drawing(self, client, multiple_test_drawings, constraint_test_cleanup):
        """Test NULL and non-NULL instance_identifier with same piece_mark across drawings."""
        drawing1 = multiple_test_drawings[0]
        drawing2 = multiple_test_drawings[1]
        
        components = [
            {
                **InstanceIdentifierTestData.get_component_base_data(drawing1["id"]),
                "piece_mark": "MIXED_CROSS_DRAWING",
                "instance_identifier": "NOT_NULL"
            },
            {
                **InstanceIdentifierTestData.get_component_base_data(drawing2["id"]),
                "piece_mark": "MIXED_CROSS_DRAWING",  # Same piece_mark
                # NULL instance_identifier - different drawing
            }
        ]
        
        # Both should succeed
        for comp_data in components:
            response = client.post("/components", json=comp_data)
            assert response.status_code == 201
    
    def test_null_and_nonnull_same_piece_mark_same_drawing(self, client, multiple_test_drawings, constraint_test_cleanup):
        """Test NULL and non-NULL instance_identifier with same piece_mark in same drawing."""
        drawing = multiple_test_drawings[0]
        
        components = [
            {
                **InstanceIdentifierTestData.get_component_base_data(drawing["id"]),
                "piece_mark": "MIXED_SAME_DRAWING",
                "instance_identifier": "NOT_NULL"
            },
            {
                **InstanceIdentifierTestData.get_component_base_data(drawing["id"]),
                "piece_mark": "MIXED_SAME_DRAWING",  # Same piece_mark, same drawing
                # NULL instance_identifier
            }
        ]
        
        # Both should succeed - NULL != "NOT_NULL"
        created_components = []
        for comp_data in components:
            response = client.post("/components", json=comp_data)
            assert response.status_code == 201
            created_components.append(response.json())
        
        # Verify both exist with same piece_mark but different instance_identifiers
        assert len(created_components) == 2
        assert created_components[0]["piece_mark"] == created_components[1]["piece_mark"]
        assert {created_components[0]["instance_identifier"], created_components[1]["instance_identifier"]} == {"NOT_NULL", None}
    
    def test_multiple_null_instance_identifier_same_piece_mark_fail(self, client, multiple_test_drawings, constraint_test_cleanup):
        """Test that multiple NULL instance_identifier with same piece_mark in same drawing fails."""
        drawing = multiple_test_drawings[0]
        
        # Create first component with NULL instance_identifier
        component_data = {
            **InstanceIdentifierTestData.get_component_base_data(drawing["id"]),
            "piece_mark": "MULTI_NULL_TEST"
            # NULL instance_identifier
        }
        
        response1 = client.post("/components", json=component_data)
        assert response1.status_code == 201
        
        # Attempt to create second component with same piece_mark and NULL instance_identifier
        response2 = client.post("/components", json=component_data)
        assert response2.status_code == 400
        
        # Should fail due to duplicate (drawing_id, piece_mark, NULL)
        error_data = response2.json()
        assert "already exists" in error_data["detail"]


class TestConstraintValidationEdgeCases:
    """Test edge cases for constraint validation."""
    
    def test_case_insensitive_piece_mark_constraint(self, client, multiple_test_drawings, constraint_test_cleanup):
        """Test that piece_mark constraint validation is case-insensitive."""
        drawing = multiple_test_drawings[0]
        
        # Create component with lowercase piece_mark
        component1_data = {
            **InstanceIdentifierTestData.get_component_base_data(drawing["id"]),
            "piece_mark": "case_test",
            "instance_identifier": "CASE"
        }
        
        response1 = client.post("/components", json=component1_data)
        assert response1.status_code == 201
        
        # Attempt to create component with uppercase piece_mark (should fail if case-insensitive)
        component2_data = {
            **InstanceIdentifierTestData.get_component_base_data(drawing["id"]),
            "piece_mark": "CASE_TEST",  # Same piece_mark, different case
            "instance_identifier": "CASE"  # Same instance_identifier
        }
        
        response2 = client.post("/components", json=component2_data)
        assert response2.status_code == 400  # Should fail due to case-insensitive duplicate
    
    def test_whitespace_trimming_in_constraint(self, client, multiple_test_drawings, constraint_test_cleanup):
        """Test that whitespace is properly handled in constraint validation."""
        drawing = multiple_test_drawings[0]
        
        # Create component
        component1_data = {
            **InstanceIdentifierTestData.get_component_base_data(drawing["id"]),
            "piece_mark": "TRIM_TEST",
            "instance_identifier": "TRIM"
        }
        
        response1 = client.post("/components", json=component1_data)
        assert response1.status_code == 201
        
        # Attempt to create component with whitespace-padded values
        component2_data = {
            **InstanceIdentifierTestData.get_component_base_data(drawing["id"]),
            "piece_mark": " TRIM_TEST ",  # Whitespace padding
            "instance_identifier": " TRIM "  # Whitespace padding
        }
        
        response2 = client.post("/components", json=component2_data)
        # Behavior depends on whether API trims whitespace before constraint check
        # This test documents the expected behavior