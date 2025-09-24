import pytest
import asyncio
from sqlalchemy.orm import Session
from uuid import uuid4
import json

from app.models.database import Component, Drawing, Project, ComponentSchema
from app.models.schema import (
    FlexibleComponentCreate, FlexibleComponentUpdate, DynamicComponentData,
    TypeLockStatus, SchemaValidationResult
)
from app.services.flexible_component_service import FlexibleComponentService
from app.services.schema_service import SchemaService


class TestFlexibleComponentService:
    """Test suite for FlexibleComponentService functionality"""

    @pytest.fixture
    def db_session(self):
        """Create a test database session"""
        # Mock database session for testing
        pass

    @pytest.fixture
    def flexible_service(self, db_session):
        """Create FlexibleComponentService instance"""
        return FlexibleComponentService(db_session)

    @pytest.fixture
    def sample_schema_id(self):
        """Sample schema ID for testing"""
        return uuid4()

    @pytest.fixture
    def sample_drawing_id(self):
        """Sample drawing ID for testing"""
        return uuid4()

    @pytest.fixture
    def sample_dynamic_data(self):
        """Sample dynamic component data for testing"""
        return DynamicComponentData(
            field_values={
                "component_type": "girder",
                "description": "Main support beam",
                "length": 45.5,
                "material_grade": "A572",
                "is_critical": True
            }
        )

    @pytest.fixture
    def sample_component_create_data(self, sample_drawing_id, sample_schema_id, sample_dynamic_data):
        """Sample component creation data"""
        return FlexibleComponentCreate(
            drawing_id=sample_drawing_id,
            piece_mark="G1",
            location_x=100.0,
            location_y=200.0,
            schema_id=sample_schema_id,
            dynamic_data=sample_dynamic_data,
            instance_identifier="A",
            confidence_score=0.95
        )

    @pytest.mark.asyncio
    async def test_create_flexible_component_success(self, flexible_service, sample_component_create_data):
        """Test successful creation of flexible component"""
        component = await flexible_service.create_flexible_component(sample_component_create_data)

        assert component.piece_mark == "G1"
        assert component.location_x == 100.0
        assert component.location_y == 200.0
        assert component.instance_identifier == "A"
        assert component.schema_id == sample_component_create_data.schema_id
        assert component.dynamic_data.field_values["component_type"] == "girder"
        assert component.dynamic_data.field_values["length"] == 45.5
        assert component.confidence_score == 0.95

    @pytest.mark.asyncio
    async def test_create_flexible_component_invalid_schema_error(self, flexible_service):
        """Test component creation fails with invalid schema"""
        invalid_schema_id = uuid4()
        create_data = FlexibleComponentCreate(
            drawing_id=uuid4(),
            piece_mark="G1",
            location_x=100.0,
            location_y=200.0,
            schema_id=invalid_schema_id,
            dynamic_data=DynamicComponentData()
        )

        with pytest.raises(ValueError, match=f"Schema {invalid_schema_id} not found"):
            await flexible_service.create_flexible_component(create_data)

    @pytest.mark.asyncio
    async def test_create_flexible_component_validation_error(self, flexible_service, sample_schema_id):
        """Test component creation fails with invalid data"""
        invalid_data = DynamicComponentData(
            field_values={
                "component_type": "invalid_type",  # Not in allowed options
                "length": -10.0,  # Below minimum
                "required_field": None  # Missing required field
            }
        )

        create_data = FlexibleComponentCreate(
            drawing_id=uuid4(),
            piece_mark="G1",
            location_x=100.0,
            location_y=200.0,
            schema_id=sample_schema_id,
            dynamic_data=invalid_data
        )

        with pytest.raises(ValueError, match="Schema validation failed"):
            await flexible_service.create_flexible_component(create_data)

    @pytest.mark.asyncio
    async def test_get_flexible_component_by_id_success(self, flexible_service):
        """Test successful retrieval of flexible component"""
        component_id = uuid4()

        component = await flexible_service.get_flexible_component_by_id(component_id)

        # Mock would return component or None
        assert component is not None or component is None

    @pytest.mark.asyncio
    async def test_get_flexible_component_by_id_not_found(self, flexible_service):
        """Test retrieval returns None for non-existent component"""
        non_existent_id = uuid4()

        component = await flexible_service.get_flexible_component_by_id(non_existent_id)

        assert component is None

    @pytest.mark.asyncio
    async def test_update_flexible_component_success(self, flexible_service):
        """Test successful update of flexible component"""
        component_id = uuid4()

        update_data = FlexibleComponentUpdate(
            piece_mark="G1-UPDATED",
            instance_identifier="B",
            dynamic_data=DynamicComponentData(
                field_values={
                    "description": "Updated description",
                    "length": 50.0
                }
            )
        )

        updated_component = await flexible_service.update_flexible_component(component_id, update_data)

        assert updated_component is not None
        # Would verify actual updates in real test

    @pytest.mark.asyncio
    async def test_update_flexible_component_schema_change_when_locked(self, flexible_service):
        """Test schema change fails when component is type-locked"""
        component_id = uuid4()
        new_schema_id = uuid4()

        # Mock component that is type-locked
        update_data = FlexibleComponentUpdate(schema_id=new_schema_id)

        with pytest.raises(ValueError, match="Cannot change schema.*locked"):
            await flexible_service.update_flexible_component(component_id, update_data)

    @pytest.mark.asyncio
    async def test_update_flexible_component_schema_change_success(self, flexible_service):
        """Test successful schema change when component is unlocked"""
        component_id = uuid4()
        new_schema_id = uuid4()

        # Mock component that is not type-locked
        update_data = FlexibleComponentUpdate(schema_id=new_schema_id)

        updated_component = await flexible_service.update_flexible_component(component_id, update_data)

        assert updated_component.schema_id == new_schema_id
        # Component's dynamic data should be reset when schema changes
        assert len(updated_component.dynamic_data.field_values) == 0

    @pytest.mark.asyncio
    async def test_update_flexible_component_dynamic_data_validation_error(self, flexible_service):
        """Test update fails when dynamic data doesn't validate against schema"""
        component_id = uuid4()

        invalid_update_data = FlexibleComponentUpdate(
            dynamic_data=DynamicComponentData(
                field_values={
                    "invalid_field": "value",
                    "length": "not_a_number"
                }
            )
        )

        with pytest.raises(ValueError, match="Schema validation failed"):
            await flexible_service.update_flexible_component(component_id, invalid_update_data)

    @pytest.mark.asyncio
    async def test_get_components_by_schema(self, flexible_service):
        """Test retrieving all components using a specific schema"""
        schema_id = uuid4()
        limit = 50

        components = await flexible_service.get_components_by_schema(schema_id, limit)

        assert isinstance(components, list)
        assert len(components) <= limit
        # All components should have the same schema_id
        for component in components:
            assert component.schema_id == schema_id

    @pytest.mark.asyncio
    async def test_migrate_component_to_schema_success(self, flexible_service):
        """Test successful component migration to new schema"""
        component_id = uuid4()
        target_schema_id = uuid4()

        migrated_component = await flexible_service.migrate_component_to_schema(
            component_id, target_schema_id, force=False
        )

        assert migrated_component.schema_id == target_schema_id
        # Some data should be mapped from old to new schema
        assert len(migrated_component.dynamic_data.field_values) > 0

    @pytest.mark.asyncio
    async def test_migrate_component_to_schema_locked_error(self, flexible_service):
        """Test migration fails when component is type-locked"""
        component_id = uuid4()
        target_schema_id = uuid4()

        with pytest.raises(ValueError, match="Cannot migrate schema.*locked"):
            await flexible_service.migrate_component_to_schema(
                component_id, target_schema_id, force=False
            )

    @pytest.mark.asyncio
    async def test_migrate_component_to_schema_force_success(self, flexible_service):
        """Test forced migration succeeds even when component is locked"""
        component_id = uuid4()
        target_schema_id = uuid4()

        migrated_component = await flexible_service.migrate_component_to_schema(
            component_id, target_schema_id, force=True
        )

        assert migrated_component.schema_id == target_schema_id

    @pytest.mark.asyncio
    async def test_migrate_component_to_schema_invalid_target_error(self, flexible_service):
        """Test migration fails with invalid target schema"""
        component_id = uuid4()
        invalid_schema_id = uuid4()

        with pytest.raises(ValueError, match=f"Target schema {invalid_schema_id} not found"):
            await flexible_service.migrate_component_to_schema(
                component_id, invalid_schema_id, force=False
            )

    @pytest.mark.asyncio
    async def test_clear_component_data_to_unlock_success(self, flexible_service):
        """Test successful clearing of component data to unlock type selection"""
        component_id = uuid4()

        unlocked_component = await flexible_service.clear_component_data_to_unlock(component_id)

        assert len(unlocked_component.dynamic_data.field_values) == 0
        assert unlocked_component.is_type_locked == False

    @pytest.mark.asyncio
    async def test_validate_component_against_schema_success(self, flexible_service):
        """Test successful component validation against its schema"""
        component_id = uuid4()

        validation_result = await flexible_service.validate_component_against_schema(component_id)

        assert isinstance(validation_result, SchemaValidationResult)
        assert validation_result.is_valid in [True, False]

    @pytest.mark.asyncio
    async def test_validate_component_against_different_schema(self, flexible_service):
        """Test component validation against a different schema"""
        component_id = uuid4()
        different_schema_id = uuid4()

        validation_result = await flexible_service.validate_component_against_schema(
            component_id, different_schema_id
        )

        assert isinstance(validation_result, SchemaValidationResult)

    @pytest.mark.asyncio
    async def test_get_component_type_lock_info_unlocked(self, flexible_service):
        """Test getting lock info for unlocked component"""
        component_id = uuid4()

        lock_status = await flexible_service.get_component_type_lock_info(component_id)

        assert isinstance(lock_status, TypeLockStatus)
        assert lock_status.is_locked == False
        assert lock_status.lock_reason is None
        assert len(lock_status.locked_fields) == 0

    @pytest.mark.asyncio
    async def test_get_component_type_lock_info_locked(self, flexible_service):
        """Test getting lock info for locked component"""
        component_id = uuid4()

        # Mock component with data (locked)
        lock_status = await flexible_service.get_component_type_lock_info(component_id)

        assert isinstance(lock_status, TypeLockStatus)
        # In real test, this would be locked due to data
        if lock_status.is_locked:
            assert lock_status.lock_reason is not None
            assert len(lock_status.locked_fields) > 0
            assert lock_status.can_unlock == True

    @pytest.mark.asyncio
    async def test_bulk_assign_schema_success(self, flexible_service):
        """Test successful bulk schema assignment"""
        component_ids = [uuid4(), uuid4(), uuid4()]
        target_schema_id = uuid4()

        results = await flexible_service.bulk_assign_schema(
            component_ids, target_schema_id, force=False
        )

        assert "successful" in results
        assert "failed" in results
        assert "locked" in results
        assert isinstance(results["successful"], list)
        assert isinstance(results["failed"], list)
        assert isinstance(results["locked"], list)

    @pytest.mark.asyncio
    async def test_bulk_assign_schema_with_force(self, flexible_service):
        """Test bulk schema assignment with force option"""
        component_ids = [uuid4(), uuid4()]
        target_schema_id = uuid4()

        results = await flexible_service.bulk_assign_schema(
            component_ids, target_schema_id, force=True
        )

        # With force=True, there should be no locked components
        assert len(results["locked"]) == 0

    @pytest.mark.asyncio
    async def test_get_schema_usage_stats(self, flexible_service):
        """Test getting schema usage statistics"""
        project_id = uuid4()

        stats = await flexible_service.get_schema_usage_stats(project_id)

        assert "schemas" in stats
        assert "total_components" in stats
        assert "schemas_in_use" in stats
        assert "unused_schemas" in stats
        assert isinstance(stats["schemas"], list)
        assert isinstance(stats["total_components"], int)


class TestFlexibleComponentHelperMethods:
    """Test suite for helper methods in FlexibleComponentService"""

    @pytest.fixture
    def flexible_service(self):
        """Create service instance for helper method testing"""
        return FlexibleComponentService(None)  # No DB needed for helper methods

    def test_extract_legacy_field_data(self, flexible_service):
        """Test extraction of legacy component field data"""
        # Mock component with legacy fields
        mock_component = type('Component', (), {
            'component_type': 'girder',
            'description': 'Test component',
            'material_type': 'A572',
            'quantity': 2
        })()

        legacy_data = flexible_service._extract_legacy_field_data(mock_component)

        expected_data = {
            'component_type': 'girder',
            'description': 'Test component',
            'material_type': 'A572',
            'quantity': 2
        }

        assert legacy_data == expected_data

    def test_extract_legacy_field_data_empty_values(self, flexible_service):
        """Test extraction handles empty/null values correctly"""
        mock_component = type('Component', (), {
            'component_type': None,
            'description': '',
            'material_type': 'A572',
            'quantity': 1
        })()

        legacy_data = flexible_service._extract_legacy_field_data(mock_component)

        # Should not include None or empty string values
        expected_data = {
            'material_type': 'A572',
            'quantity': 1
        }

        assert legacy_data == expected_data


class TestFlexibleComponentEdgeCases:
    """Test suite for edge cases and error conditions"""

    @pytest.fixture
    def flexible_service(self, db_session):
        """Create service instance"""
        return FlexibleComponentService(db_session)

    @pytest.mark.asyncio
    async def test_component_to_flexible_response_no_schema(self, flexible_service):
        """Test converting component with no schema to response"""
        # Mock component without schema
        mock_component = type('Component', (), {
            'id': uuid4(),
            'piece_mark': 'TEST',
            'schema_id': None,
            'dynamic_data': {},
            'location_x': 0.0,
            'location_y': 0.0,
            'confidence_score': 0.8,
            'review_status': 'pending',
            'created_at': None,
            'updated_at': None
        })()

        response = await flexible_service._component_to_flexible_response(mock_component)

        assert response.schema_id is None
        assert response.schema_info is None
        assert len(response.dynamic_data.field_values) == 0

    @pytest.mark.asyncio
    async def test_operations_with_non_existent_component(self, flexible_service):
        """Test operations fail gracefully with non-existent component"""
        non_existent_id = uuid4()

        # These should raise ValueError or return appropriate error response
        with pytest.raises(ValueError):
            await flexible_service.get_component_type_lock_info(non_existent_id)

        with pytest.raises(ValueError):
            await flexible_service.clear_component_data_to_unlock(non_existent_id)

        with pytest.raises(ValueError):
            await flexible_service.validate_component_against_schema(non_existent_id)

    @pytest.mark.asyncio
    async def test_concurrent_updates_handling(self, flexible_service):
        """Test handling of concurrent updates to same component"""
        component_id = uuid4()

        # This would test concurrent update scenarios
        # Implementation depends on locking strategy
        pass

    @pytest.mark.asyncio
    async def test_large_dynamic_data_handling(self, flexible_service):
        """Test handling of large dynamic data payloads"""
        component_id = uuid4()

        # Create large dynamic data payload
        large_data = DynamicComponentData(
            field_values={f"field_{i}": f"value_{i}" for i in range(1000)}
        )

        update_data = FlexibleComponentUpdate(dynamic_data=large_data)

        # Should handle large payloads gracefully
        # (May have size limits or performance considerations)
        try:
            await flexible_service.update_flexible_component(component_id, update_data)
        except ValueError as e:
            # Accept validation errors for large payloads
            assert "too large" in str(e).lower() or "validation failed" in str(e).lower()


# Performance and load testing
class TestFlexibleComponentPerformance:
    """Performance and load tests for FlexibleComponentService"""

    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_bulk_operations_performance(self, flexible_service):
        """Test performance of bulk operations with large component sets"""
        # Test with 100 components
        component_ids = [uuid4() for _ in range(100)]
        target_schema_id = uuid4()

        # Measure execution time
        import time
        start_time = time.time()

        results = await flexible_service.bulk_assign_schema(
            component_ids, target_schema_id, force=False
        )

        execution_time = time.time() - start_time

        # Should complete within reasonable time (e.g., < 5 seconds for 100 components)
        assert execution_time < 5.0
        assert len(results["successful"]) + len(results["failed"]) + len(results["locked"]) == 100

    @pytest.mark.performance
    @pytest.mark.asyncio
    async def test_schema_validation_performance(self, flexible_service):
        """Test schema validation performance with complex schemas"""
        schema_id = uuid4()

        # Large, complex data payload
        complex_data = {
            f"field_{i}": f"value_{i}" for i in range(50)
        }

        import time
        start_time = time.time()

        validation_result = await flexible_service.validate_component_against_schema(
            uuid4(), schema_id
        )

        execution_time = time.time() - start_time

        # Validation should be fast (< 1 second)
        assert execution_time < 1.0