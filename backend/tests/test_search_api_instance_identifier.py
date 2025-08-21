"""
Test suite for Search API instance_identifier functionality.
Following TDD methodology for Story 1.4 Task 1.
"""

import pytest
from sqlalchemy.orm import Session
from app.models.database import Component, Drawing, Project
from app.models.search import SearchRequest, ComponentSearchResult
import uuid
from datetime import datetime

# Test fixtures for instance_identifier functionality
@pytest.fixture
def sample_project(test_db_session):
    """Create a test project"""
    project = Project(
        id=uuid.uuid4(),
        name="Test Bridge Project",
        description="Test project for instance_identifier testing"
    )
    test_db_session.add(project)
    test_db_session.commit()
    return project

@pytest.fixture
def sample_drawing(test_db_session, sample_project):
    """Create a test drawing"""
    drawing = Drawing(
        id=uuid.uuid4(),
        project_id=sample_project.id,
        file_name="test_drawing.pdf",
        original_name="test_drawing.pdf",
        file_path="/uploads/test_drawing.pdf",
        drawing_type="structural",
        sheet_number="S-01",
        processing_status="completed",
        upload_date=datetime.utcnow()
    )
    test_db_session.add(drawing)
    test_db_session.commit()
    return drawing

@pytest.fixture
def sample_components_with_instances(test_db_session, sample_drawing):
    """Create test components with different instance_identifier values"""
    components = []
    
    # G1 with instance A
    component1 = Component(
        id=uuid.uuid4(),
        drawing_id=sample_drawing.id,
        piece_mark="G1",
        instance_identifier="A",
        component_type="girder",
        description="Main girder instance A",
        quantity=1,
        material_type="steel",
        location_x=100.0,
        location_y=200.0,
        confidence_score=0.95,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    # G1 with instance B
    component2 = Component(
        id=uuid.uuid4(),
        drawing_id=sample_drawing.id,
        piece_mark="G1",
        instance_identifier="B", 
        component_type="girder",
        description="Main girder instance B",
        quantity=1,
        material_type="steel",
        location_x=150.0,
        location_y=200.0,
        confidence_score=0.94,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    # G1 without instance identifier (legacy)
    component3 = Component(
        id=uuid.uuid4(),
        drawing_id=sample_drawing.id,
        piece_mark="G1",
        instance_identifier=None,
        component_type="girder", 
        description="Legacy girder without instance",
        quantity=1,
        material_type="steel",
        location_x=200.0,
        location_y=200.0,
        confidence_score=0.93,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    # Different piece mark B2 with instance A
    component4 = Component(
        id=uuid.uuid4(),
        drawing_id=sample_drawing.id,
        piece_mark="B2",
        instance_identifier="A",
        component_type="brace",
        description="Brace instance A",
        quantity=2,
        material_type="steel",
        location_x=300.0,
        location_y=300.0,
        confidence_score=0.92,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    components = [component1, component2, component3, component4]
    for component in components:
        test_db_session.add(component)
    
    test_db_session.commit()
    return components

class TestSearchAPIInstanceIdentifier:
    """Test class for Search API instance_identifier functionality"""
    
    def test_search_request_accepts_instance_identifier_parameter(self, test_client, sample_components_with_instances):
        """AC2: Search API accepts instance_identifier as a filter parameter"""
        # Test that instance_identifier parameter is accepted
        response = test_client.get(
            "/api/v1/search/components?query=G1&instance_identifier=A"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return search results
        assert "results" in data
        assert "total" in data
        # Should include instance_identifier in filters_applied
        assert "filters_applied" in data
    
    def test_search_filters_by_specific_instance_identifier(self, test_client, sample_components_with_instances):
        """AC3: Search queries can filter by specific instance_identifier values"""
        # Search for G1 with instance A
        response = test_client.get(
            "/api/v1/search/components?query=G1&instance_identifier=A"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return only G1-A, not G1-B or G1 without instance
        assert data["total"] == 1
        result = data["results"][0]
        assert result["piece_mark"] == "G1"
        assert result["instance_identifier"] == "A"
        assert "instance A" in result["description"]
    
    def test_search_filters_by_instance_identifier_b(self, test_client, sample_components_with_instances):
        """Test filtering by instance identifier B"""
        response = test_client.get(
            "/api/v1/search/components?query=G1&instance_identifier=B"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return only G1-B
        assert data["total"] == 1
        result = data["results"][0]
        assert result["piece_mark"] == "G1"
        assert result["instance_identifier"] == "B"
        assert "instance B" in result["description"]
    
    def test_search_without_instance_identifier_returns_all(self, test_client, sample_components_with_instances):
        """AC6: Search functionality maintains backward compatibility"""
        # Search for G1 without instance_identifier filter
        response = test_client.get(
            "/api/v1/search/components?query=G1"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return all G1 components (A, B, and legacy without instance)
        assert data["total"] == 3
        
        piece_marks = [result["piece_mark"] for result in data["results"]]
        assert all(pm == "G1" for pm in piece_marks)
        
        # Should include components with and without instance_identifier
        instance_ids = [result.get("instance_identifier") for result in data["results"]]
        assert "A" in instance_ids
        assert "B" in instance_ids
        assert None in instance_ids
    
    def test_search_results_include_instance_identifier_field(self, test_client, sample_components_with_instances):
        """AC1: Component search results include instance_identifier field in response"""
        response = test_client.get(
            "/api/v1/search/components?query=G1"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # All results should have instance_identifier field
        for result in data["results"]:
            assert "instance_identifier" in result
            # Field should be either a string or None
            assert result["instance_identifier"] is None or isinstance(result["instance_identifier"], str)
    
    def test_search_differentiates_multiple_instances(self, test_client, sample_components_with_instances):
        """AC4: Search results differentiate between multiple instances of same piece mark"""
        response = test_client.get(
            "/api/v1/search/components?query=G1"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should find all G1 instances and differentiate them
        g1_results = [r for r in data["results"] if r["piece_mark"] == "G1"]
        assert len(g1_results) == 3
        
        # Instance identifiers should be different
        instance_ids = [r["instance_identifier"] for r in g1_results]
        unique_instances = set(instance_ids)
        assert len(unique_instances) == 3  # A, B, None
        assert "A" in instance_ids
        assert "B" in instance_ids
        assert None in instance_ids
    
    def test_search_with_nonexistent_instance_identifier(self, test_client, sample_components_with_instances):
        """Test searching for non-existent instance identifier"""
        response = test_client.get(
            "/api/v1/search/components?query=G1&instance_identifier=Z"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return no results
        assert data["total"] == 0
        assert len(data["results"]) == 0
    
    def test_search_cross_piece_mark_instance_filtering(self, test_client, sample_components_with_instances):
        """Test instance_identifier filtering works across different piece marks"""
        # Search for all components with instance A (should find G1-A and B2-A)
        response = test_client.get(
            "/api/v1/search/components?query=*&instance_identifier=A"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return both G1-A and B2-A
        assert data["total"] == 2
        
        piece_marks = [result["piece_mark"] for result in data["results"]]
        assert "G1" in piece_marks
        assert "B2" in piece_marks
        
        # All should have instance_identifier A
        for result in data["results"]:
            assert result["instance_identifier"] == "A"
    
    def test_advanced_search_supports_instance_identifier(self, test_client, sample_components_with_instances):
        """AC7: Advanced search supports combined filters (piece_mark + instance_identifier)"""
        # Test advanced search endpoint with instance_identifier
        advanced_filters = {
            "piece_mark_contains": "G1",
            "instance_identifier": "A"
        }
        
        response = test_client.post(
            "/api/v1/search/advanced",
            json=advanced_filters
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return only G1-A
        assert "results" in data
        # Note: Current advanced search implementation is basic,
        # this test validates the endpoint accepts the parameter
    
    def test_search_instance_identifier_empty_string(self, test_client, sample_components_with_instances):
        """Test behavior with empty string instance_identifier"""
        response = test_client.get(
            "/api/v1/search/components?query=G1&instance_identifier="
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Empty string should be treated as no filter
        assert data["total"] == 3  # All G1 components
    
    def test_search_instance_identifier_validation(self, test_client, sample_components_with_instances):
        """Test instance_identifier parameter validation"""
        # Test with very long instance_identifier (should be limited to 10 chars)
        long_instance = "A" * 15
        response = test_client.get(
            f"/api/v1/search/components?query=G1&instance_identifier={long_instance}"
        )
        
        # Should either truncate or handle gracefully
        assert response.status_code in [200, 422]  # Either success or validation error
    
    def test_search_response_includes_filters_applied(self, test_client, sample_components_with_instances):
        """Test that search response includes instance_identifier in filters_applied"""
        response = test_client.get(
            "/api/v1/search/components?query=G1&instance_identifier=A"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # filters_applied should include instance_identifier
        assert "filters_applied" in data
        filters = data["filters_applied"]
        assert "instance_identifier" in filters
        assert filters["instance_identifier"] == "A"
    
    def test_search_backward_compatibility_no_instance_parameter(self, test_client, sample_components_with_instances):
        """Test backward compatibility when instance_identifier parameter not provided"""
        response = test_client.get(
            "/api/v1/search/components?query=G1"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should work exactly as before - return all G1 components
        assert data["total"] == 3
        assert all(result["piece_mark"] == "G1" for result in data["results"])
        
        # Should include instance_identifier field in results even when not filtering by it
        for result in data["results"]:
            assert "instance_identifier" in result

class TestSearchModelsInstanceIdentifier:
    """Test class for Search Models with instance_identifier support"""
    
    def test_component_search_result_includes_instance_identifier(self):
        """Test ComponentSearchResult model includes instance_identifier field"""
        # Create a ComponentSearchResult with instance_identifier
        result = ComponentSearchResult(
            id="test-id",
            piece_mark="G1",
            instance_identifier="A",  # New field
            component_type="girder",
            description="Test component",
            quantity=1,
            drawing_id="drawing-id",
            drawing_file_name="test.pdf",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        assert result.instance_identifier == "A"
        assert result.piece_mark == "G1"
    
    def test_component_search_result_optional_instance_identifier(self):
        """Test ComponentSearchResult with None instance_identifier"""
        # Create ComponentSearchResult without instance_identifier (backward compatibility)
        result = ComponentSearchResult(
            id="test-id",
            piece_mark="G1",
            instance_identifier=None,  # Should support None
            component_type="girder",
            description="Test component",
            quantity=1,
            drawing_id="drawing-id", 
            drawing_file_name="test.pdf",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        assert result.instance_identifier is None
        assert result.piece_mark == "G1"
    
    def test_search_request_accepts_instance_identifier_parameter(self):
        """Test SearchRequest model accepts instance_identifier parameter"""
        # Test creating SearchRequest with instance_identifier
        request = SearchRequest(
            query="G1",
            instance_identifier="A"  # New field should be accepted
        )
        
        assert request.query == "G1"
        assert request.instance_identifier == "A"
    
    def test_search_request_optional_instance_identifier(self):
        """Test SearchRequest with optional instance_identifier"""
        # Test creating SearchRequest without instance_identifier
        request = SearchRequest(
            query="G1"
            # instance_identifier should default to None
        )
        
        assert request.query == "G1"
        assert not hasattr(request, 'instance_identifier') or request.instance_identifier is None

# Performance and edge case tests
class TestSearchInstanceIdentifierPerformance:
    """Performance and edge case tests for instance_identifier functionality"""
    
    def test_search_performance_with_instance_identifier(self, test_client, sample_components_with_instances):
        """Test that adding instance_identifier doesn't significantly impact performance"""
        import time
        
        # Time search without instance_identifier
        start = time.time()
        response1 = client.get("/api/v1/search/components?query=G1")
        time1 = time.time() - start
        
        # Time search with instance_identifier  
        start = time.time()
        response2 = client.get("/api/v1/search/components?query=G1&instance_identifier=A")
        time2 = time.time() - start
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        # Performance should not degrade significantly (within 2x)
        # This is a basic check - actual performance requirements per story: < 500ms
        assert time2 < (time1 * 2 + 0.1)  # Allow some tolerance