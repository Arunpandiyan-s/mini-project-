from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.core.dependencies import require_roles
from app.models.staff import Staff
from app.models.enums import StaffRole
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/api/operations", tags=["Operations"])

@router.get("/feed")
def get_operations_feed(
    limit: int = Query(50, ge=1, le=200, description="Number of events to retrieve (1-200)"),
    event_type: Optional[str] = Query(None, description="Optional filter by event type"),
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN))
):
    """
    Retrieves recent operational events from AuditLog. Accessible only to ADMIN.
    Orders events newest first.
    """
    query = db.query(AuditLog)
    if event_type:
        query = query.filter(AuditLog.event_type == event_type)
    query = query.order_by(AuditLog.created_at.desc()).limit(limit)
    
    logs = query.all()
    result = []
    for log in logs:
        result.append({
            "event_type": log.event_type,
            "actor_type": log.actor_type,
            "actor_id": log.actor_id,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "description": log.description,
            "metadata_json": log.metadata_json,
            "created_at": log.created_at
        })
    return result
