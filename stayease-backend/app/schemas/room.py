from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.models.enums import OccupancyStatus, CleaningStatus, MaintenanceStatus

class RoomResponse(BaseModel):
    id: int
    room_number: str
    floor: int
    room_type: str
    occupancy_status: OccupancyStatus
    cleaning_status: CleaningStatus
    maintenance_status: MaintenanceStatus
    current_guest_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RoomOperationalResponse(BaseModel):
    """
    Exposes only operational room details to protect guest personal information (PII)
    from unnecessary exposure to housekeeping, maintenance, etc.
    """
    room_number: str
    floor: int
    room_type: str
    occupancy_status: OccupancyStatus
    cleaning_status: CleaningStatus
    maintenance_status: MaintenanceStatus

    class Config:
        from_attributes = True

class RoomCreate(BaseModel):
    room_number: str = Field(..., min_length=1, max_length=50)
    floor: int = Field(..., ge=1)
    room_type: str = Field(..., min_length=1, max_length=100)

class RoomUpdate(BaseModel):
    # Allows safe metadata changes.
    # Excludes operational fields (occupancy_status, cleaning_status, maintenance_status, current_guest_id)
    # to protect hotel workflow boundaries from generic PATCH bypasses.
    room_type: Optional[str] = Field(None, min_length=1, max_length=100)
    floor: Optional[int] = Field(None, ge=1)

class RoomInspectionRequest(BaseModel):
    status: str = Field(..., description="'pass' or 'fail'")
    reason: Optional[str] = Field(None, description="Reason if inspection failed")
    notes: Optional[str] = Field(None, description="General inspection notes")

class RoomMaintenanceReportRequest(BaseModel):
    issue: str = Field(..., min_length=3, max_length=500, description="Detailed defect description")
    priority: Optional[str] = Field("high", description="low, medium, high, urgent")
    blocks_occupancy: bool = Field(True, description="Whether this issue blocks guest occupancy")

