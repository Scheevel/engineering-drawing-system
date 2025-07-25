from fastapi import APIRouter, Query, Depends, HTTPException
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.search_service import SearchService
from app.models.search import SearchRequest, SearchResponse, ComponentSearchResult

router = APIRouter()
search_service = SearchService()

@router.get("/components", response_model=SearchResponse)
async def search_components(
    query: str = Query(..., min_length=1),
    component_type: Optional[str] = None,
    project_id: Optional[str] = None,
    drawing_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    fuzzy: bool = Query(False),
    db: Session = Depends(get_db)
):
    """Search for components across all drawings"""
    try:
        search_request = SearchRequest(
            query=query,
            component_type=component_type,
            project_id=project_id,
            drawing_type=drawing_type,
            page=page,
            limit=limit,
            fuzzy=fuzzy
        )
        
        results = await search_service.search_components(search_request, db)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/components/{component_id}", response_model=ComponentSearchResult)
async def get_component_details(
    component_id: str,
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific component"""
    component = await search_service.get_component_details(component_id, db)
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")
    return component

@router.post("/advanced")
async def advanced_search(
    filters: dict,
    db: Session = Depends(get_db)
):
    """Advanced search with multiple filters and conditions"""
    try:
        results = await search_service.advanced_search(filters, db)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/suggestions")
async def get_search_suggestions(
    prefix: str = Query(..., min_length=2),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Get search suggestions based on prefix"""
    suggestions = await search_service.get_suggestions(prefix, limit, db)
    return {"suggestions": suggestions}

@router.get("/recent")
async def get_recent_components(
    limit: int = Query(6, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """Get recently added components for search page preview"""
    try:
        recent_components = await search_service.get_recent_components(limit, db)
        return {
            "recent_components": recent_components,
            "total_available": await search_service.get_total_components_count(db)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))