import os
import logging
from typing import Dict, List, Any, Optional
import pytesseract
from PIL import Image
import cv2
import numpy as np
import re
from datetime import datetime
import json

from celery import Task
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.database import Drawing, Component, Dimension, ProcessingTask
from app.models.drawing import DrawingStatus
from app.services.search_service import SearchService
from app.core.config import settings

logger = logging.getLogger(__name__)


class DrawingProcessingTask(Task):
    """Base task with database session management"""
    _db: Optional[Session] = None

    @property
    def db(self) -> Session:
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()
            self._db = None


@celery_app.task(bind=True, base=DrawingProcessingTask, name="process_drawing")
def process_drawing(self, drawing_id: str) -> Dict[str, Any]:
    """
    Main task to process an uploaded drawing
    """
    logger.info(f"Starting processing for drawing {drawing_id}")
    
    try:
        # Get drawing from database
        drawing = self.db.query(Drawing).filter(Drawing.id == drawing_id).first()
        if not drawing:
            raise ValueError(f"Drawing {drawing_id} not found")
        
        # Update status to processing
        drawing.processing_status = DrawingStatus.PROCESSING.value
        drawing.processing_progress = 10
        self.db.commit()
        
        # Create processing task record
        task_record = ProcessingTask(
            drawing_id=drawing.id,
            task_type="full_processing",
            status="running",
            started_at=datetime.utcnow(),
            celery_task_id=self.request.id
        )
        self.db.add(task_record)
        self.db.commit()
        
        # Step 1: Extract text using OCR
        logger.info(f"Extracting text from {drawing.file_path}")
        ocr_result = extract_text_from_drawing(drawing.file_path)
        
        drawing.processing_progress = 30
        self.db.commit()
        
        # Step 2: Detect components (piece marks)
        logger.info("Detecting components")
        components = detect_components(ocr_result, drawing.id)
        
        # Save components to database (filter by confidence threshold)
        filtered_components = []
        for comp_data in components:
            confidence = comp_data.get('confidence', 0.8)
            
            # Only create components that meet the minimum confidence threshold
            if confidence >= settings.MIN_CONFIDENCE_THRESHOLD:
                component = Component(
                    drawing_id=drawing.id,
                    piece_mark=comp_data['piece_mark'],
                    component_type=comp_data.get('type'),
                    location_x=comp_data.get('x'),
                    location_y=comp_data.get('y'),
                    confidence_score=confidence,
                    extracted_data=comp_data
                )
                self.db.add(component)
                filtered_components.append(comp_data)
            else:
                logger.info(f"Skipping component '{comp_data['piece_mark']}' with confidence {confidence:.1%} (below threshold {settings.MIN_CONFIDENCE_THRESHOLD:.1%})")
        
        # Update components list for further processing
        components = filtered_components
        
        self.db.commit()
        drawing.processing_progress = 60
        self.db.commit()
        
        # Step 3: Extract dimensions for each component
        logger.info("Extracting dimensions")
        for component in self.db.query(Component).filter(Component.drawing_id == drawing.id).all():
            dimensions = extract_dimensions_near_component(
                ocr_result, 
                component.location_x, 
                component.location_y
            )
            
            for dim_data in dimensions:
                dim_confidence = dim_data.get('confidence', 0.7)
                
                # Only create dimensions that meet the minimum confidence threshold
                if dim_confidence >= settings.MIN_CONFIDENCE_THRESHOLD:
                    dimension = Dimension(
                        component_id=component.id,
                        dimension_type=dim_data['type'],
                        nominal_value=dim_data['value'],
                        unit=dim_data.get('unit', 'in'),
                        confidence_score=dim_confidence,
                        extracted_text=dim_data.get('text')
                    )
                    self.db.add(dimension)
                else:
                    logger.info(f"Skipping dimension '{dim_data.get('text', 'N/A')}' with confidence {dim_confidence:.1%} (below threshold {settings.MIN_CONFIDENCE_THRESHOLD:.1%})")
        
        self.db.commit()
        drawing.processing_progress = 80
        self.db.commit()
        
        # Step 4: Index in Elasticsearch
        logger.info("Indexing in Elasticsearch")
        search_service = SearchService()
        search_service.index_drawing(drawing, self.db)
        
        # Update final status
        drawing.processing_status = DrawingStatus.COMPLETED.value
        drawing.processing_progress = 100
        task_record.status = "completed"
        task_record.completed_at = datetime.utcnow()
        task_record.result_data = {
            "components_found": len(components),
            "ocr_pages": len(ocr_result.get('pages', [])),
            "processing_time": (task_record.completed_at - task_record.started_at).total_seconds()
        }
        
        self.db.commit()
        
        logger.info(f"Successfully processed drawing {drawing_id}")
        return {
            "drawing_id": str(drawing_id),
            "status": "completed",
            "components_found": len(components)
        }
        
    except Exception as e:
        logger.error(f"Error processing drawing {drawing_id}: {str(e)}")
        
        # Update error status
        if 'drawing' in locals():
            drawing.processing_status = DrawingStatus.FAILED.value
            drawing.error_message = str(e)
        
        if 'task_record' in locals():
            task_record.status = "failed"
            task_record.error_message = str(e)
            task_record.completed_at = datetime.utcnow()
        
        self.db.commit()
        raise


def extract_text_from_drawing(file_path: str) -> Dict[str, Any]:
    """
    Extract text from drawing using OCR
    """
    result = {
        "pages": [],
        "full_text": "",
        "metadata": {}
    }
    
    try:
        # Determine file type
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext in ['.jpg', '.jpeg', '.png']:
            # Process image file
            image = cv2.imread(file_path)
            if image is None:
                raise ValueError(f"Could not read image file: {file_path}")
            
            # Preprocess image for better OCR
            processed = preprocess_image_for_ocr(image)
            
            # Extract text with location data
            ocr_data = pytesseract.image_to_data(
                processed, 
                output_type=pytesseract.Output.DICT,
                config='--psm 11'  # Sparse text mode
            )
            
            page_data = {
                "page_num": 1,
                "text_blocks": [],
                "width": image.shape[1],
                "height": image.shape[0]
            }
            
            # Group text by blocks
            for i in range(len(ocr_data['text'])):
                if ocr_data['text'][i].strip():
                    page_data['text_blocks'].append({
                        "text": ocr_data['text'][i],
                        "x": ocr_data['left'][i],
                        "y": ocr_data['top'][i],
                        "width": ocr_data['width'][i],
                        "height": ocr_data['height'][i],
                        "confidence": ocr_data['conf'][i]
                    })
            
            result['pages'].append(page_data)
            result['full_text'] = pytesseract.image_to_string(processed)
            
        elif file_ext == '.pdf':
            # For PDF, we'd need to convert to images first
            # This is a placeholder - would need pdf2image library
            raise NotImplementedError("PDF processing not yet implemented")
        
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")
        
        result['metadata']['ocr_engine'] = 'tesseract'
        result['metadata']['processed_at'] = datetime.utcnow().isoformat()
        
        return result
        
    except Exception as e:
        logger.error(f"OCR extraction failed: {str(e)}")
        raise


def preprocess_image_for_ocr(image: np.ndarray) -> np.ndarray:
    """
    Preprocess image to improve OCR accuracy
    """
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply denoising
    denoised = cv2.fastNlMeansDenoising(gray)
    
    # Apply adaptive thresholding for better text extraction
    thresh = cv2.adaptiveThreshold(
        denoised, 255, 
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 11, 2
    )
    
    # Deskew if needed (simplified - would need more robust implementation)
    # For now, just return the thresholded image
    
    return thresh


def detect_components(ocr_result: Dict[str, Any], drawing_id: str) -> List[Dict[str, Any]]:
    """
    Detect component piece marks in OCR results
    """
    components = []
    
    # Common piece mark patterns for structural steel
    patterns = [
        r'W\d+[xX]\d+',           # Wide flange beams (W21x68)
        r'HSS\d+[xX]\d+[xX]\d+',  # Hollow structural sections
        r'L\d+[xX]\d+[xX]\d+/\d+', # Angles (L4x4x1/2)
        r'C\d+[xX]\d+',           # Channels
        r'WT\d+[xX]\d+',          # Tees
        r'PL\d+[xX]\d+',          # Plates
        r'[A-Z]{1,2}\d{1,3}',     # Generic marks (B1, G23, etc.)
    ]
    
    combined_pattern = '|'.join(f'({p})' for p in patterns)
    
    # Search through all text blocks
    for page in ocr_result.get('pages', []):
        for block in page.get('text_blocks', []):
            text = block['text'].upper()
            
            # Find all matches
            matches = re.finditer(combined_pattern, text)
            
            for match in matches:
                piece_mark = match.group()
                
                # Determine component type
                comp_type = None
                if piece_mark.startswith('W'):
                    comp_type = 'wide_flange'
                elif piece_mark.startswith('HSS'):
                    comp_type = 'hss'
                elif piece_mark.startswith('L'):
                    comp_type = 'angle'
                elif piece_mark.startswith('C'):
                    comp_type = 'channel'
                elif piece_mark.startswith('PL'):
                    comp_type = 'plate'
                else:
                    comp_type = 'generic'
                
                components.append({
                    'piece_mark': piece_mark,
                    'type': comp_type,
                    'x': block.get('x', 0),
                    'y': block.get('y', 0),
                    'confidence': block.get('confidence', 0) / 100.0,
                    'source_text': text,
                    'drawing_id': str(drawing_id)
                })
    
    # Remove duplicates
    unique_components = {}
    for comp in components:
        key = comp['piece_mark']
        if key not in unique_components or comp['confidence'] > unique_components[key]['confidence']:
            unique_components[key] = comp
    
    return list(unique_components.values())


def extract_dimensions_near_component(
    ocr_result: Dict[str, Any], 
    component_x: float, 
    component_y: float,
    search_radius: int = 200
) -> List[Dict[str, Any]]:
    """
    Extract dimensions near a component location
    """
    dimensions = []
    
    # Dimension patterns
    dim_patterns = [
        (r'(\d+(?:\.\d+)?)\s*"', 'length'),  # Inches
        (r'(\d+(?:\.\d+)?)\s*\'', 'length'),  # Feet
        (r'(\d+(?:\.\d+)?)\s*mm', 'length'),  # Millimeters
        (r'Ø\s*(\d+(?:\.\d+)?)', 'diameter'),  # Diameter
        (r'R\s*(\d+(?:\.\d+)?)', 'radius'),    # Radius
    ]
    
    # Search nearby text blocks
    for page in ocr_result.get('pages', []):
        for block in page.get('text_blocks', []):
            # Check if block is within search radius
            block_x = block.get('x', 0)
            block_y = block.get('y', 0)
            
            distance = ((block_x - component_x) ** 2 + (block_y - component_y) ** 2) ** 0.5
            
            if distance <= search_radius:
                text = block['text']
                
                # Try each dimension pattern
                for pattern, dim_type in dim_patterns:
                    matches = re.finditer(pattern, text)
                    
                    for match in matches:
                        try:
                            value = float(match.group(1))
                            dimensions.append({
                                'type': dim_type,
                                'value': value,
                                'unit': 'in' if '"' in text else 'ft' if "'" in text else 'mm',
                                'text': match.group(0),
                                'confidence': block.get('confidence', 0) / 100.0,
                                'x': block_x,
                                'y': block_y
                            })
                        except ValueError:
                            continue
    
    return dimensions


@celery_app.task(bind=True, name="process_drawing_retry")
def process_drawing_retry(self, drawing_id: str, retry_count: int = 0):
    """
    Retry processing with exponential backoff
    """
    max_retries = 3
    
    if retry_count >= max_retries:
        logger.error(f"Max retries reached for drawing {drawing_id}")
        return
    
    try:
        return process_drawing.apply_async(
            args=[drawing_id],
            countdown=60 * (2 ** retry_count)  # Exponential backoff
        )
    except Exception as e:
        logger.error(f"Retry failed for drawing {drawing_id}: {str(e)}")