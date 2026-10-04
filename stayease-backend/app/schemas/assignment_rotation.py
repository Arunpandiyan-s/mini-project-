from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.enums import Department

class AssignmentRotationResponse(BaseModel):
    id: int
    department: Department
    last_assigned_staff_id: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True
