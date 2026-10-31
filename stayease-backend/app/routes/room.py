from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.room import Room
from app.models.task import Task
from app.models.enums import (
    StaffRole, OccupancyStatus, CleaningStatus, MaintenanceStatus,
    Department, TaskPriority, TaskStatus
)
from app.core.dependencies import require_roles, get_current_staff
from app.schemas.room import (
    RoomCreate, RoomUpdate, RoomResponse, RoomOperationalResponse,
    RoomInspectionRequest, RoomMaintenanceReportRequest, RoomCleaningRequest
)
from app.services.audit_service import log_event
from app.services.reservation_service import check_reservation_overlap
from app.services.assignment_service import assign_task_round_robin
from app.services.event_service import emit_event
from app.services.notification_service import create_notification
from app.models.staff import Staff

router = APIRouter(prefix="/api/rooms", tags=["Rooms Inventory"])

@router.get("/availability", response_model=List[RoomOperationalResponse])
def check_room_availability(
    check_in: datetime,
    check_out: datetime,
    room_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Check available rooms for a given stay window without conflicting bookings.
    Publicly queryable for guest reservation discovery and staff booking checks.
    """
    if check_out <= check_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-out date must be strictly after check-in date."
        )
    query = db.query(Room).filter(Room.maintenance_status != MaintenanceStatus.OUT_OF_SERVICE)
    if room_type:
        query = query.filter(func.lower(Room.room_type) == room_type.lower())
    rooms = query.all()
    available = []
    for r in rooms:
        if not check_reservation_overlap(r.id, check_in, check_out, db):
            available.append(r)
    return available

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

@router.post("/{room_number}/inspection", response_model=RoomOperationalResponse)
def inspect_room(
    room_number: str,
    request: RoomInspectionRequest,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN, StaffRole.RECEPTION))
):
    """
    Reception / supervisor inspection workflow.
    - If 'pass': room becomes CLEAN (operationally ready if vacant and maintenance good).
    - If 'fail': room marked DIRTY, triggers automatic re-cleaning task for Housekeeping.
    """
    room = db.query(Room).filter(func.lower(Room.room_number) == room_number.lower()).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room '{room_number}' not found"
        )

    decision = request.status.strip().lower()
    if decision not in ["pass", "fail"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inspection status must be 'pass' or 'fail'."
        )

    if decision == "pass":
        room.cleaning_status = CleaningStatus.CLEAN
        db.commit()
        db.refresh(room)

        log_event(
            db,
            event_type="ROOM_INSPECTION_PASSED",
            actor_type="staff",
            actor_id=current_staff.staff_id,
            entity_type="room",
            entity_id=room.room_number,
            description=f"Inspection passed by {current_staff.name} for Room {room.room_number}. Notes: {request.notes or 'None'}"
        )
        emit_event(
            "room.inspected",
            {
                "room_number": room.room_number,
                "status": "pass",
                "inspector": current_staff.name,
                "cleaning_status": room.cleaning_status.value
            },
            send_to_all_admins=True
        )
    else:
        room.cleaning_status = CleaningStatus.DIRTY
        task_id = f"TSK-RC-{int(datetime.now(timezone.utc).timestamp() * 1000) % 900000}"
        reclean_task = Task(
            task_id=task_id,
            source_type="inspection_failed",
            source_id=room.room_number,
            room_id=room.id,
            department=Department.HOUSEKEEPING,
            title=f"Re-cleaning Room {room.room_number}",
            description=f"Inspection failed by {current_staff.name}. Reason: {request.reason or 'Quality standards not met'}. Notes: {request.notes or 'None'}",
            priority=TaskPriority.HIGH,
            status=TaskStatus.PENDING
        )
        db.add(reclean_task)
        db.commit()
        db.refresh(room)

        log_event(
            db,
            event_type="ROOM_INSPECTION_FAILED",
            actor_type="staff",
            actor_id=current_staff.staff_id,
            entity_type="room",
            entity_id=room.room_number,
            description=f"Inspection failed for Room {room.room_number} by {current_staff.name}. Reason: {request.reason or 'Quality standards not met'}"
        )
        create_notification(
            db,
            recipient_staff_id="ALL_HOUSEKEEPING",
            type="inspection.failed",
            title="Room Inspection Failed",
            message=f"Room {room.room_number} failed inspection ({request.reason or 'Needs re-cleaning'}). New task assigned.",
            entity_type="room",
            entity_id=room.room_number,
            priority="high"
        )
        emit_event(
            "room.inspected",
            {
                "room_number": room.room_number,
                "status": "fail",
                "reason": request.reason,
                "task_id": task_id
            },
            recipient_role=StaffRole.HOUSEKEEPING,
            send_to_all_admins=True
        )

    return room

@router.post("/{room_number}/maintenance")
def report_room_maintenance(
    room_number: str,
    request: RoomMaintenanceReportRequest,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Report maintenance defect discovered in a room (e.g., AC broken, plumbing leak).
    Blocks room readiness if defect affects safe/usable occupancy.
    Automatically assigns maintenance task and alerts maintenance team.
    """
    room = db.query(Room).filter(func.lower(Room.room_number) == room_number.lower()).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room '{room_number}' not found"
        )

    priority_map = {
        "low": TaskPriority.LOW,
        "medium": TaskPriority.MEDIUM,
        "high": TaskPriority.HIGH,
        "urgent": TaskPriority.URGENT
    }
    p_val = priority_map.get((request.priority or "high").lower(), TaskPriority.HIGH)

    task_id = f"TSK-MN-{int(datetime.now(timezone.utc).timestamp() * 1000) % 900000}"
    maint_task = Task(
        task_id=task_id,
        source_type="room_defect",
        source_id=room.room_number,
        room_id=room.id,
        department=Department.MAINTENANCE,
        title=f"Maintenance Defect: Room {room.room_number}",
        description=request.issue,
        priority=p_val,
        status=TaskStatus.PENDING
    )
    db.add(maint_task)

    if request.blocks_occupancy:
        room.maintenance_status = MaintenanceStatus.MAINTENANCE_REQUIRED

    db.commit()
    db.refresh(maint_task)
    db.refresh(room)

    log_event(
        db,
        event_type="ROOM_MAINTENANCE_REPORTED",
        actor_type="staff",
        actor_id=current_staff.staff_id,
        entity_type="room",
        entity_id=room.room_number,
        description=f"Maintenance issue for Room {room.room_number} reported by {current_staff.name}: {request.issue} (blocking={request.blocks_occupancy})"
    )
    create_notification(
        db,
        recipient_staff_id="ALL_MAINTENANCE",
        type="maintenance.reported",
        title="Room Defect Reported",
        message=f"Room {room.room_number}: {request.issue}",
        entity_type="room",
        entity_id=room.room_number,
        priority=p_val.value
    )
    emit_event(
        "maintenance.reported",
        {
            "task_id": maint_task.task_id,
            "room_number": room.room_number,
            "issue": request.issue,
            "priority": p_val.value
        },
        recipient_role=StaffRole.MAINTENANCE,
        send_to_all_admins=True
    )

    return {
        "status": "success",
        "message": f"Maintenance reported for room {room.room_number}",
        "task_id": maint_task.task_id,
        "room_maintenance_status": room.maintenance_status.value
    }

@router.post("/{room_number}/clean")
def request_room_cleaning(
    room_number: str,
    request: Optional[RoomCleaningRequest] = None,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Mark room for cleaning and automatically dispatch housekeeping cleaning task.
    Updates room cleaning status to DIRTY, assigns task to housekeeping staff (round-robin),
    and notifies housekeeping team via real-time WebSocket.
    """
    room = db.query(Room).filter(func.lower(Room.room_number) == room_number.lower()).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room '{room_number}' not found"
        )

    req = request or RoomCleaningRequest()
    priority_map = {
        "low": TaskPriority.LOW,
        "medium": TaskPriority.MEDIUM,
        "high": TaskPriority.HIGH,
        "urgent": TaskPriority.URGENT
    }
    p_val = priority_map.get((req.priority or "high").lower(), TaskPriority.HIGH)
    clean_type = req.cleaning_type or "Room Cleaning"

    room.cleaning_status = CleaningStatus.DIRTY

    task_id = f"TSK-HK-{int(datetime.now(timezone.utc).timestamp() * 1000) % 900000}"
    cleaning_task = Task(
        task_id=task_id,
        source_type="room_cleaning",
        source_id=room.room_number,
        room_id=room.id,
        department=Department.HOUSEKEEPING,
        title=f"{clean_type}: Room {room.room_number}",
        description=req.notes or f"Room cleaning requested for Room {room.room_number}. {clean_type} required.",
        priority=p_val,
        status=TaskStatus.PENDING
    )
    db.add(cleaning_task)
    db.flush()

    assigned_staff = assign_task_round_robin(cleaning_task, db)
    db.commit()
    db.refresh(cleaning_task)
    db.refresh(room)

    log_event(
        db,
        event_type="ROOM_CLEANING_REQUESTED",
        actor_type="staff",
        actor_id=current_staff.staff_id,
        entity_type="room",
        entity_id=room.room_number,
        description=f"Cleaning requested for Room {room.room_number} by {current_staff.name} ({clean_type})"
    )
    create_notification(
        db,
        recipient_staff_id="ALL_HOUSEKEEPING",
        type="room.cleaning",
        title="Room Cleaning Requested",
        message=f"Room {room.room_number} needs cleaning ({clean_type}).",
        entity_type="room",
        entity_id=room.room_number,
        priority=p_val.value
    )
    emit_event(
        "task.created",
        {
            "task_id": cleaning_task.task_id,
            "room_number": room.room_number,
            "title": cleaning_task.title,
            "department": "housekeeping",
            "priority": p_val.value,
            "status": cleaning_task.status.value,
            "assigned_staff_id": assigned_staff.staff_id if assigned_staff else None
        },
        recipient_role=StaffRole.HOUSEKEEPING,
        send_to_all_admins=True
    )
    emit_event(
        "room.dirty",
        {
            "room_number": room.room_number,
            "cleaning_status": room.cleaning_status.value
        },
        recipient_role=StaffRole.HOUSEKEEPING,
        send_to_all_admins=True
    )

    return {
        "status": "success",
        "message": f"Cleaning task created for room {room.room_number}",
        "task_id": cleaning_task.task_id,
        "room_cleaning_status": room.cleaning_status.value
    }

