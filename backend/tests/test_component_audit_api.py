"""
API tests for Component Audit Trail endpoints - Story 3.16

Test IDs covered:
- 3.16-API-002: test_get_audit_history_returns_records
- 3.16-API-003: test_audit_history_query_parameters

These tests validate the audit history HTTP endpoint contract.
"""

import pytest
from uuid import uuid4
from fastapi.testclient import TestClient

from app.models.database import (
    Component, Drawing, Project, ComponentSchema, ComponentAuditLog
)
from app.services.audit_service import AuditService


class TestComponentAuditHistoryAPI:
    """API tests for GET /flexible-components/{id}/audit-history endpoint"""

    @pytest.fixture
    def test_project(self, test_db_session):
        """Create a test project"""
        project = Project(
            id=uuid4(),
            name="API Test Project"
        )
        test_db_session.add(project)
        test_db_session.commit()
        test_db_session.refresh(project)
        return project

    @pytest.fixture
    def test_drawing(self, test_db_session, test_project):
        """Create a test drawing"""
        drawing = Drawing(
            id=uuid4(),
            file_name="api_test_drawing.pdf",
            file_path="/uploads/api_test_drawing.pdf",
            project_id=test_project.id
        )
        test_db_session.add(drawing)
        test_db_session.commit()
        test_db_session.refresh(drawing)
        return drawing

    @pytest.fixture
    def schema_x(self, test_db_session, test_project):
        """Create Schema X for API tests"""
        schema = ComponentSchema(
            id=uuid4(),
            name="schema-x",
            description="Test schema X",
            project_id=test_project.id,
            version=1
        )
        test_db_session.add(schema)
        test_db_session.commit()
        test_db_session.refresh(schema)
        return schema

    @pytest.fixture
    def schema_y(self, test_db_session, test_project):
        """Create Schema Y for API tests"""
        schema = ComponentSchema(
            id=uuid4(),
            name="schema-y",
            description="Test schema Y",
            project_id=test_project.id,
            version=1
        )
        test_db_session.add(schema)
        test_db_session.commit()
        test_db_session.refresh(schema)
        return schema

    @pytest.fixture
    def component_with_audit_history(self, test_db_session, test_drawing, schema_x, schema_y):
        """Create a component with audit history"""
        # Create component
        component = Component(
            id=uuid4(),
            drawing_id=test_drawing.id,
            piece_mark="API-TEST-COMP",
            location_x=100.0,
            location_y=200.0,
            schema_id=schema_x.id,
            dynamic_data={"test": "data"}
        )
        test_db_session.add(component)
        test_db_session.commit()
        test_db_session.refresh(component)

        # Create audit history manually (simulating schema changes)
        audit_service = AuditService(test_db_session)

        # First schema change: X -> Y
        session_id_1 = audit_service.create_schema_change_audit(
            component_id=component.id,
            old_schema_id=schema_x.id,
            new_schema_id=schema_y.id,
            old_dynamic_data={"test": "data"},
            changed_by="api-test-user-1"
        )

        # Second schema change: Y -> X
        session_id_2 = audit_service.create_schema_change_audit(
            component_id=component.id,
            old_schema_id=schema_y.id,
            new_schema_id=schema_x.id,
            old_dynamic_data={"updated": "data"},
            changed_by="api-test-user-2"
        )

        test_db_session.commit()

        return {
            "component": component,
            "session_id_1": session_id_1,
            "session_id_2": session_id_2,
            "total_records": 4  # 2 schema changes × 2 records each
        }

    def test_get_audit_history_returns_records(
        self, test_client, component_with_audit_history
    ):
        """
        3.16-API-002: GET /flexible-components/{id}/audit-history returns 200 with array of audit records

        Tests AC14-16: API endpoint contract
        """
        # Arrange
        component_id = component_with_audit_history["component"].id

        # Act
        response = test_client.get(f"/api/v1/flexible-components/{component_id}/audit-history")

        # Assert - HTTP 200 OK
        assert response.status_code == 200, \
            f"Expected 200 OK, got {response.status_code}: {response.text}"

        # Assert - Response is JSON array
        data = response.json()
        assert isinstance(data, list), "Response should be a JSON array"

        # Assert - Contains expected number of records
        assert len(data) == component_with_audit_history["total_records"], \
            f"Expected {component_with_audit_history['total_records']} records"

        # Assert - Records have required fields
        for record in data:
            assert "id" in record
            assert "component_id" in record
            assert "action" in record
            assert "field_name" in record
            assert "old_value" in record
            assert "new_value" in record
            assert "session_id" in record
            assert "timestamp" in record
            assert "changed_by" in record

        # Assert - Records contain both schema_id and dynamic_data field names
        field_names = [record["field_name"] for record in data]
        assert "schema_id" in field_names, "Should include schema_id records"
        assert "dynamic_data" in field_names, "Should include dynamic_data records"

    def test_audit_history_query_parameters(
        self, test_client, component_with_audit_history
    ):
        """
        3.16-API-003: Test session_id filter and limit parameter behavior

        Tests AC15: Query parameter handling for filtering and pagination
        """
        # Arrange
        component_id = component_with_audit_history["component"].id
        session_id_1 = component_with_audit_history["session_id_1"]
        session_id_2 = component_with_audit_history["session_id_2"]

        # Test 1: Filter by session_id (first schema change)
        response_session_1 = test_client.get(
            f"/api/v1/flexible-components/{component_id}/audit-history",
            params={"session_id": session_id_1}
        )

        assert response_session_1.status_code == 200
        data_session_1 = response_session_1.json()
        assert len(data_session_1) == 2, "Should return exactly 2 records for one session"
        assert all(r["session_id"] == session_id_1 for r in data_session_1), \
            "All records should belong to requested session"

        # Test 2: Filter by session_id (second schema change)
        response_session_2 = test_client.get(
            f"/api/v1/flexible-components/{component_id}/audit-history",
            params={"session_id": session_id_2}
        )

        assert response_session_2.status_code == 200
        data_session_2 = response_session_2.json()
        assert len(data_session_2) == 2, "Should return exactly 2 records for second session"
        assert all(r["session_id"] == session_id_2 for r in data_session_2), \
            "All records should belong to second session"

        # Test 3: Limit parameter restricts results
        response_limited = test_client.get(
            f"/api/v1/flexible-components/{component_id}/audit-history",
            params={"limit": 2}
        )

        assert response_limited.status_code == 200
        data_limited = response_limited.json()
        assert len(data_limited) == 2, "Should respect limit parameter"

        # Test 4: Limit=1 returns only most recent record
        response_limit_1 = test_client.get(
            f"/api/v1/flexible-components/{component_id}/audit-history",
            params={"limit": 1}
        )

        assert response_limit_1.status_code == 200
        data_limit_1 = response_limit_1.json()
        assert len(data_limit_1) == 1, "Should return exactly 1 record"

        # Most recent record should be from session_id_2 (second schema change)
        assert data_limit_1[0]["session_id"] == session_id_2, \
            "Most recent record should be from second schema change"

        # Test 5: Large limit returns all records
        response_large_limit = test_client.get(
            f"/api/v1/flexible-components/{component_id}/audit-history",
            params={"limit": 100}
        )

        assert response_large_limit.status_code == 200
        data_large_limit = response_large_limit.json()
        assert len(data_large_limit) == component_with_audit_history["total_records"], \
            "Large limit should return all available records"

    def test_audit_history_for_nonexistent_component(self, test_client):
        """
        Bonus test: Verify 404 response for non-existent component

        While not explicitly P0, this test validates proper error handling
        """
        # Arrange
        non_existent_id = uuid4()

        # Act
        response = test_client.get(
            f"/api/v1/flexible-components/{non_existent_id}/audit-history"
        )

        # Assert - Should return 404 or empty array (depending on implementation)
        # Current implementation likely returns empty array for non-existent components
        assert response.status_code in [200, 404], \
            "Should return 200 (empty array) or 404 for non-existent component"

        if response.status_code == 200:
            data = response.json()
            assert len(data) == 0, "Should return empty array for non-existent component"

    def test_audit_history_default_limit(self, test_client, test_drawing, test_db_session):
        """
        Bonus test: Verify default limit parameter (100 records)

        Tests that endpoint has reasonable default to prevent excessive data transfer
        """
        # Arrange - Create component with many audit records
        from app.models.database import ComponentSchema, Project
        project = Project(id=uuid4(), name="Limit Test")
        test_db_session.add(project)
        test_db_session.commit()

        schema = ComponentSchema(
            id=uuid4(),
            name="test-schema",
            project_id=project.id,
            version=1
        )
        test_db_session.add(schema)
        test_db_session.commit()

        component = Component(
            id=uuid4(),
            drawing_id=test_drawing.id,
            piece_mark="LIMIT-TEST",
            location_x=0.0,
            location_y=0.0,
            schema_id=schema.id,
            dynamic_data={}
        )
        test_db_session.add(component)
        test_db_session.commit()

        # Create 60 schema changes (120 audit records total)
        audit_service = AuditService(test_db_session)
        for i in range(60):
            audit_service.create_schema_change_audit(
                component_id=component.id,
                old_schema_id=schema.id,
                new_schema_id=uuid4(),
                old_dynamic_data={"iteration": i}
            )
        test_db_session.commit()

        # Act - Request without limit parameter
        response = test_client.get(
            f"/api/v1/flexible-components/{component.id}/audit-history"
        )

        # Assert
        assert response.status_code == 200
        data = response.json()

        # Default limit should be 100 (per AC15)
        assert len(data) == 100, \
            "Default limit should be 100 records to prevent excessive data transfer"


class TestComponentAuditAPIErrorCases:
    """Test error handling and edge cases for audit API"""

    def test_invalid_uuid_format_returns_422(self, test_client):
        """Verify 422 Unprocessable Entity for invalid UUID format"""
        # Act
        response = test_client.get(
            "/api/v1/flexible-components/not-a-valid-uuid/audit-history"
        )

        # Assert - Should return 422 for invalid UUID format
        assert response.status_code == 422, \
            "Should return 422 for malformed UUID"

    def test_invalid_limit_parameter_returns_422(self, test_client):
        """Verify 422 for invalid limit parameter (negative, non-integer)"""
        component_id = uuid4()

        # Test negative limit
        response_negative = test_client.get(
            f"/api/v1/flexible-components/{component_id}/audit-history",
            params={"limit": -1}
        )
        assert response_negative.status_code == 422, \
            "Should reject negative limit"

        # Test limit=0
        response_zero = test_client.get(
            f"/api/v1/flexible-components/{component_id}/audit-history",
            params={"limit": 0}
        )
        assert response_zero.status_code == 422, \
            "Should reject zero limit"

        # Test limit > 500 (max allowed per AC15)
        response_excessive = test_client.get(
            f"/api/v1/flexible-components/{component_id}/audit-history",
            params={"limit": 501}
        )
        assert response_excessive.status_code == 422, \
            "Should reject limit > 500"
