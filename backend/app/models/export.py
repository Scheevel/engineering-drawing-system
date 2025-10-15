from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class ExportFormat(str, Enum):
    EXCEL = "excel"
    CSV = "csv"
    PDF = "pdf"
    JSON = "json"

class ExportTemplate(str, Enum):
    STANDARD = "standard"
    DETAILED = "detailed"
    SUMMARY = "summary"
    CUSTOM = "custom"

class ExportRequest(BaseModel):
    component_ids: List[str] = Field(..., min_items=1)
    format: ExportFormat
    template_type: ExportTemplate = ExportTemplate.STANDARD
    include_dimensions: bool = True
    include_images: bool = False
    custom_fields: Optional[List[str]] = None
    filters: Optional[Dict[str, Any]] = None
    
class ExportField(BaseModel):
    name: str
    label: str
    type: str  # text, number, date, boolean
    required: bool = False
    default_value: Optional[Any] = None

class ExportTemplateConfig(BaseModel):
    name: str
    description: str
    format: ExportFormat
    fields: List[ExportField]
    layout: Optional[Dict[str, Any]] = None
    
class ExportJob(BaseModel):
    id: str
    status: str  # pending, processing, completed, failed
    progress: int = Field(0, ge=0, le=100)
    created_at: str
    completed_at: Optional[str] = None
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    error_message: Optional[str] = None
    component_count: int
    
class ExportResponse(BaseModel):
    job_id: str
    status: str
    download_url: Optional[str] = None
    expires_at: Optional[str] = None