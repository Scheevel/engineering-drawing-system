from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    client = Column(String(255))
    location = Column(String(255))
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    drawings = relationship("Drawing", back_populates="project", cascade="all, delete-orphan")

class Drawing(Base):
    __tablename__ = "drawings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    file_name = Column(String(255), nullable=False)
    original_name = Column(String(255))
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer)
    file_hash = Column(String(64), unique=True, index=True)  # SHA256 hash for duplicate detection
    drawing_type = Column(String(50))  # E-sheet, shop drawing, detail drawing
    sheet_number = Column(String(50))
    drawing_date = Column(DateTime)
    upload_date = Column(DateTime, default=datetime.utcnow)
    processing_status = Column(String(50), default="pending")  # pending, processing, completed, failed
    processing_progress = Column(Integer, default=0)
    error_message = Column(Text)
    drawing_metadata = Column(JSON)
    
    # Relationships
    project = relationship("Project", back_populates="drawings")
    components = relationship("Component", back_populates="drawing", cascade="all, delete-orphan")

class Component(Base):
    __tablename__ = "components"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    drawing_id = Column(UUID(as_uuid=True), ForeignKey("drawings.id"), nullable=False)
    piece_mark = Column(String(100), nullable=False, index=True)
    component_type = Column(String(100))  # girder, brace, plate, angle, etc.
    description = Column(Text)
    quantity = Column(Integer, default=1)
    material_type = Column(String(100))
    
    # Location within drawing
    location_x = Column(Float)
    location_y = Column(Float)
    bounding_box = Column(JSON)  # Store coordinates as JSON
    
    # Confidence and quality metrics
    confidence_score = Column(Float)
    review_status = Column(String(50), default="pending")  # pending, reviewed, approved
    
    # Additional extracted data
    extracted_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    drawing = relationship("Drawing", back_populates="components")
    dimensions = relationship("Dimension", back_populates="component", cascade="all, delete-orphan")
    specifications = relationship("Specification", back_populates="component", cascade="all, delete-orphan")

class Dimension(Base):
    __tablename__ = "dimensions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    component_id = Column(UUID(as_uuid=True), ForeignKey("components.id"), nullable=False)
    dimension_type = Column(String(50))  # length, width, height, diameter, etc.
    nominal_value = Column(Float)
    tolerance = Column(String(50))
    unit = Column(String(20), default="mm")
    confidence_score = Column(Float)
    location_x = Column(Float)
    location_y = Column(Float)
    extracted_text = Column(String(100))
    
    # Relationships
    component = relationship("Component", back_populates="dimensions")

class Specification(Base):
    __tablename__ = "specifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    component_id = Column(UUID(as_uuid=True), ForeignKey("components.id"), nullable=False)
    specification_type = Column(String(100))  # material, grade, standard, etc.
    value = Column(String(255))
    description = Column(Text)
    confidence_score = Column(Float)
    
    # Relationships
    component = relationship("Component", back_populates="specifications")

class ProcessingTask(Base):
    __tablename__ = "processing_tasks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    drawing_id = Column(UUID(as_uuid=True), ForeignKey("drawings.id"), nullable=False)
    task_type = Column(String(50))  # ocr, component_detection, dimension_extraction
    status = Column(String(50), default="pending")  # pending, running, completed, failed
    progress = Column(Integer, default=0)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    error_message = Column(Text)
    result_data = Column(JSON)
    
    # Celery task tracking
    celery_task_id = Column(String(255))

class SearchLog(Base):
    __tablename__ = "search_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    query = Column(String(500), nullable=False)
    filters = Column(JSON)
    results_count = Column(Integer)
    response_time_ms = Column(Integer)
    user_id = Column(String(100))  # For future user tracking
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Index for analytics
    __table_args__ = {"schema": None}

class ComponentAuditLog(Base):
    __tablename__ = "component_audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    component_id = Column(UUID(as_uuid=True), ForeignKey("components.id"), nullable=False)
    action = Column(String(50), nullable=False)  # created, updated, deleted, reviewed
    field_name = Column(String(100))  # Which field was changed (null for creation/deletion)
    old_value = Column(Text)  # JSON string of old value
    new_value = Column(Text)  # JSON string of new value
    changed_by = Column(String(100))  # User ID who made the change
    change_reason = Column(String(500))  # Optional reason for change
    session_id = Column(String(100))  # Track bulk changes in same session
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    component = relationship("Component")

class ComponentVersion(Base):
    __tablename__ = "component_versions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    component_id = Column(UUID(as_uuid=True), ForeignKey("components.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    component_data = Column(JSON, nullable=False)  # Full component state at this version
    dimensions_data = Column(JSON)  # Dimensions at this version
    specifications_data = Column(JSON)  # Specifications at this version
    created_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    change_summary = Column(String(500))
    
    # Relationships
    component = relationship("Component")