from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class ComponentType(str, Enum):
    GIRDER = "girder"
    BRACE = "brace"
    PLATE = "plate"
    ANGLE = "angle"
    BEAM = "beam"
    COLUMN = "column"
    CONNECTION = "connection"
    BOLT = "bolt"
    WELD = "weld"
    OTHER = "other"

class SearchScope(str, Enum):
    """Available search scope fields"""
    PIECE_MARK = "piece_mark"
    COMPONENT_TYPE = "component_type" 
    DESCRIPTION = "description"

class SearchQueryType(str, Enum):
    """Types of search queries for analytics"""
    SIMPLE = "simple"
    BOOLEAN = "boolean"
    WILDCARD = "wildcard"
    QUOTED = "quoted"
    COMPLEX = "complex"

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    scope: List[SearchScope] = Field(default=[SearchScope.PIECE_MARK])
    component_type: Optional[ComponentType] = None
    project_id: Optional[str] = None
    drawing_type: Optional[str] = None
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)
    sort_by: str = "relevance"  # relevance, date, name
    sort_order: str = "desc"  # asc, desc
    
    @validator('scope')
    def validate_scope(cls, v):
        """Ensure at least one scope is selected"""
        if not v or len(v) == 0:
            return [SearchScope.PIECE_MARK]  # Default to piece_mark
        # Remove duplicates while preserving order
        seen = set()
        unique_scope = []
        for scope in v:
            if scope not in seen:
                seen.add(scope)
                unique_scope.append(scope)
        return unique_scope
    
    @validator('query')
    def validate_query(cls, v):
        """Basic query validation and sanitization"""
        if not v or not v.strip():
            raise ValueError("Query cannot be empty")
        
        # Remove potentially harmful characters for basic protection
        # The main SQL injection protection is in the query parser
        import re
        cleaned = re.sub(r'[<>]', '', v.strip())
        
        if len(cleaned) > 500:
            raise ValueError("Query too long (max 500 characters)")
            
        return cleaned

class ComponentSearchResult(BaseModel):
    id: str
    piece_mark: str
    component_type: Optional[str] = None
    description: Optional[str] = None
    quantity: int = 1
    material_type: Optional[str] = None
    confidence_score: Optional[float] = None
    
    # Drawing context
    drawing_id: str
    drawing_file_name: str
    drawing_type: Optional[str] = None
    sheet_number: Optional[str] = None
    project_name: Optional[str] = None
    
    # Location information
    location_x: Optional[float] = None
    location_y: Optional[float] = None
    bounding_box: Optional[Dict[str, float]] = None
    
    # Associated data
    dimensions: Optional[List[Dict[str, Any]]] = []
    specifications: Optional[List[Dict[str, Any]]] = []
    
    # Metadata
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class SearchResponse(BaseModel):
    query: str
    scope: List[SearchScope]
    query_type: SearchQueryType
    results: List[ComponentSearchResult]
    total: int
    page: int
    limit: int
    has_next: bool
    has_prev: bool
    search_time_ms: int
    complexity_score: Optional[int] = None
    filters_applied: Dict[str, Any]
    suggestions: Optional[List[str]] = []
    warnings: Optional[List[str]] = []
    
class SearchError(BaseModel):
    """Structured error response for search failures"""
    error_type: str  # validation, parsing, execution, permission
    message: str
    details: Optional[str] = None
    position: Optional[int] = None  # For syntax errors
    suggestions: Optional[List[str]] = []
    
class QueryValidationResult(BaseModel):
    """Result of query validation and parsing"""
    is_valid: bool
    query_type: SearchQueryType
    complexity_score: int
    sanitized_query: str
    scope_applied: List[SearchScope]
    error: Optional[SearchError] = None
    warnings: List[str] = []

class SearchSuggestion(BaseModel):
    text: str
    count: int
    type: str  # piece_mark, component_type, material_type

class AdvancedSearchFilter(BaseModel):
    field: str
    operator: str  # equals, contains, starts_with, range, etc.
    value: Any
    
class AdvancedSearchRequest(BaseModel):
    filters: List[AdvancedSearchFilter]
    logical_operator: str = "AND"  # AND, OR
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)
    sort_by: str = "relevance"
    sort_order: str = "desc"