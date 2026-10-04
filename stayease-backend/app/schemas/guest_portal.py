from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.models.enums import RequestType, RequestStatus

class RoomStayResponse(BaseModel):
    room_number: str
    floor: int
    room_type: str

    model_config = ConfigDict(from_attributes=True)

class GuestStayResponse(BaseModel):
    guest_id: str
    reservation_id: str
    room: RoomStayResponse
    check_in: datetime
    check_out: datetime
    status: Optional[str] = None

class GuestProfileUpdate(BaseModel):
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class GuestRequestCreate(BaseModel):
    request_type: RequestType
    description: str
    room_number: Optional[str] = None

class GuestRequestResponse(BaseModel):
    request_id: str
    request_type: RequestType
    description: str
    status: RequestStatus
    room_number: str
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class GuestNotificationResponse(BaseModel):
    notification_id: str
    type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class GuestUnreadCountResponse(BaseModel):
    unread_count: int

class GuestBookingCreate(BaseModel):
    room_number: str = Field(..., min_length=1, max_length=50)
    check_in: datetime
    check_out: datetime

class GuestBookingResponse(BaseModel):
    reservation_id: str
    guest_id: str
    room_number: str
    room_type: str
    check_in: datetime
    check_out: datetime
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class GuestRoomDiscoveryResponse(BaseModel):
    room_number: str
    floor: int
    room_type: str
    occupancy_status: str
    cleaning_status: str

    model_config = ConfigDict(from_attributes=True)
