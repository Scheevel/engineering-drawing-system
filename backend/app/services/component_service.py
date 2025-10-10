from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from uuid import UUID
from datetime import datetime, timedelta
import logging

from app.models.database import Component, Dimension, Specification, Drawing, Project
from app.models.component import (
    ComponentResponse,
    ComponentCreateRequest,
    ComponentUpdateRequest, 
    ComponentValidationResult,
    DimensionCreateRequest,
    DimensionUpdateRequest,
    DimensionResponse,
    SpecificationCreateRequest,
    SpecificationUpdateRequest,
    SpecificationResponse,
    ComponentAuditLogResponse
)
from app.core.config import settings

logger = logging.getLogger(__name__)

class ComponentService:
    """Service layer for component operations with business logic and validation"""

    def _get_next_instance_identifier(self, piece_mark: str, drawing_id: UUID, db: Session) -> Optional[str]:
        """
        Calculate the next available instance identifier for a piece mark.

        Logic:
        1. Find all existing instances of the piece mark in the drawing
        2. If no instances exist, return None (first instance doesn't need identifier)
        3. Extract used letters (A-Z)
        4. Return first missing letter in sequence (fills gaps)
        5. If all A-Z used, return next in sequence (AA, AB, etc.)

        Args:
            piece_mark: The base piece mark (e.g., "G1")
            drawing_id: The drawing UUID
            db: Database session

        Returns:
            Next available instance identifier (e.g., "A", "B", "C") or None if first instance
        """
        # Query existing components with this piece mark
        existing = db.query(Component).filter(
            and_(
                Component.drawing_id == drawing_id,
                Component.piece_mark == piece_mark.upper()
            )
        ).all()

        # If no existing components, this is the first instance (no identifier needed)
        if not existing:
            return None

        # Extract used instance identifiers (only single uppercase letters A-Z for MVP)
        used_identifiers = set()
        for component in existing:
            if component.instance_identifier:
                identifier = component.instance_identifier.strip().upper()
                # Only consider single letters A-Z for auto-generation
                if len(identifier) == 1 and identifier.isalpha():
                    used_identifiers.add(identifier)

        # Find first missing letter in A-Z sequence
        alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        for letter in alphabet:
            if letter not in used_identifiers:
                return letter

        # All A-Z used - for MVP, return None (user must manually specify)
        # Future enhancement: Generate AA, AB, AC, etc.
        logger.warning(f"All A-Z instance identifiers used for piece mark {piece_mark} in drawing {drawing_id}")
        return None

    async def get_component_with_details(self, component_id: UUID, db: Session) -> Optional[ComponentResponse]:
        """Get component with all related data (dimensions, specifications, drawing context)"""
        try:
            # Query with joined loading for efficiency
            component = db.query(Component).options(
                joinedload(Component.dimensions),
                joinedload(Component.specifications),
                joinedload(Component.drawing).joinedload(Drawing.project)
            ).filter(Component.id == component_id).first()
            
            if not component:
                return None
            
            # Convert to response model
            return self._component_to_response(component)
            
        except Exception as e:
            logger.error(f"Error getting component {component_id}: {str(e)}")
            raise
    
    async def create_component(
        self,
        create_data: ComponentCreateRequest,
        db: Session
    ) -> ComponentResponse:
        """Create a new component with validation and auto-instance generation"""
        try:
            # Auto-generate instance identifier if not provided
            instance_identifier = create_data.instance_identifier
            if not instance_identifier:
                # Calculate next available instance identifier
                suggested_identifier = self._get_next_instance_identifier(
                    piece_mark=create_data.piece_mark,
                    drawing_id=create_data.drawing_id,
                    db=db
                )
                instance_identifier = suggested_identifier

                if suggested_identifier:
                    logger.info(
                        f"Auto-generated instance identifier '{suggested_identifier}' "
                        f"for piece mark '{create_data.piece_mark}' in drawing {create_data.drawing_id}"
                    )

            # Create component instance
            component = Component(
                drawing_id=create_data.drawing_id,
                piece_mark=create_data.piece_mark.upper(),
                component_type=create_data.component_type,
                description=create_data.description,
                quantity=create_data.quantity,
                material_type=create_data.material_type,
                location_x=create_data.location_x,
                location_y=create_data.location_y,
                bounding_box=create_data.bounding_box,
                confidence_score=create_data.confidence_score,
                review_status=create_data.review_status or "pending",
                instance_identifier=instance_identifier,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            # Add to database
            db.add(component)
            db.commit()
            db.refresh(component)
            
            # Reload with related data for response
            component_with_details = db.query(Component).options(
                joinedload(Component.dimensions),
                joinedload(Component.specifications),
                joinedload(Component.drawing).joinedload(Drawing.project)
            ).filter(Component.id == component.id).first()
            
            logger.info(f"Created component {component.id} with piece mark {component.piece_mark}")
            
            return self._component_to_response(component_with_details)
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating component: {str(e)}")
            raise
    
    async def update_component(
        self, 
        component_id: UUID, 
        update_data: ComponentUpdateRequest, 
        db: Session
    ) -> Optional[ComponentResponse]:
        """Update component with full validation and audit logging"""
        try:
            component = db.query(Component).filter(Component.id == component_id).first()
            if not component:
                return None
            
            # Store original values for audit log
            original_values = {
                field: getattr(component, field) 
                for field in update_data.dict(exclude_unset=True).keys()
                if hasattr(component, field)
            }
            
            # Apply updates
            update_dict = update_data.dict(exclude_unset=True)
            for field, value in update_dict.items():
                if hasattr(component, field):
                    setattr(component, field, value)
            
            # Update timestamp
            component.updated_at = datetime.utcnow()
            
            # Recalculate confidence if this was a manual edit
            if any(field in update_dict for field in ['piece_mark', 'component_type', 'description']):
                component.confidence_score = self._calculate_updated_confidence(component, update_dict)
            
            db.commit()
            
            # Log the changes
            await self._log_component_changes(component_id, original_values, update_dict, db)
            
            # Return updated component with details
            return await self.get_component_with_details(component_id, db)
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating component {component_id}: {str(e)}")
            raise
    
    async def partial_update_component(
        self, 
        component_id: UUID, 
        update_data: ComponentUpdateRequest, 
        db: Session
    ) -> Optional[ComponentResponse]:
        """Partial update with optimistic updates for UI responsiveness"""
        return await self.update_component(component_id, update_data, db)
    
    async def delete_component(self, component_id: UUID, db: Session) -> bool:
        """Soft delete component and cascade to related data"""
        try:
            component = db.query(Component).filter(Component.id == component_id).first()
            if not component:
                return False
            
            # For now, hard delete - could implement soft delete by adding deleted_at field
            db.delete(component)
            db.commit()
            
            # Log deletion
            await self._log_component_action(component_id, "deleted", None, None, db)
            
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting component {component_id}: {str(e)}")
            raise
    
    async def validate_component_update(
        self, 
        component_id: UUID, 
        update_data: ComponentUpdateRequest, 
        db: Session
    ) -> ComponentValidationResult:
        """Comprehensive validation of component update data"""
        errors = []
        warnings = []
        
        try:
            component = db.query(Component).filter(Component.id == component_id).first()
            if not component:
                errors.append("Component not found")
                return ComponentValidationResult(is_valid=False, errors=errors)
            
            update_dict = update_data.dict(exclude_unset=True)
            
            # Validate piece mark uniqueness within drawing considering instance_identifier
            if 'piece_mark' in update_dict or 'instance_identifier' in update_dict:
                # Get the values that will be used after update
                new_piece_mark = update_dict.get('piece_mark', component.piece_mark)
                new_instance_identifier = update_dict.get('instance_identifier', component.instance_identifier)
                
                existing = db.query(Component).filter(
                    and_(
                        Component.drawing_id == component.drawing_id,
                        Component.piece_mark == new_piece_mark,
                        Component.instance_identifier == new_instance_identifier,
                        Component.id != component_id
                    )
                ).first()
                
                if existing:
                    if new_instance_identifier:
                        errors.append(f"Component with piece mark '{new_piece_mark}' and instance identifier '{new_instance_identifier}' already exists in this drawing")
                    else:
                        errors.append(f"Component with piece mark '{new_piece_mark}' already exists in this drawing")
            
            # Validate component type specific rules
            if 'component_type' in update_dict:
                comp_type = update_dict['component_type']
                type_warnings = self._validate_component_type_rules(comp_type, update_dict)
                warnings.extend(type_warnings)
            
            # Validate material type compatibility
            if 'material_type' in update_dict and 'component_type' in update_dict:
                material_warnings = self._validate_material_compatibility(
                    update_dict['component_type'], 
                    update_dict['material_type']
                )
                warnings.extend(material_warnings)
            
            # Validate confidence score impact
            if component.confidence_score and component.confidence_score < settings.MIN_CONFIDENCE_THRESHOLD:
                warnings.append("This component was below confidence threshold - manual verification recommended")
            
            # Validate quantity logic
            if 'quantity' in update_dict and update_dict['quantity'] > 100:
                warnings.append("Large quantity detected - please verify this is correct")
            
            return ComponentValidationResult(
                is_valid=len(errors) == 0,
                errors=errors,
                warnings=warnings
            )
            
        except Exception as e:
            logger.error(f"Error validating component update: {str(e)}")
            errors.append("Validation failed due to internal error")
            return ComponentValidationResult(is_valid=False, errors=errors)
    
    async def check_piece_mark_duplicates(
        self, 
        component_id: UUID, 
        piece_mark: str, 
        db: Session
    ) -> List[Dict[str, Any]]:
        """Check for duplicate piece marks within the same drawing"""
        try:
            component = db.query(Component).filter(Component.id == component_id).first()
            if not component:
                return []
            
            duplicates = db.query(Component).filter(
                and_(
                    Component.drawing_id == component.drawing_id,
                    Component.piece_mark == piece_mark,
                    Component.id != component_id
                )
            ).all()
            
            return [
                {
                    "id": str(dup.id),
                    "piece_mark": dup.piece_mark,
                    "component_type": dup.component_type,
                    "location_x": dup.location_x,
                    "location_y": dup.location_y
                }
                for dup in duplicates
            ]
            
        except Exception as e:
            logger.error(f"Error checking duplicates: {str(e)}")
            return []
    
    # Dimension management methods
    async def get_component_dimensions(self, component_id: UUID, db: Session) -> List[DimensionResponse]:
        """Get all dimensions for a component"""
        try:
            dimensions = db.query(Dimension).filter(
                Dimension.component_id == component_id
            ).order_by(Dimension.dimension_type).all()
            
            return [DimensionResponse.from_orm(dim) for dim in dimensions]
            
        except Exception as e:
            logger.error(f"Error getting dimensions for component {component_id}: {str(e)}")
            raise
    
    async def create_dimension(
        self, 
        component_id: UUID, 
        dimension_data: DimensionCreateRequest, 
        db: Session
    ) -> DimensionResponse:
        """Create a new dimension for a component"""
        try:
            dimension = Dimension(
                component_id=component_id,
                **dimension_data.dict()
            )
            
            db.add(dimension)
            db.commit()
            db.refresh(dimension)
            
            return DimensionResponse.from_orm(dimension)
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating dimension: {str(e)}")
            raise
    
    async def update_dimension(
        self, 
        dimension_id: UUID, 
        dimension_data: DimensionUpdateRequest, 
        db: Session
    ) -> Optional[DimensionResponse]:
        """Update an existing dimension"""
        try:
            dimension = db.query(Dimension).filter(Dimension.id == dimension_id).first()
            if not dimension:
                return None
            
            update_dict = dimension_data.dict(exclude_unset=True)
            for field, value in update_dict.items():
                setattr(dimension, field, value)
            
            db.commit()
            db.refresh(dimension)
            
            return DimensionResponse.from_orm(dimension)
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating dimension {dimension_id}: {str(e)}")
            raise
    
    async def delete_dimension(self, dimension_id: UUID, db: Session) -> bool:
        """Delete a dimension"""
        try:
            dimension = db.query(Dimension).filter(Dimension.id == dimension_id).first()
            if not dimension:
                return False
            
            db.delete(dimension)
            db.commit()
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting dimension {dimension_id}: {str(e)}")
            raise
    
    # Specification management methods
    async def get_component_specifications(self, component_id: UUID, db: Session) -> List[SpecificationResponse]:
        """Get all specifications for a component"""
        try:
            specifications = db.query(Specification).filter(
                Specification.component_id == component_id
            ).order_by(Specification.specification_type).all()
            
            return [SpecificationResponse.from_orm(spec) for spec in specifications]
            
        except Exception as e:
            logger.error(f"Error getting specifications for component {component_id}: {str(e)}")
            raise
    
    async def create_specification(
        self, 
        component_id: UUID, 
        spec_data: SpecificationCreateRequest, 
        db: Session
    ) -> SpecificationResponse:
        """Create a new specification for a component"""
        try:
            specification = Specification(
                component_id=component_id,
                **spec_data.dict()
            )
            
            db.add(specification)
            db.commit()
            db.refresh(specification)
            
            return SpecificationResponse.from_orm(specification)
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating specification: {str(e)}")
            raise
    
    async def update_specification(
        self, 
        spec_id: UUID, 
        spec_data: SpecificationUpdateRequest, 
        db: Session
    ) -> Optional[SpecificationResponse]:
        """Update an existing specification"""
        try:
            specification = db.query(Specification).filter(Specification.id == spec_id).first()
            if not specification:
                return None
            
            update_dict = spec_data.dict(exclude_unset=True)
            for field, value in update_dict.items():
                setattr(specification, field, value)
            
            db.commit()
            db.refresh(specification)
            
            return SpecificationResponse.from_orm(specification)
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating specification {spec_id}: {str(e)}")
            raise
    
    async def delete_specification(self, spec_id: UUID, db: Session) -> bool:
        """Delete a specification"""
        try:
            specification = db.query(Specification).filter(Specification.id == spec_id).first()
            if not specification:
                return False
            
            db.delete(specification)
            db.commit()
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting specification {spec_id}: {str(e)}")
            raise
    
    # Audit and history methods
    async def get_component_audit_log(
        self, 
        component_id: UUID, 
        limit: int, 
        db: Session
    ) -> List[ComponentAuditLogResponse]:
        """Get audit trail for component (placeholder - would need audit table)"""
        # For now, return empty list - would implement with proper audit table
        return []
    
    # Private helper methods
    def _component_to_response(self, component: Component) -> ComponentResponse:
        """Convert database model to response model with related data"""
        response_data = {
            "id": component.id,
            "drawing_id": component.drawing_id,
            "piece_mark": component.piece_mark,
            "component_type": component.component_type,
            "description": component.description,
            "quantity": component.quantity,
            "material_type": component.material_type,
            "location_x": component.location_x,
            "location_y": component.location_y,
            "bounding_box": component.bounding_box,
            "confidence_score": component.confidence_score,
            "review_status": component.review_status,
            "created_at": component.created_at,
            "updated_at": component.updated_at,
            "instance_identifier": component.instance_identifier,
        }
        
        # Add dimensions
        if hasattr(component, 'dimensions') and component.dimensions:
            response_data["dimensions"] = [
                DimensionResponse.from_orm(dim) for dim in component.dimensions
            ]
        
        # Add specifications
        if hasattr(component, 'specifications') and component.specifications:
            response_data["specifications"] = [
                SpecificationResponse.from_orm(spec) for spec in component.specifications
            ]
        
        # Add drawing context
        if hasattr(component, 'drawing') and component.drawing:
            drawing = component.drawing
            response_data.update({
                "drawing_file_name": drawing.file_name,
                "sheet_number": drawing.sheet_number,
                "drawing_type": drawing.drawing_type,
            })
            
            # Add project context
            if hasattr(drawing, 'project') and drawing.project:
                response_data["project_name"] = drawing.project.name
            else:
                response_data["project_name"] = "Unassigned"
        
        return ComponentResponse(**response_data)
    
    def _calculate_updated_confidence(self, component: Component, updates: Dict[str, Any]) -> float:
        """Recalculate confidence score after manual updates"""
        # Start with original confidence or default
        base_confidence = component.confidence_score or 0.5
        
        # Manual edits typically increase confidence
        confidence_boost = 0.2
        
        # But cap at reasonable level to indicate manual intervention
        return min(base_confidence + confidence_boost, 0.95)
    
    def _validate_component_type_rules(self, comp_type: str, update_data: Dict[str, Any]) -> List[str]:
        """Validate component type specific business rules"""
        warnings = []
        
        # Example rules - would be expanded based on domain expertise
        if comp_type == 'plate' and update_data.get('quantity', 1) > 50:
            warnings.append("Large plate quantity - verify this is not a material specification")
        
        if comp_type in ['wide_flange', 'beam'] and not update_data.get('material_type'):
            warnings.append("Wide flange beams typically require material specification")
        
        return warnings
    
    def _validate_material_compatibility(self, comp_type: str, material_type: str) -> List[str]:
        """Validate material type compatibility with component type"""
        warnings = []
        
        # Example compatibility rules
        structural_steel_types = ['wide_flange', 'hss', 'angle', 'channel', 'plate']
        if comp_type in structural_steel_types and material_type and 'concrete' in material_type.lower():
            warnings.append("Structural steel component with concrete material - please verify")
        
        return warnings
    
    async def _log_component_changes(
        self, 
        component_id: UUID, 
        original_values: Dict[str, Any], 
        new_values: Dict[str, Any], 
        db: Session
    ):
        """Log component changes for audit trail (placeholder)"""
        # Would implement with proper audit table
        logger.info(f"Component {component_id} updated: {list(new_values.keys())}")
    
    async def _log_component_action(
        self, 
        component_id: UUID, 
        action: str, 
        old_value: Any, 
        new_value: Any, 
        db: Session
    ):
        """Log component action for audit trail (placeholder)"""
        logger.info(f"Component {component_id} {action}")