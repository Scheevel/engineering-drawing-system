from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc
import logging
from datetime import datetime
import json

from app.models.database import Component, Drawing, Project, Dimension, Specification
from app.models.search import SearchRequest, SearchResponse, ComponentSearchResult
from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    from elasticsearch import Elasticsearch
    ES_AVAILABLE = True
except ImportError:
    ES_AVAILABLE = False
    logger.warning("Elasticsearch not available, search will use database only")

class SearchService:
    def __init__(self):
        self.es = None
        if ES_AVAILABLE:
            try:
                self.es = Elasticsearch([settings.ELASTICSEARCH_URL])
                if not self.es.ping():
                    logger.warning("Elasticsearch connection failed")
                    self.es = None
            except Exception as e:
                logger.warning(f"Could not connect to Elasticsearch: {e}")
                self.es = None
    
    async def search_components(self, request: SearchRequest, db: Session) -> SearchResponse:
        """Search for components across all drawings"""
        start_time = datetime.now()
        
        try:
            # Build base query with joins
            query = db.query(Component).join(Drawing).outerjoin(Project)
            
            # Apply text search (skip if query is wildcard for filter-only searches)
            if request.query and request.query != "*":
                # Standard search with exact match, prefix match, and substring match
                text_filter = or_(
                    Component.piece_mark == request.query,
                    Component.piece_mark.ilike(f"{request.query}%"),
                    Component.piece_mark.ilike(f"%{request.query}%"),
                    Component.component_type.ilike(f"%{request.query}%"),
                    Component.description.ilike(f"%{request.query}%")
                )
                
                query = query.filter(text_filter)
            
            # Apply filters
            if request.component_type:
                query = query.filter(Component.component_type == request.component_type)
            
            if request.project_id:
                query = query.filter(Drawing.project_id == request.project_id)
            
            if request.drawing_type:
                query = query.filter(Drawing.drawing_type == request.drawing_type)
            
            # Get total count
            total = query.count()
            
            # Apply pagination and sorting
            offset = (request.page - 1) * request.limit
            
            if request.sort_by == "date":
                query = query.order_by(desc(Component.created_at) if request.sort_order == "desc" else Component.created_at)
            elif request.sort_by == "name":
                query = query.order_by(desc(Component.piece_mark) if request.sort_order == "desc" else Component.piece_mark)
            else:  # relevance
                if request.query and request.query != "*":
                    # Simple relevance: exact matches first, then partial matches
                    from sqlalchemy import case
                    query = query.order_by(
                        desc(case((Component.piece_mark == request.query, 1), else_=0)),
                        Component.piece_mark
                    )
                else:
                    # For filter-only searches, order by created date (newest first)
                    query = query.order_by(desc(Component.created_at))
            
            # Execute query with eager loading
            components = query.options(
                joinedload(Component.drawing).joinedload(Drawing.project),
                joinedload(Component.dimensions),
                joinedload(Component.specifications)
            ).offset(offset).limit(request.limit).all()
            
            # Convert to response format
            results = []
            for component in components:
                result = ComponentSearchResult(
                    id=str(component.id),
                    piece_mark=component.piece_mark,
                    component_type=component.component_type,
                    description=component.description,
                    quantity=component.quantity,
                    material_type=component.material_type,
                    confidence_score=component.confidence_score,
                    drawing_id=str(component.drawing_id),
                    drawing_file_name=component.drawing.file_name,
                    drawing_type=component.drawing.drawing_type,
                    sheet_number=component.drawing.sheet_number,
                    project_name=component.drawing.project.name if component.drawing.project else None,
                    location_x=component.location_x,
                    location_y=component.location_y,
                    bounding_box=component.bounding_box,
                    dimensions=[{
                        "type": dim.dimension_type,
                        "value": dim.nominal_value,
                        "unit": dim.unit,
                        "tolerance": dim.tolerance
                    } for dim in component.dimensions],
                    specifications=[{
                        "type": spec.specification_type,
                        "value": spec.value,
                        "description": spec.description
                    } for spec in component.specifications],
                    created_at=component.created_at,
                    updated_at=component.updated_at
                )
                results.append(result)
            
            # Calculate search time
            search_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            return SearchResponse(
                query=request.query,
                results=results,
                total=total,
                page=request.page,
                limit=request.limit,
                has_next=(request.page * request.limit) < total,
                has_prev=request.page > 1,
                search_time_ms=search_time,
                filters_applied={
                    "component_type": request.component_type,
                    "project_id": request.project_id,
                    "drawing_type": request.drawing_type
                }
            )
            
        except Exception as e:
            logger.error(f"Error searching components: {str(e)}")
            raise
    
    async def get_component_details(self, component_id: str, db: Session) -> Optional[ComponentSearchResult]:
        """Get detailed information about a specific component"""
        try:
            component = db.query(Component).options(
                joinedload(Component.drawing).joinedload(Drawing.project),
                joinedload(Component.dimensions),
                joinedload(Component.specifications)
            ).filter(Component.id == component_id).first()
            
            if not component:
                return None
            
            return ComponentSearchResult(
                id=str(component.id),
                piece_mark=component.piece_mark,
                component_type=component.component_type,
                description=component.description,
                quantity=component.quantity,
                material_type=component.material_type,
                confidence_score=component.confidence_score,
                drawing_id=str(component.drawing_id),
                drawing_file_name=component.drawing.file_name,
                drawing_type=component.drawing.drawing_type,
                sheet_number=component.drawing.sheet_number,
                project_name=component.drawing.project.name if component.drawing.project else None,
                location_x=component.location_x,
                location_y=component.location_y,
                bounding_box=component.bounding_box,
                dimensions=[{
                    "type": dim.dimension_type,
                    "value": dim.nominal_value,
                    "unit": dim.unit,
                    "tolerance": dim.tolerance
                } for dim in component.dimensions],
                specifications=[{
                    "type": spec.specification_type,
                    "value": spec.value,
                    "description": spec.description
                } for spec in component.specifications],
                created_at=component.created_at,
                updated_at=component.updated_at
            )
            
        except Exception as e:
            logger.error(f"Error getting component details for {component_id}: {str(e)}")
            raise
    
    async def get_suggestions(self, prefix: str, limit: int, db: Session) -> List[str]:
        """Get search suggestions based on prefix"""
        try:
            # Get piece mark suggestions
            piece_marks = db.query(Component.piece_mark)\
                           .filter(Component.piece_mark.ilike(f"{prefix}%"))\
                           .distinct()\
                           .limit(limit)\
                           .all()
            
            suggestions = [pm[0] for pm in piece_marks]
            
            # If we have room, add component type suggestions
            if len(suggestions) < limit:
                remaining = limit - len(suggestions)
                component_types = db.query(Component.component_type)\
                                   .filter(Component.component_type.ilike(f"{prefix}%"))\
                                   .distinct()\
                                   .limit(remaining)\
                                   .all()
                
                suggestions.extend([ct[0] for ct in component_types if ct[0] not in suggestions])
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Error getting suggestions for '{prefix}': {str(e)}")
            return []
    
    async def get_recent_components(self, limit: int, db: Session, offset: int = 0) -> List[ComponentSearchResult]:
        """Get recently added components for search page preview"""
        try:
            # Get recent components with drawing and project info
            components = db.query(Component).options(
                joinedload(Component.drawing).joinedload(Drawing.project),
                joinedload(Component.dimensions),
                joinedload(Component.specifications)
            ).order_by(desc(Component.created_at)).offset(offset).limit(limit).all()
            
            # Convert to response format
            results = []
            for component in components:
                result = ComponentSearchResult(
                    id=str(component.id),
                    piece_mark=component.piece_mark,
                    component_type=component.component_type,
                    description=component.description,
                    quantity=component.quantity,
                    material_type=component.material_type,
                    confidence_score=component.confidence_score,
                    drawing_id=str(component.drawing_id),
                    drawing_file_name=component.drawing.file_name,
                    drawing_type=component.drawing.drawing_type,
                    sheet_number=component.drawing.sheet_number,
                    project_name=component.drawing.project.name if component.drawing.project else None,
                    location_x=component.location_x,
                    location_y=component.location_y,
                    bounding_box=component.bounding_box,
                    dimensions=[{
                        "type": dim.dimension_type,
                        "value": dim.nominal_value,
                        "unit": dim.unit,
                        "tolerance": dim.tolerance
                    } for dim in component.dimensions],
                    specifications=[{
                        "type": spec.specification_type,
                        "value": spec.value,
                        "description": spec.description
                    } for spec in component.specifications],
                    created_at=component.created_at,
                    updated_at=component.updated_at
                )
                results.append(result)
            
            return results
            
        except Exception as e:
            logger.error(f"Error getting recent components: {str(e)}")
            return []
    
    async def get_total_components_count(self, db: Session) -> int:
        """Get total count of components in the system"""
        try:
            return db.query(Component).count()
        except Exception as e:
            logger.error(f"Error getting total components count: {str(e)}")
            return 0
    
    async def advanced_search(self, filters: Dict[str, Any], db: Session) -> Dict[str, Any]:
        """Advanced search with multiple filters and conditions"""
        try:
            # This would implement complex filtering logic
            # For now, return a simple implementation
            query = db.query(Component).join(Drawing)
            
            # Apply various filters based on the filters dict
            for key, value in filters.items():
                if key == "piece_mark_contains":
                    query = query.filter(Component.piece_mark.ilike(f"%{value}%"))
                elif key == "component_type_in":
                    query = query.filter(Component.component_type.in_(value))
                elif key == "quantity_greater_than":
                    query = query.filter(Component.quantity > value)
                # Add more filter conditions as needed
            
            components = query.limit(100).all()
            
            return {
                "results": [{
                    "id": str(c.id),
                    "piece_mark": c.piece_mark,
                    "component_type": c.component_type,
                    "quantity": c.quantity
                } for c in components],
                "total": len(components)
            }
            
        except Exception as e:
            logger.error(f"Error in advanced search: {str(e)}")
            raise
    
    def index_drawing(self, drawing: Drawing, db: Session) -> bool:
        """Index drawing and its components in Elasticsearch"""
        if not self.es:
            logger.info("Elasticsearch not available, skipping indexing")
            return False
        
        try:
            # Get all components for this drawing
            components = db.query(Component).options(
                joinedload(Component.dimensions),
                joinedload(Component.specifications)
            ).filter(Component.drawing_id == drawing.id).all()
            
            # Index each component
            for component in components:
                doc = {
                    "id": str(component.id),
                    "piece_mark": component.piece_mark,
                    "component_type": component.component_type,
                    "description": component.description,
                    "quantity": component.quantity,
                    "material_type": component.material_type,
                    "confidence_score": component.confidence_score,
                    "location_x": component.location_x,
                    "location_y": component.location_y,
                    "drawing": {
                        "id": str(drawing.id),
                        "file_name": drawing.file_name,
                        "drawing_type": drawing.drawing_type,
                        "sheet_number": drawing.sheet_number,
                        "project_id": str(drawing.project_id) if drawing.project_id else None
                    },
                    "dimensions": [{
                        "type": dim.dimension_type,
                        "value": dim.nominal_value,
                        "unit": dim.unit,
                        "tolerance": dim.tolerance
                    } for dim in component.dimensions],
                    "specifications": [{
                        "type": spec.specification_type,
                        "value": spec.value,
                        "description": spec.description
                    } for spec in component.specifications],
                    "indexed_at": datetime.utcnow().isoformat(),
                    "full_text": f"{component.piece_mark} {component.component_type or ''} {component.description or ''}"
                }
                
                # Index the document
                self.es.index(
                    index="components",
                    id=str(component.id),
                    body=doc
                )
            
            # Also index the drawing itself
            drawing_doc = {
                "id": str(drawing.id),
                "file_name": drawing.file_name,
                "drawing_type": drawing.drawing_type,
                "sheet_number": drawing.sheet_number,
                "processing_status": drawing.processing_status,
                "upload_date": drawing.upload_date.isoformat() if drawing.upload_date else None,
                "project_id": str(drawing.project_id) if drawing.project_id else None,
                "components_count": len(components),
                "indexed_at": datetime.utcnow().isoformat()
            }
            
            self.es.index(
                index="drawings",
                id=str(drawing.id),
                body=drawing_doc
            )
            
            # Refresh indices to make documents searchable immediately
            self.es.indices.refresh(index="components")
            self.es.indices.refresh(index="drawings")
            
            logger.info(f"Successfully indexed drawing {drawing.id} with {len(components)} components")
            return True
            
        except Exception as e:
            logger.error(f"Error indexing drawing {drawing.id}: {str(e)}")
            return False