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
    query: str = Query("*", min_length=1),
    scope: Optional[List[str]] = Query(None),
    component_type: Optional[str] = None,
    project_id: Optional[str] = None,
    drawing_type: Optional[str] = None,
    instance_identifier: Optional[str] = Query(None, max_length=10, description="Filter by instance identifier"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Search for components across all drawings"""
    try:
        # Convert scope strings to SearchScope enums if provided
        from app.models.search import SearchScope
        parsed_scope = None
        if scope:
            parsed_scope = []
            for s in scope:
                try:
                    parsed_scope.append(SearchScope(s))
                except ValueError:
                    # Invalid scope value, skip it
                    continue
        
        search_request = SearchRequest(
            query=query,
            scope=parsed_scope if parsed_scope else [SearchScope.PIECE_MARK],
            component_type=component_type,
            project_id=project_id,
            drawing_type=drawing_type,
            instance_identifier=instance_identifier,
            page=page,
            limit=limit
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
    limit: int = Query(25, ge=1, le=100),
    page: int = Query(1, ge=1),
    component_type: Optional[str] = None,
    project_id: Optional[int] = None,
    confidence_quartile: Optional[int] = Query(None, ge=0, le=4, description="Filter by confidence quartile: 0=all, 1=0-24%, 2=25-49%, 3=50-74%, 4=75-100%"),
    instance_identifier: Optional[str] = Query(None, max_length=10, description="Filter by instance identifier"),
    db: Session = Depends(get_db)
):
    """Get recently added components for search page preview with optional filters"""
    try:
        offset = (page - 1) * limit
        recent_components = await search_service.get_recent_components(
            limit, db, offset,
            component_type=component_type,
            project_id=project_id,
            confidence_quartile=confidence_quartile,
            instance_identifier=instance_identifier
        )
        total_count = await search_service.get_total_components_count(
            db,
            component_type=component_type,
            project_id=project_id,
            confidence_quartile=confidence_quartile,
            instance_identifier=instance_identifier
        )
        return {
            "recent_components": recent_components,
            "total_available": total_count,
            "page": page,
            "limit": limit,
            "has_more": offset + len(recent_components) < total_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))