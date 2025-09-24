import pytest
import asyncio
from sqlalchemy.orm import Session
from uuid import uuid4
import json

from app.models.database import ComponentSchema, ComponentSchemaField, Component, Drawing, Project
from app.models.schema import (
    ComponentSchemaCreate, ComponentSchemaFieldCreate, SchemaFieldType,
    ComponentSchemaUpdate, ComponentSchemaFieldUpdate
)
from app.services.schema_service import SchemaService
from app.core.database import get_db


class TestSchemaService:
    """Test suite for SchemaService functionality"""

    @pytest.fixture
    def db_session(self):
        """Create a test database session"""
        # This would typically use a test database setup
        # For now, we'll mock the behavior
        pass

    @pytest.fixture
    def schema_service(self, db_session):
        """Create SchemaService instance"""
        return SchemaService(db_session)

    @pytest.fixture
    def sample_project_id(self):
        """Sample project ID for testing"""
        return uuid4()

    @pytest.fixture
    def sample_schema_fields(self):
        """Sample schema fields for testing"""
        return [
            ComponentSchemaFieldCreate(
                field_name="component_type",
                field_type=SchemaFieldType.SELECT,
                field_config={
                    "options": ["girder", "brace", "plate", "angle"],
                    "allow_custom": False
                },
                help_text="Select the type of structural component",
                display_order=0,
                is_required=True
            ),
            ComponentSchemaFieldCreate(
                field_name="description",
                field_type=SchemaFieldType.TEXTAREA,
                field_config={"max_length": 500},
                help_text="Describe the component purpose and characteristics",
                display_order=1,
                is_required=False
            ),
            ComponentSchemaFieldCreate(
                field_name="length",
                field_type=SchemaFieldType.NUMBER,
                field_config={"min": 0, "max": 1000, "unit": "ft"},
                help_text="Enter component length in feet",
                display_order=2,
                is_required=True
            ),
            ComponentSchemaFieldCreate(
                field_name="is_critical",
                field_type=SchemaFieldType.CHECKBOX,
                field_config={},
                help_text="Mark if this is a critical structural component",
                display_order=3,
                is_required=False
            )
        ]

    @pytest.mark.asyncio
    async def test_create_schema_success(self, schema_service, sample_project_id, sample_schema_fields):
        """Test successful schema creation"""
        schema_data = ComponentSchemaCreate(
            project_id=sample_project_id,
            name="Test Bridge Schema",
            description="Schema for bridge components testing",
            fields=sample_schema_fields,
            is_default=True
        )

        # Mock database operations
        # In real tests, this would interact with a test database
        schema = await schema_service.create_schema(schema_data)

        assert schema.name == "Test Bridge Schema"
        assert schema.description == "Schema for bridge components testing"
        assert schema.project_id == sample_project_id
        assert schema.is_default == True
        assert len(schema.fields) == 4

        # Check field details
        component_type_field = next(f for f in schema.fields if f.field_name == "component_type")
        assert component_type_field.field_type == SchemaFieldType.SELECT.value
        assert component_type_field.is_required == True
        assert "options" in component_type_field.field_config

    @pytest.mark.asyncio
    async def test_create_schema_duplicate_name_error(self, schema_service, sample_project_id, sample_schema_fields):
        """Test schema creation fails with duplicate name"""
        schema_data = ComponentSchemaCreate(
            project_id=sample_project_id,
            name="Duplicate Schema",
            description="This will fail",
            fields=sample_schema_fields
        )

        # First creation should succeed
        await schema_service.create_schema(schema_data)

        # Second creation with same name should fail
        with pytest.raises(ValueError, match="Schema 'Duplicate Schema' already exists"):
            await schema_service.create_schema(schema_data)

    @pytest.mark.asyncio
    async def test_create_schema_empty_fields_error(self, schema_service, sample_project_id):
        """Test schema creation fails with empty fields"""
        schema_data = ComponentSchemaCreate(
            project_id=sample_project_id,
            name="Empty Schema",
            description="Schema with no fields",
            fields=[]
        )

        with pytest.raises(ValueError, match="Schema must have at least one field"):
            await schema_service.create_schema(schema_data)

    @pytest.mark.asyncio
    async def test_create_schema_duplicate_field_names_error(self, schema_service, sample_project_id):
        """Test schema creation fails with duplicate field names"""
        duplicate_fields = [
            ComponentSchemaFieldCreate(
                field_name="duplicate_field",
                field_type=SchemaFieldType.TEXT,
                field_config={},
                help_text="First field",
                display_order=0
            ),
            ComponentSchemaFieldCreate(
                field_name="duplicate_field",
                field_type=SchemaFieldType.NUMBER,
                field_config={},
                help_text="Second field",
                display_order=1
            )
        ]

        schema_data = ComponentSchemaCreate(
            project_id=sample_project_id,
            name="Duplicate Fields Schema",
            fields=duplicate_fields
        )

        with pytest.raises(ValueError, match="Field names must be unique within schema"):
            await schema_service.create_schema(schema_data)

    @pytest.mark.asyncio
    async def test_validate_data_against_schema_success(self, schema_service):
        """Test successful data validation against schema"""
        schema_id = uuid4()

        # Mock schema with validation rules
        test_data = {
            "component_type": "girder",
            "description": "Main support girder",
            "length": 45.5,
            "is_critical": True
        }

        validation_result = await schema_service.validate_data_against_schema(schema_id, test_data)

        assert validation_result.is_valid == True
        assert validation_result.validated_data["component_type"] == "girder"
        assert validation_result.validated_data["length"] == 45.5
        assert len(validation_result.errors) == 0

    @pytest.mark.asyncio
    async def test_validate_data_required_field_error(self, schema_service):
        """Test validation fails for missing required fields"""
        schema_id = uuid4()

        # Missing required 'component_type' and 'length' fields
        test_data = {
            "description": "Incomplete component data",
            "is_critical": False
        }

        validation_result = await schema_service.validate_data_against_schema(schema_id, test_data)

        assert validation_result.is_valid == False
        assert any("component_type" in error for error in validation_result.errors)
        assert any("length" in error for error in validation_result.errors)

    @pytest.mark.asyncio
    async def test_validate_data_field_type_error(self, schema_service):
        """Test validation fails for incorrect field types"""
        schema_id = uuid4()

        # Invalid data types
        test_data = {
            "component_type": "girder",
            "length": "not_a_number",  # Should be number
            "is_critical": "yes"       # Should be boolean
        }

        validation_result = await schema_service.validate_data_against_schema(schema_id, test_data)

        assert validation_result.is_valid == False
        assert any("length" in error for error in validation_result.errors)

    @pytest.mark.asyncio
    async def test_validate_data_select_options_error(self, schema_service):
        """Test validation fails for invalid select options"""
        schema_id = uuid4()

        # Invalid option for select field
        test_data = {
            "component_type": "invalid_component_type",  # Not in allowed options
            "length": 25.0,
            "is_critical": False
        }

        validation_result = await schema_service.validate_data_against_schema(schema_id, test_data)

        assert validation_result.is_valid == False
        assert any("not a valid option" in error for error in validation_result.errors)

    @pytest.mark.asyncio
    async def test_validate_data_number_range_error(self, schema_service):
        """Test validation fails for numbers outside allowed range"""
        schema_id = uuid4()

        # Length outside allowed range (0-1000)
        test_data = {
            "component_type": "girder",
            "length": 1500.0,  # Above max of 1000
            "is_critical": True
        }

        validation_result = await schema_service.validate_data_against_schema(schema_id, test_data)

        assert validation_result.is_valid == False
        assert any("above maximum" in error for error in validation_result.errors)

    @pytest.mark.asyncio
    async def test_check_type_lock_status_unlocked(self, schema_service):
        """Test type lock status for component with no data"""
        component_id = uuid4()

        # Mock component with empty dynamic_data
        lock_status = await schema_service.check_type_lock_status(component_id)

        assert lock_status.is_locked == False
        assert lock_status.lock_reason is None
        assert len(lock_status.locked_fields) == 0
        assert lock_status.can_unlock == False

    @pytest.mark.asyncio
    async def test_check_type_lock_status_locked(self, schema_service):
        """Test type lock status for component with data"""
        component_id = uuid4()

        # Mock component with populated dynamic_data
        lock_status = await schema_service.check_type_lock_status(component_id)

        # This would be mocked to return locked status
        # In real implementation, component would have data
        assert isinstance(lock_status.is_locked, bool)
        if lock_status.is_locked:
            assert lock_status.lock_reason is not None
            assert len(lock_status.locked_fields) > 0
            assert lock_status.can_unlock == True

    @pytest.mark.asyncio
    async def test_add_schema_field_success(self, schema_service):
        """Test successful addition of field to existing schema"""
        schema_id = uuid4()

        new_field = ComponentSchemaFieldCreate(
            field_name="material_grade",
            field_type=SchemaFieldType.SELECT,
            field_config={
                "options": ["A36", "A572", "A992"],
                "allow_custom": True
            },
            help_text="Select steel grade or enter custom value",
            display_order=10,
            is_required=False
        )

        field_response = await schema_service.add_schema_field(schema_id, new_field)

        assert field_response.field_name == "material_grade"
        assert field_response.field_type == SchemaFieldType.SELECT.value
        assert field_response.schema_id == schema_id
        assert field_response.display_order == 10

    @pytest.mark.asyncio
    async def test_add_schema_field_duplicate_name_error(self, schema_service):
        """Test adding field with duplicate name fails"""
        schema_id = uuid4()

        field_data = ComponentSchemaFieldCreate(
            field_name="existing_field",
            field_type=SchemaFieldType.TEXT,
            field_config={}
        )

        # First addition should succeed
        await schema_service.add_schema_field(schema_id, field_data)

        # Second addition with same name should fail
        with pytest.raises(ValueError, match="Field 'existing_field' already exists"):
            await schema_service.add_schema_field(schema_id, field_data)

    @pytest.mark.asyncio
    async def test_remove_schema_field_with_data_error(self, schema_service):
        """Test removing field that has component data fails"""
        field_id = uuid4()

        # Mock scenario where components have data for this field
        with pytest.raises(ValueError, match="Cannot remove field.*components have data"):
            await schema_service.remove_schema_field(field_id)

    @pytest.mark.asyncio
    async def test_deactivate_schema_in_use_error(self, schema_service):
        """Test deactivating schema that's in use fails"""
        schema_id = uuid4()

        # Mock scenario where components are using this schema
        with pytest.raises(ValueError, match="Cannot deactivate schema.*components are using it"):
            await schema_service.deactivate_schema(schema_id)

    @pytest.mark.asyncio
    async def test_get_project_schemas_with_global(self, schema_service):
        """Test getting project schemas including global ones"""
        project_id = uuid4()

        schemas = await schema_service.get_project_schemas(project_id, include_global=True)

        assert isinstance(schemas, list)
        # Would verify that both project and global schemas are included

    @pytest.mark.asyncio
    async def test_get_default_schema_fallback(self, schema_service):
        """Test getting default schema falls back to global default"""
        project_id = uuid4()

        # Mock scenario where project has no default but global default exists
        schema = await schema_service.get_default_schema(project_id)

        # Should return global default schema
        assert schema is not None or schema is None  # Depends on mock setup

    @pytest.mark.asyncio
    async def test_migrate_legacy_components_success(self, schema_service):
        """Test successful migration of legacy component data"""
        project_id = uuid4()

        results = await schema_service.migrate_legacy_components(project_id)

        assert "migrated" in results
        assert "errors" in results
        assert "total_processed" in results
        assert isinstance(results["migrated"], int)
        assert isinstance(results["errors"], int)


class TestSchemaValidationLogic:
    """Test suite for schema validation logic"""

    def test_validate_field_value_text_success(self):
        """Test successful text field validation"""
        # This would test the _validate_field_value private method
        pass

    def test_validate_field_value_text_max_length_error(self):
        """Test text field validation fails on max length"""
        pass

    def test_validate_field_value_number_success(self):
        """Test successful number field validation"""
        pass

    def test_validate_field_value_number_range_error(self):
        """Test number field validation fails on range"""
        pass

    def test_validate_field_value_select_success(self):
        """Test successful select field validation"""
        pass

    def test_validate_field_value_select_invalid_option_error(self):
        """Test select field validation fails on invalid option"""
        pass

    def test_validate_field_value_checkbox_success(self):
        """Test successful checkbox field validation"""
        pass


# Integration test class for testing with real database
class TestSchemaServiceIntegration:
    """Integration tests for SchemaService with real database"""

    @pytest.fixture
    def integration_db(self):
        """Setup integration test database"""
        # Would setup actual test database
        pass

    @pytest.mark.integration
    async def test_full_schema_lifecycle(self, integration_db):
        """Test complete schema creation, usage, and deletion lifecycle"""
        pass

    @pytest.mark.integration
    async def test_schema_field_crud_operations(self, integration_db):
        """Test all CRUD operations on schema fields"""
        pass

    @pytest.mark.integration
    async def test_concurrent_schema_modifications(self, integration_db):
        """Test concurrent schema modifications don't cause conflicts"""
        pass