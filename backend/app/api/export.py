from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.export_service import ExportService
from app.models.export import ExportRequest, ExportFormat
import tempfile
import os

router = APIRouter()
export_service = ExportService()

@router.post("/excel")
async def export_to_excel(
    component_ids: List[str],
    template_type: str = "standard",
    include_dimensions: bool = True,
    include_specifications: bool = True,
    db: Session = Depends(get_db)
):
    """Export component data to Excel format"""
    try:
        export_request = ExportRequest(
            component_ids=component_ids,
            format=ExportFormat.EXCEL,
            template_type=template_type,
            include_dimensions=include_dimensions,
            include_specifications=include_specifications
        )
        
        file_path = await export_service.export_data(export_request, db)
        
        return FileResponse(
            path=file_path,
            filename=f"components_export_{len(component_ids)}_items.xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/csv")
async def export_to_csv(
    component_ids: List[str],
    include_dimensions: bool = True,
    include_specifications: bool = True,
    db: Session = Depends(get_db)
):
    """Export component data to CSV format"""
    try:
        export_request = ExportRequest(
            component_ids=component_ids,
            format=ExportFormat.CSV,
            include_dimensions=include_dimensions,
            include_specifications=include_specifications
        )
        
        file_path = await export_service.export_data(export_request, db)
        
        return FileResponse(
            path=file_path,
            filename=f"components_export_{len(component_ids)}_items.csv",
            media_type="text/csv"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pdf-report")
async def export_pdf_report(
    component_ids: List[str],
    project_id: Optional[str] = None,
    include_images: bool = False,
    db: Session = Depends(get_db)
):
    """Generate a PDF report for selected components"""
    try:
        file_path = await export_service.generate_pdf_report(
            component_ids=component_ids,
            project_id=project_id,
            include_images=include_images,
            db=db
        )
        
        return FileResponse(
            path=file_path,
            filename=f"component_report_{len(component_ids)}_items.pdf",
            media_type="application/pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates")
async def list_export_templates():
    """List available export templates"""
    templates = await export_service.list_templates()
    return {"templates": templates}