from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.models.enums import ReservationStatus

class ReservationResponse(BaseModel):
    id: int
    reservation_id: str
    guest_id: int
    room_id: int
    guest_name: Optional[str] = None
    room_number: Optional[str] = None
    check_in: datetime
    check_out: datetime
    status: ReservationStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ReservationCreate(BaseModel):
    reservation_id: str = Field(..., min_length=3, max_length=50, pattern=r"^RES-\d+$")
    guest_id: str = Field(..., min_length=3, max_length=50, description="Guest business ID (e.g., GST-1001)")
    room_number: str = Field(..., min_length=1, max_length=50, description="Room business number (e.g., 512)")
    check_in: datetime = Field(..., description="Stay check-in datetime")
    check_out: datetime = Field(..., description="Stay check-out datetime")
