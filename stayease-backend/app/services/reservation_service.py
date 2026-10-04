import uuid
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.reservation import Reservation
from app.models.room import Room
from app.models.guest import Guest
from app.models.task import Task
from app.models.enums import ReservationStatus, OccupancyStatus, CleaningStatus, MaintenanceStatus, TaskStatus, TaskPriority, Department
from app.services.room_service import is_room_ready_for_checkin
from app.services.audit_service import log_event
from app.services.assignment_service import assign_task_round_robin

def check_reservation_overlap(
    room_id: int,
    check_in: datetime,
    check_out: datetime,
    db: Session,
    exclude_reservation_id: int = None
) -> bool:
    """
    Overlaps occur when:
    existing.check_in < new.check_out AND existing.check_out > new.check_in
    Only active (BOOKED and CHECKED_IN) reservations block availability.
    CANCELLED and historical CHECKED_OUT reservations are ignored.
    """
    query = db.query(Reservation).filter(
        Reservation.room_id == room_id,
        Reservation.status.in_([ReservationStatus.BOOKED, ReservationStatus.CHECKED_IN]),
        Reservation.check_in < check_out,
        Reservation.check_out > check_in
    )
    if exclude_reservation_id:
        query = query.filter(Reservation.id != exclude_reservation_id)
        
    return query.first() is not None

def check_in_reservation(reservation_id: str, db: Session, actor_id: str) -> Reservation:
    """
    Performs atomic check-in transaction state changes.
    Enforces room cleanliness, operational maintenance, occupancy checks, and relationship consistency.
    """
    # 1. Fetch reservation
    reservation = db.query(Reservation).filter(Reservation.reservation_id == reservation_id).first()
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reservation '{reservation_id}' not found"
        )
        
    # 2. Verify reservation is BOOKED
    if reservation.status != ReservationStatus.BOOKED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Reservation is not in BOOKED state. Current: '{reservation.status.value}'"
        )
        
    # 3. Load Room
    room = db.query(Room).filter(Room.id == reservation.room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
        
    # 4. Load Guest
    guest = db.query(Guest).filter(Guest.id == reservation.guest_id).first()
    if not guest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Guest not found"
        )
        
    # 5. Check Room readiness autoritatively
    if not is_room_ready_for_checkin(room, db):
        if room.occupancy_status == OccupancyStatus.OCCUPIED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Room is currently occupied"
            )
        if room.cleaning_status != CleaningStatus.CLEAN:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Room is dirty or cleaning is required"
            )
        if room.maintenance_status != MaintenanceStatus.GOOD:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Room has maintenance issues and is not ready"
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Room is not operationally ready for check-in"
        )

    # Transaction Boundary
    try:
        # State transitions
        reservation.status = ReservationStatus.CHECKED_IN
        room.occupancy_status = OccupancyStatus.OCCUPIED
        room.current_guest_id = guest.id

        # Log audit events within the current session (commit=False prevents premature flush)
        log_event(
            db=db,
            event_type="GUEST_CHECKED_IN",
            actor_type="staff",
            actor_id=actor_id,
            entity_type="reservation",
            entity_id=reservation.reservation_id,
            description=f"Guest {guest.name} ({guest.guest_id}) checked into Room {room.room_number} under reservation {reservation.reservation_id}",
            commit=False
        )
        log_event(
            db=db,
            event_type="ROOM_OCCUPIED",
            actor_type="staff",
            actor_id=actor_id,
            entity_type="room",
            entity_id=room.room_number,
            description=f"Room {room.room_number} occupancy status changed to OCCUPIED",
            commit=False
        )
        
        # Commit atomic block
        db.commit()
        db.refresh(reservation)
        db.refresh(room)

        # Emit real-time events post-commit
        from app.services.event_service import emit_event
        emit_event(
            event_type="reservation.checked_in",
            data={
                "reservation_id": reservation.reservation_id,
                "room_number": room.room_number,
                "guest_id": guest.guest_id,
                "status": reservation.status.value
            },
            send_to_all_admins=True
        )
        emit_event(
            event_type="room.occupied",
            data={
                "room_number": room.room_number,
                "occupancy_status": room.occupancy_status.value
            },
            send_to_all_admins=True
        )

        return reservation
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Check-in failed and database changes were rolled back"
        )

def checkout_reservation(reservation_id: str, db: Session, actor_id: str) -> Reservation:
    """
    Performs atomic checkout transaction state changes.
    Sets room to VACANT + DIRTY and nulls out current guest.
    Idempotently rejects repeated checkout calls.
    """
    # 1. Fetch reservation
    reservation = db.query(Reservation).filter(Reservation.reservation_id == reservation_id).first()
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reservation '{reservation_id}' not found"
        )
        
    # 2. Check duplicate checkout
    if reservation.status == ReservationStatus.CHECKED_OUT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Reservation is already checked out."
        )
        
    # 3. Must be CHECKED_IN
    if reservation.status != ReservationStatus.CHECKED_IN:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Only checked-in reservations can be checked out. Current: '{reservation.status.value}'"
        )
        
    # 4. Load Room
    room = db.query(Room).filter(Room.id == reservation.room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
        
    guest = db.query(Guest).filter(Guest.id == reservation.guest_id).first()
    guest_name = guest.name if guest else "Guest"
    guest_id = guest.guest_id if guest else "unknown"

    # Transaction Boundary
    try:
        # State transitions
        reservation.status = ReservationStatus.CHECKED_OUT
        room.occupancy_status = OccupancyStatus.VACANT
        room.cleaning_status = CleaningStatus.DIRTY
        room.current_guest_id = None

        # Double checkout cleaning task protection: check if exists
        existing_task = db.query(Task).filter(
            Task.source_type == "checkout",
            Task.source_id == reservation.reservation_id
        ).first()

        assigned_staff_code = None
        cleaning_task_id = None
        cleaning_task_title = None
        cleaning_task_priority = None
        cleaning_task_status = None

        if not existing_task:
            # Create system-generated HOUSEKEEPING cleaning task
            cleaning_task = Task(
                task_id=f"TSK-{uuid.uuid4().hex[:6].upper()}",
                room_id=room.id,
                department=Department.HOUSEKEEPING,
                title=f"Checkout Cleaning - Room {room.room_number}",
                description=f"System-generated cleaning task after checkout of reservation {reservation.reservation_id}",
                priority=TaskPriority.HIGH,
                status=TaskStatus.PENDING,
                source_type="checkout",
                source_id=reservation.reservation_id
            )
            db.add(cleaning_task)
            db.flush()

            # Trigger Round Robin automatic assignment
            assigned_staff = assign_task_round_robin(cleaning_task, db)
            if assigned_staff:
                assigned_staff_code = assigned_staff.staff_id
            cleaning_task_id = cleaning_task.task_id
            cleaning_task_title = cleaning_task.title
            cleaning_task_priority = cleaning_task.priority.value
            cleaning_task_status = cleaning_task.status.value
            
            # Log cleaning task created event as SYSTEM actor
            log_event(
                db=db,
                event_type="CHECKOUT_CLEANING_TASK_CREATED",
                actor_type="system",
                actor_id="system",
                entity_type="task",
                entity_id=cleaning_task.task_id,
                description=f"System created checkout cleaning task {cleaning_task.task_id} for Room {room.room_number} after reservation {reservation.reservation_id} checkout.",
                commit=False
            )

        # Log checkout audit events within current transaction
        log_event(
            db=db,
            event_type="GUEST_CHECKED_OUT",
            actor_type="staff",
            actor_id=actor_id,
            entity_type="reservation",
            entity_id=reservation.reservation_id,
            description=f"Guest {guest_name} ({guest_id}) checked out of Room {room.room_number}",
            commit=False
        )
        log_event(
            db=db,
            event_type="ROOM_MARKED_DIRTY",
            actor_type="staff",
            actor_id=actor_id,
            entity_type="room",
            entity_id=room.room_number,
            description=f"Room {room.room_number} marked DIRTY after checkout",
            commit=False
        )
        
        # Commit atomic block
        db.commit()
        db.refresh(reservation)
        db.refresh(room)

        # Emit real-time events post-commit (strictly in required order)
        from app.services.event_service import emit_event
        from app.models.enums import StaffRole

        # 1. reservation.checked_out
        emit_event(
            event_type="reservation.checked_out",
            data={
                "reservation_id": reservation.reservation_id,
                "room_number": room.room_number,
                "guest_id": guest_id,
                "status": reservation.status.value
            },
            send_to_all_admins=True
        )

        # 2. room.vacant
        emit_event(
            event_type="room.vacant",
            data={
                "room_number": room.room_number,
                "occupancy_status": room.occupancy_status.value
            },
            send_to_all_admins=True
        )

        # 3. room.dirty
        emit_event(
            event_type="room.dirty",
            data={
                "room_number": room.room_number,
                "cleaning_status": room.cleaning_status.value
            },
            recipient_role=StaffRole.HOUSEKEEPING,
            send_to_all_admins=True
        )

        # 4. task events (if cleaning task was created)
        if cleaning_task_id:
            # task.created
            emit_event(
                event_type="task.created",
                data={
                    "task_id": cleaning_task_id,
                    "room_number": room.room_number,
                    "title": cleaning_task_title,
                    "department": "housekeeping",
                    "priority": cleaning_task_priority,
                    "status": cleaning_task_status
                },
                send_to_all_admins=True
            )

            # task.assigned or task.assignment_pending
            if assigned_staff_code:
                emit_event(
                    event_type="task.assigned",
                    data={
                        "task_id": cleaning_task_id,
                        "room_number": room.room_number,
                        "title": cleaning_task_title,
                        "department": "housekeeping",
                        "priority": cleaning_task_priority,
                        "status": cleaning_task_status
                    },
                    recipient_staff_id=assigned_staff_code,
                    send_to_all_admins=True
                )
            else:
                emit_event(
                    event_type="task.assignment_pending",
                    data={
                        "task_id": cleaning_task_id,
                        "room_number": room.room_number,
                        "title": cleaning_task_title,
                        "department": "housekeeping",
                        "priority": cleaning_task_priority,
                        "status": cleaning_task_status
                    },
                    send_to_all_admins=True
                )

        return reservation
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Checkout failed and database changes were rolled back"
        )
