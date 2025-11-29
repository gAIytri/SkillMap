from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Float, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from config.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # Null for Google OAuth users
    full_name = Column(String(255), nullable=False)
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    profile_picture_url = Column(Text, nullable=True)
    section_order = Column(JSON, nullable=True)  # Custom section order for resume template
    credits = Column(Float, nullable=False, default=100.0)  # User credits for AI operations
    tailor_count = Column(Integer, nullable=False, default=0)  # Total number of resume tailorings

    # Auto-recharge settings
    auto_recharge_enabled = Column(Boolean, nullable=False, default=False)
    auto_recharge_credits = Column(Integer, nullable=True)  # Which credit package to auto-purchase
    auto_recharge_threshold = Column(Float, nullable=False, default=10.0)  # Trigger when credits fall below this
    stripe_customer_id = Column(String(255), nullable=True, index=True)  # Stripe customer ID
    stripe_payment_method_id = Column(String(255), nullable=True)  # Saved payment method

    # Email verification
    email_verified = Column(Boolean, nullable=False, default=False)  # Email verification status
    verification_token = Column(String(6), nullable=True)  # 6-digit verification code
    verification_token_expires = Column(DateTime(timezone=True), nullable=True)  # Code expiry
    verification_link_token = Column(String(64), nullable=True, unique=True, index=True)  # Magic link token

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    base_resume = relationship("BaseResume", back_populates="user", uselist=False, cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    credit_transactions = relationship("CreditTransaction", back_populates="user", cascade="all, delete-orphan")

    @property
    def base_resume_id(self):
        """Get base resume ID from relationship"""
        return self.base_resume.id if self.base_resume else None

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, name={self.full_name})>"
