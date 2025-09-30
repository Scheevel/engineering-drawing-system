from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.services.schema_service import SchemaService
from app.models.schema import (
    ComponentSchemaCreate, ComponentSchemaUpdate, ComponentSchemaResponse, ComponentSchemaListResponse,
    ComponentSchemaFieldCreate, ComponentSchemaFieldUpdate, ComponentSchemaFieldResponse,
    SchemaValidationResult, BulkSchemaAssignmentRequest, BulkSchemaAssignmentResponse
)

router = APIRouter()

@router.post("/", response_model=ComponentSchemaResponse)
async def create_schema(
    schema_data: ComponentSchemaCreate,
    db: Session = Depends(get_db)
):
    """Create a new component schema with fields"""
    try:
        schema_service = SchemaService(db)
        return await schema_service.create_schema(schema_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create schema: {str(e)}")

@router.get("/{schema_id}", response_model=ComponentSchemaResponse)
async def get_schema(
    schema_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a schema by ID with its fields"""
    schema_service = SchemaService(db)
    schema = await schema_service.get_schema_by_id(schema_id)

    if not schema:
        raise HTTPException(status_code=404, detail="Schema not found")

    return schema

@router.get("/projects/{project_id}", response_model=ComponentSchemaListResponse)
async def get_project_schemas(
    project_id: str,
    include_global: bool = Query(True, description="Include global schemas"),
    db: Session = Depends(get_db)
):
    """Get all active schemas for a project"""
    try:
        # Handle special project identifiers (default-project, demo-project, etc.)
        # These are used by the frontend for unassigned/demo projects
        parsed_project_id = None
        special_project_ids = ["default-project", "demo-project", "unassigned", "global"]

        if project_id not in special_project_ids:
            try:
                parsed_project_id = UUID(project_id)
            except ValueError:
                # If not a valid UUID and not a special identifier, treat as global (null)
                parsed_project_id = None

        schema_service = SchemaService(db)
        schemas = await schema_service.get_project_schemas(parsed_project_id, include_global)

        return ComponentSchemaListResponse(
            schemas=schemas,
            total=len(schemas),
            project_id=parsed_project_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get project schemas: {str(e)}")

@router.get("/projects/{project_id}/default", response_model=ComponentSchemaResponse)
async def get_default_schema(
    project_id: UUID,
    db: Session = Depends(get_db)
):
    """Get the default schema for a project"""
    schema_service = SchemaService(db)
    schema = await schema_service.get_default_schema(project_id)

    if not schema:
        raise HTTPException(status_code=404, detail="No default schema found for project")

    return schema

@router.get("/global/default", response_model=ComponentSchemaResponse)
async def get_global_default_schema(
    db: Session = Depends(get_db)
):
    """Get the global default schema"""
    schema_service = SchemaService(db)
    schema = await schema_service.get_default_schema(None)

    if not schema:
        raise HTTPException(status_code=404, detail="No global default schema found")

    return schema

@router.post("/projects/{project_id}/default", response_model=ComponentSchemaResponse)
async def set_project_default_schema(
    project_id: UUID,
    schema_id: UUID = Query(..., description="Schema ID to set as default"),
    db: Session = Depends(get_db)
):
    """Set a schema as the default for a project"""
    try:
        schema_service = SchemaService(db)
        updated_schema = await schema_service.set_default_schema(project_id, schema_id)

        if not updated_schema:
            raise HTTPException(status_code=404, detail="Schema not found or cannot be set as default")

        return updated_schema
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set default schema: {str(e)}")

@router.delete("/projects/{project_id}/default")
async def unset_project_default_schema(
    project_id: UUID,
    schema_id: UUID = Query(..., description="Schema ID to unset as default"),
    db: Session = Depends(get_db)
):
    """Unset a schema as the default for a project"""
    try:
        schema_service = SchemaService(db)
        success = await schema_service.unset_default_schema(project_id, schema_id)

        if not success:
            raise HTTPException(status_code=404, detail="Schema not found or not currently default")

        return {"message": "Default schema unset successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unset default schema: {str(e)}")

@router.put("/{schema_id}", response_model=ComponentSchemaResponse)
async def update_schema(
    schema_id: UUID,
    updates: ComponentSchemaUpdate,
    db: Session = Depends(get_db)
):
    """Update a schema's basic information"""
    try:
        schema_service = SchemaService(db)
        updated_schema = await schema_service.update_schema(schema_id, updates)

        if not updated_schema:
            raise HTTPException(status_code=404, detail="Schema not found")

        return updated_schema
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update schema: {str(e)}")

@router.delete("/{schema_id}")
async def deactivate_schema(
    schema_id: UUID,
    db: Session = Depends(get_db)
):
    """Deactivate a schema (soft delete)"""
    try:
        schema_service = SchemaService(db)
        success = await schema_service.deactivate_schema(schema_id)

        if not success:
            raise HTTPException(status_code=404, detail="Schema not found")

        return {"message": "Schema deactivated successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to deactivate schema: {str(e)}")

# Schema Field Management Endpoints
@router.post("/{schema_id}/fields", response_model=ComponentSchemaFieldResponse)
async def add_schema_field(
    schema_id: UUID,
    field_data: ComponentSchemaFieldCreate,
    db: Session = Depends(get_db)
):
    """Add a new field to an existing schema"""
    try:
        schema_service = SchemaService(db)
        return await schema_service.add_schema_field(schema_id, field_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add schema field: {str(e)}")

@router.put("/fields/{field_id}", response_model=ComponentSchemaFieldResponse)
async def update_schema_field(
    field_id: UUID,
    updates: ComponentSchemaFieldUpdate,
    db: Session = Depends(get_db)
):
    """Update a schema field"""
    try:
        schema_service = SchemaService(db)
        updated_field = await schema_service.update_schema_field(field_id, updates)

        if not updated_field:
            raise HTTPException(status_code=404, detail="Schema field not found")

        return updated_field
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update schema field: {str(e)}")

@router.delete("/fields/{field_id}")
async def remove_schema_field(
    field_id: UUID,
    db: Session = Depends(get_db)
):
    """Remove a field from a schema (soft delete)"""
    try:
        schema_service = SchemaService(db)
        success = await schema_service.remove_schema_field(field_id)

        if not success:
            raise HTTPException(status_code=404, detail="Schema field not found")

        return {"message": "Schema field removed successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove schema field: {str(e)}")

@router.put("/{schema_id}/fields/{field_id}/validation", response_model=SchemaValidationResult)
async def validate_specific_field_data(
    schema_id: UUID,
    field_id: UUID,
    field_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Validate specific field data against schema field rules"""
    try:
        schema_service = SchemaService(db)
        return await schema_service.validate_field_data(schema_id, field_id, field_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Field validation failed: {str(e)}")

@router.post("/{schema_id}/fields/{field_id}/duplicate", response_model=ComponentSchemaFieldResponse)
async def duplicate_schema_field(
    schema_id: UUID,
    field_id: UUID,
    name_suffix: str = Query(default=" Copy", description="Suffix to add to duplicated field name"),
    db: Session = Depends(get_db)
):
    """Duplicate an existing schema field with new name"""
    try:
        schema_service = SchemaService(db)
        duplicated_field = await schema_service.duplicate_schema_field(schema_id, field_id, name_suffix)

        if not duplicated_field:
            raise HTTPException(status_code=404, detail="Schema field not found")

        return duplicated_field
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to duplicate schema field: {str(e)}")

# Schema Validation Endpoints
@router.post("/{schema_id}/validate", response_model=SchemaValidationResult)
async def validate_data_against_schema(
    schema_id: UUID,
    data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Validate component data against a schema"""
    try:
        schema_service = SchemaService(db)
        return await schema_service.validate_data_against_schema(schema_id, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

# Migration and Utility Endpoints
@router.post("/migrate-legacy")
async def migrate_legacy_components(
    project_id: Optional[UUID] = None,
    db: Session = Depends(get_db)
):
    """Migrate components from old static fields to schema format"""
    try:
        schema_service = SchemaService(db)
        results = await schema_service.migrate_legacy_components(project_id)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")

@router.get("/{schema_id}/usage")
async def get_schema_usage(
    schema_id: UUID,
    db: Session = Depends(get_db)
):
    """Get information about schema usage"""
    try:
        # Import here to avoid circular dependency
        from app.services.flexible_component_service import FlexibleComponentService

        flex_service = FlexibleComponentService(db)
        components = await flex_service.get_components_by_schema(schema_id, limit=1000)

        usage_info = {
            "schema_id": str(schema_id),
            "components_using_schema": len(components),
            "component_ids": [str(comp.id) for comp in components[:100]],  # Limit for response size
            "truncated": len(components) > 100
        }

        return usage_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get schema usage: {str(e)}")

# Bulk Operations
@router.post("/bulk-assign", response_model=BulkSchemaAssignmentResponse)
async def bulk_assign_schema(
    request: BulkSchemaAssignmentRequest,
    db: Session = Depends(get_db)
):
    """Bulk assign schema to multiple components"""
    try:
        from app.services.flexible_component_service import FlexibleComponentService

        flex_service = FlexibleComponentService(db)
        results = await flex_service.bulk_assign_schema(
            request.component_ids,
            request.target_schema_id,
            request.force_assignment
        )

        return BulkSchemaAssignmentResponse(
            successful_assignments=results['successful'],
            failed_assignments=[
                {'component_id': str(cid), 'error': 'Assignment failed'}
                for cid in results['failed']
            ],
            locked_components=results['locked'],
            total_processed=len(request.component_ids)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulk assignment failed: {str(e)}")

# Statistics and Analytics
@router.get("/projects/{project_id}/stats")
async def get_project_schema_stats(
    project_id: UUID,
    db: Session = Depends(get_db)
):
    """Get schema usage statistics for a project"""
    try:
        from app.services.flexible_component_service import FlexibleComponentService

        flex_service = FlexibleComponentService(db)
        return await flex_service.get_schema_usage_stats(project_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get schema stats: {str(e)}")