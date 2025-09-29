from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Query
from fastapi.responses import FileResponse
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.drawing_service import DrawingService
from app.models.drawing import DrawingResponse, DrawingListResponse
from app.models.database import Component
import uuid
import os

router = APIRouter()
drawing_service = DrawingService()

@router.post("/upload", response_model=DrawingResponse)
async def upload_drawing(
    file: UploadFile = File(...),
    project_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Upload a new engineering drawing for processing"""
    if file.content_type not in ["application/pdf", "image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, JPEG, and PNG are supported.")
    
    try:
        result = await drawing_service.upload_drawing(file, project_id, db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{drawing_id}", response_model=DrawingResponse)
async def get_drawing(
    drawing_id: str,
    db: Session = Depends(get_db)
):
    """Get drawing details by ID"""
    drawing = await drawing_service.get_drawing(drawing_id, db)
    if not drawing:
        raise HTTPException(status_code=404, detail="Drawing not found")
    return drawing

@router.get("/", response_model=DrawingListResponse)
async def list_drawings(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List drawings with pagination and filters"""
    drawings = await drawing_service.list_drawings(
        page=page,
        limit=limit,
        project_id=project_id,
        status=status,
        db=db
    )
    return drawings

@router.delete("/{drawing_id}")
async def delete_drawing(
    drawing_id: str,
    db: Session = Depends(get_db)
):
    """Delete a drawing and its associated data"""
    success = await drawing_service.delete_drawing(drawing_id, db)
    if not success:
        raise HTTPException(status_code=404, detail="Drawing not found")
    return {"message": "Drawing deleted successfully"}

@router.get("/{drawing_id}/status")
async def get_processing_status(
    drawing_id: str,
    db: Session = Depends(get_db)
):
    """Get the processing status of a drawing"""
    status = await drawing_service.get_processing_status(drawing_id, db)
    if not status:
        raise HTTPException(status_code=404, detail="Drawing not found")
    return status

@router.get("/{drawing_id}/file")
async def serve_drawing_file(
    drawing_id: str,
    db: Session = Depends(get_db)
):
    """Serve the actual drawing file for viewing"""
    try:
        # Get drawing directly from database
        from app.models.database import Drawing as DrawingModel
        drawing = db.query(DrawingModel).filter(DrawingModel.id == drawing_id).first()
        
        if not drawing:
            raise HTTPException(status_code=404, detail="Drawing not found")
        
        # Check if file exists, with fallback paths for development/production mismatch
        file_path = drawing.file_path

        if not os.path.exists(file_path):
            # Try alternative paths for development/production compatibility
            filename = os.path.basename(file_path)
            alternative_paths = [
                os.path.join("./uploads", filename),           # Local development path
                os.path.join("uploads", filename),             # Relative path
                os.path.join("/app/uploads", filename),        # Container absolute path
                f"./uploads/{filename}",                       # Explicit local path
            ]

            for alt_path in alternative_paths:
                if os.path.exists(alt_path):
                    file_path = alt_path
                    print(f"Found file at alternative path: {alt_path}")
                    break
            else:
                raise HTTPException(status_code=404, detail=f"Drawing file not found on disk: {drawing.file_path} (also tried alternatives: {alternative_paths})")
        
        # Determine media type based on file extension
        file_ext = os.path.splitext(drawing.file_path)[1].lower()
        media_type_map = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png'
        }
        media_type = media_type_map.get(file_ext, 'application/octet-stream')
        
        return FileResponse(
            path=file_path,
            media_type=media_type,
            filename=drawing.original_name or drawing.file_name
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Database session error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{drawing_id}/components")
async def get_drawing_components(
    drawing_id: str,
    db: Session = Depends(get_db)
):
    """Get all components for a drawing with their location data for highlighting"""
    try:
        drawing = await drawing_service.get_drawing(drawing_id, db)
        if not drawing:
            raise HTTPException(status_code=404, detail="Drawing not found")
        
        # Get all components for this drawing with location data
        components = db.query(Component).filter(Component.drawing_id == drawing_id).all()
        
        component_data = []
        for component in components:
            component_info = {
                "id": str(component.id),
                "piece_mark": component.piece_mark,
                "component_type": component.component_type,
                "description": component.description,
                "quantity": component.quantity,
                "location_x": component.location_x,
                "location_y": component.location_y,
                "bounding_box": component.bounding_box,
                "confidence_score": component.confidence_score
            }
            component_data.append(component_info)
        
        return {
            "drawing_id": drawing_id,
            "components": component_data,
            "total_components": len(component_data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))