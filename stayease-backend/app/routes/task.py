from fastapi import APIRouter, Depends, HTTPException, status as fastapi_status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.task import Task
from app.models.room import Room
from app.models.enums import StaffRole, Department, TaskStatus, TaskPriority
from app.core.dependencies import get_current_staff
from app.schemas.task import TaskResponse
from app.services.task_service import accept_task, start_task, complete_task
from app.models.staff import Staff

router = APIRouter(prefix="/api/tasks", tags=["Operational Tasks"])

ROLE_DEPT_MAPPING = {
    StaffRole.HOUSEKEEPING: Department.HOUSEKEEPING,
    StaffRole.MAINTENANCE: Department.MAINTENANCE,
    StaffRole.FNB: Department.FNB,
    StaffRole.RECEPTION: Department.RECEPTION,
}

@router.get("", response_model=List[TaskResponse])
def list_tasks(
    department: Optional[Department] = None,
    status: Optional[TaskStatus] = None,
    room_number: Optional[str] = None,
    priority: Optional[TaskPriority] = None,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    List tasks with departmental filtering.
    - ADMIN and RECEPTION can view all tasks and use filters.
    - Departmental staff can only view tasks belonging to their department.
    """
    query = db.query(Task)
    
    # 1. Enforce Role Department filters
    if current_staff.role != StaffRole.ADMIN and current_staff.role != StaffRole.RECEPTION:
        mapped_dept = ROLE_DEPT_MAPPING.get(current_staff.role)
        if not mapped_dept:
            raise HTTPException(
                status_code=fastapi_status.HTTP_403_FORBIDDEN,
                detail="Role not authorized to access tasks"
            )
        # Force department filter
        query = query.filter(Task.department == mapped_dept)
        
        # Rejects filter override attempts
        if department is not None and department != mapped_dept:
            raise HTTPException(
                status_code=fastapi_status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view tasks of another department"
            )
    else:
        # Admin or Reception filters optionally
        if department is not None:
            query = query.filter(Task.department == department)

    # 2. General Query Filters
    if status is not None:
        query = query.filter(Task.status == status)
    if room_number is not None:
        room = db.query(Room).filter(func.lower(Room.room_number) == room_number.lower()).first()
        if room:
            query = query.filter(Task.room_id == room.id)
        else:
            return []
    if priority is not None:
        query = query.filter(Task.priority == priority)

    return query.all()

@router.get("/my", response_model=List[TaskResponse])
def get_my_tasks(
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Returns tasks assigned to the authenticated staff member.
    """
    return db.query(Task).filter(Task.assigned_staff_id == current_staff.id).all()

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Fetch details of a specific task. Enforces departmental view constraints.
    """
    task = db.query(Task).filter(func.lower(Task.task_id) == task_id.lower()).first()
    if not task:
        raise HTTPException(
            status_code=fastapi_status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found"
        )

    # Role check
    if current_staff.role != StaffRole.ADMIN and current_staff.role != StaffRole.RECEPTION:
        mapped_dept = ROLE_DEPT_MAPPING.get(current_staff.role)
        if not mapped_dept or task.department != mapped_dept:
            raise HTTPException(
                status_code=fastapi_status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access details of tasks outside your department."
            )

    return task

@router.patch("/{task_id}/accept", response_model=TaskResponse)
def accept(
    task_id: str,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Accepts an unassigned pending task.
    """
    return accept_task(task_id, current_staff, db)

@router.patch("/{task_id}/start", response_model=TaskResponse)
def start(
    task_id: str,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Starts an accepted task (moves to IN_PROGRESS).
    """
    return start_task(task_id, current_staff, db)

@router.patch("/{task_id}/complete", response_model=TaskResponse)
@router.patch("/{task_id}/resolve", response_model=TaskResponse)
def complete(
    task_id: str,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Completes or resolves an in-progress task.
    """
    return complete_task(task_id, current_staff, db)

