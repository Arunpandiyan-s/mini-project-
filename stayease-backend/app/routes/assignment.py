from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from app.database import get_db
from app.models.task import Task
from app.models.staff import Staff
from app.models.assignment_rotation import AssignmentRotation
from app.models.enums import StaffRole, TaskStatus, AvailabilityStatus, DutyStatus, EmploymentStatus, Department
from app.core.dependencies import require_roles
from app.schemas.assignment_rotation import AssignmentRotationResponse
from app.schemas.task import TaskResponse
from app.services.assignment_service import sync_staff_availability, ROLE_DEPT_MAPPING
from app.services.audit_service import log_event

router = APIRouter(prefix="/api/assignment-rotation", tags=["Assignment & Rotations"])

# Admin-only manual assign / reassign router (prefix overridden or kept within task tags)
admin_tasks_router = APIRouter(prefix="/api/tasks", tags=["Operational Tasks (Admin Only)"])

class ManualAssignRequest(BaseModel):
    staff_id: str

@router.get("", response_model=List[AssignmentRotationResponse])
def get_rotation_status(
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN))
):
    """
    Get current Round Robin rotation state for all departments.
    Accessible to: ADMIN only.
    """
    return db.query(AssignmentRotation).all()

@admin_tasks_router.patch("/{task_id}/assign", response_model=TaskResponse)
def manual_assign_task(
    task_id: str,
    request: ManualAssignRequest,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN))
):
    """
    Manually assign an unassigned task to an eligible/free employee.
    Does NOT advance the Round Robin rotation.
    Accessible to: ADMIN only.
    """
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found."
        )

    target_staff = db.query(Staff).filter(Staff.staff_id == request.staff_id).first()
    if not target_staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff member '{request.staff_id}' not found."
        )

    # Eligibility checks
    if target_staff.employment_status != EmploymentStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target staff member is suspended or inactive."
        )
    if target_staff.duty_status != DutyStatus.ON_DUTY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target staff member is OFF_DUTY."
        )
    if ROLE_DEPT_MAPPING.get(target_staff.role) != task.department:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target staff member is in department '{ROLE_DEPT_MAPPING.get(target_staff.role)}', expected '{task.department.value}'."
        )
    if target_staff.availability_status != AvailabilityStatus.AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target staff member is currently BUSY."
        )

    try:
        task.assigned_staff_id = target_staff.id
        task.assigned_at = datetime.now(timezone.utc)
        task.status = TaskStatus.PENDING # Remains PENDING until accepted

        db.flush()

        # Sync availability for the staff member
        sync_staff_availability(target_staff.id, db)

        # Create persistent notification (does not commit)
        from app.services.notification_service import create_notification
        create_notification(
            db=db,
            recipient_staff_id=target_staff.staff_id,
            type="task.assigned",
            title="New Task Assigned",
            message=f"{task.title} — Room {task.room.room_number}",
            entity_type="task",
            entity_id=task.task_id,
            priority=task.priority.value
        )

        # Audit Log
        log_event(
            db=db,
            event_type="TASK_MANUALLY_ASSIGNED",
            actor_type="staff",
            actor_id=current_staff.staff_id,
            entity_type="task",
            entity_id=task.task_id,
            description=f"Admin {current_staff.name} manually assigned task {task.task_id} to staff {target_staff.staff_id}.",
            metadata_json={
                "strategy": "manual",
                "assigned_staff": target_staff.staff_id
            },
            commit=False
        )

        # Pre-serialize values for safety before commit
        assigned_staff_code = target_staff.staff_id
        room_number = task.room.room_number

        db.commit()
        db.refresh(task)

        # Emit real-time event post-commit
        from app.services.event_service import emit_event
        emit_event(
            event_type="task.assigned",
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

        return task
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Manual assignment failed: {e}"
        )

@admin_tasks_router.patch("/{task_id}/reassign", response_model=TaskResponse)
def reassign_task(
    task_id: str,
    request: ManualAssignRequest,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN))
):
    """
    Manually reassign a PENDING task to another eligible/free employee.
    Reassignment of ACCEPTED or IN_PROGRESS tasks is rejected with HTTP 409.
    Accessible to: ADMIN only.
    """
    task = db.query(Task).filter(Task.task_id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found."
        )

    # Reassignment is only allowed for PENDING tasks
    if task.status != TaskStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot reassign tasks that are already accepted or in progress."
        )

    target_staff = db.query(Staff).filter(Staff.staff_id == request.staff_id).first()
    if not target_staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff member '{request.staff_id}' not found."
        )

    # Eligibility checks
    if target_staff.employment_status != EmploymentStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target staff member is suspended or inactive."
        )
    if target_staff.duty_status != DutyStatus.ON_DUTY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target staff member is OFF_DUTY."
        )
    if ROLE_DEPT_MAPPING.get(target_staff.role) != task.department:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target staff member is in department '{ROLE_DEPT_MAPPING.get(target_staff.role)}', expected '{task.department.value}'."
        )
    if target_staff.availability_status != AvailabilityStatus.AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target staff member is currently BUSY."
        )

    try:
        old_staff_id = task.assigned_staff_id
        old_staff_code = None
        if old_staff_id:
            old_staff = db.query(Staff).filter(Staff.id == old_staff_id).first()
            if old_staff:
                old_staff_code = old_staff.staff_id

        task.assigned_staff_id = target_staff.id
        task.assigned_at = datetime.now(timezone.utc)

        db.flush()

        # Sync availability for BOTH target staff and old staff member
        sync_staff_availability(target_staff.id, db)
        if old_staff_id:
            sync_staff_availability(old_staff_id, db)

        # Create persistent notifications (does not commit)
        from app.services.notification_service import create_notification
        create_notification(
            db=db,
            recipient_staff_id=target_staff.staff_id,
            type="task.reassigned",
            title="Task Reassigned to You",
            message=f"{task.title} — Room {task.room.room_number}",
            entity_type="task",
            entity_id=task.task_id,
            priority=task.priority.value
        )
        if old_staff_code:
            create_notification(
                db=db,
                recipient_staff_id=old_staff_code,
                type="task.removed",
                title="Task Reassigned/Removed",
                message=f"Task {task.task_id} has been reassigned to another staff member.",
                entity_type="task",
                entity_id=task.task_id,
                priority=task.priority.value
            )

        # Audit Log
        log_event(
            db=db,
            event_type="TASK_REASSIGNED",
            actor_type="staff",
            actor_id=current_staff.staff_id,
            entity_type="task",
            entity_id=task.task_id,
            description=f"Admin {current_staff.name} reassigned task {task.task_id} from staff '{old_staff_code}' to '{target_staff.staff_id}'.",
            metadata_json={
                "strategy": "manual",
                "old_staff": old_staff_code,
                "new_staff": target_staff.staff_id
            },
            commit=False
        )

        # Pre-serialize values for safety before commit
        new_staff_code = target_staff.staff_id
        room_number = task.room.room_number

        db.commit()
        db.refresh(task)

        # Emit real-time events post-commit
        from app.services.event_service import emit_event
        
        # 1. Emit task.reassigned to new assignee and admins
        emit_event(
            event_type="task.reassigned",
            data={
                "task_id": task.task_id,
                "room_number": room_number,
                "title": task.title,
                "department": task.department.value,
                "priority": task.priority.value,
                "status": task.status.value
            },
            recipient_staff_id=new_staff_code,
            send_to_all_admins=True
        )

        # 2. Emit task.removed to old assignee and admins
        if old_staff_code:
            emit_event(
                event_type="task.removed",
                data={
                    "task_id": task.task_id,
                    "room_number": room_number,
                    "title": task.title,
                    "department": task.department.value,
                    "priority": task.priority.value,
                    "status": task.status.value
                },
                recipient_staff_id=old_staff_code,
                send_to_all_admins=True
            )

        return task
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reassignment failed: {e}"
        )
