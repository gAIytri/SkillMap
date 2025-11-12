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

        # Create new user
        hashed_password = hash_password(user_data.password)
        new_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            full_name=user_data.full_name
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)
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
        """Authenticate or create user with Google OAuth"""
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

            # Check if user exists
            user = db.query(User).filter(User.google_id == google_id).first()

            if not user:
                # Check if email is already registered
                user = db.query(User).filter(User.email == email).first()
                if user:
                    # Link Google account to existing user
                    user.google_id = google_id
                    user.profile_picture_url = picture
                else:
                    # Create new user
                    user = User(
                        email=email,
                        google_id=google_id,
                        full_name=full_name,
                        profile_picture_url=picture
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
