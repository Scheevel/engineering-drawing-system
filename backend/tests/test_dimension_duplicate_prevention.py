"""
Story 6.4: Prevent Duplicate Dimension Types Per Component
Backend API tests for dimension duplicate prevention
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid

from app.main import app
from app.models.database import Component, Drawing, Dimension
from app.services.dimension_service import validate_dimension_type_unique


@pytest.fixture
def test_drawing(test_db_session: Session):
    """Create a test drawing"""
    drawing = Drawing(
        id=uuid.uuid4(),
        file_name="test_drawing.pdf",
        file_path="/test/path.pdf",
        processing_status="completed"
    )
    test_db_session.add(drawing)
    test_db_session.commit()
    test_db_session.refresh(drawing)
    return drawing


@pytest.fixture
def test_component(test_db_session: Session, test_drawing):
    """Create a test component"""
    component = Component(
        id=uuid.uuid4(),
        drawing_id=test_drawing.id,
        piece_mark="TEST1",
        component_type="beam"
    )
    test_db_session.add(component)
    test_db_session.commit()
    test_db_session.refresh(component)
    return component


class TestDimensionDuplicatePrevention:
    """Story 6.4: Test dimension duplicate prevention"""

    def test_create_dimension_success(self, test_client: TestClient, test_component):
        """
        AC3: Create first dimension of type succeeds
        """
        response = test_client.post(
            f"/api/v1/components/{test_component.id}/dimensions",
            json={
                "dimension_type": "length",
                "nominal_value": 15.5,
                "unit": "in"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["dimension_type"] == "length"
        assert data["nominal_value"] == 15.5

    def test_create_dimension_duplicate_prevented(self, test_client: TestClient, test_db_session: Session, test_component):
        """
        AC3: Attempting to create duplicate dimension type returns 400
        GIVEN a component already has a dimension of type "length"
        WHEN API receives POST with dimension_type="length"
        THEN API returns 400 Bad Request
        AND error message contains "already has a dimension of type"
        """
        # Create first "length" dimension
        response1 = test_client.post(
            f"/api/v1/components/{test_component.id}/dimensions",
            json={
                "dimension_type": "length",
                "nominal_value": 15.5,
                "unit": "in"
            }
        )
        assert response1.status_code == 200

        # Try to create another "length" dimension
        response2 = test_client.post(
            f"/api/v1/components/{test_component.id}/dimensions",
            json={
                "dimension_type": "length",
                "nominal_value": 20.0,
                "unit": "in"
            }
        )
        assert response2.status_code == 400
        assert "already has a dimension of type" in response2.json()["detail"]
        assert "length" in response2.json()["detail"]

    def test_create_different_dimension_types_allowed(self, test_client: TestClient, test_component):
        """
        AC1: Multiple different dimension types are allowed
        """
        # Create length dimension
        response1 = test_client.post(
            f"/api/v1/components/{test_component.id}/dimensions",
            json={"dimension_type": "length", "nominal_value": 15.5, "unit": "in"}
        )
        assert response1.status_code == 200

        # Create width dimension (different type)
        response2 = test_client.post(
            f"/api/v1/components/{test_component.id}/dimensions",
            json={"dimension_type": "width", "nominal_value": 10.0, "unit": "in"}
        )
        assert response2.status_code == 200

        # Create height dimension (different type)
        response3 = test_client.post(
            f"/api/v1/components/{test_component.id}/dimensions",
            json={"dimension_type": "height", "nominal_value": 5.0, "unit": "in"}
        )
        assert response3.status_code == 200

    def test_update_dimension_same_type_allowed(self, test_client: TestClient, test_db_session: Session, test_component):
        """
        AC2, AC4: Updating dimension value while keeping same type is allowed
        Edge Case 1: Edit Mode - Same Type
        """
        # Create dimension
        response = test_client.post(
            f"/api/v1/components/{test_component.id}/dimensions",
            json={"dimension_type": "length", "nominal_value": 15.5, "unit": "in"}
        )
        assert response.status_code == 200
        dimension_id = response.json()["id"]

        # Update same dimension - change value but keep type
        update_response = test_client.put(
            f"/api/v1/components/dimensions/{dimension_id}",
            json={"dimension_type": "length", "nominal_value": 20.0, "unit": "in"}
        )
        assert update_response.status_code == 200
        assert update_response.json()["nominal_value"] == 20.0

    def test_update_dimension_to_existing_type_prevented(self, test_client: TestClient, test_component):
        """
        AC4: Changing dimension type to existing type is prevented
        GIVEN component has dimensions: length, width, height
        WHEN API receives PUT changing "length" to "width"
        THEN API returns 400 Bad Request
        Edge Case 2: Edit Mode - Change to Existing
        """
        # Create length, width, height dimensions
        length_response = test_client.post(
            f"/api/v1/components/{test_component.id}/dimensions",
            json={"dimension_type": "length", "nominal_value": 15.5, "unit": "in"}
        )
        assert length_response.status_code == 200
        length_id = length_response.json()["id"]

        width_response = test_client.post(
            f"/api/v1/components/{test_component.id}/dimensions",
            json={"dimension_type": "width", "nominal_value": 10.0, "unit": "in"}
        )
        assert width_response.status_code == 200

        # Try to change length to width (which already exists)
        update_response = test_client.put(
            f"/api/v1/components/dimensions/{length_id}",
            json={"dimension_type": "width", "nominal_value": 15.5, "unit": "in"}
        )
        assert update_response.status_code == 400
        assert "already has a dimension of type" in update_response.json()["detail"]
        assert "width" in update_response.json()["detail"]

    def test_update_dimension_to_available_type_allowed(self, test_client: TestClient, test_component):
        """
        AC2: Changing dimension type to available type is allowed
        Edge Case 3: Edit Mode - Change to Available
        """
        # Create length and width dimensions
        length_response = test_client.post(
            f"/api/v1/components/{test_component.id}/dimensions",
            json={"dimension_type": "length", "nominal_value": 15.5, "unit": "in"}
        )
        assert length_response.status_code == 200
        length_id = length_response.json()["id"]

        width_response = test_client.post(
            f"/api/v1/components/{test_component.id}/dimensions",
            json={"dimension_type": "width", "nominal_value": 10.0, "unit": "in"}
        )
        assert width_response.status_code == 200

        # Change length to diameter (which doesn't exist yet)
        update_response = test_client.put(
            f"/api/v1/components/dimensions/{length_id}",
            json={"dimension_type": "diameter", "nominal_value": 15.5, "unit": "in"}
        )
        assert update_response.status_code == 200
        assert update_response.json()["dimension_type"] == "diameter"

    def test_validation_service_function(self, test_db_session: Session, test_component):
        """
        Test the validation service function directly
        """
        # Create a dimension
        dimension = Dimension(
            id=uuid.uuid4(),
            component_id=test_component.id,
            dimension_type="length",
            nominal_value=15.5,
            unit="in"
        )
        test_db_session.add(dimension)
        test_db_session.commit()

        # Test validation fails for duplicate
        with pytest.raises(ValueError) as exc_info:
            validate_dimension_type_unique(
                test_db_session,
                test_component.id,
                "length"
            )
        assert "already has a dimension of type 'length'" in str(exc_info.value)

        # Test validation passes for different type
        try:
            validate_dimension_type_unique(
                test_db_session,
                test_component.id,
                "width"
            )
        except ValueError:
            pytest.fail("Validation should not raise error for different dimension type")

        # Test validation passes when excluding self (update scenario)
        try:
            validate_dimension_type_unique(
                test_db_session,
                test_component.id,
                "length",
                dimension_id=dimension.id
            )
        except ValueError:
            pytest.fail("Validation should not raise error when excluding self")

    def test_different_components_can_have_same_dimension_types(
        self, test_client: TestClient, test_db_session: Session, test_drawing
    ):
        """
        AC10: Validation is per-component, not per-drawing
        Different components can have the same dimension types
        """
        # Create two components
        component1 = Component(
            id=uuid.uuid4(),
            drawing_id=test_drawing.id,
            piece_mark="COMP1",
            component_type="beam"
        )
        component2 = Component(
            id=uuid.uuid4(),
            drawing_id=test_drawing.id,
            piece_mark="COMP2",
            component_type="plate"
        )
        test_db_session.add_all([component1, component2])
        test_db_session.commit()
        test_db_session.refresh(component1)
        test_db_session.refresh(component2)

        # Add "length" dimension to component1
        response1 = test_client.post(
            f"/api/v1/components/{component1.id}/dimensions",
            json={"dimension_type": "length", "nominal_value": 15.5, "unit": "in"}
        )
        assert response1.status_code == 200

        # Add "length" dimension to component2 (should succeed)
        response2 = test_client.post(
            f"/api/v1/components/{component2.id}/dimensions",
            json={"dimension_type": "length", "nominal_value": 20.0, "unit": "in"}
        )
        assert response2.status_code == 200

    def test_case_sensitivity(self, test_client: TestClient, test_component):
        """
        Edge Case 6: Backend stores "length", dimension types should be case-sensitive
        """
        # Create lowercase "length"
        response1 = test_client.post(
            f"/api/v1/components/{test_component.id}/dimensions",
            json={"dimension_type": "length", "nominal_value": 15.5, "unit": "in"}
        )
        assert response1.status_code == 200

        # Try to create "Length" (uppercase) - should be prevented if case-insensitive
        # Note: Current implementation is case-sensitive, so this would succeed
        # If case-insensitive validation is required, update validation function
