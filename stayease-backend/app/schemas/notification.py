from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class NotificationResponse(BaseModel):
    notification_id: str
    recipient_staff_id: str
    type: str
    title: str
    message: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None
    priority: Optional[str] = None

    class Config:
        from_attributes = True

class UnreadCountResponse(BaseModel):
    unread_count: int
