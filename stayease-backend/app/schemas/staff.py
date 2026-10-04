from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional
from app.models.enums import StaffRole, DutyStatus, EmploymentStatus, AvailabilityStatus

class StaffResponse(BaseModel):
    id: int
    staff_id: str
    name: str
    email: str
    phone: Optional[str] = None
    role: StaffRole
    floor: Optional[str] = None
    shift: Optional[str] = None
    duty_status: DutyStatus
    employment_status: EmploymentStatus
    availability_status: AvailabilityStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class StaffCreate(BaseModel):
    staff_id: str = Field(..., min_length=3, max_length=50, pattern=r"^EMP-\d+$")
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=50)
    password: str = Field(..., min_length=6, max_length=72)  # Bcrypt maximum input length is 72 bytes
    role: StaffRole
    floor: Optional[str] = Field(None, max_length=50)
    shift: Optional[str] = Field(None, max_length=50)

class StaffUpdate(BaseModel):
    # This schema controls updates to staff records. 
    # Notice it does NOT contain 'id', 'password_hash', 'created_at', or 'updated_at' to prevent direct modifications.
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    role: Optional[StaffRole] = None
    floor: Optional[str] = Field(None, max_length=50)
    shift: Optional[str] = Field(None, max_length=50)
    duty_status: Optional[DutyStatus] = None
    employment_status: Optional[EmploymentStatus] = None
    availability_status: Optional[AvailabilityStatus] = None
