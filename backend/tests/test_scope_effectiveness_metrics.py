"""
Test suite for Story 1.2: Scope Effectiveness Metrics Display
Tests scope count calculation and API response enhancement
"""

import pytest
from sqlalchemy.orm import Session
from app.services.search_service import SearchService
from app.models.search import SearchRequest, SearchScope
from app.models.database import Component, Drawing, Project
from datetime import datetime


class TestScopeEffectivenessMetrics:
    """Test scope effectiveness metrics functionality"""

    @pytest.fixture
    def search_service(self):
        return SearchService()

    @pytest.fixture
    def sample_components(self, db_session: Session):
        """Create test components with overlapping data across fields"""
        # Create project and drawing
        project = Project(id="test-project", name="Test Project", description="Test")
        db_session.add(project)
        
        drawing = Drawing(
            id="test-drawing",
            file_name="test_drawing.pdf",
            project_id="test-project",
            status="completed"
        )
        db_session.add(drawing)
        
        # Create components with overlapping terms across fields
        components = [
            Component(
                id="comp-1",
                piece_mark="BEAM-W12-101",  # "beam" in piece_mark
                component_type="beam",       # "beam" in component_type
                description="Steel beam structure",  # "beam" in description
                drawing_id="test-drawing",
                confidence_score=0.95
            ),
            Component(
                id="comp-2", 
                piece_mark="PL-6x12",        # No "beam"
                component_type="plate",      # No "beam"
                description="Plate for beam connection",  # "beam" in description only
                drawing_id="test-drawing",
                confidence_score=0.90
            ),
            Component(
                id="comp-3",
                piece_mark="W12-MAIN",       # No "beam"
                component_type="beam",       # "beam" in component_type only
                description="Main structural member",  # No "beam"
                drawing_id="test-drawing",
                confidence_score=0.85
            ),
        ]
        
        for comp in components:
            db_session.add(comp)
        
        db_session.commit()
        return components

    async def test_scope_counts_included_in_response(self, search_service, db_session, sample_components):
        """Test that scope counts are included in search response"""
        request = SearchRequest(
            query="beam",
            scope=[SearchScope.PIECE_MARK, SearchScope.COMPONENT_TYPE, SearchScope.DESCRIPTION]
        )
        
        response = await search_service.search_components(request, db_session)
        
        # Verify scope_counts field exists
        assert hasattr(response, 'scope_counts'), "Response should include scope_counts field"
        assert response.scope_counts is not None, "scope_counts should not be None"

    async def test_scope_counts_accuracy(self, search_service, db_session, sample_components):
        """Test accuracy of scope count calculations"""
        request = SearchRequest(
            query="beam",
            scope=[SearchScope.PIECE_MARK]  # Only searching piece_mark initially
        )
        
        response = await search_service.search_components(request, db_session)
        
        # Expected counts based on sample data:
        # piece_mark: "BEAM-W12-101" (1 component)
        # component_type: "beam" appears in comp-1 and comp-3 (2 components)  
        # description: "beam" appears in comp-1 and comp-2 (2 components)
        expected_counts = {
            "piece_mark": 1,
            "component_type": 2,
            "description": 2
        }
        
        assert response.scope_counts == expected_counts, f"Expected {expected_counts}, got {response.scope_counts}"

    async def test_scope_counts_with_no_results(self, search_service, db_session, sample_components):
        """Test scope counts when query returns no results"""
        request = SearchRequest(
            query="nonexistent",
            scope=[SearchScope.PIECE_MARK]
        )
        
        response = await search_service.search_components(request, db_session)
        
        expected_counts = {
            "piece_mark": 0,
            "component_type": 0,
            "description": 0
        }
        
        assert response.scope_counts == expected_counts, "All scope counts should be 0 for non-matching query"

    async def test_scope_counts_with_filters(self, search_service, db_session, sample_components):
        """Test scope counts respect other filters (component_type, project_id)"""
        request = SearchRequest(
            query="beam",
            scope=[SearchScope.PIECE_MARK],
            component_type="plate"  # This should filter results
        )
        
        response = await search_service.search_components(request, db_session)
        
        # When filtering by component_type="plate", only comp-2 should match
        # But scope counts should still show all "beam" matches across fields
        # Actually, this is a design decision - should scope counts respect filters?
        # Based on Story 1.2, scope counts should help users understand search effectiveness
        # So they should probably show counts WITH filters applied for accuracy
        
        # With component_type="plate" filter, only comp-2 is eligible
        # comp-2 has "beam" only in description, not in piece_mark or component_type
        expected_counts = {
            "piece_mark": 0,      # No "beam" in piece_mark of filtered results
            "component_type": 0,  # No "beam" in component_type of filtered results (comp-2 is "plate")
            "description": 1      # "beam" appears in description of comp-2
        }
        
        assert response.scope_counts == expected_counts, "Scope counts should respect active filters"

    async def test_performance_impact(self, search_service, db_session, sample_components):
        """Test that scope count calculation doesn't significantly impact performance"""
        request = SearchRequest(
            query="beam",
            scope=[SearchScope.PIECE_MARK]
        )
        
        start_time = datetime.now()
        response = await search_service.search_components(request, db_session)
        end_time = datetime.now()
        
        search_time_ms = (end_time - start_time).total_seconds() * 1000
        
        # Story 1.2 requires < 50ms additional response time
        # For test data, total should be well under 100ms
        assert search_time_ms < 100, f"Search with scope counts took {search_time_ms}ms, should be faster"
        assert response.search_time_ms < 100, f"Reported search time {response.search_time_ms}ms too slow"

    async def test_wildcard_query_scope_counts(self, search_service, db_session, sample_components):
        """Test scope counts with wildcard query"""
        request = SearchRequest(
            query="*",  # Wildcard should match all components
            scope=[SearchScope.PIECE_MARK]
        )
        
        response = await search_service.search_components(request, db_session)
        
        # With wildcard, all components match, so scope counts should be total components
        total_components = len(sample_components)
        expected_counts = {
            "piece_mark": total_components,     # All components have piece_mark
            "component_type": total_components, # All components have component_type
            "description": total_components     # All components have description
        }
        
        assert response.scope_counts == expected_counts, "Wildcard query should count all components"

    def test_scope_counts_data_type(self):
        """Test that scope_counts has correct data type"""
        from app.models.search import SearchResponse, SearchScope, SearchQueryType
        
        # Test that we can create a SearchResponse with scope_counts
        response = SearchResponse(
            query="test",
            scope=[SearchScope.PIECE_MARK],
            query_type=SearchQueryType.SIMPLE,
            results=[],
            total=0,
            page=1,
            limit=20,
            has_next=False,
            has_prev=False,
            search_time_ms=50,
            filters_applied={},
            scope_counts={"piece_mark": 5, "component_type": 3, "description": 7}
        )
        
        assert isinstance(response.scope_counts, dict), "scope_counts should be a dictionary"
        assert all(isinstance(k, str) for k in response.scope_counts.keys()), "All keys should be strings"
        assert all(isinstance(v, int) for v in response.scope_counts.values()), "All values should be integers"