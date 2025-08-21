"""
Test suite for Component API endpoints with instance_identifier support.

Tests focus on:
- Component creation with instance_identifier
- Duplicate detection logic considering instance_identifier  
- Component updates with instance_identifier changes
- Multiple instances of same piece mark in same drawing
- Proper error messages for constraint violations
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4
import json

from app.main import app
from app.core.database import get_db, engine
from app.models.database import Base, Component, Drawing
from app.models.component import ComponentCreateRequest, ComponentUpdateRequest


@pytest.fixture(scope="module")
def test_db():
    """Create a test database"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(test_db):
    """Create test client with database dependency override"""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def test_drawing_id(client):
    """Create a test drawing and return its ID"""
    # This would normally use the drawing API, but for testing we'll create directly
    from app.core.database import SessionLocal
    db = SessionLocal()
    
    drawing = Drawing(
        id=uuid4(),
        file_name="test_drawing.pdf",
        title="Test Drawing",
        project_id=uuid4(),
        status="completed"
    )
    
    db.add(drawing)
    db.commit()
    drawing_id = drawing.id
    db.close()
    
    return str(drawing_id)


class TestComponentCreationWithInstanceIdentifier:
    """Test component creation API with instance_identifier support."""
    
    def test_create_component_with_instance_identifier(self, client, test_drawing_id):
        """Test creating a component with instance_identifier."""
        component_data = {
            "drawing_id": test_drawing_id,
            "piece_mark": "G1",
            "component_type": "wide_flange",
            "location_x": 10.5,
            "location_y": 20.0,
            "instance_identifier": "A"
        }
        
        response = client.post("/components", json=component_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["piece_mark"] == "G1"
        assert data["instance_identifier"] == "A"
    
    def test_create_component_without_instance_identifier(self, client, test_drawing_id):
        """Test creating a component without instance_identifier (backward compatibility)."""
        component_data = {
            "drawing_id": test_drawing_id,
            "piece_mark": "G2", 
            "component_type": "wide_flange",
            "location_x": 15.5,
            "location_y": 25.0
        }
        
        response = client.post("/components", json=component_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["piece_mark"] == "G2"
        assert data["instance_identifier"] is None
    
    def test_create_multiple_instances_same_piece_mark(self, client, test_drawing_id):
        """Test creating multiple instances of same piece mark with different instance_identifier."""
        # Create first instance
        component_data_1 = {
            "drawing_id": test_drawing_id,
            "piece_mark": "G3",
            "component_type": "wide_flange",
            "location_x": 10.5,
            "location_y": 20.0,
            "instance_identifier": "A"
        }
        
        response1 = client.post("/components", json=component_data_1)
        assert response1.status_code == 201
        
        # Create second instance with different instance_identifier
        component_data_2 = {
            "drawing_id": test_drawing_id,
            "piece_mark": "G3",  # Same piece mark
            "component_type": "wide_flange", 
            "location_x": 30.5,
            "location_y": 40.0,
            "instance_identifier": "B"  # Different instance_identifier
        }
        
        response2 = client.post("/components", json=component_data_2)
        assert response2.status_code == 201
        
        # Verify both components exist with same piece mark but different instance_identifier
        data1 = response1.json()
        data2 = response2.json()
        
        assert data1["piece_mark"] == "G3"
        assert data1["instance_identifier"] == "A"
        assert data2["piece_mark"] == "G3" 
        assert data2["instance_identifier"] == "B"
        assert data1["id"] != data2["id"]
    
    def test_create_duplicate_with_same_instance_identifier_fails(self, client, test_drawing_id):
        """Test that creating duplicate (drawing_id, piece_mark, instance_identifier) fails."""
        component_data = {
            "drawing_id": test_drawing_id,
            "piece_mark": "G4",
            "component_type": "wide_flange",
            "location_x": 10.5,
            "location_y": 20.0,
            "instance_identifier": "A"
        }
        
        # Create first component
        response1 = client.post("/components", json=component_data)
        assert response1.status_code == 201
        
        # Try to create duplicate - should fail
        response2 = client.post("/components", json=component_data)
        assert response2.status_code == 400
        
        error_data = response2.json()
        assert "already exists" in error_data["detail"]
        assert "G4" in error_data["detail"]
        assert "A" in error_data["detail"]
    
    def test_create_duplicate_without_instance_identifier_fails(self, client, test_drawing_id):
        """Test that creating duplicate (drawing_id, piece_mark, NULL) fails."""
        component_data = {
            "drawing_id": test_drawing_id,
            "piece_mark": "G5",
            "component_type": "wide_flange", 
            "location_x": 10.5,
            "location_y": 20.0
            # No instance_identifier
        }
        
        # Create first component
        response1 = client.post("/components", json=component_data)
        assert response1.status_code == 201
        
        # Try to create duplicate - should fail
        response2 = client.post("/components", json=component_data)
        assert response2.status_code == 400
        
        error_data = response2.json()
        assert "already exists" in error_data["detail"]
        assert "G5" in error_data["detail"]


class TestComponentUpdateWithInstanceIdentifier:
    """Test component update API with instance_identifier support."""
    
    @pytest.fixture
    def created_component_id(self, client, test_drawing_id):
        """Create a component and return its ID for update tests."""
        component_data = {
            "drawing_id": test_drawing_id,
            "piece_mark": "G6",
            "component_type": "wide_flange",
            "location_x": 10.5,
            "location_y": 20.0,
            "instance_identifier": "A"
        }
        
        response = client.post("/components", json=component_data)
        assert response.status_code == 201
        return response.json()["id"]
    
    def test_update_component_instance_identifier(self, client, created_component_id):
        """Test updating a component's instance_identifier."""
        update_data = {
            "instance_identifier": "B"
        }
        
        response = client.put(f"/components/{created_component_id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["instance_identifier"] == "B"
    
    def test_update_component_set_instance_identifier_to_none(self, client, created_component_id):
        """Test updating instance_identifier to None.""" 
        update_data = {
            "instance_identifier": None
        }
        
        response = client.put(f"/components/{created_component_id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["instance_identifier"] is None
    
    def test_update_component_instance_identifier_too_long_fails(self, client, created_component_id):
        """Test that updating with instance_identifier too long fails validation."""
        update_data = {
            "instance_identifier": "12345678901"  # 11 chars - too long
        }
        
        response = client.put(f"/components/{created_component_id}", json=update_data)
        assert response.status_code == 422  # Validation error
        
        error_data = response.json()
        assert "String should have at most 10 characters" in str(error_data["detail"])


class TestComponentListingWithInstanceIdentifier:
    """Test component listing APIs return instance_identifier."""
    
    def test_get_component_includes_instance_identifier(self, client, test_drawing_id):
        """Test that GET /components/{id} includes instance_identifier in response."""
        # Create component with instance_identifier
        component_data = {
            "drawing_id": test_drawing_id,
            "piece_mark": "G7",
            "component_type": "wide_flange",
            "location_x": 10.5,
            "location_y": 20.0,
            "instance_identifier": "A"
        }
        
        create_response = client.post("/components", json=component_data)
        assert create_response.status_code == 201
        component_id = create_response.json()["id"]
        
        # Get component details
        get_response = client.get(f"/components/{component_id}")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data["instance_identifier"] == "A"
        assert data["piece_mark"] == "G7"
    
    def test_get_component_with_null_instance_identifier(self, client, test_drawing_id):
        """Test that GET works for components with NULL instance_identifier."""
        # Create component without instance_identifier
        component_data = {
            "drawing_id": test_drawing_id,
            "piece_mark": "G8",
            "component_type": "wide_flange",
            "location_x": 10.5,
            "location_y": 20.0
        }
        
        create_response = client.post("/components", json=component_data)
        assert create_response.status_code == 201
        component_id = create_response.json()["id"]
        
        # Get component details
        get_response = client.get(f"/components/{component_id}")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data["instance_identifier"] is None
        assert data["piece_mark"] == "G8"