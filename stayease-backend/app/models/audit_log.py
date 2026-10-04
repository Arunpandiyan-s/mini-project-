from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    actor_type: Mapped[str] = mapped_column(String(50), nullable=False)   # guest, staff, system
    actor_id: Mapped[str] = mapped_column(String(50), nullable=False)     # e.g., EMP-1001, GST-1001
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., Room, Task, GuestRequest
    entity_id: Mapped[str] = mapped_column(String(100), nullable=False)    # e.g., 305, TSK-1051
    description: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True) # flexible key-value storage

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
