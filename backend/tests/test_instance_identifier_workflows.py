"""
End-to-End Workflow Tests for Multiple Piece Mark Instances.

Tests complete workflows involving instance_identifier functionality from
drawing creation through component management, search integration, and
error handling scenarios.

Test Coverage:
- Complete workflow: create drawing → create multiple instances → list components
- Search workflow with instance_identifier (if search API updated)  
- Component update workflow with instance changes
- Error handling workflows (duplicate creation attempts)
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
    """Create and clean up test database for workflow testing."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(test_db):
    """Create FastAPI test client for workflow testing."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture  
def workflow_test_cleanup():
    """Clean up test data after each workflow test."""
    yield
    from app.core.database import SessionLocal
    db = SessionLocal()
    # Clean up components first (due to foreign key constraints)
    db.query(Component).delete()
    db.query(Drawing).delete()
    db.commit()
    db.close()


class TestCompleteComponentLifecycleWorkflows:
    """Test complete component lifecycle workflows with instance_identifier."""
    
    def test_drawing_to_multiple_instances_workflow(self, client, workflow_test_cleanup):
        """Test complete workflow: create drawing → create multiple instances → list components."""
        # Step 1: Create drawing
        drawing_data = {
            "file_name": "workflow_test_drawing.pdf",
            "title": "Workflow Test Drawing", 
            "project_name": "Workflow Test Project",
            "description": "End-to-end workflow testing"
        }
        
        drawing_response = client.post("/drawings", json=drawing_data)
        assert drawing_response.status_code == 201
        drawing_id = drawing_response.json()["id"]
        
        # Step 2: Create multiple instances of same piece mark
        component_scenarios = [
            {
                "drawing_id": drawing_id,
                "piece_mark": "WORKFLOW_G1",
                "component_type": "wide_flange",
                "location_x": 10.0,
                "location_y": 20.0,
                "instance_identifier": "A"
            },
            {
                "drawing_id": drawing_id,
                "piece_mark": "WORKFLOW_G1",  # Same piece_mark
                "component_type": "wide_flange",
                "location_x": 30.0,
                "location_y": 40.0,
                "instance_identifier": "B"  # Different instance
            },
            {
                "drawing_id": drawing_id,
                "piece_mark": "WORKFLOW_G1",  # Same piece_mark
                "component_type": "wide_flange", 
                "location_x": 50.0,
                "location_y": 60.0,
                "instance_identifier": "C"  # Third instance
            },
            {
                "drawing_id": drawing_id,
                "piece_mark": "WORKFLOW_G2",  # Different piece_mark
                "component_type": "wide_flange",
                "location_x": 70.0,
                "location_y": 80.0,
                # No instance_identifier (backward compatibility)
            }
        ]
        
        created_component_ids = []
        for scenario in component_scenarios:
            comp_response = client.post("/components", json=scenario)
            assert comp_response.status_code == 201
            created_component_ids.append(comp_response.json()["id"])
        
        # Step 3: List components for the drawing
        list_response = client.get(f"/drawings/{drawing_id}/components")
        assert list_response.status_code == 200
        
        components = list_response.json()
        assert len(components) == 4
        
        # Verify multiple instances workflow
        g1_components = [comp for comp in components if comp["piece_mark"] == "WORKFLOW_G1"]
        g2_components = [comp for comp in components if comp["piece_mark"] == "WORKFLOW_G2"]
        
        assert len(g1_components) == 3  # Three instances of G1
        assert len(g2_components) == 1   # One G2 component
        
        # Verify instance_identifiers are correct
        g1_instances = [comp["instance_identifier"] for comp in g1_components]
        assert set(g1_instances) == {"A", "B", "C"}
        
        # Verify backward compatibility
        assert g2_components[0]["instance_identifier"] is None
        
        # Step 4: Update one of the instances
        g1_component_a = next(comp for comp in g1_components if comp["instance_identifier"] == "A")
        update_response = client.put(f"/components/{g1_component_a['id']}", 
                                   json={"instance_identifier": "A_UPDATED"})
        assert update_response.status_code == 200
        assert update_response.json()["instance_identifier"] == "A_UPDATED"
        
        # Step 5: Verify update persisted
        final_list_response = client.get(f"/drawings/{drawing_id}/components")
        final_components = final_list_response.json()
        
        updated_g1_components = [comp for comp in final_components if comp["piece_mark"] == "WORKFLOW_G1"]
        updated_instances = [comp["instance_identifier"] for comp in updated_g1_components]
        assert set(updated_instances) == {"A_UPDATED", "B", "C"}
    
    def test_component_creation_update_deletion_workflow(self, client, workflow_test_cleanup):
        """Test component CRUD workflow with instance_identifier."""
        # Setup: Create drawing
        drawing_data = {
            "file_name": "crud_workflow_drawing.pdf",
            "title": "CRUD Workflow Drawing",
            "project_name": "CRUD Test Project"
        }
        
        drawing_response = client.post("/drawings", json=drawing_data)
        drawing_id = drawing_response.json()["id"]
        
        # Step 1: Create component with instance_identifier
        component_data = {
            "drawing_id": drawing_id,
            "piece_mark": "CRUD_TEST",
            "component_type": "wide_flange",
            "location_x": 15.0,
            "location_y": 25.0,
            "instance_identifier": "CRUD"
        }
        
        create_response = client.post("/components", json=component_data)
        assert create_response.status_code == 201
        component_id = create_response.json()["id"]
        
        # Step 2: Read component
        get_response = client.get(f"/components/{component_id}")
        assert get_response.status_code == 200
        component = get_response.json()
        assert component["instance_identifier"] == "CRUD"
        
        # Step 3: Update instance_identifier
        update_response = client.put(f"/components/{component_id}", 
                                   json={"instance_identifier": "UPDATED_CRUD"})
        assert update_response.status_code == 200
        assert update_response.json()["instance_identifier"] == "UPDATED_CRUD"
        
        # Step 4: Update to NULL instance_identifier
        null_update_response = client.put(f"/components/{component_id}",
                                        json={"instance_identifier": None})
        assert null_update_response.status_code == 200
        assert null_update_response.json()["instance_identifier"] is None
        
        # Step 5: Update back to non-NULL
        final_update_response = client.put(f"/components/{component_id}",
                                         json={"instance_identifier": "FINAL"})
        assert final_update_response.status_code == 200
        assert final_update_response.json()["instance_identifier"] == "FINAL"
        
        # Step 6: Verify all changes persisted
        final_get_response = client.get(f"/components/{component_id}")
        final_component = final_get_response.json()
        assert final_component["instance_identifier"] == "FINAL"
        assert final_component["piece_mark"] == "CRUD_TEST"
    
    def test_mixed_instance_drawing_workflow(self, client, workflow_test_cleanup):
        """Test workflow with mixed instance/non-instance components in same drawing."""
        # Create drawing
        drawing_data = {
            "file_name": "mixed_workflow_drawing.pdf", 
            "title": "Mixed Instance Workflow Drawing",
            "project_name": "Mixed Test Project"
        }
        
        drawing_response = client.post("/drawings", json=drawing_data)
        drawing_id = drawing_response.json()["id"]
        
        # Create mixed components
        mixed_components = [
            # Same piece_mark with different instance_identifiers
            {
                "drawing_id": drawing_id,
                "piece_mark": "MIXED_G1",
                "component_type": "wide_flange", 
                "location_x": 10.0,
                "location_y": 10.0,
                "instance_identifier": "X"
            },
            {
                "drawing_id": drawing_id,
                "piece_mark": "MIXED_G1",
                "component_type": "wide_flange",
                "location_x": 20.0,
                "location_y": 20.0,
                "instance_identifier": "Y"
            },
            {
                "drawing_id": drawing_id,
                "piece_mark": "MIXED_G1",
                "component_type": "wide_flange",
                "location_x": 30.0,
                "location_y": 30.0,
                # No instance_identifier (NULL)
            },
            # Different piece_mark patterns
            {
                "drawing_id": drawing_id,
                "piece_mark": "MIXED_G2",
                "component_type": "wide_flange",
                "location_x": 40.0,
                "location_y": 40.0,
                "instance_identifier": "SOLO"
            },
            {
                "drawing_id": drawing_id,
                "piece_mark": "MIXED_G3",
                "component_type": "wide_flange",
                "location_x": 50.0,
                "location_y": 50.0,
                # No instance_identifier
            }
        ]
        
        created_ids = []
        for comp_data in mixed_components:
            response = client.post("/components", json=comp_data)
            assert response.status_code == 201
            created_ids.append(response.json()["id"])
        
        # Verify mixed workflow results
        list_response = client.get(f"/drawings/{drawing_id}/components")
        components = list_response.json()
        assert len(components) == 5
        
        # Analyze component distribution
        g1_components = [comp for comp in components if comp["piece_mark"] == "MIXED_G1"]
        g2_components = [comp for comp in components if comp["piece_mark"] == "MIXED_G2"] 
        g3_components = [comp for comp in components if comp["piece_mark"] == "MIXED_G3"]
        
        assert len(g1_components) == 3  # X, Y, NULL
        assert len(g2_components) == 1  # SOLO
        assert len(g3_components) == 1  # NULL
        
        # Verify instance_identifier distribution
        g1_instances = [comp["instance_identifier"] for comp in g1_components]
        assert set(g1_instances) == {"X", "Y", None}
        
        assert g2_components[0]["instance_identifier"] == "SOLO"
        assert g3_components[0]["instance_identifier"] is None


class TestSearchIntegrationWorkflows:
    """Test search workflow integration with instance_identifier."""
    
    def test_component_search_with_instance_identifier_workflow(self, client, workflow_test_cleanup):
        """Test searching for components by piece_mark and instance_identifier."""
        # Setup: Create drawing with searchable components
        drawing_data = {
            "file_name": "search_workflow_drawing.pdf",
            "title": "Search Workflow Drawing", 
            "project_name": "Search Test Project"
        }
        
        drawing_response = client.post("/drawings", json=drawing_data)
        drawing_id = drawing_response.json()["id"]
        
        # Create searchable components
        search_components = [
            {
                "drawing_id": drawing_id,
                "piece_mark": "SEARCH_G1",
                "component_type": "wide_flange",
                "location_x": 10.0,
                "location_y": 20.0,
                "instance_identifier": "FINDME"
            },
            {
                "drawing_id": drawing_id,
                "piece_mark": "SEARCH_G1", 
                "component_type": "wide_flange",
                "location_x": 30.0,
                "location_y": 40.0,
                "instance_identifier": "DIFFERENT"
            },
            {
                "drawing_id": drawing_id,
                "piece_mark": "SEARCH_G2",
                "component_type": "wide_flange", 
                "location_x": 50.0,
                "location_y": 60.0,
                "instance_identifier": "FINDME"  # Same instance_identifier, different piece_mark
            },
            {
                "drawing_id": drawing_id,
                "piece_mark": "SEARCH_G3",
                "component_type": "wide_flange",
                "location_x": 70.0,
                "location_y": 80.0,
                # No instance_identifier
            }
        ]
        
        for comp_data in search_components:
            response = client.post("/components", json=comp_data)
            assert response.status_code == 201
        
        # Test search workflows (assuming search API exists and is updated)
        
        # Search by piece_mark only (should return multiple instances)
        piece_mark_search_response = client.get("/search/components?query=SEARCH_G1")
        if piece_mark_search_response.status_code == 200:
            search_results = piece_mark_search_response.json()
            g1_results = [result for result in search_results if result.get("piece_mark") == "SEARCH_G1"]
            assert len(g1_results) >= 2  # Should find both G1 instances
        
        # Search by instance_identifier (should return components across different piece_marks)
        instance_search_response = client.get("/search/components?query=FINDME") 
        if instance_search_response.status_code == 200:
            search_results = instance_search_response.json()
            findme_results = [result for result in search_results 
                            if result.get("instance_identifier") == "FINDME"]
            # Should find both SEARCH_G1-FINDME and SEARCH_G2-FINDME
            assert len(findme_results) >= 2
        
        # Search combining piece_mark and instance_identifier
        combined_search_response = client.get("/search/components?query=SEARCH_G1 FINDME")
        if combined_search_response.status_code == 200:
            search_results = combined_search_response.json()
            # Should specifically find SEARCH_G1 with FINDME instance
            specific_results = [result for result in search_results 
                              if result.get("piece_mark") == "SEARCH_G1" 
                              and result.get("instance_identifier") == "FINDME"]
            assert len(specific_results) >= 1
    
    def test_component_filtering_by_instance_identifier_workflow(self, client, workflow_test_cleanup):
        """Test filtering components by instance_identifier in listing workflows."""
        # Create drawing with filterable components
        drawing_data = {
            "file_name": "filter_workflow_drawing.pdf",
            "title": "Filter Workflow Drawing",
            "project_name": "Filter Test Project"
        }
        
        drawing_response = client.post("/drawings", json=drawing_data)
        drawing_id = drawing_response.json()["id"]
        
        # Create components with pattern for filtering
        filter_components = [
            {"piece_mark": "FILTER_A", "instance_identifier": "TYPE_X"},
            {"piece_mark": "FILTER_B", "instance_identifier": "TYPE_X"},
            {"piece_mark": "FILTER_C", "instance_identifier": "TYPE_Y"}, 
            {"piece_mark": "FILTER_D", "instance_identifier": "TYPE_Y"},
            {"piece_mark": "FILTER_E", "instance_identifier": None}  # NULL
        ]
        
        for comp_data in filter_components:
            full_comp_data = {
                "drawing_id": drawing_id,
                "component_type": "wide_flange",
                "location_x": 10.0,
                "location_y": 20.0,
                **comp_data
            }
            response = client.post("/components", json=full_comp_data)
            assert response.status_code == 201
        
        # Test filtering workflows (assuming filtering API exists)
        all_components_response = client.get(f"/drawings/{drawing_id}/components")
        all_components = all_components_response.json()
        assert len(all_components) == 5
        
        # Filter by instance_identifier (if API supports it)
        type_x_filter_response = client.get(f"/drawings/{drawing_id}/components?instance_identifier=TYPE_X")
        if type_x_filter_response.status_code == 200:
            type_x_components = type_x_filter_response.json()
            # Should return FILTER_A and FILTER_B
            type_x_piece_marks = [comp["piece_mark"] for comp in type_x_components]
            assert "FILTER_A" in type_x_piece_marks
            assert "FILTER_B" in type_x_piece_marks
            assert all(comp["instance_identifier"] == "TYPE_X" for comp in type_x_components)


class TestErrorHandlingWorkflows:
    """Test error handling workflows with instance_identifier."""
    
    def test_duplicate_creation_workflow_with_recovery(self, client, workflow_test_cleanup):
        """Test workflow handling duplicate creation attempts with recovery."""
        # Setup drawing
        drawing_data = {
            "file_name": "error_workflow_drawing.pdf",
            "title": "Error Workflow Drawing",
            "project_name": "Error Test Project"
        }
        
        drawing_response = client.post("/drawings", json=drawing_data)
        drawing_id = drawing_response.json()["id"]
        
        # Step 1: Create original component
        original_component = {
            "drawing_id": drawing_id,
            "piece_mark": "ERROR_WORKFLOW",
            "component_type": "wide_flange",
            "location_x": 10.0,
            "location_y": 20.0,
            "instance_identifier": "ORIGINAL"
        }
        
        create_response = client.post("/components", json=original_component)
        assert create_response.status_code == 201
        original_id = create_response.json()["id"]
        
        # Step 2: Attempt duplicate creation (should fail)
        duplicate_response = client.post("/components", json=original_component)
        assert duplicate_response.status_code == 400
        
        error_detail = duplicate_response.json()["detail"]
        assert "already exists" in error_detail
        assert "ERROR_WORKFLOW" in error_detail
        assert "ORIGINAL" in error_detail
        
        # Step 3: Recovery - create with different instance_identifier (should succeed)
        recovery_component = {
            **original_component,
            "instance_identifier": "RECOVERY"  # Different instance_identifier
        }
        
        recovery_response = client.post("/components", json=recovery_component)
        assert recovery_response.status_code == 201
        recovery_id = recovery_response.json()["id"]
        
        # Step 4: Verify both components exist
        list_response = client.get(f"/drawings/{drawing_id}/components")
        components = list_response.json()
        
        error_workflow_components = [comp for comp in components if comp["piece_mark"] == "ERROR_WORKFLOW"]
        assert len(error_workflow_components) == 2
        
        instances = [comp["instance_identifier"] for comp in error_workflow_components]
        assert set(instances) == {"ORIGINAL", "RECOVERY"}
    
    def test_constraint_violation_update_workflow(self, client, workflow_test_cleanup):
        """Test workflow handling constraint violations during updates."""
        # Setup drawing with two components
        drawing_data = {
            "file_name": "constraint_workflow_drawing.pdf",
            "title": "Constraint Workflow Drawing",
            "project_name": "Constraint Test Project"
        }
        
        drawing_response = client.post("/drawings", json=drawing_data)
        drawing_id = drawing_response.json()["id"]
        
        # Create two components with different instance_identifiers
        component1_data = {
            "drawing_id": drawing_id,
            "piece_mark": "CONSTRAINT_TEST",
            "component_type": "wide_flange",
            "location_x": 10.0,
            "location_y": 20.0,
            "instance_identifier": "FIRST"
        }
        
        component2_data = {
            "drawing_id": drawing_id, 
            "piece_mark": "CONSTRAINT_TEST",
            "component_type": "wide_flange",
            "location_x": 30.0,
            "location_y": 40.0,
            "instance_identifier": "SECOND"
        }
        
        comp1_response = client.post("/components", json=component1_data)
        comp2_response = client.post("/components", json=component2_data)
        
        assert comp1_response.status_code == 201
        assert comp2_response.status_code == 201
        
        comp1_id = comp1_response.json()["id"]
        comp2_id = comp2_response.json()["id"]
        
        # Attempt to update comp2 to have same instance_identifier as comp1 (should fail)
        invalid_update_response = client.put(f"/components/{comp2_id}", 
                                           json={"instance_identifier": "FIRST"})
        assert invalid_update_response.status_code == 400
        
        error_detail = invalid_update_response.json()["detail"]
        assert "already exists" in error_detail
        
        # Recovery - update to valid instance_identifier (should succeed)
        valid_update_response = client.put(f"/components/{comp2_id}",
                                         json={"instance_identifier": "SECOND_UPDATED"})
        assert valid_update_response.status_code == 200
        assert valid_update_response.json()["instance_identifier"] == "SECOND_UPDATED"
        
        # Verify final state
        final_list_response = client.get(f"/drawings/{drawing_id}/components")
        final_components = final_list_response.json()
        
        constraint_components = [comp for comp in final_components if comp["piece_mark"] == "CONSTRAINT_TEST"]
        instances = [comp["instance_identifier"] for comp in constraint_components]
        assert set(instances) == {"FIRST", "SECOND_UPDATED"}
    
    def test_batch_operation_error_handling_workflow(self, client, workflow_test_cleanup):
        """Test error handling in batch operations with instance_identifier."""
        # Setup drawing
        drawing_data = {
            "file_name": "batch_error_workflow_drawing.pdf",
            "title": "Batch Error Workflow Drawing", 
            "project_name": "Batch Error Test Project"
        }
        
        drawing_response = client.post("/drawings", json=drawing_data)
        drawing_id = drawing_response.json()["id"]
        
        # Batch of components with one duplicate
        batch_components = [
            {
                "drawing_id": drawing_id,
                "piece_mark": "BATCH_G1",
                "component_type": "wide_flange",
                "location_x": 10.0,
                "location_y": 20.0,
                "instance_identifier": "BATCH_A"
            },
            {
                "drawing_id": drawing_id,
                "piece_mark": "BATCH_G1", 
                "component_type": "wide_flange",
                "location_x": 30.0,
                "location_y": 40.0,
                "instance_identifier": "BATCH_B"
            },
            {
                "drawing_id": drawing_id,
                "piece_mark": "BATCH_G1",  # Duplicate of first component
                "component_type": "wide_flange", 
                "location_x": 50.0,
                "location_y": 60.0,
                "instance_identifier": "BATCH_A"  # Same as first - should fail
            }
        ]
        
        results = []
        for comp_data in batch_components:
            response = client.post("/components", json=comp_data)
            results.append({
                "status_code": response.status_code,
                "data": response.json(),
                "instance_identifier": comp_data["instance_identifier"]
            })
        
        # Verify batch results
        assert results[0]["status_code"] == 201  # First should succeed
        assert results[1]["status_code"] == 201  # Second should succeed  
        assert results[2]["status_code"] == 400  # Third should fail (duplicate)
        
        # Verify error message for failed component
        assert "already exists" in results[2]["data"]["detail"]
        assert "BATCH_A" in results[2]["data"]["detail"]
        
        # Verify successful components were created
        list_response = client.get(f"/drawings/{drawing_id}/components")
        components = list_response.json()
        
        batch_components_created = [comp for comp in components if comp["piece_mark"] == "BATCH_G1"]
        assert len(batch_components_created) == 2  # Only first two succeeded
        
        instances = [comp["instance_identifier"] for comp in batch_components_created]
        assert set(instances) == {"BATCH_A", "BATCH_B"}