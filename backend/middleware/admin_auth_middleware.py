from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from typing import Optional

from config.database import get_db
from config.settings import settings
from models.admin import Admin
from schemas.admin import AdminTokenData

security = HTTPBearer()


def decode_admin_token(token: str) -> Optional[AdminTokenData]:
    """Decode and verify admin JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        admin_id: int = payload.get("admin_id")
        email: str = payload.get("email")
        is_super_admin: bool = payload.get("is_super_admin", False)

        if admin_id is None or email is None:
            return None

        return AdminTokenData(admin_id=admin_id, email=email, is_super_admin=is_super_admin)
    except JWTError:
        return None


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Admin:
    """Dependency to get current authenticated admin from JWT token"""
    token = credentials.credentials
    token_data = decode_admin_token(token)

    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate admin credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    admin = db.query(Admin).filter(Admin.id == token_data.admin_id).first()

    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is inactive",
        )

    return admin


async def get_current_super_admin(
    admin: Admin = Depends(get_current_admin)
) -> Admin:
    """Dependency to ensure the admin is a super admin"""
    if not admin.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin privileges required",
        )
    return admin
