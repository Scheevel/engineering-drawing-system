"""
Test Suite: Default Schema Protection
Story: 3.13 Phase 3 - FR-6 AC 28-33

Tests comprehensive protection of default schemas from modification,
including backend validation and duplication functionality.
"""

import pytest
from uuid import uuid4


class TestDefaultSchemaProtection:
    """Tests for FR-6: Default schema protection across all operations"""

    @pytest.fixture
    def test_project_id(self):
        """Create a test project ID"""
        return uuid4()

    @pytest.fixture
    def default_schema_data(self):
        """Create test data for a default schema"""
        return {
            "project_id": None,  # Global schema
            "name": "system-default-schema",
            "description": "Protected default schema for testing",
            "is_default": True,
            "fields": [
                {
                    "field_name": "sample_field",
                    "field_type": "text",
                    "field_config": {},
                    "help_text": "Sample field",
                    "display_order": 0,
                    "is_required": False
                }
            ]
        }

    @pytest.fixture
    def editable_schema_data(self):
        """Create test data for a non-default (editable) schema"""
        return {
            "project_id": None,  # Global schema
            "name": "custom-editable-schema",
            "description": "User-created schema for testing",
            "is_default": False,
            "fields": [
                {
                    "field_name": "custom_field",
                    "field_type": "text",
                    "field_config": {},
                    "help_text": "Custom field",
                    "display_order": 0,
                    "is_required": False
                }
            ]
        }

    @pytest.fixture
    def default_schema(self, test_client, default_schema_data):
        """Create a default schema via API"""
        response = test_client.post("/api/v1/schemas/", json=default_schema_data)
        if response.status_code != 200:
            print(f"\nSchema creation failed: {response.status_code}")
            print(f"Response: {response.json()}")
        assert response.status_code == 200, f"Failed to create schema: {response.json()}"
        return response.json()

    @pytest.fixture
    def editable_schema(self, test_client, editable_schema_data):
        """Create an editable schema via API"""
        response = test_client.post("/api/v1/schemas/", json=editable_schema_data)
        assert response.status_code == 200
        return response.json()

    # ===== FR-6 AC 28: Default schemas clearly identified in UI =====

    def test_default_schema_has_is_default_flag(self, test_client, default_schema):
        """Test GET /api/schemas/{id} returns is_default=True for default schemas"""
        schema_id = default_schema["id"]
        response = test_client.get(f"/api/v1/schemas/{schema_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["is_default"] is True
        assert "is_default" in data

    def test_schema_list_includes_default_flag(self, test_client, default_schema):
        """Test GET /api/schemas/projects/{id} includes is_default flag"""
        project_id = default_schema["project_id"] or "global"
        response = test_client.get(f"/api/v1/schemas/projects/{project_id}")

        assert response.status_code == 200
        schemas = response.json()["schemas"]
        assert len(schemas) > 0

        default_in_list = next((s for s in schemas if s["id"] == default_schema["id"]), None)
        assert default_in_list is not None
        assert "is_default" in default_in_list
        assert default_in_list["is_default"] is True

    # ===== FR-6 AC 29: Prevent editing default schema metadata =====

    def test_cannot_update_default_schema_name(self, test_client, default_schema):
        """Test PUT /api/schemas/{id} rejects updates to default schema name"""
        schema_id = default_schema["id"]
        update_data = {"name": "Attempted New Name"}

        response = test_client.put(f"/api/v1/schemas/{schema_id}", json=update_data)

        assert response.status_code == 400
        error_detail = response.json()["detail"]
        assert "cannot modify system default schema" in error_detail.lower()
        assert "duplicate" in error_detail.lower()

    def test_cannot_update_default_schema_description(self, test_client, default_schema):
        """Test PUT /api/schemas/{id} rejects updates to default schema description"""
        schema_id = default_schema["id"]
        update_data = {"description": "Attempted new description"}

        response = test_client.put(f"/api/v1/schemas/{schema_id}", json=update_data)

        assert response.status_code == 400
        assert "cannot modify system default schema" in response.json()["detail"].lower()

    def test_can_update_editable_schema_metadata(self, test_client, editable_schema):
        """Test PUT /api/schemas/{id} allows updates to non-default schemas"""
        schema_id = editable_schema["id"]
        update_data = {"name": "Updated Schema Name"}

        response = test_client.put(f"/api/v1/schemas/{schema_id}", json=update_data)

        assert response.status_code == 200
        updated_schema = response.json()
        assert updated_schema["name"] == "Updated Schema Name"

    # ===== FR-6 AC 30: Prevent deleting default schemas =====

    def test_cannot_delete_default_schema(self, test_client, default_schema):
        """Test DELETE /api/schemas/{id} rejects deletion of default schemas"""
        schema_id = default_schema["id"]

        response = test_client.delete(f"/api/v1/schemas/{schema_id}")

        assert response.status_code == 400
        error_detail = response.json()["detail"]
        assert "cannot delete system default schema" in error_detail.lower()
        assert "protected" in error_detail.lower()

        get_response = test_client.get(f"/api/v1/schemas/{schema_id}")
        assert get_response.status_code == 200
        assert get_response.json()["is_active"] is True

    def test_can_delete_editable_schema(self, test_client, editable_schema):
        """Test DELETE /api/schemas/{id} allows deletion of non-default schemas"""
        schema_id = editable_schema["id"]

        response = test_client.delete(f"/api/v1/schemas/{schema_id}")

        assert response.status_code == 200

        project_id = editable_schema["project_id"] or "global"
        list_response = test_client.get(f"/api/v1/schemas/projects/{project_id}")
        schemas = list_response.json()["schemas"]
        assert not any(s["id"] == schema_id for s in schemas)

    # ===== FR-6 AC 31: Prevent field operations on default schemas =====

    def test_cannot_add_field_to_default_schema(self, test_client, default_schema):
        """Test POST /api/schemas/{id}/fields rejects adding fields to default schemas"""
        schema_id = default_schema["id"]
        new_field = {
            "field_name": "new_field",
            "field_type": "text",
            "field_config": {},
            "help_text": "Attempted new field",
            "display_order": 1,
            "is_required": False
        }

        response = test_client.post(f"/api/v1/schemas/{schema_id}/fields", json=new_field)

        assert response.status_code == 400
        assert "cannot" in response.json()["detail"].lower()
        assert "default" in response.json()["detail"].lower()

    def test_cannot_update_field_in_default_schema(self, test_client, default_schema):
        """Test PUT /api/schemas/fields/{field_id} rejects updates to default schema fields"""
        field_id = default_schema["fields"][0]["id"]
        update_data = {"label": "Attempted New Label"}

        response = test_client.put(f"/api/v1/schemas/fields/{field_id}", json=update_data)

        assert response.status_code == 400
        assert "cannot" in response.json()["detail"].lower()

    def test_cannot_delete_field_from_default_schema(self, test_client, default_schema):
        """Test DELETE /api/schemas/fields/{field_id} rejects field removal from default schemas"""
        field_id = default_schema["fields"][0]["id"]

        response = test_client.delete(f"/api/v1/schemas/fields/{field_id}")

        assert response.status_code == 400
        assert "cannot" in response.json()["detail"].lower()

    def test_can_perform_field_operations_on_editable_schema(self, test_client, editable_schema):
        """Test all field CRUD operations work on non-default schemas"""
        schema_id = editable_schema["id"]

        new_field = {
            "field_name": "additional_field",
            "field_type": "number",
            "field_config": {"min": 0},
            "help_text": "Additional field",
            "display_order": 1,
            "is_required": False
        }
        add_response = test_client.post(f"/api/v1/schemas/{schema_id}/fields", json=new_field)
        assert add_response.status_code == 200
        new_field_id = add_response.json()["id"]

        update_data = {"label": "Updated Field Label"}
        update_response = test_client.put(f"/api/v1/schemas/fields/{new_field_id}", json=update_data)
        assert update_response.status_code == 200

        delete_response = test_client.delete(f"/api/v1/schemas/fields/{new_field_id}")
        assert delete_response.status_code == 200

    # ===== FR-6 AC 32: Clear user guidance in error messages =====

    def test_error_messages_guide_users_to_duplicate(self, test_client, default_schema):
        """Test all default schema protection errors mention duplication workflow"""
        schema_id = default_schema["id"]

        update_response = test_client.put(f"/api/v1/schemas/{schema_id}", json={"name": "New Name"})
        assert "duplicate" in update_response.json()["detail"].lower()
        assert "editable copy" in update_response.json()["detail"].lower()

        delete_response = test_client.delete(f"/api/v1/schemas/{schema_id}")
        error_detail = delete_response.json()["detail"].lower()
        assert "protected" in error_detail or "cannot delete" in error_detail

    # ===== FR-6 AC 33: Duplication functionality =====

    def test_duplicate_default_schema_creates_editable_copy(self, test_client, default_schema):
        """Test POST /api/schemas/{id}/duplicate creates editable copy of default schema"""
        schema_id = default_schema["id"]
        new_name = "My Custom Schema Copy"

        response = test_client.post(
            f"/api/v1/schemas/{schema_id}/duplicate",
            params={"new_name": new_name}
        )

        assert response.status_code == 200
        duplicated_schema = response.json()

        assert duplicated_schema["id"] != default_schema["id"]
        assert duplicated_schema["is_default"] is False
        assert duplicated_schema["is_active"] is True
        assert duplicated_schema["name"] == new_name
        assert duplicated_schema["version"] == 1

        assert len(duplicated_schema["fields"]) == len(default_schema["fields"])
        for orig_field, dup_field in zip(default_schema["fields"], duplicated_schema["fields"]):
            assert dup_field["id"] != orig_field["id"]
            assert dup_field["field_name"] == orig_field["field_name"]
            assert dup_field["field_type"] == orig_field["field_type"]
            assert dup_field["field_config"] == orig_field["field_config"]

    def test_duplicate_editable_schema_works(self, test_client, editable_schema):
        """Test duplication also works for non-default schemas"""
        schema_id = editable_schema["id"]

        response = test_client.post(
            f"/api/v1/schemas/{schema_id}/duplicate",
            params={"new_name": "Duplicated Editable Schema"}
        )

        assert response.status_code == 200
        duplicated = response.json()
        assert duplicated["id"] != schema_id
        assert duplicated["is_default"] is False

    def test_duplicate_without_name_generates_default_name(self, test_client, default_schema):
        """Test POST /api/schemas/{id}/duplicate without new_name uses default naming"""
        schema_id = default_schema["id"]

        response = test_client.post(f"/api/v1/schemas/{schema_id}/duplicate")

        assert response.status_code == 200
        duplicated = response.json()
        assert "(Copy)" in duplicated["name"]
        assert default_schema["name"] in duplicated["name"]

    def test_duplicate_copies_all_field_properties(self, test_client, test_project_id):
        """Test duplication preserves all field configurations"""
        complex_schema_data = {
            "project_id": str(test_project_id),
            "name": "Complex Default Schema",
            "description": "Schema with complex fields",
            "is_default": True,
            "fields": [
                {
                    "field_name": "materials",
                    "field_type": "multiselect",
                    "field_config": {
                        "options": ["Steel", "Aluminum", "Concrete"],
                        "placeholder": "Select materials",
                        "default_value": ["Steel"]
                    },
                    "help_text": "Select component materials",
                    "display_order": 0,
                    "is_required": True
                }
            ]
        }

        create_response = test_client.post("/api/v1/schemas/", json=complex_schema_data)
        assert create_response.status_code == 200
        original_schema = create_response.json()

        duplicate_response = test_client.post(
            f"/api/v1/schemas/{original_schema['id']}/duplicate",
            params={"new_name": "Complex Schema Copy"}
        )

        assert duplicate_response.status_code == 200
        duplicated_schema = duplicate_response.json()

        orig_field = original_schema["fields"][0]
        dup_field = duplicated_schema["fields"][0]
        assert dup_field["field_type"] == "multiselect"
        assert dup_field["field_config"]["options"] == ["Steel", "Aluminum", "Concrete"]
        assert dup_field["field_config"]["default_value"] == ["Steel"]
        assert dup_field["is_required"] == orig_field["is_required"]

    def test_duplicate_to_different_project(self, test_client, default_schema, test_project_id):
        """Test POST /api/schemas/{id}/duplicate?project_id={new_project} copies to target project"""
        schema_id = default_schema["id"]
        new_project_id = uuid4()

        response = test_client.post(
            f"/api/v1/schemas/{schema_id}/duplicate",
            params={
                "new_name": "Cross-Project Copy",
                "project_id": str(new_project_id)
            }
        )

        assert response.status_code == 200
        duplicated = response.json()
        assert duplicated["project_id"] == str(new_project_id)

    # ===== Integration tests =====

    def test_default_schema_protection_end_to_end(self, test_client, default_schema):
        """Test complete workflow: attempt edit → blocked → duplicate → edit copy"""
        schema_id = default_schema["id"]

        update_response = test_client.put(f"/api/v1/schemas/{schema_id}", json={"name": "Modified Name"})
        assert update_response.status_code == 400

        duplicate_response = test_client.post(
            f"/api/v1/schemas/{schema_id}/duplicate",
            params={"new_name": "Editable Copy"}
        )
        assert duplicate_response.status_code == 200
        editable_copy = duplicate_response.json()

        update_copy_response = test_client.put(
            f"/api/v1/schemas/{editable_copy['id']}",
            json={"description": "Modified description"}
        )
        assert update_copy_response.status_code == 200

        original_response = test_client.get(f"/api/v1/schemas/{schema_id}")
        assert original_response.status_code == 200
        original = original_response.json()
        assert original["name"] == default_schema["name"]
        assert original["description"] == default_schema["description"]
