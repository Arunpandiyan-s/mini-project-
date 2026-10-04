from pydantic import BaseModel, ConfigDict, model_validator
from datetime import datetime
from typing import Optional
from app.models.enums import TaskStatus, TaskPriority, Department

class TaskResponse(BaseModel):
    id: int
    task_id: str
    request_id: Optional[int] = None
    room_id: int
    room_number: Optional[str] = None
    department: Department
    assigned_staff_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    priority: TaskPriority
    status: TaskStatus
    created_at: datetime
    assigned_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Origin fields for duplicate checking and tracking
    source_type: Optional[str] = None
    source_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def populate_room_number(cls, data):
        if hasattr(data, "room") and data.room:
            try:
                setattr(data, "room_number", data.room.room_number)
            except Exception:
                pass
        return data
