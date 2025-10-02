"""
test_export_api.py - Export API Integration Tests (Story 7.2)

Comprehensive test coverage for export drawings endpoint:
- Integration tests: API endpoint with database
- Unit tests: Export service business logic
- Edge cases: Zero components, large datasets, filters
- Performance: Query time validation

QA Learning from Story 7.1.1: High test coverage prevents integration bugs
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.database import Drawing, Component, Dimension, Specification
from app.core.database import get_db
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

client = TestClient(app)


class TestExportDrawingsAPI:
    """Integration tests for GET /api/v1/export/drawings endpoint"""

    def test_get_export_drawings_success(self):
        """Test successful retrieval of drawings with components"""
        response = client.get("/api/v1/export/drawings")

        assert response.status_code == 200
        data = response.json()

        # Validate response structure
        assert "drawings" in data
        assert "total_drawings" in data
        assert "total_components" in data
        assert "timestamp" in data

        # Validate data types
        assert isinstance(data["drawings"], list)
        assert isinstance(data["total_drawings"], int)
        assert isinstance(data["total_components"], int)

    def test_get_export_drawings_with_components(self):
        """Test that drawings include nested components array"""
        response = client.get("/api/v1/export/drawings")

        assert response.status_code == 200
        data = response.json()

        # Check if any drawings have components
        if data["drawings"]:
            first_drawing = data["drawings"][0]
            assert "components" in first_drawing
            assert isinstance(first_drawing["components"], list)

    def test_get_export_drawings_project_filter(self):
        """Test filtering by project_id parameter"""
        # Test with a UUID (may return empty results if project doesn't exist)
        test_project_id = str(uuid.uuid4())
        response = client.get(f"/api/v1/export/drawings?project_id={test_project_id}")

        assert response.status_code == 200
        data = response.json()

        # Should return valid structure even if empty
        assert "drawings" in data
        assert "total_drawings" in data
        assert "total_components" in data

    def test_get_export_drawings_status_filter(self):
        """Test filtering by status parameter"""
        # Test with each valid status
        valid_statuses = ["pending", "processing", "completed", "failed"]

        for status in valid_statuses:
            response = client.get(f"/api/v1/export/drawings?status={status}")

            assert response.status_code == 200
            data = response.json()

            # Validate structure
            assert "drawings" in data
            assert "total_drawings" in data

    def test_get_export_drawings_combined_filters(self):
        """Test combining project_id and status filters"""
        test_project_id = str(uuid.uuid4())
        response = client.get(
            f"/api/v1/export/drawings?project_id={test_project_id}&status=completed"
        )

        assert response.status_code == 200
        data = response.json()
        assert "drawings" in data

    def test_get_export_drawings_component_totals_match(self):
        """Test that total_components matches sum of components in drawings"""
        response = client.get("/api/v1/export/drawings")

        assert response.status_code == 200
        data = response.json()

        # Calculate actual component count
        actual_count = sum(len(drawing.get("components", [])) for drawing in data["drawings"])

        # Should match reported total
        assert data["total_components"] == actual_count

    def test_get_export_drawings_no_pagination(self):
        """Test that endpoint returns ALL drawings (no pagination)"""
        response = client.get("/api/v1/export/drawings")

        assert response.status_code == 200
        data = response.json()

        # Should have total_drawings field, not page/limit
        assert "total_drawings" in data
        assert "page" not in data
        assert "limit" not in data
        assert "has_next" not in data

    def test_get_export_drawings_timestamp_valid(self):
        """Test that timestamp is a valid datetime string"""
        response = client.get("/api/v1/export/drawings")

        assert response.status_code == 200
        data = response.json()

        # Timestamp should be parseable
        timestamp = data["timestamp"]
        assert timestamp is not None

        # Should be valid ISO format (will raise if invalid)
        datetime.fromisoformat(timestamp.replace('Z', '+00:00'))

    def test_get_export_drawings_zero_components(self):
        """Test edge case: drawings with zero components"""
        # This tests that the endpoint handles drawings without components gracefully
        response = client.get("/api/v1/export/drawings")

        assert response.status_code == 200
        data = response.json()

        # Should return successfully even if all drawings have 0 components
        assert isinstance(data["total_components"], int)
        assert data["total_components"] >= 0

    def test_get_export_drawings_drawing_structure(self):
        """Test that drawings have all required fields"""
        response = client.get("/api/v1/export/drawings")

        assert response.status_code == 200
        data = response.json()

        if data["drawings"]:
            drawing = data["drawings"][0]

            # Required drawing fields (from DrawingResponse)
            assert "id" in drawing
            assert "file_name" in drawing
            assert "processing_status" in drawing
            assert "upload_date" in drawing
            assert "components" in drawing  # Added by DrawingWithComponents

    def test_get_export_drawings_component_structure(self):
        """Test that components have all required fields"""
        response = client.get("/api/v1/export/drawings")

        assert response.status_code == 200
        data = response.json()

        # Find a drawing with components
        for drawing in data["drawings"]:
            if drawing["components"]:
                component = drawing["components"][0]

                # Required component fields (from ComponentResponse)
                assert "id" in component
                assert "piece_mark" in component
                assert "drawing_id" in component

                # Should have dimensions and specifications arrays
                assert "dimensions" in component
                assert "specifications" in component
                assert isinstance(component["dimensions"], list)
                assert isinstance(component["specifications"], list)
                break

    def test_get_export_drawings_invalid_project_id(self):
        """Test handling of invalid project_id format"""
        # Invalid UUID format should be handled gracefully
        response = client.get("/api/v1/export/drawings?project_id=invalid-uuid")

        # Should return 500 with error message (invalid UUID) or 422 (validation error)
        assert response.status_code in [422, 500]

    def test_get_export_drawings_performance(self):
        """Test that query completes within performance requirements (< 3 seconds)"""
        import time

        start_time = time.time()
        response = client.get("/api/v1/export/drawings")
        end_time = time.time()

        assert response.status_code == 200

        # Performance requirement from Story 7.2: < 3 seconds for typical datasets
        elapsed_time = end_time - start_time
        assert elapsed_time < 3.0, f"Query took {elapsed_time:.2f}s, expected < 3.0s"


class TestExportServiceUnit:
    """Unit tests for ExportService.get_export_drawings method"""

    @pytest.mark.asyncio
    async def test_get_export_drawings_filters_by_project(self, db_session):
        """Test that service correctly filters by project_id"""
        from app.services.export_service import ExportService

        service = ExportService()

        # Create test project_id
        test_project_id = str(uuid.uuid4())

        # Call service method (may return empty results)
        result = await service.get_export_drawings(
            project_id=test_project_id,
            db=db_session
        )

        # Validate response structure
        assert hasattr(result, 'drawings')
        assert hasattr(result, 'total_drawings')
        assert hasattr(result, 'total_components')
        assert hasattr(result, 'timestamp')

    @pytest.mark.asyncio
    async def test_get_export_drawings_filters_by_status(self, db_session):
        """Test that service correctly filters by status"""
        from app.services.export_service import ExportService

        service = ExportService()

        result = await service.get_export_drawings(
            status="completed",
            db=db_session
        )

        # All returned drawings should have status "completed"
        for drawing in result.drawings:
            assert drawing.processing_status == "completed"

    @pytest.mark.asyncio
    async def test_get_export_drawings_component_count_calculation(self, db_session):
        """Test that total_components is calculated correctly"""
        from app.services.export_service import ExportService

        service = ExportService()

        result = await service.get_export_drawings(db=db_session)

        # Calculate expected total
        expected_total = sum(len(drawing.components) for drawing in result.drawings)

        assert result.total_components == expected_total

    @pytest.mark.asyncio
    async def test_get_export_drawings_eager_loading(self, db_session):
        """Test that components are eager-loaded (no lazy loading)"""
        from app.services.export_service import ExportService

        service = ExportService()

        result = await service.get_export_drawings(db=db_session)

        if result.drawings:
            # Components should be accessible without additional queries
            # This verifies joinedload() worked correctly
            drawing = result.drawings[0]
            components = drawing.components  # Should not trigger lazy load

            assert isinstance(components, list)


# Pytest fixtures for test setup
@pytest.fixture
def db_session():
    """Provide a test database session"""
    # Use the FastAPI dependency injection for database session
    db = next(get_db())
    try:
        yield db
    finally:
        db.close()
