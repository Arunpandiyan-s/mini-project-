from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.reservation import Reservation
from app.models.room import Room
from app.models.guest import Guest
from app.models.enums import StaffRole, ReservationStatus, MaintenanceStatus
from app.core.dependencies import require_roles
from app.schemas.reservation import ReservationCreate, ReservationResponse
from app.services.reservation_service import check_reservation_overlap, check_in_reservation, checkout_reservation
from app.services.audit_service import log_event
from app.models.staff import Staff

router = APIRouter(prefix="/api/reservations", tags=["Reservations Lifecycle"])

@router.get("", response_model=List[ReservationResponse])
def list_reservations(
    status: Optional[ReservationStatus] = None,
    guest_id: Optional[int] = None,
    room_number: Optional[str] = None,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN, StaffRole.RECEPTION))
):
    """
    List all reservations.
    Accessible to: ADMIN, RECEPTION.
    """
    query = db.query(Reservation)
    if status is not None:
        query = query.filter(Reservation.status == status)
    if guest_id is not None:
        query = query.filter(Reservation.guest_id == guest_id)
    if room_number is not None:
        room = db.query(Room).filter(func.lower(Room.room_number) == room_number.lower()).first()
        if room:
            query = query.filter(Reservation.room_id == room.id)
        else:
            return []
    
    res_list = query.order_by(Reservation.created_at.desc()).all()
    out = []
    for r in res_list:
        resp = ReservationResponse.model_validate(r)
        resp.guest_name = r.guest.name if r.guest else f"Guest #{r.guest_id}"
        resp.room_number = r.room.room_number if r.room else "TBD"
        out.append(resp)
    return out

@router.get("/{reservation_id}", response_model=ReservationResponse)
def get_reservation(
    reservation_id: str,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN, StaffRole.RECEPTION))
):
    """
    Get detailed profile of a specific reservation.
    Accessible to: ADMIN, RECEPTION.
    """
    res = db.query(Reservation).filter(func.lower(Reservation.reservation_id) == reservation_id.lower()).first()
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reservation '{reservation_id}' not found"
        )
    resp = ReservationResponse.model_validate(res)
    resp.guest_name = res.guest.name if res.guest else f"Guest #{res.guest_id}"
    resp.room_number = res.room.room_number if res.room else "TBD"
    return resp

@router.post("", response_model=ReservationResponse, status_code=status.HTTP_201_CREATED)
def create_reservation(
    request: ReservationCreate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN, StaffRole.RECEPTION))
):
    """
    Create a new reservation.
    Accessible to: ADMIN, RECEPTION.
    """
    # 1. Unique reservation_id
    existing = db.query(Reservation).filter(func.lower(Reservation.reservation_id) == request.reservation_id.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Reservation ID '{request.reservation_id}' already exists."
        )

    # 2. Check check_out > check_in
    if request.check_out <= request.check_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Checkout date must be strictly after check-in date."
        )

    # 3. Lookup guest
    guest = db.query(Guest).filter(func.lower(Guest.guest_id) == request.guest_id.lower()).first()
    if not guest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Guest profile with ID '{request.guest_id}' not found"
        )

    # 4. Lookup room
    room = db.query(Room).filter(func.lower(Room.room_number) == request.room_number.lower()).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room '{request.room_number}' not found"
        )

    # 5. Check if room is out of service
    if room.maintenance_status == MaintenanceStatus.OUT_OF_SERVICE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Room '{request.room_number}' is out of service and cannot be reserved."
        )

    # 6. Overlap schedule check
    if check_reservation_overlap(room.id, request.check_in, request.check_out, db):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Room '{request.room_number}' is already reserved during the requested stay window."
        )

    new_res = Reservation(
        reservation_id=request.reservation_id,
        guest_id=guest.id,
        room_id=room.id,
        check_in=request.check_in,
        check_out=request.check_out,
        status=ReservationStatus.BOOKED
    )
    db.add(new_res)
    db.commit()
    db.refresh(new_res)

    log_event(
        db,
        event_type="RESERVATION_CREATED",
        actor_type="staff",
        actor_id=current_staff.staff_id,
        entity_type="reservation",
        entity_id=new_res.reservation_id,
        description=f"Staff member {current_staff.name} booked room {room.room_number} under reservation {new_res.reservation_id} for guest {guest.name}"
    )

    from app.services.event_service import emit_event
    emit_event(
        event_type="reservation.created",
        data={
            "reservation_id": new_res.reservation_id,
            "room_number": room.room_number,
            "guest_id": guest.guest_id,
            "status": new_res.status.value
        },
        send_to_all_admins=True
    )

    return new_res

@router.patch("/{reservation_id}/cancel", response_model=ReservationResponse)
def cancel_reservation(
    reservation_id: str,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN, StaffRole.RECEPTION))
):
    """
    Cancel an existing reservation.
    Only BOOKED reservations can be cancelled.
    Accessible to: ADMIN, RECEPTION.
    """
    res = db.query(Reservation).filter(func.lower(Reservation.reservation_id) == reservation_id.lower()).first()
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reservation '{reservation_id}' not found"
        )

    if res.status == ReservationStatus.CANCELLED:
        return res

    if res.status == ReservationStatus.CHECKED_OUT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot cancel a checked-out reservation."
        )

    if res.status == ReservationStatus.CHECKED_IN:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot cancel an active checked-in reservation. Checkout the guest instead."
        )

    res.status = ReservationStatus.CANCELLED
    db.commit()
    db.refresh(res)

    log_event(
        db,
        event_type="RESERVATION_CANCELLED",
        actor_type="staff",
        actor_id=current_staff.staff_id,
        entity_type="reservation",
        entity_id=res.reservation_id,
        description=f"Staff member {current_staff.name} cancelled reservation {res.reservation_id}"
    )

    from app.services.event_service import emit_event
    from app.models.room import Room
    from app.models.guest import Guest

    room = db.query(Room).filter(Room.id == res.room_id).first()
    guest = db.query(Guest).filter(Guest.id == res.guest_id).first()
    room_number = room.room_number if room else "unknown"
    guest_id = guest.guest_id if guest else "unknown"

    emit_event(
        event_type="reservation.cancelled",
        data={
            "reservation_id": res.reservation_id,
            "room_number": room_number,
            "guest_id": guest_id,
            "status": res.status.value
        },
        send_to_all_admins=True
    )

    return res

@router.post("/{reservation_id}/check-in", response_model=ReservationResponse)
def check_in(
    reservation_id: str,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN, StaffRole.RECEPTION))
):
    """
    Perform check-in.
    Accessible to: ADMIN, RECEPTION.
    """
    return check_in_reservation(reservation_id, db, current_staff.staff_id)

@router.post("/{reservation_id}/checkout", response_model=ReservationResponse)
@router.post("/{reservation_id}/check-out", response_model=ReservationResponse)
def checkout(
    reservation_id: str,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(require_roles(StaffRole.ADMIN, StaffRole.RECEPTION))
):
    """
    Perform checkout.
    Accessible to: ADMIN, RECEPTION.
    """
    return checkout_reservation(reservation_id, db, current_staff.staff_id)

