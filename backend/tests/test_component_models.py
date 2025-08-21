"""
Test suite for Component Pydantic models with instance_identifier field support.

Tests cover:
- ComponentCreateRequest with instance_identifier field
- ComponentUpdateRequest with instance_identifier field  
- ComponentResponse with instance_identifier field
- Field validation rules (max length 10)
- Backward compatibility (None/NULL values)
"""

import pytest
from uuid import uuid4
from pydantic import ValidationError

from app.models.component import (
    ComponentCreateRequest,
    ComponentUpdateRequest, 
    ComponentResponse
)


class TestComponentCreateRequest:
    """Test ComponentCreateRequest with instance_identifier field."""
    
    def test_create_request_with_instance_identifier(self):
        """Test creating request with valid instance_identifier."""
        drawing_id = uuid4()
        
        data = {
            "drawing_id": drawing_id,
            "piece_mark": "G1",
            "component_type": "wide_flange",
            "location_x": 10.5,
            "location_y": 20.0,
            "instance_identifier": "A"
        }
        
        component = ComponentCreateRequest(**data)
        assert component.instance_identifier == "A"
        assert component.piece_mark == "G1"
    
    def test_create_request_without_instance_identifier(self):
        """Test creating request without instance_identifier (backward compatibility)."""
        drawing_id = uuid4()
        
        data = {
            "drawing_id": drawing_id,
            "piece_mark": "G1", 
            "component_type": "wide_flange",
            "location_x": 10.5,
            "location_y": 20.0
        }
        
        component = ComponentCreateRequest(**data)
        assert component.instance_identifier is None
    
    def test_create_request_instance_identifier_max_length(self):
        """Test instance_identifier max length validation (10 chars)."""
        drawing_id = uuid4()
        
        # Valid: exactly 10 characters
        data = {
            "drawing_id": drawing_id,
            "piece_mark": "G1",
            "component_type": "wide_flange", 
            "location_x": 10.5,
            "location_y": 20.0,
            "instance_identifier": "1234567890"  # 10 chars
        }
        
        component = ComponentCreateRequest(**data)
        assert component.instance_identifier == "1234567890"
    
    def test_create_request_instance_identifier_too_long(self):
        """Test instance_identifier validation fails when too long."""
        drawing_id = uuid4()
        
        data = {
            "drawing_id": drawing_id,
            "piece_mark": "G1",
            "component_type": "wide_flange",
            "location_x": 10.5,
            "location_y": 20.0, 
            "instance_identifier": "12345678901"  # 11 chars - too long
        }
        
        with pytest.raises(ValidationError) as exc_info:
            ComponentCreateRequest(**data)
            
        assert "String should have at most 10 characters" in str(exc_info.value)


class TestComponentUpdateRequest:
    """Test ComponentUpdateRequest with instance_identifier field."""
    
    def test_update_request_with_instance_identifier(self):
        """Test updating component with instance_identifier."""
        data = {
            "piece_mark": "G1",
            "instance_identifier": "B"
        }
        
        component = ComponentUpdateRequest(**data)
        assert component.instance_identifier == "B"
    
    def test_update_request_instance_identifier_none(self):
        """Test updating component with instance_identifier as None."""
        data = {
            "piece_mark": "G1",
            "instance_identifier": None
        }
        
        component = ComponentUpdateRequest(**data)
        assert component.instance_identifier is None
    
    def test_update_request_instance_identifier_max_length(self):
        """Test instance_identifier max length validation in update."""
        data = {
            "instance_identifier": "1234567890"  # 10 chars - valid
        }
        
        component = ComponentUpdateRequest(**data)
        assert component.instance_identifier == "1234567890"
    
    def test_update_request_instance_identifier_too_long(self):
        """Test instance_identifier validation fails in update when too long."""
        data = {
            "instance_identifier": "12345678901"  # 11 chars - invalid
        }
        
        with pytest.raises(ValidationError) as exc_info:
            ComponentUpdateRequest(**data)
            
        assert "String should have at most 10 characters" in str(exc_info.value)


class TestComponentResponse:
    """Test ComponentResponse with instance_identifier field."""
    
    def test_response_with_instance_identifier(self):
        """Test response model includes instance_identifier."""
        from datetime import datetime
        
        component_id = uuid4()
        drawing_id = uuid4()
        
        data = {
            "id": component_id,
            "drawing_id": drawing_id,
            "piece_mark": "G1",
            "component_type": "wide_flange",
            "description": None,
            "quantity": 1,
            "material_type": None,
            "location_x": 10.5,
            "location_y": 20.0,
            "bounding_box": None,
            "confidence_score": 0.95,
            "review_status": "pending",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "instance_identifier": "A"
        }
        
        component = ComponentResponse(**data)
        assert component.instance_identifier == "A"
        assert component.piece_mark == "G1"
    
    def test_response_without_instance_identifier(self):
        """Test response model with None instance_identifier (backward compatibility)."""
        from datetime import datetime
        
        component_id = uuid4()
        drawing_id = uuid4()
        
        data = {
            "id": component_id,
            "drawing_id": drawing_id,
            "piece_mark": "G1", 
            "component_type": "wide_flange",
            "description": None,
            "quantity": 1,
            "material_type": None,
            "location_x": 10.5,
            "location_y": 20.0,
            "bounding_box": None,
            "confidence_score": 0.95,
            "review_status": "pending", 
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "instance_identifier": None
        }
        
        component = ComponentResponse(**data)
        assert component.instance_identifier is None
    
    def test_response_backward_compatibility(self):
        """Test response model works without instance_identifier field (existing components)."""
        from datetime import datetime
        
        component_id = uuid4()
        drawing_id = uuid4()
        
        # Simulate existing component data without instance_identifier
        data = {
            "id": component_id,
            "drawing_id": drawing_id,
            "piece_mark": "G1",
            "component_type": "wide_flange",
            "description": None,
            "quantity": 1,
            "material_type": None,
            "location_x": 10.5,
            "location_y": 20.0,
            "bounding_box": None,
            "confidence_score": 0.95,
            "review_status": "pending",
            "created_at": datetime.now(),
            "updated_at": datetime.now()
            # No instance_identifier field - should default to None
        }
        
        component = ComponentResponse(**data)
        # Should default to None for backward compatibility
        assert hasattr(component, 'instance_identifier')