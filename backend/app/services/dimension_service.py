"""
Dimension Service - Business logic for dimension validation

Story 6.4: Prevent Duplicate Dimension Types Per Component
Provides validation to ensure each component has at most one dimension per type.
"""

from typing import Optional
from sqlalchemy.orm import Session
from uuid import UUID
import logging

from app.models.database import Dimension

logger = logging.getLogger(__name__)


def validate_dimension_type_unique(
    db: Session,
    component_id: UUID,
    dimension_type: str,
    dimension_id: Optional[UUID] = None
) -> None:
    """
    Validate that dimension_type is unique for component.

    Args:
        db: Database session
        component_id: Component UUID
        dimension_type: Dimension type to validate
        dimension_id: If updating, exclude this dimension from check

    Raises:
        ValueError: If duplicate dimension type exists
    """
    query = db.query(Dimension).filter(
        Dimension.component_id == component_id,
        Dimension.dimension_type == dimension_type
    )

    if dimension_id:
        # Updating existing dimension - exclude self from check
        query = query.filter(Dimension.id != dimension_id)

    existing = query.first()

    if existing:
        raise ValueError(
            f"Component already has a dimension of type '{dimension_type}'"
        )
