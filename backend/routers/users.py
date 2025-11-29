"""
Users API Router
Handles user profile and account management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
import logging

from config.database import get_db
from models.user import User
from middleware.auth_middleware import get_current_user, get_current_verified_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/users", tags=["users"])


# Response schemas
class UserProfile(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    profile_picture_url: Optional[str]
    credits: float
    base_resume_id: Optional[int] = None  # ID of user's base resume
    email_verified: bool = False  # CRITICAL: Email verification status
    created_at: str
    last_login: Optional[str]
    google_id: Optional[str]

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    profile_picture_url: Optional[str] = None


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's profile information

    Returns:
        UserProfile with all user details
    """
    try:
        # Refresh user to get latest data including base_resume relationship
        db.refresh(current_user)
        # Explicitly access base_resume to ensure relationship is loaded
        _ = current_user.base_resume

        return UserProfile(
            id=current_user.id,
            email=current_user.email,
            full_name=current_user.full_name,
            profile_picture_url=current_user.profile_picture_url,
            credits=current_user.credits,
            base_resume_id=current_user.base_resume_id,  # Use the property from User model
            email_verified=current_user.email_verified,  # CRITICAL: Include verification status
            created_at=current_user.created_at.isoformat() if current_user.created_at else "",
            last_login=current_user.last_login.isoformat() if current_user.last_login else None,
            google_id=current_user.google_id
        )
    except Exception as e:
        logger.error(f"Failed to get user profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user profile"
        )


@router.put("/me", response_model=UserProfile)
async def update_user_profile(
    update_request: UpdateProfileRequest,
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile information

    Args:
        update_request: Fields to update

    Returns:
        Updated UserProfile
    """
    try:
        # Update fields if provided
        if update_request.full_name is not None:
            current_user.full_name = update_request.full_name

        if update_request.profile_picture_url is not None:
            current_user.profile_picture_url = update_request.profile_picture_url

        db.commit()
        db.refresh(current_user)

        logger.info(f"✓ User {current_user.id} profile updated")

        return UserProfile(
            id=current_user.id,
            email=current_user.email,
            full_name=current_user.full_name,
            profile_picture_url=current_user.profile_picture_url,
            credits=current_user.credits,
            base_resume_id=current_user.base_resume_id,  # Use the property from User model
            email_verified=current_user.email_verified,  # CRITICAL: Include verification status
            created_at=current_user.created_at.isoformat() if current_user.created_at else "",
            last_login=current_user.last_login.isoformat() if current_user.last_login else None,
            google_id=current_user.google_id
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update user profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user profile"
        )


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_account(
    current_user: User = Depends(get_current_verified_user),
    db: Session = Depends(get_db)
):
    """Delete current user account"""
    try:
        db.delete(current_user)
        db.commit()
        logger.info(f"✓ User {current_user.id} account deleted")
        return None
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete user account: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user account"
        )

