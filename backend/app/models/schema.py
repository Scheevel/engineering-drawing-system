from pydantic import BaseModel, Field, validator, root_validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from uuid import UUID
from enum import Enum

# Field type enums for validation
class SchemaFieldType(str, Enum):
    TEXT = "text"
    NUMBER = "number"
    SELECT = "select"
    MULTISELECT = "multiselect"
    AUTOCOMPLETE = "autocomplete"
    DATE = "date"
    CHECKBOX = "checkbox"
    TEXTAREA = "textarea"

# Base models for schema fields
class ComponentSchemaFieldBase(BaseModel):
    field_name: str = Field(..., min_length=1, max_length=100)
    field_type: SchemaFieldType
    field_config: Dict[str, Any] = Field(default_factory=dict)
    help_text: Optional[str] = Field(None, max_length=1000)
    display_order: int = Field(0, ge=0)
    is_required: bool = False
    is_active: bool = True

    @validator('field_name')
    def validate_field_name(cls, v):
        """Ensure field name is valid identifier"""
        import re
        if not re.match(r'^[a-zA-Z][a-zA-Z0-9_]*$', v):
            raise ValueError('Field name must be a valid identifier (letters, numbers, underscore)')

        # Reserved field names that cannot be used
        reserved_names = ['id', 'created_at', 'updated_at', 'schema_id', 'piece_mark', 'drawing_id']
        if v.lower() in reserved_names:
            raise ValueError(f'Field name "{v}" is reserved and cannot be used')

        return v.lower()

    @validator('field_config')
    def validate_field_config(cls, v, values):
        """Validate field_config based on field_type"""
        field_type = values.get('field_type')

        if field_type == SchemaFieldType.SELECT:
            if 'options' not in v:
                raise ValueError('Select fields must have options in field_config')
            if not isinstance(v['options'], list) or len(v['options']) == 0:
                raise ValueError('Select options must be a non-empty list')

        elif field_type == SchemaFieldType.NUMBER:
            if 'min' in v and 'max' in v and v['min'] > v['max']:
                raise ValueError('Number field min value cannot be greater than max value')

        elif field_type == SchemaFieldType.TEXT:
            if 'max_length' in v and v['max_length'] <= 0:
                raise ValueError('Text field max_length must be positive')

        return v

class ComponentSchemaFieldCreate(ComponentSchemaFieldBase):
    pass

class ComponentSchemaFieldUpdate(BaseModel):
    field_name: Optional[str] = Field(None, min_length=1, max_length=100)
    field_type: Optional[SchemaFieldType] = None
    field_config: Optional[Dict[str, Any]] = None
    help_text: Optional[str] = Field(None, max_length=1000)
    display_order: Optional[int] = Field(None, ge=0)
    is_required: Optional[bool] = None
    is_active: Optional[bool] = None

    @validator('field_name')
    def validate_field_name(cls, v):
        if v is not None:
            # Same validation as create
            import re
            if not re.match(r'^[a-zA-Z][a-zA-Z0-9_]*$', v):
                raise ValueError('Field name must be a valid identifier')

            reserved_names = ['id', 'created_at', 'updated_at', 'schema_id', 'piece_mark', 'drawing_id']
            if v.lower() in reserved_names:
                raise ValueError(f'Field name "{v}" is reserved')

            return v.lower()
        return v

class ComponentSchemaFieldResponse(ComponentSchemaFieldBase):
    id: UUID
    schema_id: UUID

    class Config:
        from_attributes = True

# Base models for component schemas
class ComponentSchemaBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=100, description="Schema name (3-100 characters, letters, numbers, hyphens, underscores only)")
    description: Optional[str] = Field(None, max_length=1000)
    is_default: bool = False
    is_active: bool = True

    @validator('name')
    def validate_name(cls, v):
        """
        Validate schema name according to requirements:
        - 3-100 characters
        - Only letters, numbers, hyphens (-), underscores (_)
        - Must start with letter or number
        - No leading/trailing spaces
        """
        import re

        # Check for empty or whitespace-only
        if not v or not v.strip():
            raise ValueError('Schema name cannot be empty')

        # Check for leading/trailing spaces
        if v != v.strip():
            raise ValueError('Schema name cannot have leading or trailing spaces')

        trimmed = v.strip()

        # Check minimum length (Pydantic Field handles max, but we check min for better error message)
        if len(trimmed) < 3:
            raise ValueError('Minimum 3 characters required')

        # Check if name contains spaces
        if ' ' in trimmed:
            raise ValueError('Schema name cannot contain spaces. Use hyphens (-) or underscores (_) instead')

        # Check if starts with letter or number
        if not re.match(r'^[a-zA-Z0-9]', trimmed):
            raise ValueError('Schema name must start with a letter or number')

        # Check for invalid characters and provide specific feedback
        invalid_chars = set()
        valid_pattern = re.compile(r'^[a-zA-Z0-9_-]$')

        for char in trimmed:
            if not valid_pattern.match(char):
                invalid_chars.add(char)

        if invalid_chars:
            char_list = ', '.join(f'"{c}"' for c in sorted(invalid_chars))
            raise ValueError(f'Invalid characters: {char_list}. Allowed: letters, numbers, hyphens (-), underscores (_)')

        # Final pattern check - must start with letter/number, then only valid chars
        if not re.match(r'^[a-zA-Z0-9][a-zA-Z0-9_-]*$', trimmed):
            raise ValueError('Schema name must start with a letter or number and can only contain letters, numbers, hyphens (-), and underscores (_)')

        return trimmed

class ComponentSchemaCreate(ComponentSchemaBase):
    project_id: Optional[UUID] = None  # Null for global schemas
    fields: List[ComponentSchemaFieldCreate] = Field(default_factory=list)

    @validator('fields')
    def validate_fields(cls, v):
        """Ensure field names are unique within schema"""
        if not v:
            raise ValueError('Schema must have at least one field')

        field_names = [field.field_name.lower() for field in v]
        if len(field_names) != len(set(field_names)):
            raise ValueError('Field names must be unique within schema')

        return v

class ComponentSchemaUpdate(ComponentSchemaBase):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None

    # Fields are handled separately through field-specific endpoints

class ComponentSchemaResponse(ComponentSchemaBase):
    id: UUID
    project_id: Optional[UUID] = None
    version: int = 1
    fields: List[ComponentSchemaFieldResponse] = Field(default_factory=list)
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ComponentSchemaListResponse(BaseModel):
    schemas: List[ComponentSchemaResponse]
    total: int
    project_id: Optional[UUID] = None

# Enhanced component models with schema support
class DynamicComponentData(BaseModel):
    """Container for schema-driven field values"""
    field_values: Dict[str, Any] = Field(default_factory=dict)

    @validator('field_values')
    def validate_field_values(cls, v):
        """Basic validation of field values"""
        # Remove None values and empty strings
        cleaned = {k: val for k, val in v.items() if val is not None and val != ""}
        return cleaned

class FlexibleComponentCreate(BaseModel):
    """Create request for components with flexible schema data"""
    # Required fields from original component
    drawing_id: UUID = Field(..., description="ID of the drawing this component belongs to")
    piece_mark: str = Field(..., min_length=1, max_length=100)
    location_x: float = Field(..., description="X coordinate on the drawing")
    location_y: float = Field(..., description="Y coordinate on the drawing")

    # Schema-related fields
    schema_id: UUID = Field(..., description="Schema to use for this component")
    dynamic_data: DynamicComponentData = Field(default_factory=DynamicComponentData)

    # Optional fields
    instance_identifier: Optional[str] = Field(None, max_length=10)
    bounding_box: Optional[Dict[str, Any]] = None
    confidence_score: Optional[float] = Field(1.0, ge=0, le=1)
    review_status: Optional[str] = Field("pending", pattern=r'^(pending|reviewed|approved)$')

class FlexibleComponentUpdate(BaseModel):
    """Update request for components with flexible schema data"""
    piece_mark: Optional[str] = Field(None, min_length=1, max_length=100)
    location_x: Optional[float] = None
    location_y: Optional[float] = None
    instance_identifier: Optional[str] = Field(None, max_length=10)
    bounding_box: Optional[Dict[str, Any]] = None
    review_status: Optional[str] = Field(None, pattern=r'^(pending|reviewed|approved)$')

    # Schema changes - only allowed if component is not type-locked
    schema_id: Optional[UUID] = None
    dynamic_data: Optional[DynamicComponentData] = None

class FlexibleComponentResponse(BaseModel):
    """Response model for components with schema information"""
    # Basic component fields
    id: UUID
    drawing_id: UUID
    piece_mark: str
    location_x: Optional[float]
    location_y: Optional[float]
    instance_identifier: Optional[str] = None
    bounding_box: Optional[Dict[str, Any]] = None
    confidence_score: Optional[float]
    review_status: str
    created_at: datetime
    updated_at: datetime

    # Schema-related fields
    schema_id: Optional[UUID] = None
    schema_info: Optional[ComponentSchemaResponse] = None
    dynamic_data: DynamicComponentData = Field(default_factory=DynamicComponentData)
    is_type_locked: bool = False  # Computed field

    # Drawing context (same as original)
    drawing_file_name: Optional[str] = None
    sheet_number: Optional[str] = None
    drawing_type: Optional[str] = None
    project_name: Optional[str] = None

    class Config:
        from_attributes = True

# Schema validation models
class SchemaValidationResult(BaseModel):
    """Result of validating data against a schema"""
    is_valid: bool
    validated_data: Dict[str, Any] = Field(default_factory=dict)
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)

class TypeLockStatus(BaseModel):
    """Information about component type locking"""
    is_locked: bool
    lock_reason: Optional[str] = None
    locked_fields: List[str] = Field(default_factory=list)
    can_unlock: bool = False

# Bulk operations
class BulkSchemaAssignmentRequest(BaseModel):
    """Bulk assign schema to multiple components"""
    component_ids: List[UUID] = Field(..., min_items=1, max_items=100)
    target_schema_id: UUID
    force_assignment: bool = False  # Override type-locking if true

class BulkSchemaAssignmentResponse(BaseModel):
    """Result of bulk schema assignment"""
    successful_assignments: List[UUID] = Field(default_factory=list)
    failed_assignments: List[Dict[str, Any]] = Field(default_factory=list)  # {component_id, error}
    locked_components: List[UUID] = Field(default_factory=list)
    total_processed: int

# Migration and import models
class SchemaImportRequest(BaseModel):
    """Import schema from external definition"""
    project_id: Optional[UUID] = None
    schema_definition: Dict[str, Any]
    import_mode: str = Field("merge", pattern=r'^(merge|replace|create_new)$')

class SchemaExportResponse(BaseModel):
    """Export schema definition"""
    schema_info: ComponentSchemaResponse
    export_format: str = "json"
    export_data: Dict[str, Any]
    created_at: datetime