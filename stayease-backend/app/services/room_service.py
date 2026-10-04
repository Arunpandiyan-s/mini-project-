from sqlalchemy.orm import Session
from app.models.room import Room
from app.models.reservation import Reservation
from app.models.enums import OccupancyStatus, CleaningStatus, MaintenanceStatus, ReservationStatus

def is_room_ready_for_checkin(room: Room, db: Session) -> bool:
    """
    Authoritative logic to determine if a room is operationally ready for check-in.
    Checks:
    - Room is physically vacant (VACANT).
    - Room cleaning status is CLEAN.
    - Room maintenance status is GOOD (operational).
    - No other checked-in reservations currently occupy the room in the database.
    """
    # 1. Check occupancy
    if room.occupancy_status != OccupancyStatus.VACANT:
        return False
        
    # 2. Check cleanliness
    if room.cleaning_status != CleaningStatus.CLEAN:
        return False
        
    # 3. Check maintenance status (GOOD is operational)
    if room.maintenance_status != MaintenanceStatus.GOOD:
        return False
        
    # 4. Verify no conflicting CHECKED_IN reservation exists for this room
    active_stay = db.query(Reservation).filter(
        Reservation.room_id == room.id,
        Reservation.status == ReservationStatus.CHECKED_IN
    ).first()
    
    if active_stay:
        return False
        
    return True
