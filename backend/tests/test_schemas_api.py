import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4, UUID
import json

from app.main import app
from app.core.database import get_db
from app.models.database import ComponentSchema, ComponentSchemaField, Component, Drawing, Project
from app.models.schema import SchemaFieldType

client = TestClient(app)


class TestSchemasAPI:
    """Integration tests for Schema API endpoints"""

    @pytest.fixture
    def test_project_id(self):
        """Sample project ID for testing"""
        return uuid4()

    @pytest.fixture
    def sample_schema_data(self, test_project_id):
        """Sample schema data for API testing"""
        return {
            "project_id": str(test_project_id),
            "name": "Bridge Components Schema",
            "description": "Schema for bridge structural components",
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
                    "field_name": "length",
                    "field_type": "number",
                    "field_config": {
                        "min": 0,
                        "max": 1000,
                        "unit": "ft"
                    },
                    "help_text": "Component length in feet",
                    "display_order": 1,
                    "is_required": True
                }
            ],
            "is_default": True
        }

    def test_create_schema_success(self, sample_schema_data):
        """Test successful schema creation via API"""
        response = client.post("/api/v1/schemas/", json=sample_schema_data)

        assert response.status_code == 200
        data = response.json()

        assert data["name"] == "Bridge Components Schema"
        assert data["description"] == "Schema for bridge structural components"
        assert len(data["fields"]) == 2
        assert data["is_default"] == True

        # Verify field details
        component_type_field = next(f for f in data["fields"] if f["field_name"] == "component_type")
        assert component_type_field["field_type"] == "select"
        assert component_type_field["is_required"] == True

    def test_create_schema_validation_error(self, test_project_id):
        """Test schema creation with validation errors"""
        invalid_schema = {
            "project_id": str(test_project_id),
            "name": "",  # Invalid: empty name
            "description": "Invalid schema",
            "fields": []  # Invalid: no fields
        }

        response = client.post("/api/v1/schemas/", json=invalid_schema)
        assert response.status_code == 400
        assert "validation error" in response.json()["detail"].lower()

    def test_create_schema_duplicate_name_error(self, sample_schema_data):
        """Test schema creation fails with duplicate name"""
        # Create first schema
        response1 = client.post("/api/v1/schemas/", json=sample_schema_data)
        assert response1.status_code == 200

        # Try to create second schema with same name
        response2 = client.post("/api/v1/schemas/", json=sample_schema_data)
        assert response2.status_code == 400
        assert "already exists" in response2.json()["detail"]

    def test_get_schema_success(self, sample_schema_data):
        """Test getting schema by ID"""
        # Create schema first
        create_response = client.post("/api/v1/schemas/", json=sample_schema_data)
        schema_id = create_response.json()["id"]

        # Get schema
        response = client.get(f"/api/v1/schemas/{schema_id}")
        assert response.status_code == 200

        data = response.json()
        assert data["id"] == schema_id
        assert data["name"] == "Bridge Components Schema"
        assert len(data["fields"]) == 2

    def test_get_schema_not_found(self):
        """Test getting non-existent schema"""
        fake_id = str(uuid4())
        response = client.get(f"/api/v1/schemas/{fake_id}")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_project_schemas(self, sample_schema_data, test_project_id):
        """Test getting all schemas for a project"""
        # Create schema first
        client.post("/api/v1/schemas/", json=sample_schema_data)

        # Get project schemas
        response = client.get(f"/api/v1/schemas/projects/{test_project_id}")
        assert response.status_code == 200

        data = response.json()
        assert "schemas" in data
        assert data["total"] >= 1
        assert data["project_id"] == str(test_project_id)

    def test_get_project_schemas_include_global(self, test_project_id):
        """Test getting project schemas including global ones"""
        response = client.get(f"/api/v1/schemas/projects/{test_project_id}?include_global=true")
        assert response.status_code == 200

        data = response.json()
        assert "schemas" in data
        assert isinstance(data["schemas"], list)

    def test_update_schema_success(self, sample_schema_data):
        """Test updating schema basic information"""
        # Create schema first
        create_response = client.post("/api/v1/schemas/", json=sample_schema_data)
        schema_id = create_response.json()["id"]

        # Update schema
        update_data = {
            "name": "Updated Bridge Schema",
            "description": "Updated description"
        }
        response = client.put(f"/api/v1/schemas/{schema_id}", json=update_data)
        assert response.status_code == 200

        data = response.json()
        assert data["name"] == "Updated Bridge Schema"
        assert data["description"] == "Updated description"

    def test_update_schema_not_found(self):
        """Test updating non-existent schema"""
        fake_id = str(uuid4())
        update_data = {"name": "New Name"}

        response = client.put(f"/api/v1/schemas/{fake_id}", json=update_data)
        assert response.status_code == 404

    def test_deactivate_schema_success(self, sample_schema_data):
        """Test deactivating a schema"""
        # Create schema first
        create_response = client.post("/api/v1/schemas/", json=sample_schema_data)
        schema_id = create_response.json()["id"]

        # Deactivate schema
        response = client.delete(f"/api/v1/schemas/{schema_id}")
        assert response.status_code == 200
        assert "deactivated successfully" in response.json()["message"]

    def test_add_schema_field_success(self, sample_schema_data):
        """Test adding field to existing schema"""
        # Create schema first
        create_response = client.post("/api/v1/schemas/", json=sample_schema_data)
        schema_id = create_response.json()["id"]

        # Add new field
        new_field = {
            "field_name": "material_grade",
            "field_type": "select",
            "field_config": {
                "options": ["A36", "A572", "A992"],
                "allow_custom": True
            },
            "help_text": "Select steel grade",
            "display_order": 10,
            "is_required": False
        }

        response = client.post(f"/api/v1/schemas/{schema_id}/fields", json=new_field)
        assert response.status_code == 200

        data = response.json()
        assert data["field_name"] == "material_grade"
        assert data["field_type"] == "select"
        assert data["display_order"] == 10

    def test_validate_data_against_schema(self, sample_schema_data):
        """Test validating data against schema"""
        # Create schema first
        create_response = client.post("/api/v1/schemas/", json=sample_schema_data)
        schema_id = create_response.json()["id"]

        # Test valid data
        valid_data = {
            "component_type": "girder",
            "length": 45.5
        }

        response = client.post(f"/api/v1/schemas/{schema_id}/validate", json=valid_data)
        assert response.status_code == 200

        data = response.json()
        assert data["is_valid"] == True
        assert len(data["errors"]) == 0

    def test_validate_data_validation_errors(self, sample_schema_data):
        """Test validation with errors"""
        # Create schema first
        create_response = client.post("/api/v1/schemas/", json=sample_schema_data)
        schema_id = create_response.json()["id"]

        # Test invalid data - missing required field and wrong type
        invalid_data = {
            "component_type": "invalid_type",  # Not in allowed options
            "length": "not_a_number"          # Should be number
        }

        response = client.post(f"/api/v1/schemas/{schema_id}/validate", json=invalid_data)
        assert response.status_code == 200

        data = response.json()
        assert data["is_valid"] == False
        assert len(data["errors"]) > 0

    def test_get_schema_usage(self, sample_schema_data):
        """Test getting schema usage information"""
        # Create schema first
        create_response = client.post("/api/v1/schemas/", json=sample_schema_data)
        schema_id = create_response.json()["id"]

        # Get usage info
        response = client.get(f"/api/v1/schemas/{schema_id}/usage")
        assert response.status_code == 200

        data = response.json()
        assert "schema_id" in data
        assert "components_using_schema" in data
        assert "component_ids" in data

    def test_bulk_assign_schema(self, sample_schema_data):
        """Test bulk schema assignment"""
        # Create schema first
        create_response = client.post("/api/v1/schemas/", json=sample_schema_data)
        schema_id = create_response.json()["id"]

        # Bulk assignment request
        bulk_request = {
            "component_ids": [str(uuid4()), str(uuid4())],
            "target_schema_id": schema_id,
            "force_assignment": False
        }

        response = client.post("/api/v1/schemas/bulk-assign", json=bulk_request)
        assert response.status_code == 200

        data = response.json()
        assert "successful_assignments" in data
        assert "failed_assignments" in data
        assert "total_processed" in data

    def test_migrate_legacy_components(self):
        """Test legacy component migration"""
        response = client.post("/api/v1/schemas/migrate-legacy")
        assert response.status_code == 200

        data = response.json()
        assert "migrated" in data
        assert "errors" in data
        assert "total_processed" in data

    def test_get_project_schema_stats(self, test_project_id):
        """Test getting project schema statistics"""
        response = client.get(f"/api/v1/schemas/projects/{test_project_id}/stats")
        assert response.status_code == 200

        # Should return statistics even if empty
        data = response.json()
        assert isinstance(data, dict)


class TestSchemaFieldsAPI:
    """Integration tests for Schema Field API endpoints"""

    @pytest.fixture
    def test_schema_with_fields(self, sample_schema_data):
        """Create a test schema and return its data"""
        response = client.post("/api/v1/schemas/", json=sample_schema_data)
        return response.json()

    def test_update_schema_field_success(self, test_schema_with_fields):
        """Test updating a schema field"""
        schema_data = test_schema_with_fields
        field_id = schema_data["fields"][0]["id"]

        update_data = {
            "help_text": "Updated help text for component type",
            "is_required": False
        }

        response = client.put(f"/api/v1/schemas/fields/{field_id}", json=update_data)
        assert response.status_code == 200

        data = response.json()
        assert data["help_text"] == "Updated help text for component type"
        assert data["is_required"] == False

    def test_remove_schema_field_success(self, test_schema_with_fields):
        """Test removing a schema field"""
        schema_data = test_schema_with_fields
        field_id = schema_data["fields"][0]["id"]

        response = client.delete(f"/api/v1/schemas/fields/{field_id}")
        assert response.status_code == 200
        assert "removed successfully" in response.json()["message"]

    def test_update_schema_field_not_found(self):
        """Test updating non-existent field"""
        fake_id = str(uuid4())
        update_data = {"help_text": "New help text"}

        response = client.put(f"/api/v1/schemas/fields/{fake_id}", json=update_data)
        assert response.status_code == 404

    def test_remove_schema_field_not_found(self):
        """Test removing non-existent field"""
        fake_id = str(uuid4())

        response = client.delete(f"/api/v1/schemas/fields/{fake_id}")
        assert response.status_code == 404


class TestDefaultSchemaAPI:
    """Integration tests for default schema endpoints"""

    def test_get_global_default_schema(self):
        """Test getting global default schema"""
        response = client.get("/api/v1/schemas/global/default")

        # Should either return a schema or 404
        assert response.status_code in [200, 404]

        if response.status_code == 200:
            data = response.json()
            assert "id" in data
            assert "name" in data
            assert "fields" in data

    def test_get_project_default_schema(self):
        """Test getting project default schema"""
        project_id = str(uuid4())
        response = client.get(f"/api/v1/schemas/projects/{project_id}/default")

        # Should either return a schema or 404 for non-existent project
        assert response.status_code in [200, 404]


# Performance and Edge Case Tests
class TestSchemasAPIPerformance:
    """Performance and edge case tests for Schema API"""

    def test_create_schema_with_many_fields(self):
        """Test creating schema with maximum number of fields"""
        fields = []
        for i in range(50):  # Create 50 fields to test performance
            fields.append({
                "field_name": f"test_field_{i}",
                "field_type": "text",
                "field_config": {"max_length": 100},
                "help_text": f"Test field number {i}",
                "display_order": i,
                "is_required": False
            })

        schema_data = {
            "project_id": str(uuid4()),
            "name": "Large Schema Test",
            "description": "Schema with many fields for performance testing",
            "fields": fields,
            "is_default": False
        }

        response = client.post("/api/v1/schemas/", json=schema_data)
        assert response.status_code == 200

        data = response.json()
        assert len(data["fields"]) == 50

    def test_validate_large_dataset(self, sample_schema_data):
        """Test validation with large data payload"""
        # Create schema first
        create_response = client.post("/api/v1/schemas/", json=sample_schema_data)
        schema_id = create_response.json()["id"]

        # Create large data payload
        large_data = {
            "component_type": "girder",
            "length": 45.5,
            "large_text_field": "A" * 10000  # 10KB text field
        }

        response = client.post(f"/api/v1/schemas/{schema_id}/validate", json=large_data)
        assert response.status_code == 200

    def test_concurrent_schema_creation(self):
        """Test handling concurrent schema creation requests"""
        import threading
        import time

        results = []

        def create_schema(thread_id):
            schema_data = {
                "project_id": str(uuid4()),
                "name": f"Concurrent Schema {thread_id}",
                "description": f"Schema created by thread {thread_id}",
                "fields": [{
                    "field_name": "test_field",
                    "field_type": "text",
                    "field_config": {},
                    "help_text": "Test field",
                    "display_order": 0,
                    "is_required": False
                }]
            }

            response = client.post("/api/v1/schemas/", json=schema_data)
            results.append((thread_id, response.status_code))

        # Create multiple threads
        threads = []
        for i in range(5):
            thread = threading.Thread(target=create_schema, args=(i,))
            threads.append(thread)
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # All requests should succeed
        assert len(results) == 5
        assert all(status_code == 200 for _, status_code in results)