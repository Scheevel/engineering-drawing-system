from pydantic import BaseModel, Field
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

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    component_type: Optional[ComponentType] = None
    project_id: Optional[str] = None
    drawing_type: Optional[str] = None
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)
    sort_by: str = "relevance"  # relevance, date, name
    sort_order: str = "desc"  # asc, desc

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
    results: List[ComponentSearchResult]
    total: int
    page: int
    limit: int
    has_next: bool
    has_prev: bool
    search_time_ms: int
    filters_applied: Dict[str, Any]
    suggestions: Optional[List[str]] = []

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