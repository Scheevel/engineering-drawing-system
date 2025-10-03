from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Query
from fastapi.responses import FileResponse
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.drawing_service import DrawingService
from app.models.drawing import DrawingResponse, DrawingListResponse
from app.models.project import ProjectSummaryResponse, AssignProjectsRequest, BulkAssignProjectsRequest, BulkRemoveProjectsRequest
from app.models.database import Component, Project, drawing_project_associations
import uuid
import os

router = APIRouter()
drawing_service = DrawingService()

@router.post("/upload", response_model=DrawingResponse)
async def upload_drawing(
    file: UploadFile = File(...),
    project_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Upload a new engineering drawing for processing"""
    if file.content_type not in ["application/pdf", "image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, JPEG, and PNG are supported.")
    
    try:
        result = await drawing_service.upload_drawing(file, project_id, db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{drawing_id}", response_model=DrawingResponse)
async def get_drawing(
    drawing_id: str,
    db: Session = Depends(get_db)
):
    """Get drawing details by ID"""
    drawing = await drawing_service.get_drawing(drawing_id, db)
    if not drawing:
        raise HTTPException(status_code=404, detail="Drawing not found")
    return drawing

@router.get("/", response_model=DrawingListResponse)
async def list_drawings(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List drawings with pagination and filters"""
    drawings = await drawing_service.list_drawings(
        page=page,
        limit=limit,
        project_id=project_id,
        status=status,
        db=db
    )
    return drawings

@router.delete("/{drawing_id}")
async def delete_drawing(
    drawing_id: str,
    db: Session = Depends(get_db)
):
    """Delete a drawing and its associated data"""
    success = await drawing_service.delete_drawing(drawing_id, db)
    if not success:
        raise HTTPException(status_code=404, detail="Drawing not found")
    return {"message": "Drawing deleted successfully"}

@router.get("/{drawing_id}/status")
async def get_processing_status(
    drawing_id: str,
    db: Session = Depends(get_db)
):
    """Get the processing status of a drawing"""
    status = await drawing_service.get_processing_status(drawing_id, db)
    if not status:
        raise HTTPException(status_code=404, detail="Drawing not found")
    return status

@router.get("/{drawing_id}/file")
async def serve_drawing_file(
    drawing_id: str,
    db: Session = Depends(get_db)
):
    """Serve the actual drawing file for viewing"""
    try:
        # Get drawing directly from database
        from app.models.database import Drawing as DrawingModel
        drawing = db.query(DrawingModel).filter(DrawingModel.id == drawing_id).first()
        
        if not drawing:
            raise HTTPException(status_code=404, detail="Drawing not found")
        
        # Check if file exists, with fallback paths for development/production mismatch
        file_path = drawing.file_path

        if not os.path.exists(file_path):
            # Try alternative paths for development/production compatibility
            filename = os.path.basename(file_path)
            alternative_paths = [
                os.path.join("./uploads", filename),           # Local development path
                os.path.join("uploads", filename),             # Relative path
                os.path.join("/app/uploads", filename),        # Container absolute path
                f"./uploads/{filename}",                       # Explicit local path
            ]

            for alt_path in alternative_paths:
                if os.path.exists(alt_path):
                    file_path = alt_path
                    print(f"Found file at alternative path: {alt_path}")
                    break
            else:
                raise HTTPException(status_code=404, detail=f"Drawing file not found on disk: {drawing.file_path} (also tried alternatives: {alternative_paths})")
        
        # Determine media type based on file extension
        file_ext = os.path.splitext(drawing.file_path)[1].lower()
        media_type_map = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png'
        }
        media_type = media_type_map.get(file_ext, 'application/octet-stream')
        
        return FileResponse(
            path=file_path,
            media_type=media_type,
            filename=drawing.original_name or drawing.file_name
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database session error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{drawing_id}/components")
async def get_drawing_components(
    drawing_id: str,
    db: Session = Depends(get_db)
):
    """Get all components for a drawing with their location data for highlighting"""
    try:
        drawing = await drawing_service.get_drawing(drawing_id, db)
        if not drawing:
            raise HTTPException(status_code=404, detail="Drawing not found")
        
        # Get all components for this drawing with location data
        components = db.query(Component).filter(Component.drawing_id == drawing_id).all()
        
        component_data = []
        for component in components:
            component_info = {
                "id": str(component.id),
                "piece_mark": component.piece_mark,
                "component_type": component.component_type,
                "description": component.description,
                "quantity": component.quantity,
                "location_x": component.location_x,
                "location_y": component.location_y,
                "bounding_box": component.bounding_box,
                "confidence_score": component.confidence_score
            }
            component_data.append(component_info)
        
        return {
            "drawing_id": drawing_id,
            "components": component_data,
            "total_components": len(component_data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Story 8.1a: Project-Drawing Association Endpoints (Many-to-Many)

@router.get("/{drawing_id}/projects", response_model=List[ProjectSummaryResponse])
async def get_drawing_projects(
    drawing_id: str,
    db: Session = Depends(get_db)
):
    """Get all projects associated with a drawing (Story 8.1a)"""
    from app.models.database import Drawing as DrawingModel

    # Verify drawing exists
    drawing = db.query(DrawingModel).filter(DrawingModel.id == drawing_id).first()
    if not drawing:
        raise HTTPException(status_code=404, detail="Drawing not found")

    # Get associated projects via junction table
    projects = db.query(Project).join(
        drawing_project_associations,
        Project.id == drawing_project_associations.c.project_id
    ).filter(
        drawing_project_associations.c.drawing_id == drawing_id
    ).all()

    # Manually convert to response model (UUID to string conversion)
    return [
        ProjectSummaryResponse(
            id=str(p.id),
            name=p.name,
            client=p.client,
            location=p.location
        )
        for p in projects
    ]

@router.post("/{drawing_id}/projects", response_model=dict)
async def assign_projects_to_drawing(
    drawing_id: str,
    request: AssignProjectsRequest,
    db: Session = Depends(get_db)
):
    """Assign multiple projects to a drawing (Story 8.1a)"""
    from app.models.database import Drawing as DrawingModel
    from sqlalchemy import insert
    from datetime import datetime

    # Verify drawing exists
    drawing = db.query(DrawingModel).filter(DrawingModel.id == drawing_id).first()
    if not drawing:
        raise HTTPException(status_code=404, detail="Drawing not found")

    # Verify all projects exist
    for project_id in request.project_ids:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    try:
        # Create associations (idempotent - silently skip duplicates)
        associations_created = 0
        for project_id in request.project_ids:
            # Check if association already exists
            existing = db.execute(
                drawing_project_associations.select().where(
                    (drawing_project_associations.c.drawing_id == drawing_id) &
                    (drawing_project_associations.c.project_id == project_id)
                )
            ).first()

            if not existing:
                db.execute(
                    insert(drawing_project_associations).values(
                        id=str(uuid.uuid4()),
                        drawing_id=drawing_id,
                        project_id=project_id,
                        assigned_at=datetime.utcnow(),
                        assigned_by="api"
                    )
                )
                associations_created += 1

        db.commit()
        return {
            "message": f"Successfully assigned {associations_created} project(s) to drawing",
            "drawing_id": drawing_id,
            "project_ids": request.project_ids,
            "associations_created": associations_created
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to assign projects: {str(e)}")

@router.delete("/{drawing_id}/projects/{project_id}")
async def remove_project_from_drawing(
    drawing_id: str,
    project_id: str,
    db: Session = Depends(get_db)
):
    """Remove a project association from a drawing (Story 8.1a)"""
    from sqlalchemy import delete

    try:
        # Delete the association
        result = db.execute(
            delete(drawing_project_associations).where(
                (drawing_project_associations.c.drawing_id == drawing_id) &
                (drawing_project_associations.c.project_id == project_id)
            )
        )
        db.commit()

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Association not found")

        return {
            "message": "Project association removed successfully",
            "drawing_id": drawing_id,
            "project_id": project_id
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to remove association: {str(e)}")

@router.post("/bulk/assign-projects")
async def bulk_assign_projects(
    request: BulkAssignProjectsRequest,
    db: Session = Depends(get_db)
):
    """Bulk assign projects to multiple drawings (Story 8.1a)

    Atomic operation: All assignments succeed or all fail
    """
    from app.models.database import Drawing as DrawingModel
    from sqlalchemy import insert
    from datetime import datetime

    # Verify all drawings exist
    for drawing_id in request.drawing_ids:
        drawing = db.query(DrawingModel).filter(DrawingModel.id == drawing_id).first()
        if not drawing:
            raise HTTPException(status_code=404, detail=f"Drawing {drawing_id} not found")

    # Verify all projects exist
    for project_id in request.project_ids:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    try:
        # Create all associations in single transaction (atomic)
        associations_created = 0
        for drawing_id in request.drawing_ids:
            for project_id in request.project_ids:
                # Check if association already exists
                existing = db.execute(
                    drawing_project_associations.select().where(
                        (drawing_project_associations.c.drawing_id == drawing_id) &
                        (drawing_project_associations.c.project_id == project_id)
                    )
                ).first()

                if not existing:
                    db.execute(
                        insert(drawing_project_associations).values(
                            id=str(uuid.uuid4()),
                            drawing_id=drawing_id,
                            project_id=project_id,
                            assigned_at=datetime.utcnow(),
                            assigned_by="api_bulk"
                        )
                    )
                    associations_created += 1

        db.commit()
        return {
            "message": f"Successfully created {associations_created} associations",
            "drawing_ids": request.drawing_ids,
            "project_ids": request.project_ids,
            "associations_created": associations_created,
            "total_possible": len(request.drawing_ids) * len(request.project_ids)
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Bulk assign failed (rolled back): {str(e)}")

@router.post("/bulk/remove-projects")
async def bulk_remove_projects(
    request: BulkRemoveProjectsRequest,
    db: Session = Depends(get_db)
):
    """Bulk remove project associations from multiple drawings (Story 8.1a)

    Atomic operation: All removals succeed or all fail
    """
    from sqlalchemy import delete

    try:
        # Delete all specified associations in single transaction (atomic)
        associations_removed = 0
        for drawing_id in request.drawing_ids:
            for project_id in request.project_ids:
                result = db.execute(
                    delete(drawing_project_associations).where(
                        (drawing_project_associations.c.drawing_id == drawing_id) &
                        (drawing_project_associations.c.project_id == project_id)
                    )
                )
                associations_removed += result.rowcount

        db.commit()
        return {
            "message": f"Successfully removed {associations_removed} associations",
            "drawing_ids": request.drawing_ids,
            "project_ids": request.project_ids,
            "associations_removed": associations_removed
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Bulk remove failed (rolled back): {str(e)}")