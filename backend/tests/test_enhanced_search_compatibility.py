"""
Backward Compatibility Tests for Enhanced Search System

These tests ensure that the enhanced search system maintains 100% backward 
compatibility with existing search functionality while adding new capabilities.

Test Categories:
1. Existing API compatibility
2. Simple text search behavior
3. Filter functionality preservation  
4. Response format consistency
5. Performance baseline maintenance
"""

import pytest
import asyncio
from unittest.mock import MagicMock, patch
from datetime import datetime
from typing import List, Dict, Any

from app.services.search_service import SearchService
from app.models.search import (
    SearchRequest, SearchResponse, ComponentSearchResult, 
    SearchScope, SearchQueryType, ComponentType
)
from app.utils.query_parser import parse_search_query
from app.utils.search_errors import validate_search_query


class TestBackwardCompatibility:
    """Test backward compatibility of enhanced search system"""
    
    @pytest.fixture
    def search_service(self):
        """Create SearchService instance for testing"""
        return SearchService()
    
    @pytest.fixture 
    def mock_db_session(self):
        """Mock database session for testing"""
        mock_session = MagicMock()
        
        # Mock Component model structure
        mock_component = MagicMock()
        mock_component.id = "test-component-id"
        mock_component.piece_mark = "C63"
        mock_component.component_type = "girder"
        mock_component.description = "Steel girder component"
        mock_component.quantity = 1
        mock_component.material_type = "steel"
        mock_component.confidence_score = 0.95
        mock_component.location_x = 100.0
        mock_component.location_y = 200.0
        mock_component.bounding_box = {"x1": 90, "y1": 190, "x2": 110, "y2": 210}
        mock_component.created_at = datetime.now()
        mock_component.updated_at = datetime.now()
        
        # Mock Drawing model
        mock_drawing = MagicMock()
        mock_drawing.id = "test-drawing-id"
        mock_drawing.file_name = "test-drawing.pdf"
        mock_drawing.drawing_type = "elevation"
        mock_drawing.sheet_number = "E-01"
        mock_drawing.project_id = "test-project-id"
        
        # Mock Project model
        mock_project = MagicMock()
        mock_project.name = "Test Bridge Project"
        
        # Set up relationships
        mock_component.drawing = mock_drawing
        mock_drawing.project = mock_project
        mock_component.dimensions = []
        mock_component.specifications = []
        
        # Configure query mock to return test data
        mock_query = MagicMock()
        mock_query.count.return_value = 1
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = [mock_component]
        mock_query.first.return_value = mock_component
        mock_query.filter.return_value = mock_query
        mock_query.join.return_value = mock_query
        mock_query.outerjoin.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.options.return_value = mock_query
        
        mock_session.query.return_value = mock_query
        
        return mock_session
    
    @pytest.mark.asyncio
    async def test_simple_text_search_compatibility(self, search_service, mock_db_session):
        """Test that simple text searches work exactly as before"""
        
        # Test basic search request (backward compatible format)
        request = SearchRequest(
            query="C63",
            page=1, 
            limit=20
        )
        
        response = await search_service.search_components(request, mock_db_session)
        
        # Verify response structure matches expected format
        assert isinstance(response, SearchResponse)
        assert response.query == "C63"
        assert len(response.results) > 0
        assert response.total == 1
        assert response.page == 1
        assert response.limit == 20
        assert isinstance(response.search_time_ms, int)
        assert isinstance(response.has_next, bool)
        assert isinstance(response.has_prev, bool)
        
        # Verify first result has expected structure
        result = response.results[0]
        assert isinstance(result, ComponentSearchResult)
        assert result.piece_mark == "C63"
        assert result.component_type == "girder"
        assert result.description == "Steel girder component"
    
    @pytest.mark.asyncio
    async def test_existing_filter_compatibility(self, search_service, mock_db_session):
        """Test that existing filter parameters still work"""
        
        request = SearchRequest(
            query="girder",
            component_type=ComponentType.GIRDER,
            project_id="test-project",
            drawing_type="elevation",
            page=1,
            limit=20
        )
        
        response = await search_service.search_components(request, mock_db_session)
        
        # Verify filters are properly applied and returned
        assert response.filters_applied["component_type"] == ComponentType.GIRDER
        assert response.filters_applied["project_id"] == "test-project"
        assert response.filters_applied["drawing_type"] == "elevation"
    
    @pytest.mark.asyncio
    async def test_wildcard_search_compatibility(self, search_service, mock_db_session):
        """Test that wildcard (*) search still works for filter-only searches"""
        
        request = SearchRequest(
            query="*",  # Existing wildcard for filter-only search
            component_type=ComponentType.GIRDER,
            page=1,
            limit=20
        )
        
        response = await search_service.search_components(request, mock_db_session)
        
        # Should return results even with wildcard query
        assert response.query == "*"
        assert len(response.results) > 0
    
    @pytest.mark.asyncio
    async def test_pagination_compatibility(self, search_service, mock_db_session):
        """Test that pagination parameters work as expected"""
        
        # Test different page sizes
        for limit in [10, 20, 50, 100]:
            request = SearchRequest(
                query="steel",
                page=1,
                limit=limit
            )
            
            response = await search_service.search_components(request, mock_db_session)
            assert response.limit == limit
            assert response.page == 1
    
    @pytest.mark.asyncio 
    async def test_sorting_compatibility(self, search_service, mock_db_session):
        """Test that sorting options work as before"""
        
        sort_options = [
            ("relevance", "desc"),
            ("date", "desc"), 
            ("date", "asc"),
            ("name", "desc"),
            ("name", "asc")
        ]
        
        for sort_by, sort_order in sort_options:
            request = SearchRequest(
                query="beam",
                sort_by=sort_by,
                sort_order=sort_order,
                page=1,
                limit=20
            )
            
            response = await search_service.search_components(request, mock_db_session)
            
            # Should execute without errors
            assert isinstance(response, SearchResponse)
    
    def test_query_parser_backward_compatibility(self):
        """Test that simple queries are parsed correctly and maintain compatibility"""
        
        simple_queries = [
            "C63",
            "girder", 
            "steel beam",
            "plate connection",
            "W21x44"
        ]
        
        for query in simple_queries:
            parsed = parse_search_query(query)
            
            # Simple queries should be valid and classified as simple
            assert parsed.is_valid
            assert parsed.query_type.value == "simple"
            assert len(parsed.sanitized_terms) > 0
            assert not parsed.has_boolean_operators
    
    def test_search_validation_backward_compatibility(self):
        """Test that search validation doesn't break existing queries"""
        
        # Test existing query patterns
        test_cases = [
            ("C63", [SearchScope.PIECE_MARK]),
            ("girder", [SearchScope.COMPONENT_TYPE]),
            ("steel plate", [SearchScope.DESCRIPTION]),
            ("*", [SearchScope.PIECE_MARK])  # Wildcard search
        ]
        
        for query, scope in test_cases:
            validation_result = validate_search_query(query, scope)
            
            # All should be valid
            assert validation_result.is_valid
            assert validation_result.error is None
            assert len(validation_result.scope_applied) > 0
    
    def test_search_request_model_compatibility(self):
        """Test that SearchRequest model accepts existing parameters"""
        
        # Test with minimal parameters (existing usage)
        request = SearchRequest(query="C63")
        assert request.query == "C63"
        assert request.scope == [SearchScope.PIECE_MARK]  # Default scope
        assert request.page == 1
        assert request.limit == 20
        
        # Test with all existing parameters
        request = SearchRequest(
            query="girder",
            component_type=ComponentType.GIRDER,
            project_id="test-project",
            drawing_type="elevation",
            page=2,
            limit=50,
            sort_by="date",
            sort_order="asc"
        )
        
        assert request.component_type == ComponentType.GIRDER
        assert request.project_id == "test-project"
        assert request.drawing_type == "elevation"
        assert request.page == 2
        assert request.limit == 50
        assert request.sort_by == "date"
        assert request.sort_order == "asc"
    
    def test_search_response_model_compatibility(self):
        """Test that SearchResponse includes all expected fields"""
        
        # Create sample response data
        sample_result = ComponentSearchResult(
            id="test-id",
            piece_mark="C63",
            component_type="girder",
            description="Test component",
            quantity=1,
            drawing_id="drawing-id",
            drawing_file_name="test.pdf",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        response = SearchResponse(
            query="C63",
            scope=[SearchScope.PIECE_MARK],
            query_type=SearchQueryType.SIMPLE,
            results=[sample_result],
            total=1,
            page=1,
            limit=20,
            has_next=False,
            has_prev=False,
            search_time_ms=150,
            filters_applied={}
        )
        
        # Verify all required fields are present
        assert response.query == "C63"
        assert len(response.results) == 1
        assert response.total == 1
        assert response.search_time_ms == 150
        assert isinstance(response.filters_applied, dict)
        
        # Verify backward compatibility fields
        assert hasattr(response, 'suggestions')
        assert hasattr(response, 'has_next')
        assert hasattr(response, 'has_prev')
    
    def test_no_breaking_changes_in_api_surface(self):
        """Test that no existing API methods have been removed or changed"""
        
        service = SearchService()
        
        # Verify key methods exist
        assert hasattr(service, 'search_components')
        assert hasattr(service, 'get_component_details')
        assert hasattr(service, 'get_suggestions')
        assert hasattr(service, 'get_recent_components')
        assert hasattr(service, 'get_total_components_count')
        
        # Verify methods are async (existing behavior)
        import inspect
        assert inspect.iscoroutinefunction(service.search_components)
        assert inspect.iscoroutinefunction(service.get_component_details)
        assert inspect.iscoroutinefunction(service.get_suggestions)


class TestEnhancedFeatureIntegration:
    """Test that enhanced features integrate properly without breaking existing functionality"""
    
    def test_scope_parameter_defaults(self):
        """Test that scope parameter has sensible defaults"""
        
        # When no scope provided, should default to piece_mark
        request = SearchRequest(query="C63")
        assert request.scope == [SearchScope.PIECE_MARK]
        
        # Empty scope should default to piece_mark
        request = SearchRequest(query="C63", scope=[])
        assert request.scope == [SearchScope.PIECE_MARK]
    
    def test_query_type_detection(self):
        """Test that query types are correctly detected"""
        
        test_cases = [
            ("C63", SearchQueryType.SIMPLE),
            ("steel AND beam", SearchQueryType.BOOLEAN),
            ("C6*", SearchQueryType.WILDCARD),
            ('"steel beam"', SearchQueryType.QUOTED),
            ("(steel OR aluminum) AND beam", SearchQueryType.COMPLEX)
        ]
        
        for query, expected_type in test_cases:
            parsed = parse_search_query(query)
            
            # Map internal enum to external enum
            type_mapping = {
                "simple": SearchQueryType.SIMPLE,
                "boolean": SearchQueryType.BOOLEAN, 
                "wildcard": SearchQueryType.WILDCARD,
                "quoted": SearchQueryType.QUOTED,
                "complex": SearchQueryType.COMPLEX
            }
            
            actual_type = type_mapping.get(parsed.query_type.value, SearchQueryType.SIMPLE)
            assert actual_type == expected_type, f"Query '{query}' should be {expected_type}, got {actual_type}"
    
    def test_sql_injection_prevention(self):
        """Test that SQL injection attempts are properly blocked"""
        
        malicious_queries = [
            "'; DROP TABLE components; --",
            "C63' OR '1'='1",
            "UNION SELECT * FROM users",
            "'; DELETE FROM components WHERE '1'='1'; --",
            "<script>alert('xss')</script>"
        ]
        
        for malicious_query in malicious_queries:
            validation_result = validate_search_query(malicious_query, [SearchScope.PIECE_MARK])
            
            # Should be flagged as invalid
            assert not validation_result.is_valid
            assert validation_result.error is not None
            assert validation_result.error.error_type in ["security", "validation", "parsing"]


if __name__ == "__main__":
    # Run tests with: python -m pytest tests/test_enhanced_search_compatibility.py -v
    pytest.main([__file__, "-v"])