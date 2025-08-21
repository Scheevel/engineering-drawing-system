from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

# Base models for dimensions and specifications
class DimensionBase(BaseModel):
    dimension_type: str = Field(..., min_length=1, max_length=50)
    nominal_value: float = Field(..., gt=0)
    tolerance: Optional[str] = Field(None, max_length=50)
    unit: str = Field("in", max_length=20)
    location_x: Optional[float] = None
    location_y: Optional[float] = None
    extracted_text: Optional[str] = Field(None, max_length=100)

class DimensionCreateRequest(DimensionBase):
    confidence_score: Optional[float] = Field(None, ge=0, le=1)

class DimensionUpdateRequest(DimensionBase):
    dimension_type: Optional[str] = Field(None, min_length=1, max_length=50)
    nominal_value: Optional[float] = Field(None, gt=0)
    unit: Optional[str] = Field(None, max_length=20)

class DimensionResponse(DimensionBase):
    id: UUID
    component_id: UUID
    confidence_score: Optional[float]
    
    class Config:
        from_attributes = True

class SpecificationBase(BaseModel):
    specification_type: str = Field(..., min_length=1, max_length=100)
    value: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None

class SpecificationCreateRequest(SpecificationBase):
    confidence_score: Optional[float] = Field(None, ge=0, le=1)

class SpecificationUpdateRequest(SpecificationBase):
    specification_type: Optional[str] = Field(None, min_length=1, max_length=100)
    value: Optional[str] = Field(None, min_length=1, max_length=255)

class SpecificationResponse(SpecificationBase):
    id: UUID
    component_id: UUID
    confidence_score: Optional[float]
    
    class Config:
        from_attributes = True

# Component models
class ComponentCreateRequest(BaseModel):
    drawing_id: UUID = Field(..., description="ID of the drawing this component belongs to")
    piece_mark: str = Field(..., min_length=1, max_length=100)
    component_type: str = Field(..., max_length=100)
    description: Optional[str] = None
    quantity: int = Field(1, ge=1)
    material_type: Optional[str] = Field(None, max_length=100)
    location_x: float = Field(..., description="X coordinate on the drawing")
    location_y: float = Field(..., description="Y coordinate on the drawing")
    bounding_box: Optional[Dict[str, Any]] = None
    manual_creation: Optional[bool] = Field(True, description="Whether this component was manually created")
    confidence_score: Optional[float] = Field(1.0, ge=0, le=1, description="Confidence score for manual creation")
    review_status: Optional[str] = Field("pending", pattern=r'^(pending|reviewed|approved)$')
    instance_identifier: Optional[str] = Field(None, max_length=10, description="Instance identifier for multiple instances of same piece mark")
    
    @validator('piece_mark')
    def validate_piece_mark(cls, v):
        if not v.strip():
            raise ValueError('Piece mark cannot be empty')
        return v.strip().upper()
    
    @validator('component_type')
    def validate_component_type(cls, v):
        valid_types = [
            'wide_flange', 'hss', 'angle', 'channel', 'plate', 'tube', 
            'beam', 'column', 'brace', 'girder', 'truss', 'generic'
        ]
        if v not in valid_types:
            raise ValueError(f'Invalid component type. Must be one of: {", ".join(valid_types)}')
        return v
    
    @validator('bounding_box')
    def validate_bounding_box(cls, v):
        if v is not None:
            required_keys = ['x', 'y', 'width', 'height']
            if not all(key in v for key in required_keys):
                raise ValueError('Bounding box must contain x, y, width, and height')
            if not all(isinstance(v[key], (int, float)) and v[key] >= 0 for key in required_keys):
                raise ValueError('Bounding box values must be non-negative numbers')
        return v

class ComponentUpdateRequest(BaseModel):
    piece_mark: Optional[str] = Field(None, min_length=1, max_length=100)
    component_type: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    quantity: Optional[int] = Field(None, ge=1)
    material_type: Optional[str] = Field(None, max_length=100)
    location_x: Optional[float] = None
    location_y: Optional[float] = None
    bounding_box: Optional[Dict[str, Any]] = None
    review_status: Optional[str] = Field(None, pattern=r'^(pending|reviewed|approved)$')
    instance_identifier: Optional[str] = Field(None, max_length=10)
    
    @validator('piece_mark')
    def validate_piece_mark(cls, v):
        if v is not None:
            # Basic piece mark validation - can be enhanced based on project requirements
            if not v.strip():
                raise ValueError('Piece mark cannot be empty')
            # Remove any leading/trailing whitespace
            v = v.strip().upper()
        return v
    
    @validator('component_type')
    def validate_component_type(cls, v):
        if v is not None:
            valid_types = [
                'wide_flange', 'hss', 'angle', 'channel', 'plate', 'tube', 
                'beam', 'column', 'brace', 'girder', 'truss', 'generic'
            ]
            if v not in valid_types:
                raise ValueError(f'Invalid component type. Must be one of: {", ".join(valid_types)}')
        return v
    
    @validator('bounding_box')
    def validate_bounding_box(cls, v):
        if v is not None:
            required_keys = ['x', 'y', 'width', 'height']
            if not all(key in v for key in required_keys):
                raise ValueError('Bounding box must contain x, y, width, and height')
            if not all(isinstance(v[key], (int, float)) and v[key] >= 0 for key in required_keys):
                raise ValueError('Bounding box values must be non-negative numbers')
        return v
    
    @classmethod
    def parse_partial(cls, data: dict):
        """Create a partial update request from a dictionary, ignoring unknown fields"""
        filtered_data = {k: v for k, v in data.items() if k in cls.__fields__}
        return cls(**filtered_data)

class ComponentResponse(BaseModel):
    id: UUID
    drawing_id: UUID
    piece_mark: str
    component_type: Optional[str]
    description: Optional[str]
    quantity: int
    material_type: Optional[str]
    location_x: Optional[float]
    location_y: Optional[float]
    bounding_box: Optional[Dict[str, Any]]
    confidence_score: Optional[float]
    review_status: str
    created_at: datetime
    updated_at: datetime
    instance_identifier: Optional[str] = None
    
    # Related data
    dimensions: List[DimensionResponse] = []
    specifications: List[SpecificationResponse] = []
    
    # Drawing context
    drawing_file_name: Optional[str] = None
    sheet_number: Optional[str] = None
    drawing_type: Optional[str] = None
    project_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class ComponentListResponse(BaseModel):
    components: List[ComponentResponse]
    total: int
    page: int
    limit: int
    has_next: bool
    has_prev: bool

class ComponentValidationResult(BaseModel):
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []

class ComponentAuditLogResponse(BaseModel):
    id: UUID
    component_id: UUID
    action: str  # created, updated, deleted
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changed_by: Optional[str] = None  # Future: user ID
    timestamp: datetime
    change_reason: Optional[str] = None
    
    class Config:
        from_attributes = True

# Bulk operation models
class BulkComponentUpdateRequest(BaseModel):
    component_ids: List[UUID] = Field(..., min_items=1, max_items=100)
    updates: ComponentUpdateRequest
    
class BulkComponentUpdateResponse(BaseModel):
    successful_updates: List[UUID]
    failed_updates: List[Dict[str, Any]]  # {component_id, error}
    total_processed: int

# Search and filter models
class ComponentSearchRequest(BaseModel):
    query: Optional[str] = None
    component_type: Optional[str] = None
    material_type: Optional[str] = None
    review_status: Optional[str] = None
    drawing_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    min_confidence: Optional[float] = Field(None, ge=0, le=1)
    has_dimensions: Optional[bool] = None
    has_specifications: Optional[bool] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    page: int = Field(1, ge=1)
    limit: int = Field(25, ge=1, le=100)
    sort_by: str = Field("updated_at", pattern=r'^(piece_mark|component_type|created_at|updated_at|confidence_score)$')
    sort_order: str = Field("desc", pattern=r'^(asc|desc)$')

# Component statistics and analytics
class ComponentStatistics(BaseModel):
    total_components: int
    by_type: Dict[str, int]
    by_review_status: Dict[str, int]
    avg_confidence_score: Optional[float]
    components_with_dimensions: int
    components_with_specifications: int
    recent_additions: int  # Last 7 days

# Export models
class ComponentExportRequest(BaseModel):
    component_ids: List[UUID] = Field(..., min_items=1)
    format: str = Field("csv", pattern=r'^(csv|json|excel)$')
    include_dimensions: bool = True
    include_specifications: bool = True
    include_drawing_context: bool = True

class ComponentExportResponse(BaseModel):
    export_id: UUID
    status: str  # queued, processing, completed, failed
    download_url: Optional[str] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
    file_size: Optional[int] = None