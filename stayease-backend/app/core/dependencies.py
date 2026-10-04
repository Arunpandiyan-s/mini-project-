from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import decode_access_token
from app.models.staff import Staff
from app.models.enums import StaffRole, EmploymentStatus

from app.models.guest import Guest

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)
guest_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/guest-auth/login", auto_error=False)

def get_current_staff(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Staff:
    """
    Dependency to fetch and validate the currently authenticated staff member.
    Re-checks database state to enforce suspension status immediately.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if not payload:
        raise credentials_exception

    if payload.get("principal_type") != "staff":
        raise credentials_exception

    sub = payload.get("sub")
    staff_id = payload.get("staff_id")
    if not sub or not staff_id:
        raise credentials_exception

    try:
        internal_id = int(sub)
    except ValueError:
        raise credentials_exception

    staff = db.query(Staff).filter(Staff.id == internal_id).first()
    if not staff:
        raise credentials_exception

    # Verify employment status from database on each protected call
    if staff.employment_status != EmploymentStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive or suspended"
        )

    return staff

def get_current_guest(
    token: str = Depends(guest_oauth2_scheme),
    db: Session = Depends(get_db)
) -> Guest:
    """
    Dependency to fetch and validate the currently authenticated guest.
    Enforces check that principal_type is strictly 'guest' and retrieves guest by guest_id.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if not payload:
        raise credentials_exception

    if payload.get("principal_type") != "guest":
        raise credentials_exception

    sub = payload.get("sub") # sub is guest_id
    if not sub:
        raise credentials_exception

    guest = db.query(Guest).filter(Guest.guest_id == sub).first()
    if not guest:
        raise credentials_exception

    return guest

def require_roles(*allowed_roles: StaffRole):
    """
    FastAPI dependency for Role-Based Access Control (RBAC).
    Admins are granted full access bypass natively.
    """
    def dependency(current_user: Staff = Depends(get_current_staff)):
        user_role_str = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role).lower()
        
        if user_role_str == "admin":
            return current_user

        allowed_strs = [r.value if hasattr(r, 'value') else str(r).lower() for r in allowed_roles]
            
        if user_role_str not in allowed_strs and current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for this role"
            )
        return current_user
        
    return dependency
