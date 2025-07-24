from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.database import Drawing, Component, ProcessingTask

router = APIRouter()

@router.get("/stats")
async def get_system_stats(db: Session = Depends(get_db)):
    """Get system statistics for dashboard"""
    try:
        # Count total drawings
        total_drawings = db.query(Drawing).count()
        
        # Count total components
        total_components = db.query(Component).count()
        
        # Count processing queue (pending/processing tasks)
        processing_queue = db.query(ProcessingTask).filter(
            ProcessingTask.status.in_(['pending', 'running'])
        ).count()
        
        # Calculate success rate
        completed_tasks = db.query(ProcessingTask).filter(
            ProcessingTask.status == 'completed'
        ).count()
        
        failed_tasks = db.query(ProcessingTask).filter(
            ProcessingTask.status == 'failed'
        ).count()
        
        total_tasks = completed_tasks + failed_tasks
        success_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        # Get completed drawings count
        completed_drawings = db.query(Drawing).filter(
            Drawing.processing_status == 'completed'
        ).count()
        
        return {
            "total_drawings": total_drawings,
            "total_components": total_components,
            "processing_queue": processing_queue,
            "success_rate": round(success_rate, 1),
            "completed_drawings": completed_drawings,
            "failed_drawings": db.query(Drawing).filter(
                Drawing.processing_status == 'failed'
            ).count(),
            "pending_drawings": db.query(Drawing).filter(
                Drawing.processing_status.in_(['pending', 'processing'])
            ).count()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {"status": "healthy", "service": "Engineering Drawing Index System"}