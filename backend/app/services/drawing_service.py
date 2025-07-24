from typing import List, Optional, Dict, Any
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
import uuid
import os
import aiofiles
import logging
import hashlib
from datetime import datetime

from app.models.database import Drawing
from app.models.drawing import DrawingResponse, DrawingListResponse, ProcessingStatus, DrawingStatus
from app.core.config import settings

logger = logging.getLogger(__name__)

class DrawingService:
    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        os.makedirs(self.upload_dir, exist_ok=True)
    
    async def upload_drawing(
        self, 
        file: UploadFile, 
        project_id: Optional[str],
        db: Session
    ) -> DrawingResponse:
        """Handle drawing file upload and initiate processing"""
        try:
            # Validate file
            if not self._validate_file(file):
                raise HTTPException(status_code=400, detail="Invalid file type or size")
            
            # Read file content and calculate hash
            file_content = await file.read()
            file_hash = hashlib.sha256(file_content).hexdigest()
            
            # Check for duplicate
            existing_drawing = db.query(Drawing).filter(Drawing.file_hash == file_hash).first()
            if existing_drawing:
                # Return the existing drawing instead of creating a new one
                logger.info(f"Duplicate file detected. Returning existing drawing: {existing_drawing.id}")
                return DrawingResponse(
                    id=str(existing_drawing.id),
                    project_id=str(existing_drawing.project_id) if existing_drawing.project_id else None,
                    file_name=existing_drawing.file_name,
                    file_path=existing_drawing.file_path,
                    file_size=existing_drawing.file_size,
                    drawing_type=existing_drawing.drawing_type,
                    sheet_number=existing_drawing.sheet_number,
                    drawing_date=existing_drawing.drawing_date,
                    processing_status=DrawingStatus(existing_drawing.processing_status),
                    processing_progress=existing_drawing.processing_progress,
                    upload_date=existing_drawing.upload_date,
                    error_message=existing_drawing.error_message,
                    metadata=existing_drawing.drawing_metadata or {},
                    is_duplicate=True  # Flag to indicate this is a duplicate
                )
            
            # Reset file position after reading
            await file.seek(0)
            
            # Save file to disk
            file_path = await self._save_upload_file(file, file_content)
            file_info = self._get_file_info(file_path)
            
            # Create drawing record
            drawing = Drawing(
                id=uuid.uuid4(),
                project_id=uuid.UUID(project_id) if project_id else None,
                file_name=file.filename,
                original_name=file.filename,
                file_path=file_path,
                file_size=file_info.get("size"),
                file_hash=file_hash,
                processing_status=DrawingStatus.PENDING.value
            )
            
            db.add(drawing)
            db.commit()
            db.refresh(drawing)
            
            # Trigger async processing
            from app.tasks.drawing_processing import process_drawing
            task = process_drawing.delay(str(drawing.id))
            
            logger.info(f"Drawing uploaded: {drawing.id}, processing task: {task.id}")
            
            # Convert to response model with proper UUID handling
            return DrawingResponse(
                id=str(drawing.id),
                project_id=str(drawing.project_id) if drawing.project_id else None,
                file_name=drawing.file_name,
                file_path=drawing.file_path,
                file_size=drawing.file_size,
                drawing_type=drawing.drawing_type,
                sheet_number=drawing.sheet_number,
                drawing_date=drawing.drawing_date,
                processing_status=DrawingStatus(drawing.processing_status),
                processing_progress=drawing.processing_progress,
                upload_date=drawing.upload_date,
                error_message=drawing.error_message,
                metadata=drawing.drawing_metadata or {}
            )
            
        except Exception as e:
            logger.error(f"Error uploading drawing: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    
    async def get_drawing(self, drawing_id: str, db: Session) -> Optional[DrawingResponse]:
        """Get drawing by ID"""
        try:
            drawing = db.query(Drawing).filter(Drawing.id == uuid.UUID(drawing_id)).first()
            if not drawing:
                return None
            
            return DrawingResponse(
                id=str(drawing.id),
                project_id=str(drawing.project_id) if drawing.project_id else None,
                file_name=drawing.file_name,
                file_path=drawing.file_path,
                file_size=drawing.file_size,
                drawing_type=drawing.drawing_type,
                sheet_number=drawing.sheet_number,
                drawing_date=drawing.drawing_date,
                processing_status=DrawingStatus(drawing.processing_status),
                processing_progress=drawing.processing_progress,
                upload_date=drawing.upload_date,
                error_message=drawing.error_message,
                metadata=drawing.drawing_metadata or {}
            )
        except Exception as e:
            logger.error(f"Error getting drawing {drawing_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def list_drawings(
        self,
        page: int = 1,
        limit: int = 10,
        project_id: Optional[str] = None,
        status: Optional[str] = None,
        db: Session = None
    ) -> DrawingListResponse:
        """List drawings with pagination and filters"""
        try:
            offset = (page - 1) * limit
            
            # Build query
            query = db.query(Drawing)
            
            # Apply filters
            if project_id:
                query = query.filter(Drawing.project_id == uuid.UUID(project_id))
            if status:
                query = query.filter(Drawing.processing_status == status)
            
            # Get total count
            total = query.count()
            
            # Get paginated results
            drawings = query.offset(offset).limit(limit).all()
            
            # Convert to response models
            items = []
            for drawing in drawings:
                items.append(DrawingResponse(
                    id=str(drawing.id),
                    project_id=str(drawing.project_id) if drawing.project_id else None,
                    file_name=drawing.file_name,
                    file_path=drawing.file_path,
                    file_size=drawing.file_size,
                    drawing_type=drawing.drawing_type,
                    sheet_number=drawing.sheet_number,
                    drawing_date=drawing.drawing_date,
                    processing_status=DrawingStatus(drawing.processing_status),
                    processing_progress=drawing.processing_progress,
                    upload_date=drawing.upload_date,
                    error_message=drawing.error_message,
                    metadata=drawing.drawing_metadata or {}
                ))
            
            return DrawingListResponse(
                items=items,
                total=total,
                page=page,
                limit=limit,
                has_next=(page * limit) < total,
                has_prev=page > 1
            )
            
        except Exception as e:
            logger.error(f"Error listing drawings: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def delete_drawing(self, drawing_id: str, db: Session) -> bool:
        """Delete drawing and associated data"""
        try:
            drawing = db.query(Drawing).filter(Drawing.id == uuid.UUID(drawing_id)).first()
            if not drawing:
                return False
            
            # Delete file from disk
            try:
                if os.path.exists(drawing.file_path):
                    os.remove(drawing.file_path)
            except Exception as e:
                logger.warning(f"Could not delete file {drawing.file_path}: {str(e)}")
            
            # Delete from database (cascade will handle related records)
            db.delete(drawing)
            db.commit()
            
            logger.info(f"Drawing deleted: {drawing_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting drawing {drawing_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_processing_status(self, drawing_id: str, db: Session) -> Optional[ProcessingStatus]:
        """Get processing status for a drawing"""
        try:
            drawing = db.query(Drawing).filter(Drawing.id == uuid.UUID(drawing_id)).first()
            if not drawing:
                return None
            
            return ProcessingStatus(
                drawing_id=str(drawing.id),
                status=DrawingStatus(drawing.processing_status),
                progress=drawing.processing_progress,
                error_message=drawing.error_message
            )
            
        except Exception as e:
            logger.error(f"Error getting processing status for {drawing_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    def _validate_file(self, file: UploadFile) -> bool:
        """Validate uploaded file"""
        # Check file extension
        if not any(file.filename.lower().endswith(ext) for ext in settings.ALLOWED_EXTENSIONS):
            return False
        
        return True
    
    async def _save_upload_file(self, file: UploadFile, content: bytes = None) -> str:
        """Save uploaded file to disk"""
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1]
        file_path = os.path.join(self.upload_dir, f"{file_id}{file_extension}")
        
        async with aiofiles.open(file_path, 'wb') as f:
            if content is None:
                content = await file.read()
            await f.write(content)
        
        return file_path
    
    def _get_file_info(self, file_path: str) -> Dict[str, Any]:
        """Get file information"""
        try:
            stat = os.stat(file_path)
            return {
                "size": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat()
            }
        except Exception:
            return {"size": 0}