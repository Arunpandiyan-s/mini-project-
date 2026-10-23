from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Text, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

if TYPE_CHECKING:
    from app.models.guest import Guest
    from app.models.reservation import Reservation

class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    message_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    guest_id: Mapped[int] = mapped_column(ForeignKey("guests.id"), index=True, nullable=False)
    reservation_id: Mapped[Optional[int]] = mapped_column(ForeignKey("reservations.id"), index=True, nullable=True)
    sender_type: Mapped[str] = mapped_column(String(20), nullable=False)  # "guest" or "staff"
    sender_id: Mapped[str] = mapped_column(String(50), nullable=False)
    sender_name: Mapped[str] = mapped_column(String(100), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    guest: Mapped["Guest"] = relationship()
    reservation: Mapped[Optional["Reservation"]] = relationship()
