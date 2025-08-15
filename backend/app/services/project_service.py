"""
Project service for business logic
"""

import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models.database import Project, Drawing
from app.models.project import ProjectCreate, ProjectUpdate, ProjectAssignRequest

logger = logging.getLogger(__name__)

class ProjectService:
    """Service class for project-related operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_projects(self, skip: int = 0, limit: int = 100) -> List[Project]:
        """Get all projects with pagination"""
        return (
            self.db.query(Project)
            .order_by(desc(Project.updated_at))
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_project_by_id(self, project_id: str) -> Optional[Project]:
        """Get a project by ID"""
        return self.db.query(Project).filter(Project.id == project_id).first()
    
    def get_project_by_name(self, name: str) -> Optional[Project]:
        """Get a project by name (for uniqueness validation)"""
        return self.db.query(Project).filter(Project.name == name).first()
    
    def create_project(self, project_data: ProjectCreate) -> Project:
        """Create a new project"""
        # Check if project name already exists
        existing_project = self.get_project_by_name(project_data.name)
        if existing_project:
            raise ValueError(f"Project with name '{project_data.name}' already exists")
        
        # Create new project
        project = Project(
            name=project_data.name,
            client=project_data.client,
            location=project_data.location,
            description=project_data.description
        )
        
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        
        logger.info(f"Created project: {project.name} (ID: {project.id})")
        return project
    
    def update_project(self, project_id: str, project_data: ProjectUpdate) -> Optional[Project]:
        """Update an existing project"""
        project = self.get_project_by_id(project_id)
        if not project:
            return None
        
        # Check name uniqueness if name is being updated
        if project_data.name and project_data.name != project.name:
            existing_project = self.get_project_by_name(project_data.name)
            if existing_project:
                raise ValueError(f"Project with name '{project_data.name}' already exists")
        
        # Update fields that are provided
        update_data = project_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(project, field, value)
        
        self.db.commit()
        self.db.refresh(project)
        
        logger.info(f"Updated project: {project.name} (ID: {project.id})")
        return project
    
    def delete_project(self, project_id: str) -> bool:
        """Delete a project (soft deletion - unassign drawings)"""
        project = self.get_project_by_id(project_id)
        if not project:
            return False
        
        # Unassign all drawings from this project
        drawings_updated = (
            self.db.query(Drawing)
            .filter(Drawing.project_id == project_id)
            .update({Drawing.project_id: None})
        )
        
        # Delete the project
        self.db.delete(project)
        self.db.commit()
        
        logger.info(f"Deleted project: {project.name} (ID: {project.id}), unassigned {drawings_updated} drawings")
        return True
    
    def assign_drawings_to_project(self, assign_request: ProjectAssignRequest) -> Dict[str, Any]:
        """Assign multiple drawings to a project"""
        # Validate project exists (if project_id is provided)
        if assign_request.project_id:
            project = self.get_project_by_id(assign_request.project_id)
            if not project:
                raise ValueError(f"Project with ID '{assign_request.project_id}' not found")
        
        # Update drawings
        updated_count = (
            self.db.query(Drawing)
            .filter(Drawing.id.in_(assign_request.drawing_ids))
            .update({Drawing.project_id: assign_request.project_id})
        )
        
        self.db.commit()
        
        action = "assigned to" if assign_request.project_id else "unassigned from"
        project_name = project.name if assign_request.project_id and project else "any project"
        
        logger.info(f"{action} project '{project_name}': {updated_count} drawings")
        
        return {
            "updated_count": updated_count,
            "project_id": assign_request.project_id,
            "project_name": project_name if assign_request.project_id else None,
            "action": action
        }
    
    def get_project_stats(self) -> Dict[str, Any]:
        """Get project statistics"""
        # Total projects
        total_projects = self.db.query(func.count(Project.id)).scalar() or 0
        
        # Drawings with/without projects
        total_drawings_with_projects = (
            self.db.query(func.count(Drawing.id))
            .filter(Drawing.project_id.isnot(None))
            .scalar() or 0
        )
        
        total_drawings_without_projects = (
            self.db.query(func.count(Drawing.id))
            .filter(Drawing.project_id.is_(None))
            .scalar() or 0
        )
        
        # Most recent project
        most_recent_project = (
            self.db.query(Project)
            .order_by(desc(Project.created_at))
            .first()
        )
        
        # Largest project (by drawing count)
        largest_project_result = (
            self.db.query(Project, func.count(Drawing.id).label('drawing_count'))
            .outerjoin(Drawing)
            .group_by(Project.id)
            .order_by(desc('drawing_count'))
            .first()
        )
        
        largest_project = largest_project_result[0] if largest_project_result and largest_project_result[1] > 0 else None
        
        return {
            "total_projects": total_projects,
            "total_drawings_with_projects": total_drawings_with_projects,
            "total_drawings_without_projects": total_drawings_without_projects,
            "most_recent_project": most_recent_project,
            "largest_project": largest_project
        }
    
    def get_projects_with_drawing_counts(self, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Get projects with their drawing counts"""
        projects_with_counts = (
            self.db.query(Project, func.count(Drawing.id).label('drawing_count'))
            .outerjoin(Drawing)
            .group_by(Project.id)
            .order_by(desc(Project.updated_at))
            .offset(skip)
            .limit(limit)
            .all()
        )
        
        return [
            {
                "project": project,
                "drawing_count": count or 0
            }
            for project, count in projects_with_counts
        ]