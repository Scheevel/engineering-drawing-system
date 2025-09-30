from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.services.flexible_component_service import FlexibleComponentService
from app.services.schema_service import SchemaService
from app.models.schema import (
    FlexibleComponentCreate, FlexibleComponentUpdate, FlexibleComponentResponse,
    TypeLockStatus, SchemaValidationResult, DynamicComponentData
)

router = APIRouter()

@router.post("/", response_model=FlexibleComponentResponse)
async def create_flexible_component(
    component_data: FlexibleComponentCreate,
    db: Session = Depends(get_db)
):
    """Create a new component with schema-driven validation"""
    try:
        flex_service = FlexibleComponentService(db)
        return await flex_service.create_flexible_component(component_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create component: {str(e)}")

@router.get("/{component_id}", response_model=FlexibleComponentResponse)
async def get_flexible_component(
    component_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a component with full schema information"""
    flex_service = FlexibleComponentService(db)
    component = await flex_service.get_flexible_component_by_id(component_id)

    if not component:
        raise HTTPException(status_code=404, detail="Component not found")

    return component

@router.put("/{component_id}", response_model=FlexibleComponentResponse)
async def update_flexible_component(
    component_id: UUID,
    update_data: FlexibleComponentUpdate,
    db: Session = Depends(get_db)
):
    """Update component with schema-aware validation and type-locking"""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"=== UPDATE REQUEST === Component ID: {component_id}")
    logger.info(f"Update data: {update_data.dict(exclude_unset=True)}")
    try:
        flex_service = FlexibleComponentService(db)
        updated_component = await flex_service.update_flexible_component(component_id, update_data)

        if not updated_component:
            raise HTTPException(status_code=404, detail="Component not found")

        return updated_component
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update component: {str(e)}")

@router.get("/{component_id}/type-lock", response_model=TypeLockStatus)
async def get_component_type_lock_info(
    component_id: UUID,
    db: Session = Depends(get_db)
):
    """Get detailed information about component type locking"""
    try:
        flex_service = FlexibleComponentService(db)
        return await flex_service.get_component_type_lock_info(component_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get lock info: {str(e)}")

@router.post("/{component_id}/unlock", response_model=FlexibleComponentResponse)
async def unlock_component_type(
    component_id: UUID,
    db: Session = Depends(get_db)
):
    """Clear component's dynamic data to enable schema changes"""
    try:
        flex_service = FlexibleComponentService(db)
        return await flex_service.clear_component_data_to_unlock(component_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unlock component: {str(e)}")

@router.post("/{component_id}/migrate-schema", response_model=FlexibleComponentResponse)
async def migrate_component_schema(
    component_id: UUID,
    target_schema_id: UUID,
    force: bool = Query(False, description="Force migration even if component is type-locked"),
    db: Session = Depends(get_db)
):
    """Migrate existing component to use a specific schema"""
    try:
        flex_service = FlexibleComponentService(db)
        return await flex_service.migrate_component_to_schema(component_id, target_schema_id, force)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to migrate schema: {str(e)}")

@router.post("/{component_id}/validate", response_model=SchemaValidationResult)
async def validate_component_against_schema(
    component_id: UUID,
    schema_id: Optional[UUID] = Query(None, description="Schema to validate against (uses component's schema if not provided)"),
    db: Session = Depends(get_db)
):
    """Validate a component's data against its schema or a specified schema"""
    try:
        flex_service = FlexibleComponentService(db)
        return await flex_service.validate_component_against_schema(component_id, schema_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

# Schema-based queries
@router.get("/by-schema/{schema_id}", response_model=List[FlexibleComponentResponse])
async def get_components_by_schema(
    schema_id: UUID,
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of components to return"),
    db: Session = Depends(get_db)
):
    """Get all components using a specific schema"""
    try:
        flex_service = FlexibleComponentService(db)
        return await flex_service.get_components_by_schema(schema_id, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get components by schema: {str(e)}")

# Batch operations for schema management
@router.post("/batch/migrate-schema")
async def batch_migrate_components_to_schema(
    component_ids: List[UUID],
    target_schema_id: UUID,
    force: bool = Query(False, description="Force migration even if components are type-locked"),
    db: Session = Depends(get_db)
):
    """Migrate multiple components to a specific schema"""
    try:
        flex_service = FlexibleComponentService(db)
        results = await flex_service.bulk_assign_schema(component_ids, target_schema_id, force)

        return {
            "requested_components": len(component_ids),
            "successful_migrations": len(results['successful']),
            "failed_migrations": len(results['failed']),
            "locked_components": len(results['locked']),
            "results": {
                "successful": [str(cid) for cid in results['successful']],
                "failed": [str(cid) for cid in results['failed']],
                "locked": [str(cid) for cid in results['locked']]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch migration failed: {str(e)}")

@router.post("/batch/unlock")
async def batch_unlock_components(
    component_ids: List[UUID],
    db: Session = Depends(get_db)
):
    """Unlock multiple components by clearing their dynamic data"""
    try:
        flex_service = FlexibleComponentService(db)
        results = {
            "successful": [],
            "failed": []
        }

        for component_id in component_ids:
            try:
                await flex_service.clear_component_data_to_unlock(component_id)
                results["successful"].append(str(component_id))
            except Exception:
                results["failed"].append(str(component_id))

        return {
            "requested_components": len(component_ids),
            "successful_unlocks": len(results["successful"]),
            "failed_unlocks": len(results["failed"]),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch unlock failed: {str(e)}")

# Component data validation and testing
@router.post("/validate-data")
async def validate_component_data_against_schema(
    schema_id: UUID,
    component_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Validate component data against a schema without creating a component"""
    try:
        schema_service = SchemaService(db)
        return await schema_service.validate_data_against_schema(schema_id, component_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

# Advanced querying with schema filters
@router.get("/search/by-field-value")
async def search_components_by_field_value(
    field_name: str,
    field_value: str,
    schema_id: Optional[UUID] = Query(None, description="Limit search to specific schema"),
    project_id: Optional[UUID] = Query(None, description="Limit search to specific project"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Search for components by dynamic field values"""
    try:
        from app.models.database import Component, Drawing
        from sqlalchemy import text

        # Build base query
        query = db.query(Component).join(Drawing, Component.drawing_id == Drawing.id)

        # Filter by schema if provided
        if schema_id:
            query = query.filter(Component.schema_id == schema_id)

        # Filter by project if provided
        if project_id:
            query = query.filter(Drawing.project_id == project_id)

        # Filter by field value using JSONB operators
        query = query.filter(
            Component.dynamic_data[field_name].astext == field_value
        )

        components = query.limit(limit).all()

        # Convert to flexible response format
        flex_service = FlexibleComponentService(db)
        results = []
        for component in components:
            flex_component = await flex_service._component_to_flexible_response(component)
            results.append(flex_component)

        return {
            "field_name": field_name,
            "field_value": field_value,
            "total_found": len(results),
            "components": results
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

# Statistics and analytics
@router.get("/stats/schema-usage")
async def get_schema_usage_statistics(
    project_id: Optional[UUID] = Query(None, description="Limit to specific project"),
    db: Session = Depends(get_db)
):
    """Get statistics on schema usage across components"""
    try:
        flex_service = FlexibleComponentService(db)
        return await flex_service.get_schema_usage_stats(project_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get schema statistics: {str(e)}")

# Utility endpoints for frontend development
@router.get("/{component_id}/available-schemas", response_model=List[dict])
async def get_available_schemas_for_component(
    component_id: UUID,
    db: Session = Depends(get_db)
):
    """Get list of schemas available for a component based on its drawing's project"""
    try:
        from app.models.database import Drawing

        # Get component's drawing and project
        component = db.query(Component).join(Drawing).filter(Component.id == component_id).first()

        if not component:
            raise HTTPException(status_code=404, detail="Component not found")

        # Get project ID from drawing
        project_id = component.drawing.project_id if component.drawing else None

        # Get available schemas
        schema_service = SchemaService(db)
        schemas = await schema_service.get_project_schemas(project_id, include_global=True)

        # Check current lock status
        flex_service = FlexibleComponentService(db)
        lock_status = await flex_service.get_component_type_lock_info(component_id)

        return {
            "current_schema_id": str(component.schema_id) if component.schema_id else None,
            "is_type_locked": lock_status.is_locked,
            "lock_reason": lock_status.lock_reason,
            "available_schemas": [
                {
                    "id": str(schema.id),
                    "name": schema.name,
                    "description": schema.description,
                    "is_default": schema.is_default,
                    "field_count": len(schema.fields)
                }
                for schema in schemas
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get available schemas: {str(e)}")

# Development and debugging endpoints
@router.get("/{component_id}/debug")
async def debug_component_schema_info(
    component_id: UUID,
    db: Session = Depends(get_db)
):
    """Get detailed debug information about a component's schema state"""
    try:
        from app.models.database import Component

        component = db.query(Component).filter(Component.id == component_id).first()
        if not component:
            raise HTTPException(status_code=404, detail="Component not found")

        flex_service = FlexibleComponentService(db)
        schema_service = SchemaService(db)

        # Get comprehensive debug info
        debug_info = {
            "component_id": str(component_id),
            "basic_info": {
                "piece_mark": component.piece_mark,
                "drawing_id": str(component.drawing_id),
                "created_at": component.created_at.isoformat(),
                "updated_at": component.updated_at.isoformat()
            },
            "schema_info": {
                "schema_id": str(component.schema_id) if component.schema_id else None,
                "dynamic_data": component.dynamic_data or {},
                "dynamic_data_keys": list((component.dynamic_data or {}).keys()),
                "has_dynamic_data": bool(component.dynamic_data and any(
                    v for v in component.dynamic_data.values() if v is not None and v != ""
                ))
            }
        }

        # Get lock status
        lock_status = await flex_service.get_component_type_lock_info(component_id)
        debug_info["lock_status"] = {
            "is_locked": lock_status.is_locked,
            "lock_reason": lock_status.lock_reason,
            "locked_fields": lock_status.locked_fields,
            "can_unlock": lock_status.can_unlock
        }

        # Get schema details if available
        if component.schema_id:
            schema = await schema_service.get_schema_by_id(component.schema_id)
            if schema:
                debug_info["schema_details"] = {
                    "name": schema.name,
                    "description": schema.description,
                    "version": schema.version,
                    "field_count": len(schema.fields),
                    "fields": [
                        {
                            "name": field.field_name,
                            "type": field.field_type,
                            "required": field.is_required,
                            "has_value": field.field_name in (component.dynamic_data or {})
                        }
                        for field in schema.fields
                    ]
                }

        return debug_info

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Debug info failed: {str(e)}")