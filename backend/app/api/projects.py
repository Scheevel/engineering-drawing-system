"""
Project API endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.project_service import ProjectService
from app.models.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectWithDrawings,
    ProjectAssignRequest,
    ProjectStatsResponse,
    AssignProjectsRequest
)
from app.models.drawing import DrawingResponse
from app.models.database import Drawing, drawing_project_associations
import uuid
from datetime import datetime

router = APIRouter()

def get_project_service(db: Session = Depends(get_db)) -> ProjectService:
    """Dependency to get project service"""
    return ProjectService(db)

@router.get("/", response_model=List[ProjectResponse])
async def get_projects(
    skip: int = Query(0, ge=0, description="Number of projects to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of projects to return"),
    project_service: ProjectService = Depends(get_project_service)
):
    """Get all projects with pagination"""
    try:
        projects_with_counts = project_service.get_projects_with_drawing_counts(skip=skip, limit=limit)
        
        return [
            ProjectResponse(
                id=str(data["project"].id),
                name=data["project"].name,
                client=data["project"].client,
                location=data["project"].location,
                description=data["project"].description,
                created_at=data["project"].created_at,
                updated_at=data["project"].updated_at,
                drawing_count=data["drawing_count"]
            )
            for data in projects_with_counts
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")

@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    project_service: ProjectService = Depends(get_project_service)
):
    """Create a new project"""
    try:
        project = project_service.create_project(project_data)
        return ProjectResponse(
            id=str(project.id),
            name=project.name,
            client=project.client,
            location=project.location,
            description=project.description,
            created_at=project.created_at,
            updated_at=project.updated_at,
            drawing_count=0  # New project has no drawings
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create project: {str(e)}")

@router.get("/{project_id}", response_model=ProjectWithDrawings)
async def get_project(
    project_id: str,
    project_service: ProjectService = Depends(get_project_service)
):
    """Get a project by ID with its drawings"""
    try:
        project = project_service.get_project_by_id(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return ProjectWithDrawings(
            id=str(project.id),
            name=project.name,
            client=project.client,
            location=project.location,
            description=project.description,
            created_at=project.created_at,
            updated_at=project.updated_at,
            drawing_count=len(project.drawings),
            drawings=[
                DrawingResponse(
                    id=str(drawing.id),
                    file_name=drawing.file_name,
                    file_path=drawing.file_path,
                    file_size=drawing.file_size,
                    drawing_type=drawing.drawing_type,
                    sheet_number=drawing.sheet_number,
                    drawing_date=drawing.drawing_date,
                    project_id=str(drawing.project_id) if drawing.project_id else None,
                    processing_status=drawing.processing_status,
                    processing_progress=drawing.processing_progress or 0,
                    upload_date=drawing.upload_date,
                    error_message=drawing.error_message,
                    metadata=drawing.drawing_metadata,
                    is_duplicate=False,
                    projects=[],  # Omit for performance (avoid circular loading)
                    components_extracted=len(drawing.components) if drawing.components else 0
                )
                for drawing in project.drawings
            ]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch project: {str(e)}")

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    project_service: ProjectService = Depends(get_project_service)
):
    """Update a project"""
    try:
        project = project_service.update_project(project_id, project_data)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return ProjectResponse(
            id=str(project.id),
            name=project.name,
            client=project.client,
            location=project.location,
            description=project.description,
            created_at=project.created_at,
            updated_at=project.updated_at,
            drawing_count=len(project.drawings)
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update project: {str(e)}")

@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    project_service: ProjectService = Depends(get_project_service)
):
    """Delete a project (unassigns all drawings)"""
    try:
        success = project_service.delete_project(project_id)
        if not success:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return {"message": "Project deleted successfully", "project_id": project_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {str(e)}")

@router.post("/assign-drawings")
async def assign_drawings_to_project(
    assign_request: ProjectAssignRequest,
    project_service: ProjectService = Depends(get_project_service)
):
    """Assign multiple drawings to a project or unassign them"""
    try:
        result = project_service.assign_drawings_to_project(assign_request)
        return {
            "message": f"Successfully {result['action']} {result['updated_count']} drawings",
            "updated_count": result["updated_count"],
            "project_id": result["project_id"],
            "project_name": result["project_name"]
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to assign drawings: {str(e)}")

@router.get("/stats/overview", response_model=ProjectStatsResponse)
async def get_project_stats(
    project_service: ProjectService = Depends(get_project_service)
):
    """Get project statistics"""
    try:
        stats = project_service.get_project_stats()
        
        return ProjectStatsResponse(
            total_projects=stats["total_projects"],
            total_drawings_with_projects=stats["total_drawings_with_projects"],
            total_drawings_without_projects=stats["total_drawings_without_projects"],
            most_recent_project=ProjectResponse(
                id=str(stats["most_recent_project"].id),
                name=stats["most_recent_project"].name,
                client=stats["most_recent_project"].client,
                location=stats["most_recent_project"].location,
                description=stats["most_recent_project"].description,
                created_at=stats["most_recent_project"].created_at,
                updated_at=stats["most_recent_project"].updated_at,
                drawing_count=0  # Will be calculated if needed
            ) if stats["most_recent_project"] else None,
            largest_project=ProjectResponse(
                id=str(stats["largest_project"].id),
                name=stats["largest_project"].name,
                client=stats["largest_project"].client,
                location=stats["largest_project"].location,
                description=stats["largest_project"].description,
                created_at=stats["largest_project"].created_at,
                updated_at=stats["largest_project"].updated_at,
                drawing_count=0  # Will be calculated if needed
            ) if stats["largest_project"] else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch project stats: {str(e)}")

# Story 8.1a: Project-Drawing Association Endpoints (Many-to-Many)

@router.get("/{project_id}/drawings", response_model=List[DrawingResponse])
async def get_project_drawings(
    project_id: str,
    db: Session = Depends(get_db)
):
    """Get all drawings associated with a project (Story 8.1a)"""
    from app.models.database import Project as ProjectModel

    # Verify project exists
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get associated drawings via junction table
    drawings = db.query(Drawing).join(
        drawing_project_associations,
        Drawing.id == drawing_project_associations.c.drawing_id
    ).filter(
        drawing_project_associations.c.project_id == project_id
    ).all()

    # Convert to response model (handles UUID to string + projects array)
    return [
        DrawingResponse(
            id=str(d.id),
            file_name=d.file_name,
            drawing_type=d.drawing_type,
            sheet_number=d.sheet_number,
            drawing_date=d.drawing_date,
            project_id=str(d.project_id) if d.project_id else None,
            file_path=d.file_path,
            file_size=d.file_size,
            processing_status=d.processing_status,
            processing_progress=d.processing_progress,
            upload_date=d.upload_date,
            error_message=d.error_message,
            metadata=d.drawing_metadata,
            is_duplicate=False,
            projects=[],  # Not eagerly loading projects for performance
            components_extracted=len(d.components)
        )
        for d in drawings
    ]

@router.post("/{project_id}/drawings", response_model=dict)
async def assign_drawings_to_project_new(
    project_id: str,
    request: AssignProjectsRequest,
    db: Session = Depends(get_db)
):
    """Assign multiple drawings to a project (Story 8.1a)

    Note: drawing_ids in request body, project_id in path
    """
    from app.models.database import Project as ProjectModel
    from sqlalchemy import insert

    # Verify project exists
    project = db.query(ProjectModel).filter(ProjectModel.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Note: Request uses "project_ids" field name but we're treating it as "drawing_ids"
    # This is because AssignProjectsRequest was designed for drawings endpoint
    # The field is actually drawing IDs here
    drawing_ids = request.project_ids  # Field name is project_ids but contains drawing IDs

    # Verify all drawings exist
    for drawing_id in drawing_ids:
        drawing = db.query(Drawing).filter(Drawing.id == drawing_id).first()
        if not drawing:
            raise HTTPException(status_code=404, detail=f"Drawing {drawing_id} not found")

    try:
        # Create associations (idempotent - silently skip duplicates)
        associations_created = 0
        for drawing_id in drawing_ids:
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
            "message": f"Successfully assigned {associations_created} drawing(s) to project",
            "project_id": project_id,
            "drawing_ids": drawing_ids,
            "associations_created": associations_created
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to assign drawings: {str(e)}")

@router.delete("/{project_id}/drawings/{drawing_id}")
async def remove_drawing_from_project(
    project_id: str,
    drawing_id: str,
    db: Session = Depends(get_db)
):
    """Remove a drawing association from a project (Story 8.1a)"""
    from sqlalchemy import delete

    try:
        # Delete the association
        result = db.execute(
            delete(drawing_project_associations).where(
                (drawing_project_associations.c.project_id == project_id) &
                (drawing_project_associations.c.drawing_id == drawing_id)
            )
        )
        db.commit()

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Association not found")

        return {
            "message": "Drawing association removed successfully",
            "project_id": project_id,
            "drawing_id": drawing_id
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to remove association: {str(e)}")