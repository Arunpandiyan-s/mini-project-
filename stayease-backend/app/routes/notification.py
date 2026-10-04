from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.core.dependencies import get_current_staff
from app.models.staff import Staff
from app.schemas.notification import NotificationResponse, UnreadCountResponse
from app.services import notification_service

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponse])
def list_my_notifications(
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    limit: Optional[int] = Query(None, description="Limit result count"),
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Retrieves notifications belonging strictly to the currently authenticated staff member.
    Ordered newest first.
    """
    return notification_service.get_user_notifications(
        db=db,
        staff_id=current_staff.staff_id,
        is_read=is_read,
        limit=limit
    )

@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Returns unread notification count for the currently authenticated staff member.
    """
    notifications = notification_service.get_user_notifications(
        db=db,
        staff_id=current_staff.staff_id,
        is_read=False
    )
    return {"unread_count": len(notifications)}

@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Marks a specific notification read. Verifies recipient ownership.
    """
    updated = notification_service.mark_read(
        db=db,
        notification_id=notification_id,
        staff_id=current_staff.staff_id
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification '{notification_id}' not found or you are not authorized to view it."
        )
    return updated

@router.patch("/read-all", status_code=status.HTTP_200_OK)
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Marks all unread notifications for the currently authenticated staff member as read.
    """
    notification_service.mark_all_read(db=db, staff_id=current_staff.staff_id)
    return {"status": "success", "message": "All notifications marked as read."}
