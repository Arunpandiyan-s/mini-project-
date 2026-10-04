from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.guest import Guest
from app.models.enums import StaffRole
from app.core.dependencies import require_roles
from app.schemas.guest import GuestCreate, GuestUpdate, GuestResponse
from app.services.audit_service import log_event
from app.models.staff import Staff

router = APIRouter(prefix="/api/guests", tags=["Guests Management"])

@router.get("", response_model=List[GuestResponse])
def list_guests(
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN, StaffRole.RECEPTION))
):
    """
    List all guest profiles.
    Accessible to: ADMIN, RECEPTION.
    """
    return db.query(Guest).all()

@router.get("/{guest_id}", response_model=GuestResponse)
def get_guest(
    guest_id: str,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN, StaffRole.RECEPTION))
):
    """
    Get detailed profile of a specific guest by guest_id.
    Accessible to: ADMIN, RECEPTION.
    """
    guest = db.query(Guest).filter(func.lower(Guest.guest_id) == guest_id.lower()).first()
    if not guest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Guest with ID '{guest_id}' not found"
        )
    return guest

@router.post("", response_model=GuestResponse, status_code=status.HTTP_201_CREATED)
def create_guest(
    request: GuestCreate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN, StaffRole.RECEPTION))
):
    """
    Create a new guest profile.
    Accessible to: ADMIN, RECEPTION.
    """
    # Enforce unique guest_id
    existing_guest = db.query(Guest).filter(func.lower(Guest.guest_id) == request.guest_id.lower()).first()
    if existing_guest:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Guest ID '{request.guest_id}' is already registered."
        )

    # Enforce email uniqueness check (since Guest.email is unique in the DB model)
    existing_email = db.query(Guest).filter(func.lower(Guest.email) == request.email.lower()).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{request.email}' is already registered to another guest."
        )

    new_guest = Guest(
        guest_id=request.guest_id,
        name=request.name,
        email=request.email.lower().strip(),
        phone=request.phone
    )
    db.add(new_guest)
    db.commit()
    db.refresh(new_guest)

    log_event(
        db,
        event_type="GUEST_CREATED",
        actor_type="staff",
        actor_id=current_staff.staff_id,
        entity_type="guest",
        entity_id=new_guest.guest_id,
        description=f"Staff member {current_staff.name} created guest profile {new_guest.name} ({new_guest.guest_id})"
    )

    return new_guest

@router.patch("/{guest_id}", response_model=GuestResponse)
def update_guest(
    guest_id: str,
    request: GuestUpdate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN, StaffRole.RECEPTION))
):
    """
    Update details of a guest profile.
    Accessible to: ADMIN, RECEPTION.
    """
    guest = db.query(Guest).filter(func.lower(Guest.guest_id) == guest_id.lower()).first()
    if not guest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Guest with ID '{guest_id}' not found"
        )

    # Check duplicate email if email is being updated
    if request.email and request.email.lower() != guest.email.lower():
        existing_email = db.query(Guest).filter(func.lower(Guest.email) == request.email.lower()).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Email '{request.email}' is already registered to another guest."
            )

    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(guest, key, value)

    db.commit()
    db.refresh(guest)

    log_event(
        db,
        event_type="GUEST_UPDATED",
        actor_type="staff",
        actor_id=current_staff.staff_id,
        entity_type="guest",
        entity_id=guest.guest_id,
        description=f"Staff member {current_staff.name} updated guest profile {guest.name} ({guest.guest_id})"
    )

    return guest
