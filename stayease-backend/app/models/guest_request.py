from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.enums import RequestType, RequestStatus, Department, TaskPriority

if TYPE_CHECKING:
    from app.models.guest import Guest
    from app.models.room import Room
    from app.models.task import Task

class GuestRequest(Base):
    __tablename__ = "guest_requests"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    request_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    guest_id: Mapped[int] = mapped_column(ForeignKey("guests.id"), nullable=False)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), nullable=False)
    
    request_type: Mapped[RequestType] = mapped_column(Enum(RequestType), nullable=False)
    department: Mapped[Department] = mapped_column(Enum(Department), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priority: Mapped[TaskPriority] = mapped_column(Enum(TaskPriority), nullable=False, default=TaskPriority.LOW)
    status: Mapped[RequestStatus] = mapped_column(Enum(RequestStatus), nullable=False, default=RequestStatus.PENDING)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    guest: Mapped["Guest"] = relationship(back_populates="guest_requests")
    room: Mapped["Room"] = relationship(back_populates="guest_requests")
    tasks: Mapped[List["Task"]] = relationship(back_populates="guest_request")
