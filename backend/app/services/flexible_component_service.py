from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from uuid import UUID
from datetime import datetime
import logging

from app.models.database import Component, ComponentSchema, Drawing, Project
from app.models.schema import (
    FlexibleComponentCreate, FlexibleComponentUpdate, FlexibleComponentResponse,
    DynamicComponentData, TypeLockStatus, SchemaValidationResult
)
from app.services.component_service import ComponentService
from app.services.schema_service import SchemaService

logger = logging.getLogger(__name__)

class FlexibleComponentService:
    """Extended component service with flexible schema support"""

    def __init__(self, db: Session):
        self.db = db
        self.component_service = ComponentService()
        self.schema_service = SchemaService(db)

    async def create_flexible_component(self, create_data: FlexibleComponentCreate) -> FlexibleComponentResponse:
        """Create a new component with schema-driven validation"""
        try:
            # Validate schema exists
            schema = await self.schema_service.get_schema_by_id(create_data.schema_id)
            if not schema:
                raise ValueError(f"Schema {create_data.schema_id} not found")

            # Validate dynamic data against schema
            validation_result = await self.schema_service.validate_data_against_schema(
                create_data.schema_id,
                create_data.dynamic_data.field_values
            )

            if not validation_result.is_valid:
                raise ValueError(f"Schema validation failed: {', '.join(validation_result.errors)}")

            # Create the component with schema fields
            component = Component(
                drawing_id=create_data.drawing_id,
                piece_mark=create_data.piece_mark.upper(),
                location_x=create_data.location_x,
                location_y=create_data.location_y,
                instance_identifier=create_data.instance_identifier,
                bounding_box=create_data.bounding_box,
                confidence_score=create_data.confidence_score,
                review_status=create_data.review_status or "pending",
                schema_id=create_data.schema_id,
                dynamic_data=validation_result.validated_data,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

            self.db.add(component)
            self.db.commit()
            self.db.refresh(component)

            logger.info(f"Created flexible component {component.id} with schema {create_data.schema_id}")

            return await self.get_flexible_component_by_id(component.id)

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating flexible component: {str(e)}")
            raise

    async def get_flexible_component_by_id(self, component_id: UUID) -> Optional[FlexibleComponentResponse]:
        """Get a component with full schema information"""
        try:
            component = self.db.query(Component).options(
                joinedload(Component.drawing).joinedload(Drawing.project)
            ).filter(Component.id == component_id).first()

            if not component:
                return None

            return await self._component_to_flexible_response(component)

        except Exception as e:
            logger.error(f"Error getting flexible component {component_id}: {str(e)}")
            raise

    async def update_flexible_component(
        self,
        component_id: UUID,
        update_data: FlexibleComponentUpdate
    ) -> Optional[FlexibleComponentResponse]:
        """Update component with schema-aware validation and type-locking"""
        try:
            component = self.db.query(Component).filter(Component.id == component_id).first()
            if not component:
                return None

            # Check type locking status
            type_lock_status = await self.schema_service.check_type_lock_status(component_id)

            # Handle schema change requests
            if update_data.schema_id and update_data.schema_id != component.schema_id:
                if type_lock_status.is_locked:
                    raise ValueError(
                        f"Cannot change schema: {type_lock_status.lock_reason}. "
                        "Clear component data first to unlock schema selection."
                    )

                # Validate new schema exists
                new_schema = await self.schema_service.get_schema_by_id(update_data.schema_id)
                if not new_schema:
                    raise ValueError(f"Schema {update_data.schema_id} not found")

                component.schema_id = update_data.schema_id
                # Reset dynamic data when schema changes
                component.dynamic_data = {}

            # Handle dynamic data updates
            if update_data.dynamic_data is not None:
                if component.schema_id:
                    # Validate new data against current schema
                    validation_result = await self.schema_service.validate_data_against_schema(
                        component.schema_id,
                        update_data.dynamic_data.field_values
                    )

                    if not validation_result.is_valid:
                        raise ValueError(f"Schema validation failed: {', '.join(validation_result.errors)}")

                    # Merge validated data with existing data
                    current_data = component.dynamic_data or {}
                    current_data.update(validation_result.validated_data)
                    component.dynamic_data = current_data
                else:
                    # No schema - store data as-is (legacy support)
                    component.dynamic_data = update_data.dynamic_data.field_values

            # Update standard fields
            update_dict = update_data.dict(exclude_unset=True, exclude={'schema_id', 'dynamic_data'})
            for field, value in update_dict.items():
                if hasattr(component, field):
                    setattr(component, field, value)

            component.updated_at = datetime.utcnow()
            self.db.commit()

            logger.info(f"Updated flexible component {component_id}")

            return await self.get_flexible_component_by_id(component_id)

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating flexible component {component_id}: {str(e)}")
            raise

    async def get_components_by_schema(self, schema_id: UUID, limit: int = 100) -> List[FlexibleComponentResponse]:
        """Get all components using a specific schema"""
        try:
            components = self.db.query(Component).options(
                joinedload(Component.drawing).joinedload(Drawing.project)
            ).filter(Component.schema_id == schema_id).limit(limit).all()

            results = []
            for component in components:
                flex_component = await self._component_to_flexible_response(component)
                if flex_component:
                    results.append(flex_component)

            return results

        except Exception as e:
            logger.error(f"Error getting components by schema {schema_id}: {str(e)}")
            raise

    async def migrate_component_to_schema(
        self,
        component_id: UUID,
        target_schema_id: UUID,
        force: bool = False
    ) -> FlexibleComponentResponse:
        """Migrate existing component to use a specific schema"""
        try:
            component = self.db.query(Component).filter(Component.id == component_id).first()
            if not component:
                raise ValueError(f"Component {component_id} not found")

            # Check if component is type-locked
            if not force:
                type_lock_status = await self.schema_service.check_type_lock_status(component_id)
                if type_lock_status.is_locked:
                    raise ValueError(f"Cannot migrate schema: {type_lock_status.lock_reason}")

            # Validate target schema
            target_schema = await self.schema_service.get_schema_by_id(target_schema_id)
            if not target_schema:
                raise ValueError(f"Target schema {target_schema_id} not found")

            # Attempt to map existing data to new schema
            mapped_data = {}
            existing_data = component.dynamic_data or {}

            # Try to map common fields
            field_mapping = {
                'component_type': 'component_type',
                'description': 'description',
                'material_type': 'material_type',
                'quantity': 'quantity'
            }

            for new_field in target_schema.fields:
                if new_field.field_name in field_mapping:
                    legacy_field = field_mapping[new_field.field_name]
                    if legacy_field in existing_data:
                        mapped_data[new_field.field_name] = existing_data[legacy_field]
                    elif hasattr(component, legacy_field):
                        # Map from legacy component fields
                        legacy_value = getattr(component, legacy_field)
                        if legacy_value is not None:
                            mapped_data[new_field.field_name] = legacy_value

            # Validate mapped data
            validation_result = await self.schema_service.validate_data_against_schema(
                target_schema_id,
                mapped_data
            )

            # Update component
            component.schema_id = target_schema_id
            component.dynamic_data = validation_result.validated_data
            component.updated_at = datetime.utcnow()

            self.db.commit()

            logger.info(f"Migrated component {component_id} to schema {target_schema_id}")

            return await self.get_flexible_component_by_id(component_id)

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error migrating component {component_id} to schema: {str(e)}")
            raise

    async def clear_component_data_to_unlock(self, component_id: UUID) -> FlexibleComponentResponse:
        """Clear component's dynamic data to enable schema changes"""
        try:
            component = self.db.query(Component).filter(Component.id == component_id).first()
            if not component:
                raise ValueError(f"Component {component_id} not found")

            # Clear dynamic data
            component.dynamic_data = {}
            component.updated_at = datetime.utcnow()

            self.db.commit()

            logger.info(f"Cleared data for component {component_id} to unlock schema selection")

            return await self.get_flexible_component_by_id(component_id)

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error clearing component data {component_id}: {str(e)}")
            raise

    async def validate_component_against_schema(
        self,
        component_id: UUID,
        schema_id: Optional[UUID] = None
    ) -> SchemaValidationResult:
        """Validate a component's data against its schema (or specified schema)"""
        try:
            component = self.db.query(Component).filter(Component.id == component_id).first()
            if not component:
                raise ValueError(f"Component {component_id} not found")

            target_schema_id = schema_id or component.schema_id
            if not target_schema_id:
                return SchemaValidationResult(
                    is_valid=False,
                    errors=["Component has no schema assigned"]
                )

            return await self.schema_service.validate_data_against_schema(
                target_schema_id,
                component.dynamic_data or {}
            )

        except Exception as e:
            logger.error(f"Error validating component {component_id}: {str(e)}")
            raise

    async def get_component_type_lock_info(self, component_id: UUID) -> TypeLockStatus:
        """Get detailed information about component type locking"""
        return await self.schema_service.check_type_lock_status(component_id)

    async def bulk_assign_schema(
        self,
        component_ids: List[UUID],
        target_schema_id: UUID,
        force: bool = False
    ) -> Dict[str, List[UUID]]:
        """Bulk assign schema to multiple components"""
        try:
            results = {
                'successful': [],
                'failed': [],
                'locked': []
            }

            for component_id in component_ids:
                try:
                    # Check if component exists and is locked
                    component = self.db.query(Component).filter(Component.id == component_id).first()
                    if not component:
                        results['failed'].append(component_id)
                        continue

                    if not force:
                        type_lock_status = await self.schema_service.check_type_lock_status(component_id)
                        if type_lock_status.is_locked:
                            results['locked'].append(component_id)
                            continue

                    # Migrate to new schema
                    await self.migrate_component_to_schema(component_id, target_schema_id, force)
                    results['successful'].append(component_id)

                except Exception as e:
                    logger.error(f"Failed to assign schema to component {component_id}: {str(e)}")
                    results['failed'].append(component_id)

            return results

        except Exception as e:
            logger.error(f"Error in bulk schema assignment: {str(e)}")
            raise

    async def get_schema_usage_stats(self, project_id: Optional[UUID] = None) -> Dict[str, Any]:
        """Get statistics on schema usage"""
        try:
            # Build base query
            query = self.db.query(
                ComponentSchema.id,
                ComponentSchema.name,
                func.count(Component.id).label('component_count')
            ).outerjoin(Component, Component.schema_id == ComponentSchema.id)

            if project_id:
                query = query.filter(ComponentSchema.project_id == project_id)

            query = query.group_by(ComponentSchema.id, ComponentSchema.name)

            results = query.all()

            stats = {
                'schemas': [],
                'total_components': 0,
                'schemas_in_use': 0,
                'unused_schemas': 0
            }

            for schema_id, schema_name, component_count in results:
                stats['schemas'].append({
                    'schema_id': str(schema_id),
                    'schema_name': schema_name,
                    'component_count': component_count
                })
                stats['total_components'] += component_count

                if component_count > 0:
                    stats['schemas_in_use'] += 1
                else:
                    stats['unused_schemas'] += 1

            return stats

        except Exception as e:
            logger.error(f"Error getting schema usage stats: {str(e)}")
            raise

    # Private helper methods
    async def _component_to_flexible_response(self, component: Component) -> FlexibleComponentResponse:
        """Convert database component to flexible response with schema info"""
        # Get schema information if available
        schema_info = None
        if component.schema_id:
            schema_info = await self.schema_service.get_schema_by_id(component.schema_id)

        # Calculate type lock status
        type_lock_status = await self.schema_service.check_type_lock_status(component.id)

        # Build response data
        response_data = {
            'id': component.id,
            'drawing_id': component.drawing_id,
            'piece_mark': component.piece_mark,
            'component_type': component.component_type,
            'location_x': component.location_x,
            'location_y': component.location_y,
            'instance_identifier': component.instance_identifier,
            'bounding_box': component.bounding_box,
            'confidence_score': component.confidence_score,
            'review_status': component.review_status,
            'created_at': component.created_at,
            'updated_at': component.updated_at,
            'schema_id': component.schema_id,
            'schema_info': schema_info,
            'dynamic_data': DynamicComponentData(
                field_values=component.dynamic_data or {}
            ),
            'is_type_locked': type_lock_status.is_locked
        }

        # Add drawing context if available
        if hasattr(component, 'drawing') and component.drawing:
            drawing = component.drawing
            response_data.update({
                'drawing_file_name': drawing.file_name,
                'sheet_number': drawing.sheet_number,
                'drawing_type': drawing.drawing_type,
            })

            # Add project context
            if hasattr(drawing, 'project') and drawing.project:
                response_data['project_name'] = drawing.project.name
            else:
                response_data['project_name'] = 'Unassigned'

        return FlexibleComponentResponse(**response_data)

    def _extract_legacy_field_data(self, component: Component) -> Dict[str, Any]:
        """Extract data from legacy component fields for migration"""
        legacy_data = {}

        # Map standard component fields to dynamic data
        field_mappings = {
            'component_type': component.component_type,
            'description': component.description,
            'material_type': component.material_type,
            'quantity': component.quantity
        }

        for field_name, value in field_mappings.items():
            if value is not None and value != '':
                legacy_data[field_name] = value

        return legacy_data