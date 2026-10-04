from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional

class GuestLoginRequest(BaseModel):
    email: EmailStr
    password: str

class GuestRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)

class GuestResponse(BaseModel):
    guest_id: str
    name: str
    email: EmailStr
    phone: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class GuestTokenResponse(BaseModel):
    status: str
    authenticated: bool
    access_token: str
    token_type: str
    user: GuestResponse
