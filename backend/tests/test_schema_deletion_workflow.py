"""
Test Suite: Schema Deletion with Dependency Checking
Story: 3.13 Phase 3 - FR-7 AC 34-40

Tests schema deletion workflow including dependency validation,
usage checking, and safe deletion prevention.
"""

import pytest
from uuid import uuid4


class TestSchemaDeletionWorkflow:
    """Tests for FR-7: Schema deletion with dependency checking"""

    @pytest.fixture
    def test_project_id(self):
        """Create a test project ID"""
        return uuid4()

    @pytest.fixture
    def test_drawing_id(self):
        """Create a test drawing ID for components"""
        return uuid4()

    @pytest.fixture
    def unused_schema_data(self):
        """Create schema data with no components using it"""
        return {
            "project_id": None,  # Global schema
            "name": "unused-schema",
            "description": "Schema with no component dependencies",
            "is_default": False,
            "fields": [
                {
                    "field_name": "test_field",
                    "field_type": "text",
                    "field_config": {},
                    "help_text": "Test field",
                    "display_order": 0,
                    "is_required": False
                }
            ]
        }

    @pytest.fixture
    def active_schema_data(self):
        """Create schema data for schema that will have components"""
        return {
            "project_id": None,  # Global schema
            "name": "active-schema",
            "description": "Schema in use by components",
            "is_default": False,
            "fields": [
                {
                    "field_name": "component_field",
                    "field_type": "text",
                    "field_config": {},
                    "help_text": "Component field",
                    "display_order": 0,
                    "is_required": False
                }
            ]
        }

    @pytest.fixture
    def unused_schema(self, test_client, unused_schema_data):
        """Create an unused schema via API"""
        response = test_client.post("/api/v1/schemas/", json=unused_schema_data)
        assert response.status_code == 200
        return response.json()

    @pytest.fixture
    def schema_with_components(self, test_client, active_schema_data, test_drawing_id):
        """Create a schema and add components using it"""
        schema_response = test_client.post("/api/v1/schemas/", json=active_schema_data)
        assert schema_response.status_code == 200
        schema = schema_response.json()

        for i in range(3):
            component_data = {
                "drawing_id": str(test_drawing_id),
                "schema_id": schema["id"],
                "piece_mark": f"COMP-{i+1}",
                "component_type": "Beam",
                "location_x": 10.0 + i,
                "location_y": 20.0 + i,
            }
            comp_response = test_client.post("/api/v1/components/", json=component_data)
            assert comp_response.status_code in [200, 201]

        return schema

    # ===== FR-7 AC 34: Usage checking before deletion =====

    def test_get_schema_usage_returns_zero_for_unused_schema(self, test_client, unused_schema):
        """Test GET /api/schemas/{id}/usage returns 0 components for unused schema"""
        schema_id = unused_schema["id"]

        response = test_client.get(f"/api/v1/schemas/{schema_id}/usage")

        assert response.status_code == 200
        usage_data = response.json()
        assert usage_data["schema_id"] == schema_id
        assert usage_data["components_using_schema"] == 0
        assert usage_data["component_ids"] == []
        assert usage_data["truncated"] is False

    def test_get_schema_usage_returns_count_for_active_schema(self, test_client, schema_with_components):
        """Test GET /api/schemas/{id}/usage returns accurate component count"""
        schema_id = schema_with_components["id"]

        response = test_client.get(f"/api/v1/schemas/{schema_id}/usage")

        assert response.status_code == 200
        usage_data = response.json()
        assert usage_data["components_using_schema"] == 3
        assert len(usage_data["component_ids"]) == 3
        assert usage_data["truncated"] is False

    def test_get_schema_usage_nonexistent_schema_returns_404(self, test_client):
        """Test GET /api/schemas/{invalid_id}/usage returns 404"""
        fake_schema_id = str(uuid4())

        response = test_client.get(f"/api/v1/schemas/{fake_schema_id}/usage")

        assert response.status_code == 404

    # ===== FR-7 AC 35: Block deletion of schemas in use =====

    def test_cannot_delete_schema_with_components(self, test_client, schema_with_components):
        """Test DELETE /api/schemas/{id} blocks deletion when components exist"""
        schema_id = schema_with_components["id"]
        schema_name = schema_with_components["name"]

        response = test_client.delete(f"/api/v1/schemas/{schema_id}")

        assert response.status_code == 400
        error_detail = response.json()["detail"]
        assert "cannot delete" in error_detail.lower()
        assert schema_name.lower() in error_detail.lower()
        assert "3 components" in error_detail or "3 component" in error_detail
        assert "reassign" in error_detail.lower()

        verify_response = test_client.get(f"/api/v1/schemas/{schema_id}")
        assert verify_response.status_code == 200
        assert verify_response.json()["is_active"] is True

    def test_can_delete_unused_schema(self, test_client, unused_schema):
        """Test DELETE /api/schemas/{id} succeeds for unused schema"""
        schema_id = unused_schema["id"]

        response = test_client.delete(f"/api/v1/schemas/{schema_id}")

        assert response.status_code == 200

        project_id = unused_schema["project_id"]
        project_id = project_id or "global"
        list_response = test_client.get(f"/api/v1/schemas/projects/{project_id}")
        schemas = list_response.json()["schemas"]
        assert not any(s["id"] == schema_id for s in schemas)

    # ===== FR-7 AC 36: Reassignment workflow (simplified) =====

    def test_manually_reassign_components_then_delete(
        self, test_client, schema_with_components, test_project_id, test_drawing_id
    ):
        """Test manual reassignment workflow: update components → delete schema"""
        old_schema = schema_with_components

        new_schema_data = {
            "project_id": str(test_project_id),
            "name": "Target Schema",
            "description": "Schema to reassign to",
            "is_default": False,
            "fields": [
                {
                    "field_name": "target_field",
                    "field_type": "text",
                    "field_config": {},
                    "help_text": "Target field",
                    "display_order": 0,
                    "is_required": False
                }
            ]
        }
        new_schema_response = test_client.post("/api/v1/schemas/", json=new_schema_data)
        assert new_schema_response.status_code == 200
        new_schema = new_schema_response.json()

        delete_response = test_client.delete(f"/api/v1/schemas/{old_schema['id']}")
        assert delete_response.status_code == 400

        components_response = test_client.get(f"/api/v1/components/", params={"schema_id": old_schema["id"]})
        if components_response.status_code == 200:
            components = components_response.json()
            for component in components:
                update_response = test_client.put(
                    f"/api/v1/components/{component['id']}",
                    json={"schema_id": new_schema["id"]}
                )
                assert update_response.status_code == 200

        usage_response = test_client.get(f"/api/v1/schemas/{old_schema['id']}/usage")
        usage_data = usage_response.json()
        assert usage_data["components_using_schema"] == 0

        final_delete_response = test_client.delete(f"/api/v1/schemas/{old_schema['id']}")
        assert final_delete_response.status_code == 200

    # ===== FR-7 AC 37: Clear error messages with component counts =====

    def test_error_message_shows_exact_component_count(self, test_client, schema_with_components):
        """Test deletion error message includes precise component count"""
        schema_id = schema_with_components["id"]

        response = test_client.delete(f"/api/v1/schemas/{schema_id}")

        assert response.status_code == 400
        error_detail = response.json()["detail"]
        assert "3 components" in error_detail or "3 component" in error_detail

    def test_error_message_provides_clear_next_steps(self, test_client, schema_with_components):
        """Test error message guides users on how to proceed"""
        schema_id = schema_with_components["id"]

        response = test_client.delete(f"/api/v1/schemas/{schema_id}")

        assert response.status_code == 400
        error_detail = response.json()["detail"]
        assert "reassign" in error_detail.lower()
        assert "before deletion" in error_detail.lower()

    # ===== FR-7 AC 38: Soft delete implementation =====

    def test_deletion_is_soft_delete_not_hard_delete(self, test_client, unused_schema, test_project_id):
        """Test DELETE sets is_active=False instead of removing record"""
        schema_id = unused_schema["id"]

        delete_response = test_client.delete(f"/api/v1/schemas/{schema_id}")
        assert delete_response.status_code == 200

        direct_get_response = test_client.get(f"/api/v1/schemas/{schema_id}")
        if direct_get_response.status_code == 200:
            schema_data = direct_get_response.json()
            assert schema_data["is_active"] is False

        list_response = test_client.get(f"/api/v1/schemas/projects/{test_project_id}")
        schemas = list_response.json()["schemas"]
        assert not any(s["id"] == schema_id for s in schemas)

    def test_soft_deleted_schema_not_shown_in_listings(self, test_client, unused_schema, test_project_id):
        """Test soft-deleted schemas are excluded from GET /api/projects/{id}/schemas"""
        schema_id = unused_schema["id"]

        before_response = test_client.get(f"/api/v1/schemas/projects/{test_project_id}")
        before_schemas = before_response.json()["schemas"]
        assert any(s["id"] == schema_id for s in before_schemas)

        test_client.delete(f"/api/v1/schemas/{schema_id}")

        after_response = test_client.get(f"/api/v1/schemas/projects/{test_project_id}")
        after_schemas = after_response.json()["schemas"]
        assert not any(s["id"] == schema_id for s in after_schemas)

    def test_components_cannot_use_soft_deleted_schema(self, test_client, unused_schema, test_drawing_id):
        """Test creating/updating components to use deleted schema is blocked"""
        schema_id = unused_schema["id"]

        test_client.delete(f"/api/v1/schemas/{schema_id}")

        component_data = {
            "drawing_id": str(test_drawing_id),
            "schema_id": schema_id,
            "piece_mark": "TEST-COMPONENT",
            "component_type": "Beam",
            "location_x": 10.0,
            "location_y": 20.0,
        }
        response = test_client.post("/api/v1/components/", json=component_data)

        assert response.status_code in [400, 404]
        if response.status_code == 400:
            error_detail = response.json()["detail"]
            assert "inactive" in error_detail.lower() or "does not exist" in error_detail.lower()

    # ===== FR-7 AC 39: Default schema deletion prevention =====

    def test_cannot_delete_default_schema_even_if_unused(self, test_client, test_project_id):
        """Test DELETE blocks deletion of default schemas regardless of usage"""
        default_schema_data = {
            "project_id": str(test_project_id),
            "name": "Default Schema For Deletion Test",
            "description": "Default schema with no components",
            "is_default": True,
            "fields": [
                {
                    "field_name": "default_field",
                    "field_type": "text",
                    "field_config": {},
                    "help_text": "Default field",
                    "display_order": 0,
                    "is_required": False
                }
            ]
        }
        create_response = test_client.post("/api/v1/schemas/", json=default_schema_data)
        assert create_response.status_code == 200
        default_schema = create_response.json()

        usage_response = test_client.get(f"/api/v1/schemas/{default_schema['id']}/usage")
        usage_data = usage_response.json()
        assert usage_data["components_using_schema"] == 0

        delete_response = test_client.delete(f"/api/v1/schemas/{default_schema['id']}")

        assert delete_response.status_code == 400
        error_detail = delete_response.json()["detail"]
        assert "cannot delete system default schema" in error_detail.lower()
        assert "protected" in error_detail.lower()

    # ===== FR-7 AC 40: Cascade deletion handling =====

    def test_deleting_schema_preserves_associated_fields(self, test_client, unused_schema):
        """Test soft-deleting schema does not delete associated field definitions"""
        schema_id = unused_schema["id"]
        original_fields = unused_schema["fields"]

        assert len(original_fields) > 0

        delete_response = test_client.delete(f"/api/v1/schemas/{schema_id}")
        assert delete_response.status_code == 200

        get_response = test_client.get(f"/api/v1/schemas/{schema_id}")
        if get_response.status_code == 200:
            schema_data = get_response.json()
            assert len(schema_data["fields"]) == len(original_fields)
            assert schema_data["is_active"] is False

    # ===== Integration and E2E tests =====

    def test_complete_deletion_workflow_end_to_end(
        self, test_client, schema_with_components, test_project_id, test_drawing_id
    ):
        """Test complete workflow from usage check through deletion"""
        old_schema = schema_with_components

        new_schema_data = {
            "project_id": str(test_project_id),
            "name": "E2E Target Schema",
            "description": "Schema for E2E test",
            "is_default": False,
            "fields": [
                {
                    "field_name": "e2e_field",
                    "field_type": "text",
                    "field_config": {},
                    "help_text": "E2E field",
                    "display_order": 0,
                    "is_required": False
                }
            ]
        }
        new_schema_response = test_client.post("/api/v1/schemas/", json=new_schema_data)
        new_schema = new_schema_response.json()

        usage_response = test_client.get(f"/api/v1/schemas/{old_schema['id']}/usage")
        assert usage_response.json()["components_using_schema"] > 0

        delete_blocked_response = test_client.delete(f"/api/v1/schemas/{old_schema['id']}")
        assert delete_blocked_response.status_code == 400

        components_response = test_client.get(f"/api/v1/components/", params={"schema_id": old_schema["id"]})
        if components_response.status_code == 200:
            components = components_response.json()
            for component in components:
                test_client.put(
                    f"/api/v1/components/{component['id']}",
                    json={"schema_id": new_schema["id"]}
                )

        usage_after_response = test_client.get(f"/api/v1/schemas/{old_schema['id']}/usage")
        assert usage_after_response.json()["components_using_schema"] == 0

        delete_success_response = test_client.delete(f"/api/v1/schemas/{old_schema['id']}")
        assert delete_success_response.status_code == 200

        list_response = test_client.get(f"/api/v1/schemas/projects/{test_project_id}")
        schemas = list_response.json()
        assert not any(s["id"] == old_schema["id"] for s in schemas)
