from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class AdminCreate(BaseModel):
    """Schema for admin registration"""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=255)
    is_super_admin: bool = False


class AdminLogin(BaseModel):
    """Schema for admin login"""
    email: EmailStr
    password: str


class AdminResponse(BaseModel):
    """Schema for admin response"""
    id: int
    email: str
    full_name: str
    is_super_admin: bool
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class AdminToken(BaseModel):
    """Schema for admin JWT token response"""
    access_token: str
    token_type: str = "bearer"
    admin: AdminResponse


class AdminTokenData(BaseModel):
    """Schema for admin token payload"""
    admin_id: int
    email: str
    is_super_admin: bool


class UpdateUserCredits(BaseModel):
    """Schema for updating user credits"""
    credits: float = Field(..., ge=0, description="New credit balance for the user")
