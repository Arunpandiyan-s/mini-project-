from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.models.enums import RequestType, RequestStatus, Department, TaskPriority

class GuestRequestResponse(BaseModel):
    id: int
    request_id: str
    guest_id: int
    room_id: int
    request_type: RequestType
    department: Department
    description: Optional[str] = None
    priority: TaskPriority
    status: RequestStatus
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class GuestRequestCreate(BaseModel):
    guest_id: str = Field(..., min_length=3, max_length=50, pattern=r"^GST-\d+$")
    room_number: str = Field(..., min_length=1, max_length=50)
    request_type: RequestType
    description: Optional[str] = Field(None, max_length=500)
    
    # department is optional generally, but required if request_type is OTHER
    department: Optional[Department] = None
