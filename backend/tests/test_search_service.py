import pytest
from app.services.search_service import SearchService

class TestSearchService:
    def test_search_components(self):
        """Test component search functionality"""
        service = SearchService()
        results = service.search_components("CG3")
        assert isinstance(results, list)
        
    def test_fuzzy_search(self):
        """Test fuzzy matching in search"""
        service = SearchService()
        results = service.search_components("CG", fuzzy=True)
        assert len(results) > 0
        
    def test_search_with_filters(self):
        """Test search with type filters"""
        service = SearchService()
        results = service.search_components(
            query="plate",
            filters={"component_type": "plate"}
        )
        assert all(r["component_type"] == "plate" for r in results)
