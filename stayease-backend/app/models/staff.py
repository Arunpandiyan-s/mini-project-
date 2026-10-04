from datetime import datetime
from typing import List, TYPE_CHECKING
from sqlalchemy import String, DateTime, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.enums import StaffRole, DutyStatus, EmploymentStatus, AvailabilityStatus

if TYPE_CHECKING:
    from app.models.task import Task

class Staff(Base):
    __tablename__ = "staff"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    staff_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[StaffRole] = mapped_column(Enum(StaffRole), nullable=False, default=StaffRole.HOUSEKEEPING)
    floor: Mapped[str] = mapped_column(String(50), nullable=True)
    shift: Mapped[str] = mapped_column(String(50), nullable=True)
    duty_status: Mapped[DutyStatus] = mapped_column(Enum(DutyStatus), nullable=False, default=DutyStatus.OFF_DUTY)
    employment_status: Mapped[EmploymentStatus] = mapped_column(Enum(EmploymentStatus), nullable=False, default=EmploymentStatus.ACTIVE)
    availability_status: Mapped[AvailabilityStatus] = mapped_column(Enum(AvailabilityStatus), nullable=False, default=AvailabilityStatus.AVAILABLE)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    assigned_tasks: Mapped[List["Task"]] = relationship(back_populates="assigned_staff")
