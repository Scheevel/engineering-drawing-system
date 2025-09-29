"""
Required Integration Tests for Instance Identifier Feature
=========================================================

These tests must be implemented and passing before the story can be considered complete.
Current implementation only has database-level tests but no API integration tests.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestInstanceIdentifierAPIIntegration:
    """Critical integration tests missing from current implementation."""
    
    def test_create_component_with_instance_identifier(self):
        """Test API can create component with instance_identifier."""
        # CURRENTLY FAILS - Pydantic models don't have instance_identifier field
        component_data = {
            "drawing_id": "valid-drawing-uuid",
            "piece_mark": "G1",
            "instance_identifier": "A",  # This field is missing from API models
            "component_type": "girder",
            "location_x": 100.0,
            "location_y": 200.0
        }
        
        response = client.post("/api/v1/components", json=component_data)
        assert response.status_code == 200
        
        result = response.json()
        assert result["piece_mark"] == "G1"
        assert result["instance_identifier"] == "A"
    
    def test_create_multiple_instances_same_piece_mark(self):
        """Test creating multiple instances of same piece mark in same drawing."""
        # CURRENTLY FAILS - API rejects duplicate piece marks regardless of instance_identifier
        drawing_id = "valid-drawing-uuid"
        
        # Create G1-A
        component_a = {
            "drawing_id": drawing_id,
            "piece_mark": "G1",
            "instance_identifier": "A",
            "component_type": "girder",
            "location_x": 100.0,
            "location_y": 200.0
        }
        
        response_a = client.post("/api/v1/components", json=component_a)
        assert response_a.status_code == 200
        
        # Create G1-B (should succeed with migration)
        component_b = {
            "drawing_id": drawing_id,
            "piece_mark": "G1",  # Same piece mark
            "instance_identifier": "B",  # Different instance
            "component_type": "girder",
            "location_x": 150.0,
            "location_y": 250.0
        }
        
        response_b = client.post("/api/v1/components", json=component_b)
        # CURRENTLY FAILS - API incorrectly rejects this as duplicate
        assert response_b.status_code == 200
        assert response_b.json()["instance_identifier"] == "B"
    
    def test_duplicate_instance_identifier_rejected(self):
        """Test that duplicate (piece_mark + instance_identifier) is properly rejected."""
        drawing_id = "valid-drawing-uuid"
        
        # Create G1-A
        component_data = {
            "drawing_id": drawing_id,
            "piece_mark": "G1",
            "instance_identifier": "A",
            "component_type": "girder",
            "location_x": 100.0,
            "location_y": 200.0
        }
        
        response1 = client.post("/api/v1/components", json=component_data)
        assert response1.status_code == 200
        
        # Try to create another G1-A (should fail)
        response2 = client.post("/api/v1/components", json=component_data)
        assert response2.status_code == 400
        assert "already exists" in response2.json()["detail"]
    
    def test_component_list_includes_instance_identifier(self):
        """Test that component listings include instance_identifier."""
        response = client.get("/api/v1/components")
        assert response.status_code == 200
        
        components = response.json()["components"]
        if components:
            # Verify instance_identifier is included in response
            assert "instance_identifier" in components[0]
    
    def test_component_search_with_instance_identifier(self):
        """Test searching for specific component instances."""
        # This test may require search API updates
        search_params = {
            "query": "G1",
            "instance_identifier": "A"
        }
        
        response = client.get("/api/v1/search/components", params=search_params)
        assert response.status_code == 200
        
        results = response.json()["results"]
        for result in results:
            assert result["piece_mark"] == "G1"
            assert result["instance_identifier"] == "A"
    
    def test_component_update_with_instance_identifier(self):
        """Test updating component instance_identifier."""
        # First create a component
        component_data = {
            "drawing_id": "valid-drawing-uuid", 
            "piece_mark": "G1",
            "instance_identifier": "A",
            "component_type": "girder",
            "location_x": 100.0,
            "location_y": 200.0
        }
        
        create_response = client.post("/api/v1/components", json=component_data)
        component_id = create_response.json()["id"]
        
        # Update instance_identifier
        update_data = {"instance_identifier": "B"}
        
        response = client.patch(f"/api/v1/components/{component_id}", json=update_data)
        assert response.status_code == 200
        assert response.json()["instance_identifier"] == "B"
    
    def test_component_export_includes_instance_identifier(self):
        """Test that component exports include instance_identifier field."""
        export_data = {
            "component_ids": ["valid-component-uuid"],
            "format": "csv",
            "include_instance_identifier": True
        }
        
        response = client.post("/api/v1/components/export", json=export_data)
        assert response.status_code == 200
        
        # Verify export includes instance_identifier column
        # (Implementation depends on export format)
    
    def test_null_instance_identifier_allowed(self):
        """Test that components can be created without instance_identifier (backward compatibility)."""
        component_data = {
            "drawing_id": "valid-drawing-uuid",
            "piece_mark": "B1", 
            # instance_identifier omitted (should default to NULL)
            "component_type": "brace",
            "location_x": 100.0,
            "location_y": 200.0
        }
        
        response = client.post("/api/v1/components", json=component_data)
        assert response.status_code == 200
        
        result = response.json()
        assert result["instance_identifier"] is None
    
    def test_mixed_instance_scenarios(self):
        """Test mixed scenarios with NULL and non-NULL instance_identifiers."""
        drawing_id = "valid-drawing-uuid"
        
        # Create G1 with no instance_identifier (NULL)
        component1 = {
            "drawing_id": drawing_id,
            "piece_mark": "G1",
            "component_type": "girder",
            "location_x": 100.0,
            "location_y": 200.0
        }
        
        response1 = client.post("/api/v1/components", json=component1)
        assert response1.status_code == 200
        
        # Create G1-A (should succeed due to different instance_identifier)
        component2 = {
            "drawing_id": drawing_id,
            "piece_mark": "G1",
            "instance_identifier": "A",
            "component_type": "girder", 
            "location_x": 150.0,
            "location_y": 250.0
        }
        
        response2 = client.post("/api/v1/components", json=component2)
        assert response2.status_code == 200


class TestInstanceIdentifierConstraintValidation:
    """Test that API properly validates the composite unique constraint."""
    
    def test_constraint_validation_via_api(self):
        """Test that API properly enforces database constraints."""
        drawing_id = "valid-drawing-uuid"
        
        # Create G1-A
        component_data = {
            "drawing_id": drawing_id,
            "piece_mark": "G1",
            "instance_identifier": "A",
            "component_type": "girder",
            "location_x": 100.0,
            "location_y": 200.0
        }
        
        # First creation should succeed
        response1 = client.post("/api/v1/components", json=component_data)
        assert response1.status_code == 200
        
        # Duplicate should fail with proper error message
        response2 = client.post("/api/v1/components", json=component_data)
        assert response2.status_code == 400
        assert "unique constraint" in response2.json()["detail"].lower()


# Additional Service Layer Tests
class TestComponentServiceWithInstanceIdentifier:
    """Test service layer methods with instance_identifier."""
    
    def test_component_service_create_with_instance_identifier(self):
        """Test ComponentService.create_component() handles instance_identifier."""
        # This requires updating the service layer
        pass
    
    def test_component_service_duplicate_detection(self):
        """Test service layer duplicate detection considers instance_identifier.""" 
        # Service layer needs updating to use new constraint logic
        pass


# Missing Search Integration Tests  
class TestSearchWithInstanceIdentifier:
    """Test search functionality with instance_identifier field."""
    
    def test_search_includes_instance_identifier_in_results(self):
        """Test search results include instance_identifier field."""
        pass
        
    def test_search_filter_by_instance_identifier(self):
        """Test filtering search results by instance_identifier."""
        pass
        
    def test_elasticsearch_indexing_includes_instance_identifier(self):
        """Test that Elasticsearch indexing includes the new field."""
        pass


if __name__ == "__main__":
    print("These tests represent the MISSING integration test coverage.")
    print("Current implementation has 0 of these tests implemented.")
    print("All tests would currently FAIL due to API layer not being updated.")
    print("\nEstimated additional work needed:")
    print("- Update Pydantic models: 2-4 hours")  
    print("- Update API endpoints: 4-6 hours")
    print("- Update service layer: 2-4 hours")
    print("- Write integration tests: 8-12 hours")
    print("- Update search functionality: 4-6 hours")
    print("TOTAL: 20-32 hours additional development needed")