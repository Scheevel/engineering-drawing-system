"""
Saved Search API Endpoints

Provides REST API for managing saved searches within projects.
"""
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from typing import List
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.saved_search_service import SavedSearchService
from app.models.search import (
    SavedSearchCreate, SavedSearchUpdate, SavedSearchResponse,
    SavedSearchListResponse, SavedSearchExecutionRequest, SearchResponse
)

router = APIRouter()
saved_search_service = SavedSearchService()

@router.post("/", response_model=SavedSearchResponse)
async def create_saved_search(
    search_data: SavedSearchCreate,
    db: Session = Depends(get_db)
):
    """Create a new saved search for a project"""
    try:
        return await saved_search_service.create_saved_search(search_data, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create saved search: {str(e)}")

@router.get("/project/{project_id}", response_model=SavedSearchListResponse)
async def get_saved_searches_for_project(
    project_id: str = Path(..., description="Project ID to get saved searches for"),
    db: Session = Depends(get_db)
):
    """Get all saved searches for a specific project"""
    try:
        return await saved_search_service.get_saved_searches_for_project(project_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve saved searches: {str(e)}")

@router.get("/{search_id}", response_model=SavedSearchResponse)
async def get_saved_search(
    search_id: str = Path(..., description="Saved search ID"),
    db: Session = Depends(get_db)
):
    """Get a specific saved search by ID"""
    try:
        result = await saved_search_service.get_saved_search(search_id, db)
        if not result:
            raise HTTPException(status_code=404, detail="Saved search not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve saved search: {str(e)}")

@router.put("/{search_id}", response_model=SavedSearchResponse)
async def update_saved_search(
    search_id: str = Path(..., description="Saved search ID"),
    update_data: SavedSearchUpdate = ...,
    db: Session = Depends(get_db)
):
    """Update an existing saved search"""
    try:
        result = await saved_search_service.update_saved_search(search_id, update_data, db)
        if not result:
            raise HTTPException(status_code=404, detail="Saved search not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update saved search: {str(e)}")

@router.delete("/{search_id}")
async def delete_saved_search(
    search_id: str = Path(..., description="Saved search ID"),
    db: Session = Depends(get_db)
):
    """Delete a saved search"""
    try:
        success = await saved_search_service.delete_saved_search(search_id, db)
        if not success:
            raise HTTPException(status_code=404, detail="Saved search not found")
        return {"message": "Saved search deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete saved search: {str(e)}")

@router.post("/{search_id}/execute", response_model=SearchResponse)
async def execute_saved_search(
    search_id: str = Path(..., description="Saved search ID"),
    execution_request: SavedSearchExecutionRequest = ...,
    db: Session = Depends(get_db)
):
    """Execute a saved search and return results"""
    try:
        return await saved_search_service.execute_saved_search(
            search_id, 
            db,
            execution_request.page, 
            execution_request.limit
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to execute saved search: {str(e)}")

@router.put("/project/{project_id}/reorder")
async def reorder_saved_searches(
    project_id: str = Path(..., description="Project ID"),
    search_order: List[str] = ...,
    db: Session = Depends(get_db)
):
    """Reorder saved searches for a project"""
    try:
        success = await saved_search_service.reorder_saved_searches(project_id, search_order, db)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to reorder saved searches")
        return {"message": "Saved searches reordered successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reorder saved searches: {str(e)}")

@router.get("/project/{project_id}/count")
async def get_saved_search_count(
    project_id: str = Path(..., description="Project ID"),
    db: Session = Depends(get_db)
):
    """Get count of saved searches for a project (for limit checking)"""
    try:
        searches = await saved_search_service.get_saved_searches_for_project(project_id, db)
        return {
            "count": searches.total,
            "max_allowed": searches.max_searches_per_project,
            "remaining": searches.max_searches_per_project - searches.total
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get saved search count: {str(e)}")