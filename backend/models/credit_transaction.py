from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from config.database import Base
import enum


class TransactionType(str, enum.Enum):
    """Types of credit transactions"""
    TAILOR = "tailor"  # Credits deducted for resume tailoring
    GRANT = "grant"  # Credits granted by admin
    PURCHASE = "purchase"  # Credits purchased by user
    REFUND = "refund"  # Credits refunded
    BONUS = "bonus"  # Bonus credits


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)

    # Transaction details
    amount = Column(Float, nullable=False)  # Negative for deduction, positive for addition
    balance_after = Column(Float, nullable=False)  # User's credit balance after this transaction
    transaction_type = Column(SQLEnum(TransactionType), nullable=False)

    # Token usage (for tailor operations)
    tokens_used = Column(Integer, nullable=True)  # Total tokens consumed (if applicable)
    prompt_tokens = Column(Integer, nullable=True)  # Prompt tokens (if applicable)
    completion_tokens = Column(Integer, nullable=True)  # Completion tokens (if applicable)

    # Metadata
    description = Column(String(500), nullable=True)  # Optional description
    stripe_session_id = Column(String(255), nullable=True, unique=True, index=True)  # Stripe checkout session ID for idempotency
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="credit_transactions")
    project = relationship("Project")

    def __repr__(self):
        return f"<CreditTransaction(id={self.id}, user_id={self.user_id}, amount={self.amount}, type={self.transaction_type})>"
