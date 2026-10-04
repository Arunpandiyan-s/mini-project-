from pydantic import BaseModel, Field
from typing import Optional
from app.schemas.staff import StaffResponse

class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Staff ID, email, or phone number")
    password: str = Field(..., description="Plaintext password")
    role: Optional[str] = Field(None, description="Optional role validation check")

class TokenResponse(BaseModel):
    status: str = "success"
    authenticated: bool = True
    access_token: str
    token_type: str = "bearer"
    user: StaffResponse
