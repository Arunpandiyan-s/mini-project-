import uuid
import time
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.guest import Guest
from app.schemas.guest_auth import GuestRegisterRequest
from app.core.security import hash_password, create_access_token
from app.services.audit_service import log_event

def register_guest(request: GuestRegisterRequest, db: Session) -> dict:
    """
    Registers a new public guest account.
    Enforces unique email validation and returns authentication JWT token and profile.
    """
    clean_email = request.email.strip().lower()

    # 1. Check duplicate email
    existing = db.query(Guest).filter(func.lower(Guest.email) == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{request.email}' is already registered."
        )

    # 2. Generate unique guest business ID matching ^GST-\d+$
    guest_id = f"GST-{(int(time.time() * 1000) % 80000) + 10000}"
    hashed_pw = hash_password(request.password)

    # 3. Create Guest model
    guest = Guest(
        guest_id=guest_id,
        name=request.name.strip(),
        email=clean_email,
        phone=request.phone.strip() if request.phone else None,
        password_hash=hashed_pw
    )
    db.add(guest)
    db.commit()
    db.refresh(guest)

    # 4. Audit Log
    log_event(
        db,
        event_type="GUEST_REGISTERED",
        actor_type="guest",
        actor_id=guest.guest_id,
        entity_type="guest",
        entity_id=guest.guest_id,
        description=f"Public guest {guest.name} registered account ({guest.email})"
    )

    # 5. Create JWT Token
    token_payload = {
        "sub": guest.guest_id,
        "principal_type": "guest"
    }
    access_token = create_access_token(data=token_payload)

    return {
        "status": "success",
        "authenticated": True,
        "access_token": access_token,
        "token_type": "bearer",
        "user": guest
    }
