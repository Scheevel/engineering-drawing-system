from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class DrawingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class DrawingType(str, Enum):
    E_SHEET = "e_sheet"
    SHOP_DRAWING = "shop_drawing"
    DETAIL_DRAWING = "detail_drawing"
    GENERAL_ARRANGEMENT = "general_arrangement"

class DrawingBase(BaseModel):
    file_name: str
    drawing_type: Optional[DrawingType] = None
    sheet_number: Optional[str] = None
    drawing_date: Optional[datetime] = None
    project_id: Optional[str] = None

class DrawingCreate(DrawingBase):
    pass

class DrawingUpdate(BaseModel):
    file_name: Optional[str] = None
    drawing_type: Optional[DrawingType] = None
    sheet_number: Optional[str] = None
    drawing_date: Optional[datetime] = None
    processing_status: Optional[DrawingStatus] = None
    processing_progress: Optional[int] = Field(None, ge=0, le=100)
    metadata: Optional[Dict[str, Any]] = None

class DrawingResponse(DrawingBase):
    id: str
    file_path: str
    file_size: Optional[int] = None
    processing_status: DrawingStatus
    processing_progress: int = 0
    upload_date: datetime
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    is_duplicate: Optional[bool] = False  # Flag to indicate if this is a duplicate
    
    class Config:
        from_attributes = True

class DrawingListResponse(BaseModel):
    items: List[DrawingResponse]
    total: int
    page: int
    limit: int
    has_next: bool
    has_prev: bool

class ProcessingStatus(BaseModel):
    drawing_id: str
    status: DrawingStatus
    progress: int
    current_step: Optional[str] = None
    estimated_completion: Optional[datetime] = None
    components_found: Optional[int] = None
    dimensions_extracted: Optional[int] = None
    error_message: Optional[str] = None

# Export-specific models (Story 7.2)
class DrawingWithComponents(DrawingResponse):
    """Drawing response model with nested components for export functionality (Story 7.2)"""
    components: List['ComponentResponse'] = []

    class Config:
        from_attributes = True

class ExportDrawingsResponse(BaseModel):
    """Response model for export drawings endpoint with metadata (Story 7.2)"""
    drawings: List[DrawingWithComponents]
    total_drawings: int
    total_components: int
    timestamp: datetime

    class Config:
        from_attributes = True

# Import ComponentResponse and rebuild model to resolve forward references (Pydantic v2)
try:
    from app.models.component import ComponentResponse
    DrawingWithComponents.model_rebuild()
except ImportError:
    # ComponentResponse not yet defined during initial import
    pass