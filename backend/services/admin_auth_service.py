from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from models.admin import Admin
from schemas.admin import AdminCreate, AdminLogin, AdminToken, AdminResponse
from utils.security import hash_password, verify_password, create_access_token


class AdminAuthService:
    """Service for handling admin authentication logic"""

    @staticmethod
    def create_admin(db: Session, admin_data: AdminCreate) -> Admin:
        """Create a new admin with email and password"""
        # Check if admin already exists
        existing_admin = db.query(Admin).filter(Admin.email == admin_data.email).first()
        if existing_admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin email already registered"
            )

        # Create new admin
        hashed_password = hash_password(admin_data.password)
        new_admin = Admin(
            email=admin_data.email,
            password_hash=hashed_password,
            full_name=admin_data.full_name,
            is_super_admin=admin_data.is_super_admin
        )

        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        return new_admin

    @staticmethod
    def authenticate_admin(db: Session, credentials: AdminLogin) -> Optional[Admin]:
        """Authenticate admin with email and password"""
        admin = db.query(Admin).filter(Admin.email == credentials.email).first()

        if not admin or not admin.password_hash:
            return None

        if not verify_password(credentials.password, admin.password_hash):
            return None

        if not admin.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin account is inactive"
            )

        # Update last login
        admin.last_login = datetime.utcnow()
        db.commit()
        return admin

    @staticmethod
    def create_token_response(admin: Admin) -> AdminToken:
        """Create JWT token response for admin"""
        token_data = {
            "admin_id": admin.id,
            "email": admin.email,
            "is_super_admin": admin.is_super_admin
        }
        access_token = create_access_token(token_data)

        return AdminToken(
            access_token=access_token,
            token_type="bearer",
            admin=AdminResponse.model_validate(admin)
        )

    @staticmethod
    def get_admin_by_id(db: Session, admin_id: int) -> Optional[Admin]:
        """Get admin by ID"""
        return db.query(Admin).filter(Admin.id == admin_id).first()
