from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.room import Room
from app.models.enums import StaffRole, OccupancyStatus, CleaningStatus
from app.core.dependencies import require_roles, get_current_staff
from app.schemas.room import RoomCreate, RoomUpdate, RoomResponse, RoomOperationalResponse
from app.services.audit_service import log_event
from app.models.staff import Staff

router = APIRouter(prefix="/api/rooms", tags=["Rooms Inventory"])

@router.get("", response_model=List[RoomOperationalResponse])
def list_rooms(
    floor: Optional[int] = None,
    occupancy_status: Optional[OccupancyStatus] = None,
    cleaning_status: Optional[CleaningStatus] = None,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    List all rooms. Protects guest PII by using RoomOperationalResponse.
    Supports query parameters: floor, occupancy_status, cleaning_status.
    Accessible to all active staff.
    """
    query = db.query(Room)
    if floor is not None:
        query = query.filter(Room.floor == floor)
    if occupancy_status is not None:
        query = query.filter(Room.occupancy_status == occupancy_status)
    if cleaning_status is not None:
        query = query.filter(Room.cleaning_status == cleaning_status)
    return query.all()

@router.get("/{room_number}", response_model=RoomOperationalResponse)
def get_room(
    room_number: str,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Get operational status of a specific room. Protects guest PII.
    Accessible to all active staff.
    """
    room = db.query(Room).filter(func.lower(Room.room_number) == room_number.lower()).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room '{room_number}' not found"
        )
    return room

@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(
    request: RoomCreate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN))
):
    """
    Create a new room.
    Accessible to: ADMIN only.
    """
    existing_room = db.query(Room).filter(func.lower(Room.room_number) == request.room_number.lower()).first()
    if existing_room:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Room '{request.room_number}' already exists."
        )

    new_room = Room(
        room_number=request.room_number,
        floor=request.floor,
        room_type=request.room_type
    )
    db.add(new_room)
    db.commit()
    db.refresh(new_room)

    log_event(
        db,
        event_type="ROOM_CREATED",
        actor_type="staff",
        actor_id=current_staff.staff_id,
        entity_type="room",
        entity_id=new_room.room_number,
        description=f"Admin {current_staff.name} created room {new_room.room_number} ({new_room.room_type})"
    )

    return new_room

@router.patch("/{room_number}", response_model=RoomResponse)
def update_room_metadata(
    room_number: str,
    request: RoomUpdate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN))
):
    """
    Update room metadata safely. Excludes operational statuses.
    Accessible to: ADMIN only.
    """
    room = db.query(Room).filter(func.lower(Room.room_number) == room_number.lower()).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room '{room_number}' not found"
        )

    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(room, key, value)

    db.commit()
    db.refresh(room)

    log_event(
        db,
        event_type="ROOM_UPDATED",
        actor_type="staff",
        actor_id=current_staff.staff_id,
        entity_type="room",
        entity_id=room.room_number,
        description=f"Admin {current_staff.name} updated metadata for room {room.room_number}"
    )

    return room
