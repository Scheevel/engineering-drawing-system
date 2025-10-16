from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.core.database import get_db
from app.models.database import Component, Dimension, Specification, Drawing
from app.models.component import (
    ComponentResponse, 
    ComponentCreateRequest,
    ComponentUpdateRequest, 
    ComponentListResponse,
    DimensionResponse,
    DimensionCreateRequest,
    DimensionUpdateRequest,
    SpecificationResponse,
    SpecificationCreateRequest,
    SpecificationUpdateRequest,
    ComponentAuditLogResponse
)
from app.services.component_service import ComponentService
from app.services.search_service import SearchService
from app.services.dimension_service import validate_dimension_type_unique
import uuid
from datetime import datetime

router = APIRouter()
component_service = ComponentService()
search_service = SearchService()

@router.post("", response_model=ComponentResponse)
async def create_component(
    component_data: ComponentCreateRequest,
    db: Session = Depends(get_db)
):
    """Create a new component manually"""
    # Verify that the drawing exists
    drawing = db.query(Drawing).filter(Drawing.id == component_data.drawing_id).first()
    if not drawing:
        raise HTTPException(status_code=404, detail="Drawing not found")
    
    # Check for duplicate piece marks in the same drawing with same instance_identifier
    existing_component = db.query(Component).filter(
        and_(
            Component.drawing_id == component_data.drawing_id,
            Component.piece_mark == component_data.piece_mark.upper(),
            Component.instance_identifier == component_data.instance_identifier
        )
    ).first()
    
    if existing_component:
        if component_data.instance_identifier:
            detail = f"Component with piece mark '{component_data.piece_mark}' and instance identifier '{component_data.instance_identifier}' already exists in this drawing"
        else:
            detail = f"Component with piece mark '{component_data.piece_mark}' already exists in this drawing"
        raise HTTPException(
            status_code=400, 
            detail=detail
        )
    
    # Create the component
    try:
        created_component = await component_service.create_component(component_data, db)
        
        # Index in Elasticsearch
        try:
            search_service.index_component(created_component, db)
        except Exception as e:
            # Log but don't fail the creation
            print(f"Failed to index new component {created_component.id}: {str(e)}")
        
        return created_component
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create component: {str(e)}")

@router.get("/{component_id}", response_model=ComponentResponse)
async def get_component(
    component_id: str,
    db: Session = Depends(get_db)
):
    """Get detailed component information including dimensions and specifications"""
    try:
        component_uuid = uuid.UUID(component_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid component ID format")
    
    component = await component_service.get_component_with_details(component_uuid, db)
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")
    
    return component

@router.put("/{component_id}", response_model=ComponentResponse)
async def update_component(
    component_id: str,
    update_data: ComponentUpdateRequest,
    db: Session = Depends(get_db)
):
    """Update component information with validation and audit logging"""
    try:
        component_uuid = uuid.UUID(component_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid component ID format")
    
    # Validate the update request
    validation_result = await component_service.validate_component_update(
        component_uuid, update_data, db
    )
    if not validation_result.is_valid:
        raise HTTPException(
            status_code=400, 
            detail=f"Validation failed: {'; '.join(validation_result.errors)}"
        )
    
    # Perform the update
    updated_component = await component_service.update_component(
        component_uuid, update_data, db
    )
    if not updated_component:
        raise HTTPException(status_code=404, detail="Component not found")
    
    # Re-index in Elasticsearch
    try:
        search_service.index_component(updated_component, db)
    except Exception as e:
        # Log but don't fail the update
        print(f"Failed to re-index component {component_id}: {str(e)}")
    
    return updated_component

@router.patch("/{component_id}", response_model=ComponentResponse)
async def partial_update_component(
    component_id: str,
    update_data: dict,
    db: Session = Depends(get_db)
):
    """Partial update of component fields"""
    try:
        component_uuid = uuid.UUID(component_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid component ID format")
    
    # Convert dict to ComponentUpdateRequest with only provided fields
    partial_update = ComponentUpdateRequest.parse_partial(update_data)
    
    updated_component = await component_service.partial_update_component(
        component_uuid, partial_update, db
    )
    if not updated_component:
        raise HTTPException(status_code=404, detail="Component not found")
    
    return updated_component

@router.delete("/{component_id}")
async def delete_component(
    component_id: str,
    db: Session = Depends(get_db)
):
    """Soft delete a component and its associated data"""
    try:
        component_uuid = uuid.UUID(component_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid component ID format")
    
    success = await component_service.delete_component(component_uuid, db)
    if not success:
        raise HTTPException(status_code=404, detail="Component not found")
    
    return {"message": "Component deleted successfully"}

@router.get("/{component_id}/history", response_model=List[ComponentAuditLogResponse])
async def get_component_history(
    component_id: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Get audit trail for component changes"""
    try:
        component_uuid = uuid.UUID(component_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid component ID format")
    
    history = await component_service.get_component_audit_log(
        component_uuid, limit, db
    )
    return history

# Dimension management endpoints
@router.get("/{component_id}/dimensions", response_model=List[DimensionResponse])
async def get_component_dimensions(
    component_id: str,
    db: Session = Depends(get_db)
):
    """Get all dimensions for a component"""
    try:
        component_uuid = uuid.UUID(component_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid component ID format")
    
    dimensions = await component_service.get_component_dimensions(component_uuid, db)
    return dimensions

@router.post("/{component_id}/dimensions", response_model=DimensionResponse)
async def create_dimension(
    component_id: str,
    dimension_data: DimensionCreateRequest,
    db: Session = Depends(get_db)
):
    """Add a new dimension to a component"""
    try:
        component_uuid = uuid.UUID(component_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid component ID format")

    # Verify component exists
    component = db.query(Component).filter(Component.id == component_uuid).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")

    # Story 6.4: Validate dimension type uniqueness
    try:
        validate_dimension_type_unique(
            db,
            component_uuid,
            dimension_data.dimension_type
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    dimension = await component_service.create_dimension(
        component_uuid, dimension_data, db
    )
    return dimension

@router.put("/dimensions/{dimension_id}", response_model=DimensionResponse)
async def update_dimension(
    dimension_id: str,
    dimension_data: DimensionUpdateRequest,
    db: Session = Depends(get_db)
):
    """Update a dimension"""
    try:
        dimension_uuid = uuid.UUID(dimension_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid dimension ID format")

    # Story 6.4: Get existing dimension to check if type is changing
    existing_dimension = db.query(Dimension).filter(Dimension.id == dimension_uuid).first()
    if not existing_dimension:
        raise HTTPException(status_code=404, detail="Dimension not found")

    # Story 6.4: Validate uniqueness if dimension_type is changing
    if dimension_data.dimension_type != existing_dimension.dimension_type:
        try:
            validate_dimension_type_unique(
                db,
                existing_dimension.component_id,
                dimension_data.dimension_type,
                dimension_id=dimension_uuid  # Exclude self from check
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    dimension = await component_service.update_dimension(
        dimension_uuid, dimension_data, db
    )
    if not dimension:
        raise HTTPException(status_code=404, detail="Dimension not found")

    return dimension

@router.delete("/dimensions/{dimension_id}")
async def delete_dimension(
    dimension_id: str,
    db: Session = Depends(get_db)
):
    """Delete a dimension"""
    try:
        dimension_uuid = uuid.UUID(dimension_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid dimension ID format")
    
    success = await component_service.delete_dimension(dimension_uuid, db)
    if not success:
        raise HTTPException(status_code=404, detail="Dimension not found")
    
    return {"message": "Dimension deleted successfully"}

# Specification management endpoints
@router.get("/{component_id}/specifications", response_model=List[SpecificationResponse])
async def get_component_specifications(
    component_id: str,
    db: Session = Depends(get_db)
):
    """Get all specifications for a component"""
    try:
        component_uuid = uuid.UUID(component_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid component ID format")
    
    specs = await component_service.get_component_specifications(component_uuid, db)
    return specs

@router.post("/{component_id}/specifications", response_model=SpecificationResponse)
async def create_specification(
    component_id: str,
    spec_data: SpecificationCreateRequest,
    db: Session = Depends(get_db)
):
    """Add a new specification to a component"""
    try:
        component_uuid = uuid.UUID(component_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid component ID format")
    
    # Verify component exists
    component = db.query(Component).filter(Component.id == component_uuid).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")
    
    specification = await component_service.create_specification(
        component_uuid, spec_data, db
    )
    return specification

@router.put("/specifications/{spec_id}", response_model=SpecificationResponse)
async def update_specification(
    spec_id: str,
    spec_data: SpecificationUpdateRequest,
    db: Session = Depends(get_db)
):
    """Update a specification"""
    try:
        spec_uuid = uuid.UUID(spec_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid specification ID format")
    
    specification = await component_service.update_specification(
        spec_uuid, spec_data, db
    )
    if not specification:
        raise HTTPException(status_code=404, detail="Specification not found")
    
    return specification

@router.delete("/specifications/{spec_id}")
async def delete_specification(
    spec_id: str,
    db: Session = Depends(get_db)
):
    """Delete a specification"""
    try:
        spec_uuid = uuid.UUID(spec_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid specification ID format")
    
    success = await component_service.delete_specification(spec_uuid, db)
    if not success:
        raise HTTPException(status_code=404, detail="Specification not found")
    
    return {"message": "Specification deleted successfully"}

@router.post("/{component_id}/validate")
async def validate_component_data(
    component_id: str,
    update_data: ComponentUpdateRequest,
    db: Session = Depends(get_db)
):
    """Validate component data without saving (for real-time validation)"""
    try:
        component_uuid = uuid.UUID(component_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid component ID format")
    
    validation_result = await component_service.validate_component_update(
        component_uuid, update_data, db
    )
    
    return {
        "is_valid": validation_result.is_valid,
        "errors": validation_result.errors,
        "warnings": validation_result.warnings
    }

@router.get("/{component_id}/duplicates")
async def check_piece_mark_duplicates(
    component_id: str,
    piece_mark: str,
    db: Session = Depends(get_db)
):
    """Check for duplicate piece marks within the same drawing"""
    try:
        component_uuid = uuid.UUID(component_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid component ID format")

    duplicates = await component_service.check_piece_mark_duplicates(
        component_uuid, piece_mark, db
    )

    return {
        "has_duplicates": len(duplicates) > 0,
        "duplicate_components": duplicates
    }

@router.get("/suggest-instance/{drawing_id}/{piece_mark}")
async def suggest_instance_identifier(
    drawing_id: str,
    piece_mark: str,
    db: Session = Depends(get_db)
):
    """
    Suggest next available instance identifier for a piece mark in a drawing.

    Story 1.2 AC4: Auto-generate instance identifiers (.A, .B, .C) when piece mark already exists.

    Returns:
        {
            "suggested_identifier": "A" | null,
            "existing_count": 1,
            "message": "Piece mark 'G1' already exists. Suggested instance identifier: 'A'"
        }
    """
    try:
        drawing_uuid = uuid.UUID(drawing_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid drawing ID format")

    # Verify drawing exists
    drawing = db.query(Drawing).filter(Drawing.id == drawing_uuid).first()
    if not drawing:
        raise HTTPException(status_code=404, detail="Drawing not found")

    # Get suggestion from service
    suggested_identifier = component_service._get_next_instance_identifier(
        piece_mark=piece_mark,
        drawing_id=drawing_uuid,
        db=db
    )

    # Count existing instances
    existing_count = db.query(Component).filter(
        and_(
            Component.drawing_id == drawing_uuid,
            Component.piece_mark == piece_mark.upper()
        )
    ).count()

    # Build response
    if suggested_identifier:
        message = f"Piece mark '{piece_mark}' already exists ({existing_count} instance(s)). Suggested instance identifier: '{suggested_identifier}'"
    elif existing_count > 0:
        message = f"Piece mark '{piece_mark}' already exists ({existing_count} instance(s)). All A-Z identifiers used - please specify manually."
    else:
        message = f"Piece mark '{piece_mark}' is new in this drawing. No instance identifier needed."

    return {
        "suggested_identifier": suggested_identifier,
        "existing_count": existing_count,
        "message": message
    }