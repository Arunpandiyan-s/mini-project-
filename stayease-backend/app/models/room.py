from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.enums import OccupancyStatus, CleaningStatus, MaintenanceStatus

if TYPE_CHECKING:
    from app.models.guest import Guest
    from app.models.reservation import Reservation
    from app.models.guest_request import GuestRequest
    from app.models.task import Task

class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    room_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    floor: Mapped[int] = mapped_column(Integer, nullable=False)
    room_type: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Statuses
    occupancy_status: Mapped[OccupancyStatus] = mapped_column(
        Enum(OccupancyStatus), 
        nullable=False, 
        default=OccupancyStatus.VACANT
    )
    cleaning_status: Mapped[CleaningStatus] = mapped_column(
        Enum(CleaningStatus), 
        nullable=False, 
        default=CleaningStatus.CLEAN
    )
    maintenance_status: Mapped[MaintenanceStatus] = mapped_column(
        Enum(MaintenanceStatus), 
        nullable=False, 
        default=MaintenanceStatus.GOOD
    )
    
    # Derived convenience field. 
    # NOTE: The primary source of truth for occupancy is active reservations 
    # with checked_in status. This field should be synchronized accordingly.
    current_guest_id: Mapped[Optional[int]] = mapped_column(ForeignKey("guests.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    current_guest: Mapped[Optional["Guest"]] = relationship()
    reservations: Mapped[List["Reservation"]] = relationship(back_populates="room")
    guest_requests: Mapped[List["GuestRequest"]] = relationship(back_populates="room")
    tasks: Mapped[List["Task"]] = relationship(back_populates="room")
