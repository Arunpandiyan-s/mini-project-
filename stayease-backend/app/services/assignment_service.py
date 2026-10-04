from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import case, func
from sqlalchemy.orm import Session
from app.models.task import Task
from app.models.staff import Staff
from app.models.assignment_rotation import AssignmentRotation
from app.models.enums import StaffRole, Department, TaskStatus, TaskPriority, AvailabilityStatus, DutyStatus, EmploymentStatus
from app.services.audit_service import log_event

# Helper to map staff role to department
ROLE_DEPT_MAPPING = {
    StaffRole.HOUSEKEEPING: Department.HOUSEKEEPING,
    StaffRole.MAINTENANCE: Department.MAINTENANCE,
    StaffRole.FNB: Department.FNB,
    StaffRole.RECEPTION: Department.RECEPTION,
}

def sync_staff_availability(staff_id: int, db: Session):
    """
    Synchronizes staff availability_status based on their active task workload.
    Assigned PENDING, ACCEPTED, or IN_PROGRESS tasks make a staff member BUSY.
    Otherwise they are AVAILABLE.
    """
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        return

    # Admins are never automatically assigned tasks, but they should remain consistent
    active_tasks = db.query(Task).filter(
        Task.assigned_staff_id == staff.id,
        Task.status.in_([TaskStatus.PENDING, TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS])
    ).count()

    old_status = staff.availability_status
    new_status = AvailabilityStatus.BUSY if active_tasks > 0 else AvailabilityStatus.AVAILABLE

    if old_status != new_status:
        staff.availability_status = new_status
        db.flush() # Ensure it's populated in memory/DB
        
        log_event(
            db=db,
            event_type="STAFF_AVAILABILITY_CHANGED",
            actor_type="system",
            actor_id="system",
            entity_type="staff",
            entity_id=staff.staff_id,
            description=f"Staff {staff.staff_id} availability status synchronized from '{old_status.value}' to '{new_status.value}' based on workload ({active_tasks} active tasks).",
            commit=False
        )

def assign_task_round_robin(task: Task, db: Session) -> Optional[Staff]:
    """
    Selects the next eligible staff member using Round Robin rotation and assigns the task.
    Guarantees atomic update of task assignment, staff workload status, and rotation state.
    """
    # 1. Fetch eligible staff for this department
    # Exclude ADMIN, must be ACTIVE, ON_DUTY, AVAILABLE, and belong to correct role
    eligible_staff = db.query(Staff).filter(
        Staff.employment_status == EmploymentStatus.ACTIVE,
        Staff.duty_status == DutyStatus.ON_DUTY,
        Staff.availability_status == AvailabilityStatus.AVAILABLE,
        Staff.role != StaffRole.ADMIN
    ).all()

    # Filter roles that match the task's department
    eligible_dept_staff = [
        s for s in eligible_staff
        if ROLE_DEPT_MAPPING.get(s.role) == task.department
    ]

    # Sort deterministically by staff_id ascending
    eligible_dept_staff.sort(key=lambda s: s.staff_id)

    if not eligible_dept_staff:
        # No free staff available -> Log assignment pending
        log_event(
            db=db,
            event_type="TASK_ASSIGNMENT_PENDING",
            actor_type="system",
            actor_id="system",
            entity_type="task",
            entity_id=task.task_id,
            description=f"No eligible staff available in {task.department.value} department. Task {task.task_id} remains unassigned.",
            commit=False
        )
        return None

    # 2. Query / Initialize department assignment rotation
    rotation = db.query(AssignmentRotation).filter(
        AssignmentRotation.department == task.department
    ).first()

    if not rotation:
        rotation = AssignmentRotation(
            department=task.department,
            last_assigned_staff_id=None
        )
        db.add(rotation)
        db.flush()

    # 3. Determine target employee
    selected_staff = None
    last_id = rotation.last_assigned_staff_id

    if last_id is not None:
        # Lexicographical fallback search: search for first eligible staff with staff_id > last_assigned_staff_id
        candidates = [s for s in eligible_dept_staff if s.staff_id > last_id]
        if candidates:
            selected_staff = candidates[0]
        else:
            # Wrap around
            selected_staff = eligible_dept_staff[0]
    else:
        # First assignment
        selected_staff = eligible_dept_staff[0]

    # 4. Apply assignment
    task.assigned_staff_id = selected_staff.id
    task.assigned_at = datetime.now(timezone.utc)
    task.status = TaskStatus.PENDING  # Stays PENDING until accepted

    # Update rotation state
    rotation.last_assigned_staff_id = selected_staff.staff_id

    # Flush session updates so that sync_staff_availability queries find this task
    db.flush()

    # 5. Synchronize staff availability to BUSY immediately (atomic block)
    sync_staff_availability(selected_staff.id, db)

    # 6. Create persistent notification in DB (does not commit)
    from app.services.notification_service import create_notification
    create_notification(
        db=db,
        recipient_staff_id=selected_staff.staff_id,
        type="task.assigned",
        title="New Task Assigned",
        message=f"{task.title} — Room {task.room.room_number}",
        entity_type="task",
        entity_id=task.task_id,
        priority=task.priority.value
    )

    # 7. Audit logging
    log_event(
        db=db,
        event_type="TASK_AUTO_ASSIGNED",
        actor_type="system",
        actor_id="system",
        entity_type="task",
        entity_id=task.task_id,
        description=f"System assigned task {task.task_id} to staff {selected_staff.staff_id} using Round Robin strategy.",
        metadata_json={
            "strategy": "round_robin",
            "department": task.department.value,
            "previous_staff": last_id,
            "selected_staff": selected_staff.staff_id
        },
        commit=False
    )

    return selected_staff

def trigger_pending_assignments(department: Department, db: Session):
    """
    Attempts to assign pending unassigned tasks for a department in order of priority
    (URGENT -> HIGH -> MEDIUM -> LOW) and oldest created_at first.
    Re-evaluates eligibility after each successful assignment to prevent over-assignment.
    """
    priority_order = case(
        (Task.priority == TaskPriority.URGENT, 4),
        (Task.priority == TaskPriority.HIGH, 3),
        (Task.priority == TaskPriority.MEDIUM, 2),
        (Task.priority == TaskPriority.LOW, 1),
        else_=0
    )

    while True:
        # Query next pending task (one at a time to re-evaluate availability dynamically)
        task = db.query(Task).filter(
            Task.department == department,
            Task.status == TaskStatus.PENDING,
            Task.assigned_staff_id == None
        ).order_by(priority_order.desc(), Task.created_at.asc()).first()

        if not task:
            break

        # Attempt to assign the task
        assigned = assign_task_round_robin(task, db)
        if not assigned:
            # No eligible staff left -> Stop processing retry queue
            break
        
        assigned_staff_code = assigned.staff_id if assigned else None
        
        # Commit the transaction so that next loop iteration reads the updated availability from database
        db.commit()

        # Emit event post-commit
        if assigned_staff_code:
            from app.services.event_service import emit_event
            emit_event(
                event_type="task.assigned",
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
