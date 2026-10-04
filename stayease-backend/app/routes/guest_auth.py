from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.guest import Guest
from app.core.security import verify_password, create_access_token
from app.core.dependencies import get_current_guest
from app.schemas.guest_auth import GuestLoginRequest, GuestRegisterRequest, GuestTokenResponse, GuestResponse
from app.services.guest_auth_service import register_guest
from app.services.audit_service import log_event

router = APIRouter(prefix="/api/guest-auth", tags=["Guest Authentication"])

@router.post("/register", response_model=GuestTokenResponse, status_code=status.HTTP_201_CREATED)
def guest_register(request: GuestRegisterRequest, db: Session = Depends(get_db)):
    """
    Public registration endpoint for new guests.
    Validates unique email and creates a guest profile.
    Returns access token and guest user info.
    """
    return register_guest(request, db)

@router.post("/login", response_model=GuestTokenResponse)
def guest_login(request: GuestLoginRequest, db: Session = Depends(get_db)):
    """
    Login endpoint for hotel guests.
    Verifies guest exists by email and validates their password.
    Returns access token with principal_type='guest' and guest profile.
    """
    email_lower = request.email.strip().lower()

    # Find guest by email
    guest = db.query(Guest).filter(func.lower(Guest.email) == email_lower).first()

    if not guest or not guest.password_hash or not verify_password(request.password, guest.password_hash):
        log_event(
            db,
            event_type="GUEST_LOGIN_FAILED",
            actor_type="guest",
            actor_id=request.email[:50],
            entity_type="auth",
            entity_id="none",
            description=f"Failed guest login attempt for email: {request.email[:50]}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Generate Guest JWT access token using guest_id as 'sub' claim
    token_payload = {
        "sub": guest.guest_id,
        "principal_type": "guest"
    }
    access_token = create_access_token(data=token_payload)

    log_event(
        db,
        event_type="GUEST_LOGIN_SUCCESS",
        actor_type="guest",
        actor_id=guest.guest_id,
        entity_type="guest",
        entity_id=guest.guest_id,
        description=f"Guest {guest.name} logged in successfully"
    )

    return {
        "status": "success",
        "authenticated": True,
        "access_token": access_token,
        "token_type": "bearer",
        "user": guest
    }

@router.get("/me", response_model=GuestResponse)
def get_guest_me(current_guest: Guest = Depends(get_current_guest)):
    """
    Returns the currently authenticated guest profile.
    """
    return current_guest
