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


class ForgotPasswordRequest(BaseModel):
    email: str


class VerifyResetCodeRequest(BaseModel):
    email: str
    code: str


class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str


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


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Send password reset code to user's email"""
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        # Don't reveal if user exists for security
        return {"message": "If an account exists with this email, you will receive a password reset code."}

    # Generate reset code and expiry (reusing verification fields)
    reset_code = email_service.generate_verification_code()
    reset_expiry = email_service.get_verification_expiry()

    # Update user with reset token
    user.verification_token = reset_code
    user.verification_token_expires = reset_expiry
    db.commit()

    # Send password reset email
    success = email_service.send_password_reset_email(
        email=user.email,
        full_name=user.full_name,
        reset_code=reset_code
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send password reset email. Please try again."
        )

    return {"message": "If an account exists with this email, you will receive a password reset code."}


@router.post("/verify-reset-code")
async def verify_reset_code(request: VerifyResetCodeRequest, db: Session = Depends(get_db)):
    """Verify password reset code"""
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if token exists and matches
    if not user.verification_token or user.verification_token != request.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset code"
        )

    # Check if token expired
    if not user.verification_token_expires or datetime.now(timezone.utc) > user.verification_token_expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset code has expired. Please request a new one."
        )

    return {"message": "Reset code verified successfully", "verified": True}


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password with verified code"""
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Verify code again for security
    if not user.verification_token or user.verification_token != request.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset code"
        )

    # Check if token expired
    if not user.verification_token_expires or datetime.now(timezone.utc) > user.verification_token_expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset code has expired. Please request a new one."
        )

    # Validate password strength (minimum 8 characters)
    if len(request.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )

    # Hash and update password
    from utils.security import hash_password
    user.password_hash = hash_password(request.new_password)

    # Clear reset token
    user.verification_token = None
    user.verification_token_expires = None

    db.commit()

    return {"message": "Password reset successfully"}


@router.get("/check-verification-status/{email}")
async def check_verification_status(email: str, db: Session = Depends(get_db)):
    """Check if user's email has been verified (for cross-device polling)"""
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return {
        "email_verified": user.email_verified,
        "email": user.email
    }
