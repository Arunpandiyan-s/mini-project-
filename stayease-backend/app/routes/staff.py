from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.staff import Staff
from app.models.enums import StaffRole, EmploymentStatus
from app.core.dependencies import require_roles, get_current_staff
from app.core.security import hash_password
from app.schemas.staff import StaffCreate, StaffUpdate, StaffResponse
from app.services.audit_service import log_event
from app.models.enums import DutyStatus, TaskStatus
from app.models.task import Task
from app.services.assignment_service import trigger_pending_assignments, sync_staff_availability, ROLE_DEPT_MAPPING
from pydantic import BaseModel

class DutyStatusUpdate(BaseModel):
    duty_status: DutyStatus

router = APIRouter(prefix="/api/staff", tags=["Staff Management"])

@router.get("", response_model=List[StaffResponse])
def list_staff(
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN, StaffRole.RECEPTION))
):
    """
    List all staff members.
    Accessible to: ADMIN, RECEPTION.
    """
    return db.query(Staff).all()

@router.get("/{staff_id}", response_model=StaffResponse)
def get_staff(
    staff_id: str,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN, StaffRole.RECEPTION))
):
    """
    Get detailed profile of a specific staff member.
    Accessible to: ADMIN, RECEPTION.
    """
    staff = db.query(Staff).filter(func.lower(Staff.staff_id) == staff_id.lower()).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff member with ID '{staff_id}' not found"
        )
    return staff

@router.post("", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
def create_staff(
    request: StaffCreate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN))
):
    """
    Create a new staff member.
    Accessible to: ADMIN only.
    """
    # Check duplicate staff_id (case-insensitive check)
    existing_id = db.query(Staff).filter(func.lower(Staff.staff_id) == request.staff_id.lower()).first()
    if existing_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Staff ID '{request.staff_id}' is already registered."
        )

    # Check duplicate email (case-insensitive check)
    existing_email = db.query(Staff).filter(func.lower(Staff.email) == request.email.lower()).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{request.email}' is already registered."
        )

    hashed_pw = hash_password(request.password)
    
    new_staff = Staff(
        staff_id=request.staff_id,
        name=request.name,
        email=request.email.lower().strip(),
        phone=request.phone,
        password_hash=hashed_pw,
        role=request.role,
        floor=request.floor,
        shift=request.shift
    )
    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)

    log_event(
        db,
        event_type="STAFF_CREATED",
        actor_type="staff",
        actor_id=current_staff.staff_id,
        entity_type="staff",
        entity_id=new_staff.staff_id,
        description=f"Admin {current_staff.name} created staff member {new_staff.name} ({new_staff.staff_id})"
    )

    return new_staff

@router.patch("/{staff_id}", response_model=StaffResponse)
def update_staff(
    staff_id: str,
    request: StaffUpdate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN))
):
    """
    Update staff details.
    Accessible to: ADMIN only.
    """
    staff = db.query(Staff).filter(func.lower(Staff.staff_id) == staff_id.lower()).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff member with ID '{staff_id}' not found"
        )

    # Check duplicate email if it is changing
    if request.email and request.email.lower() != staff.email.lower():
        existing_email = db.query(Staff).filter(func.lower(Staff.email) == request.email.lower()).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Email '{request.email}' is already registered."
            )

    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(staff, key, value)

    db.commit()
    db.refresh(staff)

    log_event(
        db,
        event_type="STAFF_UPDATED",
        actor_type="staff",
        actor_id=current_staff.staff_id,
        entity_type="staff",
        entity_id=staff.staff_id,
        description=f"Admin {current_staff.name} updated staff member {staff.name} ({staff.staff_id})"
    )

    return staff

@router.patch("/{staff_id}/suspend", response_model=StaffResponse)
def suspend_staff(
    staff_id: str,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN))
):
    """
    Suspend a staff member. Prevents future logins and JWT authorization.
    Accessible to: ADMIN only.
    """
    staff = db.query(Staff).filter(func.lower(Staff.staff_id) == staff_id.lower()).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff member with ID '{staff_id}' not found"
        )

    staff.employment_status = EmploymentStatus.SUSPENDED
    db.commit()
    db.refresh(staff)

    log_event(
        db,
        event_type="STAFF_SUSPENDED",
        actor_type="staff",
        actor_id=current_staff.staff_id,
        entity_type="staff",
        entity_id=staff.staff_id,
        description=f"Admin {current_staff.name} suspended staff member {staff.name} ({staff.staff_id})"
    )

    return staff

@router.patch("/{staff_id}/activate", response_model=StaffResponse)
def activate_staff(
    staff_id: str,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN))
):
    """
    Reactivate a suspended staff member.
    Accessible to: ADMIN only.
    """
    staff = db.query(Staff).filter(func.lower(Staff.staff_id) == staff_id.lower()).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff member with ID '{staff_id}' not found"
        )

    staff.employment_status = EmploymentStatus.ACTIVE
    db.commit()
    db.refresh(staff)

    log_event(
        db,
        event_type="STAFF_ACTIVATED",
        actor_type="staff",
        actor_id=current_staff.staff_id,
        entity_type="staff",
        entity_id=staff.staff_id,
        description=f"Admin {current_staff.name} activated staff member {staff.name} ({staff.staff_id})"
    )

    return staff

@router.delete("/{staff_id}", status_code=status.HTTP_200_OK)
def delete_staff(
    staff_id: str,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN))
):
    """
    Hard delete a staff member.
    Validates referential integrity: if tasks are assigned to them, rejects deletion.
    Accessible to: ADMIN only.
    """
    staff = db.query(Staff).filter(func.lower(Staff.staff_id) == staff_id.lower()).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff member with ID '{staff_id}' not found"
        )

    # Check if the staff member has historical tasks assigned
    if len(staff.assigned_tasks) > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete staff member with historical task assignments. Suspend the account instead."
        )

    staff_name = staff.name
    db.delete(staff)
    db.commit()

    log_event(
        db,
        event_type="STAFF_DELETED",
        actor_type="staff",
        actor_id=current_staff.staff_id,
        entity_type="staff",
        entity_id=staff_id,
        description=f"Admin {current_staff.name} deleted staff member {staff_name} ({staff_id})"
    )

    return {"message": f"Staff member '{staff_name}' ({staff_id}) deleted successfully."}

@router.patch("/me/duty-status", response_model=StaffResponse)
def update_my_duty_status(
    request: DutyStatusUpdate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Allow authenticated staff to change their own duty status.
    Block going OFF_DUTY if they have active/pending task assignments.
    """
    if request.duty_status == DutyStatus.OFF_DUTY:
        active_tasks = db.query(Task).filter(
            Task.assigned_staff_id == current_staff.id,
            Task.status.in_([TaskStatus.PENDING, TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS])
        ).count()
        if active_tasks > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot go OFF_DUTY while you have active or pending task assignments."
            )

    old_status = current_staff.duty_status
    current_staff.duty_status = request.duty_status
    
    # Audit log
    log_event(
        db=db,
        event_type="STAFF_DUTY_STATUS_CHANGED",
        actor_type="staff",
        actor_id=current_staff.staff_id,
        entity_type="staff",
        entity_id=current_staff.staff_id,
        description=f"Staff member {current_staff.name} changed own duty status from '{old_status.value}' to '{request.duty_status.value}'.",
        commit=False
    )
    db.commit()
    db.refresh(current_staff)

    # If transitioning to ON_DUTY, sync availability & trigger pending assignment retry
    if request.duty_status == DutyStatus.ON_DUTY:
        sync_staff_availability(current_staff.id, db)
        dept = ROLE_DEPT_MAPPING.get(current_staff.role)
        if dept:
            trigger_pending_assignments(dept, db)

    return current_staff

@router.patch("/{staff_id}/duty-status", response_model=StaffResponse)
def admin_update_staff_duty_status(
    staff_id: str,
    request: DutyStatusUpdate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN))
):
    """
    Admin override to update any staff's duty status.
    """
    target_staff = db.query(Staff).filter(func.lower(Staff.staff_id) == staff_id.lower()).first()
    if not target_staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff member '{staff_id}' not found."
        )

    if request.duty_status == DutyStatus.OFF_DUTY:
        active_tasks = db.query(Task).filter(
            Task.assigned_staff_id == target_staff.id,
            Task.status.in_([TaskStatus.PENDING, TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS])
        ).count()
        if active_tasks > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot change staff '{staff_id}' to OFF_DUTY while they have active or pending task assignments."
            )

    old_status = target_staff.duty_status
    target_staff.duty_status = request.duty_status

    log_event(
        db=db,
        event_type="STAFF_DUTY_STATUS_CHANGED",
        actor_type="staff",
        actor_id=current_staff.staff_id,
        entity_type="staff",
        entity_id=target_staff.staff_id,
        description=f"Admin {current_staff.name} changed duty status of {target_staff.name} ({target_staff.staff_id}) from '{old_status.value}' to '{request.duty_status.value}'.",
        commit=False
    )
    db.commit()
    db.refresh(target_staff)

    if request.duty_status == DutyStatus.ON_DUTY:
        dept = ROLE_DEPT_MAPPING.get(target_staff.role)
        if dept:
            trigger_pending_assignments(dept, db)

    return target_staff
