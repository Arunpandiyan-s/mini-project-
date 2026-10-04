from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Enum, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
from app.models.enums import Department

class AssignmentRotation(Base):
    __tablename__ = "assignment_rotations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    department: Mapped[Department] = mapped_column(Enum(Department), unique=True, index=True, nullable=False)
    last_assigned_staff_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
