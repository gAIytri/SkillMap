from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone

from config.database import get_db
from schemas.user import UserCreate, UserLogin, Token, GoogleAuthRequest
from services.auth_service import AuthService
from services import email_service
from models.user import User

router = APIRouter(prefix="/api/auth", tags=["authentication"])


# Pydantic schemas for verification
class VerifyEmailRequest(BaseModel):
    email: str
    code: str


class ResendVerificationRequest(BaseModel):
    email: str


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user with email and password"""
    user = AuthService.create_user(db, user_data)
    return AuthService.create_token_response(user)


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login with email and password"""
    user = AuthService.authenticate_user(db, credentials)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Check if email is verified
    if not user.email_verified:
        # Generate NEW verification code for this login attempt
        verification_code = email_service.generate_verification_code()
        verification_link_token = email_service.generate_verification_link_token()
        verification_expiry = email_service.get_verification_expiry()

        # Update user with new tokens
        user.verification_token = verification_code
        user.verification_token_expires = verification_expiry
        user.verification_link_token = verification_link_token
        db.commit()

        # Send new verification email
        email_service.send_verification_email(
            email=user.email,
            full_name=user.full_name,
            verification_code=verification_code,
            verification_link_token=verification_link_token
        )

        # Return token response but frontend will check email_verified flag
        # and redirect to verification page instead of logging in
        return AuthService.create_token_response(user)

    return AuthService.create_token_response(user)


@router.post("/google", response_model=Token)
async def google_auth(auth_request: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Authenticate with Google OAuth"""
    user = AuthService.authenticate_google_user(db, auth_request.id_token)
    return AuthService.create_token_response(user)


@router.post("/logout")
async def logout():
    """Logout user (client-side token removal)"""
    return {"message": "Successfully logged out"}


@router.post("/verify-email", response_model=Token)
async def verify_email(request: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Verify email with 6-digit code and return login token"""
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if already verified
    if user.email_verified:
        # Still return token so user gets logged in
        return AuthService.create_token_response(user)

    # Check if token exists and matches
    if not user.verification_token or user.verification_token != request.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )

    # Check if token expired
    if not user.verification_token_expires or datetime.now(timezone.utc) > user.verification_token_expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new one."
        )

    # Mark email as verified and clear tokens
    user.email_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    user.verification_link_token = None
    db.commit()
    db.refresh(user)

    # Send welcome email
    email_service.send_welcome_email(user.email, user.full_name)

    # Return token to automatically log user in
    return AuthService.create_token_response(user)


@router.get("/verify-email/{token}", response_model=Token)
async def verify_email_magic_link(token: str, db: Session = Depends(get_db)):
    """Verify email with magic link token and return login token"""
    # Find user by verification link token
    user = db.query(User).filter(User.verification_link_token == token).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid verification link"
        )

    # Check if already verified
    if user.email_verified:
        # Still return token so user gets logged in
        return AuthService.create_token_response(user)

    # Check if token expired (same expiry as code)
    if not user.verification_token_expires or datetime.now(timezone.utc) > user.verification_token_expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification link has expired. Please request a new one."
        )

    # Mark email as verified and clear tokens
    user.email_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    user.verification_link_token = None
    db.commit()
    db.refresh(user)

    # Send welcome email
    email_service.send_welcome_email(user.email, user.full_name)

    # Return token to automatically log user in
    return AuthService.create_token_response(user)


@router.post("/resend-verification")
async def resend_verification(request: ResendVerificationRequest, db: Session = Depends(get_db)):
    """Resend verification email"""
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if already verified
    if user.email_verified:
        return {"message": "Email already verified", "already_verified": True}

    # Generate new tokens
    verification_code = email_service.generate_verification_code()
    verification_link_token = email_service.generate_verification_link_token()
    verification_expiry = email_service.get_verification_expiry()

    # Update user with new tokens
    user.verification_token = verification_code
    user.verification_token_expires = verification_expiry
    user.verification_link_token = verification_link_token
    db.commit()

    # Send verification email
    success = email_service.send_verification_email(
        email=user.email,
        full_name=user.full_name,
        verification_code=verification_code,
        verification_link_token=verification_link_token
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email. Please try again."
        )

    return {"message": "Verification email sent successfully!"}
