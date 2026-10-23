from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from pydantic import BaseModel, Field

from app.database import get_db
from app.models.message import Message
from app.models.guest import Guest
from app.models.staff import Staff
from app.models.enums import StaffRole
from app.core.dependencies import get_current_guest, get_current_staff, get_db
from app.core.security import decode_access_token
from app.services.event_service import emit_event
from app.services.notification_service import create_notification, create_guest_notification
from app.services.audit_service import log_event
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

router = APIRouter(prefix="/api/messages", tags=["Guest & Staff Messaging"])

class MessageCreatePayload(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    guest_id: Optional[str] = None  # If staff is sending to a guest
    reservation_id: Optional[str] = None

class MessageResponse(BaseModel):
    id: int
    message_id: str
    guest_id: str
    reservation_id: Optional[str] = None
    sender_type: str
    sender_id: str
    sender_name: str
    content: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

def get_current_principal(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Resolves the principal as either a Guest or a Staff member.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required"
        )
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    p_type = payload.get("principal_type")
    if p_type == "guest":
        sub = payload.get("sub")
        guest = db.query(Guest).filter(Guest.guest_id == sub).first()
        if not guest:
            raise HTTPException(status_code=401, detail="Guest not found")
        return {"type": "guest", "entity": guest}
    else:
        staff_id = payload.get("staff_id")
        staff = db.query(Staff).filter(Staff.staff_id == staff_id).first()
        if not staff:
            raise HTTPException(status_code=401, detail="Staff not found")
        return {"type": "staff", "entity": staff}

@router.get("", response_model=List[MessageResponse])
def list_messages(
    guest_id: Optional[str] = None,
    db: Session = Depends(get_db),
    principal: dict = Depends(get_current_principal)
):
    """
    Retrieves message history.
    - Guests can only view their own messages.
    - Staff can view messages for a specific guest or all recent guest conversations.
    """
    query = db.query(Message)

    if principal["type"] == "guest":
        guest: Guest = principal["entity"]
        query = query.filter(Message.guest_id == guest.id)
    else:
        # Staff
        if guest_id:
            g = db.query(Guest).filter(func.lower(Guest.guest_id) == guest_id.lower()).first()
            if g:
                query = query.filter(Message.guest_id == g.id)
            else:
                return []

    messages = query.order_by(Message.created_at.asc()).all()

    # Map guest business ID for response
    results = []
    for m in messages:
        target_guest = m.guest
        results.append(
            MessageResponse(
                id=m.id,
                message_id=m.message_id,
                guest_id=target_guest.guest_id if target_guest else f"GST-{m.guest_id}",
                reservation_id=str(m.reservation_id) if m.reservation_id else None,
                sender_type=m.sender_type,
                sender_id=m.sender_id,
                sender_name=m.sender_name,
                content=m.content,
                is_read=m.is_read,
                created_at=m.created_at
            )
        )
    return results

@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    payload: MessageCreatePayload,
    db: Session = Depends(get_db),
    principal: dict = Depends(get_current_principal)
):
    """
    Sends a message between guest and reception.
    Dispatches real-time WebSocket notification and audit logs.
    """
    msg_id = f"MSG-{int(datetime.now(timezone.utc).timestamp() * 1000) % 900000}"

    if principal["type"] == "guest":
        guest: Guest = principal["entity"]
        db_guest = guest
        sender_type = "guest"
        sender_id = guest.guest_id
        sender_name = guest.name

        # Recipient is reception
        recipient_role = StaffRole.RECEPTION
        recipient_guest_id = None
    else:
        staff: Staff = principal["entity"]
        sender_type = "staff"
        sender_id = staff.staff_id
        sender_name = f"{staff.name} ({staff.role.value.capitalize()})"

        if not payload.guest_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="guest_id is required when staff sends a message"
            )
        db_guest = db.query(Guest).filter(func.lower(Guest.guest_id) == payload.guest_id.lower()).first()
        if not db_guest:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Target guest '{payload.guest_id}' not found"
            )
        recipient_role = None
        recipient_guest_id = db_guest.guest_id

    new_msg = Message(
        message_id=msg_id,
        guest_id=db_guest.id,
        sender_type=sender_type,
        sender_id=sender_id,
        sender_name=sender_name,
        content=payload.content.strip(),
        is_read=False
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)

    # Notifications & Events
    if sender_type == "guest":
        create_notification(
            db,
            recipient_staff_id="ALL_RECEPTION",
            type="message.received",
            title=f"Message from {sender_name}",
            message=payload.content[:100],
            entity_type="message",
            entity_id=msg_id,
            priority="normal"
        )
        emit_event(
            "message.created",
            {
                "message_id": msg_id,
                "guest_id": db_guest.guest_id,
                "sender_type": "guest",
                "sender_name": sender_name,
                "content": payload.content
            },
            recipient_role=StaffRole.RECEPTION,
            send_to_all_admins=True
        )
    else:
        create_guest_notification(
            db,
            recipient_guest_id=db_guest.guest_id,
            type="message.received",
            title=f"Message from Front Desk ({sender_name})",
            message=payload.content[:100],
            entity_type="message",
            entity_id=msg_id
        )
        emit_event(
            "message.created",
            {
                "message_id": msg_id,
                "guest_id": db_guest.guest_id,
                "sender_type": "staff",
                "sender_name": sender_name,
                "content": payload.content
            },
            recipient_guest_id=db_guest.guest_id,
            send_to_all_admins=True
        )

    return MessageResponse(
        id=new_msg.id,
        message_id=new_msg.message_id,
        guest_id=db_guest.guest_id,
        reservation_id=None,
        sender_type=new_msg.sender_type,
        sender_id=new_msg.sender_id,
        sender_name=new_msg.sender_name,
        content=new_msg.content,
        is_read=new_msg.is_read,
        created_at=new_msg.created_at
    )

@router.patch("/{message_id}/read")
def mark_message_read(
    message_id: str,
    db: Session = Depends(get_db),
    principal: dict = Depends(get_current_principal)
):
    """
    Marks a message as read.
    """
    msg = db.query(Message).filter(Message.message_id == message_id).first()
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Message '{message_id}' not found"
        )

    msg.is_read = True
    db.commit()
    return {"status": "success", "message_id": message_id, "is_read": True}
