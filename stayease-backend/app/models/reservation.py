from datetime import datetime
from sqlalchemy import String, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.enums import ReservationStatus
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.guest import Guest
    from app.models.room import Room

class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    reservation_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    guest_id: Mapped[int] = mapped_column(ForeignKey("guests.id"), nullable=False)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), nullable=False)
    
    # Stay Dates (using DateTime to support precise check-in and check-out tracking)
    check_in: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    check_out: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    status: Mapped[ReservationStatus] = mapped_column(Enum(ReservationStatus), nullable=False, default=ReservationStatus.BOOKED)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    guest: Mapped["Guest"] = relationship(back_populates="reservations")
    room: Mapped["Room"] = relationship(back_populates="reservations")
