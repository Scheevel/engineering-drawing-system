"""
Tests for dimension and specification display_format field functionality.

Story 6.1: Dimension and Specification Management UI
Tests the backend support for display_format field in dimensions and specifications.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import UUID

from app.main import app
from app.models.component import (
    DimensionCreateRequest,
    DimensionUpdateRequest,
    SpecificationCreateRequest,
    SpecificationUpdateRequest,
)


client = TestClient(app)


@pytest.fixture
def sample_component_id():
    """Create a sample component for testing"""
    from app.models.database import Component, Drawing
    from app.core.database import SessionLocal
    from uuid import uuid4

    db = SessionLocal()

    try:
        # Create a drawing first
        drawing = Drawing(
            id=uuid4(),
            file_name="test_drawing.pdf",
            file_path="/uploads/test.pdf",
            processing_status="completed"
        )
        db.add(drawing)
        db.commit()

        # Create component
        component = Component(
            id=uuid4(),
            drawing_id=drawing.id,
            piece_mark="TEST-001",
            component_type="beam",
            location_x=100.0,
            location_y=200.0
        )
        db.add(component)
        db.commit()
        db.refresh(component)

        component_id = component.id
        drawing_id = drawing.id

        yield component_id

        # Cleanup
        db.query(Component).filter(Component.id == component_id).delete()
        db.query(Drawing).filter(Drawing.id == drawing_id).delete()
        db.commit()
    finally:
        db.close()


class TestDimensionDisplayFormat:
    """Test cases for dimension display_format field"""

    def test_create_dimension_with_decimal_format(self, sample_component_id):
        """Test creating a dimension with explicit decimal format"""
        dimension_data = DimensionCreateRequest(
            dimension_type="length",
            nominal_value=15.75,
            unit="in",
            display_format="decimal"
        )

        response = client.post(
            f"/api/v1/components/{sample_component_id}/dimensions",
            json=dimension_data.dict()
        )

        assert response.status_code == 200
        data = response.json()
        assert data["display_format"] == "decimal"
        assert data["nominal_value"] == 15.75

    def test_create_dimension_with_fraction_format(self, sample_component_id):
        """Test creating a dimension with fraction format"""
        dimension_data = DimensionCreateRequest(
            dimension_type="radius",
            nominal_value=0.75,  # Backend stores decimal, frontend will display as "3/4"
            unit="in",
            display_format="fraction"
        )

        response = client.post(
            f"/api/v1/components/{sample_component_id}/dimensions",
            json=dimension_data.dict()
        )

        assert response.status_code == 200
        data = response.json()
        assert data["display_format"] == "fraction"
        assert data["nominal_value"] == 0.75

    def test_create_dimension_default_format(self, sample_component_id):
        """Test creating a dimension without specifying format uses 'decimal' default"""
        dimension_data = DimensionCreateRequest(
            dimension_type="length",
            nominal_value=10.5,
            unit="mm"
            # display_format not specified
        )

        response = client.post(
            f"/api/v1/components/{sample_component_id}/dimensions",
            json=dimension_data.dict()
        )

        assert response.status_code == 200
        data = response.json()
        assert data["display_format"] == "decimal"  # Should default to decimal

    def test_update_dimension_display_format(self, sample_component_id):
        """Test updating a dimension's display format from decimal to fraction"""
        # Create dimension with decimal
        create_data = DimensionCreateRequest(
            dimension_type="length",
            nominal_value=15.75,
            unit="in",
            display_format="decimal"
        )
        create_response = client.post(
            f"/api/v1/components/{sample_component_id}/dimensions",
            json=create_data.dict()
        )
        dimension_id = create_response.json()["id"]

        # Update to fraction
        update_data = DimensionUpdateRequest(
            dimension_type="length",
            nominal_value=15.75,
            unit="in",
            display_format="fraction"
        )

        response = client.put(
            f"/api/v1/components/dimensions/{dimension_id}",
            json=update_data.dict(exclude_unset=True)
        )

        assert response.status_code == 200
        data = response.json()
        assert data["display_format"] == "fraction"

    def test_invalid_display_format_rejected(self, sample_component_id):
        """Test that invalid display_format values are rejected"""
        dimension_data = {
            "dimension_type": "length",
            "nominal_value": 10.0,
            "unit": "in",
            "display_format": "invalid_format"  # Should be rejected
        }

        response = client.post(
            f"/api/v1/components/{sample_component_id}/dimensions",
            json=dimension_data
        )

        assert response.status_code == 422  # Pydantic validation error
        error_detail = response.json()["detail"]
        assert any("display_format" in str(err) for err in error_detail)


class TestSpecificationDisplayFormat:
    """Test cases for specification display_format field"""

    def test_create_specification_with_display_format(self, sample_component_id):
        """Test creating a specification with display_format"""
        spec_data = SpecificationCreateRequest(
            specification_type="material",
            value="A992",
            description="Steel grade",
            display_format="decimal"
        )

        response = client.post(
            f"/api/v1/components/{sample_component_id}/specifications",
            json=spec_data.dict()
        )

        assert response.status_code == 200
        data = response.json()
        assert data["display_format"] == "decimal"
        assert data["value"] == "A992"

    def test_update_specification_display_format(self, sample_component_id):
        """Test updating a specification's display format"""
        # Create specification
        create_data = SpecificationCreateRequest(
            specification_type="material",
            value="A992",
            display_format="decimal"
        )
        create_response = client.post(
            f"/api/v1/components/{sample_component_id}/specifications",
            json=create_data.dict()
        )
        spec_id = create_response.json()["id"]

        # Update display format
        update_data = SpecificationUpdateRequest(
            specification_type="material",
            value="A992",
            display_format="fraction"
        )

        response = client.put(
            f"/api/v1/components/specifications/{spec_id}",
            json=update_data.dict(exclude_unset=True)
        )

        assert response.status_code == 200
        data = response.json()
        assert data["display_format"] == "fraction"
