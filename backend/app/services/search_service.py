from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, asc
import logging
from datetime import datetime
import json

from app.models.database import Component, Drawing, Project, Dimension, Specification
from app.models.search import SearchRequest, SearchResponse, ComponentSearchResult, SearchScope, SearchQueryType
from app.core.config import settings
from app.utils.search_errors import validate_search_query
from app.utils.query_parser import parse_search_query, build_search_filter

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
        """Search for components across all drawings with enhanced query parsing"""
        start_time = datetime.now()
        
        try:
            # Validate and parse the search query
            validation_result = validate_search_query(request.query, request.scope)
            
            if not validation_result.is_valid:
                # Return error response with validation details
                return SearchResponse(
                    query=request.query,
                    scope=request.scope,
                    query_type=SearchQueryType.SIMPLE,
                    results=[],
                    total=0,
                    page=request.page,
                    limit=request.limit,
                    has_next=False,
                    has_prev=False,
                    search_time_ms=0,
                    complexity_score=0,
                    filters_applied={
                        "component_type": request.component_type,
                        "project_id": request.project_id,
                        "drawing_type": request.drawing_type,
                        "instance_identifier": request.instance_identifier
                    },
                    warnings=[validation_result.error.message] if validation_result.error else []
                )
            
            # Parse query for enhanced search capabilities
            parsed_query = parse_search_query(request.query)
            
            # Build base query with joins
            query = db.query(Component).join(Drawing).outerjoin(Project)
            
            # Apply scope-based text search (skip if query is wildcard for filter-only searches)
            if request.query and request.query != "*":
                # Determine which fields to search based on scope
                search_fields = []
                scope_field_names = []
                for scope in request.scope:
                    if scope == SearchScope.PIECE_MARK:
                        search_fields.append(Component.piece_mark)
                        scope_field_names.append("piece_mark")
                    elif scope == SearchScope.COMPONENT_TYPE:
                        search_fields.append(Component.component_type)
                        scope_field_names.append("component_type")
                    elif scope == SearchScope.DESCRIPTION:
                        search_fields.append(Component.description)
                        scope_field_names.append("description")
                
                logger.info(f"Searching query '{request.query}' in scope fields: {scope_field_names}")
                
                # Build enhanced search filter
                if search_fields:
                    try:
                        text_filter = build_search_filter(parsed_query, search_fields)
                        if text_filter is not None:
                            query = query.filter(text_filter)
                    except Exception as e:
                        logger.warning(f"Enhanced search failed, falling back to simple search: {e}")
                        # Fallback to simple search ONLY within the specified scope fields
                        scope_filters = []
                        for field in search_fields:
                            scope_filters.append(field.ilike(f"%{request.query}%"))
                        
                        if scope_filters:
                            text_filter = or_(*scope_filters)
                            query = query.filter(text_filter)
            
            # Apply additional filters
            if request.component_type:
                query = query.filter(Component.component_type == request.component_type)
            
            if request.project_id:
                query = query.filter(Drawing.project_id == request.project_id)
            
            if request.drawing_type:
                query = query.filter(Drawing.drawing_type == request.drawing_type)
            
            if request.instance_identifier is not None:
                # Filter by instance_identifier (support both string values and None for backward compatibility)
                if request.instance_identifier == "":
                    # Empty string treated as no filter
                    pass
                else:
                    query = query.filter(Component.instance_identifier == request.instance_identifier)

            # Apply confidence filtering
            if request.confidence_min is not None:
                query = query.filter(Component.confidence_score >= request.confidence_min)

            if request.confidence_max is not None:
                query = query.filter(Component.confidence_score <= request.confidence_max)

            # Get total count
            total = query.count()
            
            # Apply pagination and sorting
            offset = (request.page - 1) * request.limit

            # Enhanced sorting with support for more fields
            sort_field_map = {
                "date": Component.created_at,
                "created_at": Component.created_at,
                "name": Component.piece_mark,
                "piece_mark": Component.piece_mark,
                "component_type": Component.component_type,
                "confidence": Component.confidence_score,
                "confidence_score": Component.confidence_score,
            }

            if request.sort_by in sort_field_map:
                field = sort_field_map[request.sort_by]
                query = query.order_by(desc(field) if request.sort_order == "desc" else field)
            else:  # relevance (default)
                if request.query and request.query != "*":
                    # Enhanced relevance: exact matches first, then partial matches
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
                    instance_identifier=component.instance_identifier,
                    component_type=component.component_type,
                    description=component.description,
                    quantity=component.quantity,
                    material_type=component.material_type,
                    confidence_score=component.confidence_score,
                    drawing_id=str(component.drawing_id),
                    drawing_file_name=component.drawing.file_name,
                    drawing_type=component.drawing.drawing_type,
                    sheet_number=component.drawing.sheet_number,
                    project_name=component.drawing.project.name if component.drawing.project else "Unassigned",
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
            
            # Calculate scope effectiveness metrics (Story 1.2)
            scope_counts = None
            try:
                scope_counts = self._calculate_scope_counts(request.query, request, db)
                logger.info(f"Calculated scope counts for query '{request.query}': {scope_counts}")
            except Exception as e:
                logger.warning(f"Failed to calculate scope counts: {e}")
                # Continue without scope counts rather than failing the entire search
            
            return SearchResponse(
                query=request.query,
                scope=request.scope,
                query_type=validation_result.query_type,
                results=results,
                total=total,
                page=request.page,
                limit=request.limit,
                has_next=(request.page * request.limit) < total,
                has_prev=request.page > 1,
                search_time_ms=search_time,
                complexity_score=validation_result.complexity_score,
                filters_applied={
                    "component_type": request.component_type,
                    "project_id": request.project_id,
                    "drawing_type": request.drawing_type,
                    "instance_identifier": request.instance_identifier
                },
                warnings=validation_result.warnings,
                scope_counts=scope_counts  # New field for Story 1.2
            )
            
        except Exception as e:
            logger.error(f"Error searching components: {str(e)}")
            raise
    
    def _calculate_scope_counts(self, query_text: str, request: SearchRequest, db: Session) -> Dict[str, int]:
        """
        Calculate count of matching components for each scope field.
        This helps users understand scope effectiveness per Story 1.2.
        """
        if not query_text or query_text == "*":
            # For wildcard queries, count all components (respecting filters)
            base_query = db.query(Component).join(Drawing).outerjoin(Project)
            
            # Apply the same filters as main search
            if request.component_type:
                base_query = base_query.filter(Component.component_type == request.component_type.value)
            
            if request.project_id:
                base_query = base_query.filter(Drawing.project_id == request.project_id)
            elif request.project_id is None:  # Explicitly filter for unassigned
                base_query = base_query.filter(Drawing.project_id.is_(None))
            
            if request.drawing_type:
                base_query = base_query.filter(Drawing.drawing_type == request.drawing_type)
            
            total_count = base_query.count()
            return {
                "piece_mark": total_count,
                "component_type": total_count,
                "description": total_count
            }
        
        scope_counts = {}
        
        # Calculate count for each possible scope field
        for scope_field in ["piece_mark", "component_type", "description"]:
            # Build query for this specific scope
            scope_query = db.query(Component).join(Drawing).outerjoin(Project)
            
            # Apply the same filters as main search
            if request.component_type:
                scope_query = scope_query.filter(Component.component_type == request.component_type.value)
            
            if request.project_id:
                scope_query = scope_query.filter(Drawing.project_id == request.project_id)
            elif request.project_id is None:
                scope_query = scope_query.filter(Drawing.project_id.is_(None))
            
            if request.drawing_type:
                scope_query = scope_query.filter(Drawing.drawing_type == request.drawing_type)
            
            # Apply field-specific text search
            try:
                from app.utils.query_parser import parse_search_query, build_search_filter
                parsed_query = parse_search_query(query_text)
                
                # Get the appropriate field for this scope
                if scope_field == "piece_mark":
                    search_field = Component.piece_mark
                elif scope_field == "component_type":
                    search_field = Component.component_type
                elif scope_field == "description":
                    search_field = Component.description
                else:
                    continue
                
                # Build search filter for this field only
                text_filter = build_search_filter(parsed_query, [search_field])
                if text_filter is not None:
                    scope_query = scope_query.filter(text_filter)
                    scope_counts[scope_field] = scope_query.count()
                else:
                    scope_counts[scope_field] = 0
                    
            except Exception as e:
                logger.warning(f"Error calculating scope count for {scope_field}: {e}")
                # Fallback to simple ilike search
                try:
                    simple_pattern = f"%{query_text}%"
                    if scope_field == "piece_mark":
                        count = scope_query.filter(Component.piece_mark.ilike(simple_pattern)).count()
                    elif scope_field == "component_type":
                        count = scope_query.filter(Component.component_type.ilike(simple_pattern)).count()
                    elif scope_field == "description":
                        count = scope_query.filter(Component.description.ilike(simple_pattern)).count()
                    else:
                        count = 0
                    scope_counts[scope_field] = count
                except Exception:
                    scope_counts[scope_field] = 0
        
        return scope_counts
    
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
                instance_identifier=component.instance_identifier,
                component_type=component.component_type,
                description=component.description,
                quantity=component.quantity,
                material_type=component.material_type,
                confidence_score=component.confidence_score,
                drawing_id=str(component.drawing_id),
                drawing_file_name=component.drawing.file_name,
                drawing_type=component.drawing.drawing_type,
                sheet_number=component.drawing.sheet_number,
                project_name=component.drawing.project.name if component.drawing.project else "Unassigned",
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
    
    async def get_recent_components(
        self,
        limit: int,
        db: Session,
        offset: int = 0,
        component_type: Optional[str] = None,
        project_id: Optional[int] = None,
        confidence_quartile: Optional[int] = None,
        instance_identifier: Optional[str] = None,
        sort_by: Optional[str] = None,
        sort_order: Optional[str] = "desc"
    ) -> List[ComponentSearchResult]:
        """Get recently added components for search page preview with optional filters and sorting"""
        try:
            # Build base query with eager loading
            query = db.query(Component).options(
                joinedload(Component.drawing).joinedload(Drawing.project),
                joinedload(Component.dimensions),
                joinedload(Component.specifications)
            )

            # Apply filters if provided
            if component_type:
                query = query.filter(Component.component_type == component_type)

            if project_id:
                query = query.join(Drawing).filter(Drawing.project_id == project_id)

            if confidence_quartile and confidence_quartile > 0:
                # Map quartiles to confidence score ranges
                # Quartile 1: 0-24%, 2: 25-49%, 3: 50-74%, 4: 75-100%
                min_confidence = (confidence_quartile - 1) * 0.25
                max_confidence = confidence_quartile * 0.25
                query = query.filter(
                    Component.confidence_score >= min_confidence,
                    Component.confidence_score < max_confidence if confidence_quartile < 4 else Component.confidence_score <= 1.0
                )

            if instance_identifier:
                query = query.filter(Component.instance_identifier == instance_identifier)

            # Apply sorting
            order_func = desc if sort_order == "desc" else asc

            if sort_by == "piece_mark":
                query = query.order_by(order_func(Component.piece_mark))
            elif sort_by == "component_type":
                query = query.order_by(order_func(Component.component_type))
            elif sort_by == "confidence_score":
                query = query.order_by(order_func(Component.confidence_score))
            else:  # Default to created_at (recent first)
                query = query.order_by(desc(Component.created_at))

            # Apply pagination
            components = query.offset(offset).limit(limit).all()
            
            # Convert to response format
            results = []
            for component in components:
                result = ComponentSearchResult(
                    id=str(component.id),
                    piece_mark=component.piece_mark,
                    instance_identifier=component.instance_identifier,
                    component_type=component.component_type,
                    description=component.description,
                    quantity=component.quantity,
                    material_type=component.material_type,
                    confidence_score=component.confidence_score,
                    drawing_id=str(component.drawing_id),
                    drawing_file_name=component.drawing.file_name,
                    drawing_type=component.drawing.drawing_type,
                    sheet_number=component.drawing.sheet_number,
                    project_name=component.drawing.project.name if component.drawing.project else "Unassigned",
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
    
    async def get_total_components_count(
        self,
        db: Session,
        component_type: Optional[str] = None,
        project_id: Optional[int] = None,
        confidence_quartile: Optional[int] = None,
        instance_identifier: Optional[str] = None
    ) -> int:
        """Get total count of components in the system with optional filters"""
        try:
            query = db.query(Component)

            # Apply same filters as get_recent_components
            if component_type:
                query = query.filter(Component.component_type == component_type)

            if project_id:
                query = query.join(Drawing).filter(Drawing.project_id == project_id)

            if confidence_quartile and confidence_quartile > 0:
                min_confidence = (confidence_quartile - 1) * 0.25
                max_confidence = confidence_quartile * 0.25
                query = query.filter(
                    Component.confidence_score >= min_confidence,
                    Component.confidence_score < max_confidence if confidence_quartile < 4 else Component.confidence_score <= 1.0
                )

            if instance_identifier:
                query = query.filter(Component.instance_identifier == instance_identifier)

            return query.count()
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
                # Create display_identifier based on instance_identifier presence
                display_identifier = f"{component.piece_mark}-{component.instance_identifier}" if component.instance_identifier else component.piece_mark
                
                # Enhanced full_text search including display_identifier
                full_text_parts = [
                    component.piece_mark,
                    component.component_type or '',
                    component.description or '',
                    display_identifier  # Include display identifier for comprehensive search
                ]
                full_text = ' '.join(filter(None, full_text_parts))
                
                doc = {
                    "id": str(component.id),
                    "piece_mark": component.piece_mark,
                    "instance_identifier": component.instance_identifier,
                    "display_identifier": display_identifier,
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
                    "full_text": full_text
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
    
    def reindex_existing_components(self, db: Session) -> bool:
        """Re-index existing components with NULL instance_identifier for backward compatibility"""
        if not self.es:
            logger.info("Elasticsearch not available, skipping reindexing")
            return False
        
        try:
            # Get all drawings to reindex their components
            from app.models.database import Drawing
            drawings = db.query(Drawing).all()
            
            successful_count = 0
            failed_count = 0
            
            logger.info(f"Starting reindexing of {len(drawings)} drawings for instance_identifier support")
            
            for drawing in drawings:
                try:
                    if self.index_drawing(drawing, db):
                        successful_count += 1
                    else:
                        failed_count += 1
                except Exception as e:
                    logger.error(f"Failed to reindex drawing {drawing.id}: {str(e)}")
                    failed_count += 1
            
            logger.info(f"Reindexing completed: {successful_count} successful, {failed_count} failed")
            return failed_count == 0
            
        except Exception as e:
            logger.error(f"Error during reindexing: {str(e)}")
            return False
    
    def update_elasticsearch_mapping_for_instance_identifier(self) -> bool:
        """Update Elasticsearch mapping to include instance_identifier field"""
        if not self.es:
            logger.info("Elasticsearch not available, skipping mapping update")
            return False
        
        try:
            # Define the mapping update for instance_identifier support
            mapping_update = {
                "properties": {
                    "instance_identifier": {
                        "type": "keyword",
                        "index": True
                    },
                    "display_identifier": {
                        "type": "keyword", 
                        "index": True
                    }
                }
            }
            
            # Update the components index mapping
            # Note: In production, you'd want to handle mapping conflicts carefully
            self.es.indices.put_mapping(
                index="components",
                body=mapping_update
            )
            
            logger.info("Successfully updated Elasticsearch mapping for instance_identifier support")
            return True
            
        except Exception as e:
            logger.error(f"Error updating Elasticsearch mapping: {str(e)}")
            return False