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
    ProjectStatsResponse
)

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
                {
                    "id": str(drawing.id),
                    "file_name": drawing.file_name,
                    "original_name": drawing.original_name,
                    "file_size": drawing.file_size,
                    "upload_date": drawing.upload_date,
                    "processing_status": drawing.processing_status,
                    "components_extracted": len(drawing.components)
                }
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