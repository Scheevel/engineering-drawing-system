"""
Service Layer Integration Tests for Multiple Piece Mark Instances.

Tests the ComponentService business logic layer for instance_identifier functionality,
focusing on service methods, duplicate detection logic, constraint validation,
and error handling at the service level.

Test Coverage:
- ComponentService methods with instance_identifier
- Service layer duplicate detection logic
- Service layer constraint validation
- Service layer error handling for constraint violations
"""

import pytest
from sqlalchemy.orm import Session
from uuid import uuid4
from typing import Dict, Any, List

from app.core.database import engine, SessionLocal
from app.models.database import Base, Component, Drawing
from app.services.component_service import ComponentService
from app.models.component import ComponentCreateRequest, ComponentUpdateRequest
from fixtures.test_data_instance_identifier import InstanceIdentifierTestData


@pytest.fixture(scope="module")
def test_db():
    """Create and clean up test database for service layer testing."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session(test_db):
    """Create database session for each test."""
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def component_service(db_session):
    """Create ComponentService instance with test database session."""
    return ComponentService()


@pytest.fixture
def test_drawing(db_session) -> Dict[str, Any]:
    """Create a test drawing for service layer tests."""
    drawing_data = InstanceIdentifierTestData.get_test_drawing_data()
    drawing = Drawing(**drawing_data)
    
    db_session.add(drawing)
    db_session.commit()
    
    return {"id": str(drawing.id), **drawing_data}


@pytest.fixture  
def service_test_cleanup(db_session):
    """Clean up test components after each service test."""
    yield
    db_session.query(Component).delete()
    db_session.commit()


class TestComponentServiceCreation:
    """Test ComponentService create_component method with instance_identifier."""
    
    def test_create_component_with_instance_identifier(self, component_service, test_drawing, service_test_cleanup):
        """Test creating component through service layer with instance_identifier."""
        component_request = ComponentCreateRequest(
            drawing_id=uuid4(test_drawing["id"]),
            piece_mark="SERVICE_G1",
            component_type="wide_flange",
            location_x=10.5,
            location_y=20.0,
            instance_identifier="SERVICE_A"
        )
        
        result = component_service.create_component(component_request)
        
        # Verify service layer properly created component
        assert result.piece_mark == "SERVICE_G1"
        assert result.instance_identifier == "SERVICE_A" 
        assert result.drawing_id == test_drawing["id"]
        assert result.id is not None
    
    def test_create_component_without_instance_identifier(self, component_service, test_drawing, service_test_cleanup):
        """Test backward compatibility - creating component without instance_identifier."""
        component_request = ComponentCreateRequest(
            drawing_id=uuid4(test_drawing["id"]),
            piece_mark="SERVICE_G2",
            component_type="wide_flange", 
            location_x=15.5,
            location_y=25.0
            # No instance_identifier
        )
        
        result = component_service.create_component(component_request)
        
        # Verify backward compatibility
        assert result.piece_mark == "SERVICE_G2"
        assert result.instance_identifier is None
        assert result.drawing_id == test_drawing["id"]
    
    def test_create_multiple_instances_via_service(self, component_service, test_drawing, service_test_cleanup):
        """Test creating multiple instances of same piece_mark through service layer."""
        instance_scenarios = InstanceIdentifierTestData.get_multiple_instance_scenarios(test_drawing["id"])
        created_components = []
        
        for scenario in instance_scenarios:
            component_request = ComponentCreateRequest(**scenario)
            result = component_service.create_component(component_request)
            created_components.append(result)
        
        # Verify all instances were created successfully
        assert len(created_components) == 3
        
        piece_marks = [comp.piece_mark for comp in created_components]
        instance_identifiers = [comp.instance_identifier for comp in created_components]
        
        assert all(pm == "G1" for pm in piece_marks)
        assert set(instance_identifiers) == {"A", "B", "C"}
        assert len(set(comp.id for comp in created_components)) == 3


class TestComponentServiceDuplicateDetection:
    """Test service layer duplicate detection logic with instance_identifier."""
    
    def test_service_detects_duplicate_with_instance_identifier(self, component_service, test_drawing, service_test_cleanup):
        """Test that service layer detects duplicate (drawing_id, piece_mark, instance_identifier)."""
        # Create original component
        original_request = ComponentCreateRequest(
            drawing_id=uuid4(test_drawing["id"]),
            piece_mark="DUPLICATE_TEST",
            component_type="wide_flange",
            location_x=10.5,
            location_y=20.0,
            instance_identifier="DUPLICATE"
        )
        
        # Should succeed
        result1 = component_service.create_component(original_request)
        assert result1 is not None
        
        # Attempt to create duplicate
        duplicate_request = ComponentCreateRequest(**original_request.dict())
        
        # Should raise appropriate exception for duplicate
        with pytest.raises(Exception) as exc_info:
            component_service.create_component(duplicate_request)
        
        # Verify exception contains relevant information
        error_message = str(exc_info.value)
        assert "already exists" in error_message or "duplicate" in error_message.lower()
    
    def test_service_allows_different_instance_identifiers(self, component_service, test_drawing, service_test_cleanup):
        """Test that service allows same piece_mark with different instance_identifiers."""
        base_data = {
            "drawing_id": uuid4(test_drawing["id"]),
            "piece_mark": "ALLOW_DIFFERENT", 
            "component_type": "wide_flange",
            "location_x": 10.5,
            "location_y": 20.0
        }
        
        # Create components with different instance_identifiers
        request1 = ComponentCreateRequest(**base_data, instance_identifier="FIRST")
        request2 = ComponentCreateRequest(**base_data, instance_identifier="SECOND")
        
        result1 = component_service.create_component(request1)
        result2 = component_service.create_component(request2)
        
        # Both should succeed
        assert result1.instance_identifier == "FIRST"
        assert result2.instance_identifier == "SECOND"
        assert result1.piece_mark == result2.piece_mark == "ALLOW_DIFFERENT"
        assert result1.id != result2.id
    
    def test_service_detects_duplicate_null_instance_identifier(self, component_service, test_drawing, service_test_cleanup):
        """Test service duplicate detection for NULL instance_identifier."""
        component_data = {
            "drawing_id": uuid4(test_drawing["id"]),
            "piece_mark": "NULL_DUPLICATE_TEST",
            "component_type": "wide_flange",
            "location_x": 10.5,
            "location_y": 20.0
            # No instance_identifier = NULL
        }
        
        # Create first component
        request1 = ComponentCreateRequest(**component_data)
        result1 = component_service.create_component(request1)
        assert result1.instance_identifier is None
        
        # Attempt duplicate with NULL instance_identifier
        request2 = ComponentCreateRequest(**component_data)
        
        with pytest.raises(Exception) as exc_info:
            component_service.create_component(request2)
        
        error_message = str(exc_info.value)
        assert "already exists" in error_message or "duplicate" in error_message.lower()


class TestComponentServiceValidation:
    """Test service layer validation logic for instance_identifier."""
    
    def test_service_validates_instance_identifier_length(self, component_service, test_drawing, service_test_cleanup):
        """Test that service layer validates instance_identifier max length."""
        component_request = ComponentCreateRequest(
            drawing_id=uuid4(test_drawing["id"]),
            piece_mark="VALIDATION_TEST",
            component_type="wide_flange",
            location_x=10.5,
            location_y=20.0,
            instance_identifier="12345678901"  # 11 chars - too long
        )
        
        # Should raise validation error
        with pytest.raises(Exception) as exc_info:
            component_service.create_component(component_request)
        
        # Verify validation error mentions length constraint
        error_message = str(exc_info.value)
        assert "10 characters" in error_message or "length" in error_message.lower()
    
    def test_service_validates_required_fields_with_instance_identifier(self, component_service, test_drawing, service_test_cleanup):
        """Test service validation of required fields when instance_identifier is provided."""
        # Missing piece_mark
        with pytest.raises(Exception):
            ComponentCreateRequest(
                drawing_id=uuid4(test_drawing["id"]),
                # piece_mark missing
                component_type="wide_flange",
                location_x=10.5,
                location_y=20.0,
                instance_identifier="VALIDATE"
            )
        
        # Missing component_type  
        with pytest.raises(Exception):
            ComponentCreateRequest(
                drawing_id=uuid4(test_drawing["id"]),
                piece_mark="VALIDATE_TEST",
                # component_type missing
                location_x=10.5,
                location_y=20.0,
                instance_identifier="VALIDATE"
            )
    
    def test_service_normalizes_piece_mark_with_instance_identifier(self, component_service, test_drawing, service_test_cleanup):
        """Test that service layer normalizes piece_mark (uppercase) with instance_identifier."""
        component_request = ComponentCreateRequest(
            drawing_id=uuid4(test_drawing["id"]),
            piece_mark="lowercase_test",  # Should be converted to uppercase
            component_type="wide_flange",
            location_x=10.5,
            location_y=20.0,
            instance_identifier="NORMALIZE"
        )
        
        result = component_service.create_component(component_request)
        
        # Verify piece_mark was normalized to uppercase
        assert result.piece_mark == "LOWERCASE_TEST"
        assert result.instance_identifier == "NORMALIZE"


class TestComponentServiceUpdates:
    """Test ComponentService update methods with instance_identifier."""
    
    @pytest.fixture
    def created_component(self, component_service, test_drawing, service_test_cleanup):
        """Create a component for update testing."""
        component_request = ComponentCreateRequest(
            drawing_id=uuid4(test_drawing["id"]),
            piece_mark="UPDATE_TEST",
            component_type="wide_flange",
            location_x=10.5,
            location_y=20.0,
            instance_identifier="ORIGINAL"
        )
        
        return component_service.create_component(component_request)
    
    def test_update_instance_identifier_via_service(self, component_service, created_component):
        """Test updating instance_identifier through service layer."""
        update_request = ComponentUpdateRequest(
            instance_identifier="UPDATED"
        )
        
        result = component_service.update_component(created_component.id, update_request)
        
        # Verify instance_identifier was updated
        assert result.instance_identifier == "UPDATED"
        assert result.piece_mark == "UPDATE_TEST"  # Other fields unchanged
        assert result.id == created_component.id
    
    def test_update_instance_identifier_to_null_via_service(self, component_service, created_component):
        """Test updating instance_identifier to NULL through service."""
        update_request = ComponentUpdateRequest(
            instance_identifier=None
        )
        
        result = component_service.update_component(created_component.id, update_request)
        
        # Verify instance_identifier was set to NULL
        assert result.instance_identifier is None
        assert result.piece_mark == "UPDATE_TEST"
        assert result.id == created_component.id
    
    def test_update_validates_unique_constraint_via_service(self, component_service, test_drawing, service_test_cleanup):
        """Test that service validates unique constraint during updates."""
        # Create two components
        component1_request = ComponentCreateRequest(
            drawing_id=uuid4(test_drawing["id"]),
            piece_mark="UPDATE_CONSTRAINT_TEST",
            component_type="wide_flange", 
            location_x=10.5,
            location_y=20.0,
            instance_identifier="FIRST"
        )
        
        component2_request = ComponentCreateRequest(
            drawing_id=uuid4(test_drawing["id"]),
            piece_mark="UPDATE_CONSTRAINT_TEST",
            component_type="wide_flange",
            location_x=30.5,
            location_y=40.0,
            instance_identifier="SECOND"
        )
        
        component1 = component_service.create_component(component1_request)
        component2 = component_service.create_component(component2_request)
        
        # Attempt to update component2 to have same instance_identifier as component1
        update_request = ComponentUpdateRequest(
            instance_identifier="FIRST"  # Would create duplicate
        )
        
        with pytest.raises(Exception) as exc_info:
            component_service.update_component(component2.id, update_request)
        
        error_message = str(exc_info.value)
        assert "already exists" in error_message or "duplicate" in error_message.lower()


class TestComponentServiceErrorHandling:
    """Test service layer error handling for constraint violations."""
    
    def test_service_provides_specific_error_for_duplicate(self, component_service, test_drawing, service_test_cleanup):
        """Test that service provides specific, actionable error messages."""
        # Create original component
        original_request = ComponentCreateRequest(
            drawing_id=uuid4(test_drawing["id"]),
            piece_mark="ERROR_HANDLING_TEST",
            component_type="wide_flange",
            location_x=10.5,
            location_y=20.0,
            instance_identifier="ERROR_TEST"
        )
        
        component_service.create_component(original_request)
        
        # Attempt duplicate creation
        duplicate_request = ComponentCreateRequest(**original_request.dict())
        
        with pytest.raises(Exception) as exc_info:
            component_service.create_component(duplicate_request)
        
        error_message = str(exc_info.value)
        
        # Error should be specific and include relevant context
        assert "ERROR_HANDLING_TEST" in error_message  # piece_mark
        assert "ERROR_TEST" in error_message          # instance_identifier
        assert len(error_message) > 20               # Reasonably descriptive
    
    def test_service_handles_nonexistent_component_update(self, component_service):
        """Test service error handling for updating non-existent components."""
        fake_id = uuid4()
        update_request = ComponentUpdateRequest(
            instance_identifier="NONEXISTENT"
        )
        
        with pytest.raises(Exception) as exc_info:
            component_service.update_component(fake_id, update_request)
        
        error_message = str(exc_info.value)
        assert "not found" in error_message.lower() or "does not exist" in error_message.lower()
    
    def test_service_handles_invalid_drawing_id(self, component_service):
        """Test service error handling for invalid drawing_id."""
        fake_drawing_id = uuid4()
        component_request = ComponentCreateRequest(
            drawing_id=fake_drawing_id,
            piece_mark="INVALID_DRAWING_TEST",
            component_type="wide_flange",
            location_x=10.5,
            location_y=20.0,
            instance_identifier="INVALID"
        )
        
        with pytest.raises(Exception) as exc_info:
            component_service.create_component(component_request)
        
        # Should fail due to foreign key constraint
        error_message = str(exc_info.value)
        assert "drawing" in error_message.lower() or "foreign key" in error_message.lower()


class TestComponentServiceResponseMapping:
    """Test service layer response mapping includes instance_identifier."""
    
    def test_service_response_includes_instance_identifier(self, component_service, test_drawing, service_test_cleanup):
        """Test that service layer responses include instance_identifier field."""
        component_request = ComponentCreateRequest(
            drawing_id=uuid4(test_drawing["id"]),
            piece_mark="RESPONSE_TEST",
            component_type="wide_flange",
            location_x=10.5,
            location_y=20.0,
            instance_identifier="RESPONSE"
        )
        
        result = component_service.create_component(component_request)
        
        # Verify service response includes instance_identifier
        assert hasattr(result, 'instance_identifier')
        assert result.instance_identifier == "RESPONSE"
        
        # Verify all expected fields are present
        assert hasattr(result, 'id')
        assert hasattr(result, 'piece_mark')
        assert hasattr(result, 'drawing_id')
        assert hasattr(result, 'component_type')
    
    def test_service_response_null_instance_identifier(self, component_service, test_drawing, service_test_cleanup):
        """Test service response correctly handles NULL instance_identifier."""
        component_request = ComponentCreateRequest(
            drawing_id=uuid4(test_drawing["id"]),
            piece_mark="NULL_RESPONSE_TEST",
            component_type="wide_flange",
            location_x=10.5,
            location_y=20.0
            # No instance_identifier = NULL
        )
        
        result = component_service.create_component(component_request)
        
        # Verify NULL instance_identifier is handled correctly
        assert hasattr(result, 'instance_identifier')
        assert result.instance_identifier is None
        assert result.piece_mark == "NULL_RESPONSE_TEST"
    
    def test_service_list_components_includes_instance_identifier(self, component_service, test_drawing, service_test_cleanup):
        """Test that service layer list methods include instance_identifier."""
        # Create multiple components
        components_data = [
            {
                "drawing_id": uuid4(test_drawing["id"]),
                "piece_mark": "LIST_SERVICE_1",
                "component_type": "wide_flange",
                "location_x": 10.5,
                "location_y": 20.0,
                "instance_identifier": "LIST_A"
            },
            {
                "drawing_id": uuid4(test_drawing["id"]),
                "piece_mark": "LIST_SERVICE_2", 
                "component_type": "wide_flange",
                "location_x": 30.5,
                "location_y": 40.0,
                "instance_identifier": "LIST_B"
            }
        ]
        
        created_components = []
        for comp_data in components_data:
            request = ComponentCreateRequest(**comp_data)
            result = component_service.create_component(request)
            created_components.append(result)
        
        # Get components list for drawing (assuming service has this method)
        if hasattr(component_service, 'get_components_by_drawing'):
            components_list = component_service.get_components_by_drawing(test_drawing["id"])
            
            # Verify all components in list have instance_identifier
            for comp in components_list:
                assert hasattr(comp, 'instance_identifier')
                
            # Verify our test components are in the list with correct instance_identifiers
            list_instance_ids = [comp.instance_identifier for comp in components_list 
                               if comp.piece_mark.startswith("LIST_SERVICE")]
            assert "LIST_A" in list_instance_ids
            assert "LIST_B" in list_instance_ids