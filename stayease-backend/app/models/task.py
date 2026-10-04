from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, Enum, ForeignKey, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.enums import TaskStatus, TaskPriority, Department

if TYPE_CHECKING:
    from app.models.guest_request import GuestRequest
    from app.models.room import Room
    from app.models.staff import Staff

class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        UniqueConstraint("source_type", "source_id", name="uq_task_source"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    task_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    
    # Origin metadata for automatic duplicate checks and tracking
    source_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    source_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Nullable if task was generated internally or directly, not from a guest request
    request_id: Mapped[Optional[int]] = mapped_column(ForeignKey("guest_requests.id"), nullable=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), nullable=False)
    department: Mapped[Department] = mapped_column(Enum(Department), nullable=False)
    assigned_staff_id: Mapped[Optional[int]] = mapped_column(ForeignKey("staff.id"), nullable=True)
    
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priority: Mapped[TaskPriority] = mapped_column(Enum(TaskPriority), nullable=False, default=TaskPriority.LOW)
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), nullable=False, default=TaskStatus.PENDING)
    
    # Lifecycle Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    assigned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    guest_request: Mapped[Optional["GuestRequest"]] = relationship(back_populates="tasks")
    room: Mapped["Room"] = relationship(back_populates="tasks")
    assigned_staff: Mapped[Optional["Staff"]] = relationship(back_populates="assigned_tasks")
