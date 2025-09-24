from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, asc
from uuid import UUID
import json

from app.models.database import ComponentSchema, ComponentSchemaField, Component, Drawing, Project
from app.models.schema import (
    ComponentSchemaCreate, ComponentSchemaUpdate, ComponentSchemaResponse,
    ComponentSchemaFieldCreate, ComponentSchemaFieldUpdate, ComponentSchemaFieldResponse,
    SchemaValidationResult, TypeLockStatus, DynamicComponentData
)

class SchemaService:
    """Service for managing component schemas and schema fields"""

    def __init__(self, db: Session):
        self.db = db

    # Schema CRUD Operations
    async def create_schema(self, schema_data: ComponentSchemaCreate) -> ComponentSchemaResponse:
        """Create a new component schema with fields"""
        try:
            # Validate project exists if project_id provided
            if schema_data.project_id:
                project = self.db.query(Project).filter(Project.id == schema_data.project_id).first()
                if not project:
                    raise ValueError(f"Project {schema_data.project_id} not found")

            # Check for duplicate schema name within project
            existing = self.db.query(ComponentSchema).filter(
                and_(
                    ComponentSchema.project_id == schema_data.project_id,
                    ComponentSchema.name == schema_data.name,
                    ComponentSchema.is_active == True
                )
            ).first()

            if existing:
                raise ValueError(f"Schema '{schema_data.name}' already exists in this project")

            # Create schema
            schema_definition = {
                'version': '1.0',
                'fields': [field.dict() for field in schema_data.fields]
            }

            db_schema = ComponentSchema(
                project_id=schema_data.project_id,
                name=schema_data.name,
                description=schema_data.description,
                schema_definition=schema_definition,
                is_default=schema_data.is_default,
                is_active=schema_data.is_active,
                created_by='api_user'  # TODO: Replace with actual user context
            )

            self.db.add(db_schema)
            self.db.flush()  # Get the ID

            # Create schema fields
            for field_data in schema_data.fields:
                db_field = ComponentSchemaField(
                    schema_id=db_schema.id,
                    field_name=field_data.field_name,
                    field_type=field_data.field_type.value,
                    field_config=field_data.field_config,
                    help_text=field_data.help_text,
                    display_order=field_data.display_order,
                    is_required=field_data.is_required,
                    is_active=field_data.is_active
                )
                self.db.add(db_field)

            self.db.commit()

            # Return created schema with fields
            return await self.get_schema_by_id(db_schema.id)

        except Exception as e:
            self.db.rollback()
            raise e

    async def get_schema_by_id(self, schema_id: UUID) -> Optional[ComponentSchemaResponse]:
        """Get a schema by ID with its fields"""
        schema = self.db.query(ComponentSchema)\
            .options(joinedload(ComponentSchemaField))\
            .filter(ComponentSchema.id == schema_id)\
            .first()

        if not schema:
            return None

        # Get fields separately for proper ordering
        fields = self.db.query(ComponentSchemaField)\
            .filter(ComponentSchemaField.schema_id == schema_id)\
            .order_by(ComponentSchemaField.display_order, ComponentSchemaField.field_name)\
            .all()

        return ComponentSchemaResponse(
            id=schema.id,
            project_id=schema.project_id,
            name=schema.name,
            description=schema.description,
            version=schema.version,
            is_default=schema.is_default,
            is_active=schema.is_active,
            created_by=schema.created_by,
            created_at=schema.created_at,
            updated_at=schema.updated_at,
            fields=[ComponentSchemaFieldResponse.from_orm(field) for field in fields]
        )

    async def get_project_schemas(self, project_id: Optional[UUID] = None, include_global: bool = True) -> List[ComponentSchemaResponse]:
        """Get all active schemas for a project, optionally including global schemas"""
        query = self.db.query(ComponentSchema).filter(ComponentSchema.is_active == True)

        conditions = []
        if project_id:
            conditions.append(ComponentSchema.project_id == project_id)

        if include_global:
            conditions.append(ComponentSchema.project_id.is_(None))

        if conditions:
            query = query.filter(or_(*conditions))

        schemas = query.order_by(
            ComponentSchema.is_default.desc(),
            ComponentSchema.name
        ).all()

        result = []
        for schema in schemas:
            schema_response = await self.get_schema_by_id(schema.id)
            if schema_response:
                result.append(schema_response)

        return result

    async def get_default_schema(self, project_id: Optional[UUID] = None) -> Optional[ComponentSchemaResponse]:
        """Get the default schema for a project, or global default if no project specified"""
        schema = self.db.query(ComponentSchema).filter(
            and_(
                ComponentSchema.project_id == project_id,
                ComponentSchema.is_default == True,
                ComponentSchema.is_active == True
            )
        ).first()

        if not schema and project_id:
            # Fall back to global default
            schema = self.db.query(ComponentSchema).filter(
                and_(
                    ComponentSchema.project_id.is_(None),
                    ComponentSchema.is_default == True,
                    ComponentSchema.is_active == True
                )
            ).first()

        return await self.get_schema_by_id(schema.id) if schema else None

    async def update_schema(self, schema_id: UUID, updates: ComponentSchemaUpdate) -> Optional[ComponentSchemaResponse]:
        """Update a schema's basic information (not fields)"""
        schema = self.db.query(ComponentSchema).filter(ComponentSchema.id == schema_id).first()
        if not schema:
            return None

        # Check for name conflicts if name is being updated
        if updates.name and updates.name != schema.name:
            existing = self.db.query(ComponentSchema).filter(
                and_(
                    ComponentSchema.project_id == schema.project_id,
                    ComponentSchema.name == updates.name,
                    ComponentSchema.is_active == True,
                    ComponentSchema.id != schema_id
                )
            ).first()

            if existing:
                raise ValueError(f"Schema '{updates.name}' already exists in this project")

        # Apply updates
        for field, value in updates.dict(exclude_unset=True).items():
            setattr(schema, field, value)

        schema.updated_at = self.db.execute("SELECT NOW()").scalar()
        self.db.commit()

        return await self.get_schema_by_id(schema_id)

    async def deactivate_schema(self, schema_id: UUID) -> bool:
        """Deactivate a schema (soft delete)"""
        schema = self.db.query(ComponentSchema).filter(ComponentSchema.id == schema_id).first()
        if not schema:
            return False

        # Check if schema is in use
        components_using_schema = self.db.query(Component).filter(Component.schema_id == schema_id).count()
        if components_using_schema > 0:
            raise ValueError(f"Cannot deactivate schema - {components_using_schema} components are using it")

        schema.is_active = False
        self.db.commit()
        return True

    # Schema Field CRUD Operations
    async def add_schema_field(self, schema_id: UUID, field_data: ComponentSchemaFieldCreate) -> ComponentSchemaFieldResponse:
        """Add a new field to an existing schema"""
        schema = self.db.query(ComponentSchema).filter(ComponentSchema.id == schema_id).first()
        if not schema:
            raise ValueError(f"Schema {schema_id} not found")

        # Check for duplicate field name
        existing_field = self.db.query(ComponentSchemaField).filter(
            and_(
                ComponentSchemaField.schema_id == schema_id,
                ComponentSchemaField.field_name == field_data.field_name,
                ComponentSchemaField.is_active == True
            )
        ).first()

        if existing_field:
            raise ValueError(f"Field '{field_data.field_name}' already exists in this schema")

        db_field = ComponentSchemaField(
            schema_id=schema_id,
            field_name=field_data.field_name,
            field_type=field_data.field_type.value,
            field_config=field_data.field_config,
            help_text=field_data.help_text,
            display_order=field_data.display_order,
            is_required=field_data.is_required,
            is_active=field_data.is_active
        )

        self.db.add(db_field)
        self.db.commit()

        return ComponentSchemaFieldResponse.from_orm(db_field)

    async def update_schema_field(self, field_id: UUID, updates: ComponentSchemaFieldUpdate) -> Optional[ComponentSchemaFieldResponse]:
        """Update a schema field"""
        field = self.db.query(ComponentSchemaField).filter(ComponentSchemaField.id == field_id).first()
        if not field:
            return None

        # Check for name conflicts if field_name is being updated
        if updates.field_name and updates.field_name != field.field_name:
            existing = self.db.query(ComponentSchemaField).filter(
                and_(
                    ComponentSchemaField.schema_id == field.schema_id,
                    ComponentSchemaField.field_name == updates.field_name,
                    ComponentSchemaField.is_active == True,
                    ComponentSchemaField.id != field_id
                )
            ).first()

            if existing:
                raise ValueError(f"Field '{updates.field_name}' already exists in this schema")

        # Apply updates
        for attr, value in updates.dict(exclude_unset=True).items():
            if attr == 'field_type' and value:
                setattr(field, attr, value.value)
            else:
                setattr(field, attr, value)

        self.db.commit()
        return ComponentSchemaFieldResponse.from_orm(field)

    async def remove_schema_field(self, field_id: UUID) -> bool:
        """Remove a field from a schema (soft delete)"""
        field = self.db.query(ComponentSchemaField).filter(ComponentSchemaField.id == field_id).first()
        if not field:
            return False

        # Check if field is in use by checking if any components have data for this field
        components_with_field_data = self.db.query(Component).filter(
            and_(
                Component.schema_id == field.schema_id,
                Component.dynamic_data.op('->')>(field.field_name).isnot(None)
            )
        ).count()

        if components_with_field_data > 0:
            raise ValueError(f"Cannot remove field '{field.field_name}' - {components_with_field_data} components have data for this field")

        field.is_active = False
        self.db.commit()
        return True

    # Schema Validation Methods
    async def validate_data_against_schema(self, schema_id: UUID, data: Dict[str, Any]) -> SchemaValidationResult:
        """Validate component data against a schema"""
        schema = await self.get_schema_by_id(schema_id)
        if not schema:
            return SchemaValidationResult(
                is_valid=False,
                errors=["Schema not found"]
            )

        validated_data = {}
        errors = []
        warnings = []

        for field in schema.fields:
            if not field.is_active:
                continue

            field_value = data.get(field.field_name)

            # Check required fields
            if field.is_required and (field_value is None or field_value == ""):
                errors.append(f"Field '{field.field_name}' is required")
                continue

            # Skip validation if field is empty and not required
            if field_value is None or field_value == "":
                continue

            # Validate based on field type
            validation_result = self._validate_field_value(field_value, field)
            if validation_result['is_valid']:
                validated_data[field.field_name] = validation_result['value']
                if validation_result.get('warnings'):
                    warnings.extend(validation_result['warnings'])
            else:
                errors.extend(validation_result['errors'])

        return SchemaValidationResult(
            is_valid=len(errors) == 0,
            validated_data=validated_data,
            errors=errors,
            warnings=warnings
        )

    def _validate_field_value(self, value: Any, field: ComponentSchemaFieldResponse) -> Dict[str, Any]:
        """Validate a single field value against its definition"""
        errors = []
        warnings = []
        validated_value = value

        try:
            if field.field_type == "number":
                validated_value = float(value)
                if 'min' in field.field_config and validated_value < field.field_config['min']:
                    errors.append(f"Value {value} is below minimum {field.field_config['min']}")
                if 'max' in field.field_config and validated_value > field.field_config['max']:
                    errors.append(f"Value {value} is above maximum {field.field_config['max']}")

            elif field.field_type == "text":
                validated_value = str(value)
                if 'max_length' in field.field_config and len(validated_value) > field.field_config['max_length']:
                    errors.append(f"Text length {len(validated_value)} exceeds maximum {field.field_config['max_length']}")

            elif field.field_type == "select":
                validated_value = str(value)
                if 'options' in field.field_config and validated_value not in field.field_config['options']:
                    if field.field_config.get('allow_custom', False):
                        warnings.append(f"Value '{value}' is not in predefined options")
                    else:
                        errors.append(f"Value '{value}' is not a valid option")

            elif field.field_type == "checkbox":
                validated_value = bool(value)

        except (ValueError, TypeError) as e:
            errors.append(f"Invalid value for field type {field.field_type}: {str(e)}")

        return {
            'is_valid': len(errors) == 0,
            'value': validated_value,
            'errors': errors,
            'warnings': warnings
        }

    # Type Locking Methods
    async def check_type_lock_status(self, component_id: UUID) -> TypeLockStatus:
        """Check if a component's type is locked"""
        component = self.db.query(Component).filter(Component.id == component_id).first()
        if not component:
            raise ValueError(f"Component {component_id} not found")

        # Component is type-locked if it has non-empty dynamic_data
        has_data = False
        locked_fields = []

        if component.dynamic_data:
            for field_name, value in component.dynamic_data.items():
                if value is not None and value != "":
                    has_data = True
                    locked_fields.append(field_name)

        is_locked = has_data
        lock_reason = None

        if is_locked:
            lock_reason = f"Component has data in {len(locked_fields)} field(s): {', '.join(locked_fields[:3])}"
            if len(locked_fields) > 3:
                lock_reason += "..."

        return TypeLockStatus(
            is_locked=is_locked,
            lock_reason=lock_reason,
            locked_fields=locked_fields,
            can_unlock=len(locked_fields) > 0  # Can unlock by clearing data
        )

    async def clear_component_data(self, component_id: UUID) -> bool:
        """Clear component's dynamic data to unlock type selection"""
        component = self.db.query(Component).filter(Component.id == component_id).first()
        if not component:
            return False

        component.dynamic_data = {}
        self.db.commit()
        return True

    # Migration and Utility Methods
    async def migrate_legacy_components(self, project_id: Optional[UUID] = None) -> Dict[str, int]:
        """Migrate components from old static fields to schema format"""
        # This would be used for any legacy data not handled by the migration
        query = self.db.query(Component).filter(Component.schema_id.is_(None))

        if project_id:
            query = query.join(Drawing).filter(Drawing.project_id == project_id)

        legacy_components = query.all()

        migrated_count = 0
        error_count = 0

        for component in legacy_components:
            try:
                # Find appropriate schema
                drawing = self.db.query(Drawing).filter(Drawing.id == component.drawing_id).first()
                default_schema = await self.get_default_schema(drawing.project_id if drawing else None)

                if default_schema:
                    # Migrate data
                    dynamic_data = {
                        'component_type': getattr(component, 'component_type', ''),
                        'description': getattr(component, 'description', ''),
                        'material_type': getattr(component, 'material_type', ''),
                        'quantity': getattr(component, 'quantity', 1)
                    }

                    component.schema_id = default_schema.id
                    component.dynamic_data = {k: v for k, v in dynamic_data.items() if v}

                    migrated_count += 1
                else:
                    error_count += 1

            except Exception:
                error_count += 1

        self.db.commit()

        return {
            'migrated': migrated_count,
            'errors': error_count,
            'total_processed': len(legacy_components)
        }