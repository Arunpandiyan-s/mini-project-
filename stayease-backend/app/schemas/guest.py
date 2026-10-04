from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

class GuestResponse(BaseModel):
    id: int
    guest_id: str
    name: str
    email: str
    phone: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class GuestCreate(BaseModel):
    guest_id: str = Field(..., min_length=3, max_length=50, pattern=r"^GST-\d+$")
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=50)

class GuestUpdate(BaseModel):
    # Notice this schema only allows profile updates. 
    # guest_id, database internal id, and created_at cannot be updated.
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
