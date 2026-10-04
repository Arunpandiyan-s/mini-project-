from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.guest_request import GuestRequest
from app.models.enums import StaffRole, Department
from app.core.dependencies import require_roles, get_current_staff
from app.schemas.guest_request import GuestRequestCreate, GuestRequestResponse
from app.services.guest_request_service import create_guest_request_and_task
from app.models.staff import Staff

router = APIRouter(prefix="/api/guest-requests", tags=["Guest Requests"])

# Department mapping matching roles to restrict directories
ROLE_DEPT_MAPPING = {
    StaffRole.HOUSEKEEPING: Department.HOUSEKEEPING,
    StaffRole.MAINTENANCE: Department.MAINTENANCE,
    StaffRole.FNB: Department.FNB,
    StaffRole.RECEPTION: Department.RECEPTION,
}

@router.post("", response_model=GuestRequestResponse, status_code=status.HTTP_201_CREATED)
def create_request(
    request: GuestRequestCreate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN, StaffRole.RECEPTION))
):
    """
    Creates a guest request and corresponding unassigned task atomically.
    Accessible to: ADMIN, RECEPTION.
    """
    return create_guest_request_and_task(request, db, current_staff.staff_id)

@router.get("", response_model=List[GuestRequestResponse])
def list_requests(
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    List guest requests with strict departmental filtering.
    - ADMIN & RECEPTION can view all guest requests.
    - Departmental staff can only view requests matching their department.
    """
    query = db.query(GuestRequest)
    
    if current_staff.role == StaffRole.ADMIN or current_staff.role == StaffRole.RECEPTION:
        # Full coordinate visibility
        return query.all()
        
    mapped_dept = ROLE_DEPT_MAPPING.get(current_staff.role)
    if not mapped_dept:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role not authorized to access guest requests directory"
        )
        
    return query.filter(GuestRequest.department == mapped_dept).all()

@router.get("/{request_id}", response_model=GuestRequestResponse)
def get_request(
    request_id: str,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    """
    Fetch a specific guest request by request_id. Enforces departmental RBAC.
    """
    req = db.query(GuestRequest).filter(func.lower(GuestRequest.request_id) == request_id.lower()).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Guest request '{request_id}' not found"
        )

    # Department RBAC check
    if current_staff.role != StaffRole.ADMIN and current_staff.role != StaffRole.RECEPTION:
        mapped_dept = ROLE_DEPT_MAPPING.get(current_staff.role)
        if not mapped_dept or req.department != mapped_dept:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access details of guest requests outside your department."
            )
            
    return req
