"""
Pydantic models for Project API endpoints
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.drawing import DrawingResponse

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Project name")
    client: Optional[str] = Field(None, max_length=255, description="Client name")
    location: Optional[str] = Field(None, max_length=255, description="Project location")
    description: Optional[str] = Field(None, description="Project description")

class ProjectCreate(ProjectBase):
    """Schema for creating a new project"""
    pass

class ProjectUpdate(BaseModel):
    """Schema for updating an existing project"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    client: Optional[str] = Field(None, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None)

class ProjectSummaryResponse(BaseModel):
    """Lightweight schema for nested project responses (Story 8.1a)"""
    id: str
    name: str
    client: Optional[str] = None
    location: Optional[str] = None

    class Config:
        from_attributes = True

class ProjectResponse(ProjectBase):
    """Schema for project responses"""
    id: str
    created_at: datetime
    updated_at: datetime
    drawing_count: int = Field(default=0, description="Number of drawings in this project")

    class Config:
        from_attributes = True

class ProjectWithDrawings(ProjectResponse):
    """Extended project response including drawings"""
    drawings: List[DrawingResponse] = Field(default_factory=list)

class ProjectAssignRequest(BaseModel):
    """Schema for assigning drawings to a project"""
    drawing_ids: List[str] = Field(..., min_items=1, description="List of drawing IDs to assign")
    project_id: Optional[str] = Field(None, description="Project ID to assign to (null to unassign)")

# Story 8.1a: Many-to-many bulk operation schemas
class AssignProjectsRequest(BaseModel):
    """Schema for assigning multiple projects to a drawing (Story 8.1a)"""
    project_ids: List[str] = Field(..., min_items=1, description="List of project IDs to assign to drawing")

class BulkAssignProjectsRequest(BaseModel):
    """Schema for bulk assigning projects to drawings (Story 8.1a)"""
    drawing_ids: List[str] = Field(..., min_items=1, description="List of drawing IDs")
    project_ids: List[str] = Field(..., min_items=1, description="List of project IDs to assign")

class BulkRemoveProjectsRequest(BaseModel):
    """Schema for bulk removing project associations (Story 8.1a)"""
    drawing_ids: List[str] = Field(..., min_items=1, description="List of drawing IDs")
    project_ids: List[str] = Field(..., min_items=1, description="List of project IDs to remove")

class ProjectStatsResponse(BaseModel):
    """Schema for project statistics"""
    total_projects: int
    total_drawings_with_projects: int
    total_drawings_without_projects: int
    most_recent_project: Optional[ProjectResponse] = None
    largest_project: Optional[ProjectResponse] = None