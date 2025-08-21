"""
Comprehensive API Integration Tests for Multiple Piece Mark Instances.

This test suite verifies end-to-end functionality of the instance_identifier feature
through the API layer, ensuring all acceptance criteria are met with proper
error handling and response validation.

Test Coverage:
- Component creation with instance_identifier
- Multiple instances of same piece mark in same drawing  
- Constraint enforcement and duplicate rejection
- API responses include instance_identifier field correctly
- Component updates with instance_identifier changes
- Backward compatibility with NULL instance_identifier
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
    """Create and clean up test database for the module."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(test_db):
    """Create FastAPI test client with database dependency override."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def test_drawing(client) -> Dict[str, Any]:
    """Create a test drawing and return its data."""
    from app.core.database import SessionLocal
    db = SessionLocal()
    
    drawing_data = InstanceIdentifierTestData.get_test_drawing_data()
    drawing = Drawing(**drawing_data)
    
    db.add(drawing)
    db.commit()
    drawing_id = str(drawing.id)
    db.close()
    
    return {"id": drawing_id, **drawing_data}


@pytest.fixture  
def test_components_cleanup():
    """Clean up test components after each test."""
    yield
    # Clean up any test components
    from app.core.database import SessionLocal
    db = SessionLocal()
    db.query(Component).delete()
    db.commit()
    db.close()


class TestAPIIntegrationComponentCreation:
    """Integration tests for component creation API with instance_identifier."""
    
    def test_create_single_component_with_instance_identifier(self, client, test_drawing, test_components_cleanup):
        """Test creating a single component with instance_identifier through API."""
        component_data = {
            **InstanceIdentifierTestData.get_component_base_data(test_drawing["id"]),
            "piece_mark": "API_G1",
            "instance_identifier": "A"
        }
        
        response = client.post("/components", json=component_data)
        
        # Verify API response
        assert response.status_code == 201
        data = response.json()
        assert data["piece_mark"] == "API_G1"
        assert data["instance_identifier"] == "A"
        assert "id" in data
        assert data["drawing_id"] == test_drawing["id"]
    
    def test_create_multiple_instances_same_piece_mark_via_api(self, client, test_drawing, test_components_cleanup):
        """Test creating multiple instances of same piece mark through API."""
        scenarios = InstanceIdentifierTestData.get_multiple_instance_scenarios(test_drawing["id"])
        created_components = []
        
        # Create each instance through API
        for scenario in scenarios:
            response = client.post("/components", json=scenario)
            assert response.status_code == 201
            created_components.append(response.json())
        
        # Verify all components were created with correct instance_identifiers
        assert len(created_components) == 3
        
        # All should have same piece_mark but different instance_identifiers
        piece_marks = [comp["piece_mark"] for comp in created_components]
        instance_identifiers = [comp["instance_identifier"] for comp in created_components]
        
        assert all(pm == "G1" for pm in piece_marks)
        assert set(instance_identifiers) == {"A", "B", "C"}
        assert len(set(comp["id"] for comp in created_components)) == 3  # All different IDs
    
    def test_constraint_enforcement_via_api(self, client, test_drawing, test_components_cleanup):
        """Test that API enforces composite unique constraint properly."""
        violation_scenarios = InstanceIdentifierTestData.get_constraint_violation_scenarios(test_drawing["id"])
        
        # Create first component
        original_component = violation_scenarios[0]
        response1 = client.post("/components", json=original_component)
        assert response1.status_code == 201
        
        # Attempt to create duplicate - should fail
        duplicate_component = violation_scenarios[1] 
        response2 = client.post("/components", json=duplicate_component)
        assert response2.status_code == 400
        
        # Verify error message contains relevant information
        error_data = response2.json()
        assert "already exists" in error_data["detail"]
        assert "C1" in error_data["detail"]  # piece_mark
        assert "A" in error_data["detail"]   # instance_identifier
    
    def test_backward_compatibility_creation_via_api(self, client, test_drawing, test_components_cleanup):
        """Test API backward compatibility for components without instance_identifier."""
        compat_scenarios = InstanceIdentifierTestData.get_backward_compatibility_scenarios(test_drawing["id"])
        
        for scenario in compat_scenarios:
            response = client.post("/components", json=scenario)
            assert response.status_code == 201
            
            data = response.json()
            assert data["instance_identifier"] is None
            assert data["piece_mark"] in ["L1", "L2"]
    
    def test_mixed_instance_scenarios_via_api(self, client, test_drawing, test_components_cleanup):
        """Test API handling of mixed instance/non-instance components."""
        mixed_scenarios = InstanceIdentifierTestData.get_mixed_scenarios(test_drawing["id"])
        created_components = []
        
        for scenario in mixed_scenarios:
            response = client.post("/components", json=scenario)
            assert response.status_code == 201
            created_components.append(response.json())
        
        # Verify mixed scenarios work correctly
        assert len(created_components) == 3
        
        # Find M1 components (should be one with instance "A", one with NULL)
        m1_components = [comp for comp in created_components if comp["piece_mark"] == "M1"]
        assert len(m1_components) == 2
        
        m1_instances = [comp["instance_identifier"] for comp in m1_components]
        assert set(m1_instances) == {"A", None}


class TestAPIIntegrationComponentRetrieval:
    """Integration tests for component retrieval APIs with instance_identifier."""
    
    def test_get_component_includes_instance_identifier(self, client, test_drawing, test_components_cleanup):
        """Test that GET /components/{id} returns instance_identifier correctly."""
        # Create component with instance_identifier
        component_data = {
            **InstanceIdentifierTestData.get_component_base_data(test_drawing["id"]),
            "piece_mark": "GET_TEST",
            "instance_identifier": "X"
        }
        
        create_response = client.post("/components", json=component_data)
        assert create_response.status_code == 201
        component_id = create_response.json()["id"]
        
        # Retrieve component
        get_response = client.get(f"/components/{component_id}")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data["instance_identifier"] == "X"
        assert data["piece_mark"] == "GET_TEST"
        assert data["id"] == component_id
    
    def test_list_components_includes_instance_identifier(self, client, test_drawing, test_components_cleanup):
        """Test that listing components includes instance_identifier in responses."""
        # Create multiple components with different instance_identifiers
        test_components = [
            {
                **InstanceIdentifierTestData.get_component_base_data(test_drawing["id"]),
                "piece_mark": "LIST_TEST",
                "instance_identifier": "A"
            },
            {
                **InstanceIdentifierTestData.get_component_base_data(test_drawing["id"]),
                "piece_mark": "LIST_TEST", 
                "instance_identifier": "B"
            }
        ]
        
        created_ids = []
        for comp_data in test_components:
            response = client.post("/components", json=comp_data)
            assert response.status_code == 201
            created_ids.append(response.json()["id"])
        
        # List components for the drawing
        list_response = client.get(f"/drawings/{test_drawing['id']}/components")
        assert list_response.status_code == 200
        
        components = list_response.json()
        assert len(components) >= 2
        
        # Verify instance_identifiers are included
        list_test_components = [comp for comp in components if comp["piece_mark"] == "LIST_TEST"]
        assert len(list_test_components) == 2
        
        instances = [comp["instance_identifier"] for comp in list_test_components]
        assert set(instances) == {"A", "B"}


class TestAPIIntegrationComponentUpdates:
    """Integration tests for component update APIs with instance_identifier."""
    
    @pytest.fixture
    def created_component(self, client, test_drawing, test_components_cleanup):
        """Create a component for update testing."""
        component_data = {
            **InstanceIdentifierTestData.get_component_base_data(test_drawing["id"]),
            "piece_mark": "UPDATE_TEST",
            "instance_identifier": "ORIGINAL"
        }
        
        response = client.post("/components", json=component_data)
        assert response.status_code == 201
        return response.json()
    
    def test_update_instance_identifier_via_api(self, client, created_component):
        """Test updating instance_identifier through PUT API."""
        component_id = created_component["id"]
        update_scenarios = InstanceIdentifierTestData.get_update_scenarios()
        
        for scenario in update_scenarios[:2]:  # Test first two scenarios
            update_data = {k: v for k, v in scenario.items() if k != "description"}
            
            response = client.put(f"/components/{component_id}", json=update_data)
            assert response.status_code == 200
            
            data = response.json()
            if "instance_identifier" in update_data:
                assert data["instance_identifier"] == update_data["instance_identifier"]
    
    def test_update_validation_errors_via_api(self, client, created_component):
        """Test that API properly validates instance_identifier updates."""
        component_id = created_component["id"]
        validation_scenarios = InstanceIdentifierTestData.get_validation_error_scenarios()
        
        for scenario in validation_scenarios:
            update_data = {"instance_identifier": scenario["instance_identifier"]}
            
            response = client.put(f"/components/{component_id}", json=update_data)
            assert response.status_code == 422  # Validation error
            
            error_data = response.json()
            assert scenario["expected_error"] in str(error_data["detail"])


class TestAPIIntegrationErrorHandling:
    """Integration tests for API error handling with instance_identifier."""
    
    def test_duplicate_creation_error_messages(self, client, test_drawing, test_components_cleanup):
        """Test that duplicate creation errors provide clear, actionable messages."""
        # Create original component
        original_data = {
            **InstanceIdentifierTestData.get_component_base_data(test_drawing["id"]),
            "piece_mark": "ERROR_TEST",
            "instance_identifier": "ERR"
        }
        
        response1 = client.post("/components", json=original_data)
        assert response1.status_code == 201
        
        # Attempt duplicate creation
        response2 = client.post("/components", json=original_data)
        assert response2.status_code == 400
        
        error_data = response2.json()
        error_message = error_data["detail"]
        
        # Verify error message contains all relevant context
        assert "already exists" in error_message
        assert "ERROR_TEST" in error_message
        assert "ERR" in error_message
        assert "drawing" in error_message.lower()
    
    def test_nonexistent_component_update_error(self, client):
        """Test error handling for updating non-existent components."""
        fake_id = str(uuid4())
        update_data = {"instance_identifier": "TEST"}
        
        response = client.put(f"/components/{fake_id}", json=update_data)
        assert response.status_code == 404
        
        error_data = response.json()
        assert "not found" in error_data["detail"].lower()
    
    def test_invalid_drawing_id_error(self, client):
        """Test error handling for invalid drawing_id in component creation."""
        fake_drawing_id = str(uuid4())
        component_data = {
            **InstanceIdentifierTestData.get_component_base_data(fake_drawing_id),
            "piece_mark": "INVALID_DRAWING",
            "instance_identifier": "X"
        }
        
        response = client.post("/components", json=component_data)
        # Should fail due to foreign key constraint
        assert response.status_code in [400, 422]


class TestAPIIntegrationWorkflows:
    """Integration tests for complete workflows with instance_identifier."""
    
    def test_complete_component_lifecycle_workflow(self, client, test_drawing, test_components_cleanup):
        """Test complete component lifecycle: create -> read -> update -> delete."""
        # 1. Create component with instance_identifier
        create_data = {
            **InstanceIdentifierTestData.get_component_base_data(test_drawing["id"]),
            "piece_mark": "LIFECYCLE", 
            "instance_identifier": "LIFE"
        }
        
        create_response = client.post("/components", json=create_data)
        assert create_response.status_code == 201
        component_id = create_response.json()["id"]
        
        # 2. Read component
        get_response = client.get(f"/components/{component_id}")
        assert get_response.status_code == 200
        assert get_response.json()["instance_identifier"] == "LIFE"
        
        # 3. Update instance_identifier
        update_response = client.put(f"/components/{component_id}", 
                                   json={"instance_identifier": "UPDATED"})
        assert update_response.status_code == 200
        assert update_response.json()["instance_identifier"] == "UPDATED"
        
        # 4. Verify update persisted
        final_get_response = client.get(f"/components/{component_id}")
        assert final_get_response.status_code == 200
        assert final_get_response.json()["instance_identifier"] == "UPDATED"
    
    def test_multi_drawing_instance_isolation_workflow(self, client, test_components_cleanup):
        """Test that instance_identifier constraints are isolated per drawing."""
        from app.core.database import SessionLocal
        db = SessionLocal()
        
        # Create two test drawings
        drawing1_data = InstanceIdentifierTestData.get_test_drawing_data()
        drawing2_data = InstanceIdentifierTestData.get_test_drawing_data()
        
        drawing1 = Drawing(**drawing1_data)
        drawing2 = Drawing(**drawing2_data)
        
        db.add(drawing1)
        db.add(drawing2)
        db.commit()
        
        drawing1_id = str(drawing1.id)
        drawing2_id = str(drawing2.id)
        db.close()
        
        # Create same piece_mark + instance_identifier in both drawings (should succeed)
        component_data_drawing1 = {
            **InstanceIdentifierTestData.get_component_base_data(drawing1_id),
            "piece_mark": "ISOLATION_TEST",
            "instance_identifier": "A"
        }
        
        component_data_drawing2 = {
            **InstanceIdentifierTestData.get_component_base_data(drawing2_id), 
            "piece_mark": "ISOLATION_TEST",
            "instance_identifier": "A"  # Same as drawing1
        }
        
        # Both should succeed - constraint is per drawing
        response1 = client.post("/components", json=component_data_drawing1)
        assert response1.status_code == 201
        
        response2 = client.post("/components", json=component_data_drawing2)
        assert response2.status_code == 201
        
        # Verify both components exist with same piece_mark and instance_identifier
        data1 = response1.json()
        data2 = response2.json()
        
        assert data1["piece_mark"] == data2["piece_mark"] == "ISOLATION_TEST"
        assert data1["instance_identifier"] == data2["instance_identifier"] == "A"
        assert data1["drawing_id"] != data2["drawing_id"]
        assert data1["id"] != data2["id"]