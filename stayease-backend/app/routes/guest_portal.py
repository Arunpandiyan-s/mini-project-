from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import uuid

from app.database import get_db
from app.core.dependencies import get_current_guest
from app.models.guest import Guest
from app.models.reservation import Reservation
from app.models.room import Room
from app.models.guest_request import GuestRequest
from app.models.task import Task
from app.models.enums import (
    ReservationStatus, RequestType, RequestStatus, TaskStatus,
    CleaningStatus, MaintenanceStatus, OccupancyStatus
)
from app.schemas.guest_auth import GuestResponse
from app.schemas.guest_portal import (
    GuestStayResponse, GuestProfileUpdate, GuestRequestCreate,
    GuestRequestResponse, GuestNotificationResponse, GuestUnreadCountResponse,
    GuestBookingCreate, GuestBookingResponse, GuestRoomDiscoveryResponse
)
from app.schemas.guest_request import GuestRequestCreate as StaffGuestRequestCreate
from app.services.guest_request_service import create_guest_request_and_task
from app.services.assignment_service import sync_staff_availability, trigger_pending_assignments
from app.services.notification_service import (
    get_guest_notifications, mark_guest_notification_read,
    mark_all_guest_notifications_read, create_guest_notification
)
from app.services.audit_service import log_event
from app.services.event_service import emit_event

router = APIRouter(prefix="/api/guest", tags=["Guest Portal"])

# --- PROFILE API ---
@router.get("/me", response_model=GuestResponse)
def get_guest_profile(current_guest: Guest = Depends(get_current_guest)):
    """
    Returns the current authenticated guest's profile.
    """
    return current_guest

@router.patch("/me", response_model=GuestResponse)
def update_guest_profile(
    request: GuestProfileUpdate,
    db: Session = Depends(get_db),
    current_guest: Guest = Depends(get_current_guest)
):
    """
    Updates safe contact details (phone, email) for the authenticated guest.
    Enforces email uniqueness constraint.
    """
    if request.email is not None:
        email_clean = request.email.strip().lower()
        existing = db.query(Guest).filter(
            func.lower(Guest.email) == email_clean,
            Guest.id != current_guest.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Email address '{request.email}' is already in use by another account."
            )
        current_guest.email = request.email

    if request.phone is not None:
        current_guest.phone = request.phone.strip()

    db.commit()
    db.refresh(current_guest)
    return current_guest

# --- ACTIVE STAY API ---
@router.get("/me/stay", response_model=GuestStayResponse)
def get_guest_stay(
    db: Session = Depends(get_db),
    current_guest: Guest = Depends(get_current_guest)
):
    """
    Returns stay details for the authenticated guest's primary active check-in reservation.
    """
    stay = db.query(Reservation).filter(
        Reservation.guest_id == current_guest.id,
        Reservation.status == ReservationStatus.CHECKED_IN
    ).first()

    if not stay:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active checked-in stay found for the current guest."
        )

    return {
        "guest_id": current_guest.guest_id,
        "reservation_id": stay.reservation_id,
        "room": stay.room,
        "check_in": stay.check_in,
        "check_out": stay.check_out,
        "status": stay.status.value if hasattr(stay.status, "value") else str(stay.status)
    }

@router.get("/me/stays", response_model=List[GuestStayResponse])
def get_guest_stays(
    db: Session = Depends(get_db),
    current_guest: Guest = Depends(get_current_guest)
):
    """
    Returns all active or booked room stays for the authenticated guest.
    """
    stays = db.query(Reservation).filter(
        Reservation.guest_id == current_guest.id,
        Reservation.status.in_([ReservationStatus.CHECKED_IN, ReservationStatus.BOOKED])
    ).all()

    return [
        {
            "guest_id": current_guest.guest_id,
            "reservation_id": s.reservation_id,
            "room": s.room,
            "check_in": s.check_in,
            "check_out": s.check_out,
            "status": s.status.value if hasattr(s.status, "value") else str(s.status)
        }
        for s in stays
    ]

# --- REQUESTS API ---
@router.post("/me/requests", response_model=GuestRequestResponse, status_code=status.HTTP_201_CREATED)
def create_guest_portal_request(
    request: GuestRequestCreate,
    db: Session = Depends(get_db),
    current_guest: Guest = Depends(get_current_guest)
):
    """
    Submits a hotel service request for the authenticated guest.
    Supports targeting a specific room_number if the guest has multiple rooms.
    """
    # 1. Verify active checked-in reservation exists for the target room (or primary stay)
    query = db.query(Reservation).join(Room).filter(
        Reservation.guest_id == current_guest.id,
        Reservation.status == ReservationStatus.CHECKED_IN
    )

    if request.room_number:
        query = query.filter(func.lower(Room.room_number) == request.room_number.strip().lower())

    stay = query.first()

    if not stay:
        detail_msg = f"No active checked-in stay found for Room '{request.room_number}'." if request.room_number else "Cannot submit service requests: no active checked-in stay was found."
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail_msg
        )

    # 2. Map payload to internal Staff GuestRequestCreate schema
    staff_req = StaffGuestRequestCreate(
        guest_id=current_guest.guest_id,
        room_number=stay.room.room_number,
        request_type=request.request_type,
        description=request.description,
        department=None # Resolved backend-side
    )

    # 3. Call existing business logic pipeline (Round Robin, Audits, WebSocket dispatches inside)
    # Marks actor_type as guest
    guest_req = create_guest_request_and_task(
        request=staff_req,
        db=db,
        actor_id=current_guest.guest_id,
        actor_type="guest"
    )

    # Return request mapped details
    return GuestRequestResponse(
        request_id=guest_req.request_id,
        request_type=guest_req.request_type,
        description=guest_req.description,
        status=guest_req.status,
        room_number=stay.room.room_number,
        created_at=guest_req.created_at,
        completed_at=guest_req.completed_at
    )

@router.get("/me/requests", response_model=List[GuestRequestResponse])
def list_guest_portal_requests(
    db: Session = Depends(get_db),
    current_guest: Guest = Depends(get_current_guest)
):
    """
    Lists requests submitted by the authenticated guest, newest first.
    """
    requests = db.query(GuestRequest).filter(
        GuestRequest.guest_id == current_guest.id
    ).order_by(GuestRequest.created_at.desc()).all()

    return [
        GuestRequestResponse(
            request_id=r.request_id,
            request_type=r.request_type,
            description=r.description,
            status=r.status,
            room_number=r.room.room_number if r.room else "N/A",
            created_at=r.created_at,
            completed_at=r.completed_at
        ) for r in requests
    ]

@router.get("/me/requests/{request_id}", response_model=GuestRequestResponse)
def get_guest_portal_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_guest: Guest = Depends(get_current_guest)
):
    """
    Retrieves detailed info for a single request, enforcing guest ownership.
    """
    req = db.query(GuestRequest).filter(
        GuestRequest.request_id == request_id
    ).first()

    if not req or req.guest_id != current_guest.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Request '{request_id}' not found."
        )

    return GuestRequestResponse(
        request_id=req.request_id,
        request_type=req.request_type,
        description=req.description,
        status=req.status,
        room_number=req.room.room_number if req.room else "N/A",
        created_at=req.created_at,
        completed_at=req.completed_at
    )

@router.patch("/me/requests/{request_id}/cancel", response_model=GuestRequestResponse)
def cancel_guest_portal_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_guest: Guest = Depends(get_current_guest)
):
    """
    Cancels a guest request if the corresponding task has not been accepted/started yet.
    Atomically updates states, frees the assigned staff member, and triggers the assignment retry queue.
    """
    req = db.query(GuestRequest).filter(
        GuestRequest.request_id == request_id
    ).first()

    if not req or req.guest_id != current_guest.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Request '{request_id}' not found."
        )

    # Retrieve associated task
    task = db.query(Task).filter(Task.request_id == req.id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Corresponding task for request not found."
        )

    # Verify if request can be operationally cancelled (only if task status is PENDING or ASSIGNED)
    # Wait, task.status is either PENDING, ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED.
    # ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED cannot be cancelled.
    if task.status in [TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot cancel request in state '{task.status.value}'."
        )

    try:
        # Save assigned employee reference and department to sync/retry
        released_staff_internal_id = task.assigned_staff_id
        released_staff_code = task.assigned_staff.staff_id if task.assigned_staff else None
        task_dept = task.department

        # Perform atomic cancellation changes
        req.status = RequestStatus.CANCELLED
        task.status = TaskStatus.CANCELLED
        task.assigned_staff_id = None
        task.assigned_at = None

        db.flush()

        # Resynchronize released employee availability if they held the task
        if released_staff_internal_id:
            sync_staff_availability(released_staff_internal_id, db)

        # Audit Log
        log_event(
            db=db,
            event_type="GUEST_REQUEST_CANCELLED_BY_GUEST",
            actor_type="guest",
            actor_id=current_guest.guest_id,
            entity_type="guest_request",
            entity_id=req.request_id,
            description=f"Guest request {req.request_id} was cancelled by guest {current_guest.name}.",
            commit=False
        )

        db.commit()
        db.refresh(req)
        db.refresh(task)

        # Emit real-time events post-commit
        # 1. guest_request.cancelled (to guest and admins)
        emit_event(
            event_type="guest_request.cancelled",
            data={
                "request_id": req.request_id,
                "guest_id": current_guest.guest_id,
                "room_number": req.room.room_number,
                "status": req.status.value
            },
            send_to_all_admins=True,
            recipient_guest_id=current_guest.guest_id
        )

        # 2. task.removed (to released employee and admins)
        if released_staff_code:
            emit_event(
                event_type="task.removed",
                data={
                    "task_id": task.task_id,
                    "room_number": req.room.room_number,
                    "title": task.title,
                    "department": task.department.value,
                    "priority": task.priority.value,
                    "status": task.status.value
                },
                recipient_staff_id=released_staff_code,
                send_to_all_admins=True
            )

            # Create persistent staff notification
            from app.services.notification_service import create_notification
            create_notification(
                db=db,
                recipient_staff_id=released_staff_code,
                type="task.removed",
                title="Task Cancelled/Removed",
                message=f"Task {task.task_id} has been cancelled by the guest.",
                entity_type="task",
                entity_id=task.task_id,
                priority=task.priority.value
            )
            db.commit() # Save the staff notification in database

        # 3. Trigger pending retry rotations for the department
        db.refresh(task) # Ensure Session has updated task states
        trigger_pending_assignments(task_dept, db)

        return GuestRequestResponse(
            request_id=req.request_id,
            request_type=req.request_type,
            description=req.description,
            status=req.status,
            room_number=req.room.room_number,
            created_at=req.created_at,
            completed_at=req.completed_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Request cancellation failed: {e}"
        )

# --- NOTIFICATIONS API ---
@router.get("/me/notifications", response_model=List[GuestNotificationResponse])
def list_guest_notifications(
    db: Session = Depends(get_db),
    current_guest: Guest = Depends(get_current_guest)
):
    """
    Returns persistent notifications for the authenticated guest.
    """
    notifs = get_guest_notifications(db, current_guest.guest_id)
    return [
        GuestNotificationResponse(
            notification_id=n.notification_id,
            type=n.type,
            title=n.title,
            message=n.message,
            is_read=n.is_read,
            created_at=n.created_at
        ) for n in notifs
    ]

@router.get("/me/notifications/unread-count", response_model=GuestUnreadCountResponse)
def get_guest_unread_count(
    db: Session = Depends(get_db),
    current_guest: Guest = Depends(get_current_guest)
):
    """
    Returns unread notifications count for the authenticated guest.
    """
    notifs = get_guest_notifications(db, current_guest.guest_id, is_read=False)
    return GuestUnreadCountResponse(unread_count=len(notifs))

@router.patch("/me/notifications/{notification_id}/read", response_model=GuestNotificationResponse)
def mark_guest_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_guest: Guest = Depends(get_current_guest)
):
    """
    Marks a guest notification read. Validates ownership.
    """
    n = mark_guest_notification_read(db, notification_id, current_guest.guest_id)
    if not n:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found."
        )
    return GuestNotificationResponse(
        notification_id=n.notification_id,
        type=n.type,
        title=n.title,
        message=n.message,
        is_read=n.is_read,
        created_at=n.created_at
    )

@router.patch("/me/notifications/read-all", status_code=status.HTTP_200_OK)
def mark_all_guest_notifications(
    db: Session = Depends(get_db),
    current_guest: Guest = Depends(get_current_guest)
):
    """
    Marks all notifications for the authenticated guest read.
    """
    mark_all_guest_notifications_read(db, current_guest.guest_id)
    return {"status": "success", "message": "All notifications marked read"}

# --- ROOM DISCOVERY & BOOKINGS API ---
@router.get("/rooms", response_model=List[GuestRoomDiscoveryResponse])
def list_guest_discovery_rooms(
    db: Session = Depends(get_db),
    current_guest: Guest = Depends(get_current_guest)
):
    """
    Returns available hotel rooms for browsing and booking.
    """
    rooms = db.query(Room).all()
    return [
        GuestRoomDiscoveryResponse(
            room_number=r.room_number,
            floor=r.floor,
            room_type=r.room_type,
            occupancy_status=r.occupancy_status.value,
            cleaning_status=r.cleaning_status.value
        ) for r in rooms
    ]

@router.post("/me/bookings", response_model=GuestBookingResponse, status_code=status.HTTP_201_CREATED)
def create_guest_booking(
    request: GuestBookingCreate,
    db: Session = Depends(get_db),
    current_guest: Guest = Depends(get_current_guest)
):
    """
    Creates a new room booking reservation for the authenticated guest.
    """
    room = db.query(Room).filter(func.lower(Room.room_number) == request.room_number.lower()).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room '{request.room_number}' not found."
        )

    if request.check_out <= request.check_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-out time must be after check-in time."
        )

    from app.services.reservation_service import check_reservation_overlap
    if check_reservation_overlap(room.id, request.check_in, request.check_out, db):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Room '{request.room_number}' is already booked for the selected dates."
        )

    res_id = f"RES-{(int(datetime.now(timezone.utc).timestamp() * 1000) % 80000) + 10000}"
    reservation = Reservation(
        reservation_id=res_id,
        guest_id=current_guest.id,
        room_id=room.id,
        check_in=request.check_in,
        check_out=request.check_out,
        status=ReservationStatus.BOOKED
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)

    log_event(
        db=db,
        event_type="GUEST_BOOKING_CREATED",
        actor_type="guest",
        actor_id=current_guest.guest_id,
        entity_type="reservation",
        entity_id=reservation.reservation_id,
        description=f"Guest {current_guest.name} booked Room {room.room_number} ({reservation.reservation_id})"
    )

    return GuestBookingResponse(
        reservation_id=reservation.reservation_id,
        guest_id=current_guest.guest_id,
        room_number=room.room_number,
        room_type=room.room_type,
        check_in=reservation.check_in,
        check_out=reservation.check_out,
        status=reservation.status.value,
        created_at=reservation.created_at
    )

@router.get("/me/bookings", response_model=List[GuestBookingResponse])
def list_guest_bookings(
    db: Session = Depends(get_db),
    current_guest: Guest = Depends(get_current_guest)
):
    """
    Lists all booking reservations for the authenticated guest, newest first.
    """
    res_list = db.query(Reservation).filter(
        Reservation.guest_id == current_guest.id
    ).order_by(Reservation.created_at.desc()).all()

    return [
        GuestBookingResponse(
            reservation_id=r.reservation_id,
            guest_id=current_guest.guest_id,
            room_number=r.room.room_number,
            room_type=r.room.room_type,
            check_in=r.check_in,
            check_out=r.check_out,
            status=r.status.value,
            created_at=r.created_at
        ) for r in res_list
    ]
