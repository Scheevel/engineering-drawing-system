from typing import List, Optional
from sqlalchemy.orm import Session
from uuid import UUID, uuid4
from datetime import datetime
import json
import logging

from app.models.database import ComponentAuditLog

logger = logging.getLogger(__name__)


class AuditService:
    """Service for managing component audit logs"""

    def __init__(self, db: Session):
        self.db = db

    def create_schema_change_audit(
        self,
        component_id: UUID,
        old_schema_id: Optional[UUID],
        new_schema_id: Optional[UUID],
        old_dynamic_data: dict,
        changed_by: Optional[str] = None
    ) -> str:
        """
        Create audit trail for schema change with 2 linked records.

        Args:
            component_id: UUID of the component being changed
            old_schema_id: Previous schema UUID (can be None)
            new_schema_id: New schema UUID (can be None)
            old_dynamic_data: Previous dynamic_data dict to preserve
            changed_by: User ID who made the change (None if not authenticated)

        Returns:
            session_id: UUID string linking the two audit records

        Raises:
            ValueError: If audit record creation fails
        """
        try:
            # Generate shared session ID for linking both records
            session_id = str(uuid4())
            timestamp = datetime.utcnow()

            # Convert UUIDs to strings, handle None as "null"
            old_schema_str = str(old_schema_id) if old_schema_id else "null"
            new_schema_str = str(new_schema_id) if new_schema_id else "null"

            # Convert dynamic_data dict to JSON string
            old_dynamic_json = json.dumps(old_dynamic_data) if old_dynamic_data else "{}"

            # Record 1: schema_id change
            audit_record_1 = ComponentAuditLog(
                id=uuid4(),
                component_id=component_id,
                action="updated",
                field_name="schema_id",
                old_value=old_schema_str,
                new_value=new_schema_str,
                changed_by=changed_by,
                change_reason=None,
                session_id=session_id,
                timestamp=timestamp
            )

            # Record 2: dynamic_data preservation
            audit_record_2 = ComponentAuditLog(
                id=uuid4(),
                component_id=component_id,
                action="updated",
                field_name="dynamic_data",
                old_value=old_dynamic_json,
                new_value="{}",
                changed_by=changed_by,
                change_reason=None,
                session_id=session_id,
                timestamp=timestamp
            )

            # Insert both records
            self.db.add(audit_record_1)
            self.db.add(audit_record_2)
            self.db.flush()  # Force insert to detect any database errors

            logger.info(
                f"Created schema change audit for component {component_id}: "
                f"{old_schema_str} → {new_schema_str} (session: {session_id})"
            )

            return session_id

        except Exception as e:
            logger.error(f"Failed to create schema change audit: {str(e)}")
            raise ValueError(f"Failed to create audit trail: {str(e)}")

    def get_component_audit_history(
        self,
        component_id: UUID,
        session_id: Optional[str] = None,
        limit: int = 100
    ) -> List[ComponentAuditLog]:
        """
        Retrieve audit history for a component.

        Args:
            component_id: UUID of the component
            session_id: Optional filter for specific session (schema change)
            limit: Maximum number of records to return (default: 100)

        Returns:
            List of ComponentAuditLog records, ordered by timestamp DESC
        """
        try:
            query = self.db.query(ComponentAuditLog).filter(
                ComponentAuditLog.component_id == component_id
            )

            # Filter by session if provided
            if session_id:
                query = query.filter(ComponentAuditLog.session_id == session_id)

            # Order by most recent first
            query = query.order_by(ComponentAuditLog.timestamp.desc())

            # Apply limit
            query = query.limit(limit)

            results = query.all()

            logger.info(
                f"Retrieved {len(results)} audit records for component {component_id}"
                + (f" (session: {session_id})" if session_id else "")
            )

            return results

        except Exception as e:
            logger.error(f"Failed to retrieve audit history: {str(e)}")
            raise
