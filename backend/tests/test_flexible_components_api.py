import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4, UUID
import json

from app.main import app
from app.core.database import get_db
from app.models.database import Component, ComponentSchema, Drawing, Project
from app.models.schema import SchemaFieldType

client = TestClient(app)


class TestFlexibleComponentsAPI:
    """Integration tests for Flexible Components API endpoints"""

    @pytest.fixture
    def test_project_id(self):
        """Sample project ID for testing"""
        return uuid4()

    @pytest.fixture
    def test_schema_data(self, test_project_id):
        """Create a test schema for component testing"""
        schema_data = {
            "project_id": str(test_project_id),
            "name": "Test Component Schema",
            "description": "Schema for API testing",
            "fields": [
                {
                    "field_name": "component_type",
                    "field_type": "select",
                    "field_config": {
                        "options": ["girder", "brace", "plate"],
                        "allow_custom": False
                    },
                    "help_text": "Select component type",
                    "display_order": 0,
                    "is_required": True
                },
                {
                    "field_name": "material",
                    "field_type": "text",
                    "field_config": {"max_length": 50},
                    "help_text": "Material specification",
                    "display_order": 1,
                    "is_required": False
                },
                {
                    "field_name": "length",
                    "field_type": "number",
                    "field_config": {
                        "min": 0,
                        "max": 1000,
                        "unit": "ft"
                    },
                    "help_text": "Length in feet",
                    "display_order": 2,
                    "is_required": True
                }
            ],
            "is_default": True
        }

        response = client.post("/api/v1/schemas/", json=schema_data)
        return response.json()

    @pytest.fixture
    def sample_component_data(self, test_schema_data):
        """Sample flexible component data for testing"""
        return {
            "piece_mark": "TEST-001",
            "drawing_id": str(uuid4()),
            "schema_id": test_schema_data["id"],
            "dynamic_data": {
                "component_type": "girder",
                "material": "A572 Grade 50",
                "length": 35.5
            },
            "coordinates": {
                "x": 100,
                "y": 200,
                "width": 50,
                "height": 25
            }
        }

    def test_create_flexible_component_success(self, sample_component_data):
        """Test successful flexible component creation"""
        response = client.post("/api/v1/flexible-components/", json=sample_component_data)

        assert response.status_code == 200
        data = response.json()

        assert data["piece_mark"] == "TEST-001"
        assert data["schema_id"] == sample_component_data["schema_id"]
        assert data["dynamic_data"]["component_type"] == "girder"
        assert data["dynamic_data"]["length"] == 35.5
        assert data["is_type_locked"] == True  # Should be locked since it has data

    def test_create_flexible_component_validation_error(self, test_schema_data):
        """Test component creation with validation errors"""
        invalid_component = {
            "piece_mark": "TEST-INVALID",
            "drawing_id": str(uuid4()),
            "schema_id": test_schema_data["id"],
            "dynamic_data": {
                "component_type": "invalid_type",  # Not in allowed options
                "length": "not_a_number"          # Should be number
            }
        }

        response = client.post("/api/v1/flexible-components/", json=invalid_component)
        assert response.status_code == 400
        assert "validation" in response.json()["detail"].lower()

    def test_create_flexible_component_missing_required_fields(self, test_schema_data):
        """Test component creation missing required fields"""
        incomplete_component = {
            "piece_mark": "TEST-INCOMPLETE",
            "drawing_id": str(uuid4()),
            "schema_id": test_schema_data["id"],
            "dynamic_data": {
                "material": "Steel"  # Missing required component_type and length
            }
        }

        response = client.post("/api/v1/flexible-components/", json=incomplete_component)
        assert response.status_code == 400

    def test_get_flexible_component_success(self, sample_component_data):
        """Test getting flexible component by ID"""
        # Create component first
        create_response = client.post("/api/v1/flexible-components/", json=sample_component_data)
        component_id = create_response.json()["id"]

        # Get component
        response = client.get(f"/api/v1/flexible-components/{component_id}")
        assert response.status_code == 200

        data = response.json()
        assert data["id"] == component_id
        assert data["piece_mark"] == "TEST-001"
        assert data["dynamic_data"]["component_type"] == "girder"
        assert "schema_info" in data

    def test_get_flexible_component_not_found(self):
        """Test getting non-existent component"""
        fake_id = str(uuid4())
        response = client.get(f"/api/v1/flexible-components/{fake_id}")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_update_flexible_component_success(self, sample_component_data):
        """Test updating flexible component"""
        # Create component first
        create_response = client.post("/api/v1/flexible-components/", json=sample_component_data)
        component_id = create_response.json()["id"]

        # Update component
        update_data = {
            "dynamic_data": {
                "component_type": "brace",
                "material": "A36 Steel",
                "length": 42.0
            }
        }

        response = client.put(f"/api/v1/flexible-components/{component_id}", json=update_data)
        assert response.status_code == 200

        data = response.json()
        assert data["dynamic_data"]["component_type"] == "brace"
        assert data["dynamic_data"]["material"] == "A36 Steel"
        assert data["dynamic_data"]["length"] == 42.0

    def test_update_flexible_component_validation_error(self, sample_component_data):
        """Test updating component with validation errors"""
        # Create component first
        create_response = client.post("/api/v1/flexible-components/", json=sample_component_data)
        component_id = create_response.json()["id"]

        # Try invalid update
        invalid_update = {
            "dynamic_data": {
                "component_type": "invalid_type",
                "length": -5.0  # Below minimum
            }
        }

        response = client.put(f"/api/v1/flexible-components/{component_id}", json=invalid_update)
        assert response.status_code == 400

    def test_get_component_type_lock_info(self, sample_component_data):
        """Test getting component type lock information"""
        # Create component with data (should be locked)
        create_response = client.post("/api/v1/flexible-components/", json=sample_component_data)
        component_id = create_response.json()["id"]

        response = client.get(f"/api/v1/flexible-components/{component_id}/type-lock")
        assert response.status_code == 200

        data = response.json()
        assert data["is_locked"] == True
        assert len(data["locked_fields"]) > 0
        assert data["can_unlock"] == True
        assert "dynamic data" in data["lock_reason"].lower()

    def test_unlock_component_type_success(self, sample_component_data):
        """Test unlocking component type by clearing data"""
        # Create component with data
        create_response = client.post("/api/v1/flexible-components/", json=sample_component_data)
        component_id = create_response.json()["id"]

        # Verify it's locked
        lock_response = client.get(f"/api/v1/flexible-components/{component_id}/type-lock")
        assert lock_response.json()["is_locked"] == True

        # Unlock component
        response = client.post(f"/api/v1/flexible-components/{component_id}/unlock")
        assert response.status_code == 200

        data = response.json()
        assert data["is_type_locked"] == False
        assert data["dynamic_data"] == {} or all(v in [None, ""] for v in data["dynamic_data"].values())

    def test_migrate_component_schema_success(self, sample_component_data, test_schema_data):
        """Test migrating component to different schema"""
        # Create component first
        create_response = client.post("/api/v1/flexible-components/", json=sample_component_data)
        component_id = create_response.json()["id"]

        # Create different target schema
        target_schema_data = {
            "project_id": test_schema_data["project_id"],
            "name": "Target Migration Schema",
            "description": "Target schema for migration testing",
            "fields": [
                {
                    "field_name": "part_type",
                    "field_type": "select",
                    "field_config": {"options": ["beam", "column", "connection"]},
                    "help_text": "Part type",
                    "display_order": 0,
                    "is_required": True
                }
            ]
        }

        target_response = client.post("/api/v1/schemas/", json=target_schema_data)
        target_schema_id = target_response.json()["id"]

        # Migrate component (force since it has data)
        response = client.post(
            f"/api/v1/flexible-components/{component_id}/migrate-schema",
            params={"target_schema_id": target_schema_id, "force": True}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["schema_id"] == target_schema_id

    def test_migrate_component_schema_locked_error(self, sample_component_data, test_schema_data):
        """Test migration fails for locked component without force"""
        # Create component with data (locked)
        create_response = client.post("/api/v1/flexible-components/", json=sample_component_data)
        component_id = create_response.json()["id"]

        # Create target schema
        target_schema_data = {
            "project_id": test_schema_data["project_id"],
            "name": "Target Schema",
            "description": "Target schema",
            "fields": [{"field_name": "test", "field_type": "text", "field_config": {}, "display_order": 0}]
        }

        target_response = client.post("/api/v1/schemas/", json=target_schema_data)
        target_schema_id = target_response.json()["id"]

        # Try migration without force (should fail)
        response = client.post(
            f"/api/v1/flexible-components/{component_id}/migrate-schema",
            params={"target_schema_id": target_schema_id, "force": False}
        )

        assert response.status_code == 400
        assert "locked" in response.json()["detail"].lower()

    def test_validate_component_against_schema(self, sample_component_data):
        """Test validating component against its schema"""
        # Create component first
        create_response = client.post("/api/v1/flexible-components/", json=sample_component_data)
        component_id = create_response.json()["id"]

        # Validate component
        response = client.post(f"/api/v1/flexible-components/{component_id}/validate")
        assert response.status_code == 200

        data = response.json()
        assert data["is_valid"] == True
        assert len(data["errors"]) == 0

    def test_validate_component_against_different_schema(self, sample_component_data, test_schema_data):
        """Test validating component against different schema"""
        # Create component first
        create_response = client.post("/api/v1/flexible-components/", json=sample_component_data)
        component_id = create_response.json()["id"]

        # Create different validation schema
        validation_schema_data = {
            "project_id": test_schema_data["project_id"],
            "name": "Validation Schema",
            "description": "Different schema for validation",
            "fields": [
                {
                    "field_name": "different_field",
                    "field_type": "text",
                    "field_config": {},
                    "help_text": "Different field",
                    "display_order": 0,
                    "is_required": True
                }
            ]
        }

        validation_response = client.post("/api/v1/schemas/", json=validation_schema_data)
        validation_schema_id = validation_response.json()["id"]

        # Validate against different schema
        response = client.post(
            f"/api/v1/flexible-components/{component_id}/validate",
            params={"schema_id": validation_schema_id}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_valid"] == False  # Should fail validation


class TestFlexibleComponentsQueries:
    """Tests for query and search endpoints"""

    @pytest.fixture
    def multiple_components_setup(self, test_schema_data):
        """Create multiple components for testing queries"""
        components = []

        for i in range(5):
            component_data = {
                "piece_mark": f"QUERY-TEST-{i:03d}",
                "drawing_id": str(uuid4()),
                "schema_id": test_schema_data["id"],
                "dynamic_data": {
                    "component_type": ["girder", "brace", "plate"][i % 3],
                    "material": f"Material-{i}",
                    "length": 10.0 + (i * 5)
                }
            }

            response = client.post("/api/v1/flexible-components/", json=component_data)
            components.append(response.json())

        return components, test_schema_data

    def test_get_components_by_schema(self, multiple_components_setup):
        """Test getting all components using specific schema"""
        components, schema_data = multiple_components_setup
        schema_id = schema_data["id"]

        response = client.get(f"/api/v1/flexible-components/by-schema/{schema_id}")
        assert response.status_code == 200

        data = response.json()
        assert len(data) >= 5  # Should include all created components

        # Verify all returned components use the correct schema
        for component in data:
            assert component["schema_id"] == schema_id

    def test_get_components_by_schema_with_limit(self, multiple_components_setup):
        """Test getting components by schema with limit"""
        components, schema_data = multiple_components_setup
        schema_id = schema_data["id"]

        response = client.get(f"/api/v1/flexible-components/by-schema/{schema_id}?limit=3")
        assert response.status_code == 200

        data = response.json()
        assert len(data) <= 3

    def test_search_components_by_field_value(self, multiple_components_setup):
        """Test searching components by dynamic field values"""
        components, schema_data = multiple_components_setup

        response = client.get(
            "/api/v1/flexible-components/search/by-field-value",
            params={"field_name": "component_type", "field_value": "girder"}
        )

        assert response.status_code == 200
        data = response.json()

        assert data["field_name"] == "component_type"
        assert data["field_value"] == "girder"
        assert data["total_found"] >= 0
        assert "components" in data

        # Verify all returned components have the searched value
        for component in data["components"]:
            assert component["dynamic_data"]["component_type"] == "girder"

    def test_search_components_by_field_value_with_filters(self, multiple_components_setup):
        """Test searching with schema and project filters"""
        components, schema_data = multiple_components_setup
        schema_id = schema_data["id"]
        project_id = schema_data["project_id"]

        response = client.get(
            "/api/v1/flexible-components/search/by-field-value",
            params={
                "field_name": "component_type",
                "field_value": "brace",
                "schema_id": schema_id,
                "project_id": project_id,
                "limit": 10
            }
        )

        assert response.status_code == 200
        data = response.json()

        for component in data["components"]:
            assert component["dynamic_data"]["component_type"] == "brace"
            assert component["schema_id"] == schema_id

    def test_get_schema_usage_statistics(self):
        """Test getting schema usage statistics"""
        response = client.get("/api/v1/flexible-components/stats/schema-usage")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, dict)

    def test_get_schema_usage_statistics_with_project(self):
        """Test getting schema usage statistics for specific project"""
        project_id = str(uuid4())
        response = client.get(
            f"/api/v1/flexible-components/stats/schema-usage",
            params={"project_id": project_id}
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)


class TestFlexibleComponentsBatchOperations:
    """Tests for batch operations"""

    @pytest.fixture
    def batch_components_setup(self, test_schema_data):
        """Create components for batch operation testing"""
        components = []

        for i in range(3):
            component_data = {
                "piece_mark": f"BATCH-{i:03d}",
                "drawing_id": str(uuid4()),
                "schema_id": test_schema_data["id"],
                "dynamic_data": {
                    "component_type": "girder",
                    "length": 20.0 + i
                }
            }

            response = client.post("/api/v1/flexible-components/", json=component_data)
            components.append(response.json())

        return components, test_schema_data

    def test_batch_migrate_components_to_schema(self, batch_components_setup, test_schema_data):
        """Test batch migration of components to new schema"""
        components, original_schema = batch_components_setup
        component_ids = [comp["id"] for comp in components]

        # Create target schema
        target_schema_data = {
            "project_id": original_schema["project_id"],
            "name": "Batch Target Schema",
            "description": "Target for batch migration",
            "fields": [
                {
                    "field_name": "new_field",
                    "field_type": "text",
                    "field_config": {},
                    "help_text": "New field",
                    "display_order": 0,
                    "is_required": False
                }
            ]
        }

        target_response = client.post("/api/v1/schemas/", json=target_schema_data)
        target_schema_id = target_response.json()["id"]

        # Batch migrate (force since components have data)
        response = client.post(
            "/api/v1/flexible-components/batch/migrate-schema",
            json=component_ids,
            params={"target_schema_id": target_schema_id, "force": True}
        )

        assert response.status_code == 200
        data = response.json()

        assert data["requested_components"] == 3
        assert data["successful_migrations"] >= 0
        assert "results" in data
        assert "successful" in data["results"]

    def test_batch_unlock_components(self, batch_components_setup):
        """Test batch unlocking of components"""
        components, schema_data = batch_components_setup
        component_ids = [comp["id"] for comp in components]

        response = client.post(
            "/api/v1/flexible-components/batch/unlock",
            json=component_ids
        )

        assert response.status_code == 200
        data = response.json()

        assert data["requested_components"] == 3
        assert data["successful_unlocks"] >= 0
        assert data["failed_unlocks"] >= 0
        assert "results" in data


class TestFlexibleComponentsUtility:
    """Tests for utility endpoints"""

    def test_get_available_schemas_for_component(self, sample_component_data):
        """Test getting available schemas for a component"""
        # Create component first
        create_response = client.post("/api/v1/flexible-components/", json=sample_component_data)
        component_id = create_response.json()["id"]

        response = client.get(f"/api/v1/flexible-components/{component_id}/available-schemas")
        assert response.status_code == 200

        data = response.json()
        assert "current_schema_id" in data
        assert "is_type_locked" in data
        assert "available_schemas" in data
        assert isinstance(data["available_schemas"], list)

    def test_debug_component_schema_info(self, sample_component_data):
        """Test getting debug information for component"""
        # Create component first
        create_response = client.post("/api/v1/flexible-components/", json=sample_component_data)
        component_id = create_response.json()["id"]

        response = client.get(f"/api/v1/flexible-components/{component_id}/debug")
        assert response.status_code == 200

        data = response.json()
        assert "component_id" in data
        assert "basic_info" in data
        assert "schema_info" in data
        assert "lock_status" in data

        # Verify debug info contains expected fields
        assert "piece_mark" in data["basic_info"]
        assert "schema_id" in data["schema_info"]
        assert "is_locked" in data["lock_status"]

    def test_validate_component_data_against_schema(self, test_schema_data):
        """Test validating data against schema without creating component"""
        schema_id = test_schema_data["id"]

        valid_data = {
            "component_type": "girder",
            "length": 25.5
        }

        response = client.post(
            "/api/v1/flexible-components/validate-data",
            params={"schema_id": schema_id},
            json=valid_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_valid"] == True
        assert len(data["errors"]) == 0

    def test_validate_invalid_component_data_against_schema(self, test_schema_data):
        """Test validating invalid data against schema"""
        schema_id = test_schema_data["id"]

        invalid_data = {
            "component_type": "invalid_type",  # Not in allowed options
            "length": "not_a_number"          # Should be number
        }

        response = client.post(
            "/api/v1/flexible-components/validate-data",
            params={"schema_id": schema_id},
            json=invalid_data
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_valid"] == False
        assert len(data["errors"]) > 0


# Error Handling and Edge Cases
class TestFlexibleComponentsErrorHandling:
    """Tests for error handling and edge cases"""

    def test_create_component_with_nonexistent_schema(self):
        """Test creating component with non-existent schema"""
        fake_schema_id = str(uuid4())
        component_data = {
            "piece_mark": "ERROR-TEST",
            "drawing_id": str(uuid4()),
            "schema_id": fake_schema_id,
            "dynamic_data": {"test": "value"}
        }

        response = client.post("/api/v1/flexible-components/", json=component_data)
        assert response.status_code == 400

    def test_migrate_to_nonexistent_schema(self, sample_component_data):
        """Test migrating component to non-existent schema"""
        # Create component first
        create_response = client.post("/api/v1/flexible-components/", json=sample_component_data)
        component_id = create_response.json()["id"]

        fake_schema_id = str(uuid4())
        response = client.post(
            f"/api/v1/flexible-components/{component_id}/migrate-schema",
            params={"target_schema_id": fake_schema_id, "force": True}
        )

        assert response.status_code == 400

    def test_invalid_uuid_handling(self):
        """Test handling of invalid UUIDs in endpoints"""
        invalid_id = "not-a-uuid"

        response = client.get(f"/api/v1/flexible-components/{invalid_id}")
        assert response.status_code == 422  # Validation error

    def test_empty_component_ids_batch_operations(self):
        """Test batch operations with empty component ID list"""
        response = client.post("/api/v1/flexible-components/batch/unlock", json=[])
        assert response.status_code == 200

        data = response.json()
        assert data["requested_components"] == 0