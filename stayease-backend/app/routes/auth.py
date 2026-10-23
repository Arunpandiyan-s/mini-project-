from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.staff import Staff
from app.models.enums import EmploymentStatus
from app.core.security import verify_password, create_access_token
from app.core.dependencies import get_current_staff
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.staff import StaffResponse
from app.services.audit_service import log_event

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def normalize_phone(phone: str) -> str:
    if not phone:
        return ""
    return phone.replace(" ", "").replace("-", "").replace("+", "").strip()

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login endpoint verifying credentials and returning a JWT token.
    Supports login via Staff ID, Email, or Phone number.
    """
    input_val = request.identifier.strip()
    input_val_lower = input_val.lower()

    # Find staff by email
    staff = db.query(Staff).filter(func.lower(Staff.email) == input_val_lower).first()
    
    # Or by staff_id
    if not staff:
        staff = db.query(Staff).filter(func.lower(Staff.staff_id) == input_val_lower).first()
        
    # Or by exact normalized phone
    if not staff:
        input_norm_phone = normalize_phone(input_val)
        if input_norm_phone:
            all_staff = db.query(Staff).all()
            for s in all_staff:
                if s.phone and normalize_phone(s.phone) == input_norm_phone:
                    staff = s
                    break

    # If staff not found or password incorrect, return 401
    if not staff or not verify_password(request.password, staff.password_hash):
        log_event(
            db,
            event_type="LOGIN_FAILURE",
            actor_type="staff",
            actor_id=request.identifier[:50],
            entity_type="auth",
            entity_id="none",
            description=f"Failed login attempt for identifier: {request.identifier[:50]}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid identifier or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # 403 suspended/inactive account
    if staff.employment_status != EmploymentStatus.ACTIVE:
        log_event(
            db,
            event_type="LOGIN_FAILURE",
            actor_type="staff",
            actor_id=staff.staff_id,
            entity_type="staff",
            entity_id=staff.staff_id,
            description=f"Blocked login attempt for suspended staff member {staff.name}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive or suspended"
        )

    # Normalise input role: manager -> admin compatibility
    req_role = request.role
    if req_role == "manager":
        req_role = "admin"

    # Role mismatch check
    if req_role and staff.role.value != req_role:
        log_event(
            db,
            event_type="LOGIN_FAILURE",
            actor_type="staff",
            actor_id=staff.staff_id,
            entity_type="staff",
            entity_id=staff.staff_id,
            description=f"Blocked login attempt for {staff.name} due to role mismatch"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role mismatch for the provided account"
        )

    # Successful Login
    token_payload = {
        "sub": str(staff.id),
        "staff_id": staff.staff_id,
        "role": staff.role.value,
        "principal_type": "staff"
    }
    access_token = create_access_token(data=token_payload)

    log_event(
        db,
        event_type="LOGIN_SUCCESS",
        actor_type="staff",
        actor_id=staff.staff_id,
        entity_type="staff",
        entity_id=staff.staff_id,
        description=f"Staff member {staff.name} logged in successfully"
    )

    return {
        "status": "success",
        "authenticated": True,
        "access_token": access_token,
        "token_type": "bearer",
        "user": staff
    }

@router.get("/me", response_model=StaffResponse)
def get_me(current_staff: Staff = Depends(get_current_staff)):
    """
    Returns the current authenticated staff member profile.
    """
    return current_staff

@router.post("/logout")
def logout(db: Session = Depends(get_db), current_staff: Staff = Depends(get_current_staff)):
    """
    Staff logout endpoint. Logs audit event and clears session.
    """
    log_event(
        db,
        event_type="LOGOUT",
        actor_type="staff",
        actor_id=current_staff.staff_id,
        entity_type="staff",
        entity_id=current_staff.staff_id,
        description=f"Staff member {current_staff.name} logged out."
    )
    return {"status": "success", "message": "Logged out successfully"}

