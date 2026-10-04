import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.notification import Notification

logger = logging.getLogger(__name__)

def generate_notification_id() -> str:
    """
    Generates a unique readable notification business ID (e.g. NTF-A82F31).
    """
    return f"NTF-{uuid.uuid4().hex[:8].upper()}"

def create_notification(
    db: Session,
    recipient_staff_id: str,
    type: str,
    title: str,
    message: str,
    entity_type: str = None,
    entity_id: str = None,
    priority: str = None
) -> Notification:
    """
    Creates and persists a persistent Notification in the database.
    Performs db.flush() to populate the object but DOES NOT call db.commit(),
    allowing the outer transaction to control database atomicity.
    """
    notification = Notification(
        notification_id=generate_notification_id(),
        recipient_staff_id=recipient_staff_id,
        type=type,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
        is_read=False,
        priority=priority
    )
    db.add(notification)
    db.flush()
    return notification

def get_user_notifications(db: Session, staff_id: str, is_read: bool = None, limit: int = None):
    """
    Fetches notifications for a specific authenticated employee, ordered newest first.
    """
    query = db.query(Notification).filter(Notification.recipient_staff_id == staff_id)
    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)
    query = query.order_by(Notification.created_at.desc())
    if limit is not None:
        query = query.limit(limit)
    return query.all()

def mark_read(db: Session, notification_id: str, staff_id: str) -> Notification:
    """
    Marks a specific notification read if the current staff member owns it.
    This operation is self-contained and calls db.commit() directly.
    """
    notification = db.query(Notification).filter(
        Notification.notification_id == notification_id,
        Notification.recipient_staff_id == staff_id
    ).first()
    if not notification:
        return None
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notification)
    return notification

def mark_all_read(db: Session, staff_id: str):
    """
    Marks all unread notifications for a staff member as read.
    This operation is self-contained and calls db.commit() directly.
    """
    notifications = db.query(Notification).filter(
        Notification.recipient_staff_id == staff_id,
        Notification.is_read == False
    ).all()
    if not notifications:
        return
    now = datetime.now(timezone.utc)
    for n in notifications:
        n.is_read = True
        n.read_at = now
    db.commit()

# Guest Notifications Integration

from app.models.guest_notification import GuestNotification

def generate_guest_notification_id() -> str:
    """
    Generates a unique readable guest notification business ID (e.g. GNT-A82F31).
    """
    return f"GNT-{uuid.uuid4().hex[:8].upper()}"

def create_guest_notification(
    db: Session,
    recipient_guest_id: str,
    type: str,
    title: str,
    message: str,
    entity_type: str = None,
    entity_id: str = None,
    priority: str = None
) -> GuestNotification:
    """
    Creates and persists a GuestNotification in the database.
    Performs db.flush() but does not commit, allowing the outer transaction to own atomicity.
    """
    notification = GuestNotification(
        notification_id=generate_guest_notification_id(),
        recipient_guest_id=recipient_guest_id,
        type=type,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
        is_read=False,
        priority=priority
    )
    db.add(notification)
    db.flush()
    return notification

def get_guest_notifications(db: Session, guest_id: str, is_read: bool = None, limit: int = None):
    """
    Fetches persistent notifications for a guest, newest first.
    """
    query = db.query(GuestNotification).filter(GuestNotification.recipient_guest_id == guest_id)
    if is_read is not None:
        query = query.filter(GuestNotification.is_read == is_read)
    query = query.order_by(GuestNotification.created_at.desc())
    if limit is not None:
        query = query.limit(limit)
    return query.all()

def mark_guest_notification_read(db: Session, notification_id: str, guest_id: str) -> GuestNotification:
    """
    Marks a specific guest notification as read if it belongs to the current guest.
    """
    notification = db.query(GuestNotification).filter(
        GuestNotification.notification_id == notification_id,
        GuestNotification.recipient_guest_id == guest_id
    ).first()
    if not notification:
        return None
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notification)
    return notification

def mark_all_guest_notifications_read(db: Session, guest_id: str):
    """
    Marks all unread notifications for a guest as read.
    """
    notifications = db.query(GuestNotification).filter(
        GuestNotification.recipient_guest_id == guest_id,
        GuestNotification.is_read == False
    ).all()
    if not notifications:
        return
    now = datetime.now(timezone.utc)
    for n in notifications:
        n.is_read = True
        n.read_at = now
    db.commit()

