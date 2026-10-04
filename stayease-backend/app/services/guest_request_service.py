import uuid
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.guest_request import GuestRequest
from app.models.task import Task
from app.models.guest import Guest
from app.models.room import Room
from app.models.reservation import Reservation
from app.models.enums import RequestType, RequestStatus, Department, TaskPriority, TaskStatus, ReservationStatus
from app.schemas.guest_request import GuestRequestCreate
from app.services.audit_service import log_event
from app.services.assignment_service import assign_task_round_robin

# Authoritative backend mapping rules
REQUEST_DEPT_MAPPING = {
    RequestType.EXTRA_TOWEL: Department.HOUSEKEEPING,
    RequestType.ROOM_CLEANING: Department.HOUSEKEEPING,
    RequestType.TOILETRIES: Department.HOUSEKEEPING,
    RequestType.MAINTENANCE: Department.MAINTENANCE,
    RequestType.LUGGAGE_ASSISTANCE: Department.RECEPTION,
    RequestType.ROOM_SERVICE: Department.FNB,
    RequestType.FOOD_ORDER: Department.FNB,
}

REQUEST_PRIORITY_MAPPING = {
    RequestType.EXTRA_TOWEL: TaskPriority.MEDIUM,
    RequestType.ROOM_CLEANING: TaskPriority.MEDIUM,
    RequestType.TOILETRIES: TaskPriority.MEDIUM,
    RequestType.LUGGAGE_ASSISTANCE: TaskPriority.MEDIUM,
    RequestType.ROOM_SERVICE: TaskPriority.MEDIUM,
    RequestType.FOOD_ORDER: TaskPriority.MEDIUM,
    RequestType.MAINTENANCE: TaskPriority.HIGH,
    RequestType.OTHER: TaskPriority.LOW,
}

REQUEST_TITLE_MAPPING = {
    RequestType.EXTRA_TOWEL: "Deliver Extra Towels",
    RequestType.ROOM_CLEANING: "Room Stay Cleaning",
    RequestType.TOILETRIES: "Deliver Toiletries",
    RequestType.MAINTENANCE: "Maintenance Work Order",
    RequestType.LUGGAGE_ASSISTANCE: "Luggage Assistance Request",
    RequestType.ROOM_SERVICE: "Room Service Order Deliver",
    RequestType.FOOD_ORDER: "Food Service Order Deliver",
    RequestType.OTHER: "Guest Operational Request",
}

def generate_request_id() -> str:
    return f"REQ-{uuid.uuid4().hex[:6].upper()}"

def generate_task_id() -> str:
    return f"TSK-{uuid.uuid4().hex[:6].upper()}"

def create_guest_request_and_task(
    request: GuestRequestCreate,
    db: Session,
    actor_id: str,
    actor_type: str = "staff"
) -> GuestRequest:
    """
    Validates check-in stays and creates GuestRequest and Task atomically.
    Bypasses client-supplied departments for known request types.
    """
    # 1. Lookup Guest
    guest = db.query(Guest).filter(func.lower(Guest.guest_id) == request.guest_id.lower()).first()
    if not guest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Guest profile '{request.guest_id}' not found"
        )
        
    # 2. Lookup Room
    room = db.query(Room).filter(func.lower(Room.room_number) == request.room_number.lower()).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room '{request.room_number}' not found"
        )
        
    # 3. Verify active stay (checked-in reservation linking this guest and room)
    active_stay = db.query(Reservation).filter(
        Reservation.guest_id == guest.id,
        Reservation.room_id == room.id,
        Reservation.status == ReservationStatus.CHECKED_IN
    ).first()
    
    if not active_stay:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Guest '{request.guest_id}' does not have an active checked-in stay in Room '{request.room_number}'."
        )

    # 4. Resolve Department & Priority Backend-side
    if request.request_type == RequestType.OTHER:
        if not request.department:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department parameter is required when request_type is 'other'."
            )
        resolved_dept = request.department
    else:
        # Ignore client-supplied department for known request types
        resolved_dept = REQUEST_DEPT_MAPPING[request.request_type]
        
    resolved_priority = REQUEST_PRIORITY_MAPPING.get(request.request_type, TaskPriority.LOW)
    task_title = REQUEST_TITLE_MAPPING.get(request.request_type, "Guest Operational Request")
    
    request_desc = request.description or f"Requested {request.request_type.value}"

    # Atomic Transaction block
    try:
        # Create Guest Request
        guest_req = GuestRequest(
            request_id=generate_request_id(),
            guest_id=guest.id,
            room_id=room.id,
            request_type=request.request_type,
            department=resolved_dept,
            description=request_desc,
            priority=resolved_priority,
            status=RequestStatus.PENDING
        )
        db.add(guest_req)
        db.flush()  # Populates guest_req.id for Foreign Key reference

        # Create Corresponding Task
        task = Task(
            task_id=generate_task_id(),
            request_id=guest_req.id,
            room_id=room.id,
            department=resolved_dept,
            title=task_title,
            description=request_desc,
            priority=resolved_priority,
            status=TaskStatus.PENDING,
            source_type="guest_request",
            source_id=guest_req.request_id
        )
        db.add(task)
        db.flush()

        # Trigger Round Robin automatic assignment
        assigned_staff = assign_task_round_robin(task, db)
        assigned_staff_code = assigned_staff.staff_id if assigned_staff else None

        # Create persistent guest notification for request creation
        from app.services.notification_service import create_guest_notification
        create_guest_notification(
            db=db,
            recipient_guest_id=guest.guest_id,
            type="guest_request.created",
            title="Request Created",
            message=f"Your request for {guest_req.request_type.value} has been created.",
            entity_type="guest_request",
            entity_id=guest_req.request_id
        )


        # Log system events in current session
        log_event(
            db=db,
            event_type="GUEST_REQUEST_CREATED_BY_GUEST" if actor_type == "guest" else "GUEST_REQUEST_CREATED",
            actor_type=actor_type,
            actor_id=actor_id,
            entity_type="guest_request",
            entity_id=guest_req.request_id,
            description=f"Guest request {guest_req.request_id} ({guest_req.request_type.value}) filed by {actor_type} {actor_id} for Room {room.room_number}",
            commit=False
        )
        log_event(
            db=db,
            event_type="TASK_CREATED",
            actor_type=actor_type,
            actor_id=actor_id,
            entity_type="task",
            entity_id=task.task_id,
            description=f"Task {task.task_id} ({task.title}) created for Room {room.room_number}",
            commit=False
        )
        
        db.commit()
        db.refresh(guest_req)

        # Emit real-time events only after successful commit
        from app.services.event_service import emit_event
        
        # 1. guest_request.created
        emit_event(
            event_type="guest_request.created",
            data={
                "request_id": guest_req.request_id,
                "guest_id": guest.guest_id,
                "room_number": room.room_number,
                "request_type": guest_req.request_type.value,
                "status": guest_req.status.value
            },
            send_to_all_admins=True,
            recipient_guest_id=guest.guest_id
        )

        # 2. task.created
        emit_event(
            event_type="task.created",
            data={
                "task_id": task.task_id,
                "room_number": room.room_number,
                "title": task.title,
                "department": task.department.value,
                "priority": task.priority.value,
                "status": task.status.value
            },
            send_to_all_admins=True
        )

        # 3. task.assigned or task.assignment_pending
        if assigned_staff_code:
            emit_event(
                event_type="task.assigned",
                data={
                    "task_id": task.task_id,
                    "room_number": room.room_number,
                    "title": task.title,
                    "department": task.department.value,
                    "priority": task.priority.value,
                    "status": task.status.value
                },
                recipient_staff_id=assigned_staff_code,
                send_to_all_admins=True
            )
        else:
            emit_event(
                event_type="task.assignment_pending",
                data={
                    "task_id": task.task_id,
                    "room_number": room.room_number,
                    "title": task.title,
                    "department": task.department.value,
                    "priority": task.priority.value,
                    "status": task.status.value
                },
                send_to_all_admins=True
            )

        return guest_req
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to file guest request atomically: {e}"
        )
