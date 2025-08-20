"""
Saved Search Service

Handles business logic for saved searches including CRUD operations,
project limits enforcement, and execution tracking.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from datetime import datetime
import logging

from app.models.database import SavedSearch, Project
from app.models.search import (
    SavedSearchCreate, SavedSearchUpdate, SavedSearchResponse, 
    SavedSearchListResponse, SearchRequest, SearchScope
)
from app.services.search_service import SearchService
from app.utils.query_parser import parse_search_query

logger = logging.getLogger(__name__)

class SavedSearchService:
    """Service for managing saved searches within projects"""
    
    MAX_SEARCHES_PER_PROJECT = 50
    
    def __init__(self):
        self.search_service = SearchService()
    
    async def create_saved_search(
        self, 
        search_data: SavedSearchCreate, 
        db: Session,
        user_id: Optional[str] = None
    ) -> SavedSearchResponse:
        """Create a new saved search for a project"""
        
        # Verify project exists
        project = db.query(Project).filter(Project.id == search_data.project_id).first()
        if not project:
            raise ValueError(f"Project {search_data.project_id} not found")
        
        # Check project search limit
        current_count = db.query(func.count(SavedSearch.id)).filter(
            SavedSearch.project_id == search_data.project_id
        ).scalar()
        
        if current_count >= self.MAX_SEARCHES_PER_PROJECT:
            raise ValueError(f"Maximum {self.MAX_SEARCHES_PER_PROJECT} saved searches per project exceeded")
        
        # Get next display order
        max_order = db.query(func.max(SavedSearch.display_order)).filter(
            SavedSearch.project_id == search_data.project_id
        ).scalar() or 0
        
        # Create saved search
        saved_search = SavedSearch(
            project_id=search_data.project_id,
            name=search_data.name,
            description=search_data.description,
            query=search_data.query,
            scope=[scope.value for scope in search_data.scope],
            component_type=search_data.component_type,
            drawing_type=search_data.drawing_type,
            sort_by=search_data.sort_by,
            sort_order=search_data.sort_order,
            display_order=max_order + 1,
            created_by=user_id
        )
        
        db.add(saved_search)
        db.commit()
        db.refresh(saved_search)
        
        logger.info(f"Created saved search '{saved_search.name}' for project {search_data.project_id}")
        
        return self._to_response_model(saved_search)
    
    async def get_saved_searches_for_project(
        self, 
        project_id: str, 
        db: Session
    ) -> SavedSearchListResponse:
        """Get all saved searches for a project, ordered by display_order"""
        
        searches = db.query(SavedSearch).filter(
            SavedSearch.project_id == project_id
        ).order_by(SavedSearch.display_order, SavedSearch.created_at).all()
        
        search_responses = [self._to_response_model(search) for search in searches]
        
        return SavedSearchListResponse(
            searches=search_responses,
            total=len(search_responses),
            project_id=project_id,
            max_searches_per_project=self.MAX_SEARCHES_PER_PROJECT
        )
    
    async def get_saved_search(self, search_id: str, db: Session) -> Optional[SavedSearchResponse]:
        """Get a specific saved search by ID"""
        
        saved_search = db.query(SavedSearch).filter(SavedSearch.id == search_id).first()
        if not saved_search:
            return None
            
        return self._to_response_model(saved_search)
    
    async def update_saved_search(
        self, 
        search_id: str, 
        update_data: SavedSearchUpdate, 
        db: Session
    ) -> Optional[SavedSearchResponse]:
        """Update an existing saved search"""
        
        saved_search = db.query(SavedSearch).filter(SavedSearch.id == search_id).first()
        if not saved_search:
            return None
        
        # Update fields if provided
        if update_data.name is not None:
            saved_search.name = update_data.name
        if update_data.description is not None:
            saved_search.description = update_data.description
        if update_data.query is not None:
            saved_search.query = update_data.query
        if update_data.scope is not None:
            saved_search.scope = [scope.value for scope in update_data.scope]
        if update_data.component_type is not None:
            saved_search.component_type = update_data.component_type
        if update_data.drawing_type is not None:
            saved_search.drawing_type = update_data.drawing_type
        if update_data.sort_by is not None:
            saved_search.sort_by = update_data.sort_by
        if update_data.sort_order is not None:
            saved_search.sort_order = update_data.sort_order
        if update_data.display_order is not None:
            saved_search.display_order = update_data.display_order
        
        saved_search.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(saved_search)
        
        logger.info(f"Updated saved search {search_id}")
        
        return self._to_response_model(saved_search)
    
    async def delete_saved_search(self, search_id: str, db: Session) -> bool:
        """Delete a saved search"""
        
        saved_search = db.query(SavedSearch).filter(SavedSearch.id == search_id).first()
        if not saved_search:
            return False
        
        project_id = saved_search.project_id
        display_order = saved_search.display_order
        
        db.delete(saved_search)
        
        # Reorder remaining searches to fill the gap
        await self._reorder_searches_after_deletion(project_id, display_order, db)
        
        db.commit()
        
        logger.info(f"Deleted saved search {search_id}")
        
        return True
    
    async def execute_saved_search(
        self, 
        search_id: str, 
        db: Session,
        page: int = 1, 
        limit: int = 20
    ):
        """Execute a saved search and return results"""
        
        saved_search = db.query(SavedSearch).filter(SavedSearch.id == search_id).first()
        if not saved_search:
            raise ValueError(f"Saved search {search_id} not found")
        
        # Convert saved search to SearchRequest
        search_request = SearchRequest(
            query=saved_search.query,
            scope=[SearchScope(scope) for scope in saved_search.scope],
            component_type=saved_search.component_type,
            project_id=str(saved_search.project_id),
            drawing_type=saved_search.drawing_type,
            page=page,
            limit=limit,
            sort_by=saved_search.sort_by,
            sort_order=saved_search.sort_order
        )
        
        # Execute the search
        results = await self.search_service.search_components(search_request, db)
        
        # Update execution tracking
        saved_search.last_executed = datetime.utcnow()
        saved_search.execution_count = (saved_search.execution_count or 0) + 1
        db.commit()
        
        logger.info(f"Executed saved search {search_id}, returned {len(results.results)} results")
        
        return results
    
    async def reorder_saved_searches(
        self, 
        project_id: str, 
        search_order: List[str], 
        db: Session
    ) -> bool:
        """Reorder saved searches for a project"""
        
        # Verify all searches belong to the project
        searches = db.query(SavedSearch).filter(
            and_(
                SavedSearch.project_id == project_id,
                SavedSearch.id.in_(search_order)
            )
        ).all()
        
        if len(searches) != len(search_order):
            raise ValueError("Invalid search IDs provided for reordering")
        
        # Update display orders
        for index, search_id in enumerate(search_order):
            search = next(s for s in searches if str(s.id) == search_id)
            search.display_order = index + 1
            search.updated_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"Reordered {len(search_order)} saved searches for project {project_id}")
        
        return True
    
    async def _reorder_searches_after_deletion(
        self, 
        project_id: str, 
        deleted_order: int, 
        db: Session
    ):
        """Reorder searches after one is deleted to remove gaps"""
        
        searches_to_update = db.query(SavedSearch).filter(
            and_(
                SavedSearch.project_id == project_id,
                SavedSearch.display_order > deleted_order
            )
        ).all()
        
        for search in searches_to_update:
            search.display_order -= 1
            search.updated_at = datetime.utcnow()
    
    def _to_response_model(self, saved_search: SavedSearch) -> SavedSearchResponse:
        """Convert database model to response model"""
        
        # Generate preview query type
        preview_query_type = None
        try:
            parsed_query = parse_search_query(saved_search.query)
            preview_query_type = parsed_query.query_type
        except Exception:
            # If parsing fails, default to simple
            from app.models.search import SearchQueryType
            preview_query_type = SearchQueryType.SIMPLE
        
        return SavedSearchResponse(
            id=str(saved_search.id),
            project_id=str(saved_search.project_id),
            name=saved_search.name,
            description=saved_search.description,
            query=saved_search.query,
            scope=[SearchScope(scope) for scope in saved_search.scope],
            component_type=saved_search.component_type,
            drawing_type=saved_search.drawing_type,
            sort_by=saved_search.sort_by,
            sort_order=saved_search.sort_order,
            display_order=saved_search.display_order,
            last_executed=saved_search.last_executed,
            execution_count=saved_search.execution_count or 0,
            created_by=saved_search.created_by,
            created_at=saved_search.created_at,
            updated_at=saved_search.updated_at,
            preview_query_type=preview_query_type
        )