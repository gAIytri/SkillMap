from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from google.auth.transport import requests
from google.oauth2 import id_token
from fastapi import HTTPException, status

from models.user import User
from schemas.user import UserCreate, UserLogin, Token, UserResponse
from utils.security import hash_password, verify_password, create_access_token
from config.settings import settings
from services import email_service


class AuthService:
    """Service for handling authentication logic"""

    @staticmethod
    def create_user(db: Session, user_data: UserCreate) -> User:
        """Create a new user with email and password"""
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Generate verification tokens
        verification_code = email_service.generate_verification_code()
        verification_link_token = email_service.generate_verification_link_token()
        verification_expiry = email_service.get_verification_expiry()

        # Create new user
        hashed_password = hash_password(user_data.password)
        new_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            full_name=user_data.full_name,
            email_verified=False,  # Not verified yet
            verification_token=verification_code,
            verification_token_expires=verification_expiry,
            verification_link_token=verification_link_token
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Send verification email
        email_service.send_verification_email(
            email=new_user.email,
            full_name=new_user.full_name,
            verification_code=verification_code,
            verification_link_token=verification_link_token
        )

        return new_user

    @staticmethod
    def authenticate_user(db: Session, credentials: UserLogin) -> Optional[User]:
        """Authenticate user with email and password"""
        user = db.query(User).filter(User.email == credentials.email).first()

        if not user or not user.password_hash:
            return None

        if not verify_password(credentials.password, user.password_hash):
            return None

        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        return user

    @staticmethod
    def authenticate_google_user(db: Session, id_token_str: str) -> User:
        """
        Authenticate or create user with Google OAuth.
        Enforces unique email - one email can only have ONE user account.
        """
        try:
            # Verify the Google ID token
            idinfo = id_token.verify_oauth2_token(
                id_token_str,
                requests.Request(),
                settings.GOOGLE_CLIENT_ID
            )

            # Get user info from token
            google_id = idinfo['sub']
            email = idinfo['email']
            full_name = idinfo.get('name', '')
            picture = idinfo.get('picture')

            # FIRST: Check if user exists by email (UNIQUE email enforcement)
            user = db.query(User).filter(User.email == email).first()

            if user:
                # User exists with this email
                if user.google_id is None:
                    # User registered with password, now linking Google account
                    user.google_id = google_id
                    user.profile_picture_url = picture
                    user.email_verified = True  # Google users are pre-verified
                    # Clear any pending verification tokens since now verified
                    user.verification_token = None
                    user.verification_token_expires = None
                    user.verification_link_token = None
                elif user.google_id != google_id:
                    # Email exists but with different Google ID - should not happen
                    # but handle it by rejecting (security measure)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This email is already associated with a different Google account"
                    )
                # else: same google_id, just logging in normally
            else:
                # No user with this email - create new user
                user = User(
                    email=email,
                    google_id=google_id,
                    full_name=full_name,
                    profile_picture_url=picture,
                    email_verified=True  # Google users are pre-verified
                )
                db.add(user)

            # Update last login
            user.last_login = datetime.utcnow()
            db.commit()
            db.refresh(user)
            return user

        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Google token: {str(e)}"
            )

    @staticmethod
    def create_token_response(user: User) -> Token:
        """Create JWT token response for user"""
        token_data = {
            "user_id": user.id,
            "email": user.email
        }
        access_token = create_access_token(token_data)

        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )

    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()
