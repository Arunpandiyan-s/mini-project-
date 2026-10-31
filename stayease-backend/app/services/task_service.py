from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.task import Task
from app.models.room import Room
from app.models.guest_request import GuestRequest
from app.models.staff import Staff
from app.models.enums import StaffRole, TaskStatus, CleaningStatus, RequestStatus, Department, MaintenanceStatus
from app.services.audit_service import log_event
from app.services.assignment_service import sync_staff_availability, trigger_pending_assignments

# Helper to map staff role to department eligibility
ROLE_DEPT_ELIGIBILITY = {
    StaffRole.HOUSEKEEPING: Department.HOUSEKEEPING,
    StaffRole.MAINTENANCE: Department.MAINTENANCE,
    StaffRole.FNB: Department.FNB,
    StaffRole.RECEPTION: Department.RECEPTION,
}

def accept_task(task_id: str, current_staff: Staff, db: Session) -> Task:
    """
    Accepts an unassigned task. Employs departmental guards and prevents double acceptance.
    """
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found"
        )

    # Double-acceptance guard
    if task.status != TaskStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Task is already accepted or completed."
        )

    # If already assigned to another employee, block stealing (unless Admin override)
    if task.assigned_staff_id is not None and task.assigned_staff_id != current_staff.id:
        if current_staff.role != StaffRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Another employee cannot steal assigned task."
            )

    # Department safety guard (Admins can accept any department tasks)
    if current_staff.role != StaffRole.ADMIN:
        eligible_dept = ROLE_DEPT_ELIGIBILITY.get(current_staff.role)
        if not eligible_dept or eligible_dept != task.department:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Staff of role '{current_staff.role.value}' cannot accept tasks for department '{task.department.value}'"
            )

    try:
        now = datetime.now(timezone.utc)
        task.status = TaskStatus.ACCEPTED
        task.assigned_staff_id = current_staff.id
        task.assigned_at = now
        task.accepted_at = now

        log_event(
            db=db,
            event_type="TASK_ACCEPTED",
            actor_type="staff",
            actor_id=current_staff.staff_id,
            entity_type="task",
            entity_id=task.task_id,
            description=f"Staff member {current_staff.name} ({current_staff.staff_id}) accepted task {task.task_id} for Room {task.room.room_number}",
            commit=False
        )
        # Sync availability of newly accepted staff member
        sync_staff_availability(current_staff.id, db)

        db.commit()
        db.refresh(task)

        # Emit real-time event post-commit
        from app.services.event_service import emit_event
        assigned_staff_code = task.assigned_staff.staff_id if task.assigned_staff else current_staff.staff_id
        emit_event(
            event_type="task.accepted",
            data={
                "task_id": task.task_id,
                "room_number": task.room.room_number,
                "title": task.title,
                "department": task.department.value,
                "priority": task.priority.value,
                "status": task.status.value
            },
            recipient_staff_id=assigned_staff_code,
            send_to_all_admins=True
        )

        return task
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to accept task: {e}"
        )

def start_task(task_id: str, current_staff: Staff, db: Session) -> Task:
    """
    Transitions task from ACCEPTED to IN_PROGRESS. Updates room/request lifecycle states.
    """
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found"
        )

    # Verify task state
    if task.status != TaskStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Task must be in ACCEPTED state to start. Current: '{task.status.value}'"
        )

    # Verify assigned staff (Admins can start any task)
    if current_staff.role != StaffRole.ADMIN and task.assigned_staff_id != current_staff.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the employee assigned to this task can start it."
        )

    try:
        now = datetime.now(timezone.utc)
        task.status = TaskStatus.IN_PROGRESS
        task.started_at = now

        # Housekeeping cleaning room transition: DIRTY -> CLEANING
        if task.source_type in ["checkout", "room_cleaning", "inspection_failed"] or (task.department == Department.HOUSEKEEPING and task.room):
            room = task.room
            if room:
                room.cleaning_status = CleaningStatus.CLEANING
                log_event(
                    db=db,
                    event_type="ROOM_CLEANING_STARTED",
                    actor_type="staff",
                    actor_id=current_staff.staff_id,
                    entity_type="room",
                    entity_id=room.room_number,
                    description=f"Room {room.room_number} cleaning started.",
                    commit=False
                )

        # Guest request transition: PENDING -> IN_PROGRESS
        if task.guest_request:
            req = task.guest_request
            req.status = RequestStatus.IN_PROGRESS
            
            # Create persistent guest notification (does not commit)
            from app.services.notification_service import create_guest_notification
            create_guest_notification(
                db=db,
                recipient_guest_id=req.guest.guest_id,
                type="guest_request.in_progress",
                title="Request In Progress",
                message=f"Your request for {req.request_type.value} is now in progress.",
                entity_type="guest_request",
                entity_id=req.request_id
            )

        log_event(
            db=db,
            event_type="TASK_STARTED",
            actor_type="staff",
            actor_id=current_staff.staff_id,
            entity_type="task",
            entity_id=task.task_id,
            description=f"Staff member {current_staff.name} ({current_staff.staff_id}) started task {task.task_id}",
            commit=False
        )
        
        # Pre-serialize fields before commit to avoid lazy loading issues
        assigned_staff_code = task.assigned_staff.staff_id if task.assigned_staff else current_staff.staff_id
        room_number = task.room.room_number if task.room else "unknown"
        room_cleaning_status = task.room.cleaning_status.value if task.room else None
        
        gr_req_id = task.guest_request.request_id if task.guest_request else None
        gr_guest_business_id = task.guest_request.guest.guest_id if (task.guest_request and task.guest_request.guest) else None
        gr_status = task.guest_request.status.value if task.guest_request else None

        db.commit()
        db.refresh(task)

        # Emit real-time events post-commit
        from app.services.event_service import emit_event
        
        # 1. task.started
        emit_event(
            event_type="task.started",
            data={
                "task_id": task.task_id,
                "room_number": room_number,
                "title": task.title,
                "department": task.department.value,
                "priority": task.priority.value,
                "status": task.status.value
            },
            recipient_staff_id=assigned_staff_code,
            send_to_all_admins=True
        )

        # 2. room.cleaning (if checkout task)
        if task.source_type == "checkout" and room_cleaning_status:
            emit_event(
                event_type="room.cleaning",
                data={
                    "room_number": room_number,
                    "cleaning_status": room_cleaning_status
                },
                recipient_role=StaffRole.HOUSEKEEPING,
                send_to_all_admins=True
            )

        # 3. guest_request.in_progress (if guest request source)
        if gr_req_id:
            DEPT_ROLE_MAP = {v: k for k, v in ROLE_DEPT_ELIGIBILITY.items()}
            emit_event(
                event_type="guest_request.in_progress",
                data={
                    "request_id": gr_req_id,
                    "guest_id": gr_guest_business_id,
                    "room_number": room_number,
                    "status": gr_status
                },
                recipient_role=DEPT_ROLE_MAP.get(task.department),
                send_to_all_admins=True,
                recipient_guest_id=gr_guest_business_id
            )

        return task
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start task: {e}"
        )

def complete_task(task_id: str, current_staff: Staff, db: Session) -> Task:
    """
    Transitions task from IN_PROGRESS to COMPLETED. Finalizes room cleaning and request lifecycles.
    """
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found"
        )

    # Verify task state
    if task.status != TaskStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Task must be IN_PROGRESS to complete. Current: '{task.status.value}'"
        )

    # Verify assigned staff (Admins can complete any task)
    if current_staff.role != StaffRole.ADMIN and task.assigned_staff_id != current_staff.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the employee assigned to this task can complete it."
        )

    try:
        now = datetime.now(timezone.utc)
        task.status = TaskStatus.COMPLETED
        task.completed_at = now

        # Housekeeping cleaning room transition: CLEANING -> CLEAN
        if (task.source_type in ["checkout", "room_cleaning", "inspection_failed"] or task.department == Department.HOUSEKEEPING) and task.room:
            room = task.room
            if room:
                room.cleaning_status = CleaningStatus.CLEAN
                log_event(
                    db=db,
                    event_type="ROOM_MARKED_CLEAN",
                    actor_type="staff",
                    actor_id=current_staff.staff_id,
                    entity_type="room",
                    entity_id=room.room_number,
                    description=f"Room {room.room_number} cleaning completed successfully.",
                    commit=False
                )

        # Maintenance task completion: update room maintenance status to GOOD if no other open maintenance tasks
        if task.department == Department.MAINTENANCE and task.room:
            other_open_maint = db.query(Task).filter(
                Task.room_id == task.room_id,
                Task.department == Department.MAINTENANCE,
                Task.id != task.id,
                Task.status.in_([TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS])
            ).first()
            if not other_open_maint:
                task.room.maintenance_status = MaintenanceStatus.GOOD
                log_event(
                    db=db,
                    event_type="ROOM_MAINTENANCE_RESOLVED",
                    actor_type="staff",
                    actor_id=current_staff.staff_id,
                    entity_type="room",
                    entity_id=task.room.room_number,
                    description=f"Maintenance for Room {task.room.room_number} resolved by {current_staff.name}.",
                    commit=False
                )

        # Guest request transition: -> COMPLETED
        req = task.guest_request
        if not req and task.request_id:
            req = db.query(GuestRequest).filter(GuestRequest.id == task.request_id).first()
        if not req and task.source_type == "guest_request" and task.source_id:
            req = db.query(GuestRequest).filter(GuestRequest.request_id == task.source_id).first()
        if req:
            req.status = RequestStatus.COMPLETED
            req.completed_at = now
            log_event(
                db=db,
                event_type="GUEST_REQUEST_COMPLETED",
                actor_type="staff",
                actor_id=current_staff.staff_id,
                entity_type="guest_request",
                entity_id=req.request_id,
                description=f"Guest request {req.request_id} marked COMPLETED.",
                commit=False
            )
            
            # Create persistent guest notification (does not commit)
            from app.services.notification_service import create_guest_notification
            create_guest_notification(
                db=db,
                recipient_guest_id=req.guest.guest_id,
                type="guest_request.completed",
                title="Request Completed",
                message=f"Your request for {req.request_type.value} has been completed.",
                entity_type="guest_request",
                entity_id=req.request_id
            )

        log_event(
            db=db,
            event_type="TASK_COMPLETED",
            actor_type="staff",
            actor_id=current_staff.staff_id,
            entity_type="task",
            entity_id=task.task_id,
            description=f"Staff member {current_staff.name} completed task {task.task_id}",
            commit=False
        )
        
        # Save staff and event data before commit to avoid lazy loading issues
        assigned_id = task.assigned_staff_id
        task_dept = task.department
        
        assigned_staff_code = task.assigned_staff.staff_id if task.assigned_staff else current_staff.staff_id
        room_number = task.room.room_number if task.room else "unknown"
        room_cleaning_status = task.room.cleaning_status.value if task.room else None

        gr_req_id = task.guest_request.request_id if task.guest_request else None
        gr_guest_business_id = task.guest_request.guest.guest_id if (task.guest_request and task.guest_request.guest) else None
        gr_status = task.guest_request.status.value if task.guest_request else None

        if assigned_id:
            sync_staff_availability(assigned_id, db)
        trigger_pending_assignments(task_dept, db)

        db.commit()
        db.refresh(task)

        # Emit real-time events post-commit
        from app.services.event_service import emit_event

        # 1. task.completed
        emit_event(
            event_type="task.completed",
            data={
                "task_id": task.task_id,
                "room_number": room_number,
                "title": task.title,
                "department": task.department.value,
                "priority": task.priority.value,
                "status": task.status.value
            },
            recipient_staff_id=assigned_staff_code,
            send_to_all_admins=True
        )

        # 2. room.clean (if checkout source)
        if task.source_type == "checkout" and room_cleaning_status:
            emit_event(
                event_type="room.clean",
                data={
                    "room_number": room_number,
                    "cleaning_status": room_cleaning_status
                },
                recipient_role=StaffRole.HOUSEKEEPING,
                send_to_all_admins=True
            )
            emit_event(
                event_type="room.clean",
                data={
                    "room_number": room_number,
                    "cleaning_status": room_cleaning_status
                },
                recipient_role=StaffRole.RECEPTION,
                send_to_all_admins=False
            )

        # 3. guest_request.completed (if guest request source)
        if gr_req_id:
            DEPT_ROLE_MAP = {v: k for k, v in ROLE_DEPT_ELIGIBILITY.items()}
            emit_event(
                event_type="guest_request.completed",
                data={
                    "request_id": gr_req_id,
                    "guest_id": gr_guest_business_id,
                    "room_number": room_number,
                    "status": gr_status
                },
                recipient_role=DEPT_ROLE_MAP.get(task.department),
                send_to_all_admins=True,
                recipient_guest_id=gr_guest_business_id
            )

        if assigned_id:
            # Sync availability based on remaining workload
            sync_staff_availability(assigned_id, db)
            # Re-run pending retry queue for the department
            trigger_pending_assignments(task_dept, db)

        return task
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete task: {e}"
        )
