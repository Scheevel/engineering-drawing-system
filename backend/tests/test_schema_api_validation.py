"""
Schema API Validation Integration Tests

Integration tests for schema name validation through API endpoints (FR-1, FR-2)
Tests AC 1-10 including validation, navigation, and persistence
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.core.database import get_db
from app.models.database import ComponentSchema
import uuid


@pytest.fixture
def client(db_session: Session):
    """Create test client with database session"""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


class TestSchemaCreationValidation:
    """Test schema creation API with validation (FR-1, AC 1-5)"""

    def test_create_schema_with_valid_name(self, client, db_session):
        """Test creating schema with valid name succeeds"""
        schema_data = {
            "name": "valid-schema-name",
            "description": "Test schema",
            "fields": [
                {
                    "field_name": "test_field",
                    "field_type": "text",
                    "field_config": {},
                    "display_order": 0,
                    "is_required": False,
                }
            ],
            "is_default": False,
        }

        response = client.post("/api/v1/schemas/", json=schema_data)
        assert response.status_code == 200, f"Failed: {response.json()}"

        result = response.json()
        assert result["name"] == "valid-schema-name"
        assert result["id"] is not None

    def test_create_schema_name_too_short(self, client, db_session):
        """Test creating schema with name < 3 chars fails (AC 1)"""
        schema_data = {
            "name": "ab",
            "description": "Test",
            "fields": [
                {
                    "field_name": "test_field",
                    "field_type": "text",
                    "field_config": {},
                    "display_order": 0,
                    "is_required": False,
                }
            ],
            "is_default": False,
        }

        response = client.post("/api/v1/schemas/", json=schema_data)
        assert response.status_code == 400
        assert "3 characters" in response.json()["detail"].lower()

    def test_create_schema_name_too_long(self, client, db_session):
        """Test creating schema with name > 100 chars fails (AC 1)"""
        schema_data = {
            "name": "a" * 101,
            "description": "Test",
            "fields": [
                {
                    "field_name": "test_field",
                    "field_type": "text",
                    "field_config": {},
                    "display_order": 0,
                    "is_required": False,
                }
            ],
            "is_default": False,
        }

        response = client.post("/api/v1/schemas/", json=schema_data)
        assert response.status_code == 400
        assert "100" in response.json()["detail"]

    def test_create_schema_with_spaces(self, client, db_session):
        """Test creating schema with spaces fails (AC 3)"""
        schema_data = {
            "name": "name with spaces",
            "description": "Test",
            "fields": [
                {
                    "field_name": "test_field",
                    "field_type": "text",
                    "field_config": {},
                    "display_order": 0,
                    "is_required": False,
                }
            ],
            "is_default": False,
        }

        response = client.post("/api/v1/schemas/", json=schema_data)
        assert response.status_code == 400
        assert "space" in response.json()["detail"].lower()

    def test_create_schema_with_invalid_characters(self, client, db_session):
        """Test creating schema with invalid characters fails with specific error (AC 3)"""
        invalid_names = ["name@domain", "name.ext", "name$value", "name#tag"]

        for name in invalid_names:
            schema_data = {
                "name": name,
                "description": "Test",
                "fields": [
                    {
                        "field_name": "test_field",
                        "field_type": "text",
                        "field_config": {},
                        "display_order": 0,
                        "is_required": False,
                    }
                ],
                "is_default": False,
            }

            response = client.post("/api/v1/schemas/", json=schema_data)
            assert response.status_code == 400
            error_detail = response.json()["detail"]
            assert "invalid" in error_detail.lower() or "character" in error_detail.lower()

    def test_create_schema_prevents_save_on_validation_failure(self, client, db_session):
        """Test that invalid schema is not saved to database (AC 4)"""
        initial_count = db_session.query(ComponentSchema).count()

        schema_data = {
            "name": "invalid@name",
            "description": "Test",
            "fields": [
                {
                    "field_name": "test_field",
                    "field_type": "text",
                    "field_config": {},
                    "display_order": 0,
                    "is_required": False,
                }
            ],
            "is_default": False,
        }

        response = client.post("/api/v1/schemas/", json=schema_data)
        assert response.status_code == 400

        # Verify no new schema was created
        final_count = db_session.query(ComponentSchema).count()
        assert final_count == initial_count


class TestSchemaUpdateValidation:
    """Test schema update API with validation (FR-2, AC 8-10)"""

    def test_update_schema_name_with_valid_name(self, client, db_session):
        """Test updating schema name with valid name succeeds (AC 8)"""
        # Create a schema first
        schema = ComponentSchema(
            id=uuid.uuid4(),
            name="original-name",
            description="Test",
            schema_definition={"version": "1.0", "fields": []},
            version=1,
            is_default=False,
            is_active=True,
            created_by="test",
        )
        db_session.add(schema)
        db_session.commit()

        # Update the schema name
        update_data = {"name": "updated-valid-name"}
        response = client.put(f"/api/v1/schemas/{schema.id}", json=update_data)

        assert response.status_code == 200, f"Failed: {response.json()}"
        result = response.json()
        assert result["name"] == "updated-valid-name"

        # Verify persistence (AC 9)
        db_session.refresh(schema)
        assert schema.name == "updated-valid-name"

    def test_update_schema_name_persistence_after_reload(self, client, db_session):
        """Test that updated name persists after page reload (AC 9)"""
        # Create schema
        schema = ComponentSchema(
            id=uuid.uuid4(),
            name="original-name",
            description="Test",
            schema_definition={"version": "1.0", "fields": []},
            version=1,
            is_default=False,
            is_active=True,
            created_by="test",
        )
        db_session.add(schema)
        db_session.commit()

        # Update name
        update_data = {"name": "updated-name"}
        response = client.put(f"/api/v1/schemas/{schema.id}", json=update_data)
        assert response.status_code == 200

        # Simulate page reload by fetching schema again
        get_response = client.get(f"/api/v1/schemas/{schema.id}")
        assert get_response.status_code == 200
        assert get_response.json()["name"] == "updated-name"

    def test_update_schema_name_with_invalid_name(self, client, db_session):
        """Test updating schema with invalid name fails"""
        schema = ComponentSchema(
            id=uuid.uuid4(),
            name="original-name",
            description="Test",
            schema_definition={"version": "1.0", "fields": []},
            version=1,
            is_default=False,
            is_active=True,
            created_by="test",
        )
        db_session.add(schema)
        db_session.commit()

        # Try to update with invalid name
        update_data = {"name": "invalid@name"}
        response = client.put(f"/api/v1/schemas/{schema.id}", json=update_data)
        assert response.status_code == 400

        # Verify original name unchanged
        db_session.refresh(schema)
        assert schema.name == "original-name"


class TestSchemaUniquenessValidation:
    """Test case-insensitive uniqueness validation (AC 10)"""

    def test_duplicate_name_rejected_same_case(self, client, db_session):
        """Test that duplicate names are rejected (same case)"""
        # Create first schema
        schema1 = ComponentSchema(
            id=uuid.uuid4(),
            name="test-schema",
            description="First",
            schema_definition={"version": "1.0", "fields": []},
            version=1,
            is_default=False,
            is_active=True,
            created_by="test",
        )
        db_session.add(schema1)
        db_session.commit()

        # Try to create second schema with same name
        schema_data = {
            "name": "test-schema",
            "description": "Second",
            "fields": [
                {
                    "field_name": "test_field",
                    "field_type": "text",
                    "field_config": {},
                    "display_order": 0,
                    "is_required": False,
                }
            ],
            "is_default": False,
        }

        response = client.post("/api/v1/schemas/", json=schema_data)
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()

    def test_duplicate_name_rejected_different_case(self, client, db_session):
        """Test that duplicate names are rejected (case-insensitive, AC 10)"""
        # Create first schema
        schema1 = ComponentSchema(
            id=uuid.uuid4(),
            name="test-schema",
            description="First",
            schema_definition={"version": "1.0", "fields": []},
            version=1,
            is_default=False,
            is_active=True,
            created_by="test",
        )
        db_session.add(schema1)
        db_session.commit()

        # Try to create schema with different case
        schema_data = {
            "name": "TEST-SCHEMA",
            "description": "Second",
            "fields": [
                {
                    "field_name": "test_field",
                    "field_type": "text",
                    "field_config": {},
                    "display_order": 0,
                    "is_required": False,
                }
            ],
            "is_default": False,
        }

        response = client.post("/api/v1/schemas/", json=schema_data)
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()

    def test_update_to_duplicate_name_rejected(self, client, db_session):
        """Test that updating to duplicate name is rejected"""
        # Create two schemas
        schema1 = ComponentSchema(
            id=uuid.uuid4(),
            name="schema-one",
            description="First",
            schema_definition={"version": "1.0", "fields": []},
            version=1,
            is_default=False,
            is_active=True,
            created_by="test",
        )
        schema2 = ComponentSchema(
            id=uuid.uuid4(),
            name="schema-two",
            description="Second",
            schema_definition={"version": "1.0", "fields": []},
            version=1,
            is_default=False,
            is_active=True,
            created_by="test",
        )
        db_session.add_all([schema1, schema2])
        db_session.commit()

        # Try to update schema2 to have same name as schema1
        update_data = {"name": "schema-one"}
        response = client.put(f"/api/v1/schemas/{schema2.id}", json=update_data)
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()

    def test_update_schema_name_to_itself_allowed(self, client, db_session):
        """Test that updating schema to its own name is allowed (same case)"""
        schema = ComponentSchema(
            id=uuid.uuid4(),
            name="test-schema",
            description="Test",
            schema_definition={"version": "1.0", "fields": []},
            version=1,
            is_default=False,
            is_active=True,
            created_by="test",
        )
        db_session.add(schema)
        db_session.commit()

        # Update with same name (e.g., updating description only)
        update_data = {"name": "test-schema", "description": "Updated description"}
        response = client.put(f"/api/v1/schemas/{schema.id}", json=update_data)
        assert response.status_code == 200
